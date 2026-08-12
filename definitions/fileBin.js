module.exports = (s,config,lang,Theme) => {
    return {
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
    }
}
