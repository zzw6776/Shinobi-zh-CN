var loadedMap;
$(document).ready(function(){
    var theBlock = $('#tab-monitorMap')
    var theMap = $('#monitor-map-canvas')
    // How far back a pin popup looks for events, and how many it will draw.
    var popupEventHours = 24
    var popupEventLimit = 24
    // Keyed the same way the Events tab keys its rows, so a clicked card can be traced back
    // to its event and from there to the video that covers it.
    var loadedPopupEvents = []
    function loadPopupEventList(monitor){
        var monitorId = monitor.mid
        var theEventList = $(`#leaflet-monitor-events`)
        // Same shape the date-picker tabs send : server timezone, no offset suffix.
        var endMoment = moment(convertTZ(new Date()))
        var startMoment = endMoment.clone().subtract(popupEventHours,'hours')
        var startDate = startMoment.format('YYYY-MM-DDTHH:mm:ss')
        var endDate = endMoment.format('YYYY-MM-DDTHH:mm:ss')
        var eventsUrl = `${getApiPrefix('events')}/${monitorId}?start=${startDate}&end=${endDate}&limit=0,${popupEventLimit}`
        loadedPopupEvents = []
        $.getJSON(eventsUrl,async function(data){
            var events = data.events || data || []
            if(events.length === 0){
                theEventList.html(`<div class="text-center text-light p-3">${lang['No Events Found'] || lang['No Data']}</div>`)
                return
            }
            // Videos give the cards something to open, frames give them a thumbnail. Both are
            // fetched over the same window the events came from, exactly as the Events tab does.
            var videosResult = await getVideos({monitorId,startDate,endDate},null,true)
            var frames = await eventsTable_getTimelapseFrames(monitorId,startDate,endDate)
            var videos = videosResult.videos || []
            loadedPopupEvents = events
            var cardsHtml = events.map(function(theEvent){
                var frame = eventsTable_findClosestFrame(theEvent,frames)
                var video = eventsTable_findCoveringVideo(theEvent,videos)
                if(video)theEvent.videoRef = `${video.mid}${video.time}${video.type}`;
                return eventsTable_buildCard(theEvent,frame,video)
            }).join('')
            theEventList.html(`<div class="leaflet-monitor-events-grid">${cardsHtml}</div>`)
            // The popup is short and always on screen, so the Events tab's scroll-triggered
            // lazy loading would never fire here - the thumbnails are just loaded outright.
            theEventList.find('.event-card-thumb[data-src]').each(function(n,img){
                img.src = img.getAttribute('data-src')
                img.removeAttribute('data-src')
            })
        }).fail(function(){
            theEventList.html(`<div class="text-center text-light p-3">${lang['No Events Found'] || lang['No Data']}</div>`)
        })
    }
    function buildPinPopupHtml(monitor){
        var embedUrl = buildEmbedUrl(monitor)
        var html = `
        <div id="leaflet-monitor-block" data-mid="${monitor.mid}" data-ke="${monitor.ke}">
            <div>${userHasSubscribed ? `<iframe src="${embedUrl}"></iframe>` : `<div class="text-center p-3 text-light cursor-pointer" onclick="openTab('helpWindow')">${lang.activateRequiredLiveStream}</div>`}</div>
            <div class="leaflet-monitor-events-header d-flex flex-row align-items-center">
                <div class="flex-grow-1">${lang['Events']} <span class="opacity-50">(${lang.Last} ${popupEventHours} ${lang.hours})</span></div>
                <a class="btn btn-xs btn-primary leaflet-monitor-open-events" data-mid="${monitor.mid}">${lang['View All'] || lang['Events']}</a>
            </div>
            <div id="leaflet-monitor-events">
                <div class="text-center text-light" style="padding-top: 75px"><i class="fa fa-3x fa-spinner fa-pulse"></i></div>
            </div>
        </div>
        `
        return html
    }
    function getPinsFromMonitors(){
        var points = []
        var n = 0;
        $.each(loadedMonitors,function(monitorId,monitor){
            var geolocation = monitor.details.geolocation
            var modeIsOn = monitor.mode === 'record' || monitor.mode === 'start'
            var point = {
                coords: [49.2578298 + n,-123.2634732 + n],
                direction: 90,
                fov: 60,
                range: 1,
                title: `${monitor.name} (${monitor.host})`,
                html: buildPinPopupHtml(monitor)
            };
            if(!modeIsOn){

            }else if(geolocation){
                var {
                    lat,
                    lng,
                    zoom,
                    direction,
                    fov,
                    range,
                } = getGeolocationParts(monitor.details.geolocation);
                point.direction = direction
                point.fov = fov
                point.range = range
                point.coords = [lat, lng]
                points.push(point)
            }else{
                n += 0.0001105;
                points.push(point)
            }
        })
        return points
    }
    function plotPinsToMap(pins){
        for (var i = 0; i < pins.length; i++) {
            var pin = pins[i];
            var lat = pin.coords[0];
            var lng = pin.coords[1];
            var html = pin.html;
            L.marker([lat, lng], { title: pin.title }).bindPopup(html).addTo(loadedMap);
            console.log(pin)
            drawMapMarkerFov(loadedMap,{
                lat,
                lng,
                direction: pin.direction,
                fov: pin.fov,
                range: pin.range,
            });
        }
    }
    function loadMap(){
        console.log('Load Map')
        var monitorMapInfo = dashboardOptions().monitorMap || {
            center: { lat:49.2578298, lng:-123.2634732 },
            zoom: 13
        };
        var center = monitorMapInfo.center
        var lat = center.lat
        var lng = center.lng
        var zoom = monitorMapInfo.zoom
        var monitorPins = getPinsFromMonitors()
        loadedMap = L.map('monitor-map-canvas').setView([lat, lng], zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(loadedMap);
        loadedMap.on('moveend', function() {
            saveCurrentPosition()
        });
        loadedMap.on('popupopen', function(e) {
            var popup = $('#leaflet-monitor-block')
            var groupKey = popup.attr('data-ke')
            var monitorId = popup.attr('data-mid')
            var monitor = loadedMonitors[monitorId]
            if(!monitor)return;
            loadPopupEventList(monitor)
        });
        plotPinsToMap(monitorPins)
    }
    function unloadMap(){
        loadedMap.remove();
        loadedMap = null;
    }
    function saveCurrentPosition(){
        var center = loadedMap.getCenter();
        var zoom = loadedMap.getZoom();
        dashboardOptions('monitorMap',{
            center,
            zoom,
        })
    }
    // Leaflet renders popups into the map pane rather than where the tab markup sits, so
    // these are delegated from body instead of from the tab element.
    $('body')
    .on('click','#leaflet-monitor-events .event-card.has-video',function(e){
        e.preventDefault()
        var el = $(this)
        var monitorId = el.attr('data-mid')
        var eventTime = el.attr('data-time')
        var theEvent = loadedPopupEvents.find(function(row){
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
    .on('click','.leaflet-monitor-open-events',function(e){
        e.preventDefault()
        openEventsTableView($(this).attr('data-mid'))
        return false;
    })
    addOnTabOpen('monitorMap', function () {
        loadMap()
    })
    addOnTabReopen('monitorMap', function () {
        loadMap()
    })
    addOnTabAway('monitorMap', function () {
        unloadMap()
    })
    onWebSocketEvent(function (d){
        switch(d.f){
            case'monitor_edit':
            break;
            case'monitor_status':
            break;
        }
    })
})
