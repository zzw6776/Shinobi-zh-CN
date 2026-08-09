var fs = require('fs');
module.exports = (s,config,lang) => {
    const {
        deleteMonitor,
    } = require('../monitor/utils.js')(s,config,lang)
    function getDefaultUserDetails(options = {}){
        return {
            "factorAuth":"0",
            "size": options.diskLimit || options.size || '',
            "days":"",
            "event_days":"",
            "log_days":"",
            "max_camera": options.cameraLimit || options.max_camera || '',
            "permissions":"all",
            "edit_size":"1",
            "edit_days":"1",
            "edit_event_days":"1",
            "edit_log_days":"1",
            "use_admin":"1",
            "use_aws_s3":"1",
            "use_whcs":"1",
            "use_sftp":"1",
            "use_webdav":"1",
            "use_discordbot":"1",
            "use_ldap":"1",
            // New accounts get the Plugin Manager; accounts that predate the option have no
            // value stored and are treated as No.
            "use_plugin_manager":"1",
            "use_remote_access":"1",
            "use_system_control":"1",
            "aws_use_global":"0",
            "b2_use_global":"0",
            "webdav_use_global":"0"
        }
    }
    /**
     * Checks the real filesystem holding a directory, so that a `sizeLimit` set larger
     * than the volume itself cannot fill the disk without ever triggering a purge.
     * Deliberately uncached, so that a purge loop driven by this stops as soon as
     * enough space has actually been recovered.
     * @param {string} directory - Path to check the containing filesystem of.
     */
    const isFilesystemUnderPressure = async function(directory){
        if(config.disableDiskPressureCheck === true || !directory || !fs.promises.statfs){
            return false
        }
        try{
            const stats = await fs.promises.statfs(directory)
            const totalSpace = stats.blocks * stats.bsize
            const availableSpace = stats.bavail * stats.bsize
            if(totalSpace > 0){
                const percentUsed = ((totalSpace - availableSpace) / totalSpace) * 100
                if(percentUsed >= (config.maxDiskPercentUsed || 95)){
                    s.debugLog(`Disk pressure on ${directory} : ${percentUsed.toFixed(1)}% used`)
                    return true
                }
            }
        }catch(err){
            s.debugLog(err)
        }
        return false
    }
    // A purge driven only by disk pressure is capped, because the space may be taken
    // by something that is not video at all. Without a cap it would delete the entire
    // archive and still never get under the threshold.
    const maxDiskPressureBatches = () => config.maxDiskPressurePurgeBatches || 10
    const deleteSetOfVideos = function(options,callback){
        const groupKey = options.groupKey
        const err = options.err
        const videos = options.videos
        const storageIndex = options.storageIndex
        const reRunCheck = options.reRunCheck
        var completedCheck = 0
        var whereGroup = []
        var whereQuery = [
            ['ke','=',groupKey],
        ]
        if(videos){
            videos.forEach(function(video){
                video.dir = s.getVideoDirectory(video) + s.formattedTime(video.time) + '.' + video.ext
                const queryGroup = {
                    mid: video.mid,
                    time: video.time,
                }
                if(whereGroup.length > 0)queryGroup.__separator = 'or'
                whereGroup.push(queryGroup)
                fs.rm(video.dir,function(err){
                    ++completedCheck
                    if(err){
                        fs.stat(video.dir,function(err){
                            if(!err){
                                fs.unlink(video.dir)
                            }
                        })
                    }
                    const whereGroupLength = whereGroup.length
                    if(whereGroupLength > 0 && whereGroupLength === completedCheck){
                        whereQuery[1] = whereGroup
                        s.knexQuery({
                            action: "delete",
                            table: "Videos",
                            where: whereQuery
                        },(err,info) => {
                            setTimeout(reRunCheck,1000)
                        })
                    }
                })
                if(storageIndex){
                    s.setDiskUsedForGroupAddStorage(groupKey,{
                        size: -(video.size/1048576),
                        storageIndex: storageIndex
                    })
                }else{
                    s.setDiskUsedForGroup(groupKey,-(video.size/1048576))
                }
                s.tx({
                    f: 'video_delete',
                    ff: 'over_max',
                    filename: s.formattedTime(video.time)+'.'+video.ext,
                    mid: video.mid,
                    ke: video.ke,
                    time: video.time,
                    end: s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                },'GRP_'+groupKey)
            })
        }else{
            console.log(err)
        }
        if(whereGroup.length === 0){
            if(callback)callback()
        }
    }
    const deleteSetOfTimelapseFrames = function(options,callback){
        const groupKey = options.groupKey
        const err = options.err
        const frames = options.frames
        const storageIndex = options.storageIndex
        var whereGroup = []
        var whereQuery = [
            ['ke','=',groupKey],
            []
        ]
        var completedCheck = 0
        if(frames){
            frames.forEach(function(frame){
                const details = s.parseJSON(frame.details)
                var selectedDate = frame.filename.split('T')[0]
                var dir = s.getTimelapseFrameDirectory(frame)
                var timeFolder = s.formattedTime(new Date(frame.time),'YYYY-MM-DD')
                var fileLocationMid = `${dir}${timeFolder}/` + frame.filename
                const queryGroup = {
                    mid: frame.mid,
                    time: frame.time,
                }
                if(whereGroup.length > 0)queryGroup.__separator = 'or'
                whereGroup.push(queryGroup)
                fs.rm(fileLocationMid,function(err){
                    ++completedCheck
                    const whereGroupLength = whereGroup.length
                    if(whereGroupLength > 0 && whereGroupLength === completedCheck){
                        whereQuery[1] = whereGroup
                        s.knexQuery({
                            action: "delete",
                            table: "Timelapse Frames",
                            where: whereQuery
                        },() => {
                            deleteTimelapseFrames(groupKey,callback)
                        })
                    }
                })
                if(storageIndex){
                    s.setDiskUsedForGroupAddStorage(groupKey,{
                        size: -(frame.size/1048576),
                        storageIndex: storageIndex
                    },'timelapseFrames')
                }else{
                    s.setDiskUsedForGroup(groupKey,-(frame.size/1048576),'timelapseFrames')
                }
                // s.tx({
                //     f: 'timelapse_frame_delete',
                //     ff: 'over_max',
                //     filename: s.formattedTime(video.time)+'.'+video.ext,
                //     mid: video.mid,
                //     ke: video.ke,
                //     time: video.time,
                //     end: s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                // },'GRP_'+groupKey)
            })
        }else{
            console.log(err)
        }
        if(whereGroup.length === 0){
            if(callback)callback()
        }
    }
    const deleteSetOfFileBinFiles = function(options,callback){
        const groupKey = options.groupKey
        const err = options.err
        const files = options.files
        var whereGroup = []
        var whereQuery = [
            ['ke','=',groupKey],
            []
        ]
        var completedCheck = 0
        if(files){
            files.forEach(function(file){
                var dir = s.getFileBinDirectory(file)
                s.debugLog(`deleting FileBin File`,`${file}`,dir)
                var fileLocationMid = `${dir}` + file.name
                const queryGroup = {
                    mid: file.mid,
                    name: file.name,
                }
                if(whereGroup.length > 0)queryGroup.__separator = 'or'
                whereGroup.push(queryGroup)
                fs.rm(fileLocationMid,function(err){
                    ++completedCheck
                    if(err){
                        fs.stat(fileLocationMid,function(err){
                            if(!err){
                                fs.unlink(fileLocationMid)
                            }
                        })
                    }
                    const whereGroupLength = whereGroup.length
                    if(whereGroupLength > 0 && whereGroupLength === completedCheck){
                        whereQuery[1] = whereGroup
                        s.knexQuery({
                            action: "delete",
                            table: "Files",
                            where: whereQuery
                        },() => {
                            deleteFileBinFiles(groupKey,callback)
                        })
                    }
                })
                s.setDiskUsedForGroup(groupKey,-(file.size/1048576),'fileBin')
            })
        }else{
            console.log(err)
        }
        if(whereGroup.length === 0){
            if(callback)callback()
        }
    }
    const deleteAddStorageVideos = function(groupKey,callback){
        reRunCheck = function(){
            s.debugLog('deleteAddStorageVideos')
            return deleteAddStorageVideos(groupKey,callback)
        }
        var currentStorageNumber = 0
        var pressureBatches = 0
        function readStorageArray(){
            const theGroup = s.group[groupKey]
            setTimeout(async function(){
                reRunCheck = readStorageArray
                var storage = s.listOfStorage[currentStorageNumber]
                if(!storage){
                    //done all checks, move on to next user
                    callback()
                    return
                }
                var storageId = storage.value
                if(storageId === '' || !theGroup.addStorageUse[storageId]){
                    ++currentStorageNumber
                    readStorageArray()
                    return
                }
                var storageIndex = theGroup.addStorageUse[storageId]
                //run purge command
                const maxSize = (storageIndex.sizeLimit * (storageIndex.videoPercent / 100) * config.cron.deleteOverMaxOffset);
                const isOverSizeLimit = storageIndex.usedSpaceVideos > maxSize
                const isUnderDiskPressure = isOverSizeLimit ? false : await isFilesystemUnderPressure(storage.value)
                if(isUnderDiskPressure){
                    if(pressureBatches >= maxDiskPressureBatches()){
                        s.debugLog(`${groupKey} disk pressure purge cap reached on ${storage.value}`)
                        ++currentStorageNumber
                        readStorageArray()
                        return
                    }
                    ++pressureBatches
                }
                if(isOverSizeLimit || isUnderDiskPressure){
                    s.knexQuery({
                        action: "select",
                        columns: "*",
                        table: "Videos",
                        where: [
                            ['ke','=',groupKey],
                            ['status','!=','0'],
                            ['archive','!=',`1`],
                            ['details','LIKE',`%"dir":"${storage.value}"%`],
                        ],
                        orderBy: ['time','asc'],
                        limit: 3
                    },(err,rows) => {
                        deleteSetOfVideos({
                            groupKey: groupKey,
                            err: err,
                            videos: rows,
                            storageIndex: storageIndex,
                            reRunCheck: () => {
                                return readStorageArray()
                            }
                        },callback)
                    })
                }else{
                    ++currentStorageNumber
                    readStorageArray()
                }
            })
        }
        readStorageArray()
    }
    const deleteAddStorageTimelapseFrames = function(groupKey,callback){
        const theGroup = s.group[groupKey]
        reRunCheck = function(){
            s.debugLog('deleteAddStorageTimelapseFrames')
            return deleteAddStorageTimelapseFrames(groupKey,callback)
        }
        var currentStorageNumber = 0
        function readStorageArray(){
            setTimeout(function(){
                reRunCheck = readStorageArray
                var storage = s.listOfStorage[currentStorageNumber]
                if(!storage){
                    //done all checks, move on to next user
                    callback()
                    return
                }
                var storageId = storage.value
                if(storageId === '' || !theGroup.addStorageUse[storageId]){
                    ++currentStorageNumber
                    readStorageArray()
                    return
                }
                var storageIndex = theGroup.addStorageUse[storageId]
                //run purge command
                const maxSize = (storageIndex.sizeLimit * (storageIndex.timelapsePercent / 100) * config.cron.deleteOverMaxOffset);
                if(storageIndex.usedSpaceTimelapseFrames > maxSize){
                    s.knexQuery({
                        action: "select",
                        columns: "*",
                        table: "Timelapse Frames",
                        where: [
                            ['ke','=',groupKey],
                            ['details','LIKE',`%"dir":"${storage.value}"%`],
                        ],
                        orderBy: ['time','asc'],
                        limit: 3
                    },(err,frames) => {
                        deleteSetOfTimelapseFrames({
                            groupKey: groupKey,
                            err: err,
                            frames: frames,
                            storageIndex: storageIndex,
                            reRunCheck: () => {
                                return readStorageArray()
                            }
                        },callback)
                    })
                }else{
                    ++currentStorageNumber
                    readStorageArray()
                }
            })
        }
        readStorageArray()
    }
    const deleteMainVideos = async function(groupKey,callback,pressureBatches){
        pressureBatches = pressureBatches || 0
        const isOverSizeLimit = s.group[groupKey].usedSpaceVideos > (s.group[groupKey].sizeLimit * (s.group[groupKey].sizeLimitVideoPercent / 100) * config.cron.deleteOverMaxOffset)
        const isUnderDiskPressure = isOverSizeLimit ? false : await isFilesystemUnderPressure(s.dir.videos)
        if(isUnderDiskPressure && pressureBatches >= maxDiskPressureBatches()){
            s.debugLog(`${groupKey} disk pressure purge cap reached, space is likely used by something other than video`)
            return callback()
        }
        if(isOverSizeLimit || isUnderDiskPressure){
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Videos",
                where: [
                    ['ke','=',groupKey],
                    ['status','!=','0'],
                    ['archive','!=',`1`],
                    ['details','NOT LIKE',`%"dir"%`],
                ],
                orderBy: ['time','asc'],
                limit: 3
            },(err,rows) => {
                deleteSetOfVideos({
                    groupKey: groupKey,
                    err: err,
                    videos: rows,
                    storageIndex: null,
                    reRunCheck: () => {
                        return deleteMainVideos(groupKey,callback,isUnderDiskPressure ? pressureBatches + 1 : pressureBatches)
                    }
                },callback)
            })
        }else{
            callback()
        }
    }
    const deleteTimelapseFrames = function(groupKey,callback){
        //run purge command
        const maxSize = (s.group[groupKey].sizeLimit * (s.group[groupKey].sizeLimitTimelapseFramesPercent / 100) * config.cron.deleteOverMaxOffset);
        const currentlyUsedSize = s.group[groupKey].usedSpaceTimelapseFrames
        s.debugLog(`deleteTimelapseFrames`,`${currentlyUsedSize}/${maxSize}`)
        if(currentlyUsedSize > maxSize){
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Timelapse Frames",
                where: [
                    ['ke','=',groupKey],
                    ['details','NOT LIKE',`%"dir"%`],
                ],
                orderBy: ['time','asc'],
                limit: 3
            },(err,frames) => {
                deleteSetOfTimelapseFrames({
                    groupKey: groupKey,
                    err: err,
                    frames: frames,
                    storageIndex: null
                },callback)
            })
        }else{
            callback()
        }
    }
    const deleteFileBinFiles = function(groupKey,callback){
        if(config.deleteFileBinsOverMax === true){
            const maxSize = (s.group[groupKey].sizeLimit * (s.group[groupKey].sizeLimitFileBinPercent / 100) * config.cron.deleteOverMaxOffset);
            const currentlyUsedSize = s.group[groupKey].usedSpaceFilebin
            s.debugLog(`deleteFileBinFiles`,`${currentlyUsedSize}/${maxSize}`)
            if(currentlyUsedSize > maxSize){
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Files",
                    where: [
                        ['ke','=',groupKey],
                        ['archive','!=',`1`],
                    ],
                    orderBy: ['time','asc'],
                    limit: 1
                },(err,files) => {
                    deleteSetOfFileBinFiles({
                        groupKey: groupKey,
                        err: err,
                        files: files,
                    },callback)
                })
            }else{
                callback()
            }
        }else{
            callback()
        }
    }
    const deleteCloudVideos = function(groupKey,storageType,storagePoint,callback){
        const whereGroup = []
        const cloudDisk = s.group[groupKey].cloudDiskUse[storageType]
        //run purge command
        if(cloudDisk.sizeLimitCheck && cloudDisk.usedSpace > (cloudDisk.sizeLimit * config.cron.deleteOverMaxOffset)){
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Cloud Videos",
                where: [
                    ['status','!=','0'],
                    ['ke','=',groupKey],
                    ['type','=',storageType],
                ],
                orderBy: ['time','asc'],
                limit: 2
            },function(err,videos) {
                if(!videos)return console.log(err)
                var whereQuery = [
                    ['ke','=',groupKey],
                ]
                var didOne = false
                videos.forEach(function(video){
                    video.dir = s.getVideoDirectory(video) + s.formattedTime(video.time) + '.' + video.ext
                    const queryGroup = {
                        mid: video.mid,
                        time: video.time,
                        type: storageType,
                    }
                    if(whereGroup.length > 0)queryGroup.__separator = 'or'
                    whereGroup.push(queryGroup)
                    s.setCloudDiskUsedForGroup(groupKey,{
                        amount : -(video.size/1048576),
                        storageType : storageType
                    })
                    s.deleteVideoFromCloudExtensionsRunner({ke: groupKey},storageType,video)
                })
                const whereGroupLength = whereGroup.length
                if(whereGroupLength > 0){
                    whereQuery[1] = whereGroup
                    s.knexQuery({
                        action: "delete",
                        table: "Cloud Videos",
                        where: whereQuery
                    },() => {
                        deleteCloudVideos(groupKey,storageType,storagePoint,callback)
                    })
                }else{
                    callback()
                }
            })
        }else{
            callback()
        }
    }
    const deleteCloudTimelapseFrames = function(groupKey,storageType,storagePoint,callback){
        const whereGroup = []
        var cloudDisk = s.group[groupKey].cloudDiskUse[storageType]
        //run purge command
        if(cloudDisk.usedSpaceTimelapseFrames > (cloudDisk.sizeLimit * (s.group[groupKey].sizeLimitTimelapseFramesPercent / 100) * config.cron.deleteOverMaxOffset)){
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Cloud Timelapse Frames",
                where: [
                    ['ke','=',groupKey],
                    ['type','=',storageType],
                ],
                orderBy: ['time','asc'],
                limit: 3
            },(err,frames) => {
                if(!frames)return console.log(err)
                var whereQuery = [
                    ['ke','=',groupKey],
                ]
                frames.forEach(function(frame){
                    frame.dir = s.getVideoDirectory(frame) + s.formattedTime(frame.time) + '.' + frame.ext
                    const queryGroup = {
                        mid: frame.mid,
                        time: frame.time,
                        type: storageType,
                    }
                    if(whereGroup.length > 0)queryGroup.__separator = 'or'
                    whereGroup.push(queryGroup)
                    s.setCloudDiskUsedForGroup(groupKey,{
                        amount : -(frame.size/1048576),
                        storageType : storageType
                    })
                    s.onDeleteTimelapseFrameFromCloudExtensionsRunner({ke: groupKey},storageType,frame)
                })
                const whereGroupLength = whereGroup.length
                if(whereGroupLength > 0){
                    whereQuery[1] = whereGroup
                    s.knexQuery({
                        action: "delete",
                        table: "Cloud Timelapse Frames",
                        where: whereQuery
                    },() => {
                        deleteCloudTimelapseFrames(groupKey,storageType,storagePoint,callback)
                    })
                }else{
                    callback()
                }
            })
        }else{
            callback()
        }
    }
    async function resetAllStorageCounters(groupKey){
        // recount from the database. this used to emit deltas of `0` (which changed
        // nothing) and hand the emitter storage keys instead of storage objects, so
        // the counters were never actually reset after a storage limit change.
        const theGroup = s.group[groupKey]
        if(!theGroup)return
        const { rows } = await s.knexQueryPromise({
            action: "select",
            columns: "ke,uid,mail,details",
            table: "Users",
            where: [
                ['ke','=',groupKey],
                ['details','NOT LIKE',`%"sub"%`],
            ],
            limit: 1,
        });
        const user = rows && rows[0]
        if(!user)return
        await loadDiskUseForUser(user)
        s.sendDiskUsedAmountToClients(groupKey)
    }
    function createAdminUser(user){
        return new Promise((resolve,reject) => {
            const detailsColumn = Object.assign(getDefaultUserDetails(user),s.parseJSON(user.details) || {});
            const insertQuery = {
                ke: user.ke || s.gid(7),
                uid: user.uid || s.gid(6),
                mail: user.mail,
                pass: s.createHash(user.initialPassword || user.pass || s.gid()),
                details: JSON.stringify(detailsColumn)
            }
            s.knexQuery({
                action: "insert",
                table: "Users",
                insert: insertQuery
            },function(err,users) {
                resolve({
                    ok: !err,
                    inserted: !err ? insertQuery : undefined,
                    err: err
                })
            })
        })
    }
    async function getAdminUser(groupKey, uid){
        const { rows } = await s.knexQueryPromise({
            action: "select",
            columns: "ke,uid,details,mail",
            table: "Users",
            where: [
                ['uid','=', uid],
                ['ke','=', groupKey],
            ],
            limit: 1,
        });
        try{
            const user = rows[0];
            user.details = JSON.parse(user.details)
            return user
        }catch(err){
            s.systemLog(err)
            return null;
        }
    }
    async function legacyCreateAdminUser(form, existanceCheckBy = 'mail', doPasswordHash = true){
        const response = { ok: false }
        const { rows: users } = await s.knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Users",
            limit: 1,
            where: [
                [existanceCheckBy,'=',form[existanceCheckBy]]
            ]
        });
        if(users[0]){
            response.msg = lang['Already exists'];
        }else{
            form.uid = s.gid()
            if(!form.ke){
                form.ke = s.gid()
            }else{
                form.ke = form.ke.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '').trim()
            }
            if(!s.group[form.ke]){
                response.ok = true
                //check if "details" is object
                if(form.details instanceof Object){
                    form.details = JSON.stringify(Object.assign(getDefaultUserDetails(), form.details))
                }else{
                    try{
                        form.details = JSON.parse(form.details)
                        form.details = Object.assign(getDefaultUserDetails(), form.details)
                    }catch(err){
                        response.error = err.toString()
                        form.details = getDefaultUserDetails()
                    }
                    form.details = JSON.stringify(form.details)
                }
                const insertQuery = {
                    ke: form.ke,
                    uid: form.uid,
                    mail: form.mail,
                    pass: doPasswordHash ? s.createHash(form.pass) : form.pass,
                    details: form.details
                };
                await s.knexQueryPromise({
                    action: "insert",
                    table: "Users",
                    insert: insertQuery
                });
                s.tx({f:'add_account',details:form.details,ke:form.ke,uid:form.uid,mail:form.mail},'$')
                response.user = Object.assign({},form)
                //init user
                s.loadGroup(form)
                s.loadGroupApps(form)
                await loadDiskUseForUser(insertQuery)
                await loadCloudDiskUseForUser(insertQuery)
            }else{
                response.msg = lang["Group with this key exists already"]
            }
        }
        return response
    }
    async function legacyEditAdminUser(account, form, existanceCheckBy = 'mail', doPasswordHash = true){
        // account = target account (mail, uid, ke)
        // form = changes to be made
        const response = { ok: false }
        const { rows: users } = await s.knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Users",
            limit: 1,
            where: [
                [existanceCheckBy,'=',account[existanceCheckBy]]
            ]
        });
        const user = users[0]
        if(user){
            var details = JSON.parse(user.details)
            if(form.pass && form.pass !== ''){
               if(form.pass === form.password_again || form.pass_again){
                   form.pass = doPasswordHash ? s.createHash(form.pass) : form.pass;
               }else{
                   response.code = 'PASSWORD_MISMATCH'
                   response.msg = lang["Passwords Don't Match"]
                   return response
               }
            }else{
                delete(form.pass);
            }
            delete(form.password_again);
            delete(form.pass_again);
            delete(form.ke);
            form.details = s.stringJSON(Object.assign(details,s.parseJSON(form.details)))
            const { err } = await s.knexQueryPromise({
                action: "update",
                table: "Users",
                update: form,
                where: [
                    ['mail','=',account.mail],
                ]
            });
            if(err){
                console.log(err)
                response.code = 'UPDATE_ERROR'
                response.error = err
                response.msg = lang.AccountEditText1
            }else{
                response.ok = true
                s.tx({f:'edit_account',form:form,ke:account.ke,uid:account.uid},'$')
                s.unloadGroupApps(account)
                delete(s.group[account.ke].init);
                s.loadGroupApps(account)
            }
        }else{
            response.code = 'NOT_FOUND'
            response.msg = lang['User Not Found']
        }
        return response
    }
    async function legacyDeleteUser({
        account,
        deleteSubAccounts,
        deleteMonitors,
        stopMonitors = true,
        deleteVideos,
        deleteEvents,
        systemAction,
    }){
        const response = { ok: true }
        try{
            await s.knexQueryPromise({
                action: "delete",
                table: "Users",
                where: {
                    ke: account.ke,
                    uid: account.uid,
                    mail: account.mail,
                }
            })
            await s.knexQueryPromise({
                action: "delete",
                table: "API",
                where:  {
                    ke: account.ke,
                    uid: account.uid,
                }
            })
            if(deleteSubAccounts){
                await s.knexQueryPromise({
                    action: "delete",
                    table: "Users",
                    where:  {
                        ke: account.ke,
                    }
                })
            }
            if(deleteMonitors || stopMonitors){
                const { rows: monitors } = await s.knexQueryPromise({
                    action: "select",
                    columns: "*",
                    table: "Monitors",
                    where:  {
                        ke: account.ke,
                    }
                });
                if(monitors && monitors[0]){
                    if(deleteMonitors){
                        monitors.forEach(function({ ke: groupKey, mid: monitorId }){
                            deleteMonitor({
                                ke: groupKey,
                                mid: monitorId,
                                user: systemAction ? '$SYSTEM' : account.uid,
                                deleteFiles: true,
                            })
                        })
                    }else if(stopMonitors){
                        monitors.forEach(function(monitor){
                            s.camera('stop',monitor)
                        })
                    }
                }
            }
            if(deleteVideos){
                await s.knexQueryPromise({
                    action: "delete",
                    table: "Videos",
                    where:  {
                        ke: account.ke,
                    }
                })
                fs.rm(s.dir.videos+account.ke,function(err){
                    s.debugLog(err)
                })
            }
            if(deleteEvents){
                await s.knexQueryPromise({
                    action: "delete",
                    table: "Events",
                    where:  {
                        ke: account.ke,
                    }
                })
            }
            s.unloadGroupApps(account);
            delete(s.group[account.ke])
            s.runExtensionsForArray('onAccountDelete', null, [
                account,
                {
                    deleteSubAccounts,
                    deleteMonitors,
                    stopMonitors,
                    deleteVideos,
                    deleteEvents,
                    systemAction,
                }
            ]);
            // delete(s.group[account.ke])
            s.tx({
                f: 'delete_account',
                ke: account.ke,
                uid: account.uid,
                mail: account.mail
            },'$')
        }catch(err){
            console.log(err)
            response.ok = true
            response.err = err.toString()
        }
        return response
    }
    async function loadCloudDiskUseForUser(user,callback){
        var userDetails = JSON.parse(user.details)
        user.cloudDiskUse = {}
        user.size = 0
        user.limit = userDetails.size
        s.cloudDisksLoaded.forEach(function(storageType){
            user.cloudDiskUse[storageType] = {
                usedSpace : 0,
                usedSpaceVideos : 0,
                usedSpaceTimelapseFrames : 0,
                usedSpaceFilebin : 0,
                firstCount : 0
            }
            if(s.cloudDiskUseStartupExtensions[storageType])s.cloudDiskUseStartupExtensions[storageType](user,userDetails)
        })
        async function loadCloudVideos(cback){
            const { rows: videos, err } = await s.knexQueryPromise({
                action: "select",
                columns: "*",
                table: "Cloud Videos",
                where: [
                    ['ke','=',user.ke],
                    ['status','!=',0],
                ]
            });
            if(videos && videos[0]){
                videos.forEach(function(video){
                    try{
                        var storageType = video.type || JSON.parse(video.details).type
                        if(!storageType)storageType = 's3'
                        if(!user.cloudDiskUse[storageType])return
                        var videoSize = video.size / 1048576
                        user.cloudDiskUse[storageType].usedSpace += videoSize
                        user.cloudDiskUse[storageType].usedSpaceVideos += videoSize
                        ++user.cloudDiskUse[storageType].firstCount
                    }catch(err){
                        s.debugLog(err)
                    }
                })
                s.cloudDisksLoaded.forEach(function(storageType){
                    var firstCount = user.cloudDiskUse[storageType].firstCount
                    // s.systemLog(lang.startUpText1, user.mail+' : '+firstCount,storageType,user.cloudDiskUse[storageType].usedSpace)
                    delete(user.cloudDiskUse[storageType].firstCount)
                })
            }
            if(cback)cback()
        }
        async function loadCloudTimelapseFrames(cback){
            const { rows: frames, err } = await s.knexQueryPromise({
                action: "select",
                columns: "*",
                table: "Cloud Timelapse Frames",
                where: [
                    ['ke','=',user.ke],
                ]
            });
            if(frames && frames[0]){
                frames.forEach(function(frame){
                    try{
                        var storageType = JSON.parse(frame.details).type
                        if(!storageType)storageType = 's3'
                        var frameSize = frame.size / 1048576
                        user.cloudDiskUse[storageType].usedSpace += frameSize
                        user.cloudDiskUse[storageType].usedSpaceTimelapseFrames += frameSize
                    }catch(err){
                        s.debugLog(err)
                    }
                })
            }
            if(cback)cback()
        }
        await loadCloudVideos()
        await loadCloudTimelapseFrames()
        s.group[user.ke].cloudDiskUse = user.cloudDiskUse
        if(callback)callback()
    }
    function loadAddStorageDiskUseForUser(user,data,callback){
        var videos = data.videos
        var timelapseFrames = data.timelapseFrames
        var files = data.files
        var userDetails = JSON.parse(user.details)
        var userAddStorageData = s.parseJSON(userDetails.addStorage) || {}
        var currentStorageNumber = 0
        for(storage of s.listOfStorage){
            var path = storage.value
            if(!path){
                continue
            }
            var storageId = path
            var storageData = userAddStorageData[storageId] || {}
            if(!s.group[user.ke].addStorageUse[storageId])s.group[user.ke].addStorageUse[storageId] = {}
            var storageIndex = s.group[user.ke].addStorageUse[storageId]
            storageIndex.name = storage.name
            storageIndex.path = path
            storageIndex.usedSpace = 0
            storageIndex.sizeLimit = parseFloat(storageData.limit) || parseFloat(userDetails.size) || 10000
            storageIndex.videoPercent = parseFloat(storageData.videoPercent) || parseFloat(userDetails.size_video_percent) || 95
            storageIndex.timelapsePercent = parseFloat(storageData.timelapsePercent) || parseFloat(userDetails.size_timelapse_percent) || 5
            var usedSpaceVideos = 0
            var usedSpaceTimelapseFrames = 0
            var usedSpaceFilebin = 0
            if(videos && videos[0]){
                for(video of videos){
                    if(video.details.dir === storage.value){
                        usedSpaceVideos += video.size
                    }
                }
            }
            if(timelapseFrames && timelapseFrames[0]){
                for(frame of timelapseFrames){
                    if(frame.details.dir === storage.value){
                        usedSpaceTimelapseFrames += frame.size
                    }
                }
            }
            if(files && files[0]){
                for(file of files){
                    usedSpaceFilebin += file.size
                }
            }
            storageIndex.usedSpace = (usedSpaceVideos + usedSpaceTimelapseFrames + usedSpaceFilebin) / 1048576
            storageIndex.usedSpaceVideos = usedSpaceVideos / 1048576
            storageIndex.usedSpaceFilebin = usedSpaceFilebin / 1048576
            storageIndex.usedSpaceTimelapseFrames = usedSpaceTimelapseFrames / 1048576
            // s.systemLog(user.mail+' : '+path+' : '+videos.length,storageIndex.usedSpace)
            ++currentStorageNumber
        }
        if(callback)callback()
    }
    async function loadDiskUseForUser(user,callback){
        s.systemLog(lang.startUpText0, user.mail)
        var userDetails = JSON.parse(user.details)
        var usedSpaceVideos = 0
        var usedSpaceTimelapseFrames = 0
        var usedSpaceFilebin = 0
        var addStorageData = {
            files: [],
            videos: [],
            timelapseFrames: [],
        }
        s.group[user.ke].sizeLimit = parseFloat(userDetails.size) || 10000
        s.group[user.ke].sizeLimitVideoPercent = parseFloat(userDetails.size_video_percent) || 90
        s.group[user.ke].sizeLimitTimelapseFramesPercent = parseFloat(userDetails.size_timelapse_percent) || 5
        s.group[user.ke].sizeLimitFileBinPercent = parseFloat(userDetails.size_filebin_percent) || 5
        const { rows: videos, err: errVideos } = await s.knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Videos",
            where: [
                ['ke','=',user.ke],
                ['status','!=',0],
            ]
        });
        if(videos && videos[0]){
            videos.forEach(function(video){
                video.details = s.parseJSON(video.details)
                if(!video.details.dir){
                    usedSpaceVideos += video.size
                }else{
                    addStorageData.videos.push(video)
                }
            })
        }
        const { rows: timelapseFrames, err: errFrames } = await s.knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Timelapse Frames",
            where: [
                ['ke','=',user.ke],
            ]
        });
        if(timelapseFrames && timelapseFrames[0]){
            timelapseFrames.forEach(function(frame){
                frame.details = s.parseJSON(frame.details)
                if(!frame.details.dir){
                    usedSpaceTimelapseFrames += frame.size
                }else{
                    addStorageData.timelapseFrames.push(frame)
                }
            })
        }
        const { rows: files, err: errFiles } = await s.knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Files",
            where: [
                ['ke','=',user.ke],
            ]
        });
        if(files && files[0]){
            files.forEach(function(file){
                file.details = s.parseJSON(file.details)
                if(!file.details.dir){
                    usedSpaceFilebin += file.size
                }else{
                    addStorageData.files.push(file)
                }
            })
        }
        s.group[user.ke].usedSpace = (usedSpaceVideos + usedSpaceTimelapseFrames + usedSpaceFilebin) / 1048576
        s.group[user.ke].usedSpaceVideos = usedSpaceVideos / 1048576
        s.group[user.ke].usedSpaceFilebin = usedSpaceFilebin / 1048576
        s.group[user.ke].usedSpaceTimelapseFrames = usedSpaceTimelapseFrames / 1048576
        loadAddStorageDiskUseForUser(user,addStorageData)
        if(callback)callback()
    }
    return {
        getAdminUser,
        deleteSetOfVideos,
        deleteSetOfTimelapseFrames,
        deleteSetOfFileBinFiles,
        deleteAddStorageVideos,
        deleteMainVideos,
        deleteTimelapseFrames,
        deleteAddStorageTimelapseFrames,
        deleteFileBinFiles,
        deleteCloudVideos,
        deleteCloudTimelapseFrames,
        resetAllStorageCounters,
        createAdminUser,
        legacyCreateAdminUser,
        legacyEditAdminUser,
        legacyDeleteUser,
        loadCloudDiskUseForUser,
        loadAddStorageDiskUseForUser,
        loadDiskUseForUser,
    }
}
