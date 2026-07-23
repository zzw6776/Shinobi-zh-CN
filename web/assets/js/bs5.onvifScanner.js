$(document).ready(function(e){
    //onvif probe
    var loadedResults = {}
    var loadedResultsByIp = {}
    var onvifScannerWindow = $('#tab-onvifScanner')
    var onvifScannerResultPane = onvifScannerWindow.find('.onvif_result')
    var onvifScannerProgress = $('#onvifScanner-progress')
    var onvifScannerProgressBar = onvifScannerProgress.find('.progress-bar')
    var onvifScannerProgressText = onvifScannerProgress.find('.progress-text')
    var onvifScannerErrorResultPane = onvifScannerWindow.find('.onvif_result_error')
    var scanForm = onvifScannerWindow.find('form');
    var foundDevicesCount = 0
    var otherDevicesCount = 0
    var foundDevicesCountEl = $(`#onvif-scanner-found-devices-count`)
    var otherDevicesCountEl = $(`#onvif-scanner-other-devices-count`)
    function addCredentialsToUri(uri,username,password){
        let newUri = `${uri}`
        const uriParts = newUri.split('://')
        uriParts[1] = `${username}:${password}@${uriParts[1]}`
        newUri = uriParts.join('://')
        return newUri
    }
    function setAsLoading(appearance){
        if(appearance){
            onvifScannerWindow.find('[type="submit"]').prop('disabled',true)
        }else{
            onvifScannerWindow.find('[type="submit"]').prop('disabled',false)
        }
    }
    function drawProbeResult(options){
        if(!options.error){
            var currentUsername = onvifScannerWindow.find('[name="user"]').val()
            var currentPassword = onvifScannerWindow.find('[name="pass"]').val()
            var tempID = generateId()
            var info = options.info ? jsonToHtmlBlock(options.info) : ''
            var streamUrl = ''
            var launchWebPage = `target="_blank" href="http${options.port == 443 ? 's' : ''}://${options.ip}:${options.port}"`
            if(options.uri){
                streamUrl = options.uri
            }
            var theLocation = getLocationFromUri(options.uri)
            var pathLocation = theLocation.location
            var monitorConfigPartial = {
                name: pathLocation.hostname,
                mid: tempID + `${options.port}`,
                host: pathLocation.hostname,
                port: pathLocation.port,
                path: pathLocation.pathname + (pathLocation.search && pathLocation.search !== '?' ? pathLocation.search : ''),
                protocol: theLocation.protocol,
                details: {
                    auto_host: addCredentialsToUri(streamUrl,currentUsername,currentPassword),
                    muser: currentUsername,
                    mpass: currentPassword,
                    is_onvif: '1',
                    onvif_port: options.port,
                },
            }
            if(options.isPTZ){
                monitorConfigPartial.details = Object.assign(monitorConfigPartial.details,{
                    control: '1',
                    control_url_method: 'ONVIF',
                    control_stop: '1',
                })
            }
            var monitorAlreadyAdded = isOnvifRowAlreadyALoadedMonitor(monitorConfigPartial)
            if(monitorAlreadyAdded){
                monitorConfigPartial.mid = monitorAlreadyAdded.mid;
            }
            var monitorId = monitorConfigPartial.mid
            loadedResults[monitorId] = monitorConfigPartial;
            loadedResultsByIp[monitorConfigPartial.host] = monitorConfigPartial;
            loadedResultsByIp[options.ip] = monitorConfigPartial;
            onvifScannerErrorResultPane.find(`[onvif_error_row="${options.ip}"]`).remove()
            onvifScannerErrorResultPane.find(`[onvif_error_row="${monitorConfigPartial.host}"]`).remove()
            onvifScannerResultPane.append(`
                <div onvif_row="${monitorId}" id="onvif-result-${monitorId}" class="d-flex flex-row">
                    <div class="py-2 px-1"><div class="scan-item-img" style="background-image:url(${options.snapShot ? 'data:image/png;base64,' + options.snapShot : placeholder.getData(placeholder.plcimg({text: ' ', fsize: 25, bgcolor:'#1f80f9'}))})"></div></div>
                    <div class="py-2 px-1" style="min-width:170px"><b>${options.ip}:${options.port}</b></div>
                    <div class="py-2 px-1 flex-grow-1">
                        <div>${info}</div>
                        <div class="url">${streamUrl}</div>
                    </div>
                    <div class="py-2 px-1 text-right text-nowrap">
                        <a ${launchWebPage} class="btn btn-sm btn-secondary"><i class="fa fa-external-link"></i></a>
                        <a class="btn btn-sm btn-success copy"><i class="fa fa-plus"></i> ${lang['Add'] || 'Add'}</a>
                    </div>
                </div>
            `)
            onvifScannerWindow.find('._notfound').remove()
        }else{
            if(!loadedResultsByIp[options.ip]){
                var errorRow = onvifScannerErrorResultPane.find(`[onvif_error_row="${options.ip}"]`)
                if(errorRow.length === 0){
                    var dropdownId = `onvif-error-ports-${options.ip.replace(/\./g,'-')}`
                    onvifScannerErrorResultPane.append(`
                        <div onvif_error_row="${options.ip}" class="d-flex flex-row align-items-center">
                            <div class="py-2 px-1" style="min-width:170px"><b>${options.ip}</b></div>
                            <div class="py-2 px-1 flex-grow-1">
                                <ul class="onvif_error_messages small mb-0" style="padding-left:1.1rem"></ul>
                            </div>
                            <div class="py-2 px-1 text-right">
                                <div class="dropdown">
                                    <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" id="${dropdownId}" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">${lang['Ports'] || 'Ports'}</button>
                                    <ul class="dropdown-menu dropdown-menu-end onvif_error_ports" aria-labelledby="${dropdownId}"></ul>
                                </div>
                            </div>
                        </div>
                    `)
                    errorRow = onvifScannerErrorResultPane.find(`[onvif_error_row="${options.ip}"]`)
                }
                var portsCell = errorRow.find('.onvif_error_ports')
                if(portsCell.find(`[onvif_error_port="${options.port}"]`).length === 0){
                    portsCell.append(`
                        <li><a target="_blank" onvif_error_port="${options.port}" class="dropdown-item" href="http://${options.ip}:${options.port}">${options.port} <i class="fa fa-external-link"></i></a></li>
                    `)
                }
                var messagesList = errorRow.find('.onvif_error_messages')
                var errorText = `${options.error}`
                var alreadyListed = false
                messagesList.find('li').each(function(){
                    if($(this).text() === errorText)alreadyListed = true
                })
                if(!alreadyListed){
                    messagesList.append(`<li>${errorText}</li>`)
                }
            }
        }
    }
    function isOnvifRowAlreadyALoadedMonitor(onvifRow){
        var matches = null;
        $.each(loadedMonitors,function(n,monitor){
            if(monitor.host === onvifRow.host){
                matches = monitor
            }
        })
        return matches;
    }
    var filterOutMonitorsThatAreAlreadyAdded = function(listOfCameras,callback){
        $.getJSON(getApiPrefix(`monitor`),function(monitors){
            var monitorsNotExisting = []
            $.each(listOfCameras,function(n,camera){
                var matches = false
                $.each(monitors,function(m,monitor){
                    if(monitor.host === camera.host){
                        matches = true
                    }
                })
                if(!matches){
                    monitorsNotExisting.push(camera)
                }
            })
            callback(monitorsNotExisting)
        })
    }
    var getLocationFromUri = function(uri){
        var newString = uri.split('://')
        var protocol = `${newString[0]}`
        newString[0] = 'http'
        newString = newString.join('://')
        var uriLocation = new URL(newString)
        // uriLocation.protocol = protocol
        return {
            location: uriLocation,
            protocol: protocol
        }
    }
    var postMonitor = function(monitorToPost){
        var newMon = mergeDeep(generateDefaultMonitorSettings(),monitorToPost)
        $.post(getApiPrefix(`configureMonitor`) + '/' + monitorToPost.mid,{data:JSON.stringify(newMon,null,3)},function(d){
            debugLog(d)
        }).fail(function(xhr, status, error) {
            console.error(error)
        });
    }
    function loadLocalOptions(){
        var currentOptions = dashboardOptions()
        $.each(['ip','port','user'],function(n,key){
            onvifScannerWindow.find(`[name="${key}"]`).change(function(e){
                var value = $(this).val()
                dashboardOptions(`onvif_probe_${key}`,value,{x: value ? null : 0})
            })
            if(currentOptions[`onvif_probe_${key}`]){
                onvifScannerWindow.find(`[name="${key}"]`).val(currentOptions[`onvif_probe_${key}`])
            }
        })
    }
    function showButtons(runType){
        onvifScannerWindow.find(`.view-running,.view-idle,.view-paused`).hide()
        onvifScannerWindow.find(`.view-${runType}`).show()
    }
    function isMonitorAddedToServer(d){
        var theLocation = getLocationFromUri(d.uri)
        var pathLocation = theLocation.location
        var host = pathLocation.hostname
        var path = pathLocation.pathname + (pathLocation.search && pathLocation.search !== '?' ? pathLocation.search : '')
        var foundMonitor = Object.values(loadedMonitors).findIndex(monitor => {
            return monitor.host === host && monitor.path === path
        });
        return foundMonitor > -1
    }
    function drawProbeResultChecked(d){
        var drawTheRow = true
        if(!d.error){
            drawTheRow = !isMonitorAddedToServer(d)
            if(drawTheRow){
                foundDevicesCount += 1
                foundDevicesCountEl.text(foundDevicesCount)
            }
        }else{
            if(`${d.error}`.indexOf('ECONNREFUSED') > -1){
                return
            }
        }
        if(drawTheRow)drawProbeResult(d)
        otherDevicesCount = onvifScannerErrorResultPane.find('[onvif_error_row]').length
        otherDevicesCountEl.text(otherDevicesCount)
    }
    scanForm.submit(function(e){
        e.preventDefault();
        loadedResults = {}
        loadedResultsByIp = {}
        var el = $(this)
        var form = el.serializeObject();
        onvifScannerResultPane.empty();
        onvifScannerErrorResultPane.empty();
        foundDevicesCount = 0
        otherDevicesCount = 0
        mainSocket.f({
            f: 'onvif',
            ip: form.ip,
            port: form.port,
            user: form.user,
            pass: form.pass
        });
        return false;
    });
    onvifScannerWindow.on('click','.copy',function(){
        openMonitorEditorPage()
        var el = $(this).parents('[onvif_row]');
        var id = el.attr('onvif_row');
        var onvifRecord = loadedResults[id];
        var streamURL = onvifRecord.details.auto_host
        writeToMonitorSettingsWindow(onvifRecord)
    })
    onvifScannerWindow.on('click','.add-all',function(){
        filterOutMonitorsThatAreAlreadyAdded(loadedResults,function(importableCameras){
            $.each(importableCameras,function(n,camera){
                // console.log(camera)
                postMonitor(camera)
            })
        })
    })
    onvifScannerWindow.on('click','.scan-pause',function(){
        mainSocket.f({ f: 'onvif_scan_pause' })
    })
    onvifScannerWindow.on('click','.scan-resume',function(){
        mainSocket.f({ f: 'onvif_scan_resume' })
    })
    onvifScannerWindow.on('click','.scan-cancel',function(){
        mainSocket.f({ f: 'onvif_scan_cancel' })
    })
    loadLocalOptions()
    addOnTabOpen('onvifScanner', function(){
        mainSocket.f({ f: 'onvif_scan_status' })
    })
    onWebSocketEvent(function (d){
        switch(d.f){
            case'onvif':
                drawProbeResultChecked(d)
            break;
            case'onvif_scan_progress':
                onvifScannerProgressBar.css('width',`${d.percent}%`)
                onvifScannerProgressText.text(`${d.processedItems} / ${d.totalItems}, ${d.percent}%`)
            break;
            case'onvif_scan_status':
                if(d.active){
                    setAsLoading(true)
                    showButtons('running')
                    d.found.forEach((result) => {
                        drawProbeResultChecked(result)
                    })
                }else{
                    showButtons('idle')
                }
            break;
            case'onvif_scan_started':
                setAsLoading(true)
                showButtons('running')
            break;
            case'onvif_scan_ended':
                setAsLoading(false)
                showButtons('idle')
                if(d.foundNumber === 0)onvifScannerResultPane.append(`<div class="p-2 text-center _notfound text-white epic-text">${lang.sorryNothingWasFound}</div>`)
                new PNotify({
                    title: lang['ONVIF Scanner'],
                    text: lang['Scan Complete'],
                    type: 'success'
                });
            break;
            case'onvif_scan_resume':
                showButtons('running')
            break;
            case'onvif_scan_pause':
                showButtons('paused')
            break;
            case'onvif_scan_cancel':
                showButtons('idle')
            break;
        }
    })
    addOnTabOpen('onvifScanner', () => {
        mainSocket.f({ f: 'onvif_scan_status' })
    })
})
