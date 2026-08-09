// Plugin Manager route access.
//
// Every Plugin Manager endpoint is mounted twice from one handler: once under the Superuser
// API as before, and once under the normal dashboard API for accounts a Superuser has
// granted `use_plugin_manager`. Registering both from a single place means a route can never
// end up exposed on the dashboard without the permission check, which is the failure mode
// worth designing against here -- these endpoints install code and run containers.
module.exports = function(s,config,lang,app){
    // Deliberately `=== '1'`, not `!== '0'`. An account that predates this option has no
    // value at all, and those must come out as No; only an explicit grant counts.
    s.userCanUsePluginManager = function(user){
        return !!user && !!user.details && user.details.use_plugin_manager === '1'
    }
    // `subPath` is everything after `/plugins`, e.g. '/list' or '/docker/deploy'.
    function addPluginManagerRoute(method,subPath,handler){
        app[method](`${config.webPaths.superApiPrefix}:auth/plugins${subPath}`,(req,res) => {
            s.superAuth(req.params,(resp) => {
                handler(req,res,resp)
            },res,req)
        })
        // The group key sits where the rest of the dashboard API puts it, so the client can
        // build this with the same getApiPrefix('plugins') helper it uses everywhere else.
        app[method](`${config.webPaths.apiPrefix}:auth/plugins/:ke${subPath}`,(req,res) => {
            s.auth(req.params,(user) => {
                if(!s.userCanUsePluginManager(user)){
                    s.closeJsonResponse(res,{ ok: false, msg: lang['Not Authorized'] })
                    return
                }
                handler(req,res,{ $user: user })
            },res,req)
        })
    }
    return {
        addPluginManagerRoute,
    }
}
