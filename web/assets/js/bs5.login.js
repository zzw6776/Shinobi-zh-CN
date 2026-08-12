var loginForm = $('#login-form')
var cachedLoginInfo = localStorage.getItem('ShinobiLogin_'+location.host)
var cachedMachineId = localStorage.getItem('ShinobiAuth_'+location.host)
function generateId(x){
    if(!x){x=10};var t = "";var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < x; i++ )
        t += p.charAt(Math.floor(Math.random() * p.length));
    return t;
}
// `visible-when` rules, same contract as applyVisibleWhen in bs5.dashboard-base.js (which
// the login page does not load). Each rule is evaluated on its own against the current form
// values, so no selector can hide an element another selector still wants shown.
function onSelectorChange(el){
    try{
        loginForm.find(`.${el.attr('selector')}_text`).text(el.find('option:selected').text())
        var cache = {}
        loginForm.find('[visible-when]').each(function(){
            var target = $(this)
            var rule
            try{
                rule = JSON.parse(target.attr('visible-when'))
            }catch(err){
                return console.log('Bad visible-when rule',target.attr('visible-when'),err)
            }
            if(!(rule instanceof Array))rule = [rule]
            var shouldShow = rule.some(function(group){
                return Object.keys(group).every(function(key){
                    if(cache[key] === undefined){
                        var field = loginForm.find(`[selector="${key}"],[name="${key}"]`).first()
                        cache[key] = field.length > 0 ? `${field.val()}` : null
                    }
                    if(cache[key] === null)return false
                    var accepted = group[key]
                    if(!(accepted instanceof Array))accepted = [accepted]
                    return accepted.some(function(oneValue){
                        return `${oneValue}` === cache[key]
                    })
                })
            })
            if(shouldShow){
                target.show()
            }else{
                target.hide()
            }
        })
    }catch(err){
        console.log(err)
    }
}
if(!cachedMachineId){
    cachedMachineId = generateId(20)
    localStorage.setItem('ShinobiAuth_'+location.host,cachedMachineId)
}
$(document).ready(function(){
    $('#machineID').val(cachedMachineId)
    $('[selector]').change(function(){
        var el = $(this)
        onSelectorChange(el)
    }).change();
})
loginForm.submit(function(e){
    $('#login-message').remove()
    var formValues = loginForm.serializeObject()
    if(formValues.remember){
        localStorage.setItem('ShinobiLogin_'+location.host,JSON.stringify({
            mail: formValues.mail,
            pass: formValues.pass,
            function: formValues.function
        }))
    }else{
        localStorage.removeItem('ShinobiLogin_'+location.host)
    }
    if(googleSignIn)googleSignOut();
})
if(cachedLoginInfo){
    cachedLoginInfo = JSON.parse(cachedLoginInfo)
    $.each(cachedLoginInfo,function(n,v){
        var el = loginForm.find('[name="'+n+'"]')
        if(el.attr('type') === 'checkbox'){
            el.prop('checked',true)
        }else{
            el.val(v)
        }
    })
    loginForm.find('[name="remember"]').prop('checked',true)
    loginForm.submit()
}
$('[name="function"]').change(function(){
    var removeClass='btn-danger btn-primary btn-success btn-warning'
    var addClass='btn-success'
    switch($(this).val()){
        case'streamer':
            addClass='btn-warning'
        break;
        case'admin':
            addClass='btn-primary'
        break;
        case'super':
            addClass='btn-danger'
        break;
    }
    $('#login-submit').removeClass(removeClass).addClass(addClass)
})
