$(document).ready(function(){
    var theEnclosure = $('#centralManagement')
    var theList = $('#centralManagement-list')
    var theForm = theEnclosure.find('form')
    var setupCard = $('#centralManagementSetup')
    var settingsBlock = $('#centralManagementSettings')
    var needsActivationBlock = $('#centralManagementNeedsActivation')
    var canEnableBlock = $('#centralManagementCanEnable')
    var submitBar = theEnclosure.find('.submit').parents('.sticky-bar')
    var serversDrawn = false
    var serverStatuses = {}
    function getStatus(){
        return new Promise((resolve) => {
            $.get(superApiPrefix + $user.sessionKey + '/mgmt/status',function(data){
                resolve(data || {})
            })
        })
    }
    function setEnabled(enable){
        return new Promise((resolve) => {
            $.post(superApiPrefix + $user.sessionKey + '/mgmt/enable',{ enable },function(data){
                resolve(data || {})
            })
        })
    }
    // One place decides what this tab looks like, so activating or enabling can just call
    // it again instead of asking the user to reload the page.
    async function drawTabForStatus(status){
        if(!status)status = await getStatus()
        var isReady = !!status.ready
        settingsBlock.toggleClass('d-none',!isReady).css('display','')
        if(submitBar.length > 0)submitBar.toggleClass('d-none',!isReady).css('display','')
        setupCard.toggleClass('d-none',isReady).css('display','')
        needsActivationBlock.toggleClass('d-none',isReady || !!status.activated).css('display','')
        canEnableBlock.toggleClass('d-none',isReady || !status.activated).css('display','')
        // The server list endpoint only exists once the feature is on, so this waits for
        // that rather than firing on page load and 404ing.
        if(isReady && !serversDrawn){
            serversDrawn = true
            drawServers()
            startCountdownTicker()
        }
        if(!isReady)stopCountdownTicker()
    }
    function getServers(){
        return new Promise((resolve) => {
            $.get(superApiPrefix + $user.sessionKey + '/mgmt/list',function(data){
                serverStatuses = (data || {}).statuses || {}
                resolve((data || {}).mgmtServers)
            })
        })
    }
    // Worker states as reported by the server, spelled out. "retrying" and "failed" are
    // both still reconnecting - the difference is how many attempts have gone by, so the
    // second one reads as "look at this" rather than "wait a moment".
    function statusBadgeHtml(serverIp){
        var info = serverStatuses[serverIp] || {}
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
            var attempts = info.attempts || 0
            // While paused between retry windows, when the next attempt happens is the
            // useful part - otherwise a red badge looks like nothing is being done.
            var nextIn = ''
            if(info.nextAttemptAt){
                var secondsAway = Math.round((new Date(info.nextAttemptAt).getTime() - Date.now()) / 1000)
                if(secondsAway > 0){
                    nextIn = ` - ${lang['Next attempt in'] || 'Next attempt in'} ${secondsAway >= 60 ? `${Math.round(secondsAway / 60)} ${lang['minutes'] || 'minutes'}` : `${secondsAway}s`}`
                }
            }
            detail = `<div><small class="text-muted">${attempts} ${lang['attempts'] || 'attempts'}${nextIn}${info.lastError ? ` - ${info.lastError}` : ''}</small></div>`
        }
        return `<span class="badge ${badgeClass}" title="${info.since ? info.since : ''}">${label}</span>${detail}`
    }
    function refreshStatusBadges(){
        theList.find('.server-row').each(function(){
            var row = $(this)
            row.find('.server-status').html(statusBadgeHtml(row.attr('data-server')))
        })
    }
    // The "next attempt in ..." line counts down between pushes, so it is re-rendered from
    // the values already in memory. No request is made - the status itself only ever
    // changes when the server pushes it.
    var countdownTimer = null
    function startCountdownTicker(){
        clearInterval(countdownTimer)
        countdownTimer = setInterval(function(){
            if(settingsBlock.hasClass('d-none'))return
            var hasCountdown = Object.keys(serverStatuses).some(function(serverIp){
                return !!(serverStatuses[serverIp] || {}).nextAttemptAt
            })
            if(hasCountdown)refreshStatusBadges()
        },10000)
    }
    function stopCountdownTicker(){
        clearInterval(countdownTimer)
        countdownTimer = null
    }
    function addServer({ managementServer, peerConnectKey }){
        return new Promise((resolve) => {
            $.post(superApiPrefix + $user.sessionKey + '/mgmt/save',{
                managementServer,
                peerConnectKey,
            },function(data){
                resolve(data)
            })
        })
    }
    function removeServer({ managementServer, peerConnectKey }){
        return new Promise((resolve) => {
            $.post(superApiPrefix + $user.sessionKey + '/mgmt/disconnect',{
                managementServer,
                peerConnectKey,
            },function(data){
                resolve(data)
            })
        })
    }
    function drawServerRow({ managementServer, peerConnectKey }){
        var notExist = $(`[data-server="${managementServer}"][data-peerconnectkey="${peerConnectKey}"]`).length === 0
        // A blank entry from an older/broken save is still shown, labelled, so that it can
        // be deleted - hiding it would leave it in conf.json with no way to remove it.
        var isBlank = !`${managementServer || ''}`.trim()
        if(notExist)theList.append(`<tr class="server-row" data-server="${managementServer}" data-peerconnectkey="${peerConnectKey}">
            <td>${isBlank ? `<i class="text-muted">${lang.centralManagementBlankEntry}</i>` : managementServer}</td>
            <td>${peerConnectKey}</td>
            <td class="server-status">${statusBadgeHtml(managementServer)}</td>
            <td><a class="btn btn-sm btn-danger delete"><i class="fa fa-trash-o"></i></a></td>
        </tr>`)
    }
    async function drawServers(){
        const list = await getServers()
        for(managementServer in list){
            var peerConnectKey = list[managementServer];
            drawServerRow({ managementServer, peerConnectKey })
        }
        refreshStatusBadges()
    }
    // Status arrives over the same websocket the Superuser page already has open : the
    // server pushes `mgmt-status` to the '$' room whenever a connection changes state.
    // The list is still fetched once when the tab opens, to know what exists at all.
    function onSuperSocketEvent(handler){
        if(typeof onWebSocketEvent === 'function'){
            onWebSocketEvent(handler)
        }else if($.ccio && $.ccio.ws){
            $.ccio.ws.on('f',handler)
        }
    }
    onSuperSocketEvent(function(data){
        if(!data || data.f !== 'mgmt-status')return
        var serverIp = data.serverIp
        if(data.removed){
            delete serverStatuses[serverIp]
            theList.find(`.server-row[data-server="${serverIp}"]`).remove()
            return
        }
        serverStatuses[serverIp] = data.status || {}
        var row = theList.find(`.server-row[data-server="${serverIp}"]`)
        if(row.length === 0){
            // A server added from another browser tab or by the management server itself -
            // the row does not exist here yet, so fetch the list once to pick it up.
            drawServers()
            return
        }
        row.find('.server-status').html(statusBadgeHtml(serverIp))
    })
    theEnclosure.find('.submit').click(function(){
        theForm.submit()
    })
    theEnclosure.on('click', '.delete', function(){
        var el = $(this).parents('.server-row')
        var managementServer = el.attr('data-server')
        var peerConnectKey = el.attr('data-peerconnectkey')
        $.confirm.create({
            title: lang["Delete"],
            body: `${lang.DeleteThisMsg}`,
            clickOptions: {
                title: '<i class="fa fa-trash-o"></i> ' + lang.Delete,
                class: 'btn-danger btn-sm'
            },
            clickCallback: async function(){
                const response = await removeServer({ managementServer, peerConnectKey })
                if(response.ok){
                    el.remove();
                }
            }
        });
    })
    // Same rules the server enforces on /mgmt/save. Checked here too so the user is told
    // which field is wrong instead of getting one generic rejection back.
    var MANAGEMENT_SERVER_PATTERN = /^wss?:\/\/[^\/:\s]+(:\d{1,5})?(\/\S*)?$/
    var MINIMUM_PEER_CONNECT_KEY_LENGTH = 5
    var USUAL_MANAGEMENT_PORT = '8663'
    // Mirrors normalizeManagementServerUrl on the server. Applied to the field itself so
    // the user sees what is about to be saved rather than having it changed behind them.
    function normalizeManagementServerUrl(managementServer){
        var value = `${managementServer || ''}`.trim()
        if(!value || value.indexOf('://') > -1)return value
        return `ws://${value}`
    }
    function getPortFromServerUrl(managementServer){
        var match = /^wss?:\/\/[^\/:\s]+:(\d{1,5})/.exec(managementServer)
        return match ? match[1] : ''
    }
    function notifyError(text){
        new PNotify({
            type: 'error',
            title: lang['Central Management'],
            text: text,
        })
    }
    async function saveServer({ managementServer, peerConnectKey }){
        var response = await addServer({ managementServer, peerConnectKey })
        if(response.ok){
            new PNotify({
                type: 'success',
                title: lang['Settings Changed'],
                text: lang.centralManagementSaved,
            })
            drawServerRow({ managementServer, peerConnectKey })
        }else{
            notifyError(response.msg || lang['Invalid Data'])
        }
    }
    theForm.submit(async function(e){
        e.preventDefault()
        var formValues = $(this).serializeObject()
        var managementServer = normalizeManagementServerUrl(formValues.managementServer)
        var peerConnectKey = `${formValues.peerConnectKey || ''}`.trim()
        // Put the normalized value back in the field, so `127.0.0.1:8663` visibly becomes
        // `ws://127.0.0.1:8663` before anything is saved.
        theForm.find('[name="managementServer"]').val(managementServer)
        // The connection is a websocket, so anything without a ws scheme cannot work.
        if(!MANAGEMENT_SERVER_PATTERN.test(managementServer)){
            notifyError(lang.centralManagementBadServerUrl)
            return false
        }
        if(peerConnectKey.length < MINIMUM_PEER_CONNECT_KEY_LENGTH){
            notifyError(lang.centralManagementBadPeerKey)
            return false
        }
        // A different port is allowed - Management Servers just about always listen on
        // 8663, so an unusual one is far more often a typo than a deliberate choice.
        var port = getPortFromServerUrl(managementServer)
        if(port !== USUAL_MANAGEMENT_PORT){
            $.confirm.create({
                title: lang['Central Management'],
                body: port ? lang.centralManagementUnusualPort.replace('{{port}}',port) : lang.centralManagementNoPort,
                clickOptions: {
                    title: lang['Save Anyway'],
                    class: 'btn-warning btn-sm'
                },
                clickCallback: function(){
                    saveServer({ managementServer, peerConnectKey })
                }
            })
            return false
        }
        await saveServer({ managementServer, peerConnectKey })
        return false
    })
    $('#centralManagementAdd').click(function(){
        theForm.submit()
    })
    $('#centralManagementEnable').click(async function(){
        var button = $(this)
        button.addClass('disabled').html(`<i class="fa fa-spinner fa-pulse"></i> ${lang['Please Wait...']}`)
        var response = await setEnabled(true)
        button.removeClass('disabled').html(`<i class="fa fa-power-off"></i> ${lang['Enable Central Management']}`)
        if(response.ok){
            new PNotify({
                type: 'success',
                title: lang['Central Management'],
                text: lang.centralManagementEnabledText,
            })
            drawTabForStatus({ ready: true, enabled: true, activated: true })
        }else{
            new PNotify({
                type: 'error',
                title: lang['Central Management'],
                text: response.msg || lang.centralManagementNeedsActivation,
            })
            drawTabForStatus()
        }
    })
    $('#centralManagementDisable').click(function(){
        $.confirm.create({
            title: lang['Disable'],
            body: lang.centralManagementDisableText,
            clickOptions: {
                title: lang['Disable'],
                class: 'btn-danger btn-sm'
            },
            clickCallback: async function(){
                var response = await setEnabled(false)
                if(response.ok){
                    // Connections are dropped immediately; the saved servers are left in
                    // conf.json so switching back on restores them.
                    drawTabForStatus({ ready: false, enabled: false, activated: true })
                }
            }
        })
    })
    $('#centralManagementRecheck').click(function(){
        drawTabForStatus()
    })
    onInitSuccess(function(){
        drawTabForStatus()
    })
})
