module.exports = (s,config,lang,Theme) => {
    return {
        "section": "Monitor States",
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
                      "attribute": `page-open="schedules"`,
                      "class": `btn-primary`,
                      "btnContent": `<i class="fa fa-clock-o"></i> &nbsp; ${lang["Schedules"]}`,
                   },
               ]
            },
            "How to Create a Preset": {
               "name": lang["How to Create a Monitor State Preset"],
               "color": "blue",
               "section-pre-class": "col-md-12",
               "blockquoteClass": "global_tip",
               "blockquote": lang.CreateMonitorStateInstructionsText,
               "info": []
           },
           "Saved Presets": {
              "name": lang["Saved Presets"],
              "color": "green",
              "section-pre-class": "col-md-12",
              "info": [
                 {
                     "fieldType": "div",
                     id: "monitorStatesList",
                 }
              ]
          },
        }
    }
}
