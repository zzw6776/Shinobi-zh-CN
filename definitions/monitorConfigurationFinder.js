module.exports = (s,config,lang,Theme) => {
    return {
           "section": "Montior Configuration Finder",
           "blocks": {
               "Search Settings": {
                  "name": lang["Search Settings"],
                  "color": "navy",
                  "blockquote": lang.monitorConfigFinderDescription,
                  "section-pre-class": "col-md-4",
                  "info": [
                      {
                         "id": "shinobihub-sort-by",
                         "field": lang["Sort By"],
                         "fieldType": "select",
                         "possible": [
                             {
                                "name": lang['Date Updated'],
                                "value": "dateUpdated"
                             },
                             {
                                "name": lang['Date Added'],
                                "value": "dateAdded"
                             },
                             {
                                "name": lang['Title'],
                                "value": "heading"
                             },
                             {
                                "name": lang['Subtitle'],
                                "value": "opening"
                             },
                         ]
                     },
                      {
                         "id": "shinobihub-sort-direction",
                         "field": lang["Sort By"],
                         "fieldType": "select",
                         "possible": [
                             {
                                "name": lang['Newest'],
                                "value": "DESC"
                             },
                             {
                                "name": lang['Oldest'],
                                "value": "ASC"
                             },
                         ]
                     },
                     {
                        "id": "shinobihub-search",
                        "field": lang['Search'],
                     },
                     {
                         "id": "shinobihub-pages",
                         "class": "btn-group",
                         "fieldType": "div",
                     }
                 ]
             },
             "Monitor Settings": {
                "name": lang['Monitor Settings'],
                "color": "blue",
                "section-pre-class": "col-md-8",
                "info": [
                    {
                        "id": "shinobihub-results",
                        "class": "text-center row",
                        "fieldType": "div",
                    }
                ]
            },
        }
    }
}
