// Shared tab engine. Powers the sidebar-driven page tabs on both the dashboard
// (web/pages/blocks/home.ejs) and the Superuser panel (web/pages/super.ejs).
//
// A "tab" is a `.page-tab` element with id `tab-<name>` inside `#pageTabContainer`.
// A link that opens one carries `page-open="<name>"`. Tabs opened at runtime also get
// a closable link appended to `#createdTabLinks`.
//
// Behavior specific to a kind of tab (pausing a video player, tearing down a live
// stream) is not known here. Pages register it with registerTabTypeHandler.
var tabTree = null
var pageLoadingData = {}
var loadedPages = {}
var activeTabName = 'initial'
var pageTabLinks = $('#pageTabLinks')
var createdTabLinks = $('#createdTabLinks')
var pageTabContainer = $('#pageTabContainer')
var floatingBackButton = $('#floating-back-button')

// --- per-type behavior, registered by the page that owns those tab types ---
var tabTypeHandlers = {}
function registerTabTypeHandler(type,handlers){
    tabTypeHandlers[type] = Object.assign(tabTypeHandlers[type] || {},handlers)
}
function runTabTypeHandler(hookName,tabId){
    var loadedTab = loadedPages[tabId]
    if(!loadedTab)return
    var handler = tabTypeHandlers[loadedTab.type]
    if(!handler || !handler[hookName])return
    try{
        handler[hookName](tabId,loadedTab)
    }catch(err){
        console.log(err)
    }
}

// --- localStorage-backed UI options ---
function dashboardOptions(r,rr,rrr){
    if(!rrr){rrr={};};if(typeof rrr === 'string'){rrr={n:rrr}};if(!rrr.n){rrr.n='ShinobiOptions_'+location.host+'_'+($user.ke || '$')+($user.uid || $user.mail || '')}
    ii={o:localStorage.getItem(rrr.n)};try{ii.o=JSON.parse(ii.o)}catch(e){ii.o={}}
    if(!ii.o){ii.o={}}
    if(r&&rr&&!rrr.x){
        ii.o[r]=rr;
    }
    switch(rrr.x){
        case 0:
            delete(ii.o[r])
        break;
        case 1:
            delete(ii.o[r][rr])
        break;
    }
    localStorage.setItem(rrr.n,JSON.stringify(ii.o))
    return ii.o
}

// --- scroll position memory, per tab ---
function blipTo(xPageValue,yPageValue){
    document.documentElement.style.scrollBehavior = 'auto';
    setTimeout(() => window.scrollTo(yPageValue, xPageValue), 5);
    setTimeout(() => document.documentElement.style.scrollBehavior = 'smooth', 5);
}
function saveTabBlipPosition(tabId){
    var loadedTab = loadedPages[tabId]
    if(!loadedTab)return;
    var theDoc = document.documentElement
    loadedTab.bodyScrollX = parseFloat(`${theDoc.scrollTop}`)
    loadedTab.bodyScrollY = parseFloat(`${theDoc.scrollLeft}`)
}
function loadTabBlipPosition(tabId){
    var loadedTab = loadedPages[tabId]
    if(!loadedTab)return;
    blipTo(loadedTab.bodyScrollX || 0,loadedTab.bodyScrollY || 0)
}

// --- sidebar link markup for runtime-created tabs ---
function buildTabHtml(tabName,tabLabel,tabIcon){
    return `<li class="nav-link side-menu-link cursor-pointer" page-open="${tabName}">
        <div class="d-flex flex-row">
            <div class="d-flex pr-2">
                <span>
                    <i class="fa fa-${tabIcon ? tabIcon : 'file-o'}"></i>
                </span>
            </div>
            <div class="flex-grow-1 pr-2">
                ${tabLabel}
            </div>
            <div class="d-flex">
                <span class="delete-tab">
                    <i class="fa fa-times-circle-o"></i>
                </span>
            </div>
        </div>
      </li>`
}

// --- opening and navigating ---
function openTab(theTab,loadData,backAction,haltTrigger,type,overrideOnTabOpen){
    loadData = loadData ? loadData : {}
    if(tabTree && tabTree.back && tabTree.back.name === theTab){
        goBackOneTab()
        return;
    }
    saveTabBlipPosition(activeTabName)
    var allTabs = $('.page-tab');
    allTabs.hide().removeClass('tab-active');
    $(`#tab-${theTab}`).show().addClass('tab-active');
    pageLoadingData = Object.assign(loadData,{});
    if(!haltTrigger){
        tabTree = {
            name: theTab,
            loadData: loadData,
            back: tabTree,
        }
        $('body').trigger(`tab-open-${theTab}`);
    }
    if(tabTree && tabTree.back){
        floatingBackButton.show()
    }else{
        floatingBackButton.hide()
    }
    var targetUiElement = pageTabLinks.find(`.side-menu-link[page-open="${theTab}"]`)
    if(targetUiElement.length > 0){
        pageTabLinks.find(`.side-menu-link`).removeClass('page-link-active active')
        pageTabLinks.find('ul').hide();
        targetUiElement.addClass('page-link-active active').parents('li').find('ul').show();
    }
    //
    $('[tab-specific-content]').hide()
    $(`[tab-specific-content="${theTab}"]`).show()
    //
    onTabAway(activeTabName)
    activeTabName = `${theTab}`;
    if(!loadedPages[theTab]){
        loadedPages[theTab] = {
            name: theTab,
            loadData: loadData,
            type: type || 'other'
        }
        overrideOnTabOpen ? overrideOnTabOpen(activeTabName) : onTabOpen(activeTabName)
    }else{
        overrideOnTabOpen ? overrideOnTabOpen(activeTabName) : onTabReopen(activeTabName)
    }
    // mobile-only, close menu on page change
    $('#sidebarMenu').removeClass('show');
}

