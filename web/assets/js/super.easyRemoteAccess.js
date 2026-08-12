$(document).ready(function(){
    var easyRemoteAccessTab = $('#easyRemoteAccess')
    var toggleAffected = easyRemoteAccessTab.find('.p2p-toggle-affected')
    var p2pEnabledSwitch = easyRemoteAccessTab.find('[name="p2pEnabled"]')
    var p2pHostSelectedContainer = $('#p2pHostSelected')
    var easyRemoteAccessForm = easyRemoteAccessTab.find('form')
    var remoteDashboardLinkButton = easyRemoteAccessTab.find('.remote-dashboard-link')
    var loadingRegistration = false
    var statusConnections = {}
    var loadingElement = easyRemoteAccessTab.find('#p2pServerListLoading')
    var emptyElement = easyRemoteAccessTab.find('#p2pServerListEmpty')
    var serverTable = easyRemoteAccessTab.find('#p2pServerTable')
    var serverTableBody = serverTable.find('tbody')
    function copyToClipboard(str) {
        const el = document.createElement('textarea');
        el.value = str;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    };
    // Servers are probed, not monitored. We open the stats socket only long enough to learn
    // whether it answers, then drop it -- a server that does not connect within the timeout is
    // treated as offline and left out of the list entirely.
    var ONLINE_CHECK_TIMEOUT_MS = 10000
    function checkServerOnline(key,server){
        return new Promise(function(resolve){
            var chartPort = server.v2 ? server.chartPort || parseInt(server.webPort) + 2 : server.p2pPort
            var socketConnection = null
            var settled = false
            function finish(isOnline){
                if(settled)return;
                settled = true
                clearTimeout(timer)
                try{
                    if(socketConnection)socketConnection.disconnect()
                }catch(err){}
                delete statusConnections[key]
                resolve(isOnline)
            }
            var timer = setTimeout(function(){
                finish(false)
            },ONLINE_CHECK_TIMEOUT_MS)
            try{
                socketConnection = io(`wss://${server.host}:${chartPort == 80 ? 443 : chartPort}`,{
                    transports: ['websocket'],
                    query: {
                        charts: '1'
                    },
                    // No retrying: a server that did not answer is simply reported offline,
                    // and retries would keep a socket alive to a host we are dropping anyway.
                    reconnection: false,
                    reconnect: false,
                })
            }catch(err){
                finish(false)
                return
            }
            statusConnections[key] = socketConnection
            socketConnection.on('connect',function(){ finish(true) })
            socketConnection.on('connect_error',function(){ finish(false) })
            socketConnection.on('connect_timeout',function(){ finish(false) })
            socketConnection.on('error',function(){ finish(false) })
        })
    }
    function serversToCheck(){
        var list = []
        $.each(p2pServerList,function(key,server){
            server.key = key
            if(window.useBetterP2P && !server.v2)return;
            if(!window.useBetterP2P && server.v2)return;
            list.push({ key: key, server: server })
        })
        return list
    }
    // What the server currently has saved. Rows selected on top of this are pending until
    // Save is pressed, which is what the highlight below communicates.
    var savedSelection = (function(){
        if(window.multipleSelected)return (window.selectedServers || []).slice()
        return window.p2pHostSelected ? [window.p2pHostSelected] : []
    })()
    function isServerSelected(key){
        return savedSelection.indexOf(key) > -1
    }
    // Connect/Disconnect label and the pending highlight both follow the row's state.
    function refreshRowState(rowElement){
        var key = rowElement.attr('drawn-id')
        var isActive = rowElement.hasClass('active')
        var isPending = isActive !== (savedSelection.indexOf(key) > -1)
        rowElement.toggleClass('pending',isPending)
        var button = rowElement.find('.activate-remote-selection')
        button.html(isActive
            ? `<i class="fa fa-times"></i> ${lang['Disconnect']}`
            : `<i class="fa fa-check"></i> ${lang['Connect']}`)
    }
    function refreshAllRowStates(){
        serverTableBody.find('[drawn-id]').each(function(){
            refreshRowState($(this))
        })
    }
    function drawServerRows(onlineservers){
        var html = ''
        onlineservers.forEach(function({ key, server }){
            var speed = server.maxNetworkSpeed || {}
            html += `<tr drawn-id="${key}" class="${isServerSelected(key) ? 'active' : ''}">
                <td>
                    <span class="badge badge-sm badge-info name-badge">${`${server.name}`.toUpperCase()}</span>
                    <span class="badge badge-sm badge-danger selected-badge">${lang.Selected}</span>
                </td>
                <td><span class="info-badge badge badge-sm badge-default">${server.host}</span></td>
                <td><i class="fa fa-download"></i> ${speed.down || ''}</td>
                <td><i class="fa fa-upload"></i> ${speed.up || ''}</td>
                <td class="text-right" style="white-space:nowrap">
                    <a href="#" class="btn btn-sm btn-default activate-remote-selection"></a>
                    <a href="#" class="btn btn-sm btn-default remote-dashboard-link-copy"><i class="fa fa-copy"></i> ${lang['Copy Remote Link']}</a>
                    <a href="#" target="_blank" class="btn btn-sm btn-info remote-dashboard-link"><i class="fa fa-external-link"></i> ${lang['Open Remote Dashboard']}</a>
                </td>
            </tr>`
        })
        serverTableBody.html(html)
        refreshAllRowStates()
        loadingElement.hide()
        if(onlineservers.length > 0){
            serverTable.show()
            emptyElement.hide()
        }else{
            serverTable.hide()
            emptyElement.show()
        }
    }
    var checkInProgress = false
    function checkAllServersThenDraw(){
        if(checkInProgress)return;
        checkInProgress = true
        // Nothing is drawn until every server has reported, so the list does not shuffle
        // about as slower servers answer.
        loadingElement.show()
        serverTable.hide()
        emptyElement.hide()
        serverTableBody.empty()
        var toCheck = serversToCheck()
        Promise.all(toCheck.map(function(entry){
            return checkServerOnline(entry.key,entry.server).then(function(isOnline){
                return isOnline ? entry : null
            })
        })).then(function(results){
            checkInProgress = false
            // The tab may have been left while the checks were running.
            if(!tabIsOpen)return;
            drawServerRows(results.filter(function(entry){ return !!entry }))
        }).catch(function(err){
            checkInProgress = false
            console.log(err)
            drawServerRows([])
        })
    }
    function disableForm(){
        loadingRegistration = true
        easyRemoteAccessTab.find('.remote-dashboard-link').html(`<i class="fa fa-spinner fa-pulse"></i>`)
        easyRemoteAccessTab.find('.remote-dashboard-link-copy').html(`<i class="fa fa-spinner fa-pulse"></i>`)
    }
    function enableForm(){
        loadingRegistration = false
        easyRemoteAccessTab.find('.remote-dashboard-link').html(`<i class="fa fa-external-link"></i> ` + lang['Open Remote Dashboard'])
        easyRemoteAccessTab.find('.remote-dashboard-link-copy').html(`<i class="fa fa-copy"></i> ` + lang['Copy Remote Link'])
    }
    function makeHostLink(selectedServer,apiKey){
        var href = `https://${selectedServer.host}:${selectedServer.webPort == 80 ? 443 : selectedServer.webPort}/s/${apiKey}/`
        return href
    }
    function closeAllStatusConnections(){
        $.each(statusConnections,function(key,server){
            try{
                server.disconnect()
            }catch(err){}
            delete(statusConnections[key])
        })
    }
    // Each listed P2P server gets its own websocket that streams stats continuously, so they
    // are only held open while someone is actually looking at this tab. Being switched on is
    // not enough on its own -- this block is part of the page whether or not the tab is
    // showing, so without this the sockets opened at load and stayed open for the session.
    var tabIsOpen = false
    function refreshStatusConnections(){
        var isOn = p2pEnabledSwitch.val() === '1'
        if(isOn && tabIsOpen){
            checkAllServersThenDraw()
        }else{
            closeAllStatusConnections()
        }
    }
    function setVisibilityForList(){
        var isOn = p2pEnabledSwitch.val() === '1'
        if(isOn){
            toggleAffected.show()
        }else{
            toggleAffected.hide()
        }
        refreshStatusConnections()
    }
    // The tab engine is shared by the dashboard and the Superuser panel, and the tab is named
    // the same on both, so one set of hooks covers each.
    if(typeof addOnTabOpen === 'function'){
        var onEasyRemoteAccessShown = function(){
            tabIsOpen = true
            refreshStatusConnections()
        }
        var onEasyRemoteAccessHidden = function(){
            tabIsOpen = false
            closeAllStatusConnections()
        }
        addOnTabOpen('easyRemoteAccess',onEasyRemoteAccessShown)
        addOnTabReopen('easyRemoteAccess',onEasyRemoteAccessShown)
        addOnTabAway('easyRemoteAccess',onEasyRemoteAccessHidden)
        addOnTabClose('easyRemoteAccess',onEasyRemoteAccessHidden)
    }else{
        // No tab engine on this page: keep the old behaviour rather than never connecting.
        tabIsOpen = true
    }
    function getSelectedServers(){
        var theArray = [];
        $(`[drawn-id].active`).each(function(){
            var theKey = $(this).attr('drawn-id')
            theArray.push(theKey)
        })
        return theArray
    }
    p2pEnabledSwitch.change(setVisibilityForList)
    easyRemoteAccessTab.find('.submit').click(function(){
        easyRemoteAccessForm.submit()
    })
    easyRemoteAccessForm.submit(function(e){
        e.preventDefault()
        var formValues = $(this).serializeObject()
        disableForm()
        // formValues.p2pHostSelected = currentlySelectedP2PServerId
        formValues.p2pHostMultiSelected = getSelectedServers()
        console.log(formValues)
        $.post(remoteAccessApiPrefix + '/save',{
            data: JSON.stringify(formValues)
        },function(data){
            console.log(data)
            if(data.ok){
                // What was pending is now what the server has, so clear the highlight.
                savedSelection = formValues.p2pHostMultiSelected.slice()
                refreshAllRowStates()
                new PNotify({
                    type: 'success',
                    title: lang['P2P Settings Applied'],
                    text: lang.p2pSettingsText1,
                })
                setTimeout(enableForm,5000)
            }
        })
        return false
    })
    easyRemoteAccessTab.on('click','.activate-remote-selection',function(e){
        e.preventDefault()
        var el = $(this)
        var parent = el.parents('[drawn-id]')
        var drawnId = parent.attr('drawn-id')
        var alreadyActive = parent.hasClass('active')
        var selectedServer = p2pServerList[drawnId]
        var isWss = selectedServer.p2pPort == 443
        console.log(selectedServer)
        if(alreadyActive){
            parent.removeClass('active')
            refreshRowState(parent)
        }else{
            parent.addClass('active')
            refreshRowState(parent)
            // Selecting one of an ssl/non-ssl pair drops the other, so that row has to be
            // brought back in step too.
            const drawnIdToDisable = isWss ? drawnId.replace('-ssl','') : `${drawnId}-ssl`
            var counterpart = easyRemoteAccessTab.find(`[drawn-id="${drawnIdToDisable}"]`)
            if(counterpart.length > 0){
                counterpart.removeClass('active')
                refreshRowState(counterpart)
            }
        }
        return false;
    })
    easyRemoteAccessTab.on('click','.remote-dashboard-link-copy',function(e){
        e.preventDefault()
        if(!loadingRegistration){
            var parent = $(this).parents('[drawn-id]')
            var drawnId = parent.attr('drawn-id')
            var apiKey = easyRemoteAccessForm.find('[name="p2pApiKey"]').val()
            var selectedServer = p2pServerList[drawnId]
            if(parent.hasClass('active') && selectedServer && selectedServer.host){
                var href = makeHostLink(selectedServer,apiKey)
                copyToClipboard(href)
                new PNotify({
                    type: 'success',
                    title: lang['Copied to Clipboard'],
                    text: `<div style="word-break: break-all;">${href}</div>`,
                })
            }else{
                new PNotify({
                    type: 'warning',
                    title: lang['P2P Server Not Selected'],
                    text: lang.p2pServerNotSelectedText,
                })
            }
        }
        e.stopPropagation()
        return false;
    })
    easyRemoteAccessTab.on('click','.remote-dashboard-link',function(e){
        e.preventDefault()
        if(!loadingRegistration){
            var parent = $(this).parents('[drawn-id]')
            var drawnId = parent.attr('drawn-id')
            var apiKey = easyRemoteAccessForm.find('[name="p2pApiKey"]').val()
            var selectedServer = p2pServerList[drawnId]
            console.log(selectedServer,parent.hasClass('active'),parent.length)
            if(parent.hasClass('active') && selectedServer && selectedServer.host){
                var href = makeHostLink(selectedServer,apiKey)
                window.open(href, '_blank').focus();
            }
        }
        e.stopPropagation()
        return false;
    })
    setVisibilityForList()
})
