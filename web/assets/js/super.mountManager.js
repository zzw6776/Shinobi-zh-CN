$(document).ready(function(){
    const loadedMounts = {}
    const theEnclosure = $('#superMountManager')
    const theSearch = $('#mountManagerListSearch')
    const theTable = $('#mountManagerListTable tbody')
    const newMountForm = $('#mountManagerNewMount')
    const formTitle = $('#mountManagerFormTitle')
    const cancelEditButton = $('#mountManagerCancelEdit')
    const submitButton = $('#mountManagerSubmit')
    const advancedBlock = $('#mountManagerAdvanced')
    const optionsField = newMountForm.find('[name="options"]')
    const sourceHint = $('#mountSourceHint')
    let editingMountPoint = null
    let editingMountType = null
    let currentVideosDir = ''
    // Per type : what a Source looks like, whether credentials apply, and the options a
    // working mount of that type normally needs. The old form asked for one raw fstab
    // string for all three, prefilled with CIFS credentials that read as real values.
    const MOUNT_TYPES = {
        cifs: {
            sourcePlaceholder: '//192.168.1.200/shared/folder',
            hint: lang.mountSourceHintCifs || 'The share as //server/share - for example //192.168.1.200/video',
            hasCredentials: true,
            baseOptions: ['iocharset=utf8','file_mode=0777','dir_mode=0777'],
        },
        nfs: {
            sourcePlaceholder: '192.168.1.200:/export/video',
            hint: lang.mountSourceHintNfs || 'The export as host:/path - for example 192.168.1.200:/export/video',
            hasCredentials: false,
            baseOptions: ['soft','timeo=30'],
        },
        ext4: {
            sourcePlaceholder: '/dev/sda1',
            hint: lang.mountSourceHintExt4 || 'The device or disk image - for example /dev/sda1 or UUID=1234-abcd',
            hasCredentials: false,
            baseOptions: ['defaults'],
        },
    }
    function getMountTypeInfo(){
        return MOUNT_TYPES[newMountForm.find('[name="mountType"]').val()] || MOUNT_TYPES.cifs
    }
    // fstab lines end in the dump/pass fields. They are always "0 0" for these mounts and
    // mean nothing to anyone filling this form in, so they are appended here rather than
    // being something a user has to know to type.
    const FSTAB_TAIL = '0 0'
    // Everything this form models. Anything in an existing mount's options that is NOT in
    // here is carried through untouched when the string is rebuilt - otherwise editing a
    // mount that uses, say, `vers=3.0`, `uid=`, `noserverino` or `sec=ntlmssp` would
    // quietly drop the option that made it work.
    const MANAGED_OPTIONS = ['username','password','domain','credentials','guest','rw','ro']
    let preservedOptions = []
    function isManagedOption(part){
        const key = part.split('=')[0]
        return MANAGED_OPTIONS.indexOf(key) > -1
    }
    function splitOptions(optionsString){
        return `${optionsString || ''}`.trim().replace(/\s+\d+\s+\d+$/,'')
            .split(',')
            .map(function(part){ return part.trim() })
            .filter(Boolean)
    }
    function buildOptionsString(){
        const typeInfo = getMountTypeInfo()
        const values = newMountForm.serializeObject()
        const parts = []
        if(typeInfo.hasCredentials){
            switch(values.credentialsMode){
                case'guest':
                    parts.push('guest')
                break;
                case'file':
                    // The file holds username/password/domain itself, so none of those
                    // belong in fstab alongside it.
                    if(values.credentialsFile)parts.push(`credentials=${values.credentialsFile}`)
                break;
                default:
                    if(values.mountUsername)parts.push(`username=${values.mountUsername}`)
                    if(values.mountPassword)parts.push(`password=${values.mountPassword}`)
                    if(values.mountDomain)parts.push(`domain=${values.mountDomain}`)
                break;
            }
        }
        // Always rw. Shinobi writes recordings into the mount, so read-only is never a
        // valid choice here - the server enforces the same thing.
        parts.push('rw')
        // Options this form does not model, from the mount being edited, kept as they were.
        preservedOptions.forEach(function(option){
            if(parts.indexOf(option) === -1)parts.push(option)
        })
        // Type defaults are for mounts being CREATED. Adding them to an existing mount just
        // because a password was changed would alter how it behaves - file_mode=0777 on a
        // share that intentionally had no file_mode is a permissions change nobody asked
        // for. They do apply if the type itself was changed, since the old type's defaults
        // are meaningless then.
        const isEditingSameType = editingMountPoint && values.mountType === editingMountType
        if(!isEditingSameType){
            typeInfo.baseOptions.forEach(function(option){
                const key = option.split('=')[0]
                const alreadyPresent = parts.some(function(part){ return part.split('=')[0] === key })
                if(!alreadyPresent)parts.push(option)
            })
        }
        return `${parts.join(',')} ${FSTAB_TAIL}`
    }
    // Reverse of the above, so pressing Edit on an existing mount shows its credentials in
    // the fields rather than making the user pick them out of the raw string.
    function applyOptionsStringToFields(optionsString){
        const parts = splitOptions(optionsString)
        const readValue = function(key){
            const found = parts.find(function(part){ return part.indexOf(`${key}=`) === 0 })
            return found ? found.substring(key.length + 1) : ''
        }
        const credentialsFile = readValue('credentials')
        newMountForm.find('[name="mountUsername"]').val(readValue('username'))
        newMountForm.find('[name="mountPassword"]').val(readValue('password'))
        newMountForm.find('[name="mountDomain"]').val(readValue('domain'))
        newMountForm.find('[name="credentialsFile"]').val(credentialsFile)
        newMountForm.find('[name="credentialsMode"]').val(
            parts.indexOf('guest') > -1 ? 'guest' : (credentialsFile ? 'file' : 'password')
        )
        // Kept verbatim for the rebuild - see MANAGED_OPTIONS.
        preservedOptions = parts.filter(function(part){ return !isManagedOption(part) })
    }
    function refreshOptionsField(){
        optionsField.val(buildOptionsString())
    }
    function onMountTypeChange(){
        const typeInfo = getMountTypeInfo()
        newMountForm.find('[name="sourceTarget"]').attr('placeholder',typeInfo.sourcePlaceholder)
        sourceHint.text(typeInfo.hint)
        newMountForm.find('.mount-fields-cifs')[typeInfo.hasCredentials ? 'show' : 'hide']()
        refreshOptionsField()
    }
    function onCredentialsModeChange(){
        const mode = newMountForm.find('[name="credentialsMode"]').val()
        newMountForm.find('.mount-credentials')[mode === 'password' ? 'show' : 'hide']()
        newMountForm.find('.mount-credentials-file')[mode === 'file' ? 'show' : 'hide']()
    }
    function setFormToAddMode(){
        editingMountPoint = null
        editingMountType = null
        preservedOptions = []
        formTitle.text(lang['Add Mount'])
        cancelEditButton.addClass('d-none')
        newMountForm[0].reset()
        optionsField.data('userEdited',false)
        onMountTypeChange()
        onCredentialsModeChange()
    }
    function humanSize(bytes){
        if(typeof bytes !== 'number' || isNaN(bytes))return ''
        const units = ['B','KB','MB','GB','TB','PB']
        let value = bytes
        let unit = 0
        while(value >= 1024 && unit < units.length - 1){
            value = value / 1024
            ++unit
        }
        return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
    }
    // The list endpoint has always returned disk usage; nothing displayed it. Knowing a
    // mount is 98% full is the main thing a user comes to this page to find out.
    function capacityHtml(theMount){
        const capacity = theMount.capacity
        if(!capacity || !capacity.total)return `<small class="text-muted">${lang['Not Mounted'] || 'Not Mounted'}</small>`
        const readable = capacity.humanReadable || {}
        const percentText = `${capacity.percent || ''}`
        const percentNumber = parseInt(percentText,10)
        const barClass = percentNumber >= 90 ? 'bg-danger' : (percentNumber >= 75 ? 'bg-warning' : 'bg-success')
        return `
            <div class="progress mount-capacity-bar">
                <div class="progress-bar ${barClass}" role="progressbar" style="width:${isNaN(percentNumber) ? 0 : percentNumber}%"></div>
            </div>
            <small class="text-muted">${readable.used || humanSize(capacity.used)} / ${readable.total || humanSize(capacity.total)} (${percentText})</small>`
    }
    // Credentials live in the options string, so the table was printing usernames and
    // passwords in clear text to anyone looking at the screen.
    function maskedOptions(optionsString){
        return `${optionsString || ''}`.replace(/(password|passwd)=[^,\s]*/gi,'$1=••••••')
    }
    function getMountId(theMount){
        return `${theMount.mountPoint.split('/').join('_')}`
    }
    function isVideosDirMount(theMount){
        return !!currentVideosDir && currentVideosDir.indexOf(theMount.mountPoint) === 0
    }
    function drawMountToTable(theMount){
        var html = `
        <tr row-mounted="${getMountId(theMount)}">
            <td class="align-middle">
                <div>${theMount.device}</div>
                <div><small>${theMount.mountPoint}</small></div>
                ${isVideosDirMount(theMount) ? `<div><span class="badge badge-success"><i class="fa fa-download"></i> ${lang.videosDir}</span></div>` : ''}
            </td>
            <td class="align-middle">
                ${theMount.type}
            </td>
            <td class="align-middle">
                ${capacityHtml(theMount)}
            </td>
            <td class="align-middle">
                <small>${maskedOptions(theMount.options)}</small>
            </td>
            <td class="align-middle">
                <a class="btn btn-primary btn-sm cursor-pointer edit" title="${lang.Edit}"><i class="fa fa-pencil-square-o"></i></a>
                <a class="btn btn-success btn-sm cursor-pointer setVideosDir" title="${lang.videosDir}"><i class="fa fa-download"></i></a>
                <a class="btn btn-danger btn-sm cursor-pointer delete" title="${lang.Delete}"><i class="fa fa-trash-o"></i></a>
            </td>
        </tr>`
        theTable.append(html)
    }
    function drawMountsTable(data){
        theTable.empty()
        if(!data || data.length === 0){
            theTable.append(`<tr class="mount-empty-row"><td class="text-muted">${lang.noMountsText || 'No mounts have been added yet.'}</td></tr>`)
            return
        }
        $.each(data,function(n,theMount){
            drawMountToTable(theMount)
        });
    }
    function filterMountsTable(theSearch = '') {
        var searchQuery = theSearch.trim().toLowerCase();
        if(searchQuery === ''){
            theTable.find(`[row-mounted]`).show()
            return;
        }
        var rows = Object.values(loadedMounts);
        rows.forEach((row) => {
            var searchInString = JSON.stringify(row).toLowerCase();
            var theElement = theTable.find(`[row-mounted="${getMountId(row)}"]`)
            if(searchInString.indexOf(searchQuery) > -1){
                theElement.show()
            }else{
                theElement.hide()
            }
        })
    }
    function loadMounts(callback) {
        return new Promise((resolve,reject) => {
            $.getJSON(superApiPrefix + $user.sessionKey + '/mountManager/list',function(data){
                $.each(data.mounts,function(n,theMount){
                    loadedMounts[getMountId(theMount)] = theMount;
                })
                currentVideosDir = data.videosDir || ''
                drawMountsTable(data.mounts)
                resolve(data)
            })
        })
    }
    function addMount(form) {
        return new Promise((resolve,reject) => {
            $.post(superApiPrefix + $user.sessionKey + '/mountManager/mount', form,function(data){
                resolve(data)
            })
        })
    }
    function removeMount(localPath) {
        return new Promise((resolve,reject) => {
            $.post(superApiPrefix + $user.sessionKey + '/mountManager/removeMount',{
                localPath
            },function(data){
                resolve(data)
            })
        })
    }
    function setVideosDir(localPath, pathInside) {
        return new Promise((resolve,reject) => {
            $.post(superApiPrefix + $user.sessionKey + '/mountManager/setVideosDir',{
                localPath,
                pathInside
            },function(data){
                resolve(data)
            })
        })
    }
    function launchSetVideoDirConfirm(localPath){
        $.confirm.create({
            title: lang['Set New Videos Directory'],
            body: `<b>${lang['Mount Path']} : ${localPath}</b><br>${lang.setVideosDirWarning} ${lang.restartRequired}<br><br><input placeholder="${lang['Path Inside Mount']}" class="form-control" id="newVideosDirInnerPath">`,
            clickOptions: {
                class: 'btn-success',
                title: lang.Save,
            },
            clickCallback: async function(){
                const pathInside = $('#newVideosDirInnerPath').val().trim();
                const response = await setVideosDir(localPath, pathInside);
                if(response.ok){
                    new PNotify({
                        title: lang['New Videos Directory Set'],
                        text: lang.restartRequired,
                        type: 'success'
                    })
                    loadMounts()
                }else{
                    new PNotify({
                        title: lang['Action Failed'],
                        text: lang['See System Logs'],
                        type: 'danger'
                    })
                }
            }
        })
    }
    newMountForm.find('[name="mountType"]').change(onMountTypeChange)
    newMountForm.find('[name="credentialsMode"]').change(function(){
        onCredentialsModeChange()
        if(!optionsField.data('userEdited'))refreshOptionsField()
    })
    // Any of the guided fields changing rebuilds the string, unless the user has opened
    // Advanced and edited it themselves - in which case theirs is kept.
    newMountForm.on('change','[name="mountUsername"],[name="mountPassword"],[name="mountDomain"],[name="credentialsFile"]',function(){
        if(!optionsField.data('userEdited'))refreshOptionsField()
    })
    optionsField.on('input',function(){
        optionsField.data('userEdited',true)
    })
    $('#mountManagerResetOptions').click(function(){
        optionsField.data('userEdited',false)
        refreshOptionsField()
    })
    $('#mountManagerToggleAdvanced').click(function(){
        const icon = $(this).find('i')
        advancedBlock.toggle()
        icon.toggleClass('fa-caret-right fa-caret-down')
    })
    cancelEditButton.click(function(){
        setFormToAddMode()
    })
    newMountForm.submit(async function(e){
        e.preventDefault();
        const values = newMountForm.serializeObject();
        // Only the four fields the API takes are sent; the rest are inputs to the options
        // string that was built from them.
        const form = {
            sourceTarget: `${values.sourceTarget || ''}`.trim(),
            localPath: `${values.localPath || ''}`.trim(),
            mountType: values.mountType,
            options: `${values.options || buildOptionsString()}`.trim(),
        }
        if(!form.sourceTarget || !form.localPath){
            new PNotify({
                title: lang['Failed to Add Mount'],
                text: lang['Invalid Data'],
                type: 'danger'
            })
            return false;
        }
        submitButton.prop('disabled',true).html(`<i class="fa fa-spinner fa-pulse"></i> ${lang['Please Wait...']}`)
        const response = await addMount(form);
        submitButton.prop('disabled',false).html(`<i class="fa fa-check"></i> ${lang.Save}`)
        const notify = {
            title: lang['Mount Added'],
            text: lang.mountAddedText,
            type: 'success'
        }
        if(!response.ok){
            notify.title = lang['Failed to Add Mount']
            // The mount command's own stderr is the only thing that explains WHY (bad
            // credentials, no route to host, wrong share name), so it is shown as is.
            notify.text = typeof response.error === 'string' ? response.error : JSON.stringify(response.error || {})
            notify.type = 'danger'
            notify.hide = false
        }else{
            const theMount = response.mount
            const mountId = getMountId(theMount);
            theTable.find('.mount-empty-row').remove()
            theTable.find(`[row-mounted="${mountId}"]`).remove()
            loadedMounts[mountId] = theMount;
            drawMountToTable(theMount);
            setFormToAddMode()
            // Redraw from the server so the new row shows real capacity rather than only
            // what was typed into the form.
            loadMounts()
        }
        new PNotify(notify)
        return false;
    });
    theTable.on('click','.delete', async function(e){
        const el = $(this).parents('[row-mounted]')
        const mountId = el.attr('row-mounted');
        const theMount = loadedMounts[mountId]
        const localPath = theMount.mountPoint
        $.confirm.create({
            title: lang['Delete Mount'],
            body: `<b>${lang['Mount Path']} : ${localPath} (${theMount.type})</b><br><small>${theMount.device}</small><br>${lang.setVideosDirWarning}${isVideosDirMount(theMount) ? `<br><br><b class="text-warning">${lang.deletingVideosDirMountWarning || 'This mount currently holds the Videos Directory. Removing it will put the Videos Directory back to the default location.'}</b>` : ''}`,
            clickOptions: {
                class: 'btn-danger',
                title: lang.Delete,
            },
            clickCallback: async function(){
                const response = await removeMount(localPath);
                if(response.ok){
                    el.remove()
                    delete loadedMounts[mountId]
                    if(response.videosDirWasReset){
                        new PNotify({
                            title: lang['New Videos Directory Set'],
                            text: lang.restartRequired,
                            type: 'warning'
                        })
                    }
                    loadMounts()
                }else{
                    new PNotify({
                        title: lang['Failed to Remove Mount'],
                        text: lang['See System Logs'],
                        type: 'danger'
                    })
                }
            }
        })
    })
    theTable.on('click','.edit', async function(e){
        const el = $(this).parents('[row-mounted]')
        const mountId = el.attr('row-mounted');
        const theMount = loadedMounts[mountId]
        editingMountPoint = theMount.mountPoint
        editingMountType = theMount.type
        newMountForm.find('[name="sourceTarget"]').val(theMount.device)
        newMountForm.find('[name="localPath"]').val(theMount.mountPoint)
        newMountForm.find('[name="mountType"]').val(theMount.type)
        optionsField.val(theMount.options).data('userEdited',false)
        onMountTypeChange()
        applyOptionsStringToFields(theMount.options)
        onCredentialsModeChange()
        // The options were just parsed into the fields, so rebuilding from them would be a
        // no-op at best and would drop an option this form does not model at worst.
        optionsField.val(theMount.options)
        // Editing used to silently repopulate a form far up the page, with nothing saying
        // it had happened and no way back to adding.
        formTitle.text(`${lang.Edit} : ${theMount.mountPoint}`)
        cancelEditButton.removeClass('d-none')
        $('html,body').animate({ scrollTop: newMountForm.offset().top - 20 },300)
    })
    theTable.on('click','.setVideosDir', function(e){
        const el = $(this).parents('[row-mounted]')
        const mountId = el.attr('row-mounted');
        const theMount = loadedMounts[mountId]
        const localPath = theMount.mountPoint
        launchSetVideoDirConfirm(localPath)
    })
    theEnclosure.on('click','.setDefaultVideosDir', function(e){
        launchSetVideoDirConfirm('__DIR__/videos')
    })
    // keyup, not keydown : on keydown the field still holds the value from before this
    // keystroke, so the list was always filtering one character behind.
    theSearch.keyup(function(){
        const value = $(this).val().trim()
        filterMountsTable(value)
    })
    onMountTypeChange()
    onCredentialsModeChange()
    onInitSuccess(loadMounts)
})
