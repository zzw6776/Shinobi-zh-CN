module.exports = (s,config,lang,Theme) => {
    return {
        "section": "Events Table",
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
                      "id": "eventsTable_tag_search",
                      "field": lang["Search"],
                      "placeholder": lang["Objects or Reason"],
                      "form-group-class": "me-3 mb-0",
                   },
                   {
                       id: 'eventsTable_tag_search_andonly',
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
                          <li><a class="dropdown-item eventsTable_quick_daterange" href="#" data-hours="1">${lang.Last} 1 ${lang.hours}</a></li>
                          <li><a class="dropdown-item eventsTable_quick_daterange" href="#" data-hours="3">${lang.Last} 3 ${lang.hours}</a></li>
                          <li><a class="dropdown-item eventsTable_quick_daterange" href="#" data-hours="6">${lang.Last} 6 ${lang.hours}</a></li>
                          <li><a class="dropdown-item eventsTable_quick_daterange" href="#" data-hours="9">${lang.Last} 9 ${lang.hours}</a></li>
                          <li><a class="dropdown-item eventsTable_quick_daterange" href="#" data-hours="12">${lang.Last} 12 ${lang.hours}</a></li>
                          <li><a class="dropdown-item eventsTable_quick_daterange" href="#" data-hours="24">${lang.Last} 24 ${lang.hours}</a></li>
                          <li><hr class="dropdown-divider"></li>
                          <li><a class="dropdown-item eventsTable_quick_daterange" href="#" data-days="7">${lang.Last} 7 ${lang.Days}</a></li>
                          <li><a class="dropdown-item eventsTable_quick_daterange" href="#" data-days="30">${lang.Last} 30 ${lang.Days}</a></li>
                      </ul>`
                   },
              ]
          },
          "theGrid": {
              noHeader: true,
             "section-pre-class": "col-md-12",
             "info": [
                 {
                     "fieldType": "div",
                     "id": "eventsTable_results_count",
                     "class": "small text-muted mb-2",
                     "divContent": ""
                 },
                 {
                     "fieldType": "div",
                     "id": "eventsTable_draw_area_notice",
                     "divContent": `<div class="text-center">
                          <i class="fa fa-5x mb-3 fa-hand-pointer-o"></i>
                      </div>
                      <h3 class="text-center">
                          <div>${lang['Ready to Search']}</div>
                      </h3>`
                 },
                 {
                     "fieldType": "div",
                     "id": "eventsTable_draw_area_empty",
                     "class": "d-none",
                     "divContent": `<div class="text-center">
                          <i class="fa fa-5x mb-3 fa-search"></i>
                      </div>
                      <h3 class="text-center">
                          <div>${lang['sorryNothingWasFound']}</div>
                      </h3>`
                 },
                 {
                     "fieldType": "div",
                     "id": "eventsTable_draw_area",
                     "class": "events-grid",
                     "divContent": ""
                 },
                 {
                     "fieldType": "div",
                     "id": "eventsTable_pagination",
                     "class": "d-none",
                     "divContent": `<button type="button" id="eventsTable_prev_page" class="btn btn-sm btn-default"><i class="fa fa-chevron-left"></i> ${lang['Previous']}</button>
                         <span id="eventsTable_page_indicator" class="small text-muted"></span>
                         <button type="button" id="eventsTable_next_page" class="btn btn-sm btn-default">${lang['Next']} <i class="fa fa-chevron-right"></i></button>`
                 }
             ]
         },
       }
    }
}
