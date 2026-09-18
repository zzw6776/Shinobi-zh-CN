$(document).ready(function(){
    var theBlock = $('#tab-videoPlayer')
    window.getVideoPlayerTabId = function(video){
        return `videoPlayer-${video.mid}-${moment(video.time).format('YYYY-MM-DD-HH-mm-ss')}`
    }
    //Minimal escaping for values interpolated into tick attributes (tags are user/plugin data).
    function escapeAttrVideoPlayer(value){
        if(value === undefined || value === null)return ''
        return (`${value}`)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;')
    }
    function getVideoPlayerEventTagText(theEvent){
        var objectsFound = {}
        $.each((theEvent.details || {}).matrices || [],function(n,matrix){
            if(!matrix.tag)return;
            if(!objectsFound[matrix.tag])objectsFound[matrix.tag] = 0
            ++objectsFound[matrix.tag]
        })
        var parts = Object.keys(objectsFound).map(function(tag){ return `${tag} : ${objectsFound[tag]}` })
        if(parts.length === 0 && (theEvent.details || {}).reason)parts.push(`${theEvent.details.reason}`)
        return parts.join(', ')
    }
    // Yellow event ticks for the strip under the video - same visual language as the bar on
    // the recentVideos cards (.video-time-strip / .video-time-needle-event). Ticks are placed
    // as a percentage of the video's wall-clock span, which is also the basis the click-to-seek
    // and the playhead use, so all three stay in one coordinate system.
    // Also (re)fills `loadedEvents`, which ontimeupdate reads to draw detection matrices.
    function buildVideoPlayerEventStripHtml(video,theEvents,loadedEvents){
        var ticksHtml = ``
        if(!(theEvents instanceof Array) || theEvents.length === 0)return ticksHtml;
        $.each(theEvents,function(n,theEvent){
            loadedEvents[new Date(theEvent.time)] = theEvent
            var leftPercent = getPercentOfTimePositionFromVideo(video,theEvent)
            if(isNaN(leftPercent) || leftPercent < 0 || leftPercent > 100)return;
            var secondsIn = (new Date(theEvent.time).getTime() - new Date(video.time).getTime()) / 1000
            var tagText = getVideoPlayerEventTagText(theEvent)
            var label = `${formattedTime(theEvent.time)}${tagText ? ` - ${tagText}` : ''}`
            ticksHtml += `<div class="video-time-needle video-time-needle-event tab-videoPlayer-strip-tick"`
                + ` style="left:${leftPercent}%"`
                + ` data-time="${escapeAttrVideoPlayer(theEvent.time)}"`
                + ` data-seconds="${secondsIn}"`
                + ` data-left="${leftPercent}"`
                + ` data-label="${escapeAttrVideoPlayer(label)}"`
                + ` title="${escapeAttrVideoPlayer(label)}"></div>`
        })
        return ticksHtml
    }
    // Timelapse frames spanning the video, used for the hover preview above each tick.
    async function loadVideoPlayerPreviewFrames(video,theTab){
        if(!video || !video.mid || !video.time || !video.end)return;
        try{
            var frames = await getTimelapseFrames(
                video.mid,
                formattedTimeForFilename(convertTZ(video.time),false),
                formattedTimeForFilename(convertTZ(video.end),false),
                'noLimit'
            )
            if(!(frames instanceof Array))return;
            theTab.data('videoPlayerPreviewFrames',frames)
        }catch(err){
            console.error('loadVideoPlayerPreviewFrames',err)
        }
    }
    function findClosestPreviewFrame(frames,targetTime){
        if(!(frames instanceof Array) || frames.length === 0)return null;
        var target = new Date(targetTime).getTime()
        var closest = null
        var closestDiff = Infinity
        frames.forEach(function(frame){
            var diff = Math.abs(new Date(frame.time).getTime() - target)
            if(diff < closestDiff){
                closestDiff = diff
                closest = frame
            }
        })
        return closest
    }
    // The event list handed over on `video.events` comes from the bulk request behind the
    // Videos list, which is capped (eventLimit, default 300) and ordered newest-first. As
    // new events accumulate, an older video's events fall out of that window and its tag
    // list renders empty - minutes after the recording was saved, even though the rows are
    // still in the database. Re-fetch scoped to just this video's own time range so the
    // list stays correct no matter how many events the system has produced since.
    async function refreshVideoPlayerEvents(video,theTab,loadedEvents){
        if(!video || !video.mid || !video.time || !video.end)return;
        try{
            var theEvents = await getEvents({
                monitorId: video.mid,
                startDate: convertTZ(video.time),
                endDate: convertTZ(video.end),
                limit: 5000,
            })
            if(!(theEvents instanceof Array))return;
            Object.keys(loadedEvents).forEach(function(key){ delete loadedEvents[key] })
            theTab.find('.tab-videoPlayer-strip-ticks').html(
                buildVideoPlayerEventStripHtml(video,theEvents,loadedEvents)
            )
        }catch(err){
            console.error('refreshVideoPlayerEvents',err)
        }
    }
    window.createVideoPlayerTab = function(video,timeInward){
        var newTabId = getVideoPlayerTabId(video)
        var humanStartTime = formattedTime(video.time,true)
        var humanEndTime = formattedTime(video.end,true)
        var tabLabel = `<b>${lang['Video']}</b> : ${loadedMonitors[video.mid] ? loadedMonitors[video.mid].name : lang['Monitor or Key does not exist.']} : <span title="${formattedTime(video.time)}">${timeAgo(video.time)}</span>`
        var videoUrl = getLocation() + video.href
        // Reuse the existing tab's map on reopen so the already-attached ontimeupdate
        // handler keeps pointing at the object refreshVideoPlayerEvents() updates.
        var existingTab = $(`#tab-${newTabId}`)
        var loadedEvents = (existingTab.length > 0 && existingTab.data('videoPlayerLoadedEvents')) || {}
        // Render whatever came with the video immediately, then correct it from the
        // scoped fetch below.
        var eventMatrixHtml = buildVideoPlayerEventStripHtml(video,video.events,loadedEvents)
        var videoRangeMs = new Date(video.end).getTime() - new Date(video.time).getTime()
        var baseHtml = `<main class="pt-3 page-tab tab-videoPlayer" id="tab-${newTabId}" video-id="${video.mid}${video.time}${video.type}" data-time="${video.time}" data-mid="${video.mid}" data-ke="${video.ke}" data-type="${video.type}">
            <div class="tab-videoPlayer-view-container">
                <div class="tab-videoPlayer-video-box mb-2">
                    <video class="tab-videoPlayer-video-element" controls autoplay src="${videoUrl}"></video>
                    <div class="tab-videoPlayer-event-objects"></div>
                </div>
                <div class="tab-videoPlayer-strip-wrapper">
                    <div class="video-time-strip tab-videoPlayer-event-strip mb-3" data-range-ms="${videoRangeMs}" title="${lang['Click to seek'] || 'Click to seek'}">
                        <div class="tab-videoPlayer-strip-ticks">${eventMatrixHtml}</div>
                        <div class="video-time-needle tab-videoPlayer-strip-playhead" style="left:0%"></div>
                    </div>
                    <div class="tab-videoPlayer-strip-preview">
                        <img alt="">
                        <div class="tab-videoPlayer-strip-preview-caption"></div>
                    </div>
                </div>
                <div class="row m-0 ">
                      <div class="col ps-0"><a class="btn btn-sm btn-success d-block" download href="${videoUrl}"><i class="fa fa-download"></i> ${lang.Download}</a></div>
                      ${permissionCheck('video_delete',video.mid) ? `<div class="col"><a class="btn btn-sm btn-danger delete-video d-block"><i class="fa fa-trash-o"></i> ${lang.Delete}</a></div>` : ''}
                      ${permissionCheck('video_delete',video.mid) ? `<div class="col"><a class="btn btn-sm btn-${video.archive === 1 ? `success status-archived` : `default`} archive-video d-block" title="${lang.Archive}"><i class="fa fa-${video.archive === 1 ? `lock` : `unlock-alt`}"></i> ${lang.Archive}</a></div>` : ''}
                      <div class="col">
                          <div class="dropdown">
                              <a class="btn btn-sm btn-primary dropdown-toggle dropdown-toggle-split d-block" data-bs-toggle="dropdown" aria-expanded="false" data-bs-reference="parent">
                                <i class="fa fa-ellipsis-v" aria-hidden="true"></i>
                              </a>
                              <ul class="dropdown-menu ${definitions.Theme.isDark ? 'dropdown-menu-dark bg-dark' : ''} shadow-lg">
                                  ${buildDefaultVideoMenuItems(video,{
                                      play: false
                                  })}
                              </ul>
                          </div>
                      </div>
                      <div class="col pe-0"><a class="btn btn-sm btn-default delete-tab-dynamic d-block"><i class="fa fa-times"></i> ${lang.Close}</a></div>
                </div>
            </div>
            <div class="my-3 ${definitions.Theme.isDark ? 'bg-dark text-white' : 'bg-light text-dark'} card">
                <div class="card-body">
                      <div class="row m-0 mb-2">
                          <div class="col-md-12 text-center">
                              <h5 class="video-title mb-0">${tabLabel}</h5>
                          </div>
                      </div>
                      <div class="row m-0">
                          <div class="col-md-12">
                              <div class="row text-center">
                                  <div class="col-md-6">
                                      <div class="flex-grow-1"><b>${lang.Started}</b> ${timeAgo(video.time)}</div>
                                      <div class="video-time">${humanStartTime}</div>
                                  </div>
                                  <div class="col-md-6">
                                      <div class="flex-grow-1"><b>${lang.Ended}</b> ${timeAgo(video.end)}</div>
                                      <div class="video-end">${humanEndTime}</div>
                                  </div>
                              </div>
                         </div>
                    </div>
                    <div class="row m-0 mt-3">
                        <div class="col-md-12 text-center">
                            <div><b>${lang.Tags}</b></div>
                            ${buildVideoTagsBlockHtml(video)}
                        </div>
                    </div>
                </div>
            </div>
        </main>`
        var tabCreateResponse = createNewTab(newTabId,tabLabel,baseHtml,{},null,'videoPlayer')
        tabCreateResponse.theTab.data('videoPlayerLoadedEvents',loadedEvents)
        refreshVideoPlayerEvents(video,tabCreateResponse.theTab,loadedEvents)
        loadVideoPlayerPreviewFrames(video,tabCreateResponse.theTab)
        var videoElement = tabCreateResponse.theTab.find('.tab-videoPlayer-video-element')[0]
        if(timeInward){
            var seekToTimeInward = function(){
                videoElement.currentTime = timeInward
            }
            //readyState >= HAVE_METADATA means duration/seekable range are already known.
            //On a freshly-created tab this is usually still loading (falls through to the
            //loadedmetadata listener); on an already-open tab (e.g. a different event card
            //that maps to the same underlying video) it's already true, so this seeks the
            //existing player immediately instead of silently doing nothing.
            if(videoElement.readyState >= 1){
                seekToTimeInward()
            }else{
                videoElement.addEventListener('loadedmetadata',seekToTimeInward,{once:true})
            }
        }
        if(!tabCreateResponse.existAlready){
            var videoObjectContainer = tabCreateResponse.theTab.find('.tab-videoPlayer-event-objects')
            var stripPlayhead = tabCreateResponse.theTab.find('.tab-videoPlayer-strip-playhead')
            var videoRangeSeconds = videoRangeMs / 1000
            // The overlay is pinned to the video box by CSS, so its size *is* the
            // displayed picture size. Measure it per draw (not once at tab creation)
            // so resizing, fullscreen and late-arriving metadata all stay aligned.
            videoElement.ontimeupdate = function(time){
                var eventTime = new Date(((new Date(video.time).getTime() / 1000) + videoElement.currentTime) * 1000)
                var theEvent = loadedEvents[eventTime]
                var pictureWidth = videoElement.clientWidth
                var pictureHeight = videoElement.clientHeight
                if(theEvent && pictureWidth && pictureHeight){
                    drawMatrices(theEvent,{
                        theContainer: videoObjectContainer,
                        height: pictureHeight,
                        width: pictureWidth,
                    })
                }else{
                    videoObjectContainer.find('.stream-detected-object').remove()
                }
                if(videoRangeSeconds > 0){
                    var playedPercent = Math.max(0,Math.min(100,(videoElement.currentTime / videoRangeSeconds) * 100))
                    stripPlayhead.css('left',`${playedPercent}%`)
                }
            }
        }
    }
    window.closeVideoPlayer = function(tabId){
        console.log('closeVideoPlayer')
        try{
            var videoElement = $(`#tab-${tabId}`).find('video')[0]
            if(!videoElement.paused)videoElement.pause();
            videoElement.removeAttribute('src');
            videoElement.load();
        }catch(err){
            console.log(err)
        }
    }
    window.pauseVideoPlayer = function(tabId){
        console.log('pauseVideoPlayer')
        try{
            var videoElement = $(`#tab-${tabId}`).find('video')[0]
            try{
                videoElement.pause();
            }catch(err){

            }
        }catch(err){
            console.log(err)
        }
    }
    window.resumeVideoPlayer = function(tabId){
        console.log('resumeVideoPlayer')
        try{
            var videoElement = $(`#tab-${tabId}`).find('video')[0]
            try{
                videoElement.play();
            }catch(err){

            }
        }catch(err){
            console.log(err)
        }
    }
    function drawVideoInfoCard(){

    }
    function drawVideoEventsList(){

    }
    $('body')
    .on('tab-open-videoPlayer',function(){
        if(pageLoadingData && pageLoadingData.title){
            theBlock.find('.video-title').html(pageLoadingData.title)
            theBlock.find('.video-time').html(formattedTime(pageLoadingData.time,true))
            theBlock.find('.video-end').html(formattedTime(pageLoadingData.end,true))
        }
    })
    // Click anywhere on the strip to seek. Position is read as a fraction of the video's
    // wall-clock span (the same basis the ticks are placed on) and clamped to the file's
    // real duration so a click at the far right can never seek past the end.
    .on('click','.tab-videoPlayer-event-strip',function(e){
        var strip = $(this)
        var videoEl = strip.parents('main.tab-videoPlayer').find('video')[0]
        if(!videoEl)return;
        var rect = this.getBoundingClientRect()
        if(!rect.width)return;
        var percent = Math.max(0,Math.min(1,(e.clientX - rect.left) / rect.width))
        var rangeSeconds = (parseFloat(strip.attr('data-range-ms')) || 0) / 1000
        var target = percent * rangeSeconds
        if(isFinite(videoEl.duration))target = Math.min(target,videoEl.duration)
        videoEl.currentTime = Math.max(0,target)
        var playAttempt = videoEl.play()
        if(playAttempt && playAttempt.catch)playAttempt.catch(function(){})
    })
    .on('mouseenter','.tab-videoPlayer-strip-tick',function(){
        var tick = $(this)
        var theTab = tick.parents('main.tab-videoPlayer')
        var preview = theTab.find('.tab-videoPlayer-strip-preview')
        var stripEl = theTab.find('.tab-videoPlayer-event-strip')[0]
        if(preview.length === 0 || !stripEl)return;
        preview.find('.tab-videoPlayer-strip-preview-caption').text(tick.attr('data-label') || '')
        var frame = findClosestPreviewFrame(theTab.data('videoPlayerPreviewFrames'),tick.attr('data-time'))
        var img = preview.find('img')
        if(frame && frame.href){
            if(img.attr('src') !== frame.href)img.attr('src',frame.href)
            img.show()
        }else{
            img.removeAttr('src').hide()
        }
        preview.addClass('is-visible')
        // Clamp inside the strip so the card never runs off either end.
        var stripWidth = stripEl.getBoundingClientRect().width
        var previewWidth = preview.outerWidth() || 200
        var centerPx = (parseFloat(tick.attr('data-left')) || 0) / 100 * stripWidth
        preview.css('left',`${Math.max(0,Math.min(stripWidth - previewWidth,centerPx - previewWidth / 2))}px`)
    })
    .on('mouseleave','.tab-videoPlayer-strip-wrapper',function(){
        $(this).find('.tab-videoPlayer-strip-preview').removeClass('is-visible')
    })
})
