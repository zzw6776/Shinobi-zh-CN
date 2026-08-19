const { Worker } = require('worker_threads')
module.exports = (s,config,lang) => {
    const { getConnectionDetails } = require('./libs/connectDetails.js')(s,config,lang)
    const { modifyConfiguration, getConfiguration } = require('../system/utils.js')(config)
    const sshDisabled = config.noCentralSsh === true;
    const queuedSshRestart = {}
    if(!s.connectedMgmtServers)s.connectedMgmtServers = {}
    function parseNewConnectionAddress(serverIp){
        let parsedIp = `${serverIp}`
        if(parsedIp.indexOf('://') === -1)parsedIp = `ws://${parsedIp}`
        if(parsedIp.split(':').length === 2)parsedIp = `ws://${parsedIp}:8663`
        return parsedIp;
    }
    // Connection state per management server, for the badge in the Central Management tab.
    // The worker lifecycle is the only source of truth : it reports `authenticated` when
    // the far end has accepted the key, and exits (which triggers an automatic reconnect)
    // on anything else.
    const CONNECTION_STATES = {
        connecting: 'connecting',
        connected: 'connected',
        retrying: 'retrying',
        failed: 'failed',
        disconnected: 'disconnected',
    }
    // How many consecutive failed attempts before this stops being "retrying" and starts
    // being "something is wrong" - it keeps retrying either way, the badge just stops
    // implying it is about to succeed.
    const ATTEMPTS_BEFORE_FAILED = 3
    // Pushed to the Superuser room the moment anything changes, so the Central Management
    // tab does not have to ask on a timer. '$' is the room every superuser socket joins.
    function broadcastManagementServerStatus(serverIp,removed){
        try{
            s.tx({
                f: 'mgmt-status',
                serverIp: serverIp,
                removed: !!removed,
                status: removed ? null : getManagementServerStatus(serverIp),
            },'$')
        }catch(err){
            s.debugLog('broadcastManagementServerStatus ERR',err)
        }
    }
    function getManagementServerStatus(serverIp){
        const connection = s.connectedMgmtServers[serverIp] || {}
        return {
            status: connection.status || CONNECTION_STATES.disconnected,
            attempts: connection.attempts || 0,
            lastError: connection.lastError || null,
            since: connection.statusChangedAt || null,
            nextAttemptAt: connection.nextAttemptAt || null,
        }
    }
    function setManagementServerStatus(serverIp,status,extra){
        const connection = s.connectedMgmtServers[serverIp]
        if(!connection)return
        connection.status = status
        connection.statusChangedAt = new Date().toISOString()
        if(extra && extra.lastError !== undefined)connection.lastError = extra.lastError
        if(status === CONNECTION_STATES.connected){
            connection.attempts = 0
            connection.lastError = null
            connection.nextAttemptAt = null
        }
        broadcastManagementServerStatus(serverIp)
    }
    function getManagementServerStatuses(){
        const statuses = {}
        for(const serverIp in (s.connectedMgmtServers || {})){
            statuses[serverIp] = getManagementServerStatus(serverIp)
        }
        return statuses
    }
    function getManagementServers(){
        const response = { ok: true }
        response.mgmtServers = config.mgmtServers || {};
        response.statuses = getManagementServerStatuses();
        return response
    }
    async function setManagementServers(mgmtServers){
        const response = { ok: true }
        config = Object.assign(config,{ mgmtServers })
        const currentConfig = await getConfiguration()
        currentConfig.mgmtServer = mgmtServers;
        const configError = await modifyConfiguration(currentConfig)
        if(configError){
            response.ok = false;
            response.err = configError
            s.systemLog(configError)
        }
        return response
    }
    async function addManagementServer(serverIp, p2pKey){
        const response = { ok: true }
        const parsedIp = parseNewConnectionAddress(serverIp)
        const currentConfig = await getConfiguration();
        if(!currentConfig.mgmtServers)currentConfig.mgmtServers = {};
        currentConfig.mgmtServers[serverIp] = p2pKey;
        config = Object.assign(config, { mgmtServers: currentConfig.mgmtServers })
        const configError = await modifyConfiguration(currentConfig)
        if(configError){
            response.ok = false;
            response.err = configError
            s.systemLog(configError)
        }
        return response
    }
    async function removeManagementServer(serverIp, p2pKey){
        const response = { ok: true }
        let foundMatching = false;
        const currentConfig = await getConfiguration();
        if(!currentConfig.mgmtServers)currentConfig.mgmtServers = {};
        const currentPeerConnectKey = currentConfig.mgmtServers[serverIp];
        if(currentPeerConnectKey === p2pKey){
            foundMatching = true
            delete(currentConfig.mgmtServers[serverIp])
            config = Object.assign(config, { mgmtServers: currentConfig.mgmtServers })
            const configError = await modifyConfiguration(currentConfig)
            if(configError){
                response.ok = false;
                response.err = configError
                s.systemLog(configError)
            }
        }else{
            response.ok = false;
            response.msg = 'Peer Connect Key not matching! Cannot disconnect.';
        }
        return response
    }
    function terminateSshToManagement(serverIp){
        clearTimeout(queuedSshRestart[serverIp])
        if(s.connectedMgmtServers[serverIp] && s.connectedMgmtServers[serverIp].sshWorker){
            try{ s.connectedMgmtServers[serverIp].sshWorker.terminate() }catch(err){}
            delete(s.connectedMgmtServers[serverIp].sshWorker)
        }
    }
    async function queueToggleSshToManagement(serverIp, p2pKey, onlyClose){
        if(sshDisabled)return;
        clearTimeout(queuedSshRestart[serverIp])
        queuedSshRestart[serverIp] = setTimeout(() => {
            delete(queuedSshRestart[serverIp])
            if(onlyClose){
                terminateSshToManagement(serverIp)
            }else{
                provideSshToManagement(serverIp, p2pKey)
            }
        },1000 * 60)
    }
    async function provideSshToManagement(serverIp, p2pKey){
        if(sshDisabled)return;
        terminateSshToManagement(serverIp)
        const configFromFile = await getConfiguration()
        const wsServerParts = serverIp.split(':')
        wsServerParts[serverIp.includes('://') ? 2 : 1] = configFromFile.sshSocketPort || 9021
        const wsServer = wsServerParts.join(':')
        console.log('Central SSH Connector Starting...', wsServer)
        const worker = new Worker(`${__dirname}/libs/centralConnect/ssh.js`, {
            workerData: {
                config: configFromFile,
                wsServer: wsServer,
                peerConnectKey: p2pKey,
            }
        });
        worker.on('message', async (data) => {
            switch(data.f){
                case'restart':
                    s.systemLog('Restarting SSH Connection...', serverIp)
                    worker.terminate()
                break;
            }
        });
        worker.on('error', (err) => {
            console.error('cameraPeer SSH Error', serverIp, err)
        });
        worker.on('exit', (code) => {
            // The entry is gone if the server was removed while this worker was still
            // running - reading .wantTerminate off undefined threw out of the handler.
            if(!(s.connectedMgmtServers[serverIp] || {}).wantTerminate){
                console.log('cameraPeer SSH Exited, Restarting...', serverIp, code)
                // s.connectedMgmtServers[serverIp].sshWorker = provideSshToManagement(serverIp, p2pKey)
            }else{
                console.log('cameraPeer SSH Exited, NOT Restarting...', serverIp, code)
            }
        });
        return worker
    }
    async function connectToManagementServer(serverIp, p2pKey){
        const previousAttempts = (s.connectedMgmtServers[serverIp] || {}).attempts || 0
        if(!config.userHasSubscribed){
            s.connectedMgmtServers[serverIp] = Object.assign(s.connectedMgmtServers[serverIp] || {},{
                status: CONNECTION_STATES.failed,
                lastError: lang.centralManagementNeedsActivation || 'This installation is not activated.',
            })
            return console.log(lang.centralManagementNotEnabled)
        }
        if(s.connectedMgmtServers[serverIp]){
            disconnectFromManagmentServer(serverIp)
        }
        s.connectedMgmtServers[serverIp] = { attempts: previousAttempts }
        setManagementServerStatus(serverIp, previousAttempts > 0 ? CONNECTION_STATES.retrying : CONNECTION_STATES.connecting)
        const configFromFile = await getConfiguration()
        configFromFile.timezone = config.timezone;
        console.log('Central Worker Starting...', serverIp)
        const worker = new Worker(`${__dirname}/libs/centralConnect/index.js`, {
            workerData: {
                config: configFromFile,
                serverIp,
                p2pKey,
            }
        });
        worker.on('message', async (data) => {
            switch(data.f){
                case'connectionState':
                    // The worker reconnects internally and does not exit while doing so, so
                    // its own report is the only accurate source for anything between
                    // "started" and "authenticated".
                    switch(data.state){
                        case'retrying':
                            const attempts = data.attempts || 0
                            if(s.connectedMgmtServers[serverIp]){
                                s.connectedMgmtServers[serverIp].attempts = attempts
                                s.connectedMgmtServers[serverIp].nextAttemptAt = data.nextAttemptAt || null
                            }
                            setManagementServerStatus(serverIp,
                                attempts >= ATTEMPTS_BEFORE_FAILED ? CONNECTION_STATES.failed : CONNECTION_STATES.retrying
                            )
                        break;
                        case'paused':
                            // A minute of attempts got nowhere; the worker is now waiting
                            // out the long pause before another minute of them.
                            if(s.connectedMgmtServers[serverIp]){
                                s.connectedMgmtServers[serverIp].attempts = data.attempts || 0
                                s.connectedMgmtServers[serverIp].nextAttemptAt = data.nextAttemptAt || null
                            }
                            setManagementServerStatus(serverIp, CONNECTION_STATES.failed)
                        break;
                        case'error':
                            // Kept as the reason shown beside a retrying/failed badge. The
                            // status itself is set by the close that follows.
                            if(s.connectedMgmtServers[serverIp]){
                                s.connectedMgmtServers[serverIp].lastError = data.error
                                broadcastManagementServerStatus(serverIp)
                            }
                        break;
                        case'disconnected':
                            setManagementServerStatus(serverIp, CONNECTION_STATES.disconnected)
                        break;
                        case'authenticating':
                            setManagementServerStatus(serverIp, CONNECTION_STATES.connecting)
                        break;
                    }
                break;
                case'authenticated':
                    setManagementServerStatus(serverIp, CONNECTION_STATES.connected)
                    const sshWorker = await provideSshToManagement(serverIp, p2pKey)
                    // Same race : the server may have been removed during the await, and
                    // this handler is async so a throw here becomes an unhandled rejection.
                    if(s.connectedMgmtServers[serverIp]){
                        s.connectedMgmtServers[serverIp].sshWorker = sshWorker;
                    }else if(sshWorker){
                        try{ sshWorker.terminate() }catch(err){}
                    }
                break;
                case'connectDetailsRequest':
                    var mail = data.mail
                    getConnectionDetails(mail).then((connectDetails) => {
                        worker.postMessage({ f: 'connectDetails', connectDetails })
                    }).catch((error) => {
                        console.error('FAILED TO GET connectDetails', serverIp, error)
                        worker.postMessage({ f: 'connectDetails', connectDetails: {} })
                    })
                break;
                case'modifyConfiguration':
                    console.log('Editing Configuration...', serverIp, data.data.form)
                    const configFromFile = await getConfiguration()
                    const mgmtServers = JSON.stringify(configFromFile.mgmtServers)
                    const newConfig = data.data.form;
                    const mgmtServersFromNewConfig = JSON.stringify(configFromFile.mgmtServers)
                    if(mgmtServers !== mgmtServersFromNewConfig){
                        resetAllManagementServers()
                    }
                    modifyConfiguration(newConfig)
                break;
                case'restart':
                    s.systemLog('Restarting Central Connection...', serverIp)
                    worker.terminate()
                break;
            }
        });
        worker.on('error', (err) => {
            console.error('cameraPeer Error', serverIp, err)
            setManagementServerStatus(serverIp, CONNECTION_STATES.failed, {
                lastError: `${(err && err.message) || err}`,
            })
        });
        worker.on('exit', (code) => {
            const connection = s.connectedMgmtServers[serverIp] || {}
            if(connection.wantTerminate){
                // Deliberate : the user removed the server, or turned the feature off.
                console.log('cameraPeer Exited, NOT Restarting...', serverIp, code)
                setManagementServerStatus(serverIp, CONNECTION_STATES.disconnected)
                return
            }
            console.log('cameraPeer Exited, Restarting...', serverIp, code)
            // An exit before authenticating is a failed attempt. Exiting after a good
            // connection counts too - it dropped, and the next attempt may fail as well.
            connection.attempts = (connection.attempts || 0) + 1
            setManagementServerStatus(serverIp,
                connection.attempts >= ATTEMPTS_BEFORE_FAILED ? CONNECTION_STATES.failed : CONNECTION_STATES.retrying
            )
            // Backoff before the next attempt. This used to reconnect immediately, which
            // against an unreachable server is a hot loop spawning workers as fast as they
            // can exit - and it would make "Retrying" flicker meaninglessly.
            const retryDelay = Math.min(connection.attempts * 5000, 60000)
            clearTimeout(connection.retryTimeout)
            connection.retryTimeout = setTimeout(() => {
                // Re-checked : the server may have been removed, or the feature turned off,
                // during the wait.
                const current = s.connectedMgmtServers[serverIp]
                if(!current || current.wantTerminate)return
                connectToManagementServer(serverIp, p2pKey)
            },retryDelay)
        });
        s.connectedMgmtServers[serverIp].worker = worker;
        s.connectedMgmtServers[serverIp].wantTerminate = false;
    }
    // `purge` drops the bookkeeping entry as well, for when the server is being removed
    // rather than merely reconnected - otherwise a deleted server keeps a stale record (and
    // its attempt count and last error) in memory for the life of the process.
    function disconnectFromManagmentServer(serverIp, options){
        const purge = !!(options && options.purge)
        const mgmtConnection = s.connectedMgmtServers[serverIp];
        try{
            if(!mgmtConnection)return;
            mgmtConnection.wantTerminate = true;
            // A retry may be queued from a previous failed attempt; without this it would
            // fire after the disconnect and bring the connection back.
            clearTimeout(mgmtConnection.retryTimeout)
            mgmtConnection.retryTimeout = null
            setManagementServerStatus(serverIp, CONNECTION_STATES.disconnected)
            // Terminating the worker takes its internal reconnect timers with it - that is
            // where the 1-minute-window / 10-minute-pause cycle actually lives.
            if(mgmtConnection.worker)mgmtConnection.worker.terminate();
        }catch(err){
            s.debugLog('disconnectFromManagmentServer ERR',err)
        }
        try{
            terminateSshToManagement(serverIp);
        }catch(err){
            s.debugLog('disconnectFromManagmentSshServer ERR',err)
        }
        if(purge){
            delete s.connectedMgmtServers[serverIp]
            broadcastManagementServerStatus(serverIp,true)
        }
    }
    // Removing a server has to actually stop it, and stay stopped : a retry queued a moment
    // before the delete, or a worker that ignored terminate(), would otherwise reconnect to
    // a server the user has already removed. So it is checked again shortly after.
    const STOP_VERIFY_DELAY = 3000
    function ensureManagementServerStopped(serverIp){
        return new Promise((resolve) => {
            disconnectFromManagmentServer(serverIp,{ purge: true })
            setTimeout(() => {
                const stillThere = s.connectedMgmtServers[serverIp]
                if(!stillThere){
                    resolve({ ok: true, stopped: true, neededSecondPass: false })
                    return
                }
                // Something re-created the entry in the meantime. Take it down again and
                // say so, rather than leaving a connection nobody asked for.
                s.systemLog('Central : connection re-appeared after removal, stopping again',{ serverIp })
                disconnectFromManagmentServer(serverIp,{ purge: true })
                resolve({
                    ok: !s.connectedMgmtServers[serverIp],
                    stopped: !s.connectedMgmtServers[serverIp],
                    neededSecondPass: true,
                })
            },STOP_VERIFY_DELAY)
        })
    }
    function resetConnectionToManagementServer(serverIp){
        const mgmtConnection = s.connectedMgmtServers[serverIp];
        if(!mgmtConnection)return;
        mgmtConnection.wantTerminate = false;
        mgmtConnection.worker.terminate();
        try{
            terminateSshToManagement(serverIp);
        }catch(err){
            s.debugLog('resetConnectionToManagementSshServer ERR',err)
        }
    }
    function resetAllManagementServers(){
        for(serverIp in s.connectedMgmtServers){
            disconnectFromManagmentServer(serverIp)
        }
        connectAllManagementServers()
    }
    async function connectAllManagementServers(){
        const configFromFile = await getConfiguration()
        const mgmtServers = configFromFile.mgmtServers
        if(mgmtServers){
            for(serverIp in mgmtServers){
                var p2pKey = mgmtServers[serverIp]
                await connectToManagementServer(serverIp, p2pKey)
            }
        }else{
            console.log(`Management Server Connection Not Configured!`)
        }
    }
    async function migrateOldConfiguration(){
        await addManagementServer(config.managementServer, config.peerConnectKey)
        await connectToManagementServer(config.managementServer, config.peerConnectKey)
        const configFromFile = await getConfiguration()
        delete(configFromFile.managementServer)
        delete(configFromFile.peerConnectKey)
        modifyConfiguration(configFromFile)
    }
    async function sendMessageToAllConnectedServers(data){
        for(let serverIp in s.connectedMgmtServers){
            try{
                s.connectedMgmtServers[serverIp].worker.postMessage(data)
            }catch(err){
                s.debugLog(err.toString())
            }
        }
    }
    if(config.autoRestartManagementConnectionInterval){
        setInterval(() => {
            resetAllManagementServers()
        }, 1000 * 60 * 15)
    }
    return {
        getManagementServers,
        addManagementServer,
        removeManagementServer,
        connectToManagementServer,
        disconnectFromManagmentServer,
        resetConnectionToManagementServer,
        resetAllManagementServers,
        ensureManagementServerStopped,
        connectAllManagementServers,
        migrateOldConfiguration,
        sendMessageToAllConnectedServers,
    }
}
