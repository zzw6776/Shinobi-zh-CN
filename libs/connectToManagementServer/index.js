module.exports = (s,config,lang,app) => {
    const { modifyConfiguration } = require('../system/utils.js')(config)
    // Central Management used to be all-or-nothing at boot : with `enableMgmtConnect`
    // unset this module returned immediately, so none of its routes existed and the tab
    // could only say "add it to conf.json and restart". The feature is now brought up on
    // demand instead, and only the status/enable pair below is always present.
    let isInitialized = false
    // The management connection is a websocket, so the address has to carry a ws scheme -
    // anything else cannot connect and there is no point storing it. The port is NOT
    // enforced : 8663 is the usual one and the panel warns when it differs, but a server
    // on another port is legitimate.
    const MANAGEMENT_SERVER_PATTERN = /^wss?:\/\/[^\/:\s]+(:\d{1,5})?(\/\S*)?$/
    const MINIMUM_PEER_CONNECT_KEY_LENGTH = 5
    // An address with no scheme at all is what people type ("127.0.0.1:8663"), and ws is
    // the only sensible reading of it. A scheme that IS present is left alone so that a
    // wrong one (http://) is reported rather than quietly rewritten into something the
    // user did not ask for.
    const normalizeManagementServerUrl = (managementServer) => {
        const value = `${managementServer || ''}`.trim()
        if(!value || value.indexOf('://') > -1)return value
        return `ws://${value}`
    }
    const validateManagementServerInput = (managementServer,peerConnectKey) => {
        if(!managementServer || !MANAGEMENT_SERVER_PATTERN.test(managementServer)){
            return lang.centralManagementBadServerUrl || 'The Server URL must start with ws:// or wss://'
        }
        if(!peerConnectKey || peerConnectKey.length < MINIMUM_PEER_CONNECT_KEY_LENGTH){
            return lang.centralManagementBadPeerKey || 'The P2P API Key is too short.'
        }
        return null
    }
    const setUpManagementConnections = ({ isStartup }) => {
        if(isInitialized)return
        isInitialized = true
        require('./libs/pairServer.js')(s,config,lang)
        require('./libs/logging.js')(s,config,lang)
        const {
            getManagementServers,
            addManagementServer,
            removeManagementServer,
            connectToManagementServer,
            disconnectFromManagmentServer,
            connectAllManagementServers,
            ensureManagementServerStopped,
            migrateOldConfiguration,
            sendMessageToAllConnectedServers,
            resetAllManagementServers,
        } = require('./utils.js')(s,config,lang)
        s.resetAllManagementServers = resetAllManagementServers;
        s.connectAllManagementServers = connectAllManagementServers;
        // resetAllManagementServers disconnects and then RECONNECTS, so it is not what
        // turning the feature off wants. disconnectFromManagmentServer sets wantTerminate,
        // which is what stops the worker's exit handler from dialing straight back.
        s.disconnectAllManagementServers = () => {
            for(const serverIp in (s.connectedMgmtServers || {})){
                // purged as well : with the feature switched off nothing should be left
                // holding an attempt count or a queued retry for these.
                disconnectFromManagmentServer(serverIp,{ purge: true })
            }
        }
        const startConnections = () => {
            connectAllManagementServers()
            if(config.managementServer && config.peerConnectKey){
                console.log(`Migrating Old Central Configuration`)
                migrateOldConfiguration()
            }
        }
        if(isStartup){
            s.onLoadedUsersAtStartup(startConnections)
        }else{
            // Enabled from the panel, long after that extension point fired - anything
            // registered on it now would simply never run.
            startConnections()
        }
        s.onTriggerNotificationSend((groupKey, data, files) => {
            sendMessageToAllConnectedServers({ f: 'onTriggerNotificationSend', groupKey, data, files })
        })
        s.onSaveLogToCentral((data) => {
            sendMessageToAllConnectedServers({ f: 'saveLogToCentral', data })
        })
        /**
        * API : Superuser : Get Management Server Settings
        */
        app.get(config.webPaths.superApiPrefix+':auth/mgmt/list', function (req,res){
            s.superAuth(req.params,(resp) => {
                const response = getManagementServers()
                s.closeJsonResponse(res,response)
            },res,req)
        })

        /**
        * API : Superuser : Save Management Server Settings
        */
        app.post(config.webPaths.superApiPrefix+':auth/mgmt/save', function (req,res){
            s.superAuth(req.params,async (resp) => {
                const managementServer = normalizeManagementServerUrl(req.body.managementServer);
                const peerConnectKey = `${req.body.peerConnectKey || ''}`.trim();
                // addManagementServer keys the list by server address, so saving a blank
                // form wrote an `"": ""` entry - which then drew as an empty row in the
                // table with nothing but a delete button on it. Validated here rather than
                // only in the form because this route is reachable on its own.
                const validationError = validateManagementServerInput(managementServer,peerConnectKey)
                if(validationError){
                    s.closeJsonResponse(res,{ ok: false, msg: validationError })
                    return
                }
                const response = await addManagementServer(managementServer, peerConnectKey)
                await connectToManagementServer(managementServer, peerConnectKey)
                s.closeJsonResponse(res,response)
            },res,req)
        })

        /**
        * API : Delete Management Server Settings
        */
        app.post(config.webPaths.superApiPrefix+':auth/mgmt/disconnect', async function (req,res){
            s.superAuth(req.params,async (resp) => {
                const managementServer = req.body.managementServer;
                const peerConnectKey = req.body.peerConnectKey;
                const response = await removeManagementServer(managementServer, peerConnectKey)
                // Only stop the connection if it was actually removed from the config -
                // removeManagementServer refuses when the key does not match, and killing
                // the connection anyway would disconnect a server that is still configured.
                if(response.ok){
                    const stopResult = await ensureManagementServerStopped(managementServer)
                    response.stopped = stopResult.stopped
                    response.neededSecondPass = stopResult.neededSecondPass
                }
                s.closeJsonResponse(res,response)
            },res,req)
        })

        /**
        * API : Restart Management Connections
        */
        app.get(config.webPaths.superApiPrefix+':auth/mgmt/restartConnections', async function (req,res){
            s.superAuth(req.params,async (resp) => {
                const response = { ok: true }
                await resetAllManagementServers()
                s.closeJsonResponse(res,response)
            },res,req)
        })
    }
    /**
    * API : Superuser : Is Central Management usable, and if not, why not.
    * Always registered - the tab needs an answer even when the feature is off.
    */
    app.get(config.webPaths.superApiPrefix+':auth/mgmt/status', function (req,res){
        s.superAuth(req.params,(resp) => {
            s.closeJsonResponse(res,{
                ok: true,
                enabled: !!config.enableMgmtConnect,
                // Activation is checked live : `checkSubscription` updates this on the
                // running process, so activating no longer needs a restart to be noticed.
                activated: !!config.userHasSubscribed,
                ready: !!config.enableMgmtConnect && !!config.userHasSubscribed,
            })
        },res,req)
    })
    /**
    * API : Superuser : Turn Central Management on, without editing conf.json by hand.
    */
    app.post(config.webPaths.superApiPrefix+':auth/mgmt/enable', function (req,res){
        s.superAuth(req.params,async (resp) => {
            if(!config.userHasSubscribed){
                s.closeJsonResponse(res,{
                    ok: false,
                    activated: false,
                    msg: lang.centralManagementNeedsActivation || 'Activate this installation first.',
                })
                return
            }
            const enable = `${req.body.enable}` !== 'false'
            config.enableMgmtConnect = enable
            const configError = await modifyConfiguration({ enableMgmtConnect: enable }, true)
            if(configError)s.systemLog(configError)
            s.systemLog('conf.json Modified',{
                by: resp.$user.mail,
                ip: resp.ip,
                changed: `enableMgmtConnect : ${enable}`,
            })
            if(enable){
                setUpManagementConnections({ isStartup: false })
            }else if(isInitialized && s.disconnectAllManagementServers){
                // Leaves the routes in place for this process, but drops the connections -
                // which is what "off" has to mean without a restart.
                s.disconnectAllManagementServers()
            }
            s.closeJsonResponse(res,{
                ok: true,
                enabled: enable,
                activated: true,
            })
        },res,req)
    })
    if(config.enableMgmtConnect){
        setUpManagementConnections({ isStartup: true })
    }else{
        s.connectAllManagementServers = () => {}
    }
}
