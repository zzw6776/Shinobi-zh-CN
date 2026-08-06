const fs = require("fs")
const fetch = require("node-fetch")
module.exports = function(s,config,lang,getSnapshot){
    const {
        getObjectTagNotifyText,
        getEventBasedRecordingUponCompletion,
    } = require('../events/utils.js')(s,config,lang)
    const {
        parseMessageOptions,
        getAppDeepLink,
    } = require('./utils.js')(s,config,lang)
    //matrix bot
    if(config.matrixBot === true){
        const allowedSend = {}
        // matrix-js-sdk is ESM-only and (as of writing) its published build still contains
        // internal directory-style imports that Node's ESM resolver rejects
        // (ERR_UNSUPPORTED_DIR_IMPORT) even on Node versions the SDK claims to support - see
        // https://github.com/matrix-org/matrix-js-sdk/issues/4287. Rather than depend on it, talk
        // to the Matrix Client-Server REST API directly with node-fetch. This client object only
        // implements the two calls this file actually needs (sendMessage/uploadContent), matching
        // matrix-js-sdk's method names/shapes so the rest of this module is unchanged.
        async function matrixApiRequest(baseUrl,accessToken,method,path,opts){
            const url = `${baseUrl.replace(/\/$/,'')}${path}`
            const headers = { 'Authorization': `Bearer ${accessToken}` }
            let body
            if(opts && opts.json){
                headers['Content-Type'] = 'application/json'
                body = JSON.stringify(opts.json)
            }else if(opts && opts.raw){
                headers['Content-Type'] = opts.contentType || 'application/octet-stream'
                body = opts.raw
            }
            const response = await fetch(url,{ method, headers, body })
            const data = await response.json().catch(() => ({}))
            if(!response.ok){
                const err = new Error(data.error || `Matrix API error ${response.status}`)
                err.status = response.status
                throw err
            }
            return data
        }
        function createMatrixRestClient(baseUrl,accessToken){
            return {
                sendMessage: function(roomId,content){
                    const txnId = `m${Date.now()}${Math.random().toString(16).slice(2)}`
                    return matrixApiRequest(baseUrl,accessToken,'PUT',`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,{ json: content })
                },
                uploadContent: function(buffer,opts){
                    opts = opts || {}
                    return matrixApiRequest(baseUrl,accessToken,'POST',`/_matrix/media/v3/upload?filename=${encodeURIComponent(opts.name || 'file')}`,{ raw: buffer, contentType: opts.type })
                },
                whoami: function(){
                    return matrixApiRequest(baseUrl,accessToken,'GET','/_matrix/client/v3/account/whoami')
                },
            }
        }
        try{
            function sendFile(file,groupKey){
                const client = s.group[groupKey].matrixBot
                const roomId = s.group[groupKey].matrixBotRoom
                const {
                    buffer,
                    name,
                    type,
                    info,
                    opttype,
                } = file;
                client.uploadContent(buffer, {
                        name: name,
                        type: opttype,
                }).then(function(url) {
                    const content = {
                        msgtype: type || "m.file",
                        body: name,
                        info: info,
                        url: url.content_uri
                    };
                    client.sendMessage(roomId, content);
                }).catch(err => {
                    console.error(err)
                    s.userLog({
                        ke: groupKey,
                        mid: '$USER'
                    },{
                        type: 'matrix.org Error',
                        msg: err.toString()
                    });
                })
            }
            const sendMessage = function(data,files,groupKey){
                if(!data)data = {};
                const client = s.group[groupKey].matrixBot
                const roomId = s.group[groupKey].matrixBotRoom
                if(!client){
                    s.userLog({ke:groupKey,mid:'$USER'},{type:'matrix.org Error'})
                    return
                }
                if(client.sendMessage){
                    if(data.text){
                        const sendBody = {
                           "body": data.text,
                           "msgtype": "m.text"
                        }
                        client.sendMessage(roomId, sendBody);
                    }
                    files.forEach((file) => {
                        sendFile(file,groupKey)
                    });
                }else{
                    s.userLog({
                        ke: groupKey,
                        mid: '$USER'
                    },{
                        type: 'matrix.org Error',
                        msg: '!sendMessage'
                    });
                }
            }
            const onEventTriggerBeforeFilterForMatrixBot = function(d,filter){
                filter.matrixBot = false
            }
            const onEventTriggerForMatrixBot = async (d,filter) => {
                const monitorConfig = s.group[d.ke].rawMonitorConfigurations[d.id]
                // d = event object
                const isEnabled = filter.matrixBot || monitorConfig.details.detector_matrixbot === '1' || monitorConfig.details.notify_matrix === '1'
                if(s.group[d.ke].matrixBot && isEnabled && !s.group[d.ke].activeMonitors[d.id].detector_matrixbot){
                    const notifyText = getObjectTagNotifyText(d)
                    var detector_matrixbot_timeout
                    if(!monitorConfig.details.detector_matrixbot_timeout||monitorConfig.details.detector_matrixbot_timeout===''){
                        detector_matrixbot_timeout = 1000 * 60 * 10;
                    }else{
                        detector_matrixbot_timeout = parseFloat(monitorConfig.details.detector_matrixbot_timeout) * 1000 * 60;
                    }
                    await getSnapshot(d,monitorConfig)
                    const willSendVideo = monitorConfig.details.detector_matrixbot_send_video === '1'
                    if(d.screenshotBuffer || willSendVideo){
                        s.group[d.ke].activeMonitors[d.id].detector_matrixbot = setTimeout(function(){
                            clearTimeout(s.group[d.ke].activeMonitors[d.id].detector_matrixbot);
                            s.group[d.ke].activeMonitors[d.id].detector_matrixbot = null
                        },detector_matrixbot_timeout)
                    }
                    if(d.screenshotBuffer){
                        sendMessage({
                            text: notifyText + '\n' + getAppDeepLink(d),
                        },[
                            {
                                buffer: d.screenshotBuffer,
                                name: d.screenshotName+'.jpg',
                                type: 'm.image',
                                opttype: 'image/jpeg',
                                info: {
                                    mimetype: 'image/jpeg',
                                },
                            }
                        ],d.ke)
                    }
                    if(willSendVideo){
                        let videoPath = null
                        let videoName = null
                        const eventBasedRecording = await getEventBasedRecordingUponCompletion({
                            ke: d.ke,
                            mid: d.mid || d.id
                        })
                        if(eventBasedRecording.filePath){
                            videoPath = eventBasedRecording.filePath
                            videoName = eventBasedRecording.filename
                        }else{
                            const siftedVideoFileFromRam = await s.mergeDetectorBufferChunks(d)
                            videoPath = siftedVideoFileFromRam.filePath
                            videoName = siftedVideoFileFromRam.filename
                        }
                        if(videoPath){
                            sendMessage({
                                text: notifyText + '\n' + getAppDeepLink(d),
                            },[
                                {
                                    buffer: await fs.promises.readFile(videoPath),
                                    name: videoName,
                                    type: 'm.video',
                                    opttype: 'video/mp4',
                                    info: {
                                    mimetype: 'video/mp4',
                                    },
                                }
                            ],d.ke)
                        }
                    }
                }
            }
            const onTwoFactorAuthCodeNotificationForMatrixBot = function(user){
                // r = user
                if(r.details.factor_matrixbot === '1'){
                    const eventText = `${lang['2-Factor Authentication']} : ${lang['Enter this code to proceed']} **${factorAuthKey}** ${lang.FactorAuthText1}`
                    sendMessage({
                        text: eventText,
                    },[],d.ke)
                }
            }
            const loadMatrixBotForUser = function(user){
                const userDetails = s.parseJSON(user.details);
                const groupKey = user.ke;
                //matrixbot
                if(!s.group[user.ke].matrixBot &&
                   config.matrixBot === true &&
                   userDetails.matrixbot === '1' &&
                   userDetails.matrixbot_baseUrl &&
                   userDetails.matrixbot_accessToken &&
                   userDetails.matrixbot_userId &&
                   userDetails.matrixbot_roomId
                  ){
                    allowedSend[groupKey] = true;
                    s.debugLog(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`)
                    s.debugLog(`Matrix Connecting... ${userDetails.matrixbot_baseUrl}`)
                    const client = createMatrixRestClient(userDetails.matrixbot_baseUrl, userDetails.matrixbot_accessToken)
                    s.group[user.ke].matrixBot = client
                    s.group[user.ke].matrixBotRoom = userDetails.matrixbot_roomId
                    client.whoami().then(function(){
                        s.userLog({
                            ke: user.ke,
                            mid: '$USER'
                        },{
                            type: 'matrix.org',
                            msg: lang.Ready
                        })
                    }).catch(function(err){
                        s.userLog({
                            ke: user.ke,
                            mid: '$USER'
                        },{
                            type: 'matrix.org Error',
                            msg: err.toString()
                        })
                    });
                }else{
                    allowedSend[groupKey] = false;
                }
            }
            const unloadMatrixBotForUser = function(user){
                // No persistent connection to tear down (REST is stateless per-call) - just
                // drop the reference. Previously this was gated on client.stopClient existing,
                // which meant the bot was never actually cleared on unload.
                if(s.group[user.ke].matrixBot){
                    delete(s.group[user.ke].matrixBot)
                }
            }
            const onDetectorNoTriggerTimeoutForMatrixBot = function(e){
                //e = monitor object
                var currentTime = new Date()
                if(e.details.detector_notrigger_matrixbot === '1'){
                    var html = '*'+lang.NoMotionEmailText2+' ' + (e.details.detector_notrigger_timeout || 10) + ' '+lang.minutes+'.*\n'
                    html += '**' + lang['Monitor Name'] + '** : '+e.name + '\n'
                    html += '**' + lang['Monitor ID'] + '** : '+e.id + '\n'
                    html += currentTime
                    const eventText = `${lang['"No Motion" Detector']} : ${html}`
                    sendMessage({
                        text: eventText,
                    },[],e.ke)
                }
            }
            const onMonitorUnexpectedExitForMatrixBot = (monitorConfig) => {
                const isEnabled = monitorConfig.details.detector_matrixbot === '1' || monitorConfig.details.notify_matrix === '1'
                if(isEnabled && monitorConfig.details.notify_onUnexpectedExit === '1'){
                    const ffmpegCommand = s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].ffmpeg
                    const description = lang['Process Crashed for Monitor'] + '\n' + ffmpegCommand
                    const currentTime = new Date()
                    const eventText = `${lang['Process Unexpected Exit']} : ${monitorConfig.name} : ${description}`
                    sendMessage({
                        text: eventText,
                    },[],monitorConfig.ke)
                }
            }
            const generalMessage = (groupKey, data = {}, files = []) => {
                if(allowedSend[groupKey]){
                    const {
                        senderName,
                        recipientAddress,
                        title,
                        text,
                        footer,
                        time,
                    } = parseMessageOptions(data);
                    sendMessage(
                        {
                            text: `${title}\n\n${text}${footer ? `\n\n*${footer}*` : ``}\n\n${time}`,
                        },
                        files.map((item) => {
                            const isImage = item.name.endsWith('.jpg') || item.name.endsWith('.png') || item.name.endsWith('.jpeg')
                            return {
                                buffer: item.attachment, //buffer
                                name: item.name,
                                type: isImage ? 'm.image' : 'm.video',
                                opttype: isImage ? 'image/jpeg' : 'video/mp4',
                                info: {
                                    mimetype:  isImage ? 'image/jpeg' : 'video/mp4',
                                }
                            }
                        }),
                        groupKey
                    )
                }
            }
            s.loadGroupAppExtender(loadMatrixBotForUser)
            s.unloadGroupAppExtender(unloadMatrixBotForUser)
            s.onTwoFactorAuthCodeNotification(onTwoFactorAuthCodeNotificationForMatrixBot)
            s.onEventTrigger(onEventTriggerForMatrixBot)
            s.onEventTriggerBeforeFilter(onEventTriggerBeforeFilterForMatrixBot)
            s.onDetectorNoTriggerTimeout(onDetectorNoTriggerTimeoutForMatrixBot)
            s.onMonitorUnexpectedExit(onMonitorUnexpectedExitForMatrixBot)
            s.onTriggerNotificationSend(generalMessage)
            s.definitions["Monitor Settings"].blocks["Notifications"].info[0].info.push(
                {
                   "name": "detail=notify_matrix",
                   "field": "Matrix.org",
                   "description": "",
                   "default": "0",
                   "example": "",
                   "selector": "h_det_matrixbot",
                   "fieldType": "select",
                   "possible": [
                      {
                         "name": lang.No,
                         "value": "0"
                      },
                      {
                         "name": lang.Yes,
                         "value": "1"
                      }
                   ]
                }
            )
            s.definitions["Monitor Settings"].blocks["Notifications"].info.push({
               "evaluation": "$user.details.use_matrixbot !== '0'",
               isFormGroupGroup: true,
               "name": "Matrix.org",
               "color": "purple",
               "section-visibleWhen": { "h_det_matrixbot": "1" },
               "info": [
                   {
                      "name": "detail=detector_matrixbot_send_video",
                      "field": lang["Attach Video Clip"] + ` (${lang['on Event']})`,
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "name": "detail=detector_matrixbot_timeout",
                      "field": lang['Allow Next Alert'] + ` (${lang['on Event']})`,
                      "description": "",
                      "default": "10",
                      "example": "",
                      "possible": ""
                   },
                   {
                      "name": "detail=detector_notrigger_matrixbot",
                      "field": lang['No Trigger'],
                      "description": lang.noTriggerText,
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
               ]
            })
            s.definitions["Account Settings"].blocks["2-Factor Authentication"].info.push({
                "name": "detail=factor_matrixbot",
                "field": 'Matrix.org',
                "default": "1",
                "example": "",
                "fieldType": "select",
                "possible": [
                   {
                      "name": lang.No,
                      "value": "0"
                   },
                   {
                      "name": lang.Yes,
                      "value": "1"
                   }
                ]
            })
            s.definitions["Account Settings"].blocks["Matrix.org"] = {
               "evaluation": "$user.details.use_matrixbot !== '0'",
               "name": "Matrix.org",
               "color": "purple",
               "info": [
                   {
                      "name": "detail=matrixbot",
                      "selector":"u_matrixbot_bot",
                      "field": lang.Enabled,
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=matrixbot_baseUrl",
                      "placeholder": "",
                      "field": lang["Host"],
                      "form-group-visibleWhen":{ "u_matrixbot_bot": "1" },
                   },
                   {
                       hidden: true,
                      "name": "detail=matrixbot_userId",
                      "placeholder": "xxxxxxxxxxxxxxxxxx",
                      "field": lang["User ID"],
                      "form-group-visibleWhen":{ "u_matrixbot_bot": "1" },
                   },
                   {
                       hidden: true,
                      "name": "detail=matrixbot_roomId",
                      "placeholder": "xxxxxxxxxxxxxxxxxx",
                      "field": lang["Room ID"],
                      "form-group-visibleWhen":{ "u_matrixbot_bot": "1" },
                   },
                   {
                       hidden: true,
                      "name": "detail=matrixbot_accessToken",
                      "fieldType": "password",
                      "placeholder": "XXXXXXXXXXXXXXXXXXXXXXXX",
                      "field": lang.Token,
                      "form-group-visibleWhen":{ "u_matrixbot_bot": "1" },
                  },
               ]
            }
            s.definitions["Event Filters"].blocks["Action for Selected"].info.push({
                 "name": "actions=matrixBot",
                 "field": 'Matrix.org',
                 "fieldType": "select",
                 "form-group-class": "actions-row",
                 "default": "",
                 "example": "1",
                 "possible": [
                    {
                       "name": lang['Original Choice'],
                       "value": "",
                       "selected": true
                    },
                    {
                       "name": lang.Yes,
                       "value": "1",
                    }
                 ]
            })
        }catch(err){
            console.log(err)
            console.log('Could not start Matrix bot, please run "npm install matrix-js-sdk" inside the Shinobi folder.')
        }
    }
}
