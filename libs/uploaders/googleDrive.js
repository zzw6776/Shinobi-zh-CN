var fs = require('fs');
const {google} = require('googleapis');
module.exports = (s,config,lang,app,io) => {
    const initializeOAuth = (credentials) => {
        const creds = s.parseJSON(credentials)
        if(!creds || !creds.installed)return;
        const {client_secret, client_id, redirect_uris} = creds.installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        return oAuth2Client
    }
    const getVideoDirectoryId = async (video) => {
        const videoDirectory = s.group[video.ke].init.googd_dir + video.ke + '/' + video.mid
        const cacheKey = video.ke + video.mid
        if(s.group[video.ke].googleDriveFolderIds[cacheKey]){
            return s.group[video.ke].googleDriveFolderIds[cacheKey]
        }
        const drive = s.group[video.ke].googleDrive
        const listResponse = await drive.files.list({
            q: `name='${videoDirectory}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive',
        })
        const files = listResponse.data.files
        if(files && files[0]){
            s.group[video.ke].googleDriveFolderIds[cacheKey] = files[0].id
            return files[0].id
        }
        const createResponse = await drive.files.create({
            requestBody: {
                name: videoDirectory,
                mimeType: 'application/vnd.google-apps.folder'
            },
            fields: 'id'
        })
        s.group[video.ke].googleDriveFolderIds[cacheKey] = createResponse.data.id
        return createResponse.data.id
    }
    //Google Drive Storage
    var beforeAccountSaveForGoogleDrive = function(d){
        //d = save event
        d.formDetails.googd_use_global = d.d.googd_use_global
        d.formDetails.use_googd = d.d.use_googd
    }
    var cloudDiskUseStartupForGoogleDrive = function(group,userDetails){
        group.cloudDiskUse['googd'].name = 'Google Drive Storage'
        group.cloudDiskUse['googd'].maxDays = parseInt(userDetails.googd_max_days);
        group.cloudDiskUse['googd'].sizeLimitCheck = (userDetails.use_googd_size_limit === '1')
        if(!userDetails.googd_size_limit || userDetails.googd_size_limit === ''){
            group.cloudDiskUse['googd'].sizeLimit = 10000
        }else{
            group.cloudDiskUse['googd'].sizeLimit = parseFloat(userDetails.googd_size_limit)
        }
    }
    var loadGoogleDriveForUser = async function(e){
        // e = user
        var userDetails = JSON.parse(e.details)
        // Forced (Superuser configured) credentials are merged into the account details
        // centrally in libs/uploaders.js before this runs -- see applyForcedCloudUploaderDetails.
        if(userDetails.googd_save === '1'){
            s.group[e.ke].googleDriveFolderIds = {}
            var oAuth2Client
            if(!s.group[e.ke].googleDriveOAuth2Client){
                oAuth2Client = initializeOAuth(userDetails.googd_credentials)
                s.group[e.ke].googleDriveOAuth2Client = oAuth2Client
            }else{
                oAuth2Client = s.group[e.ke].googleDriveOAuth2Client
            }
            if(!oAuth2Client) return
            if(userDetails.googd_code && userDetails.googd_code !== 'Authorized. Token Set.' && userDetails.googd_code !== '***************' && !s.group[e.ke].googleDrive){
                try {
                    const { tokens } = await oAuth2Client.getToken(userDetails.googd_code)
                    oAuth2Client.setCredentials(tokens)
                    s.accountSettingsEdit({
                        ke: e.ke,
                        uid: e.uid,
                        form: {
                            details: JSON.stringify(Object.assign(userDetails,{
                                googd_code: '***************',
                                googd_token: tokens,
                            }))
                        },
                    },true)
                    s.group[e.ke].googleDrive = google.drive({version: 'v3', auth: oAuth2Client})
                } catch(err) {
                    s.userLog({ ke: e.ke, mid: '$USER' }, { type: 'Google Drive Error', msg: err.toString() })
                }
            }else if(userDetails.googd_token && !s.group[e.ke].googleDrive){
                oAuth2Client.setCredentials(userDetails.googd_token)
                s.group[e.ke].googleDrive = google.drive({version: 'v3', auth: oAuth2Client})
            }
        }
    }
    var unloadGoogleDriveForUser = function(user){
        s.group[user.ke].googleDrive = null
        s.group[user.ke].googleDriveOAuth2Client = null
    }
    var deleteVideoFromGoogleDrive = async function(e,video,callback){
        // e = user
        const groupKey = e.ke
        var videoDetails = s.parseJSON(video.details)
        if(video.type !== 'googd'){
            callback()
            return
        }
        try {
            await s.group[groupKey].googleDrive.files.delete({
                fileId: videoDetails.id
            })
        } catch(err) {
            console.log('Error code:', err.code)
        }
        callback()
    }
    var uploadVideoToGoogleDrive = async function(e,k){
        //e = video object
        //k = temporary values
        if(!k)k={};
        //cloud saver - Google Drive Storage
        if(s.group[e.ke].googleDrive && s.group[e.ke].init.use_googd !== '0' && s.group[e.ke].init.googd_save === '1'){
            var ext = k.filename.split('.')
            ext = ext[ext.length - 1]
            var fileStream = fs.createReadStream(k.dir+k.filename);
            fileStream.on('error', function (err) {
                console.error(err)
            })
            try {
                const response = await s.group[e.ke].googleDrive.files.create({
                    requestBody: {
                        name: k.filename,
                        parents: [await getVideoDirectoryId(e)],
                        mimeType: 'video/'+ext
                    },
                    media: {
                        mimeType: 'video/'+ext,
                        body: fileStream
                    }
                })
                const data = response.data
                if(s.group[e.ke].init.googd_log === '1' && data && data.id){
                    s.knexQuery({
                        action: "insert",
                        table: "Cloud Videos",
                        insert: {
                            mid: e.mid,
                            ke: e.ke,
                            time: k.startTime,
                            status: 1,
                            type: 'googd',
                            details: s.s({
                                id: data.id
                            }),
                            size: k.filesize,
                            end: k.endTime,
                            href: ''
                        }
                    })
                    s.setCloudDiskUsedForGroup(e.ke,{
                        amount : k.filesizeMB,
                        storageType : 'googd'
                    })
                    s.purgeCloudDiskForGroup(e,'googd')
                }
            } catch(err) {
                s.userLog(e,{type:lang['Google Drive Storage Upload Error'],msg:err})
                console.log(err)
            }
        }
    }
    var onInsertTimelapseFrame = async function(monitorObject,queryInfo,filePath){
        var e = monitorObject
        if(s.group[e.ke].googleDrive && s.group[e.ke].init.use_googd !== '0' && s.group[e.ke].init.googd_save === '1'){
            var fileStream = fs.createReadStream(filePath)
            fileStream.on('error', function (err) {
                console.error(err)
            })
            var saveLocation = s.group[e.ke].init.googd_dir + e.ke + '/' + e.mid + '_timelapse/' + queryInfo.filename
            try {
                const response = await s.group[e.ke].googleDrive.files.create({
                    requestBody: {
                        name: saveLocation,
                        mimeType: 'image/jpeg'
                    },
                    media: {
                        mimeType: 'image/jpeg',
                        body: fileStream
                    }
                })
                const data = response.data
                if(s.group[e.ke].init.googd_log === '1' && data && data.id){
                    s.knexQuery({
                        action: "insert",
                        table: "Cloud Timelapse Frames",
                        insert: {
                            mid: queryInfo.mid,
                            ke: queryInfo.ke,
                            time: queryInfo.time,
                            type : 'googd',
                            details: s.s({
                                id : data.id,
                            }),
                            size: queryInfo.size,
                            href: ''
                        }
                    })
                    s.setCloudDiskUsedForGroup(e.ke,{
                        amount : s.kilobyteToMegabyte(queryInfo.size),
                        storageType : 'googd'
                    },'timelapseFrames')
                    s.purgeCloudDiskForGroup(e,'googd','timelapseFrames')
                }
            } catch(err) {
                s.userLog(e,{type:lang['Google Drive Storage Upload Error'],msg:err})
            }
        }
    }
    var onDeleteTimelapseFrameFromCloud = async function(e,frame,callback){
        // e = user
        var frameDetails = s.parseJSON(frame.details)
        if(frame.type !== 'googd'){
            return
        }
        try {
            await s.group[e.ke].googleDrive.files.delete({
                fileId: frameDetails.id
            })
        } catch(err) {
            console.log(err)
        }
        callback()
    }
    var onGetVideoData = async (video) => {
        // e = user
        var videoDetails = s.parseJSON(video.details)
        const fileId = videoDetails.id
        const res = await s.group[video.ke].googleDrive.files.get(
            {fileId, alt: 'media'},
            {responseType: 'stream'}
        )
        return res.data
    }
    //
    app.get([config.webPaths.apiPrefix+':auth/googleDriveOAuthRequest/:ke'], (req,res) => {
        s.auth(req.params,async (user) => {
            var response = {ok: false}
            var oAuth2Client = s.group[req.params.ke].googleDriveOAuth2Client
            if(!oAuth2Client){
                oAuth2Client = initializeOAuth(s.group[req.params.ke].googd_credentials)
                s.group[req.params.ke].googleDriveOAuth2Client = oAuth2Client
            }
            if(oAuth2Client){
                const authUrl = oAuth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: ['https://www.googleapis.com/auth/drive.file'],
                })
                response.ok = true
                response.authUrl = authUrl
            }
            s.closeJsonResponse(res,response)
        })
    });
    //wasabi
    s.addCloudUploader({
        name: 'googd',
        loadGroupAppExtender: loadGoogleDriveForUser,
        unloadGroupAppExtender: unloadGoogleDriveForUser,
        insertCompletedVideoExtender: uploadVideoToGoogleDrive,
        deleteVideoFromCloudExtensions: deleteVideoFromGoogleDrive,
        cloudDiskUseStartupExtensions: cloudDiskUseStartupForGoogleDrive,
        beforeAccountSave: beforeAccountSaveForGoogleDrive,
        onAccountSave: cloudDiskUseStartupForGoogleDrive,
        onInsertTimelapseFrame: (() => {}) || onInsertTimelapseFrame,
        onDeleteTimelapseFrameFromCloud: (() => {}) || onDeleteTimelapseFrameFromCloud,
        onGetVideoData: onGetVideoData
    })
    return {
       "evaluation": "details.use_googd !== '0'",
       "name": lang["Google Drive"],
       "color": "forestgreen",
       "uploaderId": 'googd',
       "enableFlag": 'use_googd',
       "globalFlag": 'googd_use_global',
       "globalConfigKey": 'GoogleDrive',
       "info": [
           {
              "name": "detail=googd_save",
              "selector":"autosave_googd",
              "field": lang.Autosave,
              "description": "",
              "default": lang.No,
              "example": "",
              "fieldType": "select",
              "possible": [
                  {
                     "name": lang.No,
                     "value": "0"
                  },
                  {
                     "name": lang.Yes,
                     "value": "1"
                  }
              ]
           },
           {
              "hidden": true,
              "field": lang['OAuth Credentials'],
              "name": "detail=googd_credentials",
              "form-group-class": "autosave_googd_input autosave_googd_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
           },
           {
               "hidden": true,
              "fieldType": "btn",
              "attribute": `style="margin-bottom:1em" href="javascript:$.get(getApiPrefix() + '/googleDriveOAuthRequest/' + $user.ke,function(data){window.open(data.ok ? data.authUrl : 'https://hub.shinobi.video/articles/view/oEIDEGXLlzmSsCk', 'Google Drive', 'width=800,height=400');})"`,
              "class": `btn-success`,
              "form-group-class": "autosave_googd_input autosave_googd_1",
              "btnContent": `<i class="fa fa-plus"></i> &nbsp; ${lang['Get Code']}`,
           },
           {
              "hidden": true,
              "field": lang['OAuth Code'],
              "name": "detail=googd_code",
              "form-group-class": "autosave_googd_input autosave_googd_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
           },
           {
             "hidden": true,
             "name": "detail=googd_log",
             "field": lang['Save Links to Database'],
             "fieldType": "select",
             "selector": "h_googdsld",
             "form-group-class":"autosave_googd_input autosave_googd_1",
             "description": "",
             "default": "",
             "example": "",
             "possible": [
                 {
                    "name": lang.No,
                    "value": "0"
                 },
                 {
                    "name": lang.Yes,
                    "value": "1"
                 }
             ]
         },
         {
             "hidden": true,
            "name": "detail=use_googd_size_limit",
            "field": lang['Use Max Storage Amount'],
            "fieldType": "select",
            "selector": "h_googdzl",
            "form-group-class":"autosave_googd_input autosave_googd_1",
            "form-group-class-pre-layer":"h_googdsld_input h_googdsld_1",
            "description": "",
            "default": "",
            "example": "",
            "possible":  [
                {
                   "name": lang.No,
                   "value": "0"
                },
                {
                   "name": lang.Yes,
                   "value": "1"
                }
            ]
         },
         {
             "hidden": true,
            "attribute": `size-adjust='[detail=googd_size_limit]'`,
            "form-group-class":"autosave_googd_input autosave_googd_1",
            "form-group-class-pre-layer":"h_googdsld_input h_googdsld_1",
            "field": lang["Max Storage Amount"],
            "default": "10 GB",
         },
         {
             "hidden": true,
            "name": "detail=googd_size_limit",
            "field": lang['Max Storage Amount'],
            "default": "10000",
         },
         {
             "hidden": true,
            "name": "detail=googd_max_days",
            "field": lang['Number of Days to keep'],
            "form-group-class":"autosave_googd_input autosave_googd_1",
            "form-group-class-pre-layer":"h_googdsld_input h_googdsld_1",
            "example": "30",
         },
         {
             "hidden": true,
            "name": "detail=googd_dir",
            "field": lang['Save Directory'],
            "form-group-class":"autosave_googd_input autosave_googd_1",
            "description": "",
            "default": "/",
            "example": "",
            "possible": ""
         },
       ]
    }
}
