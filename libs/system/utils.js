const fs = require('fs');
const spawn = require('child_process').spawn;
const {
    mergeDeep,
    mbToHumanReadable,
} = require('../common.js')
module.exports = (config) => {
    var currentlyUpdating = false
    const isValidStreamName = (streamName) => {
        const pathTraversalPatterns = [/\.\.\//g, /\/\/+/g, /^\/.*/g];
        let cleanName = streamName;
        pathTraversalPatterns.forEach(pattern => {
            cleanName = cleanName.replace(pattern, '');
        });
        return cleanName === streamName;
    };
    // conf.json is written to the audit log whenever it changes, so the licence key would
    // otherwise sit in plain text in the Logs table and in the pm2 output. The key is worth
    // as much as the licence itself, and an audit entry only needs to show that it changed.
    const redactionMarker = '*** redacted ***'
    // peerConnectKey and p2pApiKey sit beside subscriptionId as things startup will activate
    // from, so a licence key pasted into either of those is the same secret under a different
    // name.
    const redactedConfigKeys = ['subscriptionId','peerConnectKey','p2pApiKey']
    const redactConfigForLog = (theConfig) => {
        if(!theConfig || !(theConfig instanceof Object))return theConfig
        const redacted = Object.assign({},theConfig)
        redactedConfigKeys.forEach(function(key){
            if(redacted[key])redacted[key] = redactionMarker
        })
        // Central Management stores the licence key as the connection secret for each server,
        // so redacting the field above alone still left it readable here. The server
        // addresses are what makes the entry worth auditing, so those stay.
        if(redacted.mgmtServers && redacted.mgmtServers instanceof Object){
            const servers = {}
            Object.keys(redacted.mgmtServers).forEach(function(address){
                servers[address] = redactionMarker
            })
            redacted.mgmtServers = servers
        }
        return redacted
    }
    return {
        isValidStreamName,
        redactConfigForLog,
        getSystemInfo: (s) => {
            const response = {
                "Time Started": s.timeStarted,
                "Time Ready": s.timeReady,
                "Maximum Cameras": s.cameraCount,
                Versions: {
                    "Shinobi": s.currentVersion,
                    "Node.js": process.version,
                    "FFmpeg": s.ffmpegVersion,
                    "isActivated": config.userHasSubscribed,
                    "previousShinobi": s.versionsUsed,
                },
                Machine: {
                    "CPU Core Count": s.coreCount,
                    "Total RAM": mbToHumanReadable(s.totalmem / (1024 * 1024)),
                    "Operating System Platform": s.platform,
                },

            }
            if(s.expiryDate)response.Versions["License Expires On"] = s.expiryDate
            return response
        },
        getConfiguration: () => {
            return new Promise((resolve,reject) => {
                const configPath = s.location.config;
                fs.readFile(configPath, 'utf8', (err, data) => {
                    resolve(JSON.parse(data))
                });
            });
        },
        modifyConfiguration: (postBody, useBase) => {
            return new Promise((resolve, reject) => {
                const configPath = config.thisIsDocker ? "/config/conf.json" : s.location.config;
                let configToPost = postBody;
                if(useBase){
                    try{
                        const configBase = s.parseJSON(fs.readFileSync(configPath),{});
                        configToPost = mergeDeep(configBase, postBody)
                    }catch(err){
                        console.error('modifyConfiguration : Failed to use Config base!')
                    }
                }
                const configData = JSON.stringify(configToPost, null, 3);
                s.debugLog(configData)
                fs.writeFile(configPath, configData, resolve);
            });
        },
        updateSystem: () => {
            return new Promise((resolve,reject) => {
                if(!config.thisIsDocker){
                    if(currentlyUpdating){
                        resolve(true)
                        return
                    };
                    currentlyUpdating = true
                    const updateProcess = spawn('sh',[s.mainDirectory + '/UPDATE.sh'])
                    updateProcess.stderr.on('data',(data) => {
                        s.systemLog('UPDATE.sh',data.toString())
                    })
                    updateProcess.stdout.on('data',(data) => {
                        s.systemLog('UPDATE.sh',data.toString())
                    })
                    updateProcess.on('exit',(data) => {
                        resolve(true)
                        currentlyUpdating = false
                    })
                }else{
                    resolve(false)
                }
            })
        }
    }
}
