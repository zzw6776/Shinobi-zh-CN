const fs = require('fs')
const { execFile } = require('child_process')
// What GPUs this machine has, and what acceleration runtimes are installed for them.
// Deliberately NOT part of docker.js : a plugin installed natively (npm/installer) uses
// the very same CUDA / ROCm / OpenVINO runtimes, so this has to be reportable on a
// machine with no Docker at all.
module.exports = (s) => {
    // Maps a detected vendor onto the acceleration variant plugins are published under.
    const VENDOR_ACCELERATION = {
        nvidia: 'cuda',
        amd: 'rocm',
        intel: 'openvino',
    }
    const VENDOR_LABELS = {
        nvidia: 'NVIDIA',
        amd: 'AMD',
        intel: 'Intel',
    }
    const vendorOfDevice = (line) => {
        const text = line.toLowerCase()
        if(text.indexOf('nvidia') > -1)return 'nvidia'
        if(/amd|advanced micro devices|ati /.test(text))return 'amd'
        if(text.indexOf('intel') > -1)return 'intel'
        return null
    }
    // PCI vendor ids as sysfs reports them, for the no-lspci fallback below.
    const PCI_VENDORS = {
        '0x10de': 'nvidia',
        '0x1002': 'amd',
        '0x1022': 'amd',
        '0x8086': 'intel',
    }
    const runCommand = (command,args,timeout = 8000) => {
        return new Promise((resolve) => {
            execFile(command,args,{timeout},(err,stdout) => resolve(err ? null : (stdout || '').trim()))
        })
    }
    // Fallback for when lspci is not installed - the normal case inside a container,
    // including Shinobi's own image. /sys/class/drm and /proc/driver/nvidia are visible
    // exactly when the GPU has been passed through, so this detects the situation that
    // actually matters rather than reporting "no GPU" on a machine whose card is right
    // there and usable.
    const detectGpuVendorsFromSysfs = () => {
        const found = { nvidia: false, amd: false, intel: false, devices: [] }
        // NVIDIA first, since it also publishes a human readable model name.
        try{
            fs.readdirSync('/proc/driver/nvidia/gpus').forEach((gpuId) => {
                let name = 'NVIDIA GPU'
                try{
                    const information = fs.readFileSync(`/proc/driver/nvidia/gpus/${gpuId}/information`,'utf8')
                    const model = information.split('\n').find((line) => line.indexOf('Model:') === 0)
                    if(model)name = model.replace('Model:','').trim()
                }catch(err){}
                found.nvidia = true
                found.devices.push({ vendor: 'nvidia', acceleration: VENDOR_ACCELERATION.nvidia, name })
            })
        }catch(err){}
        try{
            fs.readdirSync('/sys/class/drm')
                .filter((entry) => /^card[0-9]+$/.test(entry))
                .forEach((card) => {
                    let vendorId
                    try{
                        vendorId = fs.readFileSync(`/sys/class/drm/${card}/device/vendor`,'utf8').trim().toLowerCase()
                    }catch(err){
                        return
                    }
                    const vendor = PCI_VENDORS[vendorId]
                    // NVIDIA cards were already listed above, with a better name than
                    // anything available here.
                    if(!vendor || vendor === 'nvidia')return
                    found[vendor] = true
                    found.devices.push({
                        vendor: vendor,
                        acceleration: VENDOR_ACCELERATION[vendor],
                        name: `${VENDOR_LABELS[vendor]} GPU (${card})`,
                    })
                })
        }catch(err){}
        return found
    }
    const detectGpuVendors = () => {
        return new Promise((resolve) => {
            const none = { nvidia: false, amd: false, intel: false, devices: [] }
            if(process.platform !== 'linux')return resolve(none)
            execFile('lspci',[],{timeout:8000},(err,stdout) => {
                if(err)return resolve(detectGpuVendorsFromSysfs())
                const found = Object.assign({},none,{devices:[]})
                ;(stdout || '').split('\n')
                    .filter((line) => /vga compatible controller|3d controller|display controller/i.test(line))
                    .forEach((line) => {
                        const vendor = vendorOfDevice(line)
                        if(!vendor)return
                        found[vendor] = true
                        found.devices.push({
                            vendor: vendor,
                            acceleration: VENDOR_ACCELERATION[vendor],
                            // Drop the PCI slot and class prefix ("00:02.0 VGA compatible
                            // controller: ") so what is shown is just the hardware name.
                            name: line.replace(/^\S+\s+[^:]+:\s*/,'').trim(),
                        })
                    })
                // lspci existing but listing nothing is the other in-container case (a
                // passed through /dev/dri with no PCI view of it), so try sysfs too.
                resolve(found.devices.length > 0 ? found : detectGpuVendorsFromSysfs())
            })
        })
    }
    // CUDA : the number that matters for "will a CUDA build run here" is the version the
    // installed DRIVER supports, which nvidia-smi reports, not whatever CUDA toolkit
    // happens to be unpacked on disk. nvcc is reported separately when present because a
    // natively built plugin may need it to compile.
    const detectCuda = async () => {
        const status = { name: 'CUDA', acceleration: 'cuda', installed: false }
        const smi = await runCommand('nvidia-smi',['--query-gpu=driver_version','--format=csv,noheader'])
        if(smi){
            status.installed = true
            status.driverVersion = smi.split('\n')[0].trim()
        }
        const smiHeader = await runCommand('nvidia-smi',[])
        if(smiHeader){
            const match = smiHeader.match(/CUDA Version:\s*([0-9.]+)/)
            if(match)status.version = match[1]
        }
        const nvcc = await runCommand('nvcc',['--version'])
        if(nvcc){
            const match = nvcc.match(/release\s*([0-9.]+)/)
            if(match)status.toolkitVersion = match[1]
        }
        if(!status.installed){
            // The driver exposes this even when nvidia-smi is not installed (a container
            // without the CLI, most often), so the GPU is still usable.
            try{
                const version = fs.readFileSync('/proc/driver/nvidia/version','utf8')
                const match = version.match(/Kernel Module\s+([0-9.]+)/)
                if(match){
                    status.installed = true
                    status.driverVersion = match[1]
                }
            }catch(err){}
        }
        return status
    }
    // ROCm : version lives in a plain file the packages drop, which is more reliable than
    // parsing rocminfo (absent unless rocminfo itself is installed).
    const detectRocm = async () => {
        const status = { name: 'ROCm', acceleration: 'rocm', installed: false }
        ;['/opt/rocm/.info/version','/opt/rocm/.info/version-utils'].some((path) => {
            try{
                status.version = fs.readFileSync(path,'utf8').trim().split('\n')[0]
                status.installed = true
                return true
            }catch(err){
                return false
            }
        })
        // The kernel side is what actually has to be there for a ROCm build to see the
        // GPU, and it is present independently of the userspace packages above.
        status.kernelDriver = fs.existsSync('/dev/kfd')
        if(!status.installed && status.kernelDriver){
            const rocminfo = await runCommand('rocminfo',[])
            if(rocminfo)status.installed = true
        }
        return status
    }
    // OpenVINO : Shinobi's plugins reach the Intel GPU through the OpenCL ICD (compute
    // runtime) and the VAAPI media driver, so those are what gets reported - the OpenVINO
    // python/runtime package itself lives inside the plugin, not on the host.
    const detectOpenvino = async () => {
        const status = { name: 'OpenVINO (Intel Compute Runtime)', acceleration: 'openvino', installed: false }
        status.renderDevice = fs.existsSync('/dev/dri')
        const icdPaths = [
            '/usr/lib/x86_64-linux-gnu/intel-opencl/libigdrcl.so',
            '/usr/lib/x86_64-linux-gnu/dri/iHD_drv_video.so',
        ]
        status.installed = icdPaths.some((path) => fs.existsSync(path))
        const packageVersion = await runCommand('dpkg-query',['-W','-f=${Version}','intel-opencl-icd'])
        if(packageVersion)status.version = packageVersion.trim()
        if(!status.version){
            const vainfo = await runCommand('vainfo',['--version'])
            if(vainfo){
                const match = vainfo.match(/([0-9]+\.[0-9]+\.[0-9]+)/)
                if(match)status.version = match[1]
            }
        }
        return status
    }
    // Reported per vendor present on this machine. A runtime for a GPU that is not here
    // is not interesting, and probing for it only slows the panel down.
    const detectAccelerationRuntimes = async (gpuVendors) => {
        const runtimes = {}
        const wanted = gpuVendors || {}
        await Promise.all([
            wanted.nvidia ? detectCuda().then((r) => { runtimes.cuda = r }) : null,
            wanted.amd ? detectRocm().then((r) => { runtimes.rocm = r }) : null,
            wanted.intel ? detectOpenvino().then((r) => { runtimes.openvino = r }) : null,
        ].filter(Boolean))
        return runtimes
    }
    return {
        VENDOR_ACCELERATION,
        detectGpuVendors,
        detectAccelerationRuntimes,
    }
}
