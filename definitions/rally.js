module.exports = (s,config,lang,Theme) => {
    return {
          "section": "Rally",
          "name": "Rally",
          "blocks": {
              "Search Settings": {
                 "id": "rallyConfigure",
                 "name": lang.Scan,
                 "blockquote": lang.RallyDescription,
                 "color": "green",
                 "section-pre-class": "col-md-4",
                 isFormGroupGroup: true,
                 "info": [
                     {
                         "name": "host",
                         "field": lang["Host"],
                         "placeholder": "http://shinobi_host:8080",
                     },
                     {
                         "name": "groupKey",
                         "field": lang["Group Key"],
                     },
                     {
                         "name": "apiKey",
                         "field": lang["API Key"],
                         "description": lang.rallyApiKeyFieldText,
                     },
                     {
                         "name": "channel",
                         "field": lang["Channel"],
                         "description": lang.rallyChannelDescription,
                     },
                     {
                       "fieldType": "btn-group",
                       "btns": [
                           {
                               forForm: true,
                               "fieldType": "btn",
                               "class": `btn-success fill mb-3`,
                               "icon": `search`,
                               "attribute": `type="submit"`,
                               "btnContent": `${lang['Scan']}`,
                           }
                        ]
                     }
                ]
            },
            "Management": {
               "id": "rallyManagement",
               "noHeader": true,
               "color": "blue",
               "section-pre-class": "col-md-8",
               "info": [
                   {
                       "id":"rallyServerInfo",
                       "fieldType": "div",
                       "class": "mb-3",
                   },
                   {
                      "fieldType": "btn-group",
                      "class": "mb-3",
                      "btns": [
                          {
                              "fieldType": "btn",
                              "class": `btn-success add-all`,
                              "btnContent": `<i class="fa fa-plus"></i> ${lang['Add All (Rallied)']}`,
                          },
                          // {
                          //     "fieldType": "btn",
                          //     "class": `btn-success add-all-direct`,
                          //     "btnContent": `<i class="fa fa-plus"></i> ${lang['Add All (Direct)']}`,
                          // },
                      ],
                   },
                   {
                       "id":"rallyCameras",
                       "fieldType": "table",
                       "attribute": `data-classes="table table-striped"`,
                       "divContent": ""
                   }
               ]
           },
         }
     }
}
