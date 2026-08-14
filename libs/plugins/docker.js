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
    const { addPluginManagerRoute } = require('./access.js')(s,config,lang,app)
    // GPU presence and the acceleration runtimes installed for it are not Docker
    // concerns - a natively installed plugin uses the same CUDA/ROCm/OpenVINO - so they
    // live in their own module and are only consumed here.
    const { detectGpuVendors } = require('./hardware.js')(s)
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
    // Is Shinobi ITSELF running inside a container. Everything this file offers changes
    // meaning when it is : `docker` here would talk to the host's daemon (only if its
    // socket was deliberately mounted in), any container it starts is a sibling on the
    // host rather than a child, and host paths passed with -v are resolved by the host,
    // not from this filesystem. Installing Docker in here is never the right answer.
    const isRunningInContainer = () => {
        if(process.platform !== 'linux')return false
        try{
            if(fs.existsSync('/.dockerenv'))return true
            const cgroup = fs.readFileSync('/proc/1/cgroup','utf8')
            return /docker|containerd|kubepods|lxc/.test(cgroup)
        }catch(err){
            return false
        }
    }
    // A GPU being present is only half of what a container needs. Each acceleration
    // variant also needs something on the HOST before `docker run` can hand the device
    // over, and each of those is invisible until a deploy fails with a confusing error.
    // These are the checks, and (where it is a package install rather than a kernel
    // driver) the fixed command that installs it.
    const ACCELERATOR_REQUIREMENTS = {
        nvidia: {
            name: 'NVIDIA Container Toolkit',
            acceleration: 'cuda',
            // The toolkit registers itself as a docker runtime, which is the thing that
            // actually has to be true for `--gpus all` to work - more reliable than
            // looking for the binary, which can be installed but not wired into docker.
            check: async () => {
                const info = await new Promise((resolve) => {
                    execFile('docker',['info','--format','{{json .Runtimes}}'],{timeout:8000},(err,stdout) => resolve(err ? '' : (stdout || '')))
                })
                return /nvidia/i.test(info)
            },
            install: 'curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg' +
                ' && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed "s#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g" > /etc/apt/sources.list.d/nvidia-container-toolkit.list' +
                ' && apt-get update -y && apt-get install -y nvidia-container-toolkit' +
                ' && nvidia-ctk runtime configure --runtime=docker && systemctl restart docker',
        },
        intel: {
            name: 'Intel Compute Runtime (OpenVINO GPU)',
            acceleration: 'openvino',
            // /dev/dri alone is not enough for OpenVINO to pick the GPU - the OpenCL ICD
            // has to be on the host for the device to be usable once passed through.
            check: async () => {
                if(!fs.existsSync('/dev/dri'))return false
                return [
                    '/usr/lib/x86_64-linux-gnu/intel-opencl/libigdrcl.so',
                    '/usr/lib/x86_64-linux-gnu/dri/iHD_drv_video.so',
                ].some((path) => fs.existsSync(path))
            },
            install: 'apt-get update -y && apt-get install -y intel-opencl-icd intel-media-va-driver-non-free vainfo',
        },
        amd: {
            name: 'AMD ROCm kernel driver (/dev/kfd)',
            acceleration: 'rocm',
            // ROCm's userspace ships inside the plugin image; what the host must provide
            // is the amdgpu kernel driver exposing /dev/kfd. That is a driver/kernel
            // change, not an apt package we should be firing off unattended - so this one
            // reports and explains rather than offering a button.
            check: async () => fs.existsSync('/dev/kfd'),
            install: null,
            hint: 'The ROCm userspace ships inside the plugin image. The host needs the amdgpu kernel driver exposing /dev/kfd - install it with amdgpu-install from AMD\'s repository, then reboot.',
        },
    }
    const detectAcceleratorReadiness = async (gpuVendors) => {
        const readiness = {}
        // Only asked about vendors this machine actually has - checking for the NVIDIA
        // toolkit on an Intel-only box would just produce noise in the panel.
        await Promise.all(Object.keys(ACCELERATOR_REQUIREMENTS).map(async (vendor) => {
            if(!gpuVendors || !gpuVendors[vendor])return
            const requirement = ACCELERATOR_REQUIREMENTS[vendor]
            let ready = false
            try{
                ready = await requirement.check()
            }catch(err){
                s.debugLog(`Accelerator readiness check failed for ${vendor}`,err)
            }
            readiness[vendor] = {
                name: requirement.name,
                acceleration: requirement.acceleration,
                ready: ready,
                canInstall: !!requirement.install,
                hint: requirement.hint || null,
            }
        }))
        return readiness
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
            // Newly generated and not on disk yet. libs/plugins.js reloads pluginKeys from
            // conf.json so hand added keys work without a restart, and that reload would
            // otherwise drop this one in the gap before it is written.
            s.pluginKeysArePendingWrite = true
            config.pluginKeys[plug] = s.gid(24)
        }
        return config.pluginKeys[plug]
    }
    const persistPluginKeys = async () => {
        // security: config.pluginKeys must never be empty/falsy for a real plugin -
        // an empty value there is exactly the unauthenticated-plugin hole from #567.
        try{
            return await modifyConfiguration({ pluginKeys: config.pluginKeys }, true)
        }finally{
            s.pluginKeysArePendingWrite = false
        }
    }
    // Runs `docker <args>`, streaming stdout/stderr to the superuser's socket over
    // the same 'plugin-info' channel the (non-Docker) installer already uses, so
    // the frontend can reuse its existing output panel with no new wiring.
    // isFinalStep controls whether '#END_PROCESS' is sent on a *successful* exit.
    // Deploy runs this as two sequential steps (pull, then run) sharing one output
    // panel/progress flag on the frontend - only the last step on the happy path
    // should tell the frontend "the whole action is done, go refresh the card".
    // A failing step always signals end (there's no next step coming).
    const runStreamed = (packageName,command,args,isFinalStep = true) => {
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
                },'PLUGINMANAGER')
            }
            let proc
            try{
                proc = spawn(command,args)
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
    const runDockerStreamed = (packageName,args,isFinalStep = true) => runStreamed(packageName,'docker',args,isFinalStep)
    // The Docker install streams over the same 'plugin-info' channel as a plugin's own
    // install output, addressed to this reserved name instead of a real package - the
    // frontend listens for it and paints the Downloaded tab's Docker notice.
    const DOCKER_HOST_LABEL = '#docker-host'
    let dockerInstallRunning = false
    /**
    * API : Superuser : Install Docker Engine on this host.
    */
    addPluginManagerRoute('post','/docker/install', async (req,res,resp) => {
        if(process.platform !== 'linux'){
            s.closeJsonResponse(res,{ ok: false, msg: lang['Not Supported'] || 'Docker can only be installed from here on Linux.' })
            return
        }
        // Installing Docker Engine inside Shinobi's own container would need systemd,
        // would not survive the container being recreated, and is not what the user
        // wants anyway - the daemon they need is the host's.
        if(isRunningInContainer()){
            s.closeJsonResponse(res,{ ok: false, msg: lang['dockerInstallInContainerText'] || 'Shinobi is running inside a container. Install Docker on the host instead.' })
            return
        }
        if(dockerInstallRunning){
            s.closeJsonResponse(res,{ ok: false, msg: lang['Please Wait...'] })
            return
        }
        if(await isDockerAvailable()){
            s.closeJsonResponse(res,{ ok: true, alreadyInstalled: true })
            return
        }
        dockerInstallRunning = true
        s.closeJsonResponse(res,{ ok: true })
        // Docker's own convenience script (get.docker.com). No user input goes into this
        // command line - it is a fixed string - and it needs root, so it runs through
        // sudo when Shinobi is not already root.
        const installCommand = 'curl -fsSL https://get.docker.com -o /tmp/get-docker.sh && sh /tmp/get-docker.sh'
        const isRoot = typeof process.getuid === 'function' && process.getuid() === 0
        const args = isRoot ? ['-c',installCommand] : ['-c',`sudo -n sh -c '${installCommand}'`]
        const result = await runStreamed(DOCKER_HOST_LABEL,'sh',args)
        dockerInstallRunning = false
        s.tx({
            f: 'plugin-info',
            module: DOCKER_HOST_LABEL,
            process: 'docker-install-complete',
            ok: result.ok,
        },'PLUGINMANAGER')
    })
    /**
    * API : Superuser : Install the host side prerequisite for an acceleration variant
    * (e.g. the NVIDIA Container Toolkit, without which `--gpus all` fails).
    */
    addPluginManagerRoute('post','/docker/installAccelerator', async (req,res,resp) => {
        const vendor = req.body.vendor
        const requirement = ACCELERATOR_REQUIREMENTS[vendor]
        // vendor only ever indexes this fixed map, and the command run is the map's own
        // literal string - nothing from the request reaches the shell.
        if(!requirement || !requirement.install){
            s.closeJsonResponse(res,{ ok: false, msg: lang['Invalid Data'] })
            return
        }
        if(process.platform !== 'linux'){
            s.closeJsonResponse(res,{ ok: false, msg: lang['Not Supported'] || 'This can only be installed from here on Linux.' })
            return
        }
        if(isRunningInContainer()){
            s.closeJsonResponse(res,{ ok: false, msg: lang['acceleratorInContainerText'] || 'Shinobi is running inside a container. This must be installed on the host, where the Docker daemon runs.' })
            return
        }
        if(dockerInstallRunning){
            s.closeJsonResponse(res,{ ok: false, msg: lang['Please Wait...'] })
            return
        }
        dockerInstallRunning = true
        s.closeJsonResponse(res,{ ok: true })
        const isRoot = typeof process.getuid === 'function' && process.getuid() === 0
        const args = isRoot ? ['-c',requirement.install] : ['-c',`sudo -n sh -c '${requirement.install.replace(/'/g,`'"'"'`)}'`]
        const result = await runStreamed(DOCKER_HOST_LABEL,'sh',args)
        dockerInstallRunning = false
        s.tx({
            f: 'plugin-info',
            module: DOCKER_HOST_LABEL,
            process: 'docker-install-complete',
            ok: result.ok,
        },'PLUGINMANAGER')
    })
    /**
    * API : Superuser : Pull + Run a plugin as a Docker container, connected
    * back to this Shinobi instance over websocket (client-mode plugin).
    */
    addPluginManagerRoute('post','/docker/deploy', async (req,res,resp) => {
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
    })
    /**
    * API : Superuser : Stop a running plugin Docker container (kept, not removed).
    */
    addPluginManagerRoute('post','/docker/stop', async (req,res,resp) => {
        const packageName = req.body.packageName
        if(!isSafeToken(packageName)){
            s.closeJsonResponse(res,{ ok: false, msg: lang['Invalid Data'] })
            return
        }
        execFile('docker',['stop',containerName(packageName)],{timeout:20000},(err) => {
            s.closeJsonResponse(res,{ ok: !err })
        })
    })
    /**
    * API : Superuser : Start a previously-stopped plugin Docker container.
    */
    addPluginManagerRoute('post','/docker/start', async (req,res,resp) => {
        const packageName = req.body.packageName
        if(!isSafeToken(packageName)){
            s.closeJsonResponse(res,{ ok: false, msg: lang['Invalid Data'] })
            return
        }
        execFile('docker',['start',containerName(packageName)],{timeout:20000},(err) => {
            s.closeJsonResponse(res,{ ok: !err })
        })
    })
    /**
    * API : Superuser : Remove a plugin's Docker container entirely.
    */
    addPluginManagerRoute('post','/docker/remove', async (req,res,resp) => {
        const packageName = req.body.packageName
        if(!isSafeToken(packageName)){
            s.closeJsonResponse(res,{ ok: false, msg: lang['Invalid Data'] })
            return
        }
        execFile('docker',['rm','-f',containerName(packageName)],{timeout:20000},(err) => {
            s.closeJsonResponse(res,{ ok: !err })
        })
    })
    /**
    * API : Superuser : Fetch recent logs for a plugin's Docker container.
    */
    addPluginManagerRoute('get','/docker/logs', async (req,res,resp) => {
        const packageName = req.query.packageName
        if(!isSafeToken(packageName)){
            s.closeJsonResponse(res,{ ok: false, msg: lang['Invalid Data'] })
            return
        }
        execFile('docker',['logs','--tail','300',containerName(packageName)],{timeout:15000,maxBuffer:1024*1024*10},(err,stdout,stderr) => {
            s.closeJsonResponse(res,{ ok: !err, logs: (stdout || '') + (stderr || '') })
        })
    })
    return {
        isDockerAvailable,
        getDockerInfoForModule,
        detectGpuVendors,
        detectAcceleratorReadiness,
        isRunningInContainer,
        detectHostIp,
    }
}
