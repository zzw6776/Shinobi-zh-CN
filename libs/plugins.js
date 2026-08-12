var socketIOclient = require('socket.io-client');
var fs = require('fs');
module.exports = function(s,config,lang,app,io){
    const currentPluginCpuUsage = {}
    const currentPluginGpuUsage = {}
    const currentPluginFrameProcessingCount = {}
    const pluginHandlersSet = {}
    const {
        triggerEvent,
    } = require('./events/utils.js')(s,config,lang)
    require('./plugins/superUser.js')(s,config,lang,app,io,{
        currentPluginCpuUsage: currentPluginCpuUsage,
        currentPluginGpuUsage: currentPluginGpuUsage,
        currentPluginFrameProcessingCount: currentPluginFrameProcessingCount,
        pluginHandlersSet: pluginHandlersSet,
    })
    //send data to detector plugin
    s.ocvTx = function(data){
        // chaining coming in future update
        s.sendToAllDetectors(data)
    }
    //function for receiving detector data
    s.pluginEventController = function(d){
        switch(d.f){
            case'trigger':
                triggerEvent(d)
            break;
            case's.tx':
                s.tx(d.data,d.to)
            break;
            case'log':
                s.systemLog('PLUGIN : '+d.plug+' : ',d)
            break;
            case's.sqlQuery':
                s.sqlQuery(d.query,d.values)
            break;
            case's.knexQuery':
                s.knexQuery(d.options)
            break;
        }
    }
    s.connectedPlugins = {}
    s.connectedDetectorPlugins = {}
    s.detectorPluginArray = []
    s.isAtleatOneDetectorPluginConnected = false
    s.addDetectorPlugin = function(name,d){
        const newDetector = {
            started: s.timeObject(),
            id: d.id,
            plug: d.plug,
            notice: d.notice,
            isClientPlugin: d.isClientPlugin,
            isHostPlugin: d.isHostPlugin,
            connectionType: d.connectionType
        };
        if(config.useOldPluginConnectionMethod === true){
            s.ocv = newDetector
        }
        s.connectedDetectorPlugins[d.plug] = newDetector
        s.resetDetectorPluginArray()
        s.runExtensionsForArray('onPluginConnected', null, [d.plug, newDetector])
        s.tx({f:'plugin-info',process:'connection-status',module:d.plug,status:'connected',plugin:newDetector},'PLUGINMANAGER')
    }
    s.removeDetectorPlugin = function(name){
        const theDetector = Object.assign({}, s.connectedDetectorPlugins[name])
        if(config.oldPluginConnectionMethod === true && s.ocv && s.ocv.plug === name){
            delete(s.ocv)
        }
        delete(s.connectedDetectorPlugins[name])
        s.resetDetectorPluginArray(name)
        s.runExtensionsForArray('onPluginDisconnected', null, [name, theDetector])
        s.tx({f:'plugin-info',process:'connection-status',module:name,status:'disconnected',plugin:theDetector},'PLUGINMANAGER')
    }
    s.resetDetectorPluginArray = function(){
        let pluginArray = []
        Object.keys(s.connectedPlugins).forEach(function(name){
            var plugin = s.connectedPlugins[name]
            if(plugin.plugged === true && plugin.type === 'detector'){
                pluginArray.push(name)
            }
        })
        if(pluginArray.length > 0){
            s.isAtleatOneDetectorPluginConnected = true
        }else{
            s.isAtleatOneDetectorPluginConnected = false
        }
        s.debugLog(`resetDetectorPluginArray : ${JSON.stringify(pluginArray)}`)
        s.detectorPluginArray = pluginArray
    }

    if(config.detectorPluginsCluster){
        if(config.clusterUseBasicFrameCount === undefined)config.clusterUseBasicFrameCount = true;
        if(config.clusterUseBasicFrameCount){
            // overAllProcessingCount
            var getPluginWithLowestUtilization = () => {
                var selectedPluginServer = null
                var lowestUsed = 1000
                s.detectorPluginArray.forEach((pluginName) => {
                    const processCount = currentPluginFrameProcessingCount[pluginName] || 0
                    if(processCount < lowestUsed){
                        selectedPluginServer = pluginName
                        lowestUsed = processCount
                    }
                })
                if(selectedPluginServer){
                    return s.connectedPlugins[selectedPluginServer]
                }else{
                    return {tx: () => {}}
                }
            }
        }else{

            if(config.clusterBasedOnGpu){
                var getPluginWithLowestUtilization = () => {
                    var selectedPluginServer = null
                    var lowestUsed = 1000
                    s.detectorPluginArray.forEach((pluginName) => {
                        var overAllPercent = 0
                        var gpus = currentPluginGpuUsage[pluginName]
                        gpus.forEach((gpu) => {
                            console.log(gpu)
                            const percent = gpu.utilization
                            overAllPercent += percent
                        })
                        if((overAllPercent / gpus.length) < lowestUsed){
                            selectedPluginServer = pluginName
                            lowestUsed = overAllPercent
                        }
                    })
                    if(selectedPluginServer){
                        return s.connectedPlugins[selectedPluginServer]
                    }else{
                        return {tx: () => {}}
                    }
                }
            }else{
                var getPluginWithLowestUtilization = () => {
                    var selectedPluginServer = null
                    var lowestUsed = 1000
                    s.detectorPluginArray.forEach((pluginName) => {
                        const percent = currentPluginCpuUsage[pluginName]
                        if(percent < lowestUsed){
                            selectedPluginServer = pluginName
                            lowestUsed = percent
                        }
                    })
                    if(selectedPluginServer){
                        return s.connectedPlugins[selectedPluginServer]
                    }else{
                        return {tx: () => {}}
                    }
                }
            }
        }
        s.debugLog(`Detector Plugins running in Cluster Mode`)
        s.sendToAllDetectors = function(data){
            getPluginWithLowestUtilization().tx(data)
        }
    }else{
        s.sendToAllDetectors = function(data){
            s.detectorPluginArray.forEach(function(name){
                s.connectedPlugins[name].tx(data)
            })
        }
    }
    s.sendToDetector = function(pluginName, data){
        const detector = s.connectedPlugins[pluginName];
        // A monitor can name a detector that is not (or is no longer) connected - a plugin
        // renamed, removed, or simply not started yet. Dropping that silently is
        // indistinguishable from object detection being broken, so say so.
        if(!detector || detector.plugged !== true){
            s.debugLog(`sendToDetector : "${pluginName}" is not connected, frame dropped. Connected detectors: ${JSON.stringify(s.detectorPluginArray)}`)
            return
        }
        detector.tx(data);
    }
    s.sendDetectorInfoToClient = function(data,txFunction){
        s.detectorPluginArray.forEach(function(name){
            var detectorData = Object.assign({}, data, {
                notice: s.connectedDetectorPlugins[name].notice,
                plug: name
            })
            txFunction(detectorData)
        })
    }
    // s.sendToDetectorsInChain = function(){
    //
    // }
    s.pluginInitiatorSuccess = function(mode,d,cn){
        s.systemLog('pluginInitiatorSuccess',d)
        if(!s.connectedPlugins[d.plug]){
            s.connectedPlugins[d.plug]={
                plug: d.plug,
                type: d.type
            }
        }
        s.connectedPlugins[d.plug].plugged = true
        if(mode==='client'){
            s.connectedPlugins[d.plug].tx = function(x){return cn.emit('f',x)}
            //is in client mode (camera.js is client)
            cn.pluginEngine = d.plug
            s.systemLog('Connected to plugin : Detector - '+d.plug+' - '+d.type)
            switch(d.type){
                default:case'detector':
                    if(config.oldPluginConnectionMethod)cn.ocv = 1
                    cn.detectorPlugin = d.plug
                    s.addDetectorPlugin(d.plug,{
                        id: cn.id,
                        plug: d.plug,
                        notice: d.notice,
                        isClientPlugin: true,
                        connectionType: d.connectionType
                    })
                    s.tx({f:'detector_plugged',plug:d.plug,notice:d.notice},'CPU')
                break;
            }
        }else{
            //is in host mode (camera.js is client)
            switch(d.type){
                default:case'detector':
                    s.addDetectorPlugin(d.plug,{
                        id: "host",
                        plug: d.plug,
                        notice: d.notice,
                        isHostPlugin: true,
                        connectionType: d.connectionType
                    })
                    s.tx({f:'detector_plugged',plug:d.plug,notice:d.notice},'CPU')
                break;
            }
        }
        s.tx({f:'readPlugins',ke:d.ke},'CPU')
    }
    s.pluginInitiatorFail=function(mode,d,cn){
        if(s.connectedPlugins[d.plug])s.connectedPlugins[d.plug].plugged=false
        if(mode==='client'){
            //is in client mode (camera.js is client)
            cn.disconnect()
        }else{
            //is in host mode (camera.js is client)
        }
    }
    if(config.plugins&&config.plugins.length>0){
        config.plugins.forEach(function(v){
            s.connectedPlugins[v.id]={
                plug: v.id,
                type: v.type
            }
            if(!v.enabled){return}
            if(v.mode==='host'){
                //is in host mode (camera.js is client)
                if(v.https===true){
                    v.https='https://'
                }else{
                    v.https='http://'
                }
                if(!v.port){
                    v.port=80
                }
                var socket = socketIOclient(v.https+v.host+':'+v.port)
                s.connectedPlugins[v.id].tx = function(x){return socket.emit('f',x)}
                socket.on('connect', function(cn){
                    s.systemLog('Connected to plugin (host) : '+v.id)
                    s.connectedPlugins[v.id].tx({f:'init_plugin_as_host',key:v.key})
                });
                socket.on('init',function(d){
                    s.systemLog('Initialize Plugin : Host',d)
                    if(d.ok === true){
                        s.pluginInitiatorSuccess("host",d)
                    }else{
                        s.pluginInitiatorFail("host",d)
                    }
                })
                socket.on('ocv',s.pluginEventController);
                socket.on('disconnect', function(){
                    s.connectedPlugins[v.id].plugged=false
                    if(v.type === 'detector'){
                        s.tx({f:'detector_unplugged',plug:v.id},'CPU')
                        s.removeDetectorPlugin(v.id)
                        s.sendDetectorInfoToClient({f:'detector_plugged'},function(data){
                            s.tx(data,'CPU')
                        })
                    }
                    s.systemLog('Plugin Disconnected : '+v.id)
                    clearInterval(s.connectedPlugins[v.id].reconnector)
                    s.connectedPlugins[v.id].reconnector = setInterval(function(){
                        if(socket.connected === true){
                            clearInterval(s.connectedPlugins[v.id].reconnector)
                            delete s.connectedPlugins[v.id].reconnector
                        }else{
                            socket.connect()
                        }
                    },1000*2)
                });
                s.connectedPlugins[v.id].ws = socket;
            }
        })
    }
    var onWebSocketDisconnection = function(cn){
        if(cn.pluginEngine){
            s.connectedPlugins[cn.pluginEngine].plugged = false
            s.tx({f:'plugin_engine_unplugged',plug:cn.pluginEngine},'CPU')
        }
        if(cn.detectorPlugin){
            s.tx({f:'detector_unplugged',plug:cn.detectorPlugin},'CPU')
            s.removeDetectorPlugin(cn.detectorPlugin)
            s.sendDetectorInfoToClient({f:'detector_plugged'},function(data){
                s.tx(data,'CPU')
            })
        }
        if(cn.ocv && s.ocv){
            const pluginName = s.ocv.plug
            s.tx({f:'detector_unplugged',plug:pluginName},'CPU')
            delete(s.ocv);
            delete(pluginHandlersSet[pluginName])
        }
    }
    var onSocketAuthentication = function(r,cn,d,tx){
        if(s.isAtleatOneDetectorPluginConnected){
            s.sendDetectorInfoToClient({f:'detector_plugged'},tx)
            s.ocvTx({f:'readPlugins',ke:d.ke})
        }
        if(config.oldPluginConnectionMethod && s.ocv){
            tx({f:'detector_plugged',plug:s.ocv.plug,notice:s.ocv.notice})
        }
    }
    var addCpuUsageHandler = (cn,pluginName) => {
        if(pluginHandlersSet[pluginName])return;
        pluginHandlersSet[pluginName] = true
        cn.on('cpuUsage',function(percent){
            currentPluginCpuUsage[pluginName] = percent
        })
        cn.on('gpuUsage',function(gpus){
            currentPluginGpuUsage[pluginName] = gpus
        })
        cn.on('processCount',function(count){
            currentPluginFrameProcessingCount[pluginName] = count
        })
    }
    // config.pluginKeys is the copy loaded at startup, so a key added to conf.json by hand
    // used to need a restart before the plugin could connect. conf.json is re-read here
    // instead, at the one point it matters: a plugin connecting. That is once per plugin,
    // not per frame, so it is a single read of a small, page cached file with nothing held
    // open in between.
    const readPluginKeysFromDisk = function(){
        // A key generated for a Docker plugin lives in memory until it is written. Reading
        // over it in that window would leave the plugin unable to ever authenticate.
        if(s.pluginKeysArePendingWrite)return false
        try{
            const onDisk = JSON.parse(fs.readFileSync(s.location.config,'utf8'))
            const keysOnDisk = onDisk.pluginKeys
            if(!keysOnDisk || !(keysOnDisk instanceof Object))return false
            // Replaced rather than merged, so a key deleted from conf.json stops working
            // just as promptly as an added one starts.
            const changed = JSON.stringify(config.pluginKeys) !== JSON.stringify(keysOnDisk)
            config.pluginKeys = keysOnDisk
            return changed
        }catch(err){
            // A half written or malformed conf.json must not take the keys already in memory
            // down with it - connected plugins would start failing on the next message.
            return false
        }
    }
    // Only called for a plugin that is connecting.
    const hasValidPluginKey = function(d){
        readPluginKeysFromDisk()
        const expectedKey = config.pluginKeys[d.plug]
        const hasExpectedKey = expectedKey !== undefined && expectedKey !== null && expectedKey !== ''
        const hasSentKey = d.pluginKey !== undefined && d.pluginKey !== null && d.pluginKey !== ''
        const isValid = hasExpectedKey && hasSentKey && expectedKey === d.pluginKey
        if(!isValid){
            if(!hasExpectedKey){
                s.systemLog(`Plugin "${d.plug}" tried to connect, but there is no pluginKeys."${d.plug}" configured in conf.json.`)
            }else if(!hasSentKey){
                s.systemLog(`Plugin "${d.plug}" tried to connect without sending a pluginKey.`)
            }else{
                s.systemLog(`Plugin "${d.plug}" tried to connect with a pluginKey that does not match conf.json's pluginKeys."${d.plug}".`)
            }
        }
        return isValid
    }
    var onWebSocketConnection = function(cn){
        cn.on('ocv',function(d){
            if(!cn.pluginEngine && d.f === 'init'){
                if(hasValidPluginKey(d)){
                    s.pluginInitiatorSuccess("client",d,cn)
                    if(config.detectorPluginsCluster)addCpuUsageHandler(cn,d.plug)
                }else{
                    s.pluginInitiatorFail("client",d,cn)
                }
            }else{
                if(cn.pluginEngine){
                    s.pluginEventController(d)
                    if(config.detectorPluginsCluster)addCpuUsageHandler(cn,d.plug)
                }else{
                    cn.disconnect()
                }
            }
        })
        cn.on('f',function(d){
            if((d.id || d.uid || d.mid) && cn.ke){
                switch(d.f){
                    case'ocv_in':
                        s.ocvTx(d.data)
                    break;
                }
            }
        })
    }
    if(config.oldPluginConnectionMethod === undefined)config.oldPluginConnectionMethod = false
    if(config.oldPluginConnectionMethod === true){
        s.ocvTx = function(data){
            if(!s.ocv){return}
            if(s.ocv.isClientPlugin === true){
                s.tx(data,s.ocv.id)
            }else{
                s.connectedPlugins[s.ocv.plug].tx(data)
            }
        }
    }
    function onMonitorUpdate(monitorConfig){
        // console.log('Sending Monitor Info to Plugin', monitorConfig.mid)
        s.sendToAllDetectors({ f: 'monitorUpdate', monitorConfig });
    }
    function sendCopyOfAllMonitorConfigs(){
        const groupKeys = Object.keys(s.group);
        for(const groupKey of groupKeys){
            try{
                const monitorConfigs = Object.values(s.group[groupKey].rawMonitorConfigurations);
                for(const monitorConfig of monitorConfigs){
                    onMonitorUpdate(monitorConfig)
                }
            }catch(err){
                s.debugLog(err)
            }
        }
    }
    /**
    * API : Get List of Connected Plugins
    */
    // `/connected`, not `/list`. The Plugin Manager registers `plugins/:ke/list` on the same
    // prefix (see libs/sharedRoutes.js) and, because superUser.js is required above, it wins
    // the match - this handler was never reached and the Monitor Settings detector picker
    // came back empty. It is also deliberately plain `s.auth`: choosing which detector a
    // monitor sends frames to is part of editing a monitor, so it must not require
    // `use_plugin_manager` the way the Plugin Manager's own routes do.
    app.get(config.webPaths.apiPrefix+':auth/plugins/:ke/connected', async (req,res) => {
        s.auth(req.params, async (resp) => {
            s.closeJsonResponse(res,{
                ok: true,
                plugins: s.connectedDetectorPlugins
            })
        },res,req)
    })
    s.onSocketAuthentication(onSocketAuthentication)
    s.onWebSocketDisconnection(onWebSocketDisconnection)
    s.onWebSocketConnection(onWebSocketConnection)
    s.onMonitorStart(onMonitorUpdate)
    s.onPluginConnected(sendCopyOfAllMonitorConfigs)
}
