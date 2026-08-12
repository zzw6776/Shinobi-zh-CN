module.exports = (s,config,lang) => {
    return {
        "section": "Monitor Stream Window",
        gridBlockClass: "",
        streamBlockPreHtml: `<div class="gps-map-info gps-map-details hidden">
            <div><i class="fa fa-compass fa-3x gps-info-bearing"></i></div>
            <div><i class="fa fa-compass fa-3x gps-info-speed"></i></div>
            <div></div>
        </div>
        <div class="gps-map gps-map-info hidden" id="gps-map-$MONITOR_ID"></div>`,
        streamBlockHudHtml: `<div class="camera_cpu_usage">
            <div class="progress">
                <div class="progress-bar progress-bar-danger" role="progressbar" style="width: 0px;"><span></span></div>
            </div>
        </div>
        <div class="lamp" title="$MONITOR_MODE"><i class="fa fa-eercast"></i></div>`,
        streamBlockHudControlsHtml: `<span title="${lang['Currently viewing']}" class="label label-default">
             <span class="viewers"></span>
        </span>
        <span class="badge btn-success text-white substream-is-on" style="display:none">${lang['Substream']}</span>
        <a class="btn btn-sm badge btn-primary run-monitor-detection-trigger-marker">${lang['Add Marker']}</a>
        <a class="btn btn-sm badge btn-warning run-monitor-detection-trigger-test">${lang['Test Object Event']}</a>
        <a class="btn btn-sm badge btn-warning run-monitor-detection-trigger-test-motion">${lang['Test Motion Event']}</a>`,
        gridBlockAfterContentHtml: `<div class="mdl-card__supporting-text text-center">
            <div class="indifference detector-fade">
                <div class="progress">
                    <div class="progress-bar progress-bar-danger" role="progressbar"><span></span></div>
                </div>
            </div>
            <div class="monitor_details">
                <div class="pull-left">
                     $QUICKLINKS
               </div>
                <div><span class="small text-monospace monitor_name">$MONITOR_NAME</span></div>
            </div>
        </div>`,
        quickLinks: {
            "Options": {
               "label": lang['Options'],
               "class": "default toggle-live-grid-monitor-menu",
               "icon": "bars"
            },
            "Zoom In": {
               "label": lang['Zoom In'],
               "class": "default magnify-glass-live-grid-stream",
               "icon": "search-plus"
            },
            "Mute Audio": {
                "label": lang['Mute Audio'],
                "class": "primary toggle-live-grid-monitor-mute",
                "icon": '$MONITOR_MUTE_ICON'
            },
            "Fullscreen": {
               "label": lang['Fullscreen'],
               "class": "default toggle-live-grid-monitor-fullscreen",
               "icon": "arrows-alt"
            },
            "Monitor Settings": {
               "label": lang['Monitor Settings'],
               "class": "default open-monitor-settings",
               "icon": "wrench",
               eval: `!isSubAccount || isSubAccount && shinobiServer.permissionCheck('monitor_edit',monitorId)`,
            },
            "Timeline": {
               "label": lang['Timeline'],
               "class": "default open-timeline-for-monitor",
               "icon": "barcode"
            },
            "Snapshot": {
               "label": lang['Snapshot'],
               "class": "primary snapshot-live-grid-monitor",
               "icon": "camera"
            },
            "Videos List": {
               "label": lang['Videos List'],
               "class": "default open-videosTable",
               "icon": "film",
               eval: `!isSubAccount || isSubAccount && shinobiServer.permissionCheck('video_view',monitorId)`,
            },
            "Reconnect Stream": {
               "label": lang['Reconnect Stream'],
               "class": "success signal reconnect-live-grid-monitor",
               "icon": "plug"
            },
            "Control": {
               "label": lang['Control'],
               "class": "default toggle-live-grid-monitor-ptz-controls",
               "icon": "arrows",
               eval: `monitor.details.control === '1'`,
            },
            "Show Logs": {
               "label": lang['Show Logs'],
               "class": "warning toggle-live-grid-monitor-logs",
               "icon": "exclamation-triangle"
            },
            "Close": {
               "label": lang['Close'],
               "class": "danger close-live-grid-monitor",
               "icon": "times"
            }
        },
        links: {
            "Timeline": {
               "label": lang['Timeline'],
               "class": "open-timeline-for-monitor",
               "icon": "barcode"
            },
           "Mute Audio": {
               "label": lang['Mute Audio'],
               "class": "primary toggle-live-grid-monitor-mute",
               "icon": '$MONITOR_MUTE_ICON'
           },
           "Snapshot": {
              "label": lang['Snapshot'],
              "class": "primary snapshot-live-grid-monitor",
              "icon": "camera"
           },
           "Show Logs": {
              "label": lang['Show Logs'],
              "class": "warning toggle-live-grid-monitor-logs",
              "icon": "exclamation-triangle"
           },
           "Toggle Substream": {
              "label": lang['Toggle Substream'],
              "class": "warning toggle-monitor-substream",
              "icon": "eye"
           },
           "Control": {
              "label": lang['Control'],
              "class": "default toggle-live-grid-monitor-ptz-controls",
              "icon": "arrows",
              eval: `monitor.details.control === '1'`,
           },
           "Reconnect Stream": {
              "label": lang['Reconnect Stream'],
              "class": "success signal reconnect-live-grid-monitor",
              "icon": "plug"
           },
           "Pop": {
              "label": lang['Pop'],
              "class": "default run-live-grid-monitor-pop",
              "icon": "external-link"
           },
           "Zoom In": {
              "label": lang['Zoom In'],
              "class": "default magnify-glass-live-grid-stream",
              "icon": "search-plus"
           },
           "Time-lapse": {
              "label": lang['Time-lapse'],
              "attr": `monitor="timelapseJpeg"`,
              "class": "default",
              "icon": "angle-double-right",
              eval: `!isSubAccount || isSubAccount && shinobiServer.permissionCheck('video_view',monitorId)`,
           },
           "Videos List": {
              "label": lang['Videos List'],
              "class": "default open-videosTable",
              "icon": "film",
              eval: `!isSubAccount || isSubAccount && shinobiServer.permissionCheck('video_view',monitorId)`,
           },
           "Monitor Settings": {
              "label": lang['Monitor Settings'],
              "class": "default open-monitor-settings",
              "icon": "wrench",
              eval: `!isSubAccount || isSubAccount && shinobiServer.permissionCheck('monitor_edit',monitorId)`,
           },
           "Fullscreen": {
              "label": lang['Fullscreen'],
              "class": "default toggle-live-grid-monitor-fullscreen",
              "icon": "arrows-alt"
           },
           "Close": {
              "label": lang['Close'],
              "class": "danger close-live-grid-monitor",
              "icon": "times"
           }
        }
    }
}
