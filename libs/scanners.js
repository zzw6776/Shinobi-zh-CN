const net = require('net')
const ALLOWED_PROBE_SCHEMES = ['rtsp:', 'rtsps:', 'http:', 'https:']
const isProbeUrlSafe = (rawUrl) => {
    let parsed
    try { parsed = new URL(rawUrl) } catch(e) { return false }
    if(!ALLOWED_PROBE_SCHEMES.includes(parsed.protocol)) return false
    let host = parsed.hostname.replace(/^\[|\]$/g, '') // strip IPv6 brackets
    if(!host) return false
    if(/^[0-9]+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) return false
    const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
    if(mapped) host = mapped[1]
    if(net.isIPv4(host)){
        const p = host.split('.').map(Number)
        if(p[0] === 0) return false                          // 0.0.0.0/8  "this host"
        if(p[0] === 10) return false                         // 10.0.0.0/8  private
        if(p[0] === 172 && p[1] >= 16 && p[1] <= 31) return false // 172.16.0.0/12 private
        if(p[0] === 192 && p[1] === 168) return false        // 192.168.0.0/16 private
        if(p[0] === 169 && p[1] === 254) return false        // 169.254.0.0/16 link-local / metadata
        if(p[0] === 100 && p[1] >= 64 && p[1] <= 127) return false // 100.64.0.0/10 CGNAT
    }
    if(net.isIPv6(host)){
        const lower = host.toLowerCase()
        if(lower === '::') return false                      // IPv6 unspecified
        if(/^fe[89ab]/i.test(lower)) return false            // fe80::/10 link-local
        if(/^f[cd]/i.test(lower)) return false               // fc00::/7 unique local
    }
    return true
}
module.exports = function(s,config,lang,app,io){
    const {
        ffprobe,
    } = require('./ffmpeg/utils.js')(s,config,lang)
    const {
        runOnvifScanner,
        cancelScan,
        pauseScan,
        resumeScan,
        getScanStatus,
    } = require('./scanners/utils.js')(s,config,lang)
    const onWebSocketConnection = async (cn) => {
        const tx = function(z){
            s.tx(z,`GRP_${cn.ke}`)
        }
        cn.on('f',(d) => {
            if(!cn.ke)return;
            switch(d.f){
                case'onvif':
                    d.scanId = cn.ke
                    runOnvifScanner(d,tx, (percent, processedItems, totalItems) => {
                        tx({ f: 'onvif_scan_progress', percent, processedItems, totalItems })
                    })
                break;
                case'onvif_scan_cancel':
                    cancelScan(cn.ke, tx)
                break;
                case'onvif_scan_pause':
                    if(pauseScan(cn.ke)){
                        tx({ f: 'onvif_scan_pause' })
                    }
                break;
                case'onvif_scan_resume':
                    if(resumeScan(cn.ke)){
                        tx({ f: 'onvif_scan_resume' })
                    }
                break;
                case'onvif_scan_status':
                    const scanStatus = getScanStatus(cn.ke);
                    if(scanStatus){
                        const {
                            cancelled,
                            paused,
                            found
                        } = scanStatus;
                        tx({ f: 'onvif_scan_status', active: true, cancelled, paused, found })
                    }else{
                        tx({ f: 'onvif_scan_status', active: false })
                    }
                break;
            }
        })
    }
    s.onWebSocketConnection(onWebSocketConnection)
    /**
    * API : FFprobe
     */
    app.get(config.webPaths.apiPrefix+':auth/probe/:ke',function (req,res){
        s.auth(req.params,function(user){
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
            } = s.checkPermission(user);
            if(
                isRestrictedApiKey && apiKeyPermissions.control_monitors_disallowed
            ){
                s.closeJsonResponse(res,{
                    ok: false,
                    msg: lang['Not Authorized']
                });
                return
            }
            if(!config.disableSSRFSelfTargetFilter && !isProbeUrlSafe(req.query.url)){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return
            }
            ffprobe(req.query.url,req.params.auth,(endData) => {
                s.closeJsonResponse(res,endData)
            })
        },res,req);
    })
}
