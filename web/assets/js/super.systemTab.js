$(document).ready(function(){
    var systemsControlsTab = $('#system')
    var logsListElement = $('#logs-list')
    // The Superuser panel addresses these by session key, the dashboard by its own API prefix.
    // Whichever page is hosting this block sets window.systemControlApiPrefixes.
    function systemControlApiPrefixFor(feature){
        var prefixes = window.systemControlApiPrefixes || {}
        return prefixes[feature]
    }
    systemsControlsTab.find('[system]').click(function(e){
        switch($(this).attr('system')){
            case'deleteLogs':
                var html = 'Do you want to delete these logs? User logs will <b>not</b> be deleted.'
                $.confirm.create({
                    title: `${lang['Delete Logs']}`,
                    body: html,
                    clickOptions: {
                        class: 'btn-danger',
                        title: lang.Delete,
                    },
                    clickCallback: function(){
                        $.get(systemControlApiPrefixFor('logs') + '/delete',function(data){
                            console.log(data)
                        })
                        logsListElement.empty()
                    }
                })
            break;
            case'update':
                var html = lang.updateNotice1
                $.confirm.create({
                    title: `${lang.Update} Shinobi?`,
                    body: html,
                    clickOptions: {
                        class: 'btn-danger',
                        title: lang.Update,
                    },
                    clickCallback: function(){
                        $.get(systemControlApiPrefixFor('system') + '/update',function(data){
                            console.log(data)
                        })
                    }
                })
            break;
        }
    })
    systemsControlsTab.find('[restart]').click(function(e){
        var html = ''
        var target = $(this).attr('restart').split(',')
        target.forEach(function(v){
            switch(v){
                case'system':
                    html += '<p>Do you want to restart the core (camera.js)? plugins will not be restarted. They will reconnect when Shinobi is back online.</p>'
                break;
                case'cron':
                    html += '<p>Do you want to restart the CRON (cron.js)?</p>'
                break;
                case'logs':
                    html += '<p>Flush PM2 console logs? The logs saved in the database will <b>not</b> be deleted.</p>'
                break;
            }
        })
        $.confirm.create({
            title: `${lang.Restart}?`,
            body: html,
            clickOptions: {
                class: 'btn-danger',
                title: lang.Restart,
            },
            clickCallback: function(){
                $.get(systemControlApiPrefixFor('system') + '/restart/'+encodeURIComponent(target),function(data){
                    console.log(data)
                })
            }
        })
    })
    // Log rows and the system info panel are drawn here for both pages. This used to be
    // duplicated inline in super.ejs, which meant two implementations to keep in step -- and
    // the log list is a table now, so they would have drifted immediately.
    function renderJsonBlock(value){
        if(!(value instanceof Object))return `<span>${value}</span>`
        var html = '<ul>'
        $.each(value,function(key,item){
            html += `<li><b>${key}</b> : ${renderJsonBlock(item)}</li>`
        })
        return html + '</ul>'
    }
    // The relative "x minutes ago" text is a jQuery plugin that has to be applied to each
    // element after it is inserted; the Superuser page used to do this via $.ccio.init('ls').
    function applyLivestamps(){
        logsListElement.find('.livestamp').each(function(){
            var element = $(this)
            var time = element.attr('title')
            if(!time)return;
            element.removeClass('livestamp').addClass('livestamped').livestamp(time)
        })
    }
    function drawLogRow(log){
        var time = log.time || moment().format('YYYY-MM-DD HH:mm:ss')
        logsListElement.prepend(`<tr>
            <td style="white-space:nowrap">
                <span title="${time}" class="livestamp"></span><br>
                <small>${time}</small>
            </td>
            <td style="white-space:nowrap"><small class="badge badge-primary">${log.mid || ''}</small></td>
            <td><pre class="pre-inline text-white mb-0">${renderJsonBlock(log.info)}</pre></td>
        </tr>`)
    }
    // Date range search. Wired here rather than through the dashboard's loadDateRangePicker
    // helper because that lives in bs5.dashboard-base.js, which the Superuser panel does not
    // load -- the picker library itself is available on both pages.
    var dateRangeInput = systemsControlsTab.find('#systemControl_daterange')
    function initialiseDateRange(){
        if(dateRangeInput.length === 0 || typeof dateRangeInput.daterangepicker !== 'function')return;
        dateRangeInput.daterangepicker({
            startDate: moment().subtract(moment.duration('24:00:00')),
            endDate: moment().add(moment.duration('24:00:00')),
            timePicker: true,
            locale: { format: 'YYYY/MM/DD hh:mm:ss A' },
        })
    }
    // The server parses these with `new Date(value.replace('T',' '))`, which reads them in
    // its own timezone -- so the picker's time has to be expressed as the server's wall
    // clock, not the browser's. Same conversion bs5.dashboard-base.js does in convertTZ; this
    // is the copy for the Superuser panel, which does not load that file.
    function toServerWallClock(momentValue){
        var date = momentValue.toDate()
        if(typeof serverTimezone !== 'undefined' && serverTimezone){
            date = new Date(date.toLocaleString('en-US',{ timeZone: serverTimezone }))
        }
        return moment(date).format('YYYY-MM-DDTHH:mm:ss')
    }
    function selectedDateRange(){
        var picker = dateRangeInput.data('daterangepicker')
        if(!picker)return null;
        // Use the dashboard's own helper where it exists, so this searches on the same basis
        // as the Videos and Events tables (it converts through serverTimezone). The Superuser
        // panel does not load bs5.dashboard-base.js, hence the plain fallback.
        if(typeof getSelectedTime === 'function'){
            var range = getSelectedTime(dateRangeInput)
            return { start: range.startDate, end: range.endDate }
        }
        return {
            start: toServerWallClock(picker.startDate),
            end: toServerWallClock(picker.endDate),
        }
    }
    systemsControlsTab.on('click','.systemControl_quick_daterange',function(e){
        e.preventDefault()
        var el = $(this)
        var picker = dateRangeInput.data('daterangepicker')
        if(!picker)return false;
        var hours = parseInt(el.attr('data-hours')) || 0
        var days = parseInt(el.attr('data-days')) || 0
        picker.setStartDate(moment().subtract(days ? { days: days } : { hours: hours }))
        picker.setEndDate(moment())
        loadSystemLogs()
        return false
    })
    systemsControlsTab.on('click','.systemControl-refresh',function(e){
        e.preventDefault()
        loadSystemLogs()
        return false
    })
    function loadSystemLogs(){
        logsListElement.empty()
        var range = selectedDateRange()
        $.get(systemControlApiPrefixFor('logs'),range || {},function(data){
            if(!data || !data.ok){
                // The logs live in the database, so this is what a database that is down or
                // unreachable looks like. Reported inside the log area rather than by
                // replacing the whole page, which is what the Superuser panel used to do.
                logsListElement.html(`<tr><td colspan="3">
                    <div class="mt-3 mb-4 text-center text-white">
                        <p><i class="fa fa-4x fa-exclamation-circle text-danger"></i></p>
                        <h3>${lang.databaseNotRunningTitle}</h3>
                        <p>${lang.databaseNotRunningText}</p>
                    </div>
                </td></tr>`)
                return
            }
            data.logs.reverse().forEach(drawLogRow)
            applyLivestamps()
        })
    }
    function loadSystemInfo(){
        $.get(systemControlApiPrefixFor('system') + '/info',function(data){
            if(!data || !data.ok)return;
            // Not scoped to this tab on purpose: the Superuser panel also shows this panel on
            // the Accounts tab, and heyActivate refreshes it after activating.
            $('.super-system-info').html(renderJsonBlock(data.info))
        })
    }
    // super.ejs and heyActivate.ejs call these by name.
    window.drawSystemLogs = loadSystemLogs
    window.drawSystemInfo = loadSystemInfo
    // Whichever socket this page has; both are fed the same system log events.
    function onSystemLogEvent(handler){
        if(typeof onWebSocketEvent === 'function'){
            onWebSocketEvent(handler)
        }else if($.ccio && $.ccio.ws){
            $.ccio.ws.on('f',handler)
        }
    }
    onSystemLogEvent(function(data){
        if(data.f === 'log' && data.log && data.log.mid === '$SYSTEM'){
            drawLogRow(data.log)
            applyLivestamps()
        }
    })
    // Loaded when the tab is opened rather than at login. The tab is named systemControl on
    // the dashboard and system in the Superuser panel.
    if(typeof addOnTabOpen === 'function'){
        var loadSystemControl = function(){
            initialiseDateRange()
            loadSystemInfo()
            loadSystemLogs()
        }
        ;['systemControl','system'].forEach(function(tabName){
            addOnTabOpen(tabName,loadSystemControl)
            addOnTabReopen(tabName,loadSystemControl)
        })
    }
})
