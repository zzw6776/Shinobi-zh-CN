// Superuser panel : Global Cloud Uploaders
// Edits config.cloudUploaders in conf.json. Each card is one uploader, tagged with the
// config key it writes to, and its inputs are named after the plain detail keys the
// uploader reads at runtime. An Admin whose account has that uploader Forced runs on these
// values and never receives them.
$(document).ready(function(){
    var cloudUploadersTab = $('#cloudUploaders')
    var cloudUploadersForm = $('#cloudUploadersForm')
    var endpoint = `${superApiPrefix}${$user.sessionKey}/system/cloudUploaders`

    function eachUploaderCard(theAction){
        cloudUploadersTab.find('[cloud-uploader-key]').each(function(){
            var card = $(this)
            theAction(card,card.attr('cloud-uploader-key'))
        })
    }
    // A select always reports a value, so its presence says nothing about whether the
    // Superuser actually configured this uploader. Only a filled in text field (a bucket, a
    // key, a path) counts as configuration -- otherwise every uploader would be written to
    // conf.json as soon as the tab was saved once.
    function readForm(){
        var cloudUploaders = {}
        eachUploaderCard(function(card,configKey){
            var values = {}
            var isConfigured = false
            card.find('[name]').each(function(){
                var input = $(this)
                var fieldName = input.attr('name')
                if(!fieldName)return
                var rawValue = input.val()
                // jQuery gives null for a select with no matching option; stringifying that
                // would store the literal text "null".
                if(rawValue === null || rawValue === undefined)return
                var value = `${rawValue}`
                if(value === '')return
                values[fieldName] = value
                if(!input.is('select'))isConfigured = true
            })
            if(isConfigured)cloudUploaders[configKey] = values
        })
        return cloudUploaders
    }
    function loadForm(cloudUploaders){
        eachUploaderCard(function(card,configKey){
            var values = cloudUploaders[configKey] || {}
            card.find('[name]').each(function(){
                var input = $(this)
                var fieldName = input.attr('name')
                if(!fieldName)return
                var storedValue = values[fieldName]
                if(storedValue !== undefined){
                    input.val(storedValue)
                }else if(input.is('select')){
                    // Back to whatever the server rendered as selected. `data-default` is no
                    // use here: several uploaders declare their default as a display string
                    // ("No") rather than the option value ("0"), so setting it would match no
                    // option and leave the select with a null value.
                    var renderedValue = input.find('option[selected]').val()
                    input.val(renderedValue !== undefined ? renderedValue : input.find('option').first().val())
                }else{
                    input.val('')
                }
            })
        })
    }
    function loadCloudUploaders(){
        $.get(endpoint,function(data){
            if(!data || !data.ok){
                new PNotify({text: (data && data.msg) || lang['Action Failed'], type:'error'})
                return
            }
            loadForm(data.cloudUploaders || {})
        })
    }
    // The floating save bar is an anchor, not a submit button, so route it into the form
    // the same way every other Superuser tab does.
    cloudUploadersTab.find('.submit').click(function(e){
        e.preventDefault()
        cloudUploadersForm.submit()
        return false
    })
    cloudUploadersForm.submit(function(e){
        e.preventDefault()
        $.post(endpoint,{cloudUploaders: JSON.stringify(readForm())},function(data){
            if(data && data.ok){
                new PNotify({
                    text: lang.globalCloudUploadersSaved,
                    type: 'success'
                })
            }else{
                new PNotify({text: (data && data.msg) || lang['Action Failed'], type:'error'})
            }
        })
        return false
    })
    onInitSuccess(function(){
        loadCloudUploaders()
    })
})
