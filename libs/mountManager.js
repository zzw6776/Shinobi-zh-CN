const path = require('path')
module.exports = (s,config,lang,app,io) => {
    // for unix-based systems only (has /etc/fstab)
    const {
        isValidPath,
    } = require('./basic/utils.js')(process.cwd(),config)
    if(s.isWin){
        app.all([
            'list',
            'mount',
            'removeMount',
            'setVideosDir',
        ].map(item => `${config.webPaths.superApiPrefix}:auth/mountManager/${item}`), function (req,res){
            s.closeJsonResponse(res, {
                ok: false,
                msg: lang.windowsCantUseFeature,
                error: lang.windowsCantUseFeature
            });
        });
        return;
    }
    const fs = require('fs')
    const {
        modifyConfiguration,
     } = require('./system/utils.js')(config)
    // An fstab source is not a filesystem path, so isValidPath is the wrong test for it :
    // NFS uses `host:/export`, CIFS uses `//server/share` and Windows hidden/admin shares
    // end in `$`. Validating sources as paths rejected every NFS mount and every admin
    // share outright. What actually matters is that the value cannot break the fstab file
    // it gets written into (whitespace separates fields, a newline would forge a whole
    // extra mount entry), so that is what is checked - and only that.
    //
    // Deliberately NOT rejecting shell metacharacters here. Neither value is ever passed
    // to a shell on this path : `update()` writes them into /etc/fstab as text and
    // `remount()` runs `mount <localPath>`, where localPath is separately checked by
    // isValidPath. Refusing them would break real setups - a Windows password is allowed
    // to contain ; & | " ', and `username=DOMAIN\user` is ordinary CIFS syntax.
    const isValidMountSource = (source) => {
        if(!source || typeof source !== 'string' || source.length > 512)return false
        // Whitespace would split into extra fstab fields (a literal space in a share name
        // is written \040 in fstab, which passes this check).
        return !/\s/.test(source)
    }
    const isValidMountOptions = (options) => {
        if(options === undefined || options === null)return true
        if(typeof options !== 'string' || options.length > 1024)return false
        // A line break is the whole risk : it would append an arbitrary extra fstab entry,
        // i.e. mount anything anywhere at next boot. Spaces are legal here because the
        // trailing dump/pass fields ("0 0") are part of this string.
        return !/[\n\r]/.test(options)
    }
    // Shinobi writes recordings into these mounts, so a read-only one is of no use to it -
    // it would mount cleanly and then fail at the point video is written, which is both far
    // from here and hard to attribute. Enforced on the API rather than only in the form,
    // because the form is not the only caller.
    const forceReadWriteOptions = (options) => {
        const raw = `${options || ''}`.trim()
        // The trailing dump/pass fields ("0 0") are part of this string and must survive.
        const tailMatch = raw.match(/\s+\d+\s+\d+$/)
        const tail = tailMatch ? tailMatch[0].trim() : '0 0'
        const body = tailMatch ? raw.slice(0,tailMatch.index) : raw
        // Exact token comparison : values like `errors=remount-ro` are not the `ro` flag.
        const parts = body.split(',')
            .map((part) => part.trim())
            .filter(Boolean)
            .filter((part) => part !== 'ro')
        if(parts.indexOf('rw') === -1)parts.unshift('rw')
        return `${parts.join(',')} ${tail}`
    }
    // What videosDir is set to ON DISK. The in-memory config.videosDir is the absolute
    // path resolved at startup, so comparing a freshly saved value against it silently
    // failed - which is how removing a mount could leave Shinobi recording into a path
    // that no longer exists.
    const getConfiguredVideosDir = () => {
        try{
            const configPath = config.thisIsDocker ? "/config/conf.json" : s.location.config
            const onDisk = s.parseJSON(fs.readFileSync(configPath),{})
            return onDisk.videosDir || ''
        }catch(err){
            return ''
        }
    }
    const {
        mount,
        update,
        remove,
        list,
        listWithSizes,
        remountAll,
        remount,
        unmount,
        createMountPoint,
        checkDiskPathExists,
    } = require('node-fstab');
    /**
    * API : Remount All in fstab
     */
    app.get(config.webPaths.superApiPrefix+':auth/mountManager/list', function (req,res){
        s.superAuth(req.params, async (resp) => {
            const response = await listWithSizes();
            // So the list can mark which mount is holding the Videos Directory - it was
            // impossible to tell from this page, which is exactly what makes deleting the
            // wrong mount easy.
            response.videosDir = getConfiguredVideosDir() || config.videosDir || ''
            s.closeJsonResponse(res, response);
        },res,req);
    });
    /**
    * API : Add Mount to fstab
     */
    app.post(config.webPaths.superApiPrefix+':auth/mountManager/mount', function (req,res){
        s.superAuth(req.params, async (resp) => {
            const { sourceTarget, localPath, mountType, options } = req.body;
            const response = { ok: false }
            if(sourceTarget && localPath){
                if(!isValidPath(localPath) || !isValidMountSource(sourceTarget) || !isValidMountOptions(options)){
                    response.error = lang['Invalid Data']
                    s.closeJsonResponse(res, response);
                    return
                }
                try{
                    const createDirResponse = await createMountPoint(localPath)
                    response.createDirResponse = createDirResponse
                }catch(err){
                    console.error(err)
                }
                try{
                    const { exists } = await checkDiskPathExists(localPath)
                    if(exists){
                        const unmountResponse = await unmount(localPath)
                        response.unmountResponse = unmountResponse
                    }
                }catch(err){
                    console.error(err)
                }
                // Always read/write : see forceReadWriteOptions.
                const writableOptions = forceReadWriteOptions(options)
                if(writableOptions !== `${options || ''}`.trim()){
                    s.systemLog('Mount Manager : forced read/write options',{
                        mountPoint: localPath,
                        given: options,
                        used: writableOptions,
                    })
                }
                const updateResponse = await update(sourceTarget, localPath, mountType, writableOptions);
                response.updateResponse = updateResponse
                response.ok = updateResponse.ok
                const remountResponse = await remount(localPath)
                response.remountResponse = remountResponse
                if(!remountResponse.ok){
                    await remove(localPath);
                    response.ok = false;
                    response.error = remountResponse.error;
                }
                response.mount = {
                    device: sourceTarget,
                    mountPoint: localPath,
                    type: mountType,
                    // What actually went into fstab, not what was asked for, so the row the
                    // frontend draws from this matches the file.
                    options: writableOptions,
                }
            }else{
                response.error = lang['Invalid Data']
            }
            s.closeJsonResponse(res, response);
        },res,req);
    });
    /**
    * API : Remove Mount to fstab
     */
    app.post(config.webPaths.superApiPrefix+':auth/mountManager/removeMount', function (req,res){
        s.superAuth(req.params, async (resp) => {
            const { localPath } = req.body;
            const response = { ok: false }
            if(!isValidPath(localPath)){
                response.error = lang['Invalid Data']
                s.closeJsonResponse(res, response);
                return
            }
            let videosDirWasReset = false
            try{
                await unmount(localPath)
                // Checked against BOTH the saved value and the resolved one : setVideosDir
                // writes the mount path to conf.json while the running config still holds
                // the absolute path from startup, and only the saved value can match here.
                const savedVideosDir = getConfiguredVideosDir()
                const pathsToCheck = [savedVideosDir,config.videosDir].filter(Boolean)
                if(pathsToCheck.some((videosDir) => videosDir.startsWith(localPath))){
                    await modifyConfiguration({
                        videosDir: '__DIR__/videos',
                    }, true);
                    videosDirWasReset = true
                    s.systemLog(lang['New Videos Directory Set'] || 'New Videos Directory Set',{
                        reason: `Mount removed : ${localPath}`,
                        videosDir: '__DIR__/videos',
                    })
                }
            }catch(err){
                console.error(err)
            }
            const removeResponse = await remove(localPath);
            // The frontend tells the user a restart is needed, but only when something
            // actually changed under them.
            removeResponse.videosDirWasReset = videosDirWasReset
            s.closeJsonResponse(res, removeResponse);
        },res,req);
    });
    /**
    * API : Set Mount Point as Videos Directory (videosDir)
     */
    app.post(config.webPaths.superApiPrefix+':auth/mountManager/setVideosDir', function (req,res){
        s.superAuth(req.params, async (resp) => {
            const { localPath, pathInside } = req.body;
            const isDefaultDir = localPath === '__DIR__/videos';
            const response = { ok: false }
            try{
                const { exists } = isDefaultDir ? { exists: true } : await checkDiskPathExists(localPath)
                if(exists){
                    const newVideosDirPath = pathInside ? path.join(localPath, pathInside) : localPath;
                    const createDirResponse = isDefaultDir ? true : await createMountPoint(newVideosDirPath)
                    const configError = await modifyConfiguration({
                        videosDir: newVideosDirPath,
                    }, true);
                    response.ok = true;
                    response.configError = configError;
                    response.createDirResponse = createDirResponse;
                }
            }catch(err){
                console.error(err)
            }
            s.closeJsonResponse(res, response);
        },res,req);
    });
}
