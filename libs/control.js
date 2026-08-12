var os = require('os');
var exec = require('child_process').exec;
module.exports = function(s,config,lang,app,io){
    const {
        startMove,
        stopMove,
        ptzControl,
    } = require('./control/ptz.js')(s,config,lang)
    require('./control/onvif.js')(s,config,lang,app,io)
    require('./control/zwave.js')(s,config,lang,app,io)
    // const ptz = require('./control/ptz.js')(s,config,lang,app,io)
    const isPtzAllowed = (connection,monitorId) => {
        const user = s.group[connection.ke] && s.group[connection.ke].users && s.group[connection.ke].users[connection.auth]
        if(!user)return false
        const {
            monitorPermissions,
        } = s.getMonitorsPermitted(user.details,monitorId)
        const {
            isRestricted,
            isRestrictedApiKey,
            apiKeyPermissions,
        } = s.checkPermission(user)
        return !(
            isRestrictedApiKey && apiKeyPermissions.control_monitors_disallowed ||
            isRestricted && !monitorPermissions[`${monitorId}_control`]
        )
    }
    s.onOtherWebSocketMessages((data,connection) => {
        data.ke = connection.ke
        const monitorId = data.id
        switch(data.f){
            case'startMove':
                if(!isPtzAllowed(connection,monitorId))return;
                startMove(data).then((response) => {
                    s.debugLog(response)
                }).catch((err) => {
                    s.debugLog('startMove error', err)
                })
            break;
            case'stopMove':
                if(!isPtzAllowed(connection,monitorId))return;
                stopMove(data).then((response) => {
                    s.debugLog(response)
                }).catch((err) => {
                    s.debugLog('startMove error', err)
                })
            break;
            case'control':
                if(!isPtzAllowed(connection,monitorId)){
                    connection.emit('f',{
                        f: 'control',
                        response: {ok: false, msg: lang['Not Authorized']}
                    })
                    return
                }
                ptzControl(data,function(msg){
                    s.userLog(data,{
                        type: lang['Control'],
                        msg: msg
                    });
                    connection.emit('f',{
                        f: 'control',
                        response: msg
                    })
                })
            break;
        }
    })
}
