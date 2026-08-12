$(document).ready(function(){
    var loadedMonitorStates = {}
    var loadedSchedules = {}
    var schedulerWindow = $('#tab-schedules')
    var scheduleSelector = $('#schedulesSelector')
    var schedulerForm = schedulerWindow.find('form')
    var selectedStates = schedulerWindow.find('[name="monitorStates"]')
    var selectedDays = schedulerWindow.find('[name="days"]')
    // A new Schedule starts on the timezone of the machine viewing the dashboard rather than
    // UTC. getTimezoneOffset() counts minutes *behind* UTC, while the options are minutes from
    // UTC (config.timeZones), hence the sign flip. Zones with no matching option - anything
    // the list does not carry - fall back to UTC so the field is never left blank.
    var getClientTimezoneOffsetOption = function(tzEl){
        var clientOffset = -(new Date().getTimezoneOffset())
        return tzEl.find(`option[value="${clientOffset}"]`).length > 0 ? `${clientOffset}` : '0'
    }
    var loadSchedules = function(callback){
        $.getJSON(getApiPrefix() + '/schedule/' + $user.ke,function(d){
            var html = ''
            $.each(d.schedules,function(n,v){
                loadedSchedules[v.name] = v
                html += createOptionHtml({
                    value: v.name,
                    label: v.name
                })
            })
            scheduleSelector.find('optgroup').html(html)
            if(callback)callback()
        })
    }
    var loadMonitorStates = function(){
        $.getJSON(getApiPrefix() + '/monitorStates/' + $user.ke,function(d){
            var html = ''
            $.each(d.presets,function(n,v){
                loadedMonitorStates[v.name] = v
                html += createOptionHtml({
                    value: v.name,
                    label: v.name
                })
            })
            selectedStates.html(html)
        })
    }
    addOnTabOpen('schedules',function(loadedTab){
        loadMonitorStates()
        loadSchedules()
    })
    addOnTabReopen('schedules',function(loadedTab){
        loadMonitorStates()
        loadSchedules()
    })
    schedulerWindow.on('click','.delete',function(e){
        $.confirm.create({
            title: lang['Delete Schedule'],
            body: lang.deleteScheduleText,
            clickOptions: {
                title: 'Delete',
                class: 'btn-danger'
            },
            clickCallback: function(){
                var form = schedulerForm.serializeObject()
                $.post(getApiPrefix() + '/schedule/' + $user.ke + '/' + form.name + '/delete',function(d){
                    debugLog(d)
                    if(d.ok === true){
                        loadSchedules()
                        new PNotify({title:lang.Success,text:d.msg,type:'success'})
                    }
                })
            }
        })
    })
    scheduleSelector.change(function(e){
        var selected = $(this).val()
        var loaded = loadedSchedules[selected]
        var namespace = schedulerWindow.find('[name="name"]')
        var deleteButton = schedulerWindow.find('.delete')
        var tzEl = schedulerWindow.find('[name="timezone"]')
        var startField = schedulerWindow.find('[name="start"]')
        var endField = schedulerWindow.find('[name="end"]')
        selectedStates.find('option').prop('selected',false)
        selectedDays.find('option').prop('selected',false)
        if(loaded){
            namespace.val(loaded.name)
            var html = ''
            $.each(loaded,function(n,v){
                schedulerForm.find('[name="' + n + '"]').val(v)
            })
            $.each(loaded.details.monitorStates,function(n,v){
                selectedStates.find('option[value="' + v + '"]').prop('selected',true)
            })
            $.each(loaded.details.days,function(n,v){
                selectedDays.find('option[value="' + v + '"]').prop('selected',true)
            })
            tzEl.val(loaded.details.timezone || '0')
            deleteButton.show()
        }else{
            tzEl.val(getClientTimezoneOffsetOption(tzEl))
            namespace.val('')
            startField.val('')
            endField.val('')
            deleteButton.hide()
        }
    })
    schedulerForm.submit(function(e){
        e.preventDefault()
        var el = $(this)
        var form = el.serializeObject()
        var monitors = []
        var failedToParseAJson = false
        if(form.name === ''){
            return new PNotify({title:lang['Invalid Data'],text:lang['Name cannot be empty.'],type:'error'})
        }
        if(form.start === ''){
            return new PNotify({title:lang['Invalid Data'],text:lang['Start Time cannot be empty.'],type:'error'})
        }
        if(form.monitorStates instanceof Array === false){
            form.monitorStates = [form.monitorStates]
        }
        if(!form.days || form.days === ''){
            form.days = null
        }else if(form.days instanceof Array === false){
            form.days = [form.days]
        }
        var data = {
            start: form.start,
            end: form.end,
            enabled: form.enabled,
            details: {
                monitorStates: form.monitorStates,
                days: form.days,
                timezone: form.timezone,
            }
        }
        $.post(getApiPrefix() + '/schedule/' + $user.ke + '/' + form.name + '/insert',{data:data},function(d){
            debugLog(d)
            if(d.ok === true){
                loadSchedules(function(){
                    scheduleSelector.val(form.name)
                })
                new PNotify({title:lang.Success,text:d.msg,type:'success'})
            }
        })
        return false;
    })
})
