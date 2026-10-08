//
// Shinobi - Plugin Base
// Copyright (C) 2016-2025 Moe Alam, moeiscool
//
// # Donate
//
// If you like what I am doing here and want me to continue please consider donating :)
// PayPal : paypal@m03.ca
//
const {
    parentPort
} = require('worker_threads');
var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var moment = require('moment');
var overAllProcessingCount = 0
module.exports = function(__dirname, config){
    if(!config){
        return console.log(`Configuration file is missing.`)
    }
    var plugLog = (d1) => {
        console.log(new Date(), config.plug, d1)
    }

    process.on('uncaughtException', (err) => {
        console.error('uncaughtException', err)
    })

    if(!config.dirname){config.dirname = '.'}
    if(!config.port){config.port = 8080}
    if(!config.hostPort){config.hostPort = 8082}
    if(config.systemLog === undefined){config.systemLog = true}
    if(config.connectionType === undefined)config.connectionType = 'websocket'
    // Frames arrive as raw ffmpeg pipe chunks, which don't line up with JPEG boundaries:
    // under load one chunk can carry the end of one frame and the start of the next.
    // Only checking whether a chunk *ends* in EOI then kept appending frame after frame
    // until a chunk happened to line up, so the buffer could grow without limit. A frame
    // is complete at an EOI (FF D9) that ends the chunk or is directly followed by the
    // next frame's SOI (FF D8); an EOI anywhere else (an EXIF thumbnail) is not a boundary.
    const imageBuffers = {}
    const maxImageAgeMs = 5000
    const maxFrameBytes = config.maxFrameBytes || 16 * 1024 * 1024
    const jpegFrameBoundary = Buffer.from([0xff,0xd9,0xff,0xd8])
    const newImageEntry = (now,first) => {
        return {
            chunks: first ? [first] : [],
            bytes: first ? first.length : 0,
            // last bytes held, so a marker split across two chunks is still found
            tail: first ? Buffer.from(first.subarray(-3)) : Buffer.alloc(0),
            started: now,
        }
    }
    const appendImageChunk = (monitorKey,rawChunk) => {
        // postMessage hands Buffers over as plain Uint8Arrays, whose lastIndexOf
        // only finds single bytes - view the same memory as a Buffer
        const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk.buffer,rawChunk.byteOffset,rawChunk.byteLength)
        const now = Date.now()
        for(const key in imageBuffers){
            if(now - imageBuffers[key].started > maxImageAgeMs)delete(imageBuffers[key])
        }
        if(!imageBuffers[monitorKey])imageBuffers[monitorKey] = newImageEntry(now)
        const entry = imageBuffers[monitorKey]
        const probe = entry.tail.length ? Buffer.concat([entry.tail,chunk]) : chunk
        // offset in probe just past the frame's EOI
        let split = -1
        if(probe[probe.length-2] === 0xFF && probe[probe.length-1] === 0xD9){
            split = probe.length
        }else{
            const boundary = probe.lastIndexOf(jpegFrameBoundary)
            if(boundary !== -1)split = boundary + 2
        }
        entry.chunks.push(chunk)
        entry.bytes += chunk.length
        entry.tail = Buffer.from(probe.subarray(-3))
        if(split === -1){
            if(entry.bytes > maxFrameBytes){
                s.debugLog(`Frame for ${monitorKey} passed ${maxFrameBytes} bytes without an end marker, discarding`)
                delete(imageBuffers[monitorKey])
            }
            return null
        }
        const held = Buffer.concat(entry.chunks)
        const end = held.length - probe.length + split
        let frame = held.subarray(0,end)
        // several whole frames arrived at once, keep only the newest
        const previous = frame.lastIndexOf(jpegFrameBoundary,frame.length - 4)
        if(previous !== -1)frame = frame.subarray(previous + 2)
        // whatever follows the boundary is the start of the next frame
        if(end < held.length){
            imageBuffers[monitorKey] = newImageEntry(now,held.subarray(end))
        }else{
            delete(imageBuffers[monitorKey])
        }
        return frame
    }
    s = {
        group: {},
        monitors: {},
        monitorInfo: new Map(),
        dir: {},
        isWin: (process.platform === 'win32'),
        s: (json) => {
            return JSON.stringify(json,null,3)
        }
    }
    //default stream folder check
    if(!config.streamDir){
        if(s.isWin === false){
            config.streamDir = '/dev/shm'
        }else{
            config.streamDir = config.windowsTempDir
        }
        if(!fs.existsSync(config.streamDir)){
            config.streamDir = config.dirname+'/streams/'
        }else{
            config.streamDir += '/streams/'
        }
    }
    s.dir.streams = config.streamDir
    //streams dir
    if(!fs.existsSync(s.dir.streams)){
        fs.mkdirSync(s.dir.streams)
    }
    s.checkCorrectPathEnding = (x) => {
        var length = x.length
        if(x.charAt(length-1) !== '/'){
            x = x+'/'
        }
        return x.replace('__DIR__',config.dirname)
    }
    s.gid = (x) => {
        if(!x){x = 10};
        var t = "";
        var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for( var i = 0; i < x; i++ )
            t += p.charAt(Math.floor(Math.random() * p.length));
        return t;
    };
    s.systemLog = (q,w,e) => {
        if(!w){w=''}
        if(!e){e=''}
        if(config.systemLog===true){
           return console.log(moment().format(),q,w,e)
        }
    }
    s.debugLog = () => {
        if(config.debugLog === true){
            console.log(new Date(),arguments)
            if(config.debugLogVerbose === true){
                console.log(new Error())
            }
        }
    }
    s.detectObject = (buffer,d,tx,frameLocation) => {
        console.log('detectObject handler not set')
    }
    // Shinobi sends every frame with no backpressure. Cap the frames each monitor
    // can have in detection at once and drop the rest, otherwise a plugin that can't
    // keep up queues frames forever and memory climbs until the host runs out. A slot
    // is freed by the plugin's callback, its detectObject promise settling, or the
    // timeout, whichever comes first.
    const maxInFlightPerMonitor = config.maxInFlightPerMonitor || 2
    const detectTimeout = config.detectTimeout || 30000
    const inFlightPerMonitor = {}
    const processImage = async (buffer,d,tx,frameLocation) => {
        const monitorKey = d.ke + d.id
        if((inFlightPerMonitor[monitorKey] || 0) >= maxInFlightPerMonitor){
            if(frameLocation)fs.rm(frameLocation,() => {})
            return
        }
        inFlightPerMonitor[monitorKey] = (inFlightPerMonitor[monitorKey] || 0) + 1
        ++overAllProcessingCount
        sendToParentPort('processCount',overAllProcessingCount)
        let released = false
        const release = () => {
            if(released)return
            released = true
            clearTimeout(watchdog)
            if(--inFlightPerMonitor[monitorKey] <= 0)delete(inFlightPerMonitor[monitorKey])
            --overAllProcessingCount
            sendToParentPort('processCount',overAllProcessingCount)
        }
        const watchdog = setTimeout(release,detectTimeout)
        try{
            const result = s.detectObject(buffer,d,tx,frameLocation,release)
            if(result && typeof result.then === 'function'){
                result.then(release,(err) => {
                    console.error('detectObject error',err)
                    release()
                })
            }
        }catch(err){
            console.error('detectObject error',err)
            release()
        }
    }
    const getCpuUsage = (callback) => {
        var k = {}
        switch(s.platform){
            case'win32':
                k.cmd = "@for /f \"skip=1\" %p in ('wmic cpu get loadpercentage') do @echo %p%"
            break;
            case'darwin':
                k.cmd = "ps -A -o %cpu | awk '{s+=$1} END {print s}'";
            break;
            case'linux':
                k.cmd = 'top -b -n 2 | awk \'toupper($0) ~ /^.?CPU/ {gsub("id,","100",$8); gsub("%","",$8); print 100-$8}\' | tail -n 1';
            break;
            case'freebsd':
                k.cmd = 'vmstat 1 2 | awk \'END{print 100-$19}\''
            break;
	        case'openbsd':
                k.cmd = 'vmstat 1 2 | awk \'END{print 100-$18}\''
            break;
        }
        if(config.customCpuCommand){
          exec(config.customCpuCommand,{encoding:'utf8',detached: true},function(err,d){
              if(s.isWin===true) {
                  d = d.replace(/(\r\n|\n|\r)/gm, "").replace(/%/g, "")
              }
              callback(d)
              s.onGetCpuUsageExtensions.forEach(function(extender){
                  extender(d)
              })
          })
        } else if(k.cmd){
             exec(k.cmd,{encoding:'utf8',detached: true},function(err,d){
                 if(s.isWin===true){
                     d=d.replace(/(\r\n|\n|\r)/gm,"").replace(/%/g,"")
                 }
                 callback(d)
                 s.onGetCpuUsageExtensions.forEach(function(extender){
                     extender(d)
                 })
             })
        } else {
            callback(0)
        }
    }
    const parseNvidiaSmi = function(callback){
        var response = {
            ok: true,
        }
        exec('nvidia-smi -x -q',function(err,data){
            var response = xmlParser.toJson(data)
            var newArray = []
            try{
                JSON.parse(response).nvidia_smi_log.gpu.forEach((gpu)=>{
                    newArray.push({
                        id: gpu.minor_number,
                        name: gpu.product_name,
                        brand: gpu.product_brand,
                        fan_speed: gpu.fan_speed,
                        temperature: gpu.temperature,
                        power: gpu.power_readings,
                        utilization: gpu.utilization,
                        maxClocks: gpu.max_clocks,
                    })
                })
            }catch(err){

            }
            if(callback)callback(newArray)
        })
    }
    s.onCameraInitExtensions = []
    s.onCameraInit = (extender) => {
        s.onCameraInitExtensions.push(extender)
    }
    s.onPluginEvent = []
    s.onPluginEventExtender = (extender) => {
        s.onPluginEvent.push(extender)
    }
    s.MainEventController = async (d,cn,tx) => {
        switch(d.f){
            case'init_plugin_as_host':
                if(!cn){
                    console.log('No CN',d)
                    return
                }
                if(d.key!==config.key){
                    console.log(new Date(),'Plugin Key Mismatch',cn.request.connection.remoteAddress,d)
                    cn.emit('init',{ok:false})
                    cn.disconnect()
                }else{
                    console.log(new Date(),'Plugin Connected to Client',cn.request.connection.remoteAddress)
                    cn.emit('init',{ok:true,plug:config.plug,notice:config.notice,type:config.type})
                }
            break;
            case'monitorUpdate':
                var monitorConfig = d.monitorConfig;
                var groupKey = monitorConfig.ke;
                var monitorId = monitorConfig.mid;
                var monitorDetails = monitorConfig.details;
                var monitorKey = `${groupKey}${monitorId}`
                if(!s.monitors[monitorKey])s.monitors[monitorKey] = Object.assign({}, monitorConfig);
                var isObjectDetectionSeparate = monitorDetails.detector_use_detect_object === '1'
                // Blank object-detection scale fields must fall back to
                // 1280x720 (what libs/ffmpeg/builders.js actually encodes
                // that stream at), not the unrelated base motion-detector
                // scale (monitorDetails.detector_scale_x/y).
                // The non-separate branch defaults to the 640x480 builders.js encodes
                // the base detector stream at; a blank field would otherwise yield NaN.
                var width = parseFloat(isObjectDetectionSeparate ? (monitorDetails.detector_scale_x_object || 1280) : (monitorDetails.detector_scale_x || 640))
                var height = parseFloat(isObjectDetectionSeparate ? (monitorDetails.detector_scale_y_object || 720) : (monitorDetails.detector_scale_y || 480))
                s.monitorInfo.set(monitorKey,{
                    separate: isObjectDetectionSeparate,
                    isObjectDetectionSeparate,
                    width,
                    height,
                })
                delete(imageBuffers[monitorKey])
                for(extender of s.onCameraInitExtensions){
                    extender(monitorConfig, cn, tx)
                }
                // console.log(monitorId, 'registered', s.monitorInfo[monitorKey])
            break;
            case'frameFromRam':
                if(!s.group[d.ke]){
                    s.group[d.ke] = {}
                }
                if(!s.group[d.ke][d.id]){
                    s.group[d.ke][d.id] = {}
                }
                processImage(d.buffer,d,tx,d.frameLocation)
            break;
            case'frame':
                // same key monitorUpdate uses, so a config change actually clears a half-built frame
                var frameMonitorKey = `${d.ke}${d.id}`
                try{
                    const frame = appendImageChunk(frameMonitorKey,d.frame)
                    if(frame)processImage(frame,d,tx)
                }catch(err){
                    s.systemLog(err)
                    delete(imageBuffers[frameMonitorKey])
                }
            break;
        }
        s.onPluginEvent.forEach((extender) => {
            extender(d,cn,tx)
        })
    }
    plugLog('Plugin started as Worker')
    const sendToParentPort = (type,data) => {
        parentPort.postMessage([type,data])
    }

    //start plugin as client

    parentPort.on('message',(data) => {
        s.MainEventController(data,null,s.cx)
    })


    s.cx = (x) => {
        var sendData = Object.assign(x,{
            pluginKey : config.key,
            plug : config.plug
        })
        return sendToParentPort('ocv',sendData)
    }

    if(config.clusterMode){
        plugLog('Plugin enabling Cluster Mode...')
        if(config.clusterBasedOnGpu){
            setTimeout(() => {
                parseNvidiaSmi((gpus)=>{
                    sendToParentPort('gpuUsage',gpus)
                })
            },1000 * 10)
        }else{
            setTimeout(() => {
                getCpuUsage((percent) => {
                    sendToParentPort('cpuUsage',percent)
                })
            },1000 * 10)
        }
    }

    s.getImageDimensions = (d) => {
        var height
        var width
        // Same fix as the monitorUpdate case above - blank object-detection
        // scale fields must fall back to 1280x720 (what the stream is
        // actually encoded at), not the unrelated base motion-detector scale.
        var separate = d.mon.detector_use_detect_object === '1'
        if(separate){
            height = d.mon.detector_scale_y_object || 720
            width = d.mon.detector_scale_x_object || 1280
        }else{
            height = d.mon.detector_scale_y || 480
            width = d.mon.detector_scale_x || 640
        }
        return {
            height : parseFloat(height),
            width : parseFloat(width)
        }
    }
    return s
}
