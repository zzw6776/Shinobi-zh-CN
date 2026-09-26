module.exports = (s,config,lang) => {
    const {
        yesNoPossibility,
    } = require('./fieldValues.js')(s,config,lang);
    return {
       "section": "Account Settings",
       "blocks": {
          "ShinobiHub": {
              "evaluation": "!details.sub && details.use_shinobihub !== '0'",
              "name": lang["ShinobiHub"],
              "color": "purple",
              "info": [
                  {
                     "name": "detail=shinobihub",
                     "selector":"autosave_shinobihub",
                     "field": lang.Autosave,
                     "description": "",
                     "default": "0",
                     "example": "",
                     "fieldType": "select",
                     "possible": yesNoPossibility
                  },
                  {
                     "hidden": true,
                     "field": lang['API Key'],
                     "name": "detail=shinobihub_key",
                     "placeholder": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
                     "form-group-visibleWhen": { "autosave_shinobihub": "1" },
                     "description": "",
                     "default": "",
                     "example": "",
                     "possible": ""
                  },
              ]
          },
          "AlternateLogins": {
              "name": lang["Alternate Logins"],
              "color": "orange",
              "info": [
                  {
                      "form-group-class-pre-layer": "form-group",
                      "fieldType": 'div',
                      "id": "alternate-logins"
                  },
                  {
                     "fieldType": "btn-group",
                     "forForm": true,
                     "btns": [],
                  },
              ]
          },
          "2-Factor Authentication": {
              "name": lang['2-Factor Authentication'],
              "color": "grey",
              "info": [
                 {
                    "name": "detail=factorAuth",
                    "field": lang.Enabled,
                    "description": lang["fieldTextFactorAuth"],
                    "default": "0",
                    "example": "",
                    "fieldType": "select",
                    "possible": yesNoPossibility
                },
             ]
          },
          "Profile": {
             "name": lang.Profile,
             "color": "grey",
             "info": [
                {
                   "name": "mail",
                   "field": lang.Email,
                   "description": lang["fieldTextMail"],
                   "default": "",
                   "example": "ccio@m03.ca",
                   "possible": ""
                },
                {
                   "name": "pass",
                   "field": lang.Password,
                   "fieldType": "password",
                   "description": lang["fieldTextPass"],
                   "fieldType": "password",
                   "default": "",
                   "example": "",
                   "possible": ""
                },
                {
                   "name": "password_again",
                   "field": lang["Password Again"],
                   "fieldType": "password",
                   "description": lang["fieldTextPasswordAgain"],
                   "default": "",
                   "example": "",
                   "possible": ""
                },
                {
                   "attribute": `size-adjust='[detail="size"]'`,
                   "field": lang["Max Storage Amount"],
                   "default": "10 GB",
                   "notForSubAccount": true,
                   "evaluation": "details.edit_size !== '0'"
                },
                {
                    hidden: true,
                   "name": "detail=size",
                   "field": lang["Max Storage Amount"],
                   "description": lang["fieldTextSize"],
                   "default": "10000",
                   "example": "600000",
                   "possible": "Up to 95% of your maximum storage space if only one master account exists.",
                   "notForSubAccount": true,
                   "evaluation": "details.edit_size !== '0'"
                },
                {
                   "name": "detail=size_video_percent",
                   "field": lang["Video Share"],
                   "description": lang["fieldTextSizeVideoPercent"],
                   "default": "90",
                   "notForSubAccount": true,
                },
                {
                   "name": "detail=size_timelapse_percent",
                   "field": lang["Timelapse Frames Share"],
                   "description": lang["fieldTextSizeTimelapsePercent"],
                   "default": "5",
                   "notForSubAccount": true,
                },
                {
                   "name": "detail=size_filebin_percent",
                   "field": lang["FileBin Share"],
                   "description": lang["fieldTextSizeFilebinPercent"],
                   "default": "5",
                   "notForSubAccount": true,
                },
                {
                    hidden:true,
                   "name": "detail=addStorage",
                   "default": "{}",
                   "notForSubAccount": true,
                },
                {
                    "fieldType": 'div',
                    "id": "add_storage_max_amounts"
                },
                {
                   "name": "detail=days",
                   "field": lang["Number of Days to keep"] + ' ' + lang['Videos'],
                   "description": lang["fieldTextDays"],
                   "default": "5",
                   "example": "30",
                   "possible": "",
                   "notForSubAccount": true,
                   "evaluation": "details.edit_days !== '0'"
                },
                {
                   "name": "detail=event_days",
                   "field": lang["Number of Days to keep"] + ' ' + lang['Events'],
                   "description": lang["fieldTextEventDays"],
                   "default": "10",
                   "example": "30",
                   "possible": "",
                   "notForSubAccount": true,
                   "evaluation": "details.edit_event_days !== '0'"
                },
                {
                   "name": "detail=timelapseFrames_days",
                   "field": lang["Number of Days to keep"] + ' ' + lang['Timelapse'],
                   "description": lang["fieldTextEventDays"],
                   "default": "60",
                   "notForSubAccount": true,
                   "evaluation": "details.edit_timelapseFrames_days !== '0'"
                },
                {
                   "name": "detail=log_days",
                   "field": lang["Number of Days to keep"] + ' ' + lang['Logs'],
                   "description": lang["fieldTextLogDays"],
                   "default": "10",
                   "example": "30",
                   "possible": "",
                   "notForSubAccount": true,
                   "evaluation": "details.edit_log_days !== '0'"
               },
              {
                  "name": "detail=audio_note",
                  "field": lang["Notification Sound"],
                  "description": lang["fieldTextAudioNote"],
                  "fieldType": "select",
                  "possible": s.listOfAudioFiles
              },
              {
                  "name": "detail=audio_alert",
                  "field": lang["Alert Sound"],
                  "description": lang["fieldTextAudioAlert"],
                  "fieldType": "select",
                  "possible": s.listOfAudioFiles
              },
              {
                  "name": "detail=audio_delay",
                  "field": lang["Alert Sound Delay"],
                  "description": lang["fieldTextAudioDelay"],
                  "default": "1",
              },
              {
                  "name": "detail=event_mon_pop",
                  "field": lang["Popout Monitor on Event"],
                  "description": lang["fieldTextEventMonPop"],
                  "default": "en_CA",
                  "fieldType": "select",
                  "possible": yesNoPossibility
               }
             ]
          },
          "Uploaders": {
             "name": lang["Uploaders"],
             "color": "forestgreen",
             "info": []
          },
          "Live Grid": {
             "name": lang['Live Grid'],
             "color": "navy",
             "info": [
                 {
                       "field": lang.hlsOptions,
                       "name": "localStorage=hlsOptions",
                       fieldType:"textarea",
                       "placeholder": "{}",
                 },
             ]
          },
          "Monitor Map": {
             "name": lang['Monitor Map'],
             "color": "teal",
             "info": [
                {
                   "name": "detail=default_geolocation",
                   "field": lang["Default Geolocation"],
                   "example": "49.2578298,-123.2634732",
                   "description": lang["fieldTextDefaultGeolocation"],
                },
                {
                    "id": "account-settings-monitor-map-container",
                    "style": "position: relative",
                    "fieldType": "div",
                    divContent: `
                    <div id="account-settings-geolocation-options" class="p-2" style="background: rgba(0,0,0,0.4);position: absolute; top: 0; right: 0; border-radius: 0 0 0 15px; z-index: 405;">
                        <label for="direction">${lang.Direction} <span class="badge" map-option-value="direction"></span></label>
                        <div class="slider-container">
                            <input type="range" map-option="direction" class="slider" min="0" max="360" value="90">
                        </div>
                        <label for="fov">${lang['Field of View']} <span class="badge"><span map-option-value="fov"></span>°</span></label>
                        <div class="slider-container">
                            <input type="range" map-option="fov" class="slider" min="0" max="180" value="60">
                        </div>
                        <label for="range">${lang.Range} <span class="badge"><span map-option-value="range"></span> km</span></label>
                        <div class="slider-container">
                            <input type="range" map-option="range" class="slider" min="0" max="10" value="1" step="0.1">
                        </div>
                    </div>
                    <div id="account-settings-monitor-map" style="width: 100%;height: 300px;border-radius:15px;"></div>`,
                },
             ]
          },
          "Preferences": {
             "name": lang.Preferences,
             "color": "navy",
             "info": [
                {
                     "field": lang['Clock Format'],
                     "name": "detail=clock_date_format",
                     "placeholder": "$DAYNAME $DAY $MONTHNAME $YEAR",
                },
                {
                     "field": lang.CSS,
                     "name": "detail=css",
                     fieldType:"textarea",
                     "placeholder": "#main_header{background:#b59f00}",
                     "description": "",
                     "default": "",
                     "example": "",
                     "possible": ""
               },
               {
                   "field": lang['Browser Console Log'],
                   attribute:'localStorage="browserLog"',
                   "description": "",
                   "default": "0",
                   "example": "",
                   "fieldType": "select",
                   "possible": yesNoPossibility
               },
               {
                   "field": lang['Get Logs to Client'],
                   attribute:'localStorage="get_server_log"',
                   "description": "",
                   "default": "1",
                   "example": "",
                   "fieldType": "select",
                   "possible": yesNoPossibility
               },
               {
                   "field": lang['Use 24 Hour Time in Videos Table'],
                   attribute:'localStorage="use24HourTime"',
                   "description": "",
                   "default": "0",
                   "example": "",
                   "fieldType": "select",
                   "possible": yesNoPossibility
               }
             ]
         },
       }
   }
}
