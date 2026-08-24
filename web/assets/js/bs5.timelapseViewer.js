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
    var preloadSelector = $('#timelapsePreloadFrames')
    var playBackBuffers = timelapseWindow.find('.playBackView img')
    var playBackViewImage = playBackBuffers.eq(0)
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
    var preloadStatusInfo = timelapseWindow.find('.timelapsePreloadStatus')
    var currentPlaylist = {}
    var currentPlaylistArray = []
    var frameSelected = null
    var playIntervalTimer = null
    var canPlay = false;
    // --- Playback clock ---------------------------------------------------------------
    // Frame n of a run is due at anchorTime + n * (1000/fps), measured from the moment Play
    // was pressed. The old loop chained each timer onto the previous image's load event, so
    // the real period was "load time + 1000/fps" and the selected FPS was never what played.
    var playAnchorTime = 0
    var playAnchorNumber = 0
    var playSlot = 0
    // A run this far behind schedule is a backgrounded tab or a stalled machine, not drift.
    // Catching up would dump the whole backlog on screen at once, so the clock restarts.
    var playCatchUpLimitMs = 1000
    // --- Frame cache ------------------------------------------------------------------
    // Frames ahead of the playhead are fetched as blobs so playback never touches the
    // network. Insertion order in the Map is the LRU order - a read moves the entry back to
    // the end. Everything here is dropped, and its object URLs revoked, whenever the monitor
    // or date range changes.
    var frameCache = new Map()
    var frameCacheBytes = 0
    var framesInFlight = new Map()
    var preloadQueue = []
    var preloadWindowFilenames = new Set()
    var lastPreloadCenter = null
    var preloadStatusTimer = null
    var defaultPreloadDepth = 150
    var maxCacheBytes = 300 * 1024 * 1024
    var maxConcurrentLoads = 6
    // Rising each time a frame is painted. A load that finishes after its token is stale
    // missed its slot, and is discarded rather than shown late.
    var paintToken = 0
    var frontBufferIndex = 0
    // Wall-clock bounds the ticks are laid out across. Everything that maps a frame to an
    // x-position on the strip - drawing, click-to-seek, drag selection - goes through these
    // two numbers, so the three always agree.
    var stripStartTime = 0
    var stripEndTime = 0
    // The ticks actually in the DOM, with their positions already parsed. Rebuilt whenever
    // the strip is redrawn, and read every painted frame - so it stays out of the DOM.
    var drawnTicks = []
    var currentTickElement = null
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
            drawnTicks.forEach(function(tick){ tick.element.classList.remove('is-unselected') })
            return
        }
        var lowPercent = Math.min(selectionRange.start,selectionRange.end)
        var highPercent = Math.max(selectionRange.start,selectionRange.end)
        drawnTicks.forEach(function(tick){
            tick.element.classList.toggle('is-unselected',tick.percent < lowPercent || tick.percent > highPercent)
        })
    }
    function drawFrameStrip(){
        drawnTicks = []
        currentTickElement = null
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
        // The drawn ticks are read back once, here, into plain numbers. Finding the current
        // tick used to re-query the DOM and parse an attribute off all 600 of them on every
        // painted frame - unnoticeable at the rate playback used to manage, and the single
        // biggest cost per frame once it actually runs at 60 FPS.
        drawnTicks = Array.prototype.map.call(frameStripTicks[0].children,function(element,n){
            return {
                element: element,
                percent: getFramePercent(drawnFrames[n]),
                filename: drawnFrames[n].filename,
            }
        })
        stripStartLabel.text(moment(stripStartTime).format('YYYY-MM-DD HH:mm:ss'))
        stripEndLabel.text(moment(stripEndTime).format('YYYY-MM-DD HH:mm:ss'))
        markCurrentTick()
        drawSelectionInfo()
    }
    function markCurrentTick(){
        if(currentTickElement){
            currentTickElement.classList.remove('is-current')
            currentTickElement = null
        }
        if(!frameSelected)return;
        var frame = currentPlaylist[frameSelected]
        if(!frame)return;
        var framePercent = getFramePercent(frame)
        frameStripPlayhead.css('left',`${framePercent}%`)
        // The strip only draws a sample of large frame sets, so the current frame often has
        // no tick of its own. Marking the nearest one keeps the highlight from flickering
        // in and out during playback.
        var closestDiff = Infinity
        for(var n = 0;n < drawnTicks.length;n++){
            var tick = drawnTicks[n]
            if(tick.filename === frameSelected){
                currentTickElement = tick.element
                break
            }
            var diff = Math.abs(tick.percent - framePercent)
            if(diff < closestDiff){
                closestDiff = diff
                currentTickElement = tick.element
            }
        }
        if(currentTickElement)currentTickElement.classList.add('is-current');
    }
    function drawTimelapseWindowElements(selectedMonitor,startDate,endDate){
        var dateRange = getSelectedTime(dateSelector)
        if(!startDate)startDate = dateRange.startDate
        if(!endDate)endDate = dateRange.endDate
        if(!selectedMonitor)selectedMonitor = monitorsList.val()
        pauseTimelapse()
        // A new monitor or date range makes every buffered blob dead weight. Dropping them
        // here - and revoking their object URLs - is what keeps a long session from growing
        // a copy of every range the user has looked at.
        clearFrameCache()
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
    // --- Frame cache ------------------------------------------------------------------
    function getPreloadDepth(){
        var value = parseInt(preloadSelector.val(),10)
        if(isNaN(value) || value < 0)value = defaultPreloadDepth;
        return Math.min(2000,value)
    }
    function getCachedFrame(filename){
        var entry = frameCache.get(filename)
        if(!entry)return null;
        // Re-inserting moves the entry to the newest end of the Map, which is the LRU order
        // eviction walks. Touching on read is what keeps the playhead's own frames alive.
        frameCache.delete(filename)
        frameCache.set(filename,entry)
        return entry
    }
    function releaseCachedFrame(filename){
        var entry = frameCache.get(filename)
        if(!entry)return;
        URL.revokeObjectURL(entry.blobUrl)
        frameCacheBytes -= entry.bytes
        frameCache.delete(filename)
    }
    function evictFromCache(){
        if(frameCacheBytes <= maxCacheBytes)return;
        for(var filename of Array.from(frameCache.keys())){
            if(frameCacheBytes <= maxCacheBytes)break;
            // Never evict what the current window is actively holding, or a deep preload on a
            // memory budget it cannot fit would spend the whole run re-fetching itself.
            if(preloadWindowFilenames.has(filename))continue;
            releaseCachedFrame(filename)
        }
    }
    function clearFrameCache(){
        framesInFlight.forEach(function(controller){ controller.abort() })
        framesInFlight.clear()
        frameCache.forEach(function(entry){ URL.revokeObjectURL(entry.blobUrl) })
        frameCache.clear()
        frameCacheBytes = 0
        preloadQueue = []
        preloadWindowFilenames.clear()
        lastPreloadCenter = null
        drawPreloadStatus()
    }
    function fetchFrameToCache(frame){
        if(frameCache.has(frame.filename) || framesInFlight.has(frame.filename))return;
        var controller = new AbortController()
        framesInFlight.set(frame.filename,controller)
        fetch(frame.href,{ signal: controller.signal, credentials: 'same-origin' })
        .then(function(response){
            if(!response.ok)throw new Error(`${response.status}`);
            return response.blob()
        })
        .then(function(blob){
            framesInFlight.delete(frame.filename)
            // A search or monitor change while this was in the air replaces every frame
            // object, so an identity check tells us whether this blob is still wanted.
            if(currentPlaylist[frame.filename] !== frame)return;
            frameCache.set(frame.filename,{ blobUrl: URL.createObjectURL(blob), bytes: blob.size })
            frameCacheBytes += blob.size
            evictFromCache()
            drawPreloadStatus()
            pumpPreloadQueue()
        })
        .catch(function(){
            framesInFlight.delete(frame.filename)
            pumpPreloadQueue()
        })
    }
    function pumpPreloadQueue(){
        while(framesInFlight.size < maxConcurrentLoads && preloadQueue.length > 0){
            // A full cache with nothing evictable means the requested depth is larger than
            // the memory budget allows. Stop pulling rather than thrash blobs in and out.
            if(frameCacheBytes >= maxCacheBytes)break;
            var frame = preloadQueue.shift()
            if(!frame || frameCache.has(frame.filename) || framesInFlight.has(frame.filename))continue;
            fetchFrameToCache(frame)
        }
    }
    function schedulePreload(fromNumber,force){
        var depth = getPreloadDepth()
        if(depth === 0 || currentPlaylistArray.length === 0){
            framesInFlight.forEach(function(controller){ controller.abort() })
            framesInFlight.clear()
            preloadQueue = []
            preloadWindowFilenames.clear()
            lastPreloadCenter = null
            drawPreloadStatus()
            return
        }
        // Rebuilding the window on every painted frame would cost more than the fetching
        // does at 60 FPS. It only moves once the playhead has eaten a quarter of the buffer,
        // or the moment it jumps backwards - a seek needs the window rebuilt around it.
        var slide = Math.max(1,Math.floor(depth / 4))
        var moved = lastPreloadCenter === null ? null : fromNumber - lastPreloadCenter
        if(!force && moved !== null && moved >= 0 && moved < slide)return;
        // A little behind the playhead too, so stepping back on the strip is instant.
        var behind = Math.min(10,Math.floor(depth / 4))
        var start = Math.max(0,fromNumber - behind)
        var end = Math.min(currentPlaylistArray.length - 1,fromNumber + depth)
        preloadWindowFilenames = new Set()
        preloadQueue = []
        for(var n = start;n <= end;n++){
            preloadWindowFilenames.add(currentPlaylistArray[n].filename)
        }
        // Forwards first : that is the order playback is about to ask for them in.
        for(var n = fromNumber;n <= end;n++)preloadQueue.push(currentPlaylistArray[n]);
        for(var n = fromNumber - 1;n >= start;n--)preloadQueue.push(currentPlaylistArray[n]);
        framesInFlight.forEach(function(controller,filename){
            if(!preloadWindowFilenames.has(filename))controller.abort();
        })
        lastPreloadCenter = fromNumber
        evictFromCache()
        pumpPreloadQueue()
        drawPreloadStatus()
    }
    function drawPreloadStatus(){
        // Fetches land in bursts, and this is a status line, not a readout worth a reflow
        // each time one completes.
        if(preloadStatusTimer)return;
        preloadStatusTimer = setTimeout(function(){
            preloadStatusTimer = null
            if(currentPlaylistArray.length === 0 || getPreloadDepth() === 0){
                preloadStatusInfo.text('')
                return
            }
            var ready = 0
            preloadWindowFilenames.forEach(function(filename){
                if(frameCache.has(filename))++ready;
            })
            var megabytes = (frameCacheBytes / 1024 / 1024).toFixed(0)
            preloadStatusInfo.text(`${lang['Buffered']} ${ready} / ${preloadWindowFilenames.size} - ${megabytes} MB`)
        },200)
    }
    // --- Painting ---------------------------------------------------------------------
    function swapPlayBackBuffers(){
        playBackBuffers.eq(frontBufferIndex).addClass('is-back')
        frontBufferIndex = 1 - frontBufferIndex
        playBackBuffers.eq(frontBufferIndex).removeClass('is-back')
    }
    var setPlayBackFrame = function(frame,callback){
        var token = ++paintToken
        if(!frame){
            playBackBuffers.off('load error').each(function(){ this.removeAttribute('src') })
            if(callback)callback();
            return
        }
        var cached = getCachedFrame(frame.filename)
        // Uncached frames are still painted at their scheduled moment, straight from the
        // URL - the clock is never made to wait on one. If it arrives after the next frame
        // has been asked for, its token is stale and the paint is simply dropped, leaving
        // the frame already on screen in place. That dropping is what holds the rate.
        var source = cached ? cached.blobUrl : frame.href
        var backBuffer = playBackBuffers[1 - frontBufferIndex]
        var finish = function(){
            if(token !== paintToken)return;
            swapPlayBackBuffers()
            if(callback)callback();
        }
        if(backBuffer.getAttribute('src') === source && backBuffer.complete && backBuffer.naturalWidth > 0){
            return finish()
        }
        $(backBuffer)
        .off('load error')
        .one('load',finish)
        .one('error',function(){
            if(token !== paintToken)return;
            if(callback)callback()
        })
        backBuffer.src = source
    }
    function showFrame(frame){
        if(!frame)return;
        frameSelected = frame.filename
        markCurrentTick()
        setPlayBackFrame(frame)
        schedulePreload(frame.number)
    }
    function selectFrame(filename){
        var frame = currentPlaylist[filename]
        if(!frame)return;
        showFrame(frame)
    }
    // --- Playback ---------------------------------------------------------------------
    function getPlaybackFps(){
        return Math.max(1,Math.min(60,parseInt(fpsSelector.val(),10) || 10))
    }
    function anchorPlayback(frameNumber){
        playAnchorNumber = frameNumber
        playAnchorTime = Date.now()
        playSlot = 0
    }
    var scheduleNextPlaySlot = function(){
        if(!canPlay)return;
        var frameDuration = 1000 / getPlaybackFps()
        var nextSlot = playSlot + 1
        var target = playAnchorTime + nextSlot * frameDuration
        var now = Date.now()
        if(now - target > playCatchUpLimitMs){
            anchorPlayback(playAnchorNumber + playSlot)
            nextSlot = 1
            target = playAnchorTime + frameDuration
        }
        playSlot = nextSlot
        clearTimeout(playIntervalTimer)
        playIntervalTimer = setTimeout(function(){
            if(!canPlay)return;
            var nextFrame = currentPlaylistArray[playAnchorNumber + playSlot]
            if(!nextFrame)return pauseTimelapse();
            showFrame(nextFrame)
            scheduleNextPlaySlot()
        },Math.max(0,target - now))
    }
    var playTimelapse = function(){
        if(currentPlaylistArray.length === 0)return;
        var startFrame = currentPlaylist[frameSelected] || currentPlaylistArray[0]
        // Restarting from the end would play nothing at all.
        if(!currentPlaylistArray[startFrame.number + 1])startFrame = currentPlaylistArray[0];
        var playPauseText = timelapseWindow.find('.playPauseText')
        canPlay = true
        playPauseText.html(`<i class="fa fa-pause"></i> ${lang.Pause}`)
        anchorPlayback(startFrame.number)
        showFrame(startFrame)
        scheduleNextPlaySlot()
    }
    var destroyTimelapse = function(){
        playBackBuffers.off('load error')
        frameSelected = null
        pauseTimelapse()
        clearFrameCache()
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
            releaseCachedFrame(filename)
            var controller = framesInFlight.get(filename)
            if(controller)controller.abort();
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
        // Every frame after a deletion has been renumbered, so the preload window no longer
        // describes anything real and has to be laid out again from wherever we land.
        lastPreloadCenter = null
        if(!frameSelected && currentPlaylistArray[0]){
            selectFrame(currentPlaylistArray[0].filename)
        }else if(frameSelected && currentPlaylist[frameSelected]){
            schedulePreload(currentPlaylist[frameSelected].number,true)
        }
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
                // Sets are an implementation detail of how the build is chunked. Frames are
                // what the user picked, so that is what the count is quoted against.
                if(stage.framesTotal){
                    return `${lang['Encoding']} ${stage.framesDone} / ${stage.framesTotal} ${lang['Frames']}...`
                }
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
        if(percent === undefined || percent === null)return;
        // Clamping a nonsense number used to turn it into a plausible one - an Infinity from
        // a divide-by-zero on the server read as a finished build. An unusable percent now
        // leaves the bar where it was rather than inventing a position for it.
        var parsed = parseFloat(percent)
        if(!isFinite(parsed))return;
        var rounded = Math.max(0,Math.min(100,parsed)).toFixed(1)
        buildProgressBar.css('width',`${rounded}%`).text(`${rounded}%`)
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
        // Buffered frames make scrubbing the strip instant too, for free.
        var cached = getCachedFrame(frame.filename)
        var source = cached ? cached.blobUrl : frame.href
        if(img.attr('src') !== source)img.attr('src',source);
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
    // Slots are counted off the anchor, so a rate changed mid-run has to re-anchor or the
    // next slot lands somewhere arbitrary relative to the frame on screen.
    fpsSelector.on('change input',function(){
        if(!canPlay)return;
        anchorPlayback(playAnchorNumber + playSlot)
        scheduleNextPlaySlot()
    })
    preloadSelector.on('change',function(){
        var depth = getPreloadDepth()
        preloadSelector.val(depth)
        dashboardOptions('timelapsePreloadFrames',`${depth}`)
        var currentFrame = currentPlaylist[frameSelected]
        schedulePreload(currentFrame ? currentFrame.number : 0,true)
    })
    cancelBuildButton.click(function(){
        requestBuildCancel()
    })
    downloadButton.click(function(){
        if(buildInProgress)return;
        // The FPS box carries its default as a placeholder, not a value, so an untouched box
        // reads back as an empty string. Posting that got as far as ffmpeg, where "-r  -i"
        // made -r swallow the input flag and every segment died immediately.
        var fps = getPlaybackFps()
        fpsSelector.val(fps)
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
            case'timelapse_build_cancel_response':
                if(!isForSelectedMonitor(data))return;
                // A successful cancel already arrives as timelapse_build_cancelled. This only
                // has to deal with a cancel that found nothing to stop - which means the build
                // ended without the dashboard being told, so this bar is stale either way.
                if(!data.cancelResponse || !data.cancelResponse.ok){
                    hideBuildProgress()
                    window.askedForTimelapseVideoBuild = false
                    new PNotify({
                        title: lang['Timelapse Frames Video'],
                        text: (data.cancelResponse || {}).msg || lang['Nothing to Cancel'],
                        type: 'info'
                    });
                }
            break;
            case'timelapse_build_failed':
                if(!isForSelectedMonitor(data))return;
                hideBuildProgress()
                window.askedForTimelapseVideoBuild = false
                new PNotify({
                    title: lang['Timelapse Frames Video'],
                    text: data.msg || lang['Build Failed'],
                    type: 'danger'
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
    // The right depth depends on the machine and on how big this deployment's frames are,
    // so whatever the user settles on is remembered rather than re-tuned every visit.
    var savedPreloadDepth = parseInt(dashboardOptions().timelapsePreloadFrames,10)
    preloadSelector.val(isNaN(savedPreloadDepth) ? defaultPreloadDepth : savedPreloadDepth)
    // Give the FPS box a real value rather than only the placeholder it renders with, so both
    // playback and the build request read a number back out of it from the first moment.
    if(!fpsSelector.val())fpsSelector.val(getPlaybackFps());
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
