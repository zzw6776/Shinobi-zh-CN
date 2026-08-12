module.exports = (s,config,lang) => {
    return {
          "section": "Monitor Settings Additional Stream Channel",
          "blocks": {
             "Stream" : {
                 "id": `monSectionChannel$[TEMP_ID]`,
                "name": `${lang["Stream Channel"]} $[NUMBER]`,
                "color": "blue",
                "input-mapping": "stream_channel-$[NUMBER]",
                "isSection": true,
                "section-class": "stream-channel",
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
                       "field": lang["Stream Type"],
                       "name": `channel-detail="stream_type"`,
                       "description": lang["fieldTextChannelStreamType"],
                       "default": "mp4",
                       "selector": "h_st_channel_$[TEMP_ID]",
                       "fieldType": "select",
                       "attribute": `triggerChange="#monSectionChannel$[TEMP_ID] [channel-detail=stream_vcodec]" triggerChangeIgnore="b64,mjpeg"`,
                       "possible": [
                            {
                               "name": lang.Poseidon,
                               "value": "mp4",
                               "info": lang["fieldTextChannelStreamTypePoseidon"]
                            },
                            {
                               "name": lang["RTMP Stream"],
                               "value": "rtmp",
                            },
                            {
                               "name": lang['MJPEG'],
                               "value": "mjpeg",
                               "info": lang["fieldTextChannelStreamTypeMJPEG"]
                            },
                            {
                               "name": lang['FLV'],
                               "value": "flv",
                               "info": lang["fieldTextChannelStreamTypeFLV"]
                            },
                            {
                               "name": lang['HLS (includes Audio)'],
                               "value": "hls",
                               "info": lang["fieldTextChannelStreamTypeHLS(includesAudio)"]
                            }
                         ]
                    },
                    {
                       "field": lang['Server URL'],
                       "name": `channel-detail="rtmp_server_url"`,
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": "rtmp" },
                       "example": "rtmp://live-api.facebook.com:80/rtmp/",
                    },
                    {
                       "field": lang['Stream Key'],
                       "name": `channel-detail="rtmp_stream_key"`,
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": "rtmp" },
                       "example": "1111111111?ds=1&a=xxxxxxxxxx",
                    },
                    {
                       "field": lang['# of Allow MJPEG Clients'],
                       "name": `channel-detail="stream_mjpeg_clients"`,
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": "mjpeg" },
                       "placeholder": "20",
                    },
                    {
                       "field": lang['Video Codec'],
                       "name": `channel-detail="stream_vcodec"`,
                       "description": lang["fieldTextChannelStreamVcodec"],
                       "default": "no",
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": ["hls","rtmp","flv","mp4","h264"] },
                       "fieldType": "select",
                       "selector": "h_hls_v_channel_$[TEMP_ID]",
                       "possible": [
                          {
                             "name": lang.Auto,
                             "value": "no",
                             "info": lang["fieldTextChannelStreamVcodecAuto"]
                          },
                          {
                             "name": "libx264",
                             "value": "libx264",
                             "info": lang["fieldTextChannelStreamVcodecLibx264"]
                          },
                          {
                             "name": "libx265",
                             "value": "libx265",
                             "info": lang["fieldTextChannelStreamVcodecLibx265"]
                          },
                          {
                             "name": lang.copy,
                             "value": "copy",
                             "info": lang["fieldTextChannelStreamVcodecCopy"]
                          },
                          {
                              "name": lang['Hardware Accelerated'],
                              "optgroup": [
                                  {
                                     "name": "H.264 VA-API (Intel HW Accel)",
                                     "value": "h264_vaapi"
                                  },
                                  {
                                     "name": "H.265 VA-API (Intel HW Accel)",
                                     "value": "hevc_vaapi"
                                  },
                                  {
                                     "name": "H.264 NVENC (NVIDIA HW Accel)",
                                     "value": "h264_nvenc"
                                  },
                                  {
                                     "name": "H.264 NVENC Jetson (NVIDIA HW Accel NVMPI)",
                                     "value": "h264_nvmpi"
                                  },
                                  {
                                     "name": "H.265 NVENC (NVIDIA HW Accel)",
                                     "value": "hevc_nvenc"
                                  },
                                  {
                                     "name": "H.264 (Quick Sync Video)",
                                     "value": "h264_qsv"
                                  },
                                  {
                                     "name": "H.265 (Quick Sync Video)",
                                     "value": "hevc_qsv"
                                  },
                                  {
                                     "name": "MPEG2 (Quick Sync Video)",
                                     "value": "mpeg2_qsv"
                                  },
                                  {
                                     "name": "H.264 (Quick Sync Video)",
                                     "value": "h264_qsv"
                                  },
                                  {
                                     "name": "H.265 (Quick Sync Video)",
                                     "value": "hevc_qsv"
                                  },
                                  {
                                     "name": "MPEG2 (Quick Sync Video)",
                                     "value": "mpeg2_qsv"
                                  },
                                  {
                                     "name": "H.264 openMAX (Raspberry Pi)",
                                     "value": "h264_omx"
                                  }
                              ]
                          },
                       ]
                    },
                    {
                       "field": lang["Audio Codec"],
                       "name": `channel-detail="stream_acodec"`,
                       "description": lang["fieldTextChannelStreamAcodec"],
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": ["hls","rtmp","flv","mp4","h264"] },
                       "possible": [
                          {
                             "name": lang.Auto,
                             "info": lang["fieldTextChannelStreamAcodecAuto"],
                             "value": ""
                          },
                          {
                             "name": lang["No Audio"],
                             "info": lang["fieldTextChannelStreamAcodecNoAudio"],
                             "value": "no"
                          },
                          {
                             "name": "libvorbis",
                             "info": lang["fieldTextChannelStreamAcodecLibvorbis"],
                             "value": "libvorbis"
                          },
                          {
                             "name": "libopus",
                             "info": lang["fieldTextChannelStreamAcodecLibopus"],
                             "value": "libopus"
                          },
                          {
                             "name": "libmp3lame",
                             "info": lang["fieldTextChannelStreamAcodecLibmp3lame"],
                             "value": "libmp3lame"
                          },
                          {
                             "name": "aac",
                             "info": lang["fieldTextChannelStreamAcodecAac"],
                             "value": "aac"
                          },
                          {
                             "name": "ac3",
                             "info": lang["fieldTextChannelStreamAcodecAc3"],
                             "value": "ac3"
                          },
                          {
                             "name": "copy",
                             "info": lang["fieldTextChannelStreamAcodecCopy"],
                             "value": "copy"
                          }
                       ]
                    },
                    {
                       "name": "channel-detail=hls_time",
                       "field": lang["HLS Segment Length"],
                       "description": lang["fieldTextChannelHlsTime"],
                       "default": "2",
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": "hls" },
                    },
                    {
                       "name": "channel-detail=hls_list_size",
                       "field": lang["HLS List Size"],
                       "description": lang["fieldTextChannelHlsListSize"],
                       "default": "2",
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": "hls" },
                    },
                    {
                       "name": "channel-detail=preset_stream",
                       "field": lang["HLS Preset"],
                       "description": lang["fieldTextChannelPresetStream"],
                       "example": "ultrafast",
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": "hls" },
                    },
                    {
                       "name": "channel-detail=stream_quality",
                       "field": lang.Quality,
                       "description": lang["fieldTextChannelStreamQuality"],
                       "default": "15",
                       "example": "1",
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": ["mjpeg","hls","rtmp","jsmpeg","flv","mp4","h264"], "h_hls_v_channel_$[TEMP_ID]": ["libx264","libx265","h264_nvenc","hevc_nvenc","no"] },
                       "possible": "1-23"
                    },
                    {
                       "name": "channel-detail=stream_v_br",
                       "field": lang["Video Bit Rate"],
                       "placeholder": "",
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": ["mjpeg","hls","rtmp","jsmpeg","flv","mp4","h264"], "h_hls_v_channel_$[TEMP_ID]": ["libx264","libx265","h264_nvenc","hevc_nvenc","no"] },
                    },
                    {
                       "name": "channel-detail=stream_a_br",
                       "field": lang["Audio Bit Rate"],
                       "placeholder": "128k",
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": ["mjpeg","hls","rtmp","jsmpeg","flv","mp4","h264"], "h_hls_v_channel_$[TEMP_ID]": ["libx264","libx265","h264_nvenc","hevc_nvenc","no"] },
                    },
                    {
                       "name": "channel-detail=stream_fps",
                       "field": lang['Frame Rate'],
                       "description": lang["fieldTextChannelStreamFps"],
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": ["mjpeg","hls","rtmp","jsmpeg","flv","mp4","h264"], "h_hls_v_channel_$[TEMP_ID]": ["libx264","libx265","h264_nvenc","hevc_nvenc","no"] },
                    },
                    {
                       "name": "channel-detail=stream_scale_x",
                       "field": lang.Width,
                       "description": lang["fieldTextChannelStreamScaleX"],
                       "fieldType": "number",
                       "numberMin": "1",
                       "example": "640",
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": ["mjpeg","hls","rtmp","jsmpeg","flv","mp4","h264"], "h_hls_v_channel_$[TEMP_ID]": ["libx264","libx265","h264_nvenc","hevc_nvenc","no"] },
                    },
                    {
                       "name": "channel-detail=stream_scale_y",
                       "field": lang.Height,
                       "description": lang["fieldTextChannelStreamScaleY"],
                       "fieldType": "number",
                       "numberMin": "1",
                       "example": "480",
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": ["mjpeg","hls","rtmp","jsmpeg","flv","mp4","h264"], "h_hls_v_channel_$[TEMP_ID]": ["libx264","libx265","h264_nvenc","hevc_nvenc","no"] },
                    },
                    {
                       "name": "channel-detail=stream_rotate",
                       "field": lang["Rotate"],
                       "description": lang["fieldTextChannelStreamRotate"],
                       "fieldType": "select",
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": ["mjpeg","hls","rtmp","jsmpeg","flv","mp4","h264"], "h_hls_v_channel_$[TEMP_ID]": ["libx264","libx265","h264_nvenc","hevc_nvenc","no"] },
                       "possible": [
                            {
                               "name": lang["No Rotation"],
                               "value": "no"
                            },
                            {
                               "name": lang["180 Degrees"],
                               "value": "2,transpose=2"
                            },
                            {
                               "name": lang["90 Counter Clockwise and Vertical Flip (default)"],
                               "value": "0"
                            },
                            {
                               "name": lang["90 Clockwise"],
                               "value": "1"
                            },
                            {
                                "name": lang["90 Counter Clockwise"],
                                "value": "2"
                            },
                            {
                               "name": lang["90 Clockwise and Vertical Flip"],
                               "value": "3"
                            }
                         ]
                    },
                    {
                        isAdvanced: true,
                       "name": "channel-detail=svf",
                       "field": lang["Video Filter"],
                       "description": lang["fieldTextChannelSvf"],
                       "form-group-visibleWhen": { "h_st_channel_$[TEMP_ID]": ["mjpeg","hls","rtmp","jsmpeg","flv","mp4","h264"], "h_hls_v_channel_$[TEMP_ID]": ["libx264","libx265","h264_nvenc","hevc_nvenc","no"] },
                   },
                   {
                       "name": "channel-detail=cust_stream",
                       "field": lang["Stream Flags"],
                   },
                ]
            }
         }
      }
}
