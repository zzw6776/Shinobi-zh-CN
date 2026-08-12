module.exports = (s,config,lang,Theme) => {
    return {
         "section": "Super User Preferences",
         "blocks": {
             "Editor": {
                noHeader: true,
                "color": "grey",
                "noDefaultSectionClasses": true,
                "box-wrapper-class": "row",
                "info": [
                    {
                        isFormGroupGroup: true,
                        "noHeader": true,
                        "section-pre-class": "col-md-6",
                        info: [
                            {
                               "name": "mail",
                               "field": lang.Email,
                            },
                            {
                               "name": "pass",
                               "type": "password",
                               "fieldType": "password",
                               "field": lang['Password'],
                               "attribute": 'autocomplete="new-password"',
                            },
                            {
                               "name": "pass_again",
                               "type": "password",
                               "fieldType": "password",
                               "field": lang['Password Again'],
                               "attribute": 'autocomplete="new-password"',
                            },
                            // Save now lives in the tab's floating bar
                            // (web/pages/blocks/super/stickySubmitBar.ejs).
                        ]
                    },
                    {
                        isFormGroupGroup: true,
                        "name": lang["API Keys"],
                        "section-pre-class": "col-md-6",
                        info: [
                            {
                               "fieldType": "btn-group",
                               "btns": [
                                   {
                                       "fieldType": "btn",
                                       "class": `new-token btn-success`,
                                       "btnContent": `${lang['Add']}`,
                                   },
                               ],
                            },
                            {
                               "id": "super-tokens",
                               "fieldType": "div",
                            },
                        ]
                    },
                ]
            }
        }
    }
}
