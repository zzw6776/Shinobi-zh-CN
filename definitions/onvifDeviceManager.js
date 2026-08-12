module.exports = (s,config,lang,Theme) => {
    return {
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
    }
}
