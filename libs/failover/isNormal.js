module.exports = (s,app,config,lang) => {
    if(!config.isFailover){
        const {
            connectToFailover,
            runOnFailoverConnections,
            connectFailoverServers,
            getFailoverServers,
            addFailoverServer,
            removeFailoverServer,
            updateCachedMonitor,
            updateCachedUser,
            closeFailoverConnection,
            ensureFailoverServerStopped,
            parseNewConnectionAddress,
        } = require('./utilsNormal.js')(s,app,config,lang)
        // The address is turned into ws://<host>/failover by parseNewConnectionAddress, so
        // a bare host is fine and expected here - what has to be refused is an empty value
        // or a scheme that cannot carry a websocket.
        const MINIMUM_PEER_CONNECT_KEY_LENGTH = 5
        const validateFailoverServerInput = (failoverServer,peerConnectKey) => {
            const value = `${failoverServer || ''}`.trim()
            if(!value || /\s/.test(value)){
                return lang.failoverBadServerUrl || 'Enter the Failover server address.'
            }
            if(value.indexOf('://') > -1 && !/^wss?:\/\//.test(value)){
                return lang.failoverBadServerUrl || 'The address must use ws:// or wss://'
            }
            if(!peerConnectKey || `${peerConnectKey}`.trim().length < MINIMUM_PEER_CONNECT_KEY_LENGTH){
                return lang.failoverBadPeerKey || 'The Server Key is too short.'
            }
            return null
        }
        s.onMonitorSave((monitorConfig) => {
            runOnFailoverConnections((host, connectionToFailover) => {
                updateCachedMonitor(connectionToFailover, monitorConfig)
            })
        })
        s.onMonitorDelete((monitorConfig) => {
            runOnFailoverConnections((host, connectionToFailover) => {
                updateCachedMonitor(connectionToFailover, monitorConfig, true)
            })
        })
        s.onAccountSave((groupLoadedInMemory, userDetails, userDatabaseRow) => {
            runOnFailoverConnections((host, connectionToFailover) => {
                updateCachedUser(connectionToFailover, userDatabaseRow)
            })
        })
        s.onAccountDelete((account) => {
            runOnFailoverConnections((host, connectionToFailover) => {
                updateCachedUser(connectionToFailover, account, true)
            })
        })
        /**
        * API : Superuser : Get Failover Server Settings
        */
        app.get(config.webPaths.superApiPrefix+':auth/failover/list', function (req,res){
            s.superAuth(req.params,(resp) => {
                const response = getFailoverServers()
                s.closeJsonResponse(res,response)
            },res,req)
        })

        /**
        * API : Superuser : Save Failover Server Settings
        */
        app.post(config.webPaths.superApiPrefix+':auth/failover/save', function (req,res){
            s.superAuth(req.params,async (resp) => {
                const failoverServer = `${req.body.failoverServer || ''}`.trim();
                const peerConnectKey = `${req.body.peerConnectKey || ''}`.trim();
                // Checked here rather than only in the form : this route is reachable on
                // its own, and a blank save would add an unusable entry to conf.json.
                const validationError = validateFailoverServerInput(failoverServer,peerConnectKey)
                if(validationError){
                    s.closeJsonResponse(res,{ ok: false, msg: validationError })
                    return
                }
                const response = await addFailoverServer(failoverServer, peerConnectKey)
                await connectToFailover({ host: response.host, key: response.key })
                response.failoverServer = response.host
                response.peerConnectKey = response.key
                s.closeJsonResponse(res,response)
            },res,req)
        })

        /**
        * API : Delete Failover Server Settings
        */
        app.post(config.webPaths.superApiPrefix+':auth/failover/disconnect', async function (req,res){
            s.superAuth(req.params,async (resp) => {
                const failoverServer = parseNewConnectionAddress(req.body.failoverServer);
                const peerConnectKey = req.body.peerConnectKey;
                const response = await removeFailoverServer(failoverServer, peerConnectKey)
                // Only stop it if it really was removed from the config, and then confirm
                // it stayed stopped - a queued retry would otherwise bring it back.
                if(response.ok){
                    const stopResult = await ensureFailoverServerStopped(failoverServer)
                    response.stopped = stopResult.stopped
                    response.neededSecondPass = stopResult.neededSecondPass
                }else{
                    await closeFailoverConnection(failoverServer)
                }
                s.closeJsonResponse(res,response)
            },res,req)
        })
        connectFailoverServers()
    }
}
