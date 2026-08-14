$(document).ready(function(){
    var theEnclosure = $('#failoverServers')
    var theList = $('#failoverServers-list')
    var theForm = theEnclosure.find('form')
    var serverStatuses = {}
    function getServers(){
        return new Promise((resolve) => {
            $.get(superApiPrefix + $user.sessionKey + '/failover/list',function(data){
                serverStatuses = (data || {}).statuses || {}
                resolve((data || {}).failoverServers)
            })
        })
    }
    // Same states the Central Management tab reports. "Connected" here means the Failover
    // accepted the key and asked this server to send its monitors and users.
    function statusBadgeHtml(failoverServer){
        var info = serverStatuses[failoverServer] || {}
        var status = info.status || 'disconnected'
        var badgeClass = 'badge-secondary'
        var label = lang['Disconnected'] || 'Disconnected'
        switch(status){
            case'connected':
                badgeClass = 'badge-success'
                label = lang['Connected'] || 'Connected'
            break;
            case'connecting':
                badgeClass = 'badge-info'
                label = lang['Connecting'] || 'Connecting'
            break;
            case'retrying':
                badgeClass = 'badge-warning'
                label = lang['Retrying'] || 'Retrying'
            break;
            case'failed':
                badgeClass = 'badge-danger'
                label = lang['Failed Connection'] || 'Failed Connection'
            break;
        }
        var detail = ''
        if(status === 'retrying' || status === 'failed'){
            var nextIn = ''
            if(info.nextAttemptAt){
                var secondsAway = Math.round((new Date(info.nextAttemptAt).getTime() - Date.now()) / 1000)
                if(secondsAway > 0){
                    nextIn = ` - ${lang['Next attempt in'] || 'Next attempt in'} ${secondsAway >= 60 ? `${Math.round(secondsAway / 60)} ${lang['minutes'] || 'minutes'}` : `${secondsAway}s`}`
                }
            }
            detail = `<div><small class="text-muted">${info.attempts || 0} ${lang['attempts'] || 'attempts'}${nextIn}${info.lastError ? ` - ${info.lastError}` : ''}</small></div>`
        }
        return `<span class="badge ${badgeClass}">${label}</span>${detail}`
    }
    function refreshStatusBadges(){
        theList.find('.server-row').each(function(){
            var row = $(this)
            row.find('.server-status').html(statusBadgeHtml(row.attr('data-server')))
        })
    }
    function addServer({ failoverServer, peerConnectKey }){
        return new Promise((resolve) => {
            $.post(superApiPrefix + $user.sessionKey + '/failover/save',{
                failoverServer,
                peerConnectKey,
            },function(data){
                resolve(data)
            })
        })
    }
    function removeServer({ failoverServer, peerConnectKey }){
        return new Promise((resolve) => {
            $.post(superApiPrefix + $user.sessionKey + '/failover/disconnect',{
                failoverServer,
                peerConnectKey,
            },function(data){
                resolve(data)
            })
        })
    }
    function drawServerRow({ failoverServer, peerConnectKey }){
        var notExist = $(`[data-server="${failoverServer}"][data-peerconnectkey="${peerConnectKey}"]`).length === 0
        if(notExist)theList.append(`<tr class="server-row" data-server="${failoverServer}" data-peerconnectkey="${peerConnectKey}">
            <td>${failoverServer}</td>
            <td>${peerConnectKey}</td>
            <td class="server-status">${statusBadgeHtml(failoverServer)}</td>
            <td><a class="btn btn-sm btn-danger delete"><i class="fa fa-trash-o"></i></a></td>
        </tr>`)
    }
    async function drawServers(){
        const list = await getServers()
        for(failoverServer in list){
            var peerConnectKey = list[failoverServer];
            drawServerRow({ failoverServer, peerConnectKey })
        }
        refreshStatusBadges()
    }
    // Status is pushed over the websocket the Superuser page already has open, so this
    // tab never polls. The list itself is fetched once, when the page loads.
    function onSuperSocketEvent(handler){
        if(typeof onWebSocketEvent === 'function'){
            onWebSocketEvent(handler)
        }else if($.ccio && $.ccio.ws){
            $.ccio.ws.on('f',handler)
        }
    }
    onSuperSocketEvent(function(data){
        if(!data || data.f !== 'failover-status')return
        var failoverServer = data.failoverServer
        if(data.removed){
            delete serverStatuses[failoverServer]
            theList.find(`.server-row[data-server="${failoverServer}"]`).remove()
            return
        }
        serverStatuses[failoverServer] = data.status || {}
        var row = theList.find(`.server-row[data-server="${failoverServer}"]`)
        if(row.length === 0){
            drawServers()
            return
        }
        row.find('.server-status').html(statusBadgeHtml(failoverServer))
    })
    // Only re-renders the "next attempt in ..." countdown from values already in memory.
    setInterval(function(){
        var hasCountdown = Object.keys(serverStatuses).some(function(host){
            return !!(serverStatuses[host] || {}).nextAttemptAt
        })
        if(hasCountdown)refreshStatusBadges()
    },10000)
    theEnclosure.find('.submit').click(function(){
        theForm.submit()
    })
    $('#failoverServersAdd').click(function(){
        theForm.submit()
    })
    theEnclosure.on('click', '.delete', function(){
        var el = $(this).parents('.server-row')
        var failoverServer = el.attr('data-server')
        var peerConnectKey = el.attr('data-peerconnectkey')
        $.confirm.create({
            title: lang["Delete"],
            body: `${lang.DeleteThisMsg}`,
            clickOptions: {
                title: '<i class="fa fa-trash-o"></i> ' + lang.Delete,
                class: 'btn-danger btn-sm'
            },
            clickCallback: async function(){
                const response = await removeServer({ failoverServer, peerConnectKey })
                if(response.ok){
                    el.remove();
                }
            }
        });
    })
    theForm.submit(async function(e){
        e.preventDefault()
        var formValues = $(this).serializeObject()
        var failoverServer = `${formValues.failoverServer || ''}`.trim()
        var peerConnectKey = `${formValues.peerConnectKey || ''}`.trim()
        // Matches what the server enforces, so the user is told which field is wrong.
        if(!failoverServer || (failoverServer.indexOf('://') > -1 && !/^wss?:\/\//.test(failoverServer))){
            new PNotify({ type:'error', title: lang['Failover Servers'], text: lang.failoverBadServerUrl })
            return false
        }
        if(peerConnectKey.length < 5){
            new PNotify({ type:'error', title: lang['Failover Servers'], text: lang.failoverBadPeerKey })
            return false
        }
        var response = await addServer({ failoverServer, peerConnectKey })
        if(response.ok){
            new PNotify({
                type: 'success',
                title: lang['Settings Changed'],
                text: lang.failoverServersSaved,
            })
            drawServerRow(response)
        }else{
            new PNotify({ type:'error', title: lang['Failover Servers'], text: response.msg || lang['Invalid Data'] })
        }
        return false
    })
    onInitSuccess(function(){
        drawServers()
    })
})
