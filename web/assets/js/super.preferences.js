$(document).ready(function(){
    var changeSuperPreferencesTab = $('#changeSuperPreferences')
    var tokenContainer = $('#super-tokens')
    var changeSuperPreferencesForm = changeSuperPreferencesTab.find('form')
    // API Keys are only added to the page when Add is pressed - nothing is stored until
    // the form is saved, so leaving the tab at that point silently loses the key. This
    // notice is the warning that the page owes the user.
    var hasUnsavedTokens = false
    var unsavedNotice = $(`<div class="alert alert-warning mt-3 unsaved-tokens-notice d-none">
        <b><i class="fa fa-exclamation-triangle"></i> ${lang['Unsaved API Keys'] || 'Unsaved API Keys'}</b>
        <div><small>${lang.unsavedTokensText || 'These API Keys have not been saved yet. Press Save to keep them - they are lost if you leave this tab.'}</small></div>
    </div>`)
    function setUnsavedTokens(isUnsaved){
        hasUnsavedTokens = !!isUnsaved
        unsavedNotice.toggleClass('d-none',!hasUnsavedTokens)
    }
    function generateId(x){
        if(!x){x=10};var t = "";var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for( var i=0; i < x; i++ )
            t += p.charAt(Math.floor(Math.random() * p.length));
        return t;
    }
    function drawTokenRow(tokenValue){
        var html = `<div class="d-flex flex-row token-row mt-3">
            <div class="flex-grow-1">
                <input class="form-control form-control-sm token-row-input" value="${tokenValue || generateId(30)}">
            </div>
            <div>
                <a class="delete-token btn btn-danger btn-sm my-0 ml-3"><i class="fa fa-trash"></i></a>
            </div>
        </div>`
        tokenContainer.append(html)
    }
    function getTokenRows(){
        var rowsFound = []
        changeSuperPreferencesTab.find('.token-row-input').each(function(n,v){
            var el = $(v)
            var tokenValue = el.val().trim()
            if(tokenValue)rowsFound.push(tokenValue);
        })
        return rowsFound
    }
    function loadPreferences(){
        var tokens = $user.tokens
        changeSuperPreferencesTab.find('[name=mail]').val($user.mail)
        if(tokens instanceof Array){
            tokens.forEach(function(token){
                drawTokenRow(token)
            })
        }
    }
    changeSuperPreferencesTab.find('.new-token').click(function(){
        drawTokenRow()
        setUnsavedTokens(true)
    })
    changeSuperPreferencesTab.on('click','.delete-token',function(){
        $(this).parents('.token-row').remove()
        setUnsavedTokens(true)
    })
    // Editing an existing key is just as unsaved as adding one.
    changeSuperPreferencesTab.on('input','.token-row-input',function(){
        setUnsavedTokens(true)
    })
    changeSuperPreferencesTab.find('.submit').click(function(){
        changeSuperPreferencesForm.submit()
    })
    changeSuperPreferencesForm.submit(function(e){
        e.preventDefault()
        var formValues = $(this).serializeObject()
        formValues.tokens = getTokenRows()
        // $.ccio.cx({f:'accounts',ff:'saveSuper',form:formValues})
        $.post(superApiPrefix + $user.sessionKey + '/accounts/saveSettings',{
            data: JSON.stringify(formValues)
        },function(data){
            if(data && data.ok === false){
                new PNotify({
                    type: 'error',
                    title: lang['Settings Changed'],
                    text: data.msg || lang['Action Failed'],
                })
                return
            }
            // Only cleared once the save actually came back - otherwise the notice would
            // disappear on a failed save and the keys would still be at risk.
            setUnsavedTokens(false)
            $user.tokens = formValues.tokens
            new PNotify({
                type: 'success',
                title: lang['Settings Changed'],
                text: lang['Saved'] || lang['Settings Changed'],
            })
        })
        return false
    })
    // Sits directly above the keys it is about.
    tokenContainer.before(unsavedNotice)
    // The notice is only visible while this tab is, so leaving it is the moment the keys
    // are actually at risk. The tab engine exposes this hook for exactly that.
    if(typeof addOnTabAway === 'function'){
        addOnTabAway('changeSuperPreferences',function(){
            if(!hasUnsavedTokens)return
            new PNotify({
                type: 'error',
                title: lang['Unsaved API Keys'] || 'Unsaved API Keys',
                text: lang.unsavedTokensLeftText || 'You left Preferences with API Keys that were never saved. They are still on the page - go back and press Save to keep them.',
                hide: false,
            })
        })
    }
    // Closing or reloading the page loses them outright, with no way back.
    $(window).on('beforeunload',function(){
        if(hasUnsavedTokens)return lang.unsavedTokensText || 'These API Keys have not been saved yet.'
    })
    loadPreferences()
})
