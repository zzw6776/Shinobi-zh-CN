const path = require('path')
const bson = require('bson')
const { createReadStream, createWriteStream } = require('fs')
const fs = require('fs').promises
const { createWebSocketClient } = require('../basic/websocketTools.js')
module.exports = (s,app,config,lang) => {
    const failoverServerConnections = {}
    const failoverServerCache = {}
    const writeStreams = {}
    const reconnectTimeouts = {}
    // Connection state per failover server, for the badge in the Failover Servers tab, and
    // the flag that stops a removed server from being reconnected by a queued retry.
    const failoverServerStatus = {}
    const wantTerminate = {}
    const CONNECTION_STATES = {
        connecting: 'connecting',
        connected: 'connected',
        retrying: 'retrying',
        failed: 'failed',
        disconnected: 'disconnected',
    }
    const ATTEMPTS_BEFORE_FAILED = 3
    const RETRY_INTERVAL = 10000 // as before, between attempts inside a window
    const RETRY_WINDOW = 60000 // try for a minute...
    const RETRY_WINDOW_PAUSE = 600000 // ...then wait ten before trying again
    function getFailoverServerStatus(host){
        const info = failoverServerStatus[host] || {}
        return {
            status: info.status || CONNECTION_STATES.disconnected,
            attempts: info.attempts || 0,
            lastError: info.lastError || null,
            since: info.since || null,
            nextAttemptAt: info.nextAttemptAt || null,
        }
    }
    function getFailoverServerStatuses(){
        const statuses = {}
        for(const host in failoverServerStatus){
            statuses[host] = getFailoverServerStatus(host)
        }
        return statuses
    }
    // Pushed to the Superuser room so the tab does not have to poll for this.
    function broadcastFailoverServerStatus(host,removed){
        try{
            s.tx({
                f: 'failover-status',
                failoverServer: host,
                removed: !!removed,
                status: removed ? null : getFailoverServerStatus(host),
            },'$')
        }catch(err){
            s.debugLog('broadcastFailoverServerStatus ERR',err)
        }
    }
    function setFailoverServerStatus(host,status,extra){
        const info = failoverServerStatus[host] || (failoverServerStatus[host] = {})
        info.status = status
        info.since = new Date().toISOString()
        if(extra && extra.lastError !== undefined)info.lastError = extra.lastError
        if(extra && extra.nextAttemptAt !== undefined)info.nextAttemptAt = extra.nextAttemptAt
        if(status === CONNECTION_STATES.connected){
            info.attempts = 0
            info.lastError = null
            info.nextAttemptAt = null
            info.retryWindowStartedAt = null
        }
        broadcastFailoverServerStatus(host)
    }
    const {
        getVideoFilePath,
    } = require('./utils.js')(s,app,config,lang)
    const {
        modifyConfiguration,
        getConfiguration
    } = require('../system/utils.js')(config)
    if(config.logFailoverActivity){
        function logFailoverActivity(...args){
            s.systemLog(...args)
        }
    }else{
        function logFailoverActivity(...args){
            s.debugLog(...args)
        }
    }
    async function getMonitors(){
        const { rows: monitors } = await s.knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Monitors"
        });
        return monitors || []
    }
    async function cacheMonitors(connectionToFailover){
        const monitors = await getMonitors();
        sendMessage(connectionToFailover,{ f: 'cacheMonitors', monitors });
        return monitors
    }
    async function updateCachedMonitor(connectionToFailover, monitor, deleteMonitor){
        if(monitor){
            if(deleteMonitor){
                sendMessage(connectionToFailover,{ f: 'deleteCachedMonitor', monitor });
            }else{
                sendMessage(connectionToFailover,{ f: 'updateCachedMonitor', monitor });
            }
        }
    }
    async function getUsers(){
        const { rows: users } = await s.knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Users"
        });
        return users || []
    }
    async function cacheUsers(connectionToFailover){
        const users = await getUsers();
        sendMessage(connectionToFailover,{ f: 'cacheUsers', users });
        return users
    }
    async function getPermissions(){
        const { rows: permissions } = await s.knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Permission Sets"
        });
        return permissions || []
    }
    async function cachePermissions(connectionToFailover){
        const permissions = await getPermissions();
        sendMessage(connectionToFailover,{ f: 'cachePermissions', permissions });
        return permissions
    }
    async function updateCachedUser(connectionToFailover, user, deleteUser){
        if(user){
            if(deleteMonitor){
                sendMessage(connectionToFailover,{ f: 'deleteCachedUser', user });
            }else{
                sendMessage(connectionToFailover,{ f: 'updateCachedUser', user });
            }
        }
    }
    // async function importUsers(connectionToFailover){
    //     const users = await getUsers();
    //     sendMessage(connectionToFailover,{ f: 'importUsers', users });
    //     return users
    // }
    function getWriteStream(filePath){
        let writeStream = writeStreams[filePath]
        if(!writeStream){
            writeStreams[filePath] = createWriteStream(filePath)
            return writeStreams[filePath]
        }
        return writeStream
    }
    function insertVideoChunk(video, chunk, monitorInfo){
        const filePath = getVideoFilePath(video, monitorInfo);
        let writeStream = getWriteStream(filePath)

        let bufferChunk;
        if (Buffer.isBuffer(chunk)) {
            bufferChunk = chunk;
        } else if (chunk instanceof Uint8Array) {
            bufferChunk = Buffer.from(chunk);
        } else if (chunk instanceof ArrayBuffer) {
            bufferChunk = Buffer.from(chunk);
        } else if (chunk && chunk.data) {
            bufferChunk = Buffer.from(chunk.data);
        } else {
            bufferChunk = Buffer.from(chunk);
        }

        if(!writeStreams[filePath]){
            const activeMonitor = s.group[video.ke].activeMonitors[video.mid]
            const monitorConfig = s.group[video.ke].rawMonitorConfigurations[video.mid]
            const videoDirectory = s.getVideoDirectory(monitorConfig)
            const filename = s.formattedTime(video.time)
            writeStreams[filePath] = createWriteStream(filePath)
            writeStream = writeStreams[filePath]
            wstream.on('finish', async () => {
                try {
                    const groupKey = video.ke
                    const monitorId = video.mid
                    const filesize = await fs.stat(filePath)
                    const insert = {
                        startTime : video.time,
                        filesize : filesize,
                        endTime : video.end,
                        dir : videoDirectory,
                        file : filename,
                        filename : filename,
                        filesizeMB : parseFloat((filesize/1048576).toFixed(2))
                    }
                    s.insertDatabaseRow(monitorConfig,insert,function(response){
                        postProcessCompletedMp4Video(response.insertQuery).then((isGood) => {
                            s.insertCompletedVideoExtensions.forEach(function(extender){
                                extender(activeMonitor, monitorConfig, insert)
                            })
                            s.purgeDiskForGroup(groupKey)
                            s.setDiskUsedForGroup(groupKey,insert.filesizeMB)
                            clearTimeout(activeMonitor.recordingChecker)
                            clearTimeout(activeMonitor.streamChecker)
                        })
                    })
                } catch (err) {
                    console.error('Error finishing video:', err);
                } finally {
                    delete writeStreams[filePath];
                }
            })
        }
        writeStream.write(bufferChunk)
        bufferChunk = null
        chunk = null
    }
    function sendMessage(clientConnection,data){
        clientConnection.send(bson.serialize(data))
    }
    async function insertEvents(events){
        for(anEvent of events){
            await s.knexQueryPromise({
                action: "insert",
                table: "Events",
                insert: anEvent
            });
        }
    }
    async function insertCloudVideos(events){
        for(anEvent of events){
            await s.knexQueryPromise({
                action: "insert",
                table: "Cloud Videos",
                insert: anEvent
            });
        }
    }
    async function getVideo(video){
        const rows = await s.knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Videos",
            where: video,
            limit: 1,
        })
        return rows[0];
    }
    function sendFailoverServerCache(){
        runOnFailoverConnections((host, serverConnection) => {
            sendMessage(serverConnection, { f: 'cache_other_failovers', allServers: failoverServerCache, serverIp: host })
        })
    }
    function connectToFailover({ host, key }){
        clearTimeout(reconnectTimeouts[host])
        // A previous removal may have flagged this host; connecting again clears it.
        delete(wantTerminate[host])
        const parsedIp = parseNewConnectionAddress(host)
        s.systemLog('Attempting Connection to Failover at ', parsedIp)
        const previousInfo = failoverServerStatus[host] || {}
        setFailoverServerStatus(host, (previousInfo.attempts || 0) > 0 ? CONNECTION_STATES.retrying : CONNECTION_STATES.connecting)
        const clientConnection = createWebSocketClient(parsedIp)
        function reconnectOnFailure(){
            try{
                failoverServerConnections[host].terminate()
            }catch(err){}
            delete(failoverServerConnections[host])
            delete(failoverServerCache[host])
            clearTimeout(reconnectTimeouts[host])
            // The server was removed (or is being replaced) - reconnecting here is exactly
            // the "deleted but still hammering" behaviour, so stop.
            if(wantTerminate[host]){
                s.systemLog('Failover Connection Closed, NOT Trying again (removed) : ', host)
                setFailoverServerStatus(host, CONNECTION_STATES.disconnected)
                return
            }
            const info = failoverServerStatus[host] || (failoverServerStatus[host] = {})
            info.attempts = (info.attempts || 0) + 1
            const now = Date.now()
            if(!info.retryWindowStartedAt)info.retryWindowStartedAt = now
            let delay = RETRY_INTERVAL
            // A minute of attempts with nothing to show for it - wait out a long pause
            // rather than reconnecting every 10s forever, then start a fresh minute.
            if(now - info.retryWindowStartedAt >= RETRY_WINDOW){
                delay = RETRY_WINDOW_PAUSE
                info.retryWindowStartedAt = null
            }
            s.systemLog(`Failover Connection Failed, Trying again in ${Math.round(delay / 1000)}s : `, host)
            setFailoverServerStatus(host,
                info.attempts >= ATTEMPTS_BEFORE_FAILED ? CONNECTION_STATES.failed : CONNECTION_STATES.retrying,
                { nextAttemptAt: new Date(now + delay).toISOString() }
            )
            reconnectTimeouts[host] = setTimeout(function(){
                // Re-checked : the server may have been removed during the wait.
                if(wantTerminate[host])return
                connectToFailover({ host, key })
            },delay)
        }
        clientConnection.onclose = reconnectOnFailure
        clientConnection.on('open', () => {
            s.systemLog('Connected to Failover, Attempting Authentication... ', host)
            setFailoverServerStatus(host, CONNECTION_STATES.connecting)
            sendMessage(clientConnection, { key })
        })
        clientConnection.on('error', (data) => {
            s.systemLog('Failover Connection Error : ', data)
            const info = failoverServerStatus[host] || (failoverServerStatus[host] = {})
            info.lastError = `${(data && data.message) || data}`
            broadcastFailoverServerStatus(host)
        })
        clientConnection.on('message', async (message) => {
            const data = bson.deserialize(Buffer.from(message))
            switch(data.f){
                case'init':
                    // The failover only sends this once it has accepted the key.
                    setFailoverServerStatus(host, CONNECTION_STATES.connected)
                    s.systemLog('Initializing Failover at ', host)
                    await cachePermissions(clientConnection)
                    await cacheUsers(clientConnection)
                    await cacheMonitors(clientConnection)
                    sendMessage(clientConnection, { f: 'init_complete' })
                    sendFailoverServerCache()
                    s.systemLog('Initialized Failover at ', host)
                break;
                case'insertEvents':
                    insertEvents(data.events)
                break;
                case'insertCloudVideos':
                    insertCloudVideos(data.videos)
                break;
                case'insertVideoChunk':
                    insertVideoChunk(data.video, data.data, data.monitorInfo)
                break;
                case'insertVideoComplete':
                    try{
                        const filePath = getVideoFilePath(data.video, data.monitorInfo);
                        getWriteStream(filePath).end()
                    }catch(err){
                        console.log(err)
                    }
                break;
                case'videoExistsInNormal':
                    try{
                        let exists = !!(await getVideo(data.video))
                        if(exists){
                            const filePath = getVideoFilePath(data.video, data.monitorInfo);
                            const fileSize = (await fs.stat(filePath)).size
                            const fileSizeOk = data.fileSize === fileSize
                            exists = exists && fileSizeOk
                        }
                        sendMessage(clientConnection, { f: 'videoExistsInNormalResponse', callbackId: data.callbackId, exists })
                    }catch(err){
                        console.log(err)
                    }
                break;
            }
        })
        failoverServerConnections[host] = clientConnection
        failoverServerCache[host] = { time: new Date(), key };
    }
    function getFailoverConnections(){
        return failoverServerConnections
    }
    function runOnFailoverConnections(callback){
        for(host in failoverServerConnections){
            const serverConnection = failoverServerConnections[host]
            callback(host, serverConnection)
        }
    }
    function getFailoverConnection(host){
        return failoverServerConnections[host]
    }
    // `purge` also drops the status record, for when the server is being removed rather
    // than reconnected.
    function closeFailoverConnection(host, options){
        const purge = !!(options && options.purge)
        sendFailoverServerCache()
        // Both of these are what kept a deleted server alive : a retry queued by an earlier
        // failure would fire on its own timer and reconnect, and nothing marked the host as
        // deliberately closed, so the next onclose would queue another one.
        wantTerminate[host] = true
        clearTimeout(reconnectTimeouts[host])
        delete(reconnectTimeouts[host])
        setFailoverServerStatus(host, CONNECTION_STATES.disconnected)
        const finish = () => {
            if(purge){
                delete(failoverServerStatus[host])
                delete(wantTerminate[host])
                broadcastFailoverServerStatus(host,true)
            }
        }
        if(failoverServerConnections[host]){
            return new Promise(function(resolve){
                try{
                    sendMessage(failoverServerConnections[host],{ f: 'exit' })
                    failoverServerConnections[host].onclose = (event) => {
                        delete(failoverServerConnections[host])
                        delete(failoverServerCache[host])
                        finish()
                        resolve()
                    }
                    failoverServerConnections[host].terminate()
                }catch(err){
                    s.systemLog(err)
                    finish()
                    resolve()
                }
            })
        }
        finish()
    }
    // Removing a failover server has to actually stop it and stay stopped - a retry that
    // fired in the gap would otherwise reconnect to a server the user has deleted.
    const STOP_VERIFY_DELAY = 3000
    function ensureFailoverServerStopped(host){
        return new Promise(async (resolve) => {
            await closeFailoverConnection(host,{ purge: true })
            setTimeout(() => {
                const stillConnected = !!failoverServerConnections[host]
                const stillTracked = !!failoverServerStatus[host]
                if(!stillConnected && !stillTracked){
                    resolve({ ok: true, stopped: true, neededSecondPass: false })
                    return
                }
                s.systemLog('Failover : connection re-appeared after removal, stopping again',{ host })
                closeFailoverConnection(host,{ purge: true })
                resolve({
                    ok: !failoverServerConnections[host],
                    stopped: !failoverServerConnections[host],
                    neededSecondPass: true,
                })
            },STOP_VERIFY_DELAY)
        })
    }
    async function connectFailoverServers(){
        if(config.failoverServers){
            // console.log('Attempting to Connect to Failover Servers')
            for(host in config.failoverServers){
                console.log('Attempting to Connect to Failover Server : ',host)
                const key = config.failoverServers[host];
                await closeFailoverConnection(host)
                connectToFailover({ host, key })
            }
        }
    }
    function parseNewConnectionAddress(serverIp){
        let parsedIp = `${serverIp}`
        if(parsedIp.indexOf('://') === -1)parsedIp = `ws://${parsedIp}`
        // if(parsedIp.split(':').length === 2)parsedIp = `${parsedIp}:8080`
        if(!parsedIp.endsWith('/failover'))parsedIp += `/failover`
        return parsedIp;
    }
    function getFailoverServers(){
        const response = { ok: true }
        response.failoverServers = config.failoverServers || {};
        response.statuses = getFailoverServerStatuses();
        return response
    }
    async function addFailoverServer(serverIp, p2pKey){
        const response = { ok: true }
        const trimmedKey = `${p2pKey}`.trim()
        const parsedIp = parseNewConnectionAddress(serverIp.trim())
        const currentConfig = await getConfiguration();
        if(!currentConfig.failoverServers)currentConfig.failoverServers = {};
        let keyInUse = false
        for(existingIp in currentConfig.failoverServers){
            const existingKey = currentConfig.failoverServers[existingIp];
            if(existingIp !== parsedIp && existingKey === trimmedKey)keyInUse = true;
        }
        if(keyInUse){
            response.ok = false;
            response.msg = lang['Key Already Exists']
            return response
        }
        currentConfig.failoverServers[parsedIp] = trimmedKey;
        config = Object.assign(config, { failoverServers: currentConfig.failoverServers })
        const configError = await modifyConfiguration(currentConfig)
        response.host = parsedIp;
        response.key = trimmedKey;
        if(configError){
            response.ok = false;
            response.msg = lang['Failed to Save']
            response.err = configError
            s.systemLog(configError)
        }
        return response
    }
    async function removeFailoverServer(serverIp, p2pKey){
        const response = { ok: true }
        let foundMatching = false;
        const currentConfig = await getConfiguration();
        if(!currentConfig.failoverServers)currentConfig.failoverServers = {};
        const currentPeerConnectKey = currentConfig.failoverServers[serverIp];
        if(currentPeerConnectKey === p2pKey){
            foundMatching = true
            delete(currentConfig.failoverServers[serverIp])
            config = Object.assign(config, { failoverServers: currentConfig.failoverServers })
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
    return {
        getMonitors,
        getWriteStream,
        cacheMonitors,
        cacheUsers,
        updateCachedMonitor,
        updateCachedUser,
        insertVideoChunk,
        connectToFailover,
        runOnFailoverConnections,
        getFailoverConnections,
        getFailoverConnection,
        connectFailoverServers,
        getFailoverServers,
        addFailoverServer,
        removeFailoverServer,
        closeFailoverConnection,
        ensureFailoverServerStopped,
        getFailoverServerStatuses,
        parseNewConnectionAddress,
    }
}
