var os = require('os');
const onvif = require("shinobi-onvif");
const {
    addCredentialsToUrl,
    stringContains,
    getBuffer,
} = require('../common.js')
module.exports = (s,config,lang) => {
    // security: caps the expanded range size — without this, an attacker-supplied range like
    // 1.0.0.0-1.255.255.255 pushes ~16.7M strings into memory synchronously (OOM DoS, see #582)
    const IP_RANGE_MAX_SIZE = 4096
    const ipRange = (start_ip, end_ip) => {
      var startLong = toLong(start_ip);
      var endLong = toLong(end_ip);
      if (startLong > endLong) {
        var tmp = startLong;
        startLong = endLong
        endLong = tmp;
      }
      if(endLong - startLong + 1 > IP_RANGE_MAX_SIZE){
        endLong = startLong + IP_RANGE_MAX_SIZE - 1
      }
      var rangeArray = [];
      var i;
      for (i = startLong; i <= endLong; i++) {
        rangeArray.push(fromLong(i));
      }
      return rangeArray;
    }
    // security: blocks loopback and link-local (incl. 169.254.169.254 cloud metadata) scan targets
    // (see #582). RFC1918 private ranges are intentionally NOT blocked here — scanning the local
    // LAN for cameras is this feature's whole purpose.
    const isScanTargetBlocked = (ipEntry) => {
        const p = ipEntry.split('.').map(Number)
        if(p.length !== 4 || p.some((n) => Number.isNaN(n)))return true
        if(p[0] === 127)return true // 127.0.0.0/8 loopback
        if(p[0] === 169 && p[1] === 254)return true // 169.254.0.0/16 link-local / metadata
        if(p[0] === 0)return true // 0.0.0.0/8
        return false
    }
    const portRange = (lowEnd,highEnd) => {
        var list = [];
        for (var i = lowEnd; i <= highEnd; i++) {
            list.push(i);
        }
        return list;
    }
    //toLong taken from NPM package 'ip'
    const toLong = (ip) => {
      var ipl = 0;
      ip.split('.').forEach(function(octet) {
        ipl <<= 8;
        ipl += parseInt(octet);
      });
      return(ipl >>> 0);
    }
    //fromLong taken from NPM package 'ip'
    const fromLong = (ipl) => {
      return ((ipl >>> 24) + '.' +
          (ipl >> 16 & 255) + '.' +
          (ipl >> 8 & 255) + '.' +
          (ipl & 255) );
    }

    // --- Scan state controller ---
    // Holds the mutable state for a running scan session.
    // A new controller is created each time runOnvifScanner() is called,
    // so concurrent scans each have independent state.
    const createScanController = () => {
        let cancelled = false;   // true = stop permanently, discard progress
        let paused = false;      // true = hold between batches, resume later
        let resumeResolve = null;// resolve handle for the pause-gate promise

        return {
            // Cancel the scan entirely. Any in-flight batch finishes naturally,
            // then the loop exits. Accumulated results are still returned.
            cancel() {
                cancelled = true;
                // If we are currently paused, unblock so the loop can exit.
                if (resumeResolve) {
                    resumeResolve();
                    resumeResolve = null;
                }
            },
            // Pause between batches. The current batch finishes before halting.
            pause() {
                if (!cancelled) paused = true;
            },
            // Resume a paused scan.
            resume() {
                paused = false;
                if (resumeResolve) {
                    resumeResolve();
                    resumeResolve = null;
                }
            },
            get isCancelled() { return cancelled; },
            get isPaused()    { return paused; },
            // Called by the scan loop between batches to honour pause/cancel.
            // Returns true when the loop should stop (cancelled).
            async wait() {
                if (cancelled) return true;
                if (paused) {
                    // Block until resume() or cancel() is called.
                    await new Promise(resolve => { resumeResolve = resolve; });
                }
                return cancelled;
            }
        };
    }

    // Active controllers keyed by scanId so callers can control them later.
    const activeScans = {};
    const activeScansFound = {};

    // Stop (cancel) a scan by id.
    const cancelScan = (scanId, tx) => {
        if (activeScans[scanId]) {
            tx({ f: 'onvif_scan_cancel' })
            activeScans[scanId].cancel();
            tx({ f: 'onvif_scan_ended', foundNumber: activeScansFound[scanId].filter(item => !item.ff).length })
            delete(activeScans[scanId])
            delete(activeScansFound[scanId])
            return true
        }
        return false
    };

    // Pause a scan by id.
    const pauseScan = (scanId) => {
        if (activeScans[scanId]) {
            activeScans[scanId].pause();
            return true
        }
        return false
    };

    // Resume a paused scan by id.
    const resumeScan = (scanId) => {
        if (activeScans[scanId]) {
            activeScans[scanId].resume();
            return true
        }
        return false
    };

    // Returns a snapshot of all active scan ids and their current state.
    const getScanStatus = (scanId) => {
        if (scanId) {
            const ctrl = activeScans[scanId];
            if (!ctrl) return null;
            return { scanId, cancelled: ctrl.isCancelled, paused: ctrl.isPaused, found: activeScansFound[scanId] };
        }
        return Object.keys(activeScans).map(id => ({
            scanId: id,
            cancelled: activeScans[id].isCancelled,
            paused: activeScans[id].isPaused,
            found: activeScansFound[id]
        }));
    };

    const runOnvifScanner = async (options, tx, onProgress) => {
        const scanId = options.scanId || `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        if(activeScans[scanId]){
            tx({ f: 'onvif_scan_started_before' })
            return
        }
        tx({ f: 'onvif_scan_started' })
        const controller = createScanController();
        activeScans[scanId] = controller;
        activeScansFound[scanId] = [];
        var ip = options.ip.replace(/ /g,'')
        var ports = options.port.replace(/ /g,'')
        function callback(result){
            activeScansFound[scanId].push(result);
            if(tx)tx(result)
        }
        if(options.ip === ''){
            var interfaces = os.networkInterfaces()
            var addresses = []
            for (var k in interfaces) {
                for (var k2 in interfaces[k]) {
                    var address = interfaces[k][k2]
                    if (address.family === 'IPv4' && !address.internal) {
                        addresses.push(address.address)
                    }
                }
            }
            const addressRange = []
            addresses.forEach(function(address){
                if(address.indexOf('0.0.0')>-1){return false}
                var addressPrefix = address.split('.')
                delete(addressPrefix[3]);
                addressPrefix = addressPrefix.join('.')
                addressRange.push(`${addressPrefix}1-${addressPrefix}254`)
            })
            ip = addressRange.join(',')
        }
        if(ports === ''){
            ports = '80,8080,8000,7575,8081,9080,8090,8999,8899,2020'
        }
        if(ports.indexOf('-') > -1){
            ports = ports.split('-')
            var portRangeStart = ports[0]
            var portRangeEnd = ports[1]
            ports = portRange(portRangeStart,portRangeEnd);
        }else{
            ports = ports.split(',')
        }
        var ipList = options.ipList
        var onvifUsername = options.user || ''
        var onvifPassword = options.pass || ''
        ip.split(',').forEach(function(addressRange){
            var ipRangeStart = addressRange[0]
            var ipRangeEnd = addressRange[1]
            if(addressRange.indexOf('-')>-1){
                addressRange = addressRange.split('-');
                ipRangeStart = addressRange[0]
                ipRangeEnd = addressRange[1]
            }else{
                ipRangeStart = addressRange
                ipRangeEnd = addressRange
            }
            if(!ipList){
                ipList = ipRange(ipRangeStart,ipRangeEnd);
            }else{
                ipList = ipList.concat(ipRange(ipRangeStart,ipRangeEnd))
            }
        })
        var hitList = []
        ipList.filter((ipEntry) => !isScanTargetBlocked(ipEntry)).forEach((ipEntry,n) => {
            ports.forEach((portEntry,nn) => {
                hitList.push({
                    xaddr : 'http://' + ipEntry + ':' + portEntry + '/onvif/device_service',
                    user : onvifUsername,
                    pass : onvifPassword,
                    ip: ipEntry,
                    port: portEntry,
                })
            })
        })
        var responseList = []
        const totalItems = hitList.length
        var processedItems = 0
        const BATCH_SIZE = 20
        for(let i = 0; i < hitList.length; i += BATCH_SIZE){
            const shouldStop = await controller.wait();
            if (shouldStop) break;

            const batch = hitList.slice(i, i + BATCH_SIZE)
            await Promise.all(batch.map(async (camera) => {
                try{
                    var device = new onvif.OnvifDevice(camera)
                    var info = await device.init()
                    var date = null
                    try{
                        date = await device.services.device.getSystemDateAndTime()
                    }catch(err){
                        s.debugLog(err)
                    }
                    if(!device.current_profile || !device.current_profile.token){
                        throw new Error('ONVIF_NO_PROFILE')
                    }
                    var stream = await device.services.media.getStreamUri({
                        ProfileToken : device.current_profile.token,
                        Protocol : 'RTSP' /* Won't work for RTSPS (SRTP) */
                    })
                    var cameraResponse = {
                        ip: camera.ip,
                        port: camera.port,
                        info: info,
                        date: date,
                        uri: stream.data.GetStreamUriResponse.MediaUri.Uri
                    }
                    try{
                        const camPtzConfigs = (await device.services.ptz.getConfigurations()).data.GetConfigurationsResponse
                        if(
                            camPtzConfigs.PTZConfiguration &&
                            (
                                camPtzConfigs.PTZConfiguration.PanTiltLimits ||
                                camPtzConfigs.PTZConfiguration.ZoomLimits
                            )
                        ){
                            cameraResponse.isPTZ = true
                        }
                    }catch(err){
                        s.debugLog(err)
                    }
                    responseList.push(cameraResponse)
                    var imageSnap
                    try{
                        const snapUri = addCredentialsToUrl({
                            username: onvifUsername,
                            password: onvifPassword,
                            url: (await device.services.media.getSnapshotUri({
                                ProfileToken : device.current_profile.token,
                            })).data.GetSnapshotUriResponse.MediaUri.Uri,
                        });
                        imageSnap = (await getBuffer(snapUri)).toString('base64');
                    }catch(err){
                        s.debugLog(err)
                    }
                    callback(Object.assign(cameraResponse,{f: 'onvif', snapShot: imageSnap}))
                }catch(err){
                    const message = (err && err.message) ? err.message : String(err)
                    const searchError = (find) => {
                        // lowercase the needle too: stringContains lowercases only the
                        // haystack, so uppercase errno codes (ECONNREFUSED, ETIMEDOUT, …)
                        // never matched and every one fell through to the default case.
                        return stringContains(find.toLowerCase(),message,true)
                    }
                    var foundDevice = false
                    var errorMessage = ''
                    switch(true){
                        case searchError('ECONNREFUSED'):
                        case searchError('EHOSTUNREACH'):
                        case searchError('ENETUNREACH'):
                        case searchError('EHOSTDOWN'):
                        case searchError('ENOTFOUND'):
                            foundDevice = false
                        break;
                        case searchError('ECONNRESET'):
                        case searchError('ETIMEDOUT'):
                        case searchError('ESOCKETTIMEDOUT'):
                        case searchError('EPIPE'):
                            foundDevice = true
                            errorMessage = lang.ONVIFErrNetwork
                        break;
                        case searchError('ONVIF_NO_PROFILE'):
                            foundDevice = true
                            errorMessage = lang.ONVIFErrNoProfile
                        break;
                        case searchError('400'):
                            foundDevice = true
                            errorMessage = lang.ONVIFErr400
                        break;
                        case searchError('401'):
                        case searchError('403'):
                            foundDevice = true
                            errorMessage = lang.ONVIFErr401
                        break;
                        case searchError('404'):
                            foundDevice = true
                            errorMessage = lang.ONVIFErr404
                        break;
                        case searchError('405'):
                            foundDevice = true
                            errorMessage = lang.ONVIFErr405
                        break;
                        case searchError('500'):
                        case searchError('502'):
                        case searchError('503'):
                            foundDevice = true
                            errorMessage = lang.ONVIFErr50x
                        break;
                        default:
                            foundDevice = true
                            errorMessage = `${lang.ONVIFErrUnknown} (${message.split('\n')[0].slice(0,120)})`
                        break;
                    }
                    if(foundDevice){
                        callback({
                            f: 'onvif',
                            ff: 'failed_capture',
                            ip: camera.ip,
                            port: camera.port,
                            error: errorMessage
                        })
                    }
                    if(config.debugLogVerbose)s.debugLog(err);
                }
            }))

            processedItems = Math.min(i + BATCH_SIZE, totalItems)
            const percent = totalItems > 0
                ? Math.round((processedItems / totalItems) * 100)
                : 100
            if(onProgress) onProgress(percent, processedItems, totalItems)
        }

        tx({ f: 'onvif_scan_ended', foundNumber: responseList.length })
        delete(activeScans[scanId]);
        delete(activeScansFound[scanId]);
        return { ok: true, scanId, results: responseList };
    }
    return {
        ipRange,
        portRange,
        runOnvifScanner,
        cancelScan,
        pauseScan,
        resumeScan,
        getScanStatus,
    }
}
