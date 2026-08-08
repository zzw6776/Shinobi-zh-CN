// Conditional form-field visibility, shared by the dashboard and the Superuser panel.
// Split out of bs5.dashboard-base.js so pages that render definition-driven forms or the
// permissions modal (blocks/mainpermissions.ejs) get it without pulling in the dashboard.

// Conditional visibility is declared as data, not encoded in class names. A definition
// carries a `visibleWhen` rule which drawBlock renders as a `visible-when` attribute on the
// element it governs, and every rule is evaluated independently against the current form
// values. The old scheme (`h_det_input h_det_1 h_onvif_events_input h_onvif_events_1`) let
// whichever selector changed last hide a section another selector still wanted shown, and
// matched class names by substring so `h_vc_libvpx` also matched `h_vc_libvpx-vp9`.
//
// A rule is an OR of AND groups. Each group maps a field key to the value(s) that satisfy it:
//     visibleWhen: { h_det: '1' }                        // detector enabled
//     visibleWhen: { h_t: ['h264','hls','mp4'] }         // any of these stream types
//     visibleWhen: [{ h_det: '1' },{ h_onvif_events: '1' }]  // either one keeps it visible
// A key resolves against `selector="key"`, then `detail="key"`, then `name="key"`.
function getVisibilityFieldValue(parent,key,cache){
    if(cache[key] !== undefined)return cache[key]
    var el = parent.find(`[selector="${key}"],[detail="${key}"],[name="${key}"]`).first()
    cache[key] = el.length > 0 ? `${el.val()}` : null
    return cache[key]
}
function matchesVisibilityGroup(parent,group,cache){
    var keys = Object.keys(group || {})
    for(var i = 0; i < keys.length; i++){
        var key = keys[i]
        var value = getVisibilityFieldValue(parent,key,cache)
        if(value === null)return false
        var accepted = group[key]
        if(!(accepted instanceof Array))accepted = [accepted]
        var matched = accepted.some(function(oneValue){
            return `${oneValue}` === value
        })
        if(!matched)return false
    }
    return true
}
function getVisibleWhenRule(el){
    var rule = el.data('visibleWhenParsed')
    if(rule === undefined){
        try{
            rule = JSON.parse(el.attr('visible-when'))
        }catch(err){
            console.log('Bad visible-when rule',el.attr('visible-when'),err)
            rule = null
        }
        if(rule && !(rule instanceof Array))rule = [rule]
        el.data('visibleWhenParsed',rule)
    }
    return rule
}
function applyVisibleWhen(parent){
    var cache = {}
    parent.find('[visible-when]').each(function(){
        var el = $(this)
        var rule = getVisibleWhenRule(el)
        if(!rule)return
        var shouldShow = rule.some(function(group){
            return matchesVisibilityGroup(parent,group,cache)
        })
        if(shouldShow){
            el.show()
        }else{
            el.hide()
        }
    })
}
// Legacy fallback for definitions that still encode conditions in class names (plugins,
// third party definitions). Same OR semantics as `visible-when` so the two agree.
function getSelectorValues(parent){
    var values = {}
    parent.find('[selector]').each(function(){
        var el = $(this)
        var theParam = el.attr('selector')
        if(!theParam)return
        if(!values[theParam])values[theParam] = []
        values[theParam].push(`${el.val()}`)
    })
    return values
}
function applySelectorVisibility(parent,values){
    values = values || getSelectorValues(parent)
    var params = Object.keys(values)
    if(params.length === 0)return
    var governedSelector = params.map(function(theParam){
        return `.${theParam}_input`
    }).join(',')
    parent.find(governedSelector).each(function(){
        var el = $(this)
        var classes = `${el.attr('class') || ''}`.split(/\s+/)
        var isGoverned = false
        var shouldShow = false
        params.forEach(function(theParam){
            if(classes.indexOf(`${theParam}_input`) === -1)return
            isGoverned = true
            values[theParam].forEach(function(theValue){
                if(classes.indexOf(`${theParam}_${theValue}`) > -1)shouldShow = true
            })
        })
        if(!isGoverned)return
        if(shouldShow){
            el.show()
        }else{
            el.hide()
        }
    })
}
function onSelectorChange(_this,parent){
    var el = $(_this)
    var theParam = el.attr('selector')
    var theSelected = el.find('option:selected').text()
    parent.find(`.${theParam}_text`).text(theSelected)
    applyVisibleWhen(parent)
    applySelectorVisibility(parent)
}
