module.exports = function(jsonData,pamDiffResponder){
    const {
        completeMonitorConfig,
        groupKey,
        monitorId,
        monitorName,
        monitorDetails,
    } = require('./libs/monitorUtils.js')(jsonData)
    const {
        convertRegionsToTiles,
    } = require('./libs/tileCutter.js')
    const loadDetectorUtils = require('./libs/detectorUtils.js')
    let tileMode = monitorDetails.detector_motion_tile_mode === '1'
    let detectorUtils
    let onMotionData = null
    if(tileMode){
        const {
            originalCords,
            newRegionsBySquares,
        } = convertRegionsToTiles(monitorDetails)
        jsonData.rawMonitorConfig.details.cords = newRegionsBySquares;
        detectorUtils = loadDetectorUtils(jsonData,pamDiffResponder)
        detectorUtils.originalCords = originalCords;
        onMotionData = detectorUtils.getTileMotionEvent()
    }else{
        detectorUtils = loadDetectorUtils(jsonData,pamDiffResponder)
    }
    const {
        pamDetectorIsEnabled,
        attachPamPipeDrivers,
        setMotionAnalyzer,
    } = detectorUtils;
    const attachDetector = function(cameraProcess){
        if(pamDetectorIsEnabled){
            attachPamPipeDrivers(cameraProcess,onMotionData)
        }
    }
    // Apply new regions, min/max change values or accuracy mode settings to the
    // live detector. `newDetails` is a partial monitor `details` object and its
    // `cords` are always the untiled originals as stored on the monitor.
    attachDetector.updateDetectionSettings = function(newDetails){
        if(!newDetails || typeof newDetails !== 'object')return false;
        const detailsToApply = Object.assign({},newDetails)
        const wasTileMode = tileMode
        if(detailsToApply.detector_motion_tile_mode !== undefined){
            tileMode = detailsToApply.detector_motion_tile_mode === '1'
        }
        if(tileMode && detailsToApply.cords !== undefined){
            const {
                originalCords,
                newRegionsBySquares,
            } = convertRegionsToTiles(Object.assign({},monitorDetails,detailsToApply))
            detailsToApply.cords = newRegionsBySquares
            detectorUtils.originalCords = originalCords
        }
        const applied = detectorUtils.updateDetectionSettings(detailsToApply)
        if(applied && tileMode !== wasTileMode){
            // accuracy mode toggled, swap the 'diff' handler on the running pam stream
            onMotionData = tileMode ? detectorUtils.getTileMotionEvent() : null
            setMotionAnalyzer(onMotionData)
        }
        return applied
    }
    return attachDetector
}
