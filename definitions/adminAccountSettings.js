module.exports = (s,config,lang,Theme) => {
    return {
         "section": "Admin Account Settings",
         "blocks": {
             "Account": {
                "name": lang["Account"],
                "color": "blue",
                "section-pre-class": "col-md-6",
                "info": [
                    {
                       "name": "mail",
                       "field": lang.Email,
                    },
                    {
                       "name": "ke",
                       "field": lang['Group Key'],
                       // legacyCreateAdminUser generates one with s.gid() when this is
                       // left empty. On edit the field is disabled and already filled, so
                       // this only ever shows while creating an account.
                       "placeholder": lang['Leave blank to randomly generate'],
                    },
                    {
                       "name": "pass",
                       "type": "password",
                       "field": lang['Password'],
                       "fieldType": "password",
                       "attribute": 'autocomplete="new-password"',
                    },
                    {
                       "name": "password_again",
                       "type": "password",
                       "field": lang['Password Again'],
                       "fieldType": "password",
                       "attribute": 'autocomplete="new-password"',
                    },
                    {
                        "field": lang['2-Factor Authentication'],
                        "name": "detail=factorAuth",
                        "default":'0',
                        "fieldType": "select",
                        possible: [
                          {
                              "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          },
                       ]
                    },
               ]
            },
            "Limits": {
               "name": lang["Limits"],
               "color": "orange",
               "section-pre-class": "col-md-6",
               "info": [
                    {
                       "name": "detail=size",
                       "field": lang['Max Storage Amount'],
                       "default": '10000'
                    },
                    {
                       "name": "detail=days",
                       "field": `${lang['Number of Days to keep']} ${lang['Videos']}`,
                       "default": '5'
                    },
                    {
                       "name": "detail=event_days",
                       "field": `${lang['Number of Days to keep']} ${lang['Events']}`,
                       "default": '10'
                    },
                    {
                       "name": "detail=log_days",
                       "field": `${lang['Number of Days to keep']} ${lang['Logs']}`,
                       "default": '10'
                    },
                    // {
                    //    "name": "detail=log_timelapseFrames",
                    //    "field": `${lang['Number of Days to keep']} ${lang['Timelapse Frames']}`,
                    //    "default": '10'
                    // },
                    {
                       "name": "detail=max_camera",
                       "field": lang['Max Number of Cameras'],
                       "placeholder": lang['Leave blank for unlimited']
                    },
               ]
            },
            "Permissions": {
               "name": lang["Permissions"],
               "color": "red",
               "section-pre-class": "col-md-6",
               "info": [
                    {
                        "field": lang.Permissions,
                        "name": "detail=permissions",
                        "default":'1',
                        "fieldType": "select",
                        selector:'more_perms',
                        possible: [
                          {
                              "name": lang['All Privileges'],
                             "value": "all"
                          },
                          {
                             "name": lang.Limited,
                             "value": "limited"
                          },
                       ]
                    },
                    {
                        "field": lang['Can edit Max Storage'],
                        "name": "detail=edit_size",
                        "default":'1',
                        "fieldType": "select",
                        "form-group-visibleWhen":{ "more_perms": "limited" },
                        possible: [
                          {
                              "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          },
                       ]
                    },
                    {
                        "field": lang['Can edit Max Days'],
                        "name": "detail=edit_days",
                        "default":'1',
                        "fieldType": "select",
                        "form-group-visibleWhen":{ "more_perms": "limited" },
                        possible: [
                          {
                              "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          },
                       ]
                    },
                    {
                        "field": lang['Can edit how long to keep Events'],
                        "name": "detail=edit_event_days",
                        "default":'1',
                        "fieldType": "select",
                        "form-group-visibleWhen":{ "more_perms": "limited" },
                        possible: [
                          {
                              "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          },
                       ]
                    },
                    {
                        "field": lang['Can edit how long to keep Logs'],
                        "name": "detail=edit_log_days",
                        "default":'1',
                        "fieldType": "select",
                        "form-group-visibleWhen":{ "more_perms": "limited" },
                        possible: [
                          {
                              "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          },
                       ]
                    },
                    // Per uploader permissions are generated at load time from the cloud
                    // uploader registry (see libs/uploaders.js), so every uploader -- including
                    // ones added by plugins -- gets both an enable toggle and a "force server
                    // credentials" toggle without being listed here by hand. These two fields are
                    // Superuser only: beforeAccountSave resets them from stored details, so an
                    // Admin cannot change them from their own Account Settings.
                    {
                        "field": lang['Can use Plugin Manager'],
                        "name": "detail=use_plugin_manager",
                        // Default '0' on purpose: this is what an account with no stored
                        // value shows, and no stored value means No at runtime. Account
                        // creation sets it to Yes explicitly, see blocks/mainpermissions.ejs.
                        "default":'0',
                        "fieldType": "select",
                        "description": lang.usePluginManagerText,
                        possible: [
                          {
                              "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          },
                       ]
                    },
                    {
                        "field": lang['Can use System Control'],
                        "name": "detail=use_system_control",
                        "default":'0',
                        "fieldType": "select",
                        "description": lang.useSystemControlText,
                        possible: [
                          { "name": lang.No, "value": "0" },
                          { "name": lang.Yes, "value": "1" },
                       ]
                    },
                    {
                        "field": lang['Can use Easy Remote Access'],
                        "name": "detail=use_remote_access",
                        // Same rule as the Plugin Manager: '0' is what an account with no
                        // stored value shows, and no stored value means No at runtime.
                        "default":'0',
                        "fieldType": "select",
                        "description": lang.useRemoteAccessText,
                        possible: [
                          {
                              "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          },
                       ]
                    },
                    {
                        "field": lang['Can see CPU and RAM usage'],
                        "name": "detail=show_system_usage",
                        "default":'1',
                        "fieldType": "select",
                        "description": lang.showSystemUsageText,
                        possible: [
                          {
                              "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          },
                       ]
                    },
               ]
            },
            "CloudUploaders": {
               "name": lang["Cloud Uploaders"],
               "color": "forestgreen",
               "section-pre-class": "col-md-6",
               "info": [
                    { "cloudUploaderPermissionsAnchor": true },
               ]
            },
            "Integrations": {
               "name": lang["Integrations"],
               "color": "purple",
               "section-pre-class": "col-md-6",
               "info": [
                    {
                        "field": lang['Can use Discord Bot'],
                        "name": "detail=use_discordbot",
                        "default":'1',
                        "fieldType": "select",
                        "form-group-visibleWhen":{ "more_perms": "limited" },
                        possible: [
                          {
                              "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          },
                       ]
                    },
                    {
                        "field": lang['Can use LDAP'],
                        "name": "detail=use_ldap",
                        "default":'1',
                        "fieldType": "select",
                        "form-group-visibleWhen":{ "more_perms": "limited" },
                        possible: [
                          {
                              "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          },
                       ]
                    },
                    // NEEDS TO MOVE DESIGNATED FILES AFTER TESTING />
               ]
            },
            "Save": {
               "noHeader": true,
               "noDefaultSectionClasses": true,
               "section-pre-class": "col-md-12",
               "info": [
                    {
                       "fieldType": "btn-group",
                       "btns": [
                           {
                               "fieldType": "btn",
                               "class": `submit btn-success fill`,
                               "btnContent": `${lang['Save']}`,
                           },
                       ],
                    },
               ]
           },
        }
      }
}
