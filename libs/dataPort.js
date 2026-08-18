const { createWebSocketServer } = require('./basic/websocketTools.js')
module.exports = function(s,config,lang,app,io){
    const {
        triggerEvent,
    } = require('./events/utils.js')(s,config,lang)
    s.dataPortTokens = {}
    // authenticated camera thread sockets, keyed `${groupKey}${monitorId}`, so the
    // parent can push updates (new detection regions, etc) into a running thread.
    s.dataPortClients = {}
    s.sendToCameraThread = function(groupKey,monitorId,data){
        const client = s.dataPortClients[`${groupKey}${monitorId}`]
        if(!client)return false;
        try{
            client.send(JSON.stringify(data))
            return true
        }catch(err){
            s.debugLog('dataPort: failed to send to camera thread', err)
            return false
        }
    }
    const theWebSocket = createWebSocketServer()
    s.dataPortServer = theWebSocket;
    function setClientKillTimerIfNotAuthenticatedInTime(client){
        client.killTimer = setTimeout(function(){
            client.terminate()
        },10000)
    }
    function clearKillTimer(client){
        clearTimeout(client.killTimer)
    }
    theWebSocket.on('connection',(client) => {
        // client.send(someDataToSendAsStringOrBinary)
        setClientKillTimerIfNotAuthenticatedInTime(client)
        let clientKey = null
        function onAuthenticate(data){
            clearKillTimer(client)
            if(data in s.dataPortTokens){
                const tokenInfo = s.dataPortTokens[data]
                client.removeListener('message', onAuthenticate);
                client.on('message', onAuthenticatedData)
                delete(s.dataPortTokens[data]);
                if(tokenInfo && tokenInfo.type === 'cameraThread'){
                    clientKey = `${tokenInfo.ke}${tokenInfo.mid}`
                    s.dataPortClients[clientKey] = client
                }
            }else{
                client.removeListener('message', onAuthenticate)  // <-- add this
                client.terminate()
            }
        }
        function onAuthenticatedData(jsonData){
            let data
            try{
                data = JSON.parse(jsonData)
            }catch(err){
                s.debugLog('dataPort: malformed JSON from client', err)
                return
            }
            switch(data.f){
                case'trigger':
                    triggerEvent(data)
                break;
                case's.tx':
                    s.tx(data.data,data.to)
                break;
                case'debugLog':
                    s.debugLog(data.data)
                break;
                default:
                    console.log(`No Data Port Handler!`)
                    console.log(`here's what we got :`)
                    console.log(data)
                break;
            }
            s.onDataPortMessageExtensions.forEach(function(extender){
                extender(data)
            })
        }
        client.on('message', onAuthenticate)
        client.on('close', () => {
            clearTimeout(client.killTimer)
            if(clientKey && s.dataPortClients[clientKey] === client)delete(s.dataPortClients[clientKey]);
            client.removeAllListeners()
        })
    })
    s.onHttpRequestUpgrade('/dataPort',(request, socket, head) => {
        theWebSocket.handleUpgrade(request, socket, head, function done(ws) {
            theWebSocket.emit('connection', ws, request)
        })
    })
}
