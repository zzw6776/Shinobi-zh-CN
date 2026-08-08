module.exports = function(s,config,lang,app,io){
    s.uploaderFields = []
    s.cloudDisksLoaded = []
    // Every uploader that declares an `enableFlag` lands here. The registry is what drives
    // the Superuser-only permissions, the forced credential merge and the save protection
    // below, so an uploader added later (including by a plugin) picks all three up for free.
    s.cloudUploaderRegistry = []
    require('./uploaders/loader.js')(s,config,lang,app,io)
    const loadedLibraries = {
        //cloud storage
        s3based: require('./uploaders/s3based.js'),
        backblazeB2: require('./uploaders/backblazeB2.js'),
        amazonS3: require('./uploaders/amazonS3.js'),
        webdav: require('./uploaders/webdav.js'),
        //local storage
        mnt: require('./uploaders/mount.js'),
        //oauth
        googleDrive: require('./uploaders/googleDrive.js'),
        //simple storage
        sftp: require('./uploaders/sftp.js'),
    }
    function buildYesNoField(fieldLabel,detailName,defaultValue){
        return {
            "field": fieldLabel,
            "name": `detail=${detailName}`,
            "default": defaultValue,
            "fieldType": "select",
            "possible": [
                { "name": lang.No, "value": "0" },
                { "name": lang.Yes, "value": "1" },
            ]
        }
    }
    // Replace the anchor left in definitions/base.js with one enable toggle, and where the
    // uploader supports server side credentials one force toggle, per registered uploader.
    function buildAdminAccountUploaderFields(){
        const fields = []
        s.cloudUploaderRegistry.forEach((uploader) => {
            // Four of these labels already existed as whole phrases and are translated in the
            // language files, so prefer those and only compose a label for the uploaders that
            // never had one.
            fields.push(buildYesNoField(
                lang[`Can use ${uploader.name}`] || `${lang['Can use']} ${uploader.name}`,
                uploader.enableFlag,
                '1'
            ))
            if(uploader.globalFlag){
                fields.push(Object.assign(buildYesNoField(
                    `${lang['Force']} ${uploader.name}`,
                    uploader.globalFlag,
                    '0'
                ),{
                    "description": `${lang.forceCloudUploaderText} (config.cloudUploaders.${uploader.globalConfigKey})`,
                }))
            }
        })
        return fields
    }
    // Rebuilt rather than appended to, because an async uploader registers after this file
    // has finished running. Each generated field is tagged so the previous set can be found
    // and replaced in place, keeping the fields at the anchor's position in the form.
    const adminAccountFields = s.definitions["Admin Account Settings"].blocks["CloudUploaders"].info
    let uploaderFieldsIndex = adminAccountFields.findIndex((field) => field && field.cloudUploaderPermissionsAnchor)
    let uploaderFieldsCount = uploaderFieldsIndex > -1 ? 1 : 0
    function refreshAdminAccountUploaderFields(){
        if(uploaderFieldsIndex === -1)return
        const generated = buildAdminAccountUploaderFields().map((field) => {
            return Object.assign(field,{ isGeneratedCloudUploaderField: true })
        })
        adminAccountFields.splice(uploaderFieldsIndex,uploaderFieldsCount,...generated)
        uploaderFieldsCount = generated.length
    }
    // The Superuser panel's Cloud Uploaders tab. Built from each uploader's own field list
    // so it stays in step with the uploader rather than repeating its fields here. Two
    // differences from the Account Settings version of the same fields: the `detail=` prefix
    // is dropped, because these are stored as plain keys under config.cloudUploaders, and
    // the progressive-disclosure classes are stripped so every field is visible -- there is
    // no "Autosave" toggle to reveal them in this context.
    function buildGlobalUploaderField(field){
        const globalField = Object.assign({},field)
        globalField.name = `${field.name || ''}`.replace(/^detail=/,'')
        delete globalField.hidden
        delete globalField['form-group-class']
        delete globalField['form-group-class-pre-layer']
        delete globalField['form-group-class-pre-pre-layer']
        delete globalField.selector
        delete globalField.attribute
        // Secret fields render as type=password, which browsers will happily autofill with
        // any credential saved for this origin -- saving the tab would then write that into
        // conf.json as the uploader's key.
        if(globalField.fieldType === 'password'){
            globalField.attribute = 'autocomplete="new-password"'
        }
        return globalField
    }
    function refreshGlobalUploaderDefinition(){
        const blocks = {}
        s.cloudUploaderRegistry.forEach((uploader) => {
            if(!uploader.globalFlag)return
            const fields = (uploader.fields || [])
                .filter((field) => field && typeof field.name === 'string' && field.name.indexOf('detail=') === 0)
                .map(buildGlobalUploaderField)
            if(fields.length === 0)return
            blocks[uploader.globalConfigKey] = {
                "name": uploader.name,
                "headerTitle": `${uploader.name} <small class="text-muted">config.cloudUploaders.${uploader.globalConfigKey}</small>`,
                "color": "forestgreen",
                "section-pre-class": "col-md-6",
                "attribute": `cloud-uploader-key="${uploader.globalConfigKey}"`,
                "info": fields,
            }
        })
        // Mutated in place rather than reassigned: libs/definitions.js already holds a
        // shallow copy of s.definitions, so replacing the whole section would never reach
        // the copy the pages actually render from.
        const targetBlocks = s.definitions["Global Cloud Uploaders"].blocks
        Object.keys(targetBlocks).forEach((key) => { delete targetBlocks[key] })
        Object.assign(targetBlocks,blocks)
    }
    function registerUploader(loadedLib){
        if(!loadedLib || !loadedLib.info)return
        loadedLib.isFormGroupGroup = true
        if(loadedLib.enableFlag){
            const uploader = {
                id: loadedLib.uploaderId,
                name: loadedLib.name,
                enableFlag: loadedLib.enableFlag,
                globalFlag: loadedLib.globalFlag || null,
                globalConfigKey: loadedLib.globalConfigKey || null,
            }
            uploader.fields = loadedLib.info || []
            s.cloudUploaderRegistry.push(uploader)
            // A forced uploader runs entirely on server side credentials, so its section
            // is taken out of the Admin's own Account Settings. Their stored values are
            // not used and must not be presented as if they were.
            if(uploader.globalFlag){
                loadedLib.evaluation = `(${loadedLib.evaluation || 'true'}) && details.${uploader.globalFlag} !== '1'`
            }
            refreshAdminAccountUploaderFields()
            refreshGlobalUploaderDefinition()
        }
        s.definitions["Account Settings"].blocks["Uploaders"].info.push(loadedLib)
    }
    Object.keys(loadedLibraries).forEach((key) => {
        var loadedLib = loadedLibraries[key](s,config,lang,app,io)
        // webdav.js is an async module, so it hands back a promise rather than the
        // definition. Registering on resolve keeps it in the registry instead of being
        // silently skipped, which is what used to happen.
        if(loadedLib instanceof Promise){
            loadedLib.then(registerUploader).catch((err) => {
                console.error('Cloud uploader failed to load',key,err)
            })
        }else{
            registerUploader(loadedLib)
        }
    })
    // Server side credentials for a forced uploader. Merged into the account's details so
    // that everything downstream -- the uploader's own client, and `s.group[ke].init`, which
    // is what the upload functions read bucket, directory and autosave from -- sees one
    // consistent set of values. Without this the client would authenticate with the forced
    // credentials while still writing to whatever bucket the Admin had typed in.
    s.applyForcedCloudUploaderDetails = function(details){
        if(!details || !config.cloudUploaders)return details
        s.cloudUploaderRegistry.forEach((uploader) => {
            if(!uploader.globalFlag)return
            if(details[uploader.globalFlag] !== '1')return
            const forcedValues = config.cloudUploaders[uploader.globalConfigKey]
            if(!forcedValues)return
            Object.assign(details,forcedValues)
        })
        return details
    }
    // Both flags are Superuser only. `d.d` is what is already stored for the account and
    // `d.formDetails` is what the Admin just submitted, so copying one over the other drops
    // any attempt to change them from the dashboard. Registry driven so a new uploader is
    // protected the moment it is registered.
    s.beforeAccountSave(function(d){
        s.cloudUploaderRegistry.forEach((uploader) => {
            d.formDetails[uploader.enableFlag] = d.d[uploader.enableFlag]
            if(uploader.globalFlag){
                d.formDetails[uploader.globalFlag] = d.d[uploader.globalFlag]
            }
        })
    })
}
