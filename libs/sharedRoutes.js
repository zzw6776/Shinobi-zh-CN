// Routes that a Superuser can always reach, and that a dashboard account can reach when a
// Superuser has granted it the matching permission.
//
// Both mounts come from one handler and one registration call, so a route cannot end up
// exposed on the dashboard without its permission check. That matters here: these are the
// features that install code, run containers and rewrite conf.json.
module.exports = function(s,config,lang,app){
    // `=== '1'` rather than `!== '0'`. Accounts that predate a permission have no value
    // stored for it, and those must come out denied.
    s.userHasPermission = function(user,permission){
        return !!user && !!user.details && user.details[permission] === '1'
    }
    /**
     * @param method   express method, 'get' | 'post' | 'all'
     * @param feature  path segment shared by the pair, e.g. 'plugins' or 'p2p'
     * @param subPath  the rest of the path, e.g. '/list' or '/save'
     * @param permission  detail key the dashboard mount requires, e.g. 'use_plugin_manager'
     * @param handler  (req,res,resp) - `resp` carries $user for either kind of caller
     */
    function addSharedRoute(method,feature,subPath,permission,handler){
        app[method](`${config.webPaths.superApiPrefix}:auth/${feature}${subPath}`,(req,res) => {
            s.superAuth(req.params,(resp) => {
                handler(req,res,resp)
            },res,req)
        })
        // The group key goes where the rest of the dashboard API puts it, so the client can
        // build these with the same getApiPrefix(feature) helper it uses everywhere else.
        app[method](`${config.webPaths.apiPrefix}:auth/${feature}/:ke${subPath}`,(req,res) => {
            s.auth(req.params,(user) => {
                if(!s.userHasPermission(user,permission)){
                    s.closeJsonResponse(res,{ ok: false, msg: lang['Not Authorized'] })
                    return
                }
                handler(req,res,{ $user: user })
            },res,req)
        })
    }
    return {
        addSharedRoute,
    }
}
