module.exports = function(s,config,lang){
    const Theme = {
        isDark: true,
    }
    const mainBackgroundColor = Theme.isDark ? 'bg-dark' : Theme.isDarkDefaultBg || 'bg-light'
    const textWhiteOnBgDark = Theme.isDark ? 'text-white' : ''
    return Object.assign({
        Theme: Theme,
    },{
        "Monitor Status Codes": {
            "0": lang["Disabled"],
            "1": lang["Starting"],
            "2": lang["Watching"],
            "3": lang["Recording"],
            "4": lang["Restarting"],
            "5": lang["Stopped"],
            "6": lang["Idle"],
            "7": lang["Died"],
            "8": lang["Stopping"],
            "9": lang["Started"],
        },
        "Monitor Settings": require('./monitorSettings.js')(s,config,lang,Theme),
       "Account Settings": require('./accountSettings.js')(s,config,lang,Theme),
       "ONVIF Device Manager": {
          "section": "ONVIF Device Manager",
          "blocks": {
             "Notice": {
                 "id": "Notice",
                 "name": lang["Notice"],
                 "color": "warning",
                 "blockquoteClass": "global_tip",
                 "blockquote": lang.onvifdeviceManagerGlobalTip,
                 "info": [
                     {
                         "field": lang["Monitor"],
                         "fieldType": "select",
                         "class": "monitors_list",
                         "possible": []
                     },
                     {
                        "fieldType": "btn",
                        "class": `btn-warning onvif-device-reboot`,
                        "btnContent": `<i class="fa fa-refresh"></i> &nbsp; ${lang['Reboot Camera']}`,
                     },
                     {
                         "fieldType": "div",
                         "class": "p-2",
                         "divContent": `<pre class="bg-dark text-white" style="max-height: 400px;overflow: auto;" id="onvifDeviceManagerInfo"></pre>`,
                     }
                 ]
             },
             "Network": {
                 "id": "Network",
                 "name": lang["Network"],
                 "color": "purple",
                 "info": [
                     {
                        "name": "setNetworkInterface:DHCP",
                        "selector":"onvif_dhcp",
                        "field": lang.DHCP,
                        "description": "",
                        "default": "true",
                        "example": "",
                        "fieldType": "select",
                        "possible": [
                            {
                               "name": lang.Yes,
                               "value": "true"
                            },
                            {
                               "name": lang.No,
                               "value": "false"
                            }
                        ]
                     },
                     {
                        "field": lang['IP Address'],
                        "name": "setNetworkInterface:ipv4",
                        "placeholder": "xxx.xxx.xxx.xxx",
                        "form-group-visibleWhen": { "onvif_dhcp": "1" },
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['Gateway'],
                        "name": "setGateway:ipv4",
                        "placeholder": "xxx.xxx.xxx.xxx",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['Hostname'],
                        "name": "setHostname:name",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['DNS'],
                        "name": "setDNS:dns",
                        "placeholder": "1.1.1.1,8.8.8.8",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['HTTP'] + ' ' + lang['Port'],
                        "name": "setProtocols:HTTP",
                        "placeholder": "80",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['RTSP'] + ' ' + lang['Port'],
                        "name": "setProtocols:RTSP",
                        "placeholder": "554",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                 ]
             },
             "Date and Time": {
                 "id": "DateandTime",
                 "name": lang["Date and Time"],
                 "color": "purple",
                 "info": [
                     {
                        "field": lang['UTCDateTime'],
                        "name": "utcDateTime",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['NTP Servers'],
                        "name": "setNTP:ipv4",
                        "placeholder": "1.1.1.1,8.8.8.8",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['DateTimeType'],
                        "name": "dateTimeType",
                        "fieldType": "select",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": [
                            {
                               "name": lang.NTP,
                               "value": "NTP"
                            },
                            {
                               "name": lang.Manual,
                               "value": "Manual"
                            }
                        ]
                     },
                     {
                         "field": lang.DaylightSavings,
                        "name": "daylightSavings",
                        "selector":"onvif_dhcp",
                        "description": "",
                        "default": "true",
                        "example": "",
                        "fieldType": "select",
                        "possible": [
                            {
                               "name": lang.Yes,
                               "value": "true"
                            },
                            {
                               "name": lang.No,
                               "value": "false"
                            }
                        ]
                     },
                     {
                         hidden: true,
                         "field": lang.TimeZone,
                        "name": "timezone",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                 ]
             },
             "Imaging": {
                 "id": "Imaging",
                 "name": lang["Imaging"],
                 "color": "purple",
                 "info": [
                     {
                        "field": lang['IrCutFilter'],
                        "name": "IrCutFilter",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "fieldType": "select",
                        "possible": [
                           {
                              "name": lang.On,
                              "value": "ON",
                              "info": lang["fieldTextIrCutFilterOn"]
                           },
                           {
                              "name": lang.Off,
                              "value": "OFF",
                              "info": lang["fieldTextIrCutFilterOff"]
                           },
                           {
                              "name": lang.Auto,
                              "value": "AUTO",
                              "info": lang["fieldTextIrCutFilterAuto"]
                           },
                       ]
                     },
                     {
                        "field": lang['Brightness'],
                        "name": "Brightness",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['ColorSaturation'],
                        "name": "ColorSaturation",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['Contrast'],
                        "name": "Contrast",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['BacklightCompensation'] + ' : ' + lang['Mode'],
                        "name": "BacklightCompensation:Mode",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['Exposure'] + ' : ' + lang['Mode'],
                        "name": "Exposure:Mode",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['Exposure'] + ' : ' + lang['MinExposureTime'],
                        "name": "Exposure:MinExposureTime",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['Exposure'] + ' : ' + lang['MaxExposureTime'],
                        "name": "Exposure:MaxExposureTime",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['Exposure'] + ' : ' + lang['MinGain'],
                        "name": "Exposure:MinGain",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['Exposure'] + ' : ' + lang['MaxGain'],
                        "name": "Exposure:MaxGain",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['Sharpness'],
                        "name": "Sharpness",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['WideDynamicRange'] + ' : ' + lang['Mode'],
                        "name": "WideDynamicRange:Mode",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['WhiteBalance'] + ' : ' + lang['Mode'],
                        "name": "WhiteBalance:Mode",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                 ]
             },
             "Video Configuration": {
                 "id": "VideoConfiguration",
                 "name": lang["Video Configuration"],
                 "color": "purple",
                 "info": [
                     {
                         hidden: true,
                         "field": lang.Token,
                        "name": "videoToken",
                        "description": "",
                        "default": "",
                        "example": "",
                        "fieldType": "select",
                        "possible": [

                        ]
                     },
                     {
                        "field": lang['Name'],
                        "name": "Name",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                         "field": lang.Resolution,
                        "name": "detail=Resolution",
                        "description": "",
                        "default": "",
                        "example": "",
                        "fieldType": "select",
                        "possible": [

                        ]
                     },
                     {
                         hidden: true,
                        "field": lang['Width'],
                        "name": "Resolution:Width",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                         hidden: true,
                        "field": lang['Height'],
                        "name": "Resolution:Height",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['Quality'],
                        "name": "Quality",
                        "fieldType": "number",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['FrameRateLimit'],
                        "name": "RateControl:FrameRateLimit",
                        "fieldType": "number",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['EncodingInterval'],
                        "name": "RateControl:EncodingInterval",
                        "fieldType": "number",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['BitrateLimit'],
                        "name": "RateControl:BitrateLimit",
                        "fieldType": "number",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['GovLength'],
                        "name": "H264:GovLength",
                        "fieldType": "number",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['Encoding'],
                        "name": "Encoding",
                        "placeholder": "",
                        "description": "",
                        "default": "H264",
                        "example": "",
                        "fieldType": "select",
                        "possible": [

                        ]
                     },
                     {
                         "field": lang['H264Profile'],
                         "name": "H264:H264Profile",
                        "description": "",
                        "default": "",
                        "example": "",
                        "fieldType": "select",
                        "possible": [

                        ]
                     },
                     {
                         hidden: true,
                        "field": lang['UseCount'],
                        "name": "UseCount",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                 ]
             },
         }
       },
       "Permission Sets": require('./permissionSets.js')(s,config,lang,Theme),
       "Sub-Account Manager": require('./subAccountManager.js')(s,config,lang,Theme),
       "API Keys": require('./apiKeys.js')(s,config,lang,Theme),
     "LDAP": {
         "section": "LDAP",
         "blocks": {
             "LDAP": {
                "evaluation":"details.use_ldap!=='0'",
                "name": lang["LDAP"],
                "color": "forestgreen",
                "info": [
                    {
                       "name": "ldap_url",
                       "field": lang.URL,
                       "description": "",
                       "example": "ldap://127.0.0.1:389",
                       "possible": ""
                    },
                    {
                       "name": "username",
                       "field": lang.Username,
                       "description": "",
                       "example": "",
                       "possible": ""
                    },
                    {
                       "name": "password",
                       "field": lang.Password,
                       "description": "",
                       "example": "",
                       "possible": ""
                    },
                    {
                       "name": "ldap_bindDN",
                       "field": lang.bindDN,
                       "description": "",
                       "example": "cn=admin,dc=test,dc=com",
                       "possible": ""
                    },
                    {
                       "name": "ldap_searchBase",
                       "field": lang['Search Base'],
                       "description": "",
                       "example": "dc=test,dc=com",
                       "possible": ""
                    },
                    {
                       "name": "ldap_searchFilter",
                       "field": lang['Search Filter'],
                       "description": "",
                       "example": "uid={{username}}",
                       "possible": ""
                    },
                    {
                       "fieldType": "btn",
                       "forForm": true,
                       "attribute": `type="submit"`,
                       "class": `btn-success`,
                       "btnContent": `<i class="fa fa-check"></i> &nbsp; ${lang['Save']}`,
                    },
                ]
             }
         }
     },
     "Alarms": require('./alarms.js')(s,config,lang,Theme),
     "Region Editor": require('./regionEditor.js')(s,config,lang,Theme),
     "Schedules": {
         "section": "Schedules",
         "blocks": {
             "Info": {
                 "name": lang["Monitor States and Schedules"],
                "color": "blue",
                "section-pre-class": "col-md-12",
                "blockquoteClass": "global_tip",
                "blockquote": lang.MonitorStatesText,
                "info": [
                    {
                       "fieldType": "btn",
                       "attribute": `page-open="monitorStates"`,
                       "class": `btn-primary`,
                       "btnContent": `<i class="fa fa-align-right"></i> &nbsp; ${lang["Monitor States"]}`,
                    },
                ]
             },
             "Schedules": {
                "name": lang["Schedules"],
                "color": "orange",
                "section-pre-class": "col-md-6",
                "info": [
                    {
                       "id": "schedulesSelector",
                       "field": lang["Schedules"],
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang['Add New'],
                              "value": ""
                           },
                           {
                              "name": lang.Saved,
                              "optgroup": []
                           },
                       ]
                   },
                ]
            },
            "Schedule": {
               "name": lang["Schedule"],
               "headerTitle": `${lang['Schedule']}
                 <div class="pull-right">
                     <a class="btn btn-danger btn-xs delete" style="display:none">&nbsp;<i class="fa fa-trash-o"></i>&nbsp;</a>
                 </div>`,
               "color": "green",
               "section-pre-class": "col-md-6",
               "info": [
                   {
                      "name": "name",
                      "field": lang.Name,
                      "description": "",
                      "example": "Motion Off",
                      "possible": ""
                   },
                   {
                      "name": "enabled",
                      "field": lang.Enabled,
                      "default": "1",
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
                      "name": "timezone",
                      "field": lang['Timezone Offset'],
                      "default": config.timeZones.find(tz => !!tz.selected).value,
                      "fieldType": "select",
                      "possible": config.timeZones.map((tz) => {
                          return {
                              "name": tz.text,
                              "value": tz.value
                          }
                      })
                   },
                   {
                      "name": "start",
                      "field": lang.Start,
                      "description": "",
                      "placeholder": "HH:mm",
                      "possible": "1:00"
                   },
                   {
                      "name": "end",
                      "field": lang.End,
                      "description": "",
                      "placeholder": "HH:mm",
                      "possible": "2:00"
                   },
                   {
                      "name": "days",
                      "field": lang.Days,
                      "default": "0",
                      "fieldType": "select",
                      "attribute": "multiple",
                      "possible": [
                          {
                             "name": lang.Sunday,
                             "value": "0"
                          },
                          {
                             "name": lang.Monday,
                             "value": "1"
                          },
                          {
                             "name": lang.Tuesday,
                             "value": "2"
                          },
                          {
                             "name": lang.Wednesday,
                             "value": "3"
                          },
                          {
                             "name": lang.Thursday,
                             "value": "4"
                          },
                          {
                             "name": lang.Friday,
                             "value": "5"
                          },
                          {
                             "name": lang.Saturday,
                             "value": "6"
                          },
                      ]
                   },
                   {
                      "name": "monitorStates",
                      "field": lang['Monitor States'],
                      "fieldType": "select",
                      "attribute": `multiple style="min-height:100px"`,
                      "possible": []
                   },
               ]
           },
         }
     },
     "Monitor States": {
         "section": "Monitor States",
         "blocks": {
             "Info": {
                 "name": lang["Monitor States and Schedules"],
                "color": "blue",
                "section-pre-class": "col-md-12",
                "blockquoteClass": "global_tip",
                "blockquote": lang.MonitorStatesText,
                "info": [
                    {
                       "fieldType": "btn",
                       "attribute": `page-open="schedules"`,
                       "class": `btn-primary`,
                       "btnContent": `<i class="fa fa-clock-o"></i> &nbsp; ${lang["Schedules"]}`,
                    },
                ]
             },
             "How to Create a Preset": {
                "name": lang["How to Create a Monitor State Preset"],
                "color": "blue",
                "section-pre-class": "col-md-12",
                "blockquoteClass": "global_tip",
                "blockquote": lang.CreateMonitorStateInstructionsText,
                "info": []
            },
            "Saved Presets": {
               "name": lang["Saved Presets"],
               "color": "green",
               "section-pre-class": "col-md-12",
               "info": [
                  {
                      "fieldType": "div",
                      id: "monitorStatesList",
                  }
               ]
           },
         }
     },
     "Timelapse": {
         "section": "Timelapse",
         "blocks": {
             // Laid out like the Events and Videos tabs : one full-width row of search
             // controls pinned above the content it filters.
             "Search Settings": {
                "name": lang["Search Settings"],
                "color": "green",
                "section-pre-class": "col-md-12",
                "box-wrapper-class": "d-flex flex-row flex-wrap align-items-end",
                "noHeader": true,
                "info": [
                    {
                        "field": lang["Monitor"],
                        "fieldType": "select",
                        "class": "monitors_list",
                        "form-group-class": "col me-3 mb-0",
                        "possible": []
                    },
                    {
                        "id": "timelapsejpeg_date",
                        "field": lang.Date,
                        "form-group-class": "col me-3 mb-0",
                    },
                    {
                        "id": "timelapseJpegFps",
                        "field": lang["FPS"],
                        "fieldType": "number",
                        "default": "10",
                        "numberMin": "1",
                        "numberMax": "60",
                        "form-group-class": "me-3 mb-0",
                        "style": "width:90px",
                    },
                    {
                       "fieldType": "btn-group",
                       "form-group-class-pre-layer": "me-3 mb-0",
                       "btns": [
                           {
                               "fieldType": "btn",
                               "class": `btn-success fill refresh-data`,
                               "icon": `search`,
                               "btnContent": `${lang['Search']}`,
                           },
                       ],
                    },
                    {
                       "fieldType": "div",
                       "class": "dropdown d-inline-block",
                       "form-group-class-pre-layer": "me-3 mb-0",
                       "divContent": `<button type="button" class="btn btn-default dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                           <i class="fa fa-clock-o"></i> ${lang['Quick Range']}
                       </button>
                       <ul class="dropdown-menu ${Theme.isDark ? 'dropdown-menu-dark bg-dark' : ''} shadow-lg">
                           <li><a class="dropdown-item timelapse_quick_daterange" href="#" data-hours="1">${lang.Last} 1 ${lang.hours}</a></li>
                           <li><a class="dropdown-item timelapse_quick_daterange" href="#" data-hours="3">${lang.Last} 3 ${lang.hours}</a></li>
                           <li><a class="dropdown-item timelapse_quick_daterange" href="#" data-hours="6">${lang.Last} 6 ${lang.hours}</a></li>
                           <li><a class="dropdown-item timelapse_quick_daterange" href="#" data-hours="9">${lang.Last} 9 ${lang.hours}</a></li>
                           <li><a class="dropdown-item timelapse_quick_daterange" href="#" data-hours="12">${lang.Last} 12 ${lang.hours}</a></li>
                           <li><a class="dropdown-item timelapse_quick_daterange" href="#" data-hours="24">${lang.Last} 24 ${lang.hours}</a></li>
                           <li><hr class="dropdown-divider"></li>
                           <li><a class="dropdown-item timelapse_quick_daterange" href="#" data-days="7">${lang.Last} 7 ${lang.Days}</a></li>
                           <li><a class="dropdown-item timelapse_quick_daterange" href="#" data-days="30">${lang.Last} 30 ${lang.Days}</a></li>
                       </ul>`
                    },
                    {
                       "fieldType": "btn-group",
                       "form-group-class-pre-layer": "me-3 mb-0",
                       "btns": [
                           {
                               "fieldType": "btn",
                               "class": `btn-primary playPause playPauseText`,
                               "btnContent": `<i class="fa fa-play"></i> ${lang['Play']}`,
                           },
                           {
                               "fieldType": "btn",
                               "class": `btn-secondary download_mp4`,
                               "btnContent": `${lang['Build Video']}`,
                           },
                           {
                               "fieldType": "btn",
                               "class": `btn-danger cancel_mp4 d-none`,
                               "btnContent": `<i class="fa fa-times"></i> ${lang['Cancel']}`,
                           },
                       ],
                    },
               ]
           },
           "Watch": {
               noHeader: true,
              "color": "blue",
              style: 'padding:0!important',
              "section-pre-class": "col-md-12",
              "info": [
                  {
                      "fieldType": "div",
                      "class": "playBackView",
                      "divContent": "<img>"
                  },
                  // Live narration of a running build. Hidden until a build is requested, and
                  // the only place the Cancel action is offered while work is in flight.
                  {
                      "fieldType": "div",
                      "class": "timelapseBuildProgress d-none p-2",
                      "divContent": `<div class="d-flex flex-row align-items-center">
                          <span class="dot shadow me-2 dot-orange"></span>
                          <div class="timelapseBuildStage me-2" style="white-space:nowrap"></div>
                          <div class="flex-grow-1 px-2">
                              <div class="progress" style="height:18px">
                                  <div class="progress-bar progress-bar-warning progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%">0%</div>
                              </div>
                          </div>
                          <a class="btn btn-sm btn-danger timelapseBuildCancel"><i class="fa fa-times"></i> ${lang['Cancel']}</a>
                      </div>`
                  },
                  // The frame browser : one tick per frame on a time-scaled strip, in the same
                  // visual language as the videoPlayer event strip.
                  {
                      "fieldType": "div",
                      "class": "frameStripArea pt-2",
                      "divContent": `<div class="d-flex flex-row align-items-center mb-2">
                          <a class="btn btn-danger btn-sm me-2 delete-selected-frames">${lang['Delete selected']}</a>
                          <a class="btn btn-primary btn-sm me-2 zip-selected-frames">${lang['Zip and Download']}</a>
                          <div class="flex-grow-1 small text-muted frameSelectionInfo"></div>
                          <label class="small mb-0 ms-2">
                              <input type="checkbox" class="form-check-input select-all" checked> ${lang['Select All']}
                          </label>
                      </div>
                      <div class="timelapse-strip-wrapper">
                          <div class="video-time-strip timelapse-frame-strip">
                              <div class="timelapse-strip-selection"></div>
                              <div class="timelapse-strip-ticks"></div>
                              <div class="video-time-needle timelapse-strip-playhead" style="left:0%"></div>
                          </div>
                          <div class="timelapse-strip-preview">
                              <img alt="">
                              <div class="timelapse-strip-preview-caption"></div>
                          </div>
                      </div>
                      <div class="d-flex flex-row justify-content-between small text-muted mt-1">
                          <div class="timelapse-strip-start"></div>
                          <div class="timelapse-strip-end"></div>
                      </div>`
                  }
              ]
          },
        }
      },
     "Event Filters": {
          "section": "Event Filters",
          "blocks": {
              "Saved Filters": {
                 "name": lang["Saved Filters"],
                 "color": "green",
                 "blockquote": lang.eventFilterEnableNoticeText,
                 "info": [
                     {
                        "field": lang["Monitor"],
                        "id": "event_filters_monitors",
                        "fieldType": "select",
                     },
                     {
                        "fieldType": "btn-group",
                        "class": "mb-3",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "class": `btn-success add-filter`,
                                "btnContent": `${lang['Add New']}`,
                            },
                            {
                                "fieldType": "btn",
                                "class": `btn-danger delete-filter`,
                                "btnContent": `${lang['Delete']}`,
                            },
                        ],
                     },
                     {
                        "id": "detector_filters",
                        "field": lang["Filters"],
                        "fieldType": "select",
                     },
                     {
                         hidden:true,
                        "name": "id",
                     },
                     {
                       "name": "enabled",
                       "field": lang.Enabled,
                       "fieldType": "select",
                       "default": "1",
                       "possible": [
                          {
                             "name": "No",
                             "value": "0",
                          },
                          {
                             "name": lang.Yes,
                             "value": "1",
                             "selected": true
                          }
                       ]
                     },
                     {
                        "name": "filter_name",
                        "field": lang['Filter Name'],
                     },
                 ]
             },
             "Conditions": {
                "name": lang["Conditions"],
                "color": "blue",
                "section-class": "where",
                "info": [
                    {
                       "fieldType": "btn-group",
                       "class": "mb-3",
                       "btns": [
                           {
                               "fieldType": "btn",
                               "class": `btn-success add`,
                               "btnContent": `${lang['Add New']}`,
                           },
                       ],
                    },
                    {
                        "id": 'detector_filters_where',
                        "fieldType": 'div',
                    },
                ]
            },
             "Action for Selected": {
                "name": lang["Action for Selected"],
                "color": "red",
                "blockquote": lang.eventFilterActionText,
                "section-class": "actions",
                "info": [
                    {
                      "name": "actions=halt",
                      "field": lang["Drop Event"],
                      "fieldType": "select",
                      "form-group-class": "actions-row",
                      "description": lang["fieldTextActionsHalt"],
                      "default": "0",
                      "possible": [
                         {
                            "name": "No",
                            "value": "0",
                            "selected": true
                         },
                         {
                            "name": lang['On Condition Succeed'],
                            "value": "1",
                         },
                         {
                            "name": lang['On Condition Failure'],
                            "value": "2",
                         }
                      ]
                    },
                    {
                      "name": "actions=save",
                      "field": lang['Save Events'],
                      "fieldType": "select",
                      "default": "Yes",
                      "form-group-class": "actions-row",
                      "possible": [
                         {
                            "name": lang['Original Choice'],
                            "value": "",
                            "selected": true
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                         }
                      ]
                    },
                    {
                       "name": "actions=indifference",
                       "field": lang["Modify Indifference"],
                       "description": lang["fieldTextActionsIndifference"],
                       "form-group-class": "actions-row",
                    },
                    {
                      "name": "actions=webhook",
                      "field": lang['Legacy Webhook'],
                      "fieldType": "select",
                      "form-group-class": "actions-row",
                      "default": "",
                      "example": "1",
                      "possible": [
                         {
                            "name": lang['Original Choice'],
                            "value": "",
                            "selected": true
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                         }
                      ]
                    },
                   {
                      "name": "actions=command",
                      "field": lang["Detector Command"],
                      "fieldType": "select",
                      "form-group-class": "actions-row",
                      "description": lang["fieldTextActionsCommand"],
                      "default": "No",
                      "form-group-class": "actions-row",
                      "possible": [
                         {
                            "name": lang['Original Choice'],
                            "value": "",
                            "selected": true
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                         }
                      ]
                   },
                   {
                      "name": "actions=record",
                      "field": lang["Use Record Method"],
                      "fieldType": "select",
                      "description": lang["fieldTextActionsRecord"],
                      "default": "",
                      "form-group-class": "actions-row",
                      "possible": [
                         {
                            "name": lang['Original Choice'],
                            "value": "",
                            "selected": true
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                         }
                      ]
                   },
                ]
            },
          }
      },
      "ONVIF Scanner": require('./onvifScanner.js')(s,config,lang,Theme),
     "Camera Probe": {
          "section": "Camera Probe",
          "blocks": {
              "Search Settings": {
                 "name": lang["FFprobe"],
                 "color": "blue",
                 "blockquote": `<i>"${lang['FFmpegTip']}"</i> - FFmpegTips`,
                 "section-pre-class": "col-md-12",
                 "info": [
                     {
                        "name": "url",
                        "field": lang['Complete Stream URL'],
                        "example": "http://192.168.88.126/videostream.cgi or /dev/video0",
                     },
                     {
                        "fieldType": "btn-group",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "forForm": true,
                                "class": `btn-block btn-success`,
                                "btnContent": `${lang['Check']}`,
                            },
                            {
                                "fieldType": "btn",
                                "class": `btn-default fill`,
                                "btnContent": `${lang['Save']}`,
                            },
                        ],
                     },
                     {
                         "fieldType": "div",
                         "class": "output_data",
                     }
                ]
            },
         }
       },
     "Montior Configuration Finder": {
            "section": "Montior Configuration Finder",
            "blocks": {
                "Search Settings": {
                   "name": lang["Search Settings"],
                   "color": "navy",
                   "blockquote": lang.monitorConfigFinderDescription,
                   "section-pre-class": "col-md-4",
                   "info": [
                       {
                          "id": "shinobihub-sort-by",
                          "field": lang["Sort By"],
                          "fieldType": "select",
                          "possible": [
                              {
                                 "name": lang['Date Updated'],
                                 "value": "dateUpdated"
                              },
                              {
                                 "name": lang['Date Added'],
                                 "value": "dateAdded"
                              },
                              {
                                 "name": lang['Title'],
                                 "value": "heading"
                              },
                              {
                                 "name": lang['Subtitle'],
                                 "value": "opening"
                              },
                          ]
                      },
                       {
                          "id": "shinobihub-sort-direction",
                          "field": lang["Sort By"],
                          "fieldType": "select",
                          "possible": [
                              {
                                 "name": lang['Newest'],
                                 "value": "DESC"
                              },
                              {
                                 "name": lang['Oldest'],
                                 "value": "ASC"
                              },
                          ]
                      },
                      {
                         "id": "shinobihub-search",
                         "field": lang['Search'],
                      },
                      {
                          "id": "shinobihub-pages",
                          "class": "btn-group",
                          "fieldType": "div",
                      }
                  ]
              },
              "Monitor Settings": {
                 "name": lang['Monitor Settings'],
                 "color": "blue",
                 "section-pre-class": "col-md-8",
                 "info": [
                     {
                         "id": "shinobihub-results",
                         "class": "text-center row",
                         "fieldType": "div",
                     }
                 ]
             },
         }
     },
     "Log Viewer": {
          "section": "Log Viewer",
          "blocks": {
              "Saved Logs": {
                 "name": lang["Saved Logs"],
                 "color": "blue",
                 "section-pre-class": "col-md-6 search-parent",
                 "info": [
                     {
                        "id": "log_monitors",
                        "field": lang["Type"],
                        "fieldType": "select",
                        "possible": [
                            {
                               "name": lang['All Logs'],
                               "value": "all"
                            },
                            {
                               "name": lang['For Group'],
                               "value": "$USER"
                            },
                            {
                               "name": lang.Monitors,
                               "optgroup": []
                           }
                        ]
                    },
                     {
                        "field": lang['Search'],
                        "class": 'search-controller',
                     },
                     {
                        "id": "logs_daterange",
                        "field": lang['Date Range'],
                     },
                     {
                        "fieldType": "btn-group",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "class": "btn-default",
                                "forForm": true,
                                "attribute": `download type="button"`,
                                "btnContent": `${lang['Export']}`,
                            },
                            {
                                "fieldType": "btn",
                                "class": "btn-success",
                                "forForm": true,
                                "attribute": `type="submit"`,
                                "btnContent": `${lang['Check']}`,
                            },
                        ],
                     },
                     {
                         "id": "saved-logs-rows",
                         "fieldType": "div",
                         "attribute": `style="max-height: 600px;overflow: auto;"`,
                         "class": "search-body mt-3 px-3 row",
                     }
                ]
            },
            "Streamed Logs": {
               "name": lang['Streamed Logs'],
               "color": "green",
               "section-pre-class": "col-md-6 search-parent",
               "info": [
                   {
                      "field": lang['Search'],
                      "class": 'search-controller',
                   },
                   {
                       "fieldType": "div",
                       "id": "global-log-stream",
                       "attribute": `style="max-height: 600px;overflow: auto;"`,
                       "class": "search-body mt-3",
                   }
               ]
           },
         }
       },
     "Events": {
          "section": "Events",
          "blocks": {
              "Saved Logs": {
                 "name": lang["Search Settings"],
                 "color": "blue",
                 "section-pre-class": "col-md-4",
                 "info": [
                     {
                        "id": "eventListWithPics-monitors-list",
                        "field": lang["Type"],
                        "fieldType": "select",
                        "possible": [
                            {
                               "name": lang['All Monitors'],
                               "value": "all"
                            },
                            {
                               "name": lang.Monitors,
                               "optgroup": []
                           }
                        ]
                     },
                     {
                        "id": "eventListWithPics-daterange",
                        "field": lang['Date Range'],
                     },
                     {
                        "fieldType": "btn-group",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "class": "btn-success",
                                "forForm": true,
                                "attribute": `type="submit"`,
                                "btnContent": `${lang['Check']}`,
                            },
                        ],
                     }
                ]
            },
            "Events Found": {
               "name": lang['Events Found'],
               "color": "green",
               "section-pre-class": "col-md-8 search-parent",
               "info": [
                   {
                      "field": lang['Search'],
                      "class": 'search-controller',
                   },
                   {
                       "fieldType": "div",
                       "id": "eventListWithPics-rows",
                       "class": "search-body mt-3 row",
                   }
               ]
           },
         }
       },
       "Monitor Settings Additional Input Map": require('./monitorSettingsAdditionalInputMap.js')(s,config,lang,Theme),
       "Monitor Settings Additional Stream Channel": require('./monitorSettingsAdditionalStreamChannel.js')(s,config,lang,Theme),
       "Monitor Stream Window": require('./monitorStreamWindow.js')(s,config,lang,Theme),
       "Monitor Options": {
           "section": "Monitor Options",
           "dropdownClass": `${Theme.isDark ? 'dropdown-menu-dark' : ''} ${mainBackgroundColor}`
       },
       "SideMenu": {
           "section": "SideMenu",
           showMonitors: true,
           "blocks": {
               "Container1": {
                  // "id": "sidebarMenu",
                  "class": `col-md-3 col-lg-2 d-md-block ${mainBackgroundColor} sidebar collapse`,
                  "links": [
                      {
                          icon: 'home',
                          label: lang.Home,
                          pageOpen: 'initial',
                      },
                      {
                          icon: 'th',
                          label: lang['Live Grid'] + ` &nbsp;
                          <span class="badge bg-light text-dark rounded-pill align-text-bottom liveGridOpenCount">0</span>`,
                          pageOpen: 'liveGrid',
                          addUl: true,
                          ulItems: [
                              {
                                  label: lang['Open Wall Display'],
                                  class: 'open-wallview cursor-pointer',
                                  color: 'blue',
                              },
                              {
                                  label: lang['Open All Monitors'],
                                  class: 'open-all-monitors cursor-pointer',
                                  color: 'orange',
                              },
                              {
                                  label: lang['Close All Monitors'],
                                  class: 'close-all-monitors cursor-pointer',
                                  color: 'red',
                              },
                              {
                                  label: lang['Open Next Monitors'],
                                  class: 'open-next-monitors cursor-pointer',
                                  color: 'blue',
                              },
                              {
                                  label: lang['Open Previous'],
                                  class: 'open-previous-monitors cursor-pointer',
                                  color: 'blue',
                              },
                              {
                                  label: lang['Remember Positions'],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="monitorOrder" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                              {
                                  label: lang['Auto Open on Load'],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="autoOpenOnLoad" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                              {
                                  label: lang['Maintain Grid'],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="liveGridMaintainGrid" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                              {
                                  label: lang['Mute Audio'],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="monitorMuteAudio" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                              // {
                              //     label: lang['JPEG Mode'],
                              //     class: 'cursor-pointer',
                              //     attributes: 'shinobi-switch="jpegMode" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                              //     color: 'grey',
                              // },
                              {
                                  label: lang['Stream in Background'],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="backgroundStream" ui-change-target=".dot" on-class="dot-grey" off-class="dot-green"',
                                  color: 'grey',
                              },
                              {
                                  label: lang[`Original Aspect Ratio`],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="dontMonStretch" ui-change-target=".dot" on-class="dot-grey" off-class="dot-green"',
                                  color: 'grey',
                              },
                              {
                                  label: lang[`Hide Detection on Stream`],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="dontShowDetection" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                              {
                                  label: lang[`Alert on Event`],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="alertOnEvent" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                              {
                                  label: lang[`Popout on Event`],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="popOnEvent" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                              ...[
                                  1,2,3
                                  //,4,6
                              ].map(gridNumber => {
                                  return {
                                      label: `${gridNumber} x ${gridNumber}`,
                                      class: 'cursor-pointer auto-place-monitors',
                                      attributes: `data-number="${gridNumber}"`,
                                      color: 'purple',
                                  }
                              }),
                          ]
                      },
                      {
                          icon: 'video-camera',
                          label: `${lang.Monitors} &nbsp;
                          <span class="badge bg-light text-dark rounded-pill align-text-bottom cameraCount"><i class="fa fa-spinner fa-pulse"></i></span>`,
                          pageOpen: 'monitorsList',
                      },
                      {
                          icon: 'barcode',
                          label: `${lang['Timeline']}`,
                          pageOpen: 'timeline',
                          addUl: true,
                          ulStyle: `max-height:250px;overflow:auto;`
                      },
                      {
                          icon: 'map-marker',
                          label: `${lang['Monitor Map']}`,
                          pageOpen: 'monitorMap',
                      },
                      {
                          icon: 'film',
                          label: `${lang['Videos']}`,
                          pageOpen: 'videosTableView',
                          addUl: true,
                          ulItems: [
                              {
                                  label: lang[`Save Compressed Video on Completion`],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="saveCompressedVideo" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                          ]
                      },
                      {
                          icon: 'bell-o',
                          label: `${lang['Events']}`,
                          pageOpen: 'eventsTableView',
                      },
                      {
                          icon: 'calendar',
                          label: `${lang['Calendar']}`,
                          pageOpen: 'calendarView',
                      },
                      {
                          icon: 'fast-forward',
                          label: `${lang['Time-lapse']}`,
                          pageOpen: 'timelapseViewer',
                          addUl: true,
                          ulItems: [
                              {
                                  label: lang[`Save Built Video on Completion`],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="timelapseSaveBuiltVideo" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                          ]
                      },
                      {
                          icon: 'file-o',
                          label: `${lang['FileBin']}`,
                          pageOpen: 'fileBinView',
                      },
                      {
                          divider: true,
                      },
                      {
                          icon: 'wrench',
                          label: `${lang['Monitor Settings']}`,
                          pageOpen: 'monitorSettings',
                          addUl: true,
                          eval: `!$user.details.sub || $user.details.monitor_create != 0`,
                      },
                      {
                          icon: 'grav',
                          label: `${lang['Region Editor']}`,
                          pageOpen: 'regionEditor',
                          eval: `!$user.details.sub`,
                      },
                      {
                          icon: 'filter',
                          label: `${lang['Event Filters']}`,
                          pageOpen: 'eventFilters',
                          eval: `!$user.details.sub`,
                      },
                      {
                          icon: 'align-right',
                          label: `${lang['Monitor States']}`,
                          pageOpen: 'monitorStates',
                          eval: `!$user.details.sub`,
                      },
                      {
                          icon: 'clock-o',
                          label: `${lang['Schedules']}`,
                          pageOpen: 'schedules',
                          eval: `!$user.details.sub`,
                      },
                      {
                          icon: 'exclamation-triangle',
                          label: `${lang['Logs']}`,
                          pageOpen: 'logViewer',
                          eval: `!$user.details.sub || $user.details.view_logs != 0`,
                      },
                      {
                          divider: true,
                      },
                      {
                          icon: 'gears',
                          label: `${lang['Account Settings']}`,
                          pageOpen: 'accountSettings',
                          eval: `!$user.details.sub || $user.details.user_change != 0`,
                          addUl: true,
                      },
                      {
                          icon: 'group',
                          label: `${lang.subAccountManager}`,
                          pageOpen: 'subAccountManager',
                          addUl: true,
                          eval: `!$user.details.sub`,
                      },
                      {
                          icon: 'group',
                          label: `${lang['Permission Groups']}`,
                          pageOpen: 'permissionSets',
                          eval: `!$user.details.sub || $user.details.edit_permissions != 0`,
                      },
                      {
                          icon: 'key',
                          label: `${lang['API Keys']}`,
                          pageOpen: 'apiKeys',
                      },
                      {
                          divider: true,
                      },
                      {
                          icon: 'search',
                          label: `${lang['ONVIF Scanner']}`,
                          pageOpen: 'onvifScanner',
                          addUl:true,
                          eval: `!$user.details.sub || $user.details.monitor_create != 0`,
                      },
                      {
                          icon: 'opera',
                          label: `${lang['ONVIF Device Manager']}`,
                          pageOpen: 'onvifDeviceManager',
                          eval: `!$user.details.sub || $user.details.monitor_create != 0`,
                      },
                      {
                          icon: 'ravelry',
                          label: `${lang['Rally']}`,
                          pageOpen: 'rally',
                      },
                      {
                          icon: 'eyedropper',
                          label: `${lang['FFprobe']}`,
                          pageOpen: 'cameraProbe',
                      },
                      {
                          icon: 'compass',
                          label: `${lang['ShinobiHub']}`,
                          pageOpen: 'configFinder',
                          addUl: true,
                          eval: `!$user.details.sub || $user.details.monitor_create != 0`,
                      },
                      // Superuser granted admin tools, kept in a section of their own rather
                      // than mixed in with Help and Logout. The divider carries the same
                      // condition as the links so an account with neither permission does not
                      // get a stray rule floating above Help.
                      {
                          divider: true,
                          eval: "$user.details.use_plugin_manager === '1' || $user.details.use_remote_access === '1' || $user.details.use_system_control === '1'",
                      },
                      {
                          icon: 'plug',
                          label: lang['Plugin Manager'],
                          pageOpen: 'pluginManager',
                          // menuSide.ejs runs this; the tab block itself is gated the same
                          // way, so a link can never point at markup that was not rendered.
                          eval: "$user.details.use_plugin_manager === '1'",
                      },
                      {
                          icon: 'globe',
                          label: lang['Easy Remote Access (P2P)'],
                          pageOpen: 'easyRemoteAccess',
                          eval: "$user.details.use_remote_access === '1'",
                      },
                      {
                          icon: 'terminal',
                          // Called "Controls and Logs" in the Superuser panel; the dashboard
                          // shows it as System Control.
                          label: lang['System Control'],
                          pageOpen: 'systemControl',
                          eval: "$user.details.use_system_control === '1'",
                      },
                      {
                          divider: true,
                      },
                      {
                          icon: 'info-circle',
                          label: `${lang['Help']}`,
                          pageOpen: 'helpWindow',
                      },
                      // {
                      //     icon: 'exclamation-circle',
                      //     label: `${lang['Events']}`,
                      //     pageOpen: 'eventListWithPics',
                      // },
                      {
                          icon: 'sign-out',
                          label: `${lang['Logout']}`,
                          class: 'logout',
                      },
                  ]
              },
              "SideMenuBeforeList": {
                 "name": "SideMenuBeforeList",
                 "color": "grey",
                 "noHeader": true,
                 "noDefaultSectionClasses": true,
                 "section-class": "px-3",
                 "info": [
                     {
                         isFormGroupGroup: true,
                         "noHeader": true,
                         "noDefaultSectionClasses": true,
                         "section-class": "card btn-default text-white px-3 py-2 mb-3 border-0",
                         info: [
                             {
                                  "fieldType": "div",
                                  "id": `clock`,
                                  "style": `cursor:pointer`,
                                  "attribute": `data-target="#time-hours"`,
                                  "divContent": `<div id="time-date"></div>
                                                    <ul>
                                                        <li id="time-hours"></li>
                                                        <li class="point">:</li>
                                                        <li id="time-min"></li>
                                                        <li class="point">:</li>
                                                        <li id="time-sec"></li>
                                                    </ul>
                                                    `
                             },
                         ]
                     },
                     {
                         "id": "indicator-bars",
                         isFormGroupGroup: true,
                         "noHeader": true,
                         "noDefaultSectionClasses": true,
                         "section-class": "card text-white bg-gradient-blue px-3 py-2 mb-3 border-0",
                         info: [
                             {
                                 "fieldType": "indicatorBar",
                                 "evaluation": "details.show_system_usage !== '0'",
                                 "icon": "square",
                                 "name": "cpu",
                                 "label": `<span class="os_cpuCount"><i class="fa fa-spinner fa-pulse"></i></span> ${lang.CPU}<span class="os_cpuCount_trailer"></span> : <span class="os_platform" style="text-transform:capitalize"><i class="fa fa-spinner fa-pulse"></i></span>`,
                             },
                             {
                                 "fieldType": "indicatorBar",
                                 "evaluation": "details.show_system_usage !== '0'",
                                 "icon": "microchip",
                                 "name": "ram",
                                 "label": `<span class="os_totalmem used"><i class="fa fa-spinner fa-pulse"></i></span> ${lang.MB} ${lang.RAM}`,
                             },
                             {
                                 id: 'disk-indicator-bars',
                                 isFormGroupGroup: true,
                                 "noHeader": true,
                                 "noDefaultSectionClasses": true,
                                 "section-class": "disk-indicator-bars",
                                 info: [
                                     {
                                         "fieldType": "indicatorBar",
                                         "icon": "hdd-o",
                                         "name": "disk",
                                         "bars": 3,
                                         "color0": "info",
                                         "title0": lang["Video Share"],
                                         "color1": "danger",
                                         "title1": lang["Timelapse Frames Share"],
                                         "color2": "warning",
                                         "title2": lang["FileBin Share"],
                                         "label": `<span class="diskUsed" style="text-transform:capitalize">${lang.Primary}</span> : <span class="value"></span>`,
                                     },
                                 ]
                             },
                             {
                                 "fieldType": "indicatorBar",
                                 "percent": 0,
                                 "color": 'warning',
                                 "indicatorPercentClass": 'activeCameraCount',
                                 "icon": "video-camera",
                                 "name": "activeCameraCount",
                                 "label": lang['Active Monitors'],
                             },
                         ]
                     }
                 ]
              },
              "SideMenuAfterList": {
                 "name": "SideMenuAfterList",
                 "noHeader": true,
                 "noDefaultSectionClasses": true,
                 "info": []
              }
           }
       },
       // Sidebar for the Superuser panel (web/pages/super.ejs). Same shape as SideMenu
       // above so it renders through web/pages/blocks/super/menuSide.ejs, but without the
       // monitor list and system indicators, which are group-scoped and meaningless here.
       // Each `pageOpen` must match a `.page-tab` id in super.ejs (`tab-<pageOpen>`).
       "SuperSideMenu": {
           "section": "SuperSideMenu",
           showMonitors: false,
           "blocks": {
               "Container1": {
                  "class": `col-md-3 col-lg-2 d-md-block ${mainBackgroundColor} sidebar collapse`,
                  "links": [
                      {
                          icon: 'users',
                          label: lang['Accounts'],
                          pageOpen: 'accounts',
                      },
                      {
                          icon: 'cogs',
                          label: lang['Configuration'],
                          pageOpen: 'config',
                      },
                      {
                          icon: 'terminal',
                          label: lang['Controls and Logs'],
                          pageOpen: 'system',
                      },
                      {
                          icon: 'sliders',
                          label: lang['Preferences'],
                          pageOpen: 'changeSuperPreferences',
                      },
                      { divider: true },
                      {
                          icon: 'globe',
                          label: lang['Easy Remote Access (P2P)'],
                          pageOpen: 'easyRemoteAccess',
                      },
                      {
                          icon: 'puzzle-piece',
                          label: lang['Custom Auto Load'],
                          pageOpen: 'customAutoLoad',
                      },
                      {
                          icon: 'plug',
                          label: lang['Plugin Manager'],
                          pageOpen: 'superPluginManager',
                      },
                      {
                          icon: 'hdd-o',
                          label: lang['Mount Manager'],
                          pageOpen: 'superMountManager',
                      },
                      {
                          icon: 'cloud-upload',
                          label: lang['Global Cloud Uploaders'],
                          pageOpen: 'cloudUploaders',
                      },
                      { divider: true },
                      {
                          icon: 'sitemap',
                          label: lang['Central Management'],
                          pageOpen: 'centralManagement',
                      },
                      {
                          icon: 'random',
                          label: lang[`Failover ${!config.isFailover ? 'Servers' : 'Keys'}`],
                          pageOpen: !config.isFailover ? 'failoverServers' : 'failoverKeys',
                      },
                      { divider: true },
                      {
                          icon: 'sign-out',
                          label: lang['Logout'],
                          class: 'logout',
                      },
                  ]
              }
           }
       },
       "Home": {
           "section": "Home",
           "blocks": {
            //   "Container1": {
            //      "name": "Container1",
            //      "color": "grey",
            //      "noHeader": true,
            //      "noDefaultSectionClasses": true,
            //      "section-class": "col-md-3 pt-3",
            //      "info": [
            //          {
            //              "fieldType": "div",
            //              "class": `card ${mainBackgroundColor} mb-3`,
            //              "divContent": `<div class="card-body ${textWhiteOnBgDark}">
            //                  <h5 class="card-title"><i class="fa fa-th text-muted"></i> ${lang['Live Grid']}</h5>
            //                  <p class="card-text">${lang.liveGridDescription}</p>
            //                  <a page-open="liveGrid" class="btn btn-primary">${lang.Open}</a>
            //                </div>`
            //          },
            //          {
            //              "fieldType": "div",
            //              "class": `card ${mainBackgroundColor} mb-3`,
            //              "divContent": `<div class="card-body ${textWhiteOnBgDark}">
            //                  <h5 class="card-title"><i class="fa fa-gears text-muted"></i> ${lang['Account Settings']}</h5>
            //                  <p class="card-text">${lang.accountSettingsDescription}</p>
            //                  <a page-open="accountSettings" class="btn btn-primary">${lang.Open}</a>
            //                </div>`
            //          },
            //      ]
            // },
            "Container4": {
                "name": "Container4",
                "color": "grey",
                "noHeader": true,
                "noDefaultSectionClasses": true,
                "section-class": "col-lg-12",
                "info": [
                    {
                        ejs: 'web/pages/blocks/home/recentVideos',
                    },
                ]
            }
         }
      },
      "Power Viewer": {
           "section": lang["Power Viewer"],
           "blocks": {
            "Video Playback": {
                id: "powerVideoVideoPlayback",
                noHeader: true,
                noDefaultSectionClasses: true,
               "color": "green",
               "section-pre-class": "col-md-8 search-parent",
               "info": [
                   {
                      "id": "powerVideoMonitorViews",
                      "fieldType": "div",
                   },
                   {
                       "id": "powerVideoMonitorControls",
                       "color": "blue",
                       noHeader: true,
                       isSection: true,
                       isFormGroupGroup: true,
                       'section-class': 'text-center',
                       "info": [
                           {
                              "fieldType": "btn-group",
                              "normalWidth": true,
                              "btns": [
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-success btn-sm`,
                                      "attribute": `powerVideo-control="downloadPlaying" title="${lang['Download']}"`,
                                      "btnContent": `<i class="fa fa-download"></i>`,
                                  }
                              ],
                           },
                           {
                              "fieldType": "btn-group",
                              "normalWidth": true,
                              "btns": [
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="toggleZoom" title="${lang['Zoom In']}"`,
                                      "btnContent": `<i class="fa fa-search-plus"></i>`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="toggleMute" title="${lang['Zoom In']}"`,
                                      "btnContent": `<i class="fa fa-volume-off"></i>`,
                                  },
                              ],
                           },
                           {
                              "fieldType": "btn-group",
                              "normalWidth": true,
                              "btns": [
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="previousVideoAll" title="${lang['Previous Video']}"`,
                                      "btnContent": `<i class="fa fa-arrow-circle-left"></i>`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-danger btn-sm`,
                                      "attribute": `powerVideo-control="playAll" title="${lang['Play']}"`,
                                      "btnContent": `<i class="fa fa-play"></i>`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="pauseAll" title="${lang['Pause']}"`,
                                      "btnContent": `<i class="fa fa-pause"></i>`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="nextVideoAll" title="${lang['Next Video']}"`,
                                      "btnContent": `<i class="fa fa-arrow-circle-right"></i>`,
                                  },
                              ],
                           },
                           {
                              "fieldType": "btn-group",
                              "style": "font-family: monospace;",
                              "normalWidth": true,
                              "btns": [
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="playSpeedAll" data-speed="1"`,
                                      "btnContent": `1`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="playSpeedAll" data-speed="5"`,
                                      "btnContent": `5`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="playSpeedAll" data-speed="10"`,
                                      "btnContent": `10`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="playSpeedAll" data-speed="15"`,
                                      "btnContent": `15`,
                                  },
                              ],
                           },
                       ]
                   },
               ]
           },
           "Container2": {
               id: "powerVideoTabs",
               noHeader: true,
              "section-pre-class": "col-md-4",
              attribute: `tab-chooser-parent`,
              "info": [
                  {
                      "field": lang['Monitors'],
                      "id": "powerVideoMonitorsList",
                      "fieldType": "form",
                      "style": "overflow-y:auto;max-height:200px;",
                  },
                  {
                     "id": "powerVideo_tag_search",
                     "field": lang["Search Object Tags"],
                     "example": "person",
                  },
                  {
                     "id": "powerVideoDateRange",
                     "field": lang['Date Range'],
                  },
                  {
                     "id": "powerVideoVideoLimit",
                     "field": lang['Video Limit'] + ` (${lang['Per Monitor']})`,
                     "placeholder": "0",
                  },
                  {
                     "id": "powerVideoEventLimit",
                     "field": lang['Event Limit'] + ` (${lang['Per Monitor']})`,
                     "placeholder": "500",
                  },
                  {
                      id:'powerVideoSet',
                      field: lang['Video Set'],
                      default:'h264',
                      "fieldType": "select",
                      possible:[
                        {
                            "name": lang.Local,
                           "value": ""
                        },
                        {
                           "name": lang.Cloud,
                           "value": "cloud"
                        },
                        {
                            "name": lang.Archive,
                           "value": "archive"
                        },
                     ]
                  },
              ]
          },
           "Time Strip": {
               id: "powerVideoTimelineStripsContainer",
               noHeader: true,
              "color": "bg-gradient-blue text-white",
              "section-pre-class": "col-md-12",
              "info": [
                  {
                     "id": "powerVideoTimelineStrips",
                     "fieldType": "div",
                     "divContent": `<div class="loading"><i class="fa fa-hand-pointer-o"></i><div class="epic-text">${lang['Select a Monitor']}</div></div>`,
                  },
              ]
          },
         }
      },
      "Studio": {
           "section": lang["Studio"],
           "blocks": {
            "Video Playback": {
                id: "studioVideoPlayback",
                noHeader: true,
                noDefaultSectionClasses: true,
               "color": "green",
               "section-pre-class": "col-md-8 search-parent",
               "info": [
                   {
                      "id": "studioViewingCanvas",
                      "fieldType": "div",
                   },
                   {
                       "id": "studioMonitorControls",
                       "color": "blue",
                       noHeader: true,
                       isSection: true,
                       isFormGroupGroup: true,
                       'section-class': 'text-center',
                       "info": [
                           {
                              "fieldType": "btn-group",
                              "normalWidth": true,
                              "btns": [
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm play-preview`,
                                      "attribute": `title="${lang['Play']}"`,
                                      "btnContent": `<i class="fa fa-play"></i>`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm slice-video`,
                                      "attribute": `title="${lang['Slice']}"`,
                                      "btnContent": `<i class="fa fa-scissors"></i>`,
                                  },
                              ],
                           },
                       ]
                   },
                   {
                       "color": "bg-gradient-blue text-white",
                       noHeader: true,
                       isSection: true,
                       isFormGroupGroup: true,
                       'section-class': 'text-center',
                       "info": [
                           {
                              "id": "studioTimelineStrip",
                              "fieldType": "div",
                              "divContent": `
                                  <div id="studio-time-ticks"></div>
                                  <div id="studio-seek-tick"></div>
                                  <div id="studio-slice-selection" style="width: 80%;left: 10%;"></div>
                              `,
                           },
                       ]
                   },
               ]
           },
           "Container2": {
               noHeader: true,
              "section-pre-class": "col-md-4",
              "noDefaultSectionClasses": true,
              "info": [
                  {
                     "id": "studio-completed-videos",
                     "fieldType": "div",
                  },
              ]
          }
         }
      },
      "Calendar": {
          "section": "Calendar",
          "blocks": {
              // No date picker here : the calendar's own navigation *is* the date range, so
              // videos are fetched for whatever span it is currently showing. That leaves the
              // monitor selector as the only thing to search by.
              "Search Settings": {
                 noHeader: true,
                 "name": lang["Search Settings"],
                 "color": "green",
                 "section-pre-class": "col-md-12",
                 "box-wrapper-class": "d-flex flex-row flex-wrap align-items-end",
                 "info": [
                     {
                         "field": lang["Monitor"],
                         "fieldType": "select",
                         "class": "monitors_list",
                         "form-group-class": "col me-3 mb-0",
                         "possible": []
                     },
                     {
                        "fieldType": "btn-group",
                        "form-group-class-pre-layer": "mb-0",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "class": `btn-success fill refresh-data`,
                                "icon": `refresh`,
                                "btnContent": `${lang['Refresh']}`,
                            },
                        ],
                     },
                ]
            },
            "Calendar": {
                noHeader: true,
               "section-pre-class": "col-md-12",
               "info": [
                   // Shown only when the visible range holds more recordings than the tab
                   // will draw, so a partial calendar is never mistaken for a complete one.
                   {
                       "fieldType": "div",
                       "id": "calendar_limit_notice",
                       "class": "alert alert-warning d-none",
                       "divContent": ""
                   },
                   {
                       "fieldType": "div",
                       "id": "calendar_draw_area",
                       "divContent": ""
                   }
               ]
           },
         }
      },
      "FileBin": {
          "section": "FileBin",
          "blocks": {
              "Search Settings": {
                 noHeader: true,
                 "name": lang["Search Settings"],
                 "color": "green",
                 "section-pre-class": "col-md-12",
                 "box-wrapper-class": "d-flex flex-row flex-wrap align-items-end",
                 "info": [
                     {
                         "field": lang["Monitor"],
                         "fieldType": "select",
                         "class": "monitors_list",
                         "form-group-class": "col me-3 mb-0",
                         "possible": []
                     },
                     {
                         "class": "date_selector",
                         "field": lang.Date,
                         "form-group-class": "col me-3 mb-0",
                     },
                     {
                        "fieldType": "btn-group",
                        "form-group-class-pre-layer": "me-3 mb-0",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "class": `btn-success fill refresh-data`,
                                "icon": `search`,
                                "btnContent": `${lang['Search']}`,
                            }
                        ],
                     },
                     {
                        "fieldType": "div",
                        "class": "dropdown d-inline-block",
                        "form-group-class-pre-layer": "mb-0",
                        "divContent": `<button type="button" class="btn btn-default dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fa fa-clock-o"></i> ${lang['Quick Range']}
                        </button>
                        <ul class="dropdown-menu ${Theme.isDark ? 'dropdown-menu-dark bg-dark' : ''} shadow-lg">
                            <li><a class="dropdown-item fileBin_quick_daterange" href="#" data-hours="1">${lang.Last} 1 ${lang.hours}</a></li>
                            <li><a class="dropdown-item fileBin_quick_daterange" href="#" data-hours="3">${lang.Last} 3 ${lang.hours}</a></li>
                            <li><a class="dropdown-item fileBin_quick_daterange" href="#" data-hours="6">${lang.Last} 6 ${lang.hours}</a></li>
                            <li><a class="dropdown-item fileBin_quick_daterange" href="#" data-hours="9">${lang.Last} 9 ${lang.hours}</a></li>
                            <li><a class="dropdown-item fileBin_quick_daterange" href="#" data-hours="12">${lang.Last} 12 ${lang.hours}</a></li>
                            <li><a class="dropdown-item fileBin_quick_daterange" href="#" data-hours="24">${lang.Last} 24 ${lang.hours}</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item fileBin_quick_daterange" href="#" data-days="7">${lang.Last} 7 ${lang.Days}</a></li>
                            <li><a class="dropdown-item fileBin_quick_daterange" href="#" data-days="30">${lang.Last} 30 ${lang.Days}</a></li>
                        </ul>`
                     },
                ]
            },
            // Preview player for the row you click. It used to sit inside the search column;
            // with the controls now in a top bar it gets its own full-width block above the
            // table, and stays collapsed until there is something to play.
            "FileBin Preview": {
                noHeader: true,
               hidden: true,
               "id": "fileBin_preview_block",
               "section-pre-class": "col-md-12",
               "info": [
                   {
                       "fieldType": "div",
                       "id": "fileBin_preview_area",
                       "divContent": ""
                   }
               ]
           },
            "FileBin": {
                noHeader: true,
               "section-pre-class": "col-md-12",
               "info": [
                   {
                       "fieldType": "table",
                       "attribute": `data-classes="table table-striped"`,
                       "id": "fileBin_draw_area",
                       "divContent": ""
                   }
               ]
           },
         }
      },
      "Videos Table": require('./videosTable.js')(s,config,lang,Theme),
      "Events Table": require('./eventsTable.js')(s,config,lang,Theme),
      // Declared here, filled in at load time by libs/uploaders.js from the cloud uploader
      // registry. It has to exist up front because libs/definitions.js caches a shallow copy
      // of this object as soon as it is built -- a new top level key added later would not
      // reach that copy, while mutating this `blocks` object in place does.
      "Global Cloud Uploaders": {
           "section": "Global Cloud Uploaders",
           "blocks": {},
      },
      "Admin Account Settings": {
           "section": "Admin Account Settings",
           "blocks": {
               "Account": {
                  "name": lang["Account"],
                  "color": "blue",
                  "section-pre-class": "col-md-6",
                  "info": [
                      {
                         "name": "mail",
                         "field": lang.Email,
                      },
                      {
                         "name": "ke",
                         "field": lang['Group Key'],
                         // legacyCreateAdminUser generates one with s.gid() when this is
                         // left empty. On edit the field is disabled and already filled, so
                         // this only ever shows while creating an account.
                         "placeholder": lang['Leave blank to randomly generate'],
                      },
                      {
                         "name": "pass",
                         "type": "password",
                         "field": lang['Password'],
                         "fieldType": "password",
                         "attribute": 'autocomplete="new-password"',
                      },
                      {
                         "name": "password_again",
                         "type": "password",
                         "field": lang['Password Again'],
                         "fieldType": "password",
                         "attribute": 'autocomplete="new-password"',
                      },
                      {
                          "field": lang['2-Factor Authentication'],
                          "name": "detail=factorAuth",
                          "default":'0',
                          "fieldType": "select",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                 ]
              },
              "Limits": {
                 "name": lang["Limits"],
                 "color": "orange",
                 "section-pre-class": "col-md-6",
                 "info": [
                      {
                         "name": "detail=size",
                         "field": lang['Max Storage Amount'],
                         "default": '10000'
                      },
                      {
                         "name": "detail=days",
                         "field": `${lang['Number of Days to keep']} ${lang['Videos']}`,
                         "default": '5'
                      },
                      {
                         "name": "detail=event_days",
                         "field": `${lang['Number of Days to keep']} ${lang['Events']}`,
                         "default": '10'
                      },
                      {
                         "name": "detail=log_days",
                         "field": `${lang['Number of Days to keep']} ${lang['Logs']}`,
                         "default": '10'
                      },
                      // {
                      //    "name": "detail=log_timelapseFrames",
                      //    "field": `${lang['Number of Days to keep']} ${lang['Timelapse Frames']}`,
                      //    "default": '10'
                      // },
                      {
                         "name": "detail=max_camera",
                         "field": lang['Max Number of Cameras'],
                         "placeholder": lang['Leave blank for unlimited']
                      },
                 ]
              },
              "Permissions": {
                 "name": lang["Permissions"],
                 "color": "red",
                 "section-pre-class": "col-md-6",
                 "info": [
                      {
                          "field": lang.Permissions,
                          "name": "detail=permissions",
                          "default":'1',
                          "fieldType": "select",
                          selector:'more_perms',
                          possible: [
                            {
                                "name": lang['All Privileges'],
                               "value": "all"
                            },
                            {
                               "name": lang.Limited,
                               "value": "limited"
                            },
                         ]
                      },
                      {
                          "field": lang['Can edit Max Storage'],
                          "name": "detail=edit_size",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-visibleWhen":{ "more_perms": "limited" },
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Can edit Max Days'],
                          "name": "detail=edit_days",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-visibleWhen":{ "more_perms": "limited" },
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Can edit how long to keep Events'],
                          "name": "detail=edit_event_days",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-visibleWhen":{ "more_perms": "limited" },
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Can edit how long to keep Logs'],
                          "name": "detail=edit_log_days",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-visibleWhen":{ "more_perms": "limited" },
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      // Per uploader permissions are generated at load time from the cloud
                      // uploader registry (see libs/uploaders.js), so every uploader -- including
                      // ones added by plugins -- gets both an enable toggle and a "force server
                      // credentials" toggle without being listed here by hand. These two fields are
                      // Superuser only: beforeAccountSave resets them from stored details, so an
                      // Admin cannot change them from their own Account Settings.
                      {
                          "field": lang['Can use Plugin Manager'],
                          "name": "detail=use_plugin_manager",
                          // Default '0' on purpose: this is what an account with no stored
                          // value shows, and no stored value means No at runtime. Account
                          // creation sets it to Yes explicitly, see blocks/mainpermissions.ejs.
                          "default":'0',
                          "fieldType": "select",
                          "description": lang.usePluginManagerText,
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Can use System Control'],
                          "name": "detail=use_system_control",
                          "default":'0',
                          "fieldType": "select",
                          "description": lang.useSystemControlText,
                          possible: [
                            { "name": lang.No, "value": "0" },
                            { "name": lang.Yes, "value": "1" },
                         ]
                      },
                      {
                          "field": lang['Can use Easy Remote Access'],
                          "name": "detail=use_remote_access",
                          // Same rule as the Plugin Manager: '0' is what an account with no
                          // stored value shows, and no stored value means No at runtime.
                          "default":'0',
                          "fieldType": "select",
                          "description": lang.useRemoteAccessText,
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Can see CPU and RAM usage'],
                          "name": "detail=show_system_usage",
                          "default":'1',
                          "fieldType": "select",
                          "description": lang.showSystemUsageText,
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                 ]
              },
              "CloudUploaders": {
                 "name": lang["Cloud Uploaders"],
                 "color": "forestgreen",
                 "section-pre-class": "col-md-6",
                 "info": [
                      { "cloudUploaderPermissionsAnchor": true },
                 ]
              },
              "Integrations": {
                 "name": lang["Integrations"],
                 "color": "purple",
                 "section-pre-class": "col-md-6",
                 "info": [
                      {
                          "field": lang['Can use Discord Bot'],
                          "name": "detail=use_discordbot",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-visibleWhen":{ "more_perms": "limited" },
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Can use LDAP'],
                          "name": "detail=use_ldap",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-visibleWhen":{ "more_perms": "limited" },
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      // NEEDS TO MOVE DESIGNATED FILES AFTER TESTING />
                 ]
              },
              "Save": {
                 "noHeader": true,
                 "noDefaultSectionClasses": true,
                 "section-pre-class": "col-md-12",
                 "info": [
                      {
                         "fieldType": "btn-group",
                         "btns": [
                             {
                                 "fieldType": "btn",
                                 "class": `submit btn-success fill`,
                                 "btnContent": `${lang['Save']}`,
                             },
                         ],
                      },
                 ]
             },
          }
        },
    "Super User Preferences": {
         "section": "Super User Preferences",
         "blocks": {
             "Editor": {
                noHeader: true,
                "color": "grey",
                "noDefaultSectionClasses": true,
                "box-wrapper-class": "row",
                "info": [
                    {
                        isFormGroupGroup: true,
                        "noHeader": true,
                        "section-pre-class": "col-md-6",
                        info: [
                            {
                               "name": "mail",
                               "field": lang.Email,
                            },
                            {
                               "name": "pass",
                               "type": "password",
                               "fieldType": "password",
                               "field": lang['Password'],
                               "attribute": 'autocomplete="new-password"',
                            },
                            {
                               "name": "pass_again",
                               "type": "password",
                               "fieldType": "password",
                               "field": lang['Password Again'],
                               "attribute": 'autocomplete="new-password"',
                            },
                            // Save now lives in the tab's floating bar
                            // (web/pages/blocks/super/stickySubmitBar.ejs).
                        ]
                    },
                    {
                        isFormGroupGroup: true,
                        "name": lang["API Keys"],
                        "section-pre-class": "col-md-6",
                        info: [
                            {
                               "fieldType": "btn-group",
                               "btns": [
                                   {
                                       "fieldType": "btn",
                                       "class": `new-token btn-success`,
                                       "btnContent": `${lang['Add']}`,
                                   },
                               ],
                            },
                            {
                               "id": "super-tokens",
                               "fieldType": "div",
                            },
                        ]
                    },
                ]
            }
        }
    },
    "Help Window": {
           "section": "Help Window",
           "blocks": {
               "Column1": {
                   "name": lang["Helping Hand"],
                  "color": "navy",
                  "blockquote": lang.helpFinderDescription,
                  "section-pre-class": "col-md-4",
                  "info": [
                       {
                         "id": "helpinghand-options",
                         "field": lang["Active Tutorial"],
                         "fieldType": "select",
                         "possible": [
                             // {
                             //    "name": lang['Date Updated'],
                             //    "value": "dateUpdated"
                             // },
                         ]
                      },
                      {
                          "field": lang["Monitor"],
                          "form-group-class": "helping-hand-target-monitor",
                          "fieldType": "select",
                          "class": "monitors_list",
                     },
                     {
                         "fieldType": "btn",
                         "class": `btn-primary fill watch-helping-hand mb-1`,
                         "btnContent": lang.Run,
                     },
                     {
                         "id": "helpinghand-results",
                         "fieldType": "div",
                     },
                 ]
             },
             "Column2": {
                noHeader: true,
                "color": "blue",
                "section-pre-class": "col-md-8",
                "noDefaultSectionClasses": true,
                "box-wrapper-class": "row",
                "info": [
                    {
                        title: lang["New to Shinobi?"],
                        info: `Try reading over some of these links to get yourself started.`,
                        buttons: [
                            {
                                icon: 'newspaper-o',
                                color: 'default',
                                text: lang.afterInstallationGuides,
                                href: 'https://shinobi.video/docs/configure'
                            },
                            {
                                icon: 'plus',
                                color: 'default',
                                text: lang.addingAnH264Camera,
                                href: 'https://shinobi.video/docs/configure#content-adding-an-h264h265-camera'
                            },
                            {
                                icon: 'plus',
                                color: 'default',
                                text: lang.addingAnMJPEGCamera,
                                href: 'https://shinobi.video/articles/2018-09-19-how-to-add-an-mjpeg-camera'
                            },
                            {
                                icon: 'gears',
                                color: 'default',
                                text: lang.rtspCameraOptimization,
                                href: 'https://shinobi.video/articles/2017-07-29-how-i-optimized-my-rtsp-camera'
                            },
                            {
                                icon: 'comments-o',
                                color: 'info',
                                text: lang.communityChat,
                                href: 'https://discord.gg/ehRd8Zz'
                            },
                            {
                                icon: 'reddit',
                                color: 'info',
                                text: lang.forumOnReddit,
                                href: 'https://www.reddit.com/r/ShinobiCCTV'
                            },
                            {
                                icon: 'file-o',
                                color: 'primary',
                                text: lang.Documentation,
                                href: 'http://shinobi.video/docs'
                            }
                        ]
                    },
                    {
                        bigIcon: "smile-o",
                        title: lang.itsAProvenFact,
                        info: lang.generosityHappierPerson,
                        buttons: [
                            {
                                icon: 'share-square-o',
                                color: 'default',
                                text: lang['ShinobiShop Subscriptions'],
                                href: 'https://licenses.shinobi.video/subscribe'
                            },
                            {
                                icon: 'paypal',
                                color: 'default',
                                text: lang['Donate by PayPal'],
                                href: 'https://www.paypal.me/ShinobiCCTV'
                            },
                            {
                                icon: 'bank',
                                color: 'default',
                                text: 'University of Zurich (UZH)',
                                href: 'https://www.zora.uzh.ch/id/eprint/139275/'
                            },
                        ]
                    },
                    {
                        title: lang["Shinobi Mobile"],
                        info: lang.yourSubscriptionText,
                        buttons: [
                            {
                                icon: 'star',
                                color: 'success',
                                text: lang['Get the Mobile App'],
                                href: 'https://shinobi.video/mobile'
                            },
                            {
                                icon: 'comments-o',
                                color: 'primary',
                                text: lang['#mobile-client Chat'],
                                href: 'https://discord.gg/ehRd8Zz'
                            },
                        ]
                    },
                    {
                        title: lang.activateShinobi,
                        info: lang.howToActivate,
                        buttons: [
                            {
                                icon: 'share-square-o',
                                color: 'default',
                                text: 'Shinobi Mobile License ($5/m)',
                                href: 'https://licenses.shinobi.video/subscribe?planSubscribe=plan_G31AZ9mknNCa6z',
                            },
                            {
                                icon: 'share-square-o',
                                color: 'default',
                                text: 'Tiny Support Subscription ($10/m)',
                                href: 'https://licenses.shinobi.video/subscribe?planSubscribe=plan_G42jNgIqXaWmIC',
                            },
                            {
                                icon: 'share-square-o',
                                color: 'default',
                                text: '100 Camera License ($75/m)',
                                href: 'https://licenses.shinobi.video/subscribe?planSubscribe=plan_G3LGdNwA8lSmQy',
                            },
                        ]
                    },
                    {
                        title: lang['Donations, One-Time Boost'],
                        info: lang.donationOneTimeText,
                        width: 12,
                        buttons: [
                            {
                                icon: 'paypal',
                                color: 'default',
                                text: lang['Donate by PayPal'],
                                href: 'https://www.paypal.me/ShinobiCCTV'
                            },
                        ]
                    },
                ].map((block) => {
                    var parsedButtons = block.buttons.map((btn) => {
                        return {
                            "fieldType": "btn",
                            "class": `btn-${btn.color} fill mb-1`,
                            "icon": btn.icon,
                            "attribute": `href="${btn.href}" target="_blank"`,
                            "btnContent": btn.text,
                        }
                    });
                    return {
                       noHeader: true,
                       isFormGroupGroup: true,
                       "section-pre-class": `col-md-${block.width || '6'} mb-3`,
                       "info": [
                           {
                               "fieldType": "div",
                               divContent: `<h3>${block.title}</h3>`
                           },
                           {
                               "fieldType": "div",
                               class: 'mb-3',
                               divContent: block.info
                           },
                           ...parsedButtons
                       ]
                    }
                })
            },
        }
    },
    "Monitor Map": {
         "section": "Monitor Map",
         "blocks": {
             "Search Settings": {
                "name": lang["Monitor Map"],
                "color": "blue",
                "noHeader": true,
                "noDefaultSectionClasses": true,
                "info": [
                    {
                        "fieldType": "div",
                        "id": "monitor-map-canvas",
                    }
               ]
           },
        }
      },
      "Timeline": {
           "section": "Timeline",
           "blocks": {
               "Search Settings": {
                  "name": lang["Timeline"],
                  "color": "blue",
                  "noHeader": true,
                  "noDefaultSectionClasses": true,
                  "box-wrapper-class": "flex-direction-column",
                  "info": [
                      {
                          "fieldType": "div",
                          "class": "row m-0",
                          "id": "timeline-video-canvas",
                      },
                      {
                          "fieldType": "div",
                          "class": "row p-1 m-0",
                          "id": "timeline-info",
                          "divContent": `
                          <div class="text-center">
                            <span class="current-time font-monospace ${textWhiteOnBgDark}"></span>
                          </div>`
                      },
                      {
                          "fieldType": "div",
                          "class": "p-2",
                          "id": "timeline-controls",
                          "divContent": `
                          <div class="text-center">
                              <div class="btn-group">
                                  <a class="btn btn-sm btn-default" timeline-action="jumpPrev" title="${lang.jumptoPreviousVideo}"><i class="fa fa-angle-double-left"></i></a>
                                  <a class="btn btn-sm btn-default" timeline-action="jumpLeft" title="${lang.jumpFiveSeconds}"><i class="fa fa-arrow-circle-left"></i></a>
                                  <a class="btn btn-sm btn-primary" timeline-action="playpause" title="${lang.Play}/${lang.Pause}"><i class="fa fa-play-circle-o"></i></a>
                                  <a class="btn btn-sm btn-default" timeline-action="jumpRight" title="${lang.jumpFiveSeconds}"><i class="fa fa-arrow-circle-right"></i></a>
                                  <a class="btn btn-sm btn-default" timeline-action="jumpNext" title="${lang.jumptoNextVideo}"><i class="fa fa-angle-double-right"></i></a>
                              </div>
                              <div class="btn-group">
                                  <a class="btn btn-sm btn-default btn-success" timeline-action="speed" speed="1" title="${lang.Speed} x1">x1</a>
                                  <a class="btn btn-sm btn-default" timeline-action="speed" speed="2" title="${lang.Speed} x2">x2</a>
                                  <a class="btn btn-sm btn-default" timeline-action="speed" speed="5" title="${lang.Speed} x5">x5</a>
                                  <a class="btn btn-sm btn-default" timeline-action="speed" speed="7" title="${lang.Speed} x7">x7</a>
                                  <a class="btn btn-sm btn-default" timeline-action="speed" speed="10" title="${lang.Speed} x10">x10</a>
                              </div>
                              <div class="btn-group">
                                  <a class="btn btn-sm btn-default" timeline-action="gridSize" size="md-12">1</a>
                                  <a class="btn btn-sm btn-default btn-success" timeline-action="gridSize" size="md-6">2</a>
                                  <a class="btn btn-sm btn-default" timeline-action="gridSize" size="md-4">3</a>
                              </div>
                              <div class="btn-group">
                                  <input class="form-control form-control-sm" id="timeline-video-object-search" placeholder="${lang['Search Object Tags']}">
                              </div>
                              <div class="btn-group">
                                  <select class="form-control form-control-sm" id="timeline-video-type">
                                    <option value="">${lang.Local}</option>
                                    <option value="cloud">${lang.Cloud}</option>
                                    <option value="archive">${lang.Archive}</option>
                                  </select>
                              </div>
                              <div class="btn-group">
                                  <a class="btn btn-sm btn-primary" timeline-action="autoGridSizer" title="${lang.autoResizeGrid}"><i class="fa fa-expand"></i></a>
                                  <a class="btn btn-sm btn-primary" timeline-action="playUntilVideoEnd" title="${lang.playUntilVideoEnd}"><i class="fa fa-step-forward"></i></a>
                                  <a class="btn btn-sm btn-primary btn-warning" timeline-action="dontShowDetection" title="${lang['Hide Detection on Stream']}"><i class="fa fa-grav"></i></a>
                              </div>
                              <div class="btn-group">
                                  <a class="btn btn-sm btn-success" timeline-action="downloadAll" title="${lang.Download}"><i class="fa fa-download"></i></a>
                              </div>
                              <div class="btn-group">
                                  <a class="btn btn-sm btn-default" class_toggle="show-non-playing" data-target="#timeline-video-canvas" icon-toggle="fa-eye fa-eye-slash" icon-child="i" title="${lang['Show Only Playing']}"><i class="fa fa-eye-slash"></i></a>
                                  <a class="btn btn-sm btn-default" timeline-action="refresh" title="${lang.Refresh}"><i class="fa fa-refresh"></i></a>
                              </div>
                              <div class="btn-group">
                                  <a class="btn btn-sm btn-primary" id="timeline-date-selector" title="${lang.Date}"><i class="fa fa-calendar"></i></a>
                              </div>
                              <div class="btn-group">
                                  <button type="button" class="btn btn-primary btn-sm dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                      <i class="fa fa-video-camera"></i>
                                  </button>
                                  <ul class="dropdown-menu px-3 bg-dark" id="timeline-monitor-list"></ul>
                              </div>
                          </div>
                          `,
                      },
                      {
                          "fieldType": "div",
                          "id": "timeline-bottom-strip",
                      },
                      {
                          "fieldType": "div",
                          "id": "timeline-pre-buffers",
                          "class": "hidden",
                      }
                 ]
             },
          }
      },
      "Rally": {
            "section": "Rally",
            "name": "Rally",
            "blocks": {
                "Search Settings": {
                   "id": "rallyConfigure",
                   "name": lang.Scan,
                   "blockquote": lang.RallyDescription,
                   "color": "green",
                   "section-pre-class": "col-md-4",
                   isFormGroupGroup: true,
                   "info": [
                       {
                           "name": "host",
                           "field": lang["Host"],
                           "placeholder": "http://shinobi_host:8080",
                       },
                       {
                           "name": "groupKey",
                           "field": lang["Group Key"],
                       },
                       {
                           "name": "apiKey",
                           "field": lang["API Key"],
                           "description": lang.rallyApiKeyFieldText,
                       },
                       {
                           "name": "channel",
                           "field": lang["Channel"],
                           "description": lang.rallyChannelDescription,
                       },
                       {
                         "fieldType": "btn-group",
                         "btns": [
                             {
                                 forForm: true,
                                 "fieldType": "btn",
                                 "class": `btn-success fill mb-3`,
                                 "icon": `search`,
                                 "attribute": `type="submit"`,
                                 "btnContent": `${lang['Scan']}`,
                             }
                          ]
                       }
                  ]
              },
              "Management": {
                 "id": "rallyManagement",
                 "noHeader": true,
                 "color": "blue",
                 "section-pre-class": "col-md-8",
                 "info": [
                     {
                         "id":"rallyServerInfo",
                         "fieldType": "div",
                         "class": "mb-3",
                     },
                     {
                        "fieldType": "btn-group",
                        "class": "mb-3",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "class": `btn-success add-all`,
                                "btnContent": `<i class="fa fa-plus"></i> ${lang['Add All (Rallied)']}`,
                            },
                            // {
                            //     "fieldType": "btn",
                            //     "class": `btn-success add-all-direct`,
                            //     "btnContent": `<i class="fa fa-plus"></i> ${lang['Add All (Direct)']}`,
                            // },
                        ],
                     },
                     {
                         "id":"rallyCameras",
                         "fieldType": "table",
                         "attribute": `data-classes="table table-striped"`,
                         "divContent": ""
                     }
                 ]
             },
           }
       }
  })
}
