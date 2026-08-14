module.exports = (s,config,lang,Theme) => {
    const mainBackgroundColor = Theme.isDark ? 'bg-dark' : Theme.isDarkDefaultBg || 'bg-light'
    return {
        "section": "SuperSideMenu",
        showMonitors: false,
        "blocks": {
            "Container1": {
               "class": `col-md-3 col-lg-2 d-md-block ${mainBackgroundColor} sidebar collapse`,
               "links": [
                   {
                       icon: 'users',
                       label: lang['Accounts'],
                       pageOpen: 'accounts',
                   },
                   {
                       icon: 'cogs',
                       label: lang['Configuration'],
                       pageOpen: 'config',
                   },
                   {
                       icon: 'terminal',
                       // Renamed to "System". The old key is kept as the fallback because
                       // this panel's `lang` is the raw configured language file with no
                       // merge against the default - five language files have no "System"
                       // key, and an undefined label would render as an empty menu entry.
                       label: lang['System'] || lang['Controls and Logs'],
                       pageOpen: 'system',
                   },
                   {
                       icon: 'sliders',
                       label: lang['Preferences'],
                       pageOpen: 'changeSuperPreferences',
                   },
                   { divider: true },
                   {
                       icon: 'globe',
                       label: lang['Easy Remote Access (P2P)'],
                       pageOpen: 'easyRemoteAccess',
                   },
                   {
                       icon: 'puzzle-piece',
                       label: lang['Custom Auto Load'],
                       pageOpen: 'customAutoLoad',
                   },
                   {
                       icon: 'plug',
                       label: lang['Plugin Manager'],
                       pageOpen: 'superPluginManager',
                   },
                   {
                       icon: 'hdd-o',
                       label: lang['Mount Manager'],
                       pageOpen: 'superMountManager',
                   },
                   {
                       icon: 'cloud-upload',
                       label: lang['Global Cloud Uploaders'],
                       pageOpen: 'cloudUploaders',
                   },
                   { divider: true },
                   {
                       icon: 'sitemap',
                       label: lang['Central Management'],
                       pageOpen: 'centralManagement',
                   },
                   {
                       icon: 'random',
                       label: lang[`Failover ${!config.isFailover ? 'Servers' : 'Keys'}`],
                       pageOpen: !config.isFailover ? 'failoverServers' : 'failoverKeys',
                   },
                   { divider: true },
                   {
                       icon: 'sign-out',
                       label: lang['Logout'],
                       class: 'logout',
                   },
               ]
           }
        }
    }
}
