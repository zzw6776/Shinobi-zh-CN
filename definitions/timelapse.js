module.exports = (s,config,lang,Theme) => {
    return {
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
     }
}
