var apiBaseUrl = getApiPrefix()
function getTimelapseFrames(monitorId,startDate,endDate,limit){
    return new Promise((resolve,reject) => {
        if(!monitorId || !startDate || !endDate){
            console.log(new Error(`getTimelapseFrames error : Failed to get proper params`))
            resolve([])
            return
        }
        var queryString = [
            'start=' + startDate,
            'end=' + endDate,
            limit === 'noLimit' ? `noLimit=1` : limit ? `limit=${limit}` : `limit=50`
        ]
        var apiURL = apiBaseUrl + '/timelapse/' + $user.ke + '/' + monitorId
        $.getJSON(apiURL + '?' + queryString.join('&'),function(data){
            $.each(data,function(n,fileInfo){
                fileInfo.href = apiURL + '/' + fileInfo.filename.split('T')[0] + '/' + fileInfo.filename
            })
            resolve(data)
        })
    })
}
$(document).ready(function(e){
    //Timelapse JPEG Window
    var timelapseWindow = $('#tab-timelapseViewer')
    var sideLinkListBox = $('#side-menu-link-timelapseViewer ul')
    var dateSelector = $('#timelapsejpeg_date')
    var fpsSelector = $('#timelapseJpegFps')
    var playBackViewImage = timelapseWindow.find('.playBackView img')
    var liveStreamView = timelapseWindow.find('.liveStreamView')
    var monitorsList = timelapseWindow.find('.monitors_list')
    var downloadButton = timelapseWindow.find('.download_mp4')
    var cancelBuildButton = timelapseWindow.find('.cancel_mp4')
    var selectAllBox = timelapseWindow.find('.select-all')
    var frameStrip = timelapseWindow.find('.timelapse-frame-strip')
    var frameStripTicks = timelapseWindow.find('.timelapse-strip-ticks')
    var frameStripSelection = timelapseWindow.find('.timelapse-strip-selection')
    var frameStripPlayhead = timelapseWindow.find('.timelapse-strip-playhead')
    var frameStripPreview = timelapseWindow.find('.timelapse-strip-preview')
    var frameSelectionInfo = timelapseWindow.find('.frameSelectionInfo')
    var stripStartLabel = timelapseWindow.find('.timelapse-strip-start')
    var stripEndLabel = timelapseWindow.find('.timelapse-strip-end')
    var buildProgressBox = timelapseWindow.find('.timelapseBuildProgress')
    var buildProgressStage = buildProgressBox.find('.timelapseBuildStage')
    var buildProgressBar = buildProgressBox.find('.progress-bar')
    var currentPlaylist = {}
    var currentPlaylistArray = []
    var frameSelected = null
    var playIntervalTimer = null
    var canPlay = false;
    // Wall-clock bounds the ticks are laid out across. Everything that maps a frame to an
    // x-position on the strip - drawing, click-to-seek, drag selection - goes through these
    // two numbers, so the three always agree.
    var stripStartTime = 0
    var stripEndTime = 0
    // null means "no range drawn", which is the same thing as every frame being selected.
    var selectionRange = null
    var buildInProgress = false
    var buildIsCancelling = false

    var openTimelapseWindow = function(monitorId,startDate,endDate){
        drawTimelapseWindowElements(monitorId,startDate,endDate)
    }
    loadDateRangePicker(dateSelector,{
        onChange: function(start, end, label) {
            drawTimelapseWindowElements()
        }
    })
    monitorsList.change(function(){
        drawTimelapseWindowElements()
    })
    timelapseWindow.find('.refresh-data').click(function(){
        drawTimelapseWindowElements()
    })
    var getLiveStream = function(){
        var selectedMonitor = monitorsList.val()
        liveStreamView.html(`<iframe src="${apiBaseUrl + '/embed/' + $user.ke + '/' + selectedMonitor + '/jquery|fullscreen'}?host=${location.origin + location.pathname}"></iframe>`)
        liveStreamView.find('iframe').width(playBackViewImage.width())
    }
    function getFrameTime(frame){
        return new Date(frame.time).getTime()
    }
    // Where a frame sits on the strip, as a percentage of the loaded time span. A span of
    // zero (one frame, or several sharing a timestamp) can't be divided, so it centres.
    function getFramePercent(frame){
        var span = stripEndTime - stripStartTime
        if(!span || isNaN(span))return 50;
        return Math.max(0,Math.min(100,(getFrameTime(frame) - stripStartTime) / span * 100))
    }
    function getFramesInRange(range){
        if(!range)return currentPlaylistArray.slice();
        var lowPercent = Math.min(range.start,range.end)
        var highPercent = Math.max(range.start,range.end)
        return currentPlaylistArray.filter(function(frame){
            var percent = getFramePercent(frame)
            return percent >= lowPercent && percent <= highPercent
        })
    }
    function getSelectedRows(){
        return getFramesInRange(selectionRange)
    }
    function drawSelectionInfo(){
        var selectedCount = getSelectedRows().length
        var totalCount = currentPlaylistArray.length
        frameSelectionInfo.text(totalCount === 0 ? '' : `${selectedCount} / ${totalCount} ${lang['Frames Selected']}`)
        selectAllBox.prop('checked',!selectionRange)
        if(selectionRange){
            var lowPercent = Math.min(selectionRange.start,selectionRange.end)
            var highPercent = Math.max(selectionRange.start,selectionRange.end)
            frameStripSelection
                .addClass('is-visible')
                .css({ left: `${lowPercent}%`, width: `${highPercent - lowPercent}%` })
        }else{
            frameStripSelection.removeClass('is-visible')
        }
        markUnselectedTicks()
    }
    function markUnselectedTicks(){
        if(!selectionRange){
            frameStripTicks.find('.timelapse-strip-tick').removeClass('is-unselected')
            return
        }
        var lowPercent = Math.min(selectionRange.start,selectionRange.end)
        var highPercent = Math.max(selectionRange.start,selectionRange.end)
        frameStripTicks.find('.timelapse-strip-tick').each(function(){
            var tick = $(this)
            var percent = parseFloat(tick.attr('data-left')) || 0
            tick.toggleClass('is-unselected',percent < lowPercent || percent > highPercent)
        })
    }
    function drawFrameStrip(){
        if(currentPlaylistArray.length === 0){
            frameStripTicks.html(`<div class="timelapse-strip-empty">${lang['No Data']}</div>`)
            stripStartLabel.text('')
            stripEndLabel.text('')
            drawSelectionInfo()
            return
        }
        // A month of frames is thousands of ticks, most of which land on the same pixel. Only
        // a sample is drawn; seeking, selecting and playback all still run over the full
        // playlist, so nothing is actually out of reach - the strip just stays responsive.
        var maxTicks = 600
        var step = Math.ceil(currentPlaylistArray.length / maxTicks)
        var drawnFrames = step > 1 ? currentPlaylistArray.filter(function(frame,n){
            return n % step === 0 || n === currentPlaylistArray.length - 1
        }) : currentPlaylistArray
        var ticksHtml = ''
        $.each(drawnFrames,function(n,frame){
            var leftPercent = getFramePercent(frame)
            var label = moment(frame.time).format('YYYY-MM-DD HH:mm:ss')
            ticksHtml += `<div class="timelapse-strip-tick"`
                + ` style="left:${leftPercent}%"`
                + ` data-filename="${frame.filename}"`
                + ` data-left="${leftPercent}"`
                + ` data-label="${label}"`
                + ` title="${label}"></div>`
        })
        frameStripTicks.html(ticksHtml)
        stripStartLabel.text(moment(stripStartTime).format('YYYY-MM-DD HH:mm:ss'))
        stripEndLabel.text(moment(stripEndTime).format('YYYY-MM-DD HH:mm:ss'))
        markCurrentTick()
        drawSelectionInfo()
    }
    function markCurrentTick(){
        frameStripTicks.find('.timelapse-strip-tick.is-current').removeClass('is-current')
        if(!frameSelected)return;
        var frame = currentPlaylist[frameSelected]
        if(!frame)return;
        var framePercent = getFramePercent(frame)
        frameStripPlayhead.css('left',`${framePercent}%`)
        var exactTick = frameStripTicks.find(`.timelapse-strip-tick[data-filename="${frameSelected}"]`)
        if(exactTick.length > 0){
            exactTick.addClass('is-current')
            return
        }
        // The strip only draws a sample of large frame sets, so the current frame often has
        // no tick of its own. Marking the nearest one keeps the highlight from flickering
        // in and out during playback.
        var closestTick = null
        var closestDiff = Infinity
        frameStripTicks.find('.timelapse-strip-tick').each(function(){
            var diff = Math.abs((parseFloat(this.getAttribute('data-left')) || 0) - framePercent)
            if(diff < closestDiff){
                closestDiff = diff
                closestTick = this
            }
        })
        if(closestTick)$(closestTick).addClass('is-current');
    }
    function drawTimelapseWindowElements(selectedMonitor,startDate,endDate){
        var dateRange = getSelectedTime(dateSelector)
        if(!startDate)startDate = dateRange.startDate
        if(!endDate)endDate = dateRange.endDate
        if(!selectedMonitor)selectedMonitor = monitorsList.val()
        pauseTimelapse()
        getTimelapseFrames(selectedMonitor,startDate,endDate,'noLimit').then((data) => {
            currentPlaylist = {}
            currentPlaylistArray = []
            selectionRange = null
            frameSelected = null
            if(data && data[0]){
                // The API hands frames back newest-first; the strip and playback both run
                // forward in time.
                currentPlaylistArray = data.reverse()
                $.each(currentPlaylistArray,function(n,fileInfo){
                    fileInfo.number = n
                    currentPlaylist[fileInfo.filename] = fileInfo
                })
                stripStartTime = getFrameTime(currentPlaylistArray[0])
                stripEndTime = getFrameTime(currentPlaylistArray[currentPlaylistArray.length - 1])
                drawFrameStrip()
                selectFrame(currentPlaylistArray[0].filename)
            }else{
                stripStartTime = 0
                stripEndTime = 0
                drawFrameStrip()
                setPlayBackFrame(null)
            }
        })
    }
    var setPlayBackFrame = function(href,callback){
        playBackViewImage
        .off('load').on('load',function(){
            playBackViewImage.off('error')
            if(callback)callback()
        })
        .off('error').on('error',function(){
            if(callback)callback()
        })
        playBackViewImage[0].src = href
    }
    function selectFrame(filename){
        var frame = currentPlaylist[filename]
        if(!frame)return;
        frameSelected = filename
        markCurrentTick()
        setPlayBackFrame(frame.href)
    }
    var startPlayLoop = function(){
        var selectedFrame = currentPlaylist[frameSelected]
        if(!selectedFrame)return pauseTimelapse();
        var selectedFrameNumber = selectedFrame.number
        setPlayBackFrame(selectedFrame.href,function(){
            frameSelected = selectedFrame.filename
            markCurrentTick()
            clearTimeout(playIntervalTimer)
            playIntervalTimer = setTimeout(function(){
                if(!canPlay)return
                ++selectedFrameNumber
                var newSelectedFrame = currentPlaylistArray[selectedFrameNumber]
                if(!newSelectedFrame)return pauseTimelapse();
                frameSelected = newSelectedFrame.filename
                startPlayLoop()
            },1000/(parseInt(fpsSelector.val(),10) || 1))
        })
    }
    var playTimelapse = function(){
        if(currentPlaylistArray.length === 0)return;
        var playPauseText = timelapseWindow.find('.playPauseText')
        canPlay = true
        playPauseText.html(`<i class="fa fa-pause"></i> ${lang.Pause}`)
        startPlayLoop()
    }
    var destroyTimelapse = function(){
        playBackViewImage.off('load')
        frameSelected = null
        pauseTimelapse()
        frameStripTicks.empty()
        setPlayBackFrame(null)
    }
    var pauseTimelapse = function(){
        var playPauseText = timelapseWindow.find('.playPauseText')
        canPlay = false
        playPauseText.html(`<i class="fa fa-play"></i> ${lang.Play}`)
        clearTimeout(playIntervalTimer)
        playIntervalTimer = null
    }
    var togglePlayPause = function(){
        if(canPlay){
            pauseTimelapse()
        }else{
            playTimelapse()
        }
    }
    var iconHtml = function(iconClasses,withSpace){
        if(withSpace === undefined)withSpace = true
        return `<i class="fa fa-${iconClasses}"></i>` + (withSpace ? ' ' : '')
    }
    var setDownloadButtonLabel = function(text,icon){
        downloadButton.html(icon ? iconHtml(icon) + text : text)
    }
    function deleteFrame(frame){
        return new Promise((resolve,reject) => {
            $.getJSON((frame.href || frame) + '/delete',function(response){
                resolve(response)
            })
        })
    }
    async function deleteFrames(frameHrefs, perCallback){
        const responses = []
        for (let i = 0; i < frameHrefs.length; i++) {
            const frameHref = frameHrefs[i]
            const perResponse = await deleteFrame(frameHref)
            perResponse.href = frameHref
            responses.push(perResponse)
        }
        return responses
    }
    function removeFramesFromPlaylist(filenames){
        filenames.forEach(function(filename){
            delete currentPlaylist[filename]
        })
        currentPlaylistArray = currentPlaylistArray.filter(function(frame){
            return filenames.indexOf(frame.filename) === -1
        })
        $.each(currentPlaylistArray,function(n,frame){
            frame.number = n
        })
        if(filenames.indexOf(frameSelected) > -1)frameSelected = null;
        if(currentPlaylistArray.length > 0){
            stripStartTime = getFrameTime(currentPlaylistArray[0])
            stripEndTime = getFrameTime(currentPlaylistArray[currentPlaylistArray.length - 1])
        }
        drawFrameStrip()
        if(!frameSelected && currentPlaylistArray[0])selectFrame(currentPlaylistArray[0].filename);
    }
    function deleteSelectedFrames(){
        var frames = getSelectedRows()
        if(frames.length === 0)return;
        var frameHrefs = frames.map(function(frame){ return frame.href })
        $.confirm.create({
            title: lang['Delete selected'],
            body: `${frames.length} ${lang['Frames Selected']}<br>` + lang.DeleteTheseMsg + `<br><br><img style="max-width:100%" src="${frameHrefs[0]}">`,
            clickOptions: {
                class: 'btn-danger',
                title: lang.Delete,
            },
            clickCallback: async function(){
                const responses = await deleteFrames(frameHrefs)
                const deleted = []
                for(perResponse of responses){
                    if(perResponse.ok){
                        var frame = frames.find(function(theFrame){ return theFrame.href === perResponse.href })
                        if(frame)deleted.push(frame.filename)
                    }
                }
                removeFramesFromPlaylist(deleted)
            }
        })
    }
    // --- Build progress ---------------------------------------------------------------
    // Text for a stage object sent by the server. Stages carry a key plus whatever numbers
    // make them meaningful, so the wording stays on this side and stays translatable.
    function getBuildStageText(stage){
        if(!stage)return `${lang.Building}...`;
        switch(stage.key){
            case'Reading Frames':
                return `${lang['Reading Frames']} (${stage.frames})...`
            case'Preparing':
                return `${lang['Preparing']} ${stage.frames} ${lang['Frames']}...`
            case'Encoding':
                return `${lang['Encoding']} ${stage.set}/${stage.sets}...`
            case'Stitching':
                return `${lang['Stitching']}...`
            case'Saving':
                return `${lang['Saving']}...`
        }
        return `${lang.Building}...`
    }
    function showBuildProgress(stageText,percent){
        buildInProgress = true
        buildProgressBox.removeClass('d-none')
        cancelBuildButton.removeClass('d-none')
        downloadButton.prop('disabled',true).addClass('disabled')
        setBuildProgress(stageText,percent)
    }
    function setBuildProgress(stageText,percent){
        if(buildIsCancelling)return;
        if(stageText !== undefined && stageText !== null)buildProgressStage.text(stageText);
        if(percent !== undefined && percent !== null){
            var rounded = Math.max(0,Math.min(100,parseFloat(percent) || 0)).toFixed(1)
            buildProgressBar.css('width',`${rounded}%`).text(`${rounded}%`)
        }
    }
    function hideBuildProgress(){
        buildInProgress = false
        buildIsCancelling = false
        buildProgressBox.addClass('d-none')
        cancelBuildButton.addClass('d-none')
        downloadButton.prop('disabled',false).removeClass('disabled')
        buildProgressBar.css('width','0%').text('0%')
        buildProgressStage.text('')
        setDownloadButtonLabel(lang['Build Video'], 'database')
    }
    function isForSelectedMonitor(data){
        return `${data.mid}` === `${monitorsList.val()}`
    }
    function requestBuildCancel(){
        if(!buildInProgress)return;
        $.confirm.create({
            title: lang['Cancel'],
            body: lang['cancelTimelapseBuildText'],
            clickOptions: {
                class: 'btn-danger',
                title: lang['Cancel'],
            },
            clickCallback: function(){
                buildIsCancelling = true
                buildProgressStage.text(`${lang['Cancelling']}...`)
                window.askedForTimelapseVideoBuild = false
                mainSocket.f({
                    f: 'timelapseVideoCancel',
                    mid: monitorsList.val(),
                })
            }
        })
    }
    // --- Strip interaction ------------------------------------------------------------
    function getPercentFromEvent(e){
        var rect = frameStrip[0].getBoundingClientRect()
        if(!rect.width)return 0;
        return Math.max(0,Math.min(100,(e.clientX - rect.left) / rect.width * 100))
    }
    function getClosestFrameToPercent(percent){
        var closest = null
        var closestDiff = Infinity
        currentPlaylistArray.forEach(function(frame){
            var diff = Math.abs(getFramePercent(frame) - percent)
            if(diff < closestDiff){
                closestDiff = diff
                closest = frame
            }
        })
        return closest
    }
    var dragStartPercent = null
    var isDraggingStrip = false
    frameStrip.on('mousedown',function(e){
        if(currentPlaylistArray.length === 0)return;
        e.preventDefault()
        dragStartPercent = getPercentFromEvent(e)
        isDraggingStrip = false
    })
    $(document).on('mousemove',function(e){
        if(dragStartPercent === null)return;
        var percent = getPercentFromEvent(e)
        // Anything under a pixel or so of travel is a click, not a range drag.
        if(!isDraggingStrip && Math.abs(percent - dragStartPercent) < 0.5)return;
        isDraggingStrip = true
        selectionRange = { start: dragStartPercent, end: percent }
        drawSelectionInfo()
    })
    .on('mouseup',function(e){
        if(dragStartPercent === null)return;
        var startedAt = dragStartPercent
        dragStartPercent = null
        if(isDraggingStrip){
            isDraggingStrip = false
            // A drag that ended up selecting nothing is more likely a slip than an intent.
            if(getSelectedRows().length === 0){
                selectionRange = null
                drawSelectionInfo()
            }
            return
        }
        pauseTimelapse()
        var frame = getClosestFrameToPercent(startedAt)
        if(frame)selectFrame(frame.filename);
    })
    frameStrip.on('mouseenter','.timelapse-strip-tick',function(){
        var tick = $(this)
        var frame = currentPlaylist[tick.attr('data-filename')]
        if(!frame)return;
        frameStripPreview.find('.timelapse-strip-preview-caption').text(tick.attr('data-label') || '')
        var img = frameStripPreview.find('img')
        if(img.attr('src') !== frame.href)img.attr('src',frame.href);
        frameStripPreview.addClass('is-visible')
        // Clamp inside the strip so the card never runs off either end.
        var stripWidth = frameStrip[0].getBoundingClientRect().width
        var previewWidth = frameStripPreview.outerWidth() || 200
        var centerPx = (parseFloat(tick.attr('data-left')) || 0) / 100 * stripWidth
        frameStripPreview.css('left',`${Math.max(0,Math.min(stripWidth - previewWidth,centerPx - previewWidth / 2))}px`)
    })
    timelapseWindow.on('mouseleave','.timelapse-strip-wrapper',function(){
        frameStripPreview.removeClass('is-visible')
    })
    timelapseWindow
    .on('click','.playPause',function(){
        togglePlayPause()
    })
    .on('click','.delete-selected-frames',function(e){
        deleteSelectedFrames()
    })
    .on('click','.zip-selected-frames',function(e){
        e.preventDefault()
        var frames = getSelectedRows()
        zipVideosAndDownloadWithConfirm(frames)
        return false;
    })
    .on('click','.timelapse_quick_daterange',function(e){
        e.preventDefault()
        var el = $(this)
        var hours = el.attr('data-hours')
        var days = el.attr('data-days')
        var amount = hours ? parseInt(hours) : parseInt(days)
        var unit = hours ? 'hours' : 'days'
        var picker = dateSelector.data('daterangepicker')
        picker.setStartDate(moment().subtract(amount,unit))
        picker.setEndDate(moment())
        drawTimelapseWindowElements()
        return false;
    })
    .on('click','.timelapseBuildCancel',function(e){
        e.preventDefault()
        requestBuildCancel()
        return false;
    })
    selectAllBox.click(function(e){
        selectionRange = null
        drawSelectionInfo()
    });
    cancelBuildButton.click(function(){
        requestBuildCancel()
    })
    downloadButton.click(function(){
        if(buildInProgress)return;
        var fps = fpsSelector.val()
        var selectedMonitor = monitorsList.val()
        window.askedForTimelapseVideoBuild = true
        var parsedFrames = getSelectedRows().map(function(frame){
            return {
                mid: frame.mid,
                ke: frame.ke,
                filename: frame.filename,
            }
        });
        if(parsedFrames.length === 0){
            window.askedForTimelapseVideoBuild = false
            return new PNotify({
                title: lang['Invalid Data'],
                text: lang.notEnoughFramesText1,
                type: 'danger'
            })
        };
        // Shown before the request even leaves the browser - the round trip and the frame
        // lookup behind it are the slowest part of the whole build.
        showBuildProgress(`${lang['Preparing']} ${parsedFrames.length} ${lang['Frames']}...`,0)
        setDownloadButtonLabel(lang.Building, 'spinner fa-pulse')
        mainSocket.f({
            f: 'timelapseVideoBuild',
            mid: selectedMonitor,
            frames: parsedFrames,
            fps: fps,
        })
    })
    function downloadTimelapseFrame(frame){
        downloadFile(frame.href,frame.filename)
    }
    function downloadTimelapseVideo(data){
        var downloadUrl = buildFileBinUrl(data)
        downloadFile(downloadUrl,data.name)
    }
    function onTimelapseVideoBuildComplete(data){
        var saveBuiltVideo = dashboardOptions().switches.timelapseSaveBuiltVideo
        if(saveBuiltVideo === 1){
            new PNotify({
                title: lang['Timelapse Video Build Complete'],
                text: lang.yourFileDownloadedShortly,
                type: 'success',
            })
        }else if(tabTree.name !== 'timelapseViewer'){
            new PNotify({
                title: lang['Timelapse Video Build Complete'],
                text: `${lang['File Download Ready']}.<br><br><a class="btn btn-sm btn-success download-file" href="${buildFileBinUrl(data)}">${lang.Download}</a>`,
                type: 'success',
            })
        }
    }
    function drawTimelapseVideoProgressBar(data){
        var fileBinUrl = buildFileBinUrl(data)
        var html = `<li data-mid="${data.mid}" data-ke="${data.mid}" data-name="${data.name}">
            <div class="text-white cursor-pointer d-flex flex-row" style="align-items: center;justify-content: center;">
                <span class="dot shadow mr-2 dot-orange"></span>
                <div class="row-status">
                    ${lang.Building}...
                </div>
                <div class="flex-grow-1 px-2 pt-1">
                    <div class="progress" style="height:18px">
                        <div class="progress-bar progress-bar-warning" role="progressbar" style="width: ${data.percent}%;">${data.percent}%</div>
                    </div>
                </div>
                <div style="display:none;" class="download-button pr-2">
                    <a class="badge badge-sm badge-success download-file" href="${fileBinUrl}"><i class="fa fa-download"></i></a>
                </div>
                <div style="display:none;" class="download-button pr-2">
                    <a class="badge badge-sm badge-primary open-fileBin-video" href="${fileBinUrl}"><i class="fa fa-play"></i></a>
                </div>
                <div style="display:none;" class="download-button">
                    <a class="badge badge-sm badge-dark remove-row"><i class="fa fa-times"></i></a>
                </div>
            </div>
        </li>`
        sideLinkListBox.append(html)
    }
    onWebSocketEvent(function(data){
        switch(data.f){
            case'timelapse_build_started':
                if(!isForSelectedMonitor(data))return;
                showBuildProgress(`${lang['Reading Frames']} (${data.frames})...`,0)
            break;
            case'timelapse_build_stage':
                if(!isForSelectedMonitor(data))return;
                if(!buildInProgress)showBuildProgress(getBuildStageText(data.stage),data.percent);
                setBuildProgress(getBuildStageText(data.stage),data.percent)
            break;
            case'timelapse_build_cancelled':
                if(!isForSelectedMonitor(data))return;
                hideBuildProgress()
                new PNotify({
                    title: lang['Timelapse Frames Video'],
                    text: data.msg || lang['Build Cancelled'],
                    type: 'info'
                });
            break;
            case'timelapse_build_requested':
                console.log(data)
                var response = data.buildResponse;
                // An accepted build keeps running - only a rejection or an already-built file
                // ends the progress display here.
                if(!response.ok || response.fileExists){
                    if(isForSelectedMonitor(data))hideBuildProgress();
                    setDownloadButtonLabel(response.msg, '')
                    new PNotify({
                        title: lang['Timelapse Frames Video'],
                        text: response.msg,
                        type: response.fileExists ? 'success' : 'info'
                    });
                }
                if(response.fileExists && window.askedForTimelapseVideoBuild)downloadTimelapseVideo(response);
                if(response.fileExists || !response.ok)window.askedForTimelapseVideoBuild = false;
            break;
            case'fileBin_item_added':
                if(data.timelapseVideo){
                    var saveBuiltVideo = dashboardOptions().switches.timelapseSaveBuiltVideo
                    let statusText = `${lang['Done!']}`
                    onTimelapseVideoBuildComplete(data)
                    if(saveBuiltVideo === 1){
                        downloadTimelapseVideo(data)
                        statusText = lang['Downloaded!']
                    }
                    if(isForSelectedMonitor(data))hideBuildProgress();
                    setDownloadButtonLabel(statusText, '')
                    window.askedForTimelapseVideoBuild = false
                    var progressItem = sideLinkListBox.find(`[data-mid="${data.mid}"][data-ke="${data.mid}"][data-name="${data.name}"]`)
                    progressItem.find('.row-status').text(statusText)
                    progressItem.find('.dot').removeClass('dot-orange').addClass('dot-green')
                    progressItem.find('.download-button').show()
                }
            break;
            case'timelapse_build_percent':
                if(isForSelectedMonitor(data))setBuildProgress(null,data.percent);
                var progressItem = sideLinkListBox.find(`[data-mid="${data.mid}"][data-ke="${data.mid}"][data-name="${data.name}"]`)
                if(progressItem.length === 0){
                    drawTimelapseVideoProgressBar(data)
                }else{
                    progressItem.find('.progress-bar').css('width',`${data.percent}%`).text(`${data.percent}%`)
                    progressItem.find('.percent').text(data.percent)
                }
            break;
        }
    })
    $('body')
    .on('click','.open-timelapse-viewer',function(){
        var el = $(this).parents('[data-mid]')
        var monitorId = el.attr('data-mid')
        openTab(`timelapseViewer`,{},null)
        monitorsList.val(monitorId).change()
    });
    sideLinkListBox
    .on('click','.remove-row',function(){
        var el = $(this).parents('[data-mid]')
        el.remove()
    })
    setDownloadButtonLabel(lang['Build Video'], 'database')
    addOnTabOpen('timelapseViewer', function () {
        if(!monitorsList.val()){
            drawMonitorListToSelector(monitorsList)
            drawTimelapseWindowElements()
        }
    })
    addOnTabReopen('timelapseViewer', function () {
        var theSelected = `${monitorsList.val()}`
        drawMonitorListToSelector(monitorsList)
        monitorsList.val(theSelected)
    })
    addOnTabAway('timelapseViewer',function(){
        pauseTimelapse()
    })
})
