module.exports = (s,config,lang,Theme) => {
    return {
        "section": "Schedules",
        "blocks": {
            "Info": {
                "name": lang["Monitor States and Schedules"],
               "color": "blue",
               "section-pre-class": "col-md-12",
               "blockquoteClass": "global_tip",
               "blockquote": lang.MonitorStatesText,
               "info": [
                   {
                      "fieldType": "btn",
                      "attribute": `page-open="monitorStates"`,
                      "class": `btn-primary`,
                      "btnContent": `<i class="fa fa-align-right"></i> &nbsp; ${lang["Monitor States"]}`,
                   },
               ]
            },
            "Schedules": {
               "name": lang["Schedules"],
               "color": "orange",
               "section-pre-class": "col-md-6",
               "info": [
                   {
                      "id": "schedulesSelector",
                      "field": lang["Schedules"],
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": lang['Add New'],
                             "value": ""
                          },
                          {
                             "name": lang.Saved,
                             "optgroup": []
                          },
                      ]
                  },
               ]
           },
           "Schedule": {
              "name": lang["Schedule"],
              "headerTitle": `${lang['Schedule']}
                <div class="pull-right">
                    <a class="btn btn-danger btn-xs delete" style="display:none">&nbsp;<i class="fa fa-trash-o"></i>&nbsp;</a>
                </div>`,
              "color": "green",
              "section-pre-class": "col-md-6",
              "info": [
                  {
                     "name": "name",
                     "field": lang.Name,
                     "description": "",
                     "example": "Motion Off",
                     "possible": ""
                  },
                  {
                     "name": "enabled",
                     "field": lang.Enabled,
                     "default": "1",
                     "fieldType": "select",
                     "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                     ]
                  },
                  {
                     "name": "timezone",
                     "field": lang['Timezone Offset'],
                     "default": config.timeZones.find(tz => !!tz.selected).value,
                     "fieldType": "select",
                     "possible": config.timeZones.map((tz) => {
                         return {
                             "name": tz.text,
                             "value": tz.value
                         }
                     })
                  },
                  {
                     "name": "start",
                     "field": lang.Start,
                     "description": "",
                     "placeholder": "HH:mm",
                     "possible": "1:00"
                  },
                  {
                     "name": "end",
                     "field": lang.End,
                     "description": "",
                     "placeholder": "HH:mm",
                     "possible": "2:00"
                  },
                  {
                     "name": "days",
                     "field": lang.Days,
                     "default": "0",
                     "fieldType": "select",
                     "attribute": "multiple",
                     "possible": [
                         {
                            "name": lang.Sunday,
                            "value": "0"
                         },
                         {
                            "name": lang.Monday,
                            "value": "1"
                         },
                         {
                            "name": lang.Tuesday,
                            "value": "2"
                         },
                         {
                            "name": lang.Wednesday,
                            "value": "3"
                         },
                         {
                            "name": lang.Thursday,
                            "value": "4"
                         },
                         {
                            "name": lang.Friday,
                            "value": "5"
                         },
                         {
                            "name": lang.Saturday,
                            "value": "6"
                         },
                     ]
                  },
                  {
                     "name": "monitorStates",
                     "field": lang['Monitor States'],
                     "fieldType": "select",
                     "attribute": `multiple style="min-height:100px"`,
                     "possible": []
                  },
              ]
          },
        }
    }
}
