module.exports = (s,config,lang,Theme) => {
    const mainBackgroundColor = Theme.isDark ? 'bg-dark' : Theme.isDarkDefaultBg || 'bg-light'
    return {
        "section": "Monitor Options",
        "dropdownClass": `${Theme.isDark ? 'dropdown-menu-dark' : ''} ${mainBackgroundColor}`
    }
}