function goBackOneTab(){
    if(tabTree.backAction)tabTree.backAction()
    tabTree = tabTree.back
    if(tabTree){
        if($(`#tab-${tabTree.name}`).length === 0)goBackOneTab();
        openTab(tabTree.name,tabTree.loadData,tabTree.backAction,true)
    }
}

function goBackHome(){
    if(tabTree.back){
        goBackOneTab()
        goBackHome()
    }else{
        pageTabLinks.find(`.side-menu-link`).removeClass('page-link-active active');
        pageTabLinks.find(`.side-menu-link.go-home`).addClass('page-link-active active');
    }
}

function createNewTab(tabName,tabLabel,baseHtml,loadData,backAction,type){
    var theTab = $(`#tab-${tabName}`)
    var existAlready = true
    if(theTab.length === 0){
        var tabIcon = 'file-o'
        var handler = tabTypeHandlers[type]
        if(handler && handler.icon)tabIcon = handler.icon
        existAlready = false
        pageTabContainer.append(baseHtml)
        createdTabLinks.append(buildTabHtml(tabName,tabLabel,tabIcon))
        theTab = $(`#tab-${tabName}`)
    }
    openTab(tabName,loadData,backAction,null,type)
    return {
        existAlready: existAlready,
        theTab: theTab,
    }
}

function deleteTab(tabId){
    $(`[page-open="${tabId}"]`).remove()
    $(`#tab-${tabId}`).remove()
    onTabClose(tabId)
    delete(loadedPages[tabId])
}

// --- lifecycle hooks ---
var addedOnTabAway = {}
function addOnTabAway(tabId,action){
    if(!addedOnTabAway[tabId])addedOnTabAway[tabId] = []
    addedOnTabAway[tabId].push(action)
}

function onTabAway(tabId){
    var loadedTab = loadedPages[tabId]
    if(!loadedTab)return
    runTabTypeHandler('onAway',tabId)
    if(addedOnTabAway[tabId]){
        addedOnTabAway[tabId].forEach(function(theAction){
            try{
                theAction(loadedTab)
            }catch(err){
                console.log(err)
            }
        })
    }
}

var addedOnTabReopen = {}
function addOnTabReopen(tabId,action){
    if(!addedOnTabReopen[tabId])addedOnTabReopen[tabId] = []
    addedOnTabReopen[tabId].push(action)
}

function onTabReopen(tabId){
    var loadedTab = loadedPages[tabId]
    if(!loadedTab)return
    loadTabBlipPosition(tabId)
    console.log(`onTabReopen`,tabId,loadedTab.type)
    runTabTypeHandler('onReopen',tabId)
    if(addedOnTabReopen[tabId]){
        addedOnTabReopen[tabId].forEach(function(theAction){
            try{
                theAction(loadedTab)
            }catch(err){
                console.log(err)
            }
        })
    }
}

var addedOnTabOpen = {}
function addOnTabOpen(tabId,action){
    if(!addedOnTabOpen[tabId])addedOnTabOpen[tabId] = []
    addedOnTabOpen[tabId].push(action)
}

function onTabOpen(tabId){
    var loadedTab = loadedPages[tabId]
    if(!loadedTab)return
    loadTabBlipPosition(tabId)
    if(addedOnTabOpen[tabId]){
        addedOnTabOpen[tabId].forEach(function(theAction){
            theAction(loadedTab)
        })
    }
}

var addedOnTabClose = {}
function addOnTabClose(tabId,action){
    addedOnTabClose[tabId] = action
}

function onTabClose(tabId){
    var loadedTab = loadedPages[tabId]
    if(!loadedTab)return
    console.log(`onTabClose`,tabId,loadedTab.type)
    runTabTypeHandler('onClose',tabId)
    if(addedOnTabClose[tabId])addedOnTabClose[tabId](loadedTab)
}

// --- page ready queue ---
var readyFunctions = []
function onDashboardReady(theAction){
    readyFunctions.push(theAction)
}
function onDashboardReadyExecute(theAction){
    $.each(readyFunctions,function(n,theAction){
        theAction()
    })
}

// --- navigation click handlers ---
$(document).ready(function(){
    $('body')
    .on('click','.go-home',goBackHome)
    .on('click','.go-back',goBackOneTab)
    .on('click','.delete-tab',function(e){
        e.preventDefault()
        e.stopPropagation()
        var tabName = $(this).parents(`[page-open]`).attr(`page-open`)
        if(activeTabName === tabName){
            goBackOneTab()
        }
        deleteTab(tabName)
        return false;
    })
    .on('click','.delete-tab-dynamic',function(e){
        e.preventDefault()
        e.stopPropagation()
        var tabName = $(this).parents('.page-tab').attr('id').replace('tab-','')
        goBackOneTab()
        deleteTab(tabName)
        return false;
    })
    .on('click','[page-open]',function(){
        var el = $(this)
        var pageChoice = el.attr('page-open')
        var pageOptions = JSON.parse(el.attr('page-options') || '{}')
        if(tabTree && tabTree.name === pageChoice)return;
        openTab(pageChoice,pageOptions)
    })
})
