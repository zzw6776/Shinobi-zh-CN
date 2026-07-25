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
    const runDockerStreamed = (packageName,args) => {
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
                sendData('#END_PROCESS','stdout')
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
            const image = registryImage(packageName,variant)
            const name = containerName(packageName)
            const host = hostOverride || detectHostIp()
            const key = ensurePluginKey(plug)
            await persistPluginKeys()
            s.closeJsonResponse(res,{ ok: true })
            // remove any existing container under this name first (covers both a
            // stale exited container and a currently-running one being redeployed
            // with a different variant/host/etc)
            await new Promise((resolve) => execFile('docker',['rm','-f',name],{timeout:15000},() => resolve()))
            const pullResult = await runDockerStreamed(packageName,['pull',image])
            if(!pullResult.ok){
                return
            }
            const runArgs = [
                'run','-d',
                '--name', name,
                '--restart', 'unless-stopped',
                ...(ACCELERATION_DOCKER_FLAGS[variant] || []),
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
