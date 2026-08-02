$(document).ready(function(){
    var theBlock = $('#tab-videoPlayer')
    window.getVideoPlayerTabId = function(video){
        return `videoPlayer-${video.mid}-${moment(video.time).format('YYYY-MM-DD-HH-mm-ss')}`
    }
    // Renders the event/tag rows shown beside the player and (re)fills `loadedEvents`,
    // which ontimeupdate reads to draw detection matrices over the video.
    function buildVideoPlayerEventListHtml(theEvents,loadedEvents){
        var eventMatrixHtml = ``
        if(!(theEvents instanceof Array) || theEvents.length === 0)return eventMatrixHtml;
        $.each(theEvents,function(n,theEvent){
            loadedEvents[new Date(theEvent.time)] = theEvent
            var objectsFound = {}
            eventMatrixHtml += `<div class="d-block tab-videoPlayer-event-row card bg-darker mb-1 p-2" data-mid="${theEvent.mid}" data-time="${theEvent.time}">`
            eventMatrixHtml += `<div class="d-block">
                <div class="d-block">${formattedTime(theEvent.time)}</div>
            </div>`
            $.each((theEvent.details || {}).matrices || [],function(n,matrix){
                if(!objectsFound[matrix.tag])objectsFound[matrix.tag] = 1
                ++objectsFound[matrix.tag]
            })
            $.each(objectsFound,function(tag,count){
                eventMatrixHtml += `<div class="d-block">
                    <div class="d-block" style="text-transform: capitalize">${tag} : ${count}</div>
                </div>`
            })
            eventMatrixHtml += `</div>`
        })
        return eventMatrixHtml
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
            theTab.find('.tab-videoPlayer-event-list').html(
                buildVideoPlayerEventListHtml(theEvents,loadedEvents)
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
        var eventMatrixHtml = buildVideoPlayerEventListHtml(video.events,loadedEvents)
        var baseHtml = `<main class="container page-tab tab-videoPlayer" id="tab-${newTabId}" video-id="${video.mid}${video.time}${video.type}" data-time="${video.time}" data-mid="${video.mid}" data-ke="${video.ke}" data-type="${video.type}">
            <div class="my-3 ${definitions.Theme.isDark ? 'bg-dark text-white' : 'bg-light text-dark'} rounded shadow-sm">
                <div class="p-3">
                    <h6 class="video-title border-bottom-dotted border-bottom-dark pb-2 mb-0">${tabLabel}</h6>
                  </div>
                  <div class="tab-videoPlayer-view-container" style="position: relative">
                      <div class="tab-videoPlayer-event-objects" style="position: absolute;width: 100%; height: 100%; z-index: 10"></div>
                      <video class="tab-videoPlayer-video-element" controls autoplay src="${videoUrl}"></video>
                  </div>
                  <div class="p-3">
                      <div class="row">
                      <div class="col-md-6">
                              <div class="row">
                                  <div class="col-md-4">
                                      <div class="flex-grow-1"><b>${lang.Started}</b> ${timeAgo(video.time)}</div>
                                      <div class="video-time">${humanStartTime}</div>
                                  </div>
                                  <div class="col-md-4">
                                      <div class="flex-grow-1"><b>${lang.Ended}</b> ${timeAgo(video.end)}</div>
                                      <div class="video-end">${humanEndTime}</div>
                                  </div>
                                  <div class="col-md-4">
                                      <div class="flex-grow-1"><b>${lang['Objects Found']}</b></div>
                                      <div>${video.objects}</div>
                                  </div>
                              </div>
                              <div class="d-block pt-4">
                                  <div class="btn-group btn-group-justified">
                                        <a class="btn btn-sm btn-success" download href="${videoUrl}"><i class="fa fa-download"></i> ${lang.Download}</a>
                                        ${permissionCheck('video_delete',video.mid) ? `<a class="btn btn-sm btn-danger delete-video"><i class="fa fa-trash-o"></i> ${lang.Delete}</a>` : ''}
                                        ${permissionCheck('video_delete',video.mid) ? `<a class="btn btn-sm btn-${video.archive === 1 ? `success status-archived` : `default`} archive-video" title="${lang.Archive}"><i class="fa fa-${video.archive === 1 ? `lock` : `unlock-alt`}"></i> ${lang.Archive}</a>` : ''}
                                        <div class="dropdown d-inline-block">
                                            <a class="btn btn-sm btn-primary dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false" data-bs-reference="parent">
                                              <i class="fa fa-ellipsis-v" aria-hidden="true"></i>
                                            </a>
                                            <ul class="dropdown-menu ${definitions.Theme.isDark ? 'dropdown-menu-dark bg-dark' : ''} shadow-lg">
                                                ${buildDefaultVideoMenuItems(video,{
                                                    play: false
                                                })}
                                            </ul>
                                        </div>
                                  </div>
                              </div>
                          </div>
                          <div class="col-md-6 tab-videoPlayer-event-list">
                              ${eventMatrixHtml}
                          </div>
                    </div>
                </div>
            </div>
        </main>`
        var tabCreateResponse = createNewTab(newTabId,tabLabel,baseHtml,{},null,'videoPlayer')
        tabCreateResponse.theTab.data('videoPlayerLoadedEvents',loadedEvents)
        refreshVideoPlayerEvents(video,tabCreateResponse.theTab,loadedEvents)
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
            var videoHeight = videoObjectContainer.height()
            var videoWidth = videoObjectContainer.width()
            videoElement.ontimeupdate = function(time){
                var eventTime = new Date(((new Date(video.time).getTime() / 1000) + videoElement.currentTime) * 1000)
                var theEvent = loadedEvents[eventTime]
                if(theEvent){
                    drawMatrices(theEvent,{
                        theContainer: videoObjectContainer,
                        height: videoHeight,
                        width: videoWidth,
                    })
                }else{
                    videoObjectContainer.find('.stream-detected-object').remove()
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
    .on('click','.tab-videoPlayer-event-row',function(){
        var el = $(this)
        var parent = el.parents('main')
        var videoEl = parent.find('video')
        var videoData = loadedVideosInMemory[parent.attr('video-id')]
        var videoTime = new Date(videoData.time).getTime() / 1000
        var timeIndex = new Date(el.attr('data-time')).getTime() / 1000
        var newVideoTimeIndex = timeIndex - videoTime
        console.log(newVideoTimeIndex)
        videoEl[0].currentTime = newVideoTimeIndex
        videoEl[0].play()
    })
})
