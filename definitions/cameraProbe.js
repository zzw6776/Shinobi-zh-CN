module.exports = (s,config,lang,Theme) => {
    return {
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
      }
}
