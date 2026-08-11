const fs = require('fs-extra');
const express = require('express')
const unzipper = require('unzipper')
const spawn = require('child_process').spawn
const exec = require('child_process').execSync
const treekill = require('../basic/safeTreeKill.js');
const marked = require('marked').parse;
const {
  Worker
} = require('worker_threads');
module.exports = async (s,config,lang,app,io,currentUse) => {
    const { fetchDownloadAndWrite } = require('../basic/utils.js')(process.cwd(),config)
    // Mounts each Plugin Manager route for the Superuser API and, for accounts granted
    // `use_plugin_manager`, the dashboard API as well.
    const { addPluginManagerRoute } = require('./access.js')(s,config,lang,app)
    const {
        currentPluginCpuUsage,
        currentPluginGpuUsage,
        currentPluginFrameProcessingCount,
    } = currentUse;
    const {
        activateClientPlugin,
        initializeClientPlugin,
        deactivateClientPlugin,
    } = require('./utils.js')(s,config,lang)
    const {
        triggerEvent,
    } = require('../events/utils.js')(s,config,lang)
    const runningPluginWorkers = {}
    const runningInstallProcesses = {}
    const modulesBasePath = process.cwd() + '/plugins/'
    const extractNameFromPackage = (filePath) => {
        const filePathParts = filePath.split('/')
        const packageName = filePathParts[filePathParts.length - 1].split('.')[0]
        return packageName
    }
    const getModulePath = (name) => {
        return modulesBasePath + name + '/'
    }
    const getModuleConfiguration = (moduleName) => {
        var moduleConfig = {}
        const modulePath = modulesBasePath + moduleName
        if(fs.existsSync(modulePath + '/conf.json')){
            moduleConfig = getModuleProperties(moduleName,'conf')
        }else{
            if(fs.existsSync(modulePath + '/conf.sample.json')){
                moduleConfig = getModuleProperties(moduleName,'conf.sample')
            }else{
                moduleConfig = {
                    plug: moduleName.replace('shinobi-',''),
                    type: 'detector'
                }
            }
        }
        return moduleConfig
    }
    const getModule = (moduleName) => {
        const modulePath = modulesBasePath + moduleName
        const stats = fs.lstatSync(modulePath)
        var newModule;
        if(stats.isDirectory()){
            newModule = {
                name: moduleName,
                path: modulePath + '/',
                size: stats.size,
                lastModified: stats.mtime,
                created: stats.ctime,
            }
            var hasInstaller = false
            if(!fs.existsSync(modulePath + '/index.js')){
                hasInstaller = true
                newModule.noIndex = true
            }
            //package.json
            if(fs.existsSync(modulePath + '/package.json')){
                hasInstaller = true
                newModule.properties = getModuleProperties(moduleName)
            }else{
                newModule.properties = {
                    name: moduleName
                }
            }
            //conf.json
            newModule.config = getModuleConfiguration(moduleName)
            newModule.hasInstaller = hasInstaller
            newModule.installerRunning = !!runningInstallProcesses[moduleName]
        }
        return newModule
    }
    const getModules = (asArray) => {
        const foundModules = {}
        fs.readdirSync(modulesBasePath).forEach((moduleName) => {
            foundModules[moduleName] = getModule(moduleName)
        })
        return asArray ? Object.values(foundModules) : foundModules
    }
    const downloadModule = (downloadUrl,packageName) => {
        const downloadPath = modulesBasePath + packageName
        try{
            fs.mkdirSync(downloadPath, { recursive: true })
        }catch(err){
            s.debugLog(err)
        }
        return new Promise(async (resolve, reject) => {
            fs.mkdir(downloadPath, { recursive: true }, (err) => {
                if(err)console.error(err)
                fetchDownloadAndWrite(downloadUrl,downloadPath + '.zip', 1)
                .then((readStream) => {
                    readStream.pipe(unzipper.Parse())
                    .on('entry', async (file) => {
                        if(file.type === 'Directory'){
                            try{
                                fs.mkdirSync(modulesBasePath + file.path, { recursive: true })
                            }catch(err){

                            }
                        }else{
                            const content = await file.buffer();
                            fs.writeFile(modulesBasePath + file.path,content,(err) => {
                                if(err)console.log(err)
                            })
                        }
                    })
                    .promise()
                    .then(() => {
                        fs.remove(downloadPath + '.zip', () => {})
                        resolve()
                    })
                    .catch(reject)
                })
            })
        })
    }
    const getModuleProperties = (name,file) => {
        const modulePath = getModulePath(name)
        const propertiesPath = modulePath + `${file ? file : 'package'}.json`
        const properties = fs.existsSync(propertiesPath) ? s.parseJSON(fs.readFileSync(propertiesPath)) : {
            name: name
        }
        return properties
    }
    const installModule = (name) => {
        return new Promise((resolve, reject) => {
            if(!runningInstallProcesses[name]){
                //depending on module this may only work for Ubuntu
                const modulePath = getModulePath(name)
                const properties = getModuleProperties(name);
                const installerPath = modulePath + `INSTALL.sh`
                const propertiesPath = modulePath + 'package.json'
                var installProcess
                const tempRunPath = `${process.cwd()}/plugin-install-${name}.sh`
                if(fs.existsSync(installerPath)){
                    // check for INSTALL.sh (ubuntu only)
                    fs.writeFileSync(tempRunPath,`cd "${modulePath}" && sh INSTALL.sh && echo "Done!"`)
                }else if(fs.existsSync(propertiesPath)){
                    // no INSTALL.sh found, check for package.json and do `npm install --unsafe-perm`
                    fs.writeFileSync(tempRunPath,`cd "${modulePath}" && npm install && echo "Done!"`)
                }else{
                    fs.writeFileSync(tempRunPath,`echo "No Installer Found"`)
                }
                installProcess = spawn(`sh`,[tempRunPath])
                fs.rm(tempRunPath,function(err){s.debugLog(err)})
                if(installProcess){
                    const sendData = (data,channel) => {
                        const clientData = {
                            f: 'plugin-info',
                            module: name,
                            process: 'install-' + channel,
                            data: data,
                        }
                        s.tx(clientData,'PLUGINMANAGER')
                        s.debugLog(clientData)
                    }
                    installProcess.stderr.on('data',(data) => {
                        sendData(data.toString(),'stderr')
                    })
                    installProcess.stdout.on('data',(data) => {
                        sendData(data.toString(),'stdout')
                    })
                    installProcess.on('exit',(data) => {
                        sendData('#END_PROCESS','stdout')
                        runningInstallProcesses[name] = null;
                    })
                    runningInstallProcesses[name] = installProcess
                }
                resolve()
            }else{
                resolve(lang['Already Installing...'])
            }
        })
    }
    const runModuleCommand = (name,scriptName) => {
        return new Promise((resolve, reject) => {
            if(!runningInstallProcesses[name]){
                //depending on module this may only work for Ubuntu
                const modulePath = getModulePath(name)
                const properties = getModuleProperties(name);
                const theCmd = properties.addCmd[scriptName].cmd
                var installProcess
                const tempRunPath = `${process.cwd()}/plugin-install-${name}.sh`
                fs.writeFileSync(tempRunPath,`cd "${modulePath}" && ${theCmd}`)
                installProcess = spawn(`sh`,[tempRunPath])
                fs.rm(tempRunPath,function(err){s.debugLog(err)})
                if(installProcess){
                    const sendData = (data,channel) => {
                        const clientData = {
                            f: 'plugin-info',
                            module: name,
                            process: 'install-' + channel,
                            data: data,
                        }
                        s.tx(clientData,'PLUGINMANAGER')
                        s.debugLog(clientData)
                    }
                    installProcess.stderr.on('data',(data) => {
                        sendData(data.toString(),'stderr')
                    })
                    installProcess.stdout.on('data',(data) => {
                        sendData(data.toString(),'stdout')
                    })
                    installProcess.on('exit',(data) => {
                        sendData('#END_PROCESS','stdout')
                        runningInstallProcesses[name] = null;
                    })
                    runningInstallProcesses[name] = installProcess
                }
                resolve()
            }else{
                resolve(lang['Already Installing...'])
            }
        })
    }
    const enableModule = (name,status) => {
        // set status to `false` to enable
        try{
            const modulePath = getModulePath(name)
            const confJson = getModuleConfiguration(name)
            const confPath = modulePath + 'conf.json'
            confJson.enabled = status;
            fs.writeFileSync(confPath,s.prettyPrint(confJson))
        }catch(err){
            console.error('Failed to Toggle Enable Status for Module.', name, status)
        }
    }
    const deleteModule = (name) => {
        // requires restart for changes to take effect
        try{
            const modulePath = modulesBasePath + name
            fs.remove(modulePath, (err) => {
                if(err)console.log(err)
            })
            return true
        }catch(err){
            console.log(err)
            return false
        }
    }
    const unloadModule = (moduleName) => {
        const worker = runningPluginWorkers[moduleName]
        if(worker){
            worker.terminate()
            delete runningPluginWorkers[moduleName]
        }
    }
    const onWorkerMessage = (pluginName,type,data) => {
        switch(type){
            case'ocv':
                switch(data.f){
                    case'trigger':
                        triggerEvent(data)
                    break;
                    case's.tx':
                        s.tx(data.data,data.to)
                    break;
                    case'log':
                        s.systemLog('PLUGIN : '+data.plug+' : ',data)
                    break;
                    case's.sqlQuery':
                        s.sqlQuery(data.query,data.values)
                    break;
                    case's.knexQuery':
                        s.knexQuery(data.options)
                    break;
                }
            break;
            case'cpuUsage':
                currentPluginCpuUsage[pluginName] = data
            break;
            case'gpuUsage':
                currentPluginGpuUsage[pluginName] = data
            break;
            case'processCount':
                currentPluginFrameProcessingCount[pluginName] = data
            break;
        }
    }
    const loadModule = (shinobiModule) => {
        const moduleName = shinobiModule.name
        const moduleConfig = shinobiModule.config
        const modulePlugName = moduleConfig.plug
        const customModulePath = modulesBasePath + '/' + moduleName
        if(runningPluginWorkers[moduleName]){
            s.debugLog(`Plugin "${moduleName}" is already running, not starting a second worker.`)
            return
        }
        const worker = new Worker(customModulePath + '/' + shinobiModule.properties.main,{
            workerData: {ok: true}
        });
        initializeClientPlugin(moduleConfig)
        activateClientPlugin(moduleConfig,(data) => {
            worker.postMessage(data)
        })
        worker.on('message', (data) =>{
            onWorkerMessage(modulePlugName,...data)
        });
        worker.on('error', (err) =>{
            console.error(err)
        });
        worker.on('exit', (code) => {
            if (code !== 0){
                s.debugLog(`Worker (Plugin) stopped with exit code ${code}`);
            }
            if(runningPluginWorkers[moduleName] === worker){
                delete runningPluginWorkers[moduleName]
            }
            deactivateClientPlugin(modulePlugName)
        });
        runningPluginWorkers[moduleName] = worker
    }
    const moveModuleToNameInProperties = (modulePath,packageRoot) => {
        return new Promise((resolve,reject) => {
            const packageRootParts = packageRoot.split('/')
            const filename = `dl_${packageRootParts[packageRootParts.length - 1]}`
            fs.move(modulePath + packageRoot,modulesBasePath + filename,(err) => {
                if(packageRoot){
                    fs.remove(modulePath, (err) => {
                        if(err)console.log(err)
                        resolve(filename)
                    })
                }else{
                    resolve(filename)
                }
            })
        })
    }
    const initializeAllModules = async () => {
        fs.readdir(modulesBasePath,function(err,folderContents){
            if(!err && folderContents.length > 0){
                var moduleList = getModules(true)
                moduleList.forEach((shinobiModule) => {
                    if(!shinobiModule || !shinobiModule.config.enabled){
                        return;
                    }
                    loadModule(shinobiModule)
                })
            }else{
                fs.mkdir(modulesBasePath,() => {})
            }
        })
    }
    async function getPluginReadme(name,asHTML){
        const modulePath = getModulePath(name)
        const readmePath = modulePath + 'README.md'
        let readmeData = lang['No README found']
        try{
            readmeData = await fs.promises.readFile(readmePath,'utf8')
        }catch(err){
            console.log(err)
        }
        if(asHTML){
            readmeData = marked(readmeData)
        }
        return readmeData
    }
    const {
        isDockerAvailable,
        getDockerInfoForModule,
        detectHostIp,
    } = require('./docker.js')(s,config,lang,app,io,{
        getModulePath,
        getModuleProperties,
        getModuleConfiguration,
    })
    /**
    * API : Superuser : Custom Auto Load Package Download.
    */
    addPluginManagerRoute('get','/list', async (req,res,resp) => {
        const modules = getModules()
        const dockerAvailable = await isDockerAvailable()
        if(dockerAvailable){
            await Promise.all(Object.values(modules).filter(Boolean).map(async (shinobiModule) => {
                try{
                    shinobiModule.docker = await getDockerInfoForModule(shinobiModule.name)
                }catch(err){
                    s.debugLog('Failed to get Docker info for plugin',shinobiModule.name,err)
                }
            }))
        }
        s.closeJsonResponse(res,{
            ok: true,
            modules: modules,
            dockerAvailable: dockerAvailable,
            detectedHostIp: dockerAvailable ? detectHostIp() : null,
            connectedPlugins: s.connectedDetectorPlugins,
        })
    })
    /**
    * API : Superuser : Custom Auto Load Package Download.
    */
    addPluginManagerRoute('post','/download', async (req,res,resp) => {
        try{
            const url = req.body.downloadUrl
            const packageRoot = req.body.packageRoot || ''
            const packageName = req.body.packageName || extractNameFromPackage(url)
            const modulePath = getModulePath(packageName)
            await downloadModule(url,packageName)
            s.debugLog('Downloaded',packageName,url)
            const newName = await moveModuleToNameInProperties(modulePath,packageRoot)
            const properties = getModuleProperties(newName)
            s.debugLog('properties',properties)
            s.debugLog('moveModuleToNameInProperties',newName)
            const chosenName = newName ? newName : packageName
            enableModule(chosenName,false)
            s.debugLog('Plugin Ready to Use!',newName,url)
            s.closeJsonResponse(res,{
                ok: true,
                moduleName: chosenName,
                newModule: getModule(chosenName)
            })
        }catch(err){
            console.error(err)
            s.closeJsonResponse(res,{
                ok: false,
                error: err
            })
        }
    })
    // /**
    // * API : Superuser : Custom Auto Load Package Update.
    // */
    // addPluginManagerRoute('post','/update', async (req,res) => {
    //     s.superAuth(req.params, async (resp) => {
    //         try{
    //             const url = req.body.downloadUrl
    //             const packageRoot = req.body.packageRoot || ''
    //             const packageName = req.body.packageName || extractNameFromPackage(url)
    //             const modulePath = getModulePath(packageName)
    //             await downloadModule(url,packageName)
    //             const properties = getModuleProperties(packageName)
    //             const newName = await moveModuleToNameInProperties(modulePath,packageRoot,properties)
    //             const chosenName = newName ? newName : packageName
    //
    //             enableModule(chosenName,true)
    //             s.closeJsonResponse(res,{
    //                 ok: true,
    //                 moduleName: chosenName,
    //                 newModule: getModule(chosenName)
    //             })
    //         }catch(err){
    //             s.closeJsonResponse(res,{
    //                 ok: false,
    //                 error: err
    //             })
    //         }
    //     },res,req)
    // })
    /**
    * API : Superuser : Custom Auto Load Package Install.
    */
    addPluginManagerRoute('post','/install', async (req,res,resp) => {
        const packageName = req.body.packageName
        const cancelInstall = req.body.cancelInstall === 'true' ? true : false
        const response = {ok: true}
        if(runningInstallProcesses[packageName] && cancelInstall){
            treekill(runningInstallProcesses[packageName].pid)
        }else if(cancelInstall){
            // response.msg = ''
        }else{
            const error = await installModule(packageName)
            if(error){
                response.ok = false
                response.msg = error
            }
        }
        s.closeJsonResponse(res,response)
    })
    /**
    * API : Superuser : Custom Auto Load Package Install.
    */
    addPluginManagerRoute('post','/run', async (req,res,resp) => {
        const packageName = req.body.packageName
        const scriptName = req.body.scriptName
        const response = {ok: true}
        if(runningInstallProcesses[packageName]){
            treekill(runningInstallProcesses[packageName].pid)
        }else{
            const error = await runModuleCommand(packageName,scriptName)
            if(error){
                response.ok = false
                response.msg = error
            }
        }
        s.closeJsonResponse(res,response)
    })
    /**
    * API : Superuser : Interact with Installer
    */
    addPluginManagerRoute('post','/command', async (req,res,resp) => {
        const packageName = req.body.packageName
        const command = req.body.command || ''
        const response = {ok: true}
        try{
            runningInstallProcesses[packageName].stdin.write(`${command}\n`)
        }catch(err){
            response.ok = false
            response.msg = err
        }
        s.closeJsonResponse(res,response)
    })
    /**
    * API : Superuser : Update Plugin conf.json
    */
    addPluginManagerRoute('post','/configuration/update', async (req,res,resp) => {
        const response = {ok: true}
        const packageName = req.body.packageName
        const configPath = modulesBasePath + packageName + '/conf.json'
        const newPluginConfig = s.parseJSON(req.body.config) || {}
        try{
            await fs.promises.writeFile(configPath,s.prettyPrint(newPluginConfig))
        }catch(err){
            response.ok = false
            response.msg = err
        }
        s.closeJsonResponse(res,response)
    })
    /**
    * API : Superuser : Get Plugin conf.json
    */
    addPluginManagerRoute('get','/configuration', async (req,res,resp) => {
        const response = {ok: true}
        const packageName = req.query.packageName
        const modulePath = modulesBasePath + packageName
        try{
            const shinobiModule = getModule(packageName)
            response.config = shinobiModule.config
        }catch(err){
            response.ok = false
            response.msg = err
        }
        s.closeJsonResponse(res,response)
    })
    /**
    * API : Superuser : Custom Auto Load Package set Status (Enabled or Disabled).
    */
    addPluginManagerRoute('post','/status', async (req,res,resp) => {
        const status = req.body.status
        const packageName = req.body.packageName
        const selection = status == 'true' ? true : false
        enableModule(packageName,selection)
        try{
            if(selection){
                loadModule(getModule(packageName))
            }else{
                unloadModule(packageName)
            }
        }catch(err){
            s.debugLog(`Failed to apply plugin status change for ${packageName}`,err)
            s.closeJsonResponse(res,{ok: false, status: selection, msg: `${err}`})
            return
        }
        s.closeJsonResponse(res,{ok: true, status: selection})
    })
    /**
    * API : Superuser : Custom Auto Load Package Delete
    */
    addPluginManagerRoute('post','/delete', async (req,res,resp) => {
        const packageName = req.body.packageName
        const response = deleteModule(packageName)
        s.closeJsonResponse(res,{ok: response})
    })
    /**
    * API : Superuser : Custom Auto Load Package Reload All
    */
    addPluginManagerRoute('post','/reloadAll', async (req,res,resp) => {
        await initializeAllModules();
        s.closeJsonResponse(res,{ok: true})
    })
    /**
    * API : Superuser : Get Plugin README
    */
    addPluginManagerRoute('get','/readme/:pluginName', async (req,res,resp) => {
        const name = req.params.pluginName
        const readme = await getPluginReadme(name,true);
        s.closeJsonResponse(res,{ok: true, readme: readme})
    })
    s.beforeMonitorsLoadedOnStartup(async () => {
        // Initialize Modules on Start
        await initializeAllModules();
    })
}
