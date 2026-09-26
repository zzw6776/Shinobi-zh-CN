// Map picker for the account-wide default geolocation. Mirrors the monitor editor's picker,
// but writes to the account's `default_geolocation` detail instead of a monitor's.
$(document).ready(function(e){
    var accountSettingsWindow = $('#tab-accountSettings')
    var accountSettingsMapOptionsEl = $('#account-settings-geolocation-options')
    var accountSettingsMapOptionsElOptions = accountSettingsMapOptionsEl.find('[map-option]')
    var theForm = $('#settings')
    var geolocationField = theForm.find(`[detail="default_geolocation"]`)
    var mapInWindow;
    var mapMarker;
    var mapMarkerFov;
    function setAdditionalControls(options){
        options = options || {}
        accountSettingsMapOptionsElOptions.each(function(n,v){
            var el = $(v)
            var key = el.attr('map-option')
            if(options[key])el.val(options[key]);
        })
    }
    function setAdditionalControlsUI(markerDetails){
        $.each(markerDetails,function(key,value){
            var setValue = `${value}`
            if(key === 'direction'){
                setValue = `${value} (${getCardinalDirection(value)})`
            }
            accountSettingsMapOptionsEl.find(`[map-option-value="${key}"]`).text(setValue)
        })
    }
    function getMapOptions(){
        var options = {}
        accountSettingsMapOptionsElOptions.each(function(n,v){
            var el = $(v)
            var key = el.attr('map-option')
            var value = el.val()
            options[key] = parseFloat(value) || value
        })
        return options
    }
    function getMapMarkerDetails(){
        var pos = mapMarker.getLatLng()
        var zoom = mapInWindow.getZoom();
        var {
            direction,
            fov,
            range,
        } = getMapOptions();
        return {
            lat: pos.lat,
            lng: pos.lng,
            zoom,
            direction,
            fov,
            range,
        }
    }
    function getMapMarkerPosition(markerDetails){
        var {
            lat,
            lng,
            zoom,
            direction,
            fov,
            range,
        } = (markerDetails || getMapMarkerDetails());
        return `${lat},${lng},${zoom},${direction},${fov},${range}`
    }
    function setGeolocationFieldValue(markerDetails){
        geolocationField.val(getMapMarkerPosition(markerDetails))
    }
    function loadMap(geoString){
        if(accountSettingsMapOptionsEl.length === 0)return;
        try{
            unloadMap()
        }catch(err){

        }
        // An empty field means "no account default", so the map opens on the built-in fallback.
        var {
            lat,
            lng,
            zoom,
            direction,
            fov,
            range,
        } = parseGeolocationParts(geoString !== undefined ? geoString : geolocationField.val(), fallbackGeolocationParts);
        mapInWindow = L.map('account-settings-monitor-map').setView([lat, lng], zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(mapInWindow);
        mapMarker = L.marker([lat, lng], {
            draggable: true,
        }).addTo(mapInWindow);
        mapMarker.on('dragend', function(){
            setGeolocationFieldValue()
        });
        mapMarker.on('drag', function(){
            var markerDetails = getMapMarkerDetails();
            setMapMarkerFov(mapMarkerFov,markerDetails)
        });
        mapInWindow.on('zoomend', function(){
            setGeolocationFieldValue()
        });
        setAdditionalControls({
            direction,
            fov,
            range,
        })
        mapMarkerFov = drawMapMarkerFov(mapInWindow,{
            lat,
            lng,
            direction,
            fov,
            range,
        })
        setAdditionalControlsUI({
            direction,
            fov,
            range,
        })
    }
    function unloadMap(){
        mapInWindow.remove();
        mapInWindow = null;
    }
    geolocationField.change(function(){
        loadMap($(this).val())
    })
    accountSettingsMapOptionsElOptions.on('input',function(){
        var markerDetails = getMapMarkerDetails();
        setGeolocationFieldValue(markerDetails)
        setMapMarkerFov(mapMarkerFov,markerDetails)
        setAdditionalControlsUI(markerDetails)
    })
    addOnTabOpen('accountSettings', function () {
        loadMap()
    })
    addOnTabReopen('accountSettings', function () {
        loadMap()
    })
    addOnTabAway('accountSettings', function () {
        try{
            unloadMap()
        }catch(err){

        }
    })
})
