module.exports = (s,config,lang,Theme) => {
    return {
        "section": "Calendar",
        "blocks": {
            // No date picker here : the calendar's own navigation *is* the date range, so
            // videos are fetched for whatever span it is currently showing. That leaves the
            // monitor selector as the only thing to search by.
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
                      "fieldType": "btn-group",
                      "form-group-class-pre-layer": "mb-0",
                      "btns": [
                          {
                              "fieldType": "btn",
                              "class": `btn-success fill refresh-data`,
                              "icon": `refresh`,
                              "btnContent": `${lang['Refresh']}`,
                          },
                      ],
                   },
              ]
          },
          "Calendar": {
              noHeader: true,
             "section-pre-class": "col-md-12",
             "info": [
                 // Shown only when the visible range holds more recordings than the tab
                 // will draw, so a partial calendar is never mistaken for a complete one.
                 {
                     "fieldType": "div",
                     "id": "calendar_limit_notice",
                     "class": "alert alert-warning d-none",
                     "divContent": ""
                 },
                 {
                     "fieldType": "div",
                     "id": "calendar_draw_area",
                     "divContent": ""
                 }
             ]
         },
       }
    }
}
