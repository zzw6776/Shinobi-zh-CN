module.exports = (s,config,lang) => {
    return {
          "section": "Monitor Settings Additional Input Map",
          "blocks": {
             "Connection" : {
                "id": `monSectionMap$[TEMP_ID]`,
                "name": `${lang['Input Map']} $[NUMBER]`,
                "section-class": "input-map",
                "color": "orange",
                "isSection": true,
                "info": [
                    {
                       "fieldType": "btn-group",
                       "btns": [
                           {
                               "fieldType": "btn",
                               "class": `btn-danger delete mb-2`,
                               "btnContent": `${lang['Delete']}`,
                           }
                       ],
                    },
                    {
                        name:'map-detail=type',
                        field:lang['Input Type'],
                        default:'h264',
                        attribute:'selector="h_i_$[TEMP_ID]"',
                        "fieldType": "select",
                        type:'selector',
                        possible:[
                          {
                             "name": "H.264 / H.265 / H.265+",
                             "value": "h264"
                          },
                          {
                             "name": "JPEG",
                             "value": "jpeg"
                          },
                          {
                             "name": "MJPEG",
                             "value": "mjpeg"
                          },
                          {
                             "name": "HLS (.m3u8)",
                             "value": "hls"
                          },
                          {
                             "name": "MPEG-4 (.mp4 / .ts)",
                             "value": "mp4"
                          },
                          {
                             "name": "Local",
                             "value": "local"
                          },
                          {
                             "name": "Raw",
                             "value": "raw"
                          }
                       ]
                    },
                    {
                        name:'map-detail=fulladdress',
                        field:lang['Full URL Path'],
                        placeholder:'Example : rtsp://admin:password@123.123.123.123/stream/1',
                        type:'text',
                    },
                    {
                        name:'map-detail=sfps',
                        field:lang['Monitor Capture Rate'],
                        placeholder:'',
                        type:'text',
                    },
                    {
                        name:'map-detail=aduration',
                        field:lang['Analyzation Duration'],
                        placeholder:'Example : 1000000',
                        type:'text',
                    },
                    {
                        name:'map-detail=probesize',
                        field:lang['Probe Size'],
                        placeholder:'Example : 1000000',
                        type:'text',
                    },
                    {
                        name:'map-detail=stream_loop',
                        field:lang['Loop Stream'],
                        "form-group-visibleWhen":{ "h_i_$[TEMP_ID]": ["mp4","raw"] },
                        hidden:true,
                        default:'0',
                        "fieldType": "select",
                        type:'selector',
                        possible:[
                            {
                               "name": lang.No,
                               "value": "0",
                            },
                            {
                               "name": lang.Yes,
                               "value": "1",
                            }
                        ]
                    },
                    {
                        name:'map-detail=rtsp_transport',
                        field:lang['RTSP Transport'],
                        "form-group-visibleWhen":{ "h_i_$[TEMP_ID]": "h264" },
                        default:'',
                        "fieldType": "select",
                        type:'selector',
                        possible:[
                            {
                               "name": lang.Auto,
                               "value": "",
                               "info": lang["fieldTextMapRtspTransportAuto"]
                            },
                            {
                               "name": "TCP",
                               "value": "tcp",
                               "info": lang["fieldTextMapRtspTransportTCP"]
                            },
                            {
                               "name": "UDP",
                               "value": "udp",
                               "info": lang["fieldTextMapRtspTransportUDP"]
                            }
                        ]
                    },
                    {
                        name:'map-detail=accelerator',
                        field:lang['Accelerator'],
                        selector:'h_accel_$[TEMP_ID]',
                        default:'0',
                        "fieldType": "select",
                        type:'selector',
                        possible:[
                            {
                               "name": lang.No,
                               "value": "0",
                            },
                            {
                               "name": lang.Yes,
                               "value": "1",
                            }
                        ]
                    },
                    {
                        name:'map-detail=hwaccel',
                        field:lang['hwaccel'],
                        "form-group-visibleWhen":{ "h_accel_$[TEMP_ID]": "1" },
                        hidden:true,
                        default:'',
                        "fieldType": "select",
                        type:'selector',
                        possible: s.listOfHwAccels
                    },
                    {
                        name:'map-detail=hwaccel_vcodec',
                        field:lang['hwaccel_vcodec'],
                        "form-group-visibleWhen":{ "h_accel_$[TEMP_ID]": "1" },
                        hidden:true,
                        default:'auto',
                        "fieldType": "select",
                        type:'selector',
                        possible:[
                            {
                               "name": lang.Auto + '('+lang.Recommended+')',
                               "value": ""
                            },
                            {
                               "name": lang.NVIDIA,
                               "optgroup": [
                                   {
                                      "name": lang.h264_cuvid,
                                      "value": "h264_cuvid"
                                   },
                                   {
                                      "name": lang.hevc_cuvid,
                                      "value": "hevc_cuvid"
                                   },
                                   {
                                      "name": lang.mjpeg_cuvid,
                                      "value": "mjpeg_cuvid"
                                   },
                                   {
                                      "name": lang.mpeg4_cuvid,
                                      "value": "mpeg4_cuvid"
                                   },
                               ]
                            },
                            {
                               "name": lang["Quick Sync Video"],
                               "optgroup": [
                                   {
                                      "name": lang.h264_qsv,
                                      "value": "h264_qsv"
                                   },
                                   {
                                      "name": lang.hevc_qsv,
                                      "value": "hevc_qsv"
                                   },
                                   {
                                      "name": lang.mpeg2_qsv,
                                      "value": "mpeg2_qsv"
                                   },
                               ]
                            },
                            {
                               "name": lang['Raspberry Pi'],
                               "optgroup": [
                                   {
                                      "name": lang.h264_mmal,
                                      "value": "h264_mmal"
                                   },
                                   {
                                      "name": lang.mpeg2_mmal,
                                      "value": "mpeg2_mmal"
                                   },
                                   {
                                      "name": lang["MPEG-4 (Raspberry Pi)"],
                                      "value": "mpeg4_mmal"
                                   }
                               ]
                            },
                            {
                               "name": lang.Jetson,
                               "optgroup": [
                                   {
                                      "name": lang.h264_nvv4l2dec,
                                      "value": "h264_nvv4l2dec"
                                   },
                                   {
                                      "name": lang.mpeg2_nvv4l2dec,
                                      "value": "mpeg2_nvv4l2dec"
                                   },
                                   {
                                      "name": lang.mpeg4_nvv4l2dec,
                                      "value": "mpeg4_nvv4l2dec"
                                   }
                               ]
                            },
                           ]
                    },
                    {
                        name:'map-detail=hwaccel_device',
                        field:lang['hwaccel_device'],
                        "form-group-visibleWhen":{ "h_accel_$[TEMP_ID]": "1" },
                        hidden:true,
                        placeholder:'Example : /dev/dri/video0',
                        type:'text',
                    },
                    {
                        name:'map-detail=cust_input',
                        field:lang['Input Flags'],
                        type:'text',
                    },
                ]
            }
        }
    }
}
