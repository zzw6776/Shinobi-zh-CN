module.exports = function(s,config,lang,app,io){
    s.schedules = {}
    //Get all Schedules
    s.getAllSchedules = function(callback){
        s.schedules = {}
        s.knexQuery({
            action: "select",
            columns: "*",
            table: "Schedules"
        },(err,rows) => {

            rows && rows.forEach(function(schedule){
                s.updateSchedule(schedule)
            })
            if(callback && typeof callback === 'function')callback()
        })
    }
    //update schedule
    s.updateSchedule = function(row){
        var schedule = Object.assign({},row)
        if(!s.schedules[schedule.ke])s.schedules[schedule.ke] = {}
        s.checkDetails(schedule)
        schedule.timezoneOffset = parseInt(schedule.details.timezone) || 0
        schedule.details.days.forEach(function(dayNumber,key){
            schedule.details.days[key] = parseInt(dayNumber)
        })
        let changeType = ''
        if(!s.schedules[schedule.ke][schedule.name]){
            s.schedules[schedule.ke][schedule.name] = schedule
            changeType = 'added'
        }else{
            s.schedules[schedule.ke][schedule.name] = Object.assign(s.schedules[schedule.ke][schedule.name],schedule)
            changeType = 'changed'
        }
        s.runExtensionsForArray('onScheduleUpdated', null, [schedule.ke, schedule, changeType])
    }
    // "HH:mm" as minutes since midnight, or null when unusable
    const parseScheduleTimeToMinutes = function(value){
        if(!value)return null
        const parts = `${value}`.split(':')
        const hours = parseInt(parts[0])
        const minutes = parseInt(parts[1])
        if(isNaN(hours) || isNaN(minutes))return null
        return (hours * 60) + minutes
    }
    // The wall clock in the schedule's own timezone. `details.timezone` is minutes from UTC
    // (see config.timeZones), so the UTC instant is shifted by it and read back as UTC parts.
    const getScheduleZoneNow = function(schedule,now){
        const zoneTime = new Date((now || new Date()).getTime() + ((schedule.timezoneOffset || 0) * 60000))
        return {
            minutesOfDay: (zoneTime.getUTCHours() * 60) + zoneTime.getUTCMinutes(),
            day: zoneTime.getUTCDay(),
        }
    }
    const isDayScheduled = function(schedule,day){
        const days = schedule.details.days
        if(!days)return true // no day selection at all means every day
        return days.indexOf(day) > -1
    }
    // A schedule whose end is at or before its start runs past midnight, e.g. 22:00 to 01:00.
    // The selected days are the days the window *opens* on, so the portion after midnight
    // belongs to the previous day's entry - a Sunday 22:00-01:00 schedule is active from
    // Sunday 22:00 until Monday 01:00. Comparing two same-day timestamps, as this used to,
    // made every such window empty and the schedule never fired.
    const isScheduleActive = function(schedule,now){
        try{
            const start = parseScheduleTimeToMinutes(schedule.start)
            if(start === null)return false
            const end = parseScheduleTimeToMinutes(schedule.end)
            const zoneNow = getScheduleZoneNow(schedule,now)
            const previousDay = (zoneNow.day + 6) % 7
            if(end === null){
                return isDayScheduled(schedule,zoneNow.day) && zoneNow.minutesOfDay >= start
            }
            if(end > start){
                return isDayScheduled(schedule,zoneNow.day) &&
                    zoneNow.minutesOfDay >= start &&
                    zoneNow.minutesOfDay <= end
            }
            return (isDayScheduled(schedule,zoneNow.day) && zoneNow.minutesOfDay >= start) ||
                (isDayScheduled(schedule,previousDay) && zoneNow.minutesOfDay <= end)
        }catch(err){
            console.log(err)
            return false
        }
    }
    s.isScheduleActive = isScheduleActive
    //check all Schedules
    s.checkSchedules = function(v,callback){
        var groupKeys = Object.keys(s.schedules)
        groupKeys.forEach(function(key){
            var scheduleNames = Object.keys(s.schedules[key])
            scheduleNames.forEach(function(name){
                var schedule = s.schedules[key][name]
                if(schedule.enabled === 1 && schedule.start && schedule.details.monitorStates){
                    var passed = isScheduleActive(schedule)
                    if(passed && !schedule.active){
                        schedule.active = true
                        var monitorStates = schedule.details.monitorStates
                        monitorStates.forEach(function(stateName){
                            s.activateMonitorStates(key,stateName,{
                                ke: key,
                                uid: 'System',
                                details: {},
                                permissions: {},
                                lang
                            },function(endData){
                                // console.log(endData)
                            })
                        })
                    }else if(!passed && schedule.active){
                        schedule.active = false
                    }
                }
            })
        })
    }
    //
    s.findSchedule = function(groupKey,name,callback){
        //presetQueryVals = [ke, type, name]
        s.knexQuery({
            action: "select",
            columns: "*",
            table: "Schedules",
            where: [
                ['ke','=',groupKey],
                ['name','=',name],
            ],
            limit: 1
        },function(err,schedules) {
            var schedule
            var notFound = false
            if(schedules && schedules[0]){
                schedule = schedules[0]
                s.checkDetails(schedule)
            }else{
                notFound = true
            }
            callback(notFound,schedule)
        })
    }
    //
    var onProcessReady = function(){
        s.getAllSchedules(function(){
            s.checkSchedules()
        })
        setInterval(function(){
            s.checkSchedules()
        },1000 * 60 * 5)
    }
    /**
    * WebServerPath : API : Get Schedule
    */
    app.all([
        config.webPaths.apiPrefix+':auth/schedule/:ke',
        config.webPaths.adminApiPrefix+':auth/schedule/:ke',
        config.webPaths.apiPrefix+':auth/schedule/:ke/:name',
        config.webPaths.adminApiPrefix+':auth/schedule/:ke/:name',
        config.webPaths.apiPrefix+':auth/schedules/:ke',
        config.webPaths.adminApiPrefix+':auth/schedules/:ke',
        config.webPaths.apiPrefix+':auth/schedules/:ke/:name',
        config.webPaths.adminApiPrefix+':auth/schedules/:ke/:name',
    ],function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            const {
                isSubAccount,
            } = s.checkPermission(user)
            if(isSubAccount){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not an Administrator Account']});
                return
            }
            var whereQuery = [
                ['ke','=',req.params.ke]
            ]
            if(req.params.name){
                whereQuery.push(['name','=',req.params.name])
            }
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Schedules",
                where: whereQuery,
            },function(err,schedules) {
                endData.ok = true
                schedules = schedules || []
                schedules.forEach(function(schedule){
                    s.checkDetails(schedule)
                })
                endData.schedules = schedules
                s.closeJsonResponse(res,endData)
            })
        })
    })
    /**
    * WebServerPath : API : Update Schedule
    */
    app.all([
        config.webPaths.apiPrefix+':auth/schedule/:ke/:name/:action',
        config.webPaths.adminApiPrefix+':auth/schedule/:ke/:name/:action',
        config.webPaths.apiPrefix+':auth/schedules/:ke/:name/:action',
        config.webPaths.adminApiPrefix+':auth/schedules/:ke/:name/:action'
    ],function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            const {
                isSubAccount,
            } = s.checkPermission(user)
            if(isSubAccount){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not an Administrator Account']});
                return
            }
            switch(req.params.action){
                case'insert':case'edit':
                    var form = s.getPostData(req)
                    s.checkDetails(form)
                    if(!form || !form.details){
                        endData.msg = lang['Form Data Not Found']
                        s.closeJsonResponse(res,endData)
                        return
                    }
                    form.enabled = parseInt(form.enabled) || 1;
                    s.findSchedule(req.params.ke,req.params.name,function(notFound,preset){
                        if(notFound === true){
                            endData.msg = lang["Inserted Schedule Configuration"]
                            var insertData = {
                                ke: req.params.ke,
                                name: req.params.name,
                                details: s.stringJSON(form.details),
                                start: form.start,
                                end: form.end,
                                enabled: form.enabled
                            }
                            s.knexQuery({
                                action: "insert",
                                table: "Schedules",
                                insert: insertData
                            })
                            s.tx({
                                f: 'add_schedule',
                                insertData: insertData,
                                ke: req.params.ke,
                                name: req.params.name
                            },'GRP_'+req.params.ke)
                        }else{
                            endData.msg = lang["Edited Schedule Configuration"]
                            var insertData = {
                                details: s.stringJSON(form.details),
                                start: form.start,
                                end: form.end,
                                enabled: form.enabled
                            }
                            s.knexQuery({
                                action: "update",
                                table: "Schedules",
                                update: insertData,
                                where: [
                                    ['ke','=',req.params.ke],
                                    ['name','=',req.params.name],
                                ]
                            })
                            s.tx({
                                f: 'edit_schedule',
                                insertData: Object.assign(insertData,{
                                    ke: req.params.ke,
                                    name: req.params.name,
                                }),
                                ke: req.params.ke,
                                name: req.params.name
                            },'GRP_'+req.params.ke)
                        }
                        s.updateSchedule({
                            ke: req.params.ke,
                            name: req.params.name,
                            details: s.stringJSON(form.details),
                            start: form.start,
                            end: form.end,
                            enabled: form.enabled
                        })
                        endData.ok = true
                        s.closeJsonResponse(res,endData)
                    })
                break;
                case'delete':
                    s.findSchedule(req.params.ke,req.params.name,function(notFound,schedule){
                        if(notFound === true){
                            endData.msg = lang['Schedule Configuration Not Found']
                            s.closeJsonResponse(res,endData)
                        }else{
                            s.knexQuery({
                                action: "delete",
                                table: "Schedules",
                                where : {
                                    ke: req.params.ke,
                                    name: req.params.name,
                                }
                            },function(err){
                                if(!err){
                                    endData.msg = lang["Deleted Schedule Configuration"]
                                    endData.ok = true
                                    if(s.schedules[schedule.ke])delete(s.schedules[schedule.ke][schedule.name])
                                    s.runExtensionsForArray('onScheduleDeleted', null, [schedule.ke, schedule])
                                }
                                s.closeJsonResponse(res,endData)
                            })
                        }
                    })
                break;
            }
        })
    })
    //bind events
    s.onProcessReady(onProcessReady)
}
