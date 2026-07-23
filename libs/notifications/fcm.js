// Push notifications for the Shinobi Go mobile app, via the hosted push relay.
//
// This server does NOT hold any Firebase credential. On a detection it POSTs
// the alert (device tokens + text) to the relay at push.shinobi.cloud, which
// holds the single Firebase admin key and delivers the FCM push. That means
// self-hosters get working closed-app push with zero Firebase setup.
//
// Devices register their tokens through POST /:auth/fcmToken/:ke (see
// libs/webServerPaths.js); the mobile app does this automatically when push is
// enabled. On by default for registered devices — registering a token is the
// opt-in. Set "Mobile App Push" to No on a monitor to mute that camera.
//
// conf.json overrides (all optional):
//   "fcm": false                          disable entirely
//   "pushRelayUrl": "https://host"        use a different relay
//   "pushRelayApiKey": "..."              relay shared key (if self-hosting one)
const fetch = require('node-fetch');

const DEFAULT_RELAY_URL = 'https://push.shinobi.cloud';
// Shared key for the hosted relay. Not a high-value secret (it only lets a
// caller ask the relay to push to tokens it already knows); the relay also
// rate-limits per IP and per device token.
const DEFAULT_RELAY_API_KEY = '8c2dc5d1623e3b96ccd0ade02a86fafa294348aa875e838b';

module.exports = function(s,config,lang,getSnapshot){
    const {
        getObjectTagNotifyText,
    } = require('../events/utils.js')(s,config,lang)
    // Enabled by default; opt out with "fcm": false.
    if(config.fcm === false)return;
    const relayUrl = (config.pushRelayUrl || DEFAULT_RELAY_URL).replace(/\/+$/,'');
    const relayApiKey = config.pushRelayApiKey || DEFAULT_RELAY_API_KEY;
    // Advertised through GET /:auth/fcmStatus/:ke so mobile clients auto-select
    // FCM mode.
    s.isFcmEnabled = true

    // All registered tokens for a group, from the dedicated PushTokens table
    // (see libs/database/preQueries.js) — covers every user in the group,
    // main account and sub-accounts alike.
    const getGroupTokens = function(groupKey,callback){
        s.knexQuery({
            action: "select",
            columns: "token",
            table: "PushTokens",
            where: [
                ['ke','=',groupKey],
            ]
        },(err,rows) => {
            callback((rows || []).map((row) => row.token).filter(Boolean))
        })
    }
    const removeTokens = function(badTokens){
        (badTokens || []).forEach((token) => {
            s.knexQuery({
                action: "delete",
                table: "PushTokens",
                where: [
                    ['token','=',token],
                ]
            },() => {})
        })
    }
    const sendToGroup = function(groupKey,message){
        getGroupTokens(groupKey,async (tokens) => {
            if(tokens.length === 0)return;
            try{
                const response = await fetch(relayUrl + '/send',{
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({
                        apiKey: relayApiKey,
                        tokens: tokens,
                        title: message.title,
                        body: message.body,
                        data: message.data,
                    }),
                })
                // Read as text first: an empty/truncated body (transient
                // network blip) would otherwise throw an opaque
                // "Unexpected end of JSON input" out of response.json().
                const rawBody = await response.text()
                let result = null
                try{ result = JSON.parse(rawBody) }catch(parseErr){}
                if(!response.ok || !result || result.ok !== true){
                    const msg = (result && result.error) || `HTTP ${response.status}: ${rawBody.slice(0,200) || '(empty response)'}`
                    s.userLog({ke:groupKey,mid:'$USER'},{type:'FCM Error',msg})
                    return
                }
                // Prune tokens the relay reports dead (app uninstalled).
                removeTokens(result.invalidTokens instanceof Array ? result.invalidTokens : [])
            }catch(err){
                s.userLog({ke:groupKey,mid:'$USER'},{type:'FCM Error',msg:err.toString()})
            }
        })
    }
    const onEventTriggerForFcm = async (d,filter) => {
        const monitorConfig = s.group[d.ke].rawMonitorConfigurations[d.id]
        // On by default; "0" mutes the camera.
        if(monitorConfig.details.notify_fcm === '0')return;
        if(s.group[d.ke].activeMonitors[d.id].detector_fcm)return;
        var detector_fcm_timeout;
        if(!monitorConfig.details.detector_fcm_timeout || monitorConfig.details.detector_fcm_timeout === ''){
            // Shorter than the other notifiers' 10 min: push is the primary
            // alert channel for the mobile app.
            detector_fcm_timeout = 1000 * 60;
        }else{
            detector_fcm_timeout = parseFloat(monitorConfig.details.detector_fcm_timeout) * 1000 * 60;
        }
        s.group[d.ke].activeMonitors[d.id].detector_fcm = setTimeout(function(){
            clearTimeout(s.group[d.ke].activeMonitors[d.id].detector_fcm);
            s.group[d.ke].activeMonitors[d.id].detector_fcm = null
        },detector_fcm_timeout)
        const notifyText = getObjectTagNotifyText(d)
        const monitorId = String(d.mid || d.id)
        sendToGroup(d.ke,{
            title: monitorConfig.name,
            body: notifyText + ' - ' + d.currentTimestamp,
            // Data rides along for the app's tap handler (deep link).
            data: {
                type: 'detection',
                ke: String(d.ke),
                mid: monitorId,
            },
        })
    }
    s.onEventTrigger(onEventTriggerForFcm)
    s.definitions['Monitor Settings'].blocks['Notifications'].info[0].info.push({
        name: 'detail=notify_fcm',
        field: 'Mobile App Push',
        description: '',
        default: '1',
        example: '',
        selector: 'h_det_fcm',
        fieldType: 'select',
        possible: [
            {
                name: lang.Yes,
                value: '1',
            },
            {
                name: lang.No,
                value: '0',
            },
        ],
    })
    s.definitions['Monitor Settings'].blocks['Notifications'].info.push({
        isFormGroupGroup: true,
        name: 'Mobile App Push',
        color: 'blue',
        'section-class': 'h_det_fcm_input h_det_fcm_1',
        info: [
            {
                name: 'detail=detector_fcm_timeout',
                field: lang['Allow Next Alert'] + ` (${lang['on Event']})`,
                description: '',
                default: '1',
                example: '',
                possible: '',
            },
        ],
    })
};
