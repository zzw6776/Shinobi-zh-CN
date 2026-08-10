module.exports = (s,config,lang,Theme) => {
    return {
         "section": "Log Viewer",
         "blocks": {
             "Saved Logs": {
                "name": lang["Saved Logs"],
                "color": "blue",
                "section-pre-class": "col-md-6 search-parent",
                "info": [
                    {
                       "id": "log_monitors",
                       "field": lang["Type"],
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang['All Logs'],
                              "value": "all"
                           },
                           {
                              "name": lang['For Group'],
                              "value": "$USER"
                           },
                           {
                              "name": lang.Monitors,
                              "optgroup": []
                          }
                       ]
                   },
                    {
                       "field": lang['Search'],
                       "class": 'search-controller',
                    },
                    {
                       "id": "logs_daterange",
                       "field": lang['Date Range'],
                    },
                    {
                       "fieldType": "btn-group",
                       "btns": [
                           {
                               "fieldType": "btn",
                               "class": "btn-default",
                               "forForm": true,
                               "attribute": `download type="button"`,
                               "btnContent": `${lang['Export']}`,
                           },
                           {
                               "fieldType": "btn",
                               "class": "btn-success",
                               "forForm": true,
                               "attribute": `type="submit"`,
                               "btnContent": `${lang['Check']}`,
                           },
                       ],
                    },
                    {
                        "id": "saved-logs-rows",
                        "fieldType": "div",
                        "attribute": `style="max-height: 600px;overflow: auto;"`,
                        "class": "search-body mt-3 px-3 row",
                    }
               ]
           },
           "Streamed Logs": {
              "name": lang['Streamed Logs'],
              "color": "green",
              "section-pre-class": "col-md-6 search-parent",
              "info": [
                  {
                     "field": lang['Search'],
                     "class": 'search-controller',
                  },
                  {
                      "fieldType": "div",
                      "id": "global-log-stream",
                      "attribute": `style="max-height: 600px;overflow: auto;"`,
                      "class": "search-body mt-3",
                  }
              ]
          },
        }
      }
}
