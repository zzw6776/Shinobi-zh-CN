var eventsTable_eventTagIcons = {
    person: 'male',
    people: 'male',
    car: 'car',
    truck: 'truck',
    bicycle: 'bicycle',
    bike: 'bicycle',
    dog: 'paw',
    cat: 'paw',
    motion: 'arrows-alt',
}
function eventsTable_getEventTags(theEvent){
    var details = theEvent.details || {}
    var matrices = details.matrices || []
    if(matrices.length > 0){
        var tags = []
        matrices.forEach(function(m){
            if(m.tag && tags.indexOf(m.tag) === -1)tags.push(m.tag)
        })
        if(tags.length > 0)return tags
    }
    var reason = `${details.reason || ''}`
    if(/People/i.test(reason))return ['person']
    if(/Motion|Cell/i.test(reason))return ['motion']
    if(details.name)return [`${details.name}`]
    return ['motion']
}
function eventsTable_getEventIcon(tags,reason){
    var firstTag = (tags[0] || '').toLowerCase()
    if(eventsTable_eventTagIcons[firstTag])return eventsTable_eventTagIcons[firstTag]
    // Object/face-recognition events carry a specific (often unmapped, e.g. a
    // person's name) tag rather than a generic category - fall back to a
    // detection-shaped icon instead of the generic motion bell.
    if(`${reason || ''}` === 'object')return 'user-circle'
    return 'bell'
}
//Fetch timelapse frames without requiring a specific monitor (the API supports group-wide
//queries; the shared getTimelapseFrames() helper does not, so this is a thin local variant).
function eventsTable_getTimelapseFrames(monitorId,startDate,endDate){
    return new Promise(function(resolve){
        if(!startDate || !endDate){
            resolve([])
            return
        }
        var queryString = [
            'start=' + startDate,
            'end=' + endDate,
            'noLimit=1',
        ]
        var apiURL = apiBaseUrl + '/timelapse/' + $user.ke + (monitorId ? '/' + monitorId : '')
        $.getJSON(apiURL + '?' + queryString.join('&'),function(data){
            var frames = data.frames || data || []
            $.each(frames,function(n,fileInfo){
                var frameApiURL = apiBaseUrl + '/timelapse/' + $user.ke + '/' + fileInfo.mid
                fileInfo.href = frameApiURL + '/' + fileInfo.filename.split('T')[0] + '/' + fileInfo.filename
            })
            resolve(frames)
        }).fail(function(){
            resolve([])
        })
    })
}
//Find the timelapse frame closest in time (same monitor) to an event - used for the thumbnail.
function eventsTable_findClosestFrame(theEvent,frames){
    var eventTime = new Date(theEvent.time).getTime()
    var sameMonitorFrames = frames.filter(function(frame){ return frame.mid === theEvent.mid })
    if(sameMonitorFrames.length === 0)return null
    return sameMonitorFrames.reduce(function(prev,curr){
        var prevDiff = Math.abs(eventTime - new Date(prev.time).getTime())
        var currDiff = Math.abs(eventTime - new Date(curr.time).getTime())
        return currDiff < prevDiff ? curr : prev
    })
}
//Find the recorded video that covers an event's time (same monitor) - used to open the player.
function eventsTable_findCoveringVideo(theEvent,videos){
    var eventTime = new Date(theEvent.time).getTime()
    return videos.find(function(video){
        if(video.mid !== theEvent.mid)return false
        var start = new Date(video.time).getTime()
        var end = new Date(video.end).getTime()
        return eventTime >= start && eventTime <= end
    }) || null
}
$(document).ready(function(e){
    var theEnclosure = $('#tab-eventsTableView')
    var monitorsList = theEnclosure.find('.monitors_list')
    var dateSelector = theEnclosure.find('.date_selector')
    var tagSearchInput = $('#eventsTable_tag_search')
    var tagSearchAndOnly = $('#eventsTable_tag_search_andonly')
    var eventsTableDrawArea = $('#eventsTable_draw_area')
    var eventsTableNoticeArea = $('#eventsTable_draw_area_notice')
    var eventsTableEmptyArea = $('#eventsTable_draw_area_empty')
    var eventsTableResultsCount = $('#eventsTable_results_count')
    var eventsTablePaginationArea = $('#eventsTable_pagination')
    var eventsTablePrevBtn = $('#eventsTable_prev_page')
    var eventsTableNextBtn = $('#eventsTable_next_page')
    var eventsTablePageIndicator = $('#eventsTable_page_indicator')
    var loadedEventsTableRows = [];
    var alreadyLoading = false;
    var eventsTablePageSize = 60;
    var eventsTableCurrentPage = 1;
    var eventsTableTotalPages = 1;
    //Thumbnails are only assigned a real `src` once their card scrolls into view -
    //the URL is already known upfront (from the pre-fetched timelapse frames), this
    //just defers the actual image download until it's needed.
    var eventsTableThumbObserver = null;
    function eventsTable_observeLazyThumbs(){
        if(eventsTableThumbObserver)eventsTableThumbObserver.disconnect();
        eventsTableThumbObserver = new IntersectionObserver(function(entries){
            entries.forEach(function(entry){
                if(!entry.isIntersecting)return;
                var img = entry.target;
                img.src = img.getAttribute('data-src');
                img.removeAttribute('data-src');
                eventsTableThumbObserver.unobserve(img);
            })
        },{ rootMargin: '100px' });
        eventsTableDrawArea.find('.event-card-thumb[data-src]').each(function(n,img){
            eventsTableThumbObserver.observe(img);
        });
    }

    window.openEventsTableView = function(monitorId){
        drawMonitorListToSelector(monitorsList,null,null,true)
        monitorsList.val(monitorId || '')
        drawEventsTableViewElements()
        openTab(`eventsTableView`,{})
    }
    loadDateRangePicker(dateSelector,{
        onChange: function(start, end, label) {
            drawEventsTableViewElements()
        }
    })
    monitorsList.change(function(){
        drawEventsTableViewElements()
    })

    function eventsTable_buildCard(theEvent,frame,video){
        var loadedMonitor = loadedMonitors[theEvent.mid]
        var monitorName = loadedMonitor && loadedMonitor.name ? loadedMonitor.name : theEvent.mid
        var use24HourTime = dashboardOptions().use24HourTime == '1';
        var tags = eventsTable_getEventTags(theEvent)
        var icon = eventsTable_getEventIcon(tags,theEvent.details && theEvent.details.reason)
        var thumbSrc = frame ? frame.href : ''
        var hasVideo = !!video
        return `<div class="event-card ${hasVideo ? 'has-video cursor-pointer' : 'no-video'}" data-mid="${theEvent.mid}" data-time="${theEvent.time}">
            <div class="event-card-thumb-block">
                <div class="event-card-icon-badge" title="${escapeHtmlEventsTable(tags.join(', '))}"><i class="fa fa-${icon}"></i></div>
                ${!hasVideo ? `<div class="event-card-no-video-badge" title="${lang['eventsTableNoVideoTitle'] || 'No recording covers this event'}"><i class="fa fa-video-camera"></i> ${lang['No Video'] || 'No Video'}</div>` : ''}
                ${thumbSrc ? `<img class="event-card-thumb" data-src="${thumbSrc}">` : `<div class="event-card-thumb event-card-thumb-empty"><i class="fa fa-image"></i></div>`}
                <div class="event-card-bottom-overlay">
                    <div class="event-card-camera">${escapeHtmlEventsTable(monitorName)}</div>
                    <div class="event-card-time">
                        <span>${timeAgo(theEvent.time)}</span>
                        <span>${formattedTime(theEvent.time, !use24HourTime)}</span>
                    </div>
                </div>
            </div>
        </div>`
    }
    //Minimal HTML-escaping for text interpolated into card markup (camera name / tags).
    function escapeHtmlEventsTable(value){
        if(value === undefined || value === null)return ''
        return (`${value}`)
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;')
            .replace(/'/g,'&#039;')
    }
    function eventsTable_updatePaginationControls(){
        if(eventsTableTotalPages <= 1){
            eventsTablePaginationArea.addClass('d-none')
            return
        }
        eventsTablePaginationArea.removeClass('d-none')
        eventsTablePageIndicator.text(
            (lang['eventsTablePageIndicator'] || 'Page {page} of {totalPages}')
                .replace('{page}',eventsTableCurrentPage)
                .replace('{totalPages}',eventsTableTotalPages)
        )
        eventsTablePrevBtn.prop('disabled',eventsTableCurrentPage <= 1)
        eventsTableNextBtn.prop('disabled',eventsTableCurrentPage >= eventsTableTotalPages)
    }
    async function drawEventsTableViewElements(pageNumber){
        if(alreadyLoading)return;
        alreadyLoading = true
        eventsTableCurrentPage = pageNumber || 1;
        var dateRange = getSelectedTime(dateSelector);
        var startDate = dateRange.startDate;
        var endDate = dateRange.endDate;
        var monitorId = monitorsList.val();
        var formattedStart = formattedTimeForFilename(startDate,false)
        var formattedEnd = formattedTimeForFilename(endDate,false)
        var requestQueries = [`start=${formattedStart}`,`end=${formattedEnd}`]
        var tagSearchQuery = `${tagSearchInput.val() || ''}`.trim()
        if(tagSearchQuery){
            requestQueries.push(`search=${encodeURIComponent(tagSearchQuery)}`)
            if(tagSearchAndOnly.val() === '1')requestQueries.push(`andOnly=1`)
        }
        eventsTableNoticeArea.hide();
        eventsTableEmptyArea.addClass('d-none');
        eventsTablePaginationArea.addClass('d-none');
        eventsTableResultsCount.text('')
        eventsTableDrawArea.html(`<div class="text-center p-5"><i class="fa fa-spinner fa-pulse fa-2x"></i></div>`)

        //Server sorts newest-first by default (orderBy time desc), so page 1 at
        //offset 0 is always the most recent events - higher pages page backward
        //in time from there.
        var offset = (eventsTableCurrentPage - 1) * eventsTablePageSize;
        var eventsUrl = `${getApiPrefix('events')}${monitorId ? '/' + monitorId : ''}?${requestQueries.concat([`limit=${offset},${eventsTablePageSize}`]).join('&')}`

        var eventsData = await new Promise(function(resolve){
            $.getJSON(eventsUrl,function(data){ resolve(data) }).fail(function(){ resolve({events:[]}) })
        })
        // getVideos() also applies the correct href-prefixing and populates
        // loadedVideosInMemory itself (the same path videosTable/createVideoPlayerTab rely
        // on) - reused here instead of a raw fetch to avoid a mismatched video.href shape.
        var videosResult = await getVideos({monitorId,startDate,endDate},null,true)
        var frames = await eventsTable_getTimelapseFrames(monitorId,formattedStart,formattedEnd)

        var events = eventsData.events || eventsData || []
        var videos = videosResult.videos || []
        var total = eventsData.total || events.length
        loadedEventsTableRows = events
        eventsTableTotalPages = Math.max(1,Math.ceil(total / eventsTablePageSize))

        if(events.length === 0){
            eventsTableDrawArea.html('')
            eventsTableEmptyArea.removeClass('d-none')
            alreadyLoading = false
            return
        }

        var withVideoCount = 0
        var cardsHtml = events.map(function(theEvent){
            var frame = eventsTable_findClosestFrame(theEvent,frames)
            var video = eventsTable_findCoveringVideo(theEvent,videos)
            if(video){
                theEvent.videoRef = `${video.mid}${video.time}${video.type}`
                withVideoCount++
            }
            return eventsTable_buildCard(theEvent,frame,video)
        }).join('')
        eventsTableDrawArea.html(cardsHtml)
        eventsTable_observeLazyThumbs()
        eventsTableResultsCount.text(
            (lang['eventsTableResultsCount'] || '{count} of {total} events found ({withVideo} with video on this page)')
                .replace('{count}',events.length)
                .replace('{total}',total)
                .replace('{withVideo}',withVideoCount)
        )
        eventsTable_updatePaginationControls()
        alreadyLoading = false;
    }

    theEnclosure
    .on('click','.event-card.has-video',function(e){
        e.preventDefault()
        var el = $(this)
        var monitorId = el.attr('data-mid')
        var eventTime = el.attr('data-time')
        var theEvent = loadedEventsTableRows.find(function(row){
            return row.mid === monitorId && row.time === eventTime
        })
        var video = theEvent && theEvent.videoRef ? loadedVideosInMemory[theEvent.videoRef] : null
        if(video){
            var timeInward = Math.max(0,(new Date(theEvent.time).getTime() - new Date(video.time).getTime()) / 1000)
            createVideoPlayerTab(video,timeInward)
        }else{
            new PNotify({
                title: lang['Video'],
                text: lang['No Monitor Found, Ignoring Request'],
                type: 'info',
            })
        }
        return false;
    })
    .on('click','.refresh-data',function(e){
        e.preventDefault()
        drawEventsTableViewElements()
        return false;
    })
    .on('click','#eventsTable_prev_page',function(e){
        e.preventDefault()
        if(eventsTableCurrentPage <= 1)return false;
        drawEventsTableViewElements(eventsTableCurrentPage - 1)
        return false;
    })
    .on('click','#eventsTable_next_page',function(e){
        e.preventDefault()
        if(eventsTableCurrentPage >= eventsTableTotalPages)return false;
        drawEventsTableViewElements(eventsTableCurrentPage + 1)
        return false;
    })
    .on('click','.eventsTable_quick_daterange',function(e){
        e.preventDefault()
        var el = $(this)
        var hours = el.attr('data-hours')
        var days = el.attr('data-days')
        var amount = hours ? parseInt(hours) : parseInt(days)
        var unit = hours ? 'hours' : 'days'
        var picker = dateSelector.data('daterangepicker')
        picker.setStartDate(moment().subtract(amount,unit))
        picker.setEndDate(moment())
        drawEventsTableViewElements()
        return false;
    })

    $('body')
    .on('click','.open-eventsTable',function(e){
        e.preventDefault()
        var monitorId = getRowsMonitorId(this)
        openEventsTableView(monitorId)
        return false;
    });

    addOnTabOpen('eventsTableView', function () {
        drawMonitorListToSelector(monitorsList,null,null,true)
        eventsTableNoticeArea.show()
    })
    addOnTabReopen('eventsTableView', function () {
        var theSelected = `${monitorsList.val()}`
        drawMonitorListToSelector(monitorsList,null,null,true)
        monitorsList.val(theSelected)
    })
})
