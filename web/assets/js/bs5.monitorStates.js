$(document).ready(function(){
    // Monitor States is a viewer. Presets are created from Monitor Settings ("Create new
    // Preset" / "Add to Preset" in the bottom right menu), which saves only the fields that
    // were changed - so all this page needs to do is show what each preset holds and let it
    // be deleted. It used to rebuild the whole Monitor Settings form here to pick fields one
    // at a time, which is what made presets awkward to create.
    var monitorStatesPage = $('#tab-monitorStates')
    var monitorStatesList = $('#monitorStatesList')
    var monitorStatesLoaded = {}
    function escapeText(text){
        return `${text}`.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    }
    function buildPresetFieldRows(monitor){
        var labels = getMonitorSettingsFieldLabels()
        var rows = []
        Object.keys(monitor || {}).forEach(function(key){
            if(key === 'mid' || key === 'ke' || key === 'details')return
            rows.push({label: labels[key] || key, key: key, value: monitor[key]})
        })
        Object.keys(monitor.details || {}).forEach(function(key){
            rows.push({label: labels[`detail=${key}`] || key, key: `detail=${key}`, value: monitor.details[key]})
        })
        if(rows.length === 0){
            return `<div><small class="text-muted">${lang['PresetMonitorHasNoFieldsText']}</small></div>`
        }
        return rows.map(function(row){
            var value = normalizeMonitorValueForCompare(row.value)
            if(value.length > 80)value = `${value.substring(0,80)}...`
            return `<div>
                <span class="badge bg-secondary">${escapeText(row.label)}</span>
                <small class="text-muted">${escapeText(row.key)} : ${escapeText(value)}</small>
            </div>`
        }).join('')
    }
    function buildPresetHtml(preset){
        var monitors = preset.details && preset.details.monitors ? preset.details.monitors : []
        var monitorsHtml = monitors.map(function(monitor){
            // a monitor deleted since the preset was saved is dropped server side the next
            // time the preset is written, so it may still be listed here until then
            var loadedMonitor = loadedMonitors[monitor.mid]
            var monitorName = loadedMonitor ? loadedMonitor.name : `${monitor.mid} (${lang['Deleted']})`
            return `<div class="mb-3" data-monitor-mid="${escapeText(monitor.mid)}">
                <div class="d-flex flex-row align-items-center">
                    <div class="flex-grow-1">
                        <b>${escapeText(monitorName)}</b> <small class="text-muted">${escapeText(monitor.mid)}</small>
                    </div>
                    <div>
                        <a class="btn btn-default btn-sm copy-monitor-state-entry cursor-pointer" title="${lang['Copy to another Monitor']}"><i class="fa fa-copy"></i> ${lang['Copy to another Monitor']}</a>
                        <a class="btn btn-danger btn-sm remove-monitor-state-entry cursor-pointer" title="${lang['Remove']}"><i class="fa fa-times"></i> ${lang['Remove']}</a>
                    </div>
                </div>
                ${buildPresetFieldRows(monitor)}
            </div>`
        }).join('')
        return `<div class="card mb-3 ${definitions.Theme.isDark ? 'bg-dark' : 'bg-light'}" data-preset-name="${escapeText(preset.name)}">
            <div class="card-header d-flex flex-row align-items-center">
                <div class="flex-grow-1"><h5 class="m-0">${escapeText(preset.name)}</h5></div>
                <div>
                    <a class="btn btn-success btn-sm activate-monitor-state-preset cursor-pointer"><i class="fa fa-play"></i> ${lang.Activate}</a>
                    <a class="btn btn-danger btn-sm delete-monitor-state-preset cursor-pointer"><i class="fa fa-trash-o"></i> ${lang.Delete}</a>
                </div>
            </div>
            <div class="card-body">
                ${monitors.length > 0 ? monitorsHtml : `<small class="text-muted">${lang['PresetHasNoMonitorsText']}</small>`}
            </div>
        </div>`
    }
    // Redraws from what is already loaded. After a change is saved the local copy is updated
    // and this is called, so the list reflects it straight away instead of waiting on a
    // re-read of the preset.
    function drawMonitorStatesPresets(){
        var presets = Object.values(monitorStatesLoaded)
        if(presets.length === 0){
            monitorStatesList.html(`<div class="text-center p-4">
                <i class="fa fa-3x mb-3 fa-folder-open-o"></i>
                <div>${lang['NoMonitorStatePresetsSavedText']}</div>
            </div>`)
            return
        }
        monitorStatesList.html(presets.map(buildPresetHtml).join(''))
    }
    function setMonitorsInLoadedPreset(presetName,monitors){
        var preset = monitorStatesLoaded[presetName]
        if(!preset)return
        if(!preset.details)preset.details = {}
        preset.details.monitors = monitors
    }
    function loadMonitorStatesPresets(){
        $.getJSON(getApiPrefix(`monitorStates`),function(d){
            monitorStatesLoaded = {}
            ;(d.presets || []).forEach(function(preset){
                monitorStatesLoaded[preset.name] = preset
            })
            drawMonitorStatesPresets()
        })
    }
    addOnTabOpen('monitorStates', function () {
        loadMonitorStatesPresets()
    })
    addOnTabReopen('monitorStates', function () {
        loadMonitorStatesPresets()
    })
    // No action segment on the route means "apply this state now" - see the default case in
    // libs/webPaths/monitorStates.js, the same path a Schedule takes.
    monitorStatesPage.on('click','.activate-monitor-state-preset',function(e){
        var presetName = $(this).parents('[data-preset-name]').attr('data-preset-name')
        var preset = monitorStatesLoaded[presetName]
        var monitorCount = preset && preset.details && preset.details.monitors ? preset.details.monitors.length : 0
        $.confirm.create({
            title: `${lang.Activate} : ${presetName}`,
            body: `<p>${lang['ActivateMonitorStatePresetText'].replace('{count}',monitorCount)}</p>`,
            clickOptions: {title: lang.Activate, class: 'btn-success'},
            clickCallback: function(){
                $.post(`${getApiPrefix(`monitorStates`)}/${encodeURIComponent(presetName)}`,function(d){
                    if(d.ok === true){
                        new PNotify({title:lang.Success,text:d.msg || lang['Activated'],type:'success'})
                    }else{
                        new PNotify({title:lang['Invalid Data'],text:d.msg || lang['Failed'],type:'error'})
                    }
                })
            }
        })
    })
    // Copies one monitor's entry onto another monitor inside the same preset - the fields
    // stored are the same, only the mid changes.
    monitorStatesPage.on('click','.copy-monitor-state-entry',function(e){
        var presetName = $(this).parents('[data-preset-name]').attr('data-preset-name')
        var sourceMonitorId = $(this).parents('[data-monitor-mid]').attr('data-monitor-mid')
        var preset = monitorStatesLoaded[presetName]
        var monitors = preset && preset.details ? preset.details.monitors || [] : []
        var sourceMonitor = monitors.find(function(monitor){ return monitor.mid === sourceMonitorId })
        if(!sourceMonitor)return;
        var targetMonitors = Object.values(loadedMonitors).filter(function(monitor){
            return monitor.mid !== sourceMonitorId
        })
        if(targetMonitors.length === 0){
            return new PNotify({title:lang['Monitor States'],text:lang['NoOtherMonitorsToCopyToText'],type:'error'})
        }
        // a target is either one monitor or a group - groups are the tags given to monitors,
        // so "mid:" / "tag:" keeps the two apart in a single list
        var monitorsHtml = targetMonitors.map(function(monitor){
            return createOptionHtml({value: `mid:${monitor.mid}`, label: `${monitor.name} (${monitor.mid})`})
        }).join('')
        var tagList = getListOfTagsFromMonitors()
        var groupsHtml = Object.keys(tagList).map(function(tag){
            var count = tagList[tag].filter(function(monitorId){ return monitorId !== sourceMonitorId }).length
            if(count === 0)return ''
            return createOptionHtml({value: `tag:${tag}`, label: `${tag} (${count} ${lang.Monitors})`})
        }).join('')
        var optionsHtml = `<optgroup label="${escapeText(lang.Monitors)}">${monitorsHtml}</optgroup>`
        if(groupsHtml)optionsHtml += `<optgroup label="${escapeText(lang.Groups)}">${groupsHtml}</optgroup>`
        $.confirm.create({
            title: lang['Copy to another Monitor'],
            body: `<p>${lang['CopyMonitorStateEntryText']}</p>
                ${buildPresetFieldRows(sourceMonitor)}
                <select class="form-control mt-3 monitor-state-copy-target">${optionsHtml}</select>`,
            clickOptions: {title: lang['Copy'], class: 'btn-success'},
            clickCallback: function(){
                var target = `${$.confirm.body.find('.monitor-state-copy-target').val()}`
                var targetMonitorIds = target.indexOf('tag:') === 0
                    ? (tagList[target.replace('tag:','')] || []).filter(function(monitorId){ return monitorId !== sourceMonitorId })
                    : [target.replace('mid:','')]
                if(targetMonitorIds.length === 0)return;
                // one entry per monitor, so existing entries for the targets are replaced
                var updatedMonitors = monitors.filter(function(monitor){
                    return targetMonitorIds.indexOf(monitor.mid) === -1
                })
                targetMonitorIds.forEach(function(targetMonitorId){
                    // deep copy so the new entries do not share `details` with the source
                    var copiedMonitor = JSON.parse(JSON.stringify(sourceMonitor))
                    copiedMonitor.mid = targetMonitorId
                    updatedMonitors.push(copiedMonitor)
                })
                $.post(`${getApiPrefix(`monitorStates`)}/${encodeURIComponent(presetName)}/edit`,{data:JSON.stringify({monitors:updatedMonitors})},function(d){
                    if(d.ok === true){
                        new PNotify({title:lang.Success,text:d.msg,type:'success'})
                        setMonitorsInLoadedPreset(presetName,updatedMonitors)
                        drawMonitorStatesPresets()
                    }else{
                        new PNotify({title:lang['Invalid Data'],text:d.msg || lang['Failed'],type:'error'})
                    }
                })
            }
        })
    })
    // Takes one monitor out of the preset. The preset itself stays, even with nothing left in
    // it - deleting the preset is the button in its header.
    monitorStatesPage.on('click','.remove-monitor-state-entry',function(e){
        var presetName = $(this).parents('[data-preset-name]').attr('data-preset-name')
        var monitorId = $(this).parents('[data-monitor-mid]').attr('data-monitor-mid')
        var preset = monitorStatesLoaded[presetName]
        var monitors = preset && preset.details ? preset.details.monitors || [] : []
        if(!monitors.some(function(monitor){ return monitor.mid === monitorId }))return;
        var loadedMonitor = loadedMonitors[monitorId]
        $.confirm.create({
            title: lang['Remove'],
            body: `<p>${lang['RemoveMonitorStateEntryText']
                .replace('{monitor}',escapeText(loadedMonitor ? loadedMonitor.name : monitorId))
                .replace('{preset}',escapeText(presetName))}</p>`,
            clickOptions: {title: lang['Remove'], class: 'btn-danger'},
            clickCallback: function(){
                var updatedMonitors = monitors.filter(function(monitor){
                    return monitor.mid !== monitorId
                })
                $.post(`${getApiPrefix(`monitorStates`)}/${encodeURIComponent(presetName)}/edit`,{data:JSON.stringify({monitors:updatedMonitors})},function(d){
                    if(d.ok === true){
                        new PNotify({title:lang.Success,text:d.msg,type:'success'})
                        setMonitorsInLoadedPreset(presetName,updatedMonitors)
                        drawMonitorStatesPresets()
                    }else{
                        new PNotify({title:lang['Invalid Data'],text:d.msg || lang['Failed'],type:'error'})
                    }
                })
            }
        })
    })
    monitorStatesPage.on('click','.delete-monitor-state-preset',function(e){
        var presetName = $(this).parents('[data-preset-name]').attr('data-preset-name')
        $.confirm.create({
            title: lang['Delete Monitor States Preset'],
            body: lang.deleteMonitorStateText1,
            clickOptions: {title: lang.Delete, class: 'btn-danger'},
            clickCallback: function(){
                $.post(`${getApiPrefix(`monitorStates`)}/${encodeURIComponent(presetName)}/delete`,function(d){
                    if(d.ok === true){
                        new PNotify({title:lang.Success,text:d.msg,type:'success'})
                        delete(monitorStatesLoaded[presetName])
                        drawMonitorStatesPresets()
                    }else{
                        new PNotify({title:lang['Invalid Data'],text:d.msg || lang['Failed'],type:'error'})
                    }
                })
            }
        })
    })
})
