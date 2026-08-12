// Plugin Manager route access. A thin binding of the shared registrar in
// libs/sharedRoutes.js to this feature's path segment and permission, so the 17 call sites
// in superUser.js and docker.js stay as they are.
module.exports = function(s,config,lang,app){
    const { addSharedRoute } = require('../sharedRoutes.js')(s,config,lang,app)
    s.userCanUsePluginManager = function(user){
        return s.userHasPermission(user,'use_plugin_manager')
    }
    // `subPath` is everything after `/plugins`, e.g. '/list' or '/docker/deploy'.
    function addPluginManagerRoute(method,subPath,handler){
        addSharedRoute(method,'plugins',subPath,'use_plugin_manager',handler)
    }
    return {
        addPluginManagerRoute,
    }
}
