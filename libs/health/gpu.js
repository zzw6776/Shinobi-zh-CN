// GPU utilization providers.
//
// Each vendor is a provider that reports one percentage. Availability is decided once, at
// startup, by actually running the read and requiring a usable number back -- checking that
// the binary exists is not enough, because `rocm-smi` installs on machines with no AMD card
// and still exits 0 while printing a driver error. A provider that does not produce a number
// at startup is never polled again, so an install pays nothing for vendors it does not have.
const fs = require('fs');
const exec = require('child_process').exec;

module.exports = function(s,config){
    const COMMAND_TIMEOUT_MS = 4000
    // stdout is handed back even on a non-zero exit: a sampling tool that gets terminated on
    // purpose still produced usable output before it died. Whether the command actually
    // worked is decided by whether a number parses out of it, never by the exit code --
    // rocm-smi exits 0 while printing a driver error, so the code proves nothing either way.
    function runCommand(command){
        return new Promise((resolve) => {
            exec(command,{ timeout: COMMAND_TIMEOUT_MS, windowsHide: true },(err,stdout) => {
                resolve(`${stdout || ''}`)
            })
        })
    }
    function toPercent(value){
        const number = parseFloat(value)
        if(isNaN(number) || !isFinite(number))return null
        if(number < 0)return 0
        if(number > 100)return 100
        return number
    }
    function averageOf(values){
        const usable = values.filter((value) => value !== null)
        if(usable.length === 0)return null
        const total = usable.reduce((sum,value) => sum + value,0)
        return { percent: total / usable.length, deviceCount: usable.length }
    }
    // amdgpu exposes a ready-made busy percentage per card. Reading a file beats spawning
    // rocm-smi (a Python program) every ten seconds, so it is tried first.
    function readAmdSysfs(){
        try{
            const cards = fs.readdirSync('/sys/class/drm').filter((name) => /^card\d+$/.test(name))
            const values = cards.map((card) => {
                try{
                    return toPercent(fs.readFileSync(`/sys/class/drm/${card}/device/gpu_busy_percent`,'utf8').trim())
                }catch(err){
                    return null
                }
            })
            return averageOf(values)
        }catch(err){
            return null
        }
    }
    const providers = [
        {
            id: 'nvidia',
            label: 'NVIDIA',
            read: async () => {
                const output = await runCommand('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits')
                if(!output)return null
                const values = `${output}`.trim().split('\n')
                    .map((line) => toPercent(line.trim()))
                return averageOf(values)
            },
        },
        {
            id: 'rocm',
            label: 'ROCm',
            read: async () => {
                const fromSysfs = readAmdSysfs()
                if(fromSysfs)return fromSysfs
                const output = await runCommand('rocm-smi --showuse --csv')
                if(!output)return null
                // rocm-smi prints its driver errors on stdout and still exits 0, so the only
                // reliable signal is whether a usage column actually parsed.
                const values = `${output}`.trim().split('\n')
                    .filter((line) => /^card\d*,/i.test(line.trim()))
                    .map((line) => toPercent(line.split(',')[1]))
                return averageOf(values)
            },
        },
        {
            id: 'openvino',
            label: 'OpenVINO',
            read: async () => {
                // Intel has no busy-percent in sysfs the way amdgpu does; intel_gpu_top is
                // the supported source and needs a sampling window, so this provider costs
                // more than the others. It is only ever run on machines where it works.
                // SIGINT rather than SIGKILL so it closes its JSON cleanly, and `timeout`
                // bounds it because intel_gpu_top streams until it is stopped.
                const output = await runCommand('timeout -s INT 2 intel_gpu_top -J -s 400 -o -')
                if(!output)return null
                const busyValues = `${output}`.match(/"busy"\s*:\s*([0-9.]+)/g) || []
                if(busyValues.length === 0)return null
                const values = busyValues
                    .map((entry) => toPercent(entry.split(':')[1]))
                    .filter((value) => value !== null)
                if(values.length === 0)return null
                // Take the busiest engine in the most recent sample rather than an average
                // across engines, which would read low whenever only one engine is in use.
                return { percent: Math.max(...values), deviceCount: 1 }
            },
        },
    ]
    s.gpuProvidersAvailable = []
    s.detectGpuProviders = async function(){
        for(const provider of providers){
            let reading = null
            try{
                reading = await provider.read()
            }catch(err){
                reading = null
            }
            if(reading && reading.percent !== null && reading.percent !== undefined){
                s.gpuProvidersAvailable.push(provider)
                s.systemLog(`GPU metrics enabled : ${provider.label}${reading.deviceCount > 1 ? ` (${reading.deviceCount} devices)` : ''}`)
            }
        }
        return s.gpuProvidersAvailable.map((provider) => provider.id)
    }
    // A provider that worked at startup can stop working later -- a driver unloaded, a card
    // pulled, a tool upgraded out from under us. Rather than keep spawning a failing command
    // every ten seconds forever, a provider is dropped after this many consecutive failures.
    // A couple of misses are tolerated first so a transient blip does not lose the metric.
    const MAX_CONSECUTIVE_FAILURES = 3
    let readInProgress = false
    function dropProvider(provider,reason){
        const position = s.gpuProvidersAvailable.indexOf(provider)
        if(position > -1)s.gpuProvidersAvailable.splice(position,1)
        delete (s.lastGpuReadings || {})[provider.id]
        s.lastGpuReadings = (s.lastGpuReadings || []).filter((reading) => reading.id !== provider.id)
        s.systemLog(`GPU metrics stopped : ${provider.label} (${reason}). It will not be polled again until Shinobi restarts.`)
    }
    s.readGpuUsage = async function(){
        if(s.gpuProvidersAvailable.length === 0)return []
        // A slow provider must not let polls pile up on top of each other.
        if(readInProgress)return s.lastGpuReadings || []
        readInProgress = true
        try{
            const readings = await Promise.all(s.gpuProvidersAvailable.slice().map(async (provider) => {
                let reading = null
                try{
                    reading = await provider.read()
                }catch(err){
                    reading = null
                }
                if(!reading){
                    provider.failureCount = (provider.failureCount || 0) + 1
                    if(provider.failureCount >= MAX_CONSECUTIVE_FAILURES){
                        dropProvider(provider,`no reading ${provider.failureCount} times in a row`)
                    }
                    return null
                }
                provider.failureCount = 0
                return {
                    id: provider.id,
                    label: provider.label,
                    percent: reading.percent,
                    deviceCount: reading.deviceCount,
                }
            }))
            s.lastGpuReadings = readings.filter((reading) => !!reading)
        }finally{
            readInProgress = false
        }
        return s.lastGpuReadings
    }
}
