const os = require('os')
const { execFile, spawn } = require('child_process')
// GPU/device passthrough flags per acceleration variant, matching the `docker run`
// examples documented in each Docker-enabled plugin's own README.
const ACCELERATION_DOCKER_FLAGS = {
    cpu: [],
    cuda: ['--gpus', 'all'],
    rocm: ['--device=/dev/kfd', '--device=/dev/dri', '--group-add', 'video', '--group-add', 'render'],
    openvino: ['--device=/dev/dri', '--group-add', 'video'],
}
// security: packageName/variant become part of a container name, image tag, and
// argv passed to `docker` - never allow anything outside this safe charset through,
// and always exec docker directly (argv array, no shell) rather than string-building
// a shell command (that class of bug is exactly what this session has been fixing
// elsewhere in the codebase).
const isSafeToken = (value) => typeof value === 'string' && /^[A-Za-z0-9_.-]+$/.test(value)
// Plugins downloaded through the Plugin Manager get their local folder renamed
// to `dl_<name>` (see moveModuleToNameInProperties in superUser.js) - that's a
// purely local download-marker prefix, never part of the plugin's actual
// published registry image name, so it needs stripping before it's used to
// build a `registry.gitlab.com/.../<name>` path.
const DL_PREFIX = /^dl_/
const stripDlPrefix = (packageName) => packageName.replace(DL_PREFIX,'')
module.exports = (s,config,lang,app,io,helpers) => {
    const {
        getModulePath,
        getModuleProperties,
        getModuleConfiguration,
    } = helpers
    const {
        modifyConfiguration,
    } = require('../system/utils.js')(config)
    const fs = require('fs')
    const containerName = (packageName) => `shinobi-plugin-${packageName}`
    const registryImage = (packageName,variant) => {
        const properties = getModuleProperties(packageName)
        // allow an explicit override (e.g. a plugin's own package.json "dockerImage"
        // field) if it looks like a sane registry path; otherwise fall back to the
        // documented convention of registry.gitlab.com/shinobi-systems/shinobi-plugins/<name>
        const isSafeRegistryPath = /^[A-Za-z0-9_.\/-]+$/.test(properties.dockerImage || '')
        const base = isSafeRegistryPath ? properties.dockerImage : `registry.gitlab.com/shinobi-systems/shinobi-plugins/${packageName}`
        return `${base}:${variant}`
    }
    const getDockerVariants = (packageName) => {
        if(!isSafeToken(packageName))return []
        const dockerDir = getModulePath(packageName) + 'docker'
        if(!fs.existsSync(dockerDir))return []
        return fs.readdirSync(dockerDir)
            .filter((filename) => filename.startsWith('Dockerfile.'))
            .map((filename) => filename.replace('Dockerfile.',''))
            .filter(isSafeToken)
    }
    const isDockerAvailable = () => {
        return new Promise((resolve) => {
            execFile('docker',['--version'],{timeout:5000},(err) => resolve(!err))
        })
    }
    const getContainerStatus = (packageName) => {
        return new Promise((resolve) => {
            execFile('docker',['inspect','--format','{{.State.Status}}|{{.Config.Image}}',containerName(packageName)],{timeout:5000},(err,stdout) => {
                if(err)return resolve({status:'absent'})
                const parts = stdout.trim().split('|')
                resolve({status: parts[0], image: parts[1]})
            })
        })
    }
    const getDockerInfoForModule = async (packageName) => {
        const variants = getDockerVariants(packageName)
        if(variants.length === 0)return { variants: [] }
        const container = await getContainerStatus(packageName)
        return { variants, container }
    }
    // Best-effort detection of this machine's LAN IPv4 address, so a plugin
    // running as a Docker container (possibly with its own separate network
    // namespace, or on a different Docker host reachable over the LAN) has a
    // real, reachable default to connect back to instead of "localhost".
    const detectHostIp = () => {
        const nets = os.networkInterfaces()
        for(const name in nets){
            for(const net of (nets[name] || [])){
                if((net.family === 'IPv4' || net.family === 4) && !net.internal){
                    return net.address
                }
            }
        }
        return 'localhost'
    }
    // Some plugins (e.g. face-recognition-onnx) share on-disk data with the
    // Face Manager customAutoLoad panel and need it installed/kept current on
    // the HOST regardless of whether the plugin itself runs natively or in a
    // container - a container has no access to Shinobi's own installation
    // directory unless we explicitly wire it up here. Opt-in via a
    // `"needsFaceManager": true` field in the plugin's package.json.
    const FACE_MANAGER_SUBDIR = 'faceManagerCustomAutoLoadLibrary'
    const setUpFaceManagerIfNeeded = (packageName) => {
        const properties = getModuleProperties(packageName)
        if(properties.needsFaceManager !== true)return null
        const facesFolder = process.cwd() + '/faces'
        const unknownFacesFolder = process.cwd() + '/unknownFaces'
        try{
            fs.mkdirSync(facesFolder,{recursive:true})
            fs.mkdirSync(unknownFacesFolder,{recursive:true})
            modifyConfiguration({facesFolder,unknownFacesFolder},true)
            const bundledFaceManager = getModulePath(packageName) + FACE_MANAGER_SUBDIR
            if(fs.existsSync(bundledFaceManager)){
                const installedFaceManager = process.cwd() + '/libs/customAutoLoad/' + FACE_MANAGER_SUBDIR
                fs.mkdirSync(process.cwd() + '/libs/customAutoLoad',{recursive:true})
                fs.rmSync(installedFaceManager,{recursive:true,force:true})
                fs.cpSync(bundledFaceManager,installedFaceManager,{recursive:true})
            }
        }catch(err){
            s.debugLog(`setUpFaceManagerIfNeeded(${packageName}) failed`,err)
        }
        return {facesFolder,unknownFacesFolder}
    }
    const ensurePluginKey = (plug) => {
        if(!config.pluginKeys)config.pluginKeys = {}
        if(!config.pluginKeys[plug]){
            config.pluginKeys[plug] = s.gid(24)
        }
        return config.pluginKeys[plug]
    }
    const persistPluginKeys = () => {
        // security: config.pluginKeys must never be empty/falsy for a real plugin -
        // an empty value there is exactly the unauthenticated-plugin hole from #567.
        return modifyConfiguration({ pluginKeys: config.pluginKeys }, true)
    }
    // Runs `docker <args>`, streaming stdout/stderr to the superuser's socket over
    // the same 'plugin-info' channel the (non-Docker) installer already uses, so
    // the frontend can reuse its existing output panel with no new wiring.
    // isFinalStep controls whether '#END_PROCESS' is sent on a *successful* exit.
    // Deploy runs this as two sequential steps (pull, then run) sharing one output
    // panel/progress flag on the frontend - only the last step on the happy path
    // should tell the frontend "the whole action is done, go refresh the card".
    // A failing step always signals end (there's no next step coming).
    const runDockerStreamed = (packageName,args,isFinalStep = true) => {
        return new Promise((resolve) => {
            const sendData = (data,channel) => {
                // reuses the same 'install-stdout'/'install-stderr' process names the
                // (non-Docker) installer uses, so the frontend's existing output panel
                // and #END_PROCESS handling work for Docker pull/run with no new wiring
                s.tx({
                    f: 'plugin-info',
                    module: packageName,
                    process: 'install-' + channel,
                    data: data.toString(),
                },'$')
            }
            let proc
            try{
                proc = spawn('docker',args)
            }catch(err){
                sendData(err.message || String(err),'stderr')
                sendData('#END_PROCESS','stdout')
                resolve({ ok: false, msg: err.message || String(err) })
                return
            }
            proc.stdout.on('data',(data) => sendData(data,'stdout'))
            proc.stderr.on('data',(data) => sendData(data,'stderr'))
            proc.on('error',(err) => {
                sendData(err.message || String(err),'stderr')
            })
            proc.on('exit',(code) => {
                if(isFinalStep || code !== 0){
                    sendData('#END_PROCESS','stdout')
                }
                resolve({ ok: code === 0, code })
            })
        })
    }
    /**
    * API : Superuser : Pull + Run a plugin as a Docker container, connected
    * back to this Shinobi instance over websocket (client-mode plugin).
    */
    app.post(config.webPaths.superApiPrefix+':auth/plugins/docker/deploy', (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const packageName = req.body.packageName
            const variant = req.body.variant
            const hostOverride = (req.body.host || '').trim()
            if(!isSafeToken(packageName) || !isSafeToken(variant)){
                s.closeJsonResponse(res,{ ok: false, msg: lang['Invalid Data'] })
                return
            }
            const variants = getDockerVariants(packageName)
            if(variants.indexOf(variant) === -1){
                s.closeJsonResponse(res,{ ok: false, msg: lang['Invalid Data'] })
                return
            }
            // the plug name (how the plugin identifies itself when it connects, and the
            // key used for config.pluginKeys[plug]) lives in the plugin's own conf.json/
            // conf.sample.json, not package.json - getModuleConfiguration reads the right one
            const moduleConfig = getModuleConfiguration(packageName)
            const plug = moduleConfig.plug || packageName
            let image = registryImage(packageName,variant)
            const name = containerName(packageName)
            const host = hostOverride || detectHostIp()
            const key = ensurePluginKey(plug)
            await persistPluginKeys()
            s.closeJsonResponse(res,{ ok: true })
            // remove any existing container under this name first (covers both a
            // stale exited container and a currently-running one being redeployed
            // with a different variant/host/etc)
            await new Promise((resolve) => execFile('docker',['rm','-f',name],{timeout:15000},() => resolve()))
            let pullResult = await runDockerStreamed(packageName,['pull',image],false)
            if(!pullResult.ok && DL_PREFIX.test(packageName)){
                // first attempt used the local `dl_`-prefixed folder name verbatim -
                // retry against the real (unprefixed) published image name before
                // giving up.
                const fallbackImage = registryImage(stripDlPrefix(packageName),variant)
                const fallbackPull = await runDockerStreamed(packageName,['pull',fallbackImage],false)
                if(fallbackPull.ok){
                    image = fallbackImage
                    pullResult = fallbackPull
                }
            }
            if(!pullResult.ok){
                return
            }
            // Host-side setup that has to happen regardless of Docker vs native
            // (e.g. installing/updating the Face Manager panel, which lives in
            // Shinobi's own installation directory, not the container) - see
            // setUpFaceManagerIfNeeded above.
            const faceManagerPaths = setUpFaceManagerIfNeeded(packageName)
            const runArgs = [
                'run','-d',
                '--name', name,
                '--restart', 'unless-stopped',
                ...(ACCELERATION_DOCKER_FLAGS[variant] || []),
                ...(faceManagerPaths ? [
                    '-e', `FACES_FOLDER=${faceManagerPaths.facesFolder}`,
                    '-e', `UNKNOWN_FACES_FOLDER=${faceManagerPaths.unknownFacesFolder}`,
                    '-v', `${faceManagerPaths.facesFolder}:${faceManagerPaths.facesFolder}`,
                    '-v', `${faceManagerPaths.unknownFacesFolder}:${faceManagerPaths.unknownFacesFolder}`,
                ] : []),
                '-e', `HOST=${host}`,
                '-e', `PORT=${config.port}`,
                '-e', `PLUGIN_KEY=${key}`,
                '-e', `PLUGIN_NAME=${plug}`,
                '-e', `ACCELERATION=${variant}`,
                image,
            ]
            await runDockerStreamed(packageName,runArgs)
        },res,req)
    })
    /**
    * API : Superuser : Stop a running plugin Docker container (kept, not removed).
    */
    app.post(config.webPaths.superApiPrefix+':auth/plugins/docker/stop', (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const packageName = req.body.packageName
            if(!isSafeToken(packageName)){
                s.closeJsonResponse(res,{ ok: false, msg: lang['Invalid Data'] })
                return
            }
            execFile('docker',['stop',containerName(packageName)],{timeout:20000},(err) => {
                s.closeJsonResponse(res,{ ok: !err })
            })
        },res,req)
    })
    /**
    * API : Superuser : Start a previously-stopped plugin Docker container.
    */
    app.post(config.webPaths.superApiPrefix+':auth/plugins/docker/start', (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const packageName = req.body.packageName
            if(!isSafeToken(packageName)){
                s.closeJsonResponse(res,{ ok: false, msg: lang['Invalid Data'] })
                return
            }
            execFile('docker',['start',containerName(packageName)],{timeout:20000},(err) => {
                s.closeJsonResponse(res,{ ok: !err })
            })
        },res,req)
    })
    /**
    * API : Superuser : Remove a plugin's Docker container entirely.
    */
    app.post(config.webPaths.superApiPrefix+':auth/plugins/docker/remove', (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const packageName = req.body.packageName
            if(!isSafeToken(packageName)){
                s.closeJsonResponse(res,{ ok: false, msg: lang['Invalid Data'] })
                return
            }
            execFile('docker',['rm','-f',containerName(packageName)],{timeout:20000},(err) => {
                s.closeJsonResponse(res,{ ok: !err })
            })
        },res,req)
    })
    /**
    * API : Superuser : Fetch recent logs for a plugin's Docker container.
    */
    app.get(config.webPaths.superApiPrefix+':auth/plugins/docker/logs', (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const packageName = req.query.packageName
            if(!isSafeToken(packageName)){
                s.closeJsonResponse(res,{ ok: false, msg: lang['Invalid Data'] })
                return
            }
            execFile('docker',['logs','--tail','300',containerName(packageName)],{timeout:15000,maxBuffer:1024*1024*10},(err,stdout,stderr) => {
                s.closeJsonResponse(res,{ ok: !err, logs: (stdout || '') + (stderr || '') })
            })
        },res,req)
    })
    return {
        isDockerAvailable,
        getDockerInfoForModule,
        detectHostIp,
    }
}
