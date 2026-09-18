module.exports = (s,config,lang,Theme) => {
    return {
        "section": "Videos Table",
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
                      "id": "videosTable_tag_search",
                      "field": lang["Search Tags"],
                      "example": "person",
                      "form-group-class": "me-3 mb-0",
                   },
                   {
                       id:'videosTable_tag_search_andonly',
                       field: lang['Search Type'],
                       default: '0',
                       "fieldType": "select",
                       "form-group-class": "me-3 mb-0",
                       possible:[
                           {
                               "name": lang.OR,
                               "value": "0",
                               selected: true,
                           },
                           {
                               "name": lang.AND,
                               "value": "1"
                           },
                      ]
                   },
                   {
                       id:'videosTable_cloudVideos',
                       field: lang['Video Set'],
                       default: 'local',
                       "fieldType": "select",
                       "form-group-class": "me-3 mb-0",
                       possible:[
                         {
                             "name": lang.Local,
                            "value": "local"
                         },
                         {
                             "name": lang.Archive,
                            "value": "archive"
                         },
                         {
                            "name": lang.Cloud,
                            "value": "cloud"
                         },
                      ]
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
                      "form-group-class-pre-layer": "mb-0",
                      "divContent": `<button type="button" class="btn btn-default dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                          <i class="fa fa-clock-o"></i> ${lang['Quick Range']}
                      </button>
                      <ul class="dropdown-menu ${Theme.isDark ? 'dropdown-menu-dark bg-dark' : ''} shadow-lg">
                          <li><a class="dropdown-item videosTable_quick_daterange" href="#" data-hours="1">${lang.Last} 1 ${lang.hours}</a></li>
                          <li><a class="dropdown-item videosTable_quick_daterange" href="#" data-hours="3">${lang.Last} 3 ${lang.hours}</a></li>
                          <li><a class="dropdown-item videosTable_quick_daterange" href="#" data-hours="6">${lang.Last} 6 ${lang.hours}</a></li>
                          <li><a class="dropdown-item videosTable_quick_daterange" href="#" data-hours="9">${lang.Last} 9 ${lang.hours}</a></li>
                          <li><a class="dropdown-item videosTable_quick_daterange" href="#" data-hours="12">${lang.Last} 12 ${lang.hours}</a></li>
                          <li><a class="dropdown-item videosTable_quick_daterange" href="#" data-hours="24">${lang.Last} 24 ${lang.hours}</a></li>
                          <li><hr class="dropdown-divider"></li>
                          <li><a class="dropdown-item videosTable_quick_daterange" href="#" data-days="7">${lang.Last} 7 ${lang.Days}</a></li>
                          <li><a class="dropdown-item videosTable_quick_daterange" href="#" data-days="30">${lang.Last} 30 ${lang.Days}</a></li>
                      </ul>`
                   },
              ]
          },
          "theTable": {
              noHeader: true,
             "section-pre-class": "col-md-12",
             "info": [
                 {
                     "fieldType": "div",
                     "id": "videosTable_preview_area",
                     "style": "max-width:640px",
                     "divContent": ""
                 },
                 {
                     "fieldType": "div",
                     "id": "videosTable_draw_area_notice",
                     "divContent": `<div class="text-center">
                          <i class="fa fa-5x mb-3 fa-hand-pointer-o"></i>
                      </div>
                      <h3 class="text-center">
                          <div>${lang['Ready to Search']}</div>
                      </h3>`
                 },
                 {
                     "fieldType": "table",
                     "attribute": `data-classes="table table-striped"`,
                     "id": "videosTable_draw_area",
                     "divContent": ""
                 }
             ]
         },
       }
    }
}
