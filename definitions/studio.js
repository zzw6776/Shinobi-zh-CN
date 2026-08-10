module.exports = (s,config,lang,Theme) => {
    return {
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
    }
}
