module.exports = function(s,config,lang){
    const Theme = {
        isDark: true,
    }
    const mainBackgroundColor = Theme.isDark ? 'bg-dark' : Theme.isDarkDefaultBg || 'bg-light'
    const textWhiteOnBgDark = Theme.isDark ? 'text-white' : ''
    return Object.assign({
        Theme: Theme,
    },{
        "Monitor Status Codes": require('./monitorStatusCodes.js')(s,config,lang,Theme),
        "Monitor Settings": require('./monitorSettings.js')(s,config,lang,Theme),
        "Account Settings": require('./accountSettings.js')(s,config,lang,Theme),
        "ONVIF Device Manager": require('./onvifDeviceManager.js')(s,config,lang,Theme),
        "Permission Sets": require('./permissionSets.js')(s,config,lang,Theme),
        "Sub-Account Manager": require('./subAccountManager.js')(s,config,lang,Theme),
        "API Keys": require('./apiKeys.js')(s,config,lang,Theme),
        "LDAP": require('./ldap.js')(s,config,lang,Theme),
        "Alarms": require('./alarms.js')(s,config,lang,Theme),
        "Region Editor": require('./regionEditor.js')(s,config,lang,Theme),
        "Schedules": require('./schedules.js')(s,config,lang,Theme),
        "Monitor States": require('./monitorStates.js')(s,config,lang,Theme),
        "Timelapse": require('./timelapse.js')(s,config,lang,Theme),
        "Event Filters": require('./eventFilters.js')(s,config,lang,Theme),
        "ONVIF Scanner": require('./onvifScanner.js')(s,config,lang,Theme),
        "Camera Probe": require('./cameraProbe.js')(s,config,lang,Theme),
        "Montior Configuration Finder": require('./monitorConfigurationFinder.js')(s,config,lang,Theme),
        "Log Viewer": require('./logViewer.js')(s,config,lang,Theme),
        "Monitor Settings Additional Input Map": require('./monitorSettingsAdditionalInputMap.js')(s,config,lang,Theme),
        "Monitor Settings Additional Stream Channel": require('./monitorSettingsAdditionalStreamChannel.js')(s,config,lang,Theme),
        "Monitor Stream Window": require('./monitorStreamWindow.js')(s,config,lang,Theme),
        "Monitor Options": require('./monitorOptions.js')(s,config,lang,Theme),
        "SideMenu": require('./sideMenu.js')(s,config,lang,Theme),
        "SuperSideMenu": require('./superSideMenu.js')(s,config,lang,Theme),
        "Home": require('./home.js')(s,config,lang,Theme),
        "Studio": require('./studio.js')(s,config,lang,Theme),
        "Calendar": require('./calendar.js')(s,config,lang,Theme),
        "FileBin": require('./fileBin.js')(s,config,lang,Theme),
        "Videos Table": require('./videosTable.js')(s,config,lang,Theme),
        "Events Table": require('./eventsTable.js')(s,config,lang,Theme),
        "Admin Account Settings": require('./adminAccountSettings.js')(s,config,lang,Theme),
        "Super User Preferences": require('./superUserPreferences.js')(s,config,lang,Theme),
        "Help Window": require('./helpWindow.js')(s,config,lang,Theme),
        "Monitor Map": require('./monitorMap.js')(s,config,lang,Theme),
        "Timeline": require('./timeline.js')(s,config,lang,Theme),
        "Rally": require('./rally.js')(s,config,lang,Theme),
        "Global Cloud Uploaders": {
            "section": "Global Cloud Uploaders",
            "blocks": {},
        },
  })
}
