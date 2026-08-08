// Sidebar behavior for the Superuser panel. The dashboard equivalent is
// bs5.sideMenu.js; this is the trimmed version — no monitor list, no snapshot
// loading, no drag-to-sort. Collapse/hide state persists through dashboardOptions
// from bs5.tabEngine.js, same as the dashboard.
var sidebarMenu = $('#sidebarMenu')
var sidebarMenuInner = $('#menu-side')
var topMenu = $('#topMenu')
var sideMenuCollapsePoint = $('#side-menu-collapse-point')
var floatingHideButton = $('#floating-hide-button')

function fixSideMenuScroll(){
    sidebarMenuInner.css({
        height: window.innerHeight - (topMenu.height() || 0),
        overflow: "auto",
    })
}
function isSideBarMenuHidden(){
    return dashboardOptions().sideMenuHidden === 1
}
function toggleSideBarMenuHide(){
    var theBody = $('body')
    theBody.toggleClass('hide-side-menu')
    var isHidden = theBody.hasClass('hide-side-menu')
    dashboardOptions('sideMenuHidden',isHidden ? 1 : '0')
    if(isHidden){
        floatingHideButton.show()
        floatingBackButton.hide()
    }else{
        floatingHideButton.hide()
        if(tabTree && tabTree.back)floatingBackButton.show()
    }
}
$(window).resize(function(){
    fixSideMenuScroll()
})
onDashboardReady(function(){
    fixSideMenuScroll()
    $('body').on('click','.hide-side-menu-toggle',function(){
        toggleSideBarMenuHide()
    })
    if(isSideBarMenuHidden()){
        toggleSideBarMenuHide()
    }
})
