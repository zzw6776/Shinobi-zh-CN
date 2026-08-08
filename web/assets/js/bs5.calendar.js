$(document).ready(function(e){
    var theEnclosure = $('#tab-calendarView')
    var monitorsList = theEnclosure.find('.monitors_list')
    var calendarDrawArea = $('#calendar_draw_area')
    var loadedVideosInMemory = {};
    var calendarIsBuilt = false
    monitorsList.change(function(){
        refetchCalendarEvents()
    })
    // fullCalendar hands this the exact span it is about to display, and calls it again on
    // every prev / next / today / view change. Driving the query from that span is what lets
    // the tab work without a date picker : whatever you are looking at is what gets loaded.
    // A stable colour per monitor, derived from the id so the same camera keeps the same
    // colour between reloads. With every monitor on one calendar the name in the title is
    // not enough to tell them apart at a glance.
    function getMonitorColor(monitorId){
        var hash = 0
        for(var i = 0; i < `${monitorId}`.length; i++){
            hash = ((hash << 5) - hash) + `${monitorId}`.charCodeAt(i)
            hash |= 0
        }
        return `hsl(${Math.abs(hash) % 360},60%,42%)`
    }
    function fetchVideosForVisibleRange(start,end,timezone,callback){
        var selectedMonitor = monitorsList.val()
        // The API reads dates in the server's configured timezone, the same conversion the
        // date-picker driven tabs get from getSelectedTime().
        var startDate = moment(convertTZ(start.toDate())).format('YYYY-MM-DDTHH:mm:ss')
        var endDate = moment(convertTZ(end.toDate())).format('YYYY-MM-DDTHH:mm:ss')
        var queryString = ['start=' + startDate,'end=' + endDate,'limit=0']
        // Leaving the monitor off the path is what asks for every monitor the user can see,
        // the same way the Videos and Events tabs handle their All Monitors option.
        var apiURL = getApiPrefix('videos') + (selectedMonitor ? '/' + selectedMonitor : '');
        var calendarData = []
        loadedVideosInMemory = {}
        $.getJSON(apiURL + '?' + queryString.join('&'),function(data){
            $.each(data.videos,function(n,v){
                if(v.status !== 0){
                    loadedVideosInMemory[`${v.mid}${v.time}${v.type}`] = Object.assign({},v)
                    var loadedMonitor = loadedMonitors[v.mid]
                    if(loadedMonitor){
                        v.title = loadedMonitor.name+' - '+(parseInt(v.size)/1048576).toFixed(2)+'mb';
                    }
                    v.color = getMonitorColor(v.mid)
                    v.start = moment.utc(v.time).local()
                    v.end = moment.utc(v.end).local()
                    calendarData.push(v)
                }
            })
            callback(calendarData)
        }).fail(function(){
            callback([])
        })
    }
    // Built once and kept. Rebuilding it on every search was what forced the view back to the
    // picked date and threw away whichever month or week you had navigated to.
    function buildCalendar(){
        if(calendarIsBuilt)return;
        calendarDrawArea.fullCalendar({
            header: {
                left: 'prev,next today',
                center: 'title',
                right: 'month,agendaWeek,agendaDay,listWeek'
            },
            locale: ($user.details.lang || '').substring(0, 2) || undefined,
            navLinks: true,
            eventLimit: true,
            events: fetchVideosForVisibleRange,
            eventClick: function(v){
                var video = loadedVideosInMemory[`${v.mid}${v.time}${v.type}`]
                if(!video)return;
                var href = video.href
                createVideoPlayerTab(Object.assign({},video,{href: href}))
                $(this).css('border-color', 'red');
            }
        });
        calendarIsBuilt = true
    }
    function refetchCalendarEvents(){
        if(!calendarIsBuilt){
            buildCalendar()
            return
        }
        calendarDrawArea.fullCalendar('refetchEvents')
    }
    function renderCalendar(){
        if(!calendarIsBuilt)return;
        calendarDrawArea.fullCalendar('render')
    }

    $('body').on('click','.open-timelapse-viewer',function(){
        var el = $(this).parents('[data-mid]')
        var monitorId = el.attr('data-mid')
        openTab(`calendarView`,{},null)
        monitorsList.val(monitorId).change()
    })
    theEnclosure
    .on('click','.refresh-data',function(e){
        e.preventDefault()
        refetchCalendarEvents()
        return false;
    })
    addOnTabOpen('calendarView', function () {
        drawMonitorListToSelector(monitorsList,null,null,true)
        buildCalendar()
        // The calendar lays out against a container that has no width until the tab is
        // actually visible, so it needs a nudge once it is on screen.
        renderCalendar()
    })
    addOnTabReopen('calendarView', function () {
        var theSelected = `${monitorsList.val()}`
        drawMonitorListToSelector(monitorsList,null,null,true)
        monitorsList.val(theSelected)
        // renderCalendar()
    })
})
