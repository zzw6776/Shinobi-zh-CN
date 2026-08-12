$(document).ready(function(){
    var loadedModules = {}
    var downloadablePlugins = {}
    var dockerAvailable = false
    var detectedHostIp = ''
    var dockerActionInProgress = {}
    var connectedPluginsStatus = {}
    var connectedPluginsListElement = $('#connectedPluginsList')
    var connectedPluginsCardElement = $('#connectedPluginsCard')
    var theEnclosure = $('#superPluginManager')
    var listElement = $('#pluginManagerList')
    var downloadListElement = $('#pluginManagerDownloadble tbody')
    var quickSelect = $('#pluginQuickSelect')
    var pluginDownloadForm = $('#downloadNewPlugin')
    var pluginCommandLine = $('#pluginCommandLine')
    var pluginDownloadableSearch = $('#pluginManagerDownloadbleListSearch')
    var getModules = function(callback) {
        $.get(pluginManagerApiPrefix + '/list',callback)
    }
    function getDlPluginId(plugin){
        return `${plugin.name}_${plugin.link}_${plugin.dir}`
    }
    function drawDownloadablePlugins(data){
        var html = ''
        $.each(data,function(n,plugin){
            html += `
            <tr dl-plugin="${getDlPluginId(plugin)}">
                <td class="align-middle">
                    <a class="btn btn-info btn-sm cursor-pointer download" title="${lang.Download}"><i class="fa fa-download"></i></a>
                </td>
                <td class="align-middle">
                    <div>${plugin.name}</div>
                    <div><small>${plugin.updated}</small></div>
                </td>
                <td class="align-middle">
                    <div>${plugin.type.map(item => `<span>${item}</span>`).join(', ')}</div>
                    <div class="small"><span>${lang['Tested on']}</span> : ${plugin.os.map(item => `<span>${item}</span>`).join(', ')}</div>
                </td>
                <td class="align-middle">
                    ${plugin.dir}
                </td>
                <td class="align-middle">
                    <div><span class="badge badge-info">${plugin.engine}</span></div>
                    <div>${plugin.gpuRequired ? `<span class="badge badge-primary">${plugin.gpuRequired instanceof Array ? plugin.gpuRequired.join(', ') : lang['GPU Required']}</span>` : ''}</div>
                    <div>${plugin.experimental ? `<span class="badge badge-info">${lang.Experimental}</span>` : ''}</div>
                    <div>${plugin.arch.map(item => `<span title="${lang.Architecture}" class="badge badge-primary">${item}</span>`).join(' ')}</div>
                </td>
            </tr>`
        })
        downloadListElement.html(html)
    }
    function filterDownloadablePlugins(theSearch = '') {
        var searchQuery = theSearch.trim().toLowerCase();
        if(searchQuery === ''){
            downloadListElement.find(`[dl-plugin]`).show()
            return;
        }
        var rows = Object.values(downloadablePlugins);
        var filtered = []
        rows.forEach((row) => {
            var searchInString = JSON.stringify(row).toLowerCase();
            var theElement = downloadListElement.find(`[dl-plugin="${getDlPluginId(row)}"]`)
            console.log(searchInString)
            if(searchInString.indexOf(searchQuery) > -1){
                theElement.show()
            }else{
                theElement.hide()
            }
        })
        return filtered
    }
    function getDownloadableModules(callback) {
        return new Promise((resolve,reject) => {
            const pluginListUrl = `https://cdn.shinobi.video/plugins/list.json`
            $.getJSON(pluginListUrl,function(data){
                $.each(data,function(n,plugin){
                    downloadablePlugins[getDlPluginId(plugin)] = plugin;
                })
                drawDownloadablePlugins(data)
                resolve(data)
            })
        })
    }
    var loadedBlocks = {}
    function renderConnectedPlugins(){
        var plugNames = Object.keys(connectedPluginsStatus)
        if(plugNames.length === 0){
            connectedPluginsListElement.html(`<div class="text-muted">${lang['No Plugins Connected']}</div>`)
            return
        }
        var html = plugNames.sort().map(function(plug){
            var info = connectedPluginsStatus[plug]
            var isConnected = info.status === 'connected'
            return `
                <div class="connected-plugin-row d-flex justify-content-between align-items-center py-1" connected-plugin="${plug}">
                    <div><span class="status-dot ${isConnected ? 'status-dot-connected' : 'status-dot-disconnected'}"></span> <b>${plug}</b> ${info.connectionType ? `<small class="text-muted">${info.connectionType}</small>` : ''}</div>
                    <span class="badge ${isConnected ? 'badge-success' : 'badge-secondary'}">${isConnected ? lang.Connected : lang.Disconnected}</span>
                </div>`
        }).join('')
        connectedPluginsListElement.html(html)
    }
    // Docker reports raw states ("running", "exited", "absent"). On their own those
    // read as jargon in the plugin list, and "exited" in particular looks like an
    // error rather than "stopped on purpose" - so they get spelled out.
    function dockerStatusLabel(status){
        switch(status){
            case'running': return lang['Running in Docker'] || 'Running in Docker'
            case'exited': return lang['Stopped (Docker)'] || 'Stopped (Docker)'
            case'absent': return lang['Not Installed'] || 'Not Installed'
            default: return status
        }
    }
    function dockerStatusBadge(status){
        var badgeClass = status === 'running' ? 'badge-success' : (status === 'absent' ? 'badge-secondary' : 'badge-warning')
        return `<span class="badge ${badgeClass}">${dockerStatusLabel(status)}</span>`
    }
    function buildDockerSectionHtml(module){
        var docker = module.docker || {}
        var variants = docker.variants || []
        if(!dockerAvailable || variants.length === 0)return ''
        var container = docker.container || { status: 'absent' }
        var isRunning = container.status === 'running'
        var isAbsent = container.status === 'absent'
        var variantOptions = variants.map((v) => `<option value="${v}">${v}</option>`).join('')
        return `
            <div class="docker-plugin-install mt-2 mb-0 p-2">
                <div class="mb-1"><b><i class="fa fa-cube"></i> ${lang['Docker'] || 'Docker'}</b> ${dockerStatusBadge(container.status)} ${container.image ? `<small>${container.image}</small>` : ''}</div>
                ${isAbsent ? `
                    <div class="mb-1"><small class="text-muted">${lang['dockerPluginHint'] || 'Run this plugin in a container instead of installing it on this machine. The image brings its own dependencies (including CUDA, where applicable), so there is nothing to install here.'}</small></div>
                    <div class="form-inline">
                        <select class="form-control form-control-sm d-inline-block w-auto mr-1" docker-field="variant">${variantOptions}</select>
                        <input type="text" class="form-control form-control-sm d-inline-block w-auto mr-1" docker-field="host" placeholder="${lang['Host'] || 'Host'}" value="${detectedHostIp}">
                        <a class="btn btn-sm btn-primary" plugin-manager-action="docker-deploy">${lang['Pull & Run (Docker)'] || 'Pull & Run (Docker)'}</a>
                    </div>
                ` : `
                    <a class="btn btn-sm btn-default" plugin-manager-action="docker-logs">${lang['View Logs'] || 'View Logs'}</a>
                    ${isRunning ? `<a class="btn btn-sm btn-warning" plugin-manager-action="docker-stop">${lang['Stop'] || 'Stop'}</a>` : `<a class="btn btn-sm btn-success" plugin-manager-action="docker-start">${lang['Start'] || 'Start'}</a>`}
                    <a class="btn btn-sm btn-danger" plugin-manager-action="docker-remove">${lang['Remove Container'] || 'Remove Container'}</a>
                `}
                <div class="docker-logs-view d-none mt-2"><pre class="text-white mb-0"></pre></div>
            </div>`
    }
    // The Downloaded list is a table. Each plugin is two rows sharing one `package-name`:
    // a summary row, and a details row holding the output panels, installer prompt, Docker
    // section and README. Everything that acts on a plugin selects by `[package-name]` and
    // then `.find()`s inside, so spanning two rows keeps all of that working - see
    // getPluginRows(), which is what those lookups go through.
    var getPluginTableBody = function(){
        var tableBody = listElement.find('.plugin-manager-table tbody')
        if(tableBody.length === 0){
            listElement.html(`<table class="table table-striped mb-0 plugin-manager-table">
                <thead>
                    <tr>
                        <th>${lang['Name'] || 'Name'}</th>
                        <th>${lang['Time Created']}</th>
                        <th>${lang['Last Modified']}</th>
                        <th>${lang['Status'] || 'Status'}</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>`)
            tableBody = listElement.find('.plugin-manager-table tbody')
        }
        return tableBody
    }
    var getPluginRows = function(packageName){
        return listElement.find(`[package-name="${packageName}"]`)
    }
    // A plugin can be running in one of two completely independent ways, and the old
    // single Enabled/Disabled badge only described the first of them:
    //
    //   1. As a WORKER - Shinobi spawns it itself as a child process. This is what
    //      conf.json's `enabled` flag controls, and what the Enable/Disable button
    //      toggles. Nothing else.
    //   2. Over a WEBSOCKET - the plugin runs as its own process and connects in as a
    //      client. That covers a Docker container and an ordinary bare-metal install
    //      configured with mode "client", possibly on a different machine entirely.
    //
    // A plugin connected over a websocket is working perfectly while still being
    // "Disabled" as a worker, which read as broken before these were separated.
    var buildStatusBadge = function(module){
        var moduleConfig = module.config || {}
        var plug = moduleConfig.plug || module.name
        var connection = connectedPluginsStatus[plug] || {}
        var isConnected = connection.status === 'connected'
        var docker = module.docker || {}
        var container = docker.container || {}
        var workerTitle = lang['workerStatusHint'] || 'Whether Shinobi runs this plugin itself as a worker (child process). It does not affect plugins that connect over a websocket.'
        var badges = [moduleConfig.enabled
            ? `<span class="badge badge-success" title="${workerTitle}">${lang['Enabled (Worker)'] || 'Enabled (Worker)'}</span>`
            : `<span class="badge badge-secondary" title="${workerTitle}">${lang['Disabled (Worker)'] || 'Disabled (Worker)'}</span>`]
        if(isConnected){
            var websocketTitle = lang['websocketStatusHint'] || 'This plugin is connected to Shinobi over a websocket - from a Docker container, or from its own process on this or another machine.'
            badges.push(`<span class="badge badge-info d-block mt-1" title="${websocketTitle}">${lang['Enabled by Websocket'] || 'Enabled by Websocket'}</span>`)
        }
        if(container.status && container.status !== 'absent'){
            // Shown even when connected: a container that is running but NOT connected
            // means the image is fine and the key/host is wrong, which is worth seeing.
            badges.push(`<span class="badge ${container.status === 'running' ? 'badge-primary' : 'badge-warning'} d-block mt-1">
                    <i class="fa fa-cube"></i> ${dockerStatusLabel(container.status)}
                </span>`)
        }else if(dockerAvailable && (docker.variants || []).length > 0){
            // Nothing deployed yet, but this plugin ships images - advertise that, since
            // the alternative is the user never realising Docker is an option.
            badges.push(`<small class="d-block mt-1 text-muted"><i class="fa fa-cube"></i> ${lang['Docker available'] || 'Docker available'}</small>`)
        }
        return badges.join('\n')
    }
    // Connection state arrives on its own socket events, independently of the module
    // list, so the affected plugin's Status cell has to be repainted when it changes -
    // otherwise "Enabled by Websocket" only appears after a full refresh.
    var refreshStatusBadgeForPlug = function(plug){
        $.each(loadedModules || {},function(name,module){
            if(!module)return
            if(((module.config || {}).plug || name) !== plug)return
            getPluginRows(name).find('.plugin-status-badge').html(buildStatusBadge(module))
        })
    }
    // Output and README live in the details row, which stays collapsed until there is
    // something to look at - otherwise every plugin would push the table rows far apart.
    var showPluginDetails = function(packageName){
        getPluginRows(packageName).filter('.plugin-detail-row').show()
    }
    var drawModuleBlock = function(module){
        var humanName = module.properties.name ? module.properties.name : module.name
        var additionalCommands = module.properties.addCmd ? Object.values(module.properties.addCmd) : [];
        if(listElement.find(`[package-name="${module.name}"]`).length > 0){
            var existingElement = listElement.find(`[package-name="${module.name}"]`)
            existingElement.find('.title').text(humanName)
            existingElement.find('[plugin-manager-action="status"]').text(!module.config.enabled ? lang.Enable : lang.Disable)
            existingElement.find('.plugin-status-badge').html(buildStatusBadge(module))
            var refreshedDockerHtml = buildDockerSectionHtml(module)
            existingElement.find('.docker-section').html(refreshedDockerHtml)
            // Docker may have become available (or the plugin may have gained/lost
            // images) since this row was drawn, so the row's visibility is re-evaluated
            // on every refresh rather than only at creation.
            existingElement.filter('.plugin-docker-row').toggle(!!refreshedDockerHtml)
            loadedModules[module.name] = module;
            loadedBlocks[module.name] = Object.assign(loadedBlocks[module.name] || {},module)
        }else{
            var addCmdButtons = additionalCommands.length > 0 ? `<div class="dropdown d-inline-block command-buttons">
              <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" id="dmb-${module.name}" data-bs-toggle="dropdown" aria-expanded="false">
                ${lang['Commands']}
              </button>
              <ul class="dropdown-menu" aria-labelledby="dmb-${module.name}">
                ${additionalCommands.map((script) => {
                    return `<li><a class="dropdown-item" plugin-manager-action="run" data-script="${script.name}">${script.title}</a></li>`
                }).join('')}
              </ul>
            </div>` : ''
            // The Docker panel lives in its own row that is visible without expanding
            // the details toggle - it is an install method, not debug output, so hiding
            // it behind a terminal icon meant nobody found it. The row collapses itself
            // when this plugin has no images (or Docker is not installed on the host).
            var dockerSectionHtml = buildDockerSectionHtml(module)
            getPluginTableBody().prepend(`
                    <tr class="plugin-summary-row" package-name="${module.name}">
                        <td>
                            <div class="title">${humanName}</div>
                            <small class="text-muted">${module.name}</small>
                        </td>
                        <td><small>${module.created}</small></td>
                        <td><small>${module.lastModified}</small></td>
                        <td class="plugin-status-badge">${buildStatusBadge(module)}</td>
                        <td class="text-end plugin-actions text-center">
                            <div class="mb-2">
                                <a class="btn btn-sm btn-default" plugin-manager-action="detailsToggle" title="${lang['Output'] || 'Output'}"><i class="fa fa-terminal"></i></a>
                                <a class="btn btn-sm btn-default" plugin-manager-action="readmeToggle">${lang.Notes}</a>
                                ${module.hasInstaller ? `
                                    <a class="btn btn-sm btn-info" plugin-manager-action="install">${lang['Run Installer']}</a>
                                    <a class="btn btn-sm btn-danger" style="display:none" plugin-manager-action="cancelInstall">${lang['Stop']}</a>
                                ` : ''}
                                ${addCmdButtons}
                            </div>
                            <div>
                                <a class="btn btn-sm btn-default" plugin-manager-action="status">${!module.config.enabled ? lang.Enable : lang.Disable}</a>
                                <a class="btn btn-sm btn-danger" plugin-manager-action="delete">${lang.Delete}</a>
                                <a class="btn btn-sm btn-warning" plugin-manager-action="editConfig">${lang[`Edit Configuration`]}</a>
                            </div>
                        </td>
                    </tr>
                    <tr class="plugin-docker-row" package-name="${module.name}"${dockerSectionHtml ? '' : ' style="display:none"'}>
                        <td colspan="5" class="pt-0">
                            <div class="docker-section">${dockerSectionHtml}</div>
                        </td>
                    </tr>
                    <tr class="plugin-detail-row" package-name="${module.name}" style="display:none">
                        <td colspan="5">
                            <form style="display:none" class="command-line row mb-3" plugin-manager-command-line>
                                <div class="input-group">
                                  <input name="cmd" type="text" class="form-control form-control-sm" placeholder="Type and Press Enter to Send Command">
                                  <button type="submit" class="btn btn-sm btn-primary m-0">${lang.Run}</button>
                                </div>
                            </form>
                            <div class="install-output row">
                                <div class="col-md-6 pr-2 mb-2"><pre class="install-output-stdout text-white mb-0"></pre></div>
                                <div class="col-md-6 pl-2 mb-2"><pre class="install-output-stderr text-white mb-0"></pre></div>
                            </div>
                            <div class="command-installer row" style="display:none">
                                <div class="col-md-6">
                                    <button type="button" class="btn btn-sm btn-success btn-block" plugin-manager-action="command" command="y">${lang.Yes}</button>
                                </div>
                                <div class="col-md-6">
                                    <button type="button" class="btn btn-sm btn-danger btn-block" plugin-manager-action="command" command="N">${lang.No}</button>
                                </div>
                            </div>
                            <div class="readme-view d-none"></div>
                        </td>
                    </tr>`)
            // Both rows, so `.find()` from here reaches the details row's elements.
            var newBlock = getPluginRows(module.name)
            loadedBlocks[module.name] = Object.assign({
                block: newBlock,
                stdout: newBlock.find('.install-output-stdout'),
                stderr: newBlock.find('.install-output-stderr'),
            },module)
            loadedModules[module.name] = module;
        }
    }
    var downloadModule = function(url,packageRoot,callback){
        $.confirm.create({
            title: lang['Plugin Download'],
            body: `${lang.superPluginDownloadText}<br><b>${url}</b>? `,
            clickOptions: {
                class: 'btn-success',
                title: lang.Download,
            },
            clickCallback: function(){
                new PNotify({
                    title: lang['Plugin Downloading'],
                    text: lang['Please Wait...'],
                    type: 'info'
                });
                $.post(pluginManagerApiPrefix + '/download',{
                    downloadUrl: url,
                    packageRoot: packageRoot,
                },function(data){
                    setTimeout(function(){
                        new PNotify({
                            title: lang['Plugin Downloaded'],
                            text: lang.superPluginDownloadedText,
                            type: 'success'
                        });
                        callback(data)
                    },3000)
                })
            }
        })
    }
    var installModule = function(packageName,callback){
        $.confirm.create({
            title: 'Install Module',
            body: `Do you want to install the module ${packageName}?`,
            clickOptions: {
                class: 'btn-success',
                title: lang.Install,
            },
            clickCallback: function(){
                loadedBlocks[packageName].stdout.empty()
                loadedBlocks[packageName].stderr.empty()
                $.post(pluginManagerApiPrefix + '/install',{
                    packageName: packageName,
                },callback)
            }
        })
    }
    var runModuleCommand = function(packageName,scriptName,callback){
        $.confirm.create({
            title: lang.Run,
            body: lang.runConfirmationText,
            clickOptions: {
                class: 'btn-success',
                title: lang.Run,
            },
            clickCallback: function(){
                loadedBlocks[packageName].stdout.empty()
                loadedBlocks[packageName].stderr.empty()
                $.post(pluginManagerApiPrefix + '/run',{
                    packageName: packageName,
                    scriptName: scriptName,
                },callback)
            }
        })
    }
    var deleteModule = function(packageName,callback){
        $.confirm.create({
            title: 'Delete Module',
            body: `Do you want to delete the module ${packageName}?`,
            clickOptions: {
                class: 'btn-danger',
                title: lang.Delete,
            },
            clickCallback: function(){
                $.post(pluginManagerApiPrefix + '/delete',{
                    packageName: packageName,
                },callback)
            }
        })
    }
    var setModuleStatus = function(packageName,status,callback){
        $.post(pluginManagerApiPrefix + '/status',{
            status: status,
            packageName: packageName,
        },callback)
    }
    var sendInstallerCommand = function(packageName,command,callback){
        $.post(pluginManagerApiPrefix + '/command',{
            command: command,
            packageName: packageName,
        },callback)
    }
    var getPluginBlock = function(packageName){
        return loadedBlocks[packageName].block
    }
    var toggleUsabilityOfYesAndNoButtons = function(packageName,enabled){
        getPluginBlock(packageName).find('.command-installer')[!enabled ? 'hide' : 'show']()
    }
    var toggleCardButtons = function(card,buttons){
        $.each(buttons,function(n,button){
            var el
            if(button.el){
                el = card.find(`${button.el}`)
            }else{
                el = card.find(`[plugin-manager-action="${button.action}"]`)
            }
            el.removeClass(button.show ? 'd-none' : 'd-inline-block').addClass(button.show ? 'd-inline-block' : 'd-none')
        })
    }
    function appendLoggerData(text,outputEl){
        outputEl.append(`<div class="line">${text}</div>`)
        setTimeout(function(){
            var objDiv = outputEl[0]
            objDiv.scrollTop = objDiv.scrollHeight;
        },100)
    }
    function getReadme(packageName){
        return new Promise(function(resolve){
            $.get(`${pluginManagerApiPrefix}/readme/${packageName}`,function(data){
                if(!data.ok)console.error(data);
                resolve(data.readme || '')
            })
        })
    }
    async function toggleReadme(packageName){
        var readmeView = loadedBlocks[packageName].block.find('.readme-view')
        var isHidden = readmeView.hasClass('d-none')
        if(isHidden){
            var readmeHTML = await getReadme(packageName)
            readmeView.removeClass('d-none').html(readmeHTML)
        }else{
            readmeView.addClass('d-none').empty()
        }
    }
    $('body')
    .on(`submit`,`[plugin-manager-command-line]`,function(e){
        e.preventDefault()
        var form = $(this)
        var formCmdEl = form.find('[name="cmd"]')
        var packageName = form.parents('[package-name]').attr('package-name')
        var command = formCmdEl.val()
        sendInstallerCommand(packageName,command,function(data){
            console.log(data)
            formCmdEl.val('')
        })
        return false;
    })
    .on(`click`,`[plugin-manager-action]`,function(e){
        e.preventDefault()
        var el = $(this)
        var action = el.attr('plugin-manager-action')
        var packageName = el.parents('[package-name]').attr('package-name')
        // Both rows for this plugin, not just the one the button sits in - the buttons are
        // in the summary row while .command-line, .command-installer and the output panels
        // they toggle are in the details row.
        var card = getPluginRows(packageName)
        switch(action){
            case'detailsToggle':
                card.filter('.plugin-detail-row').toggle()
            break;
            case'readmeToggle':
                showPluginDetails(packageName)
                toggleReadme(packageName)
            break;
            case'run':
                var scriptName = el.attr('data-script')
                runModuleCommand(packageName,scriptName,function(data){
                    if(data.ok){
                        toggleCardButtons(card,[
                            { action: 'install', show: false },
                            { el: '.command-line', show: true },
                            { el: '.command-buttons', show: false },
                            { action: 'editConfig', show: false },
                            { action: 'cancelInstall', show: true },
                            { action: 'delete', show: false },
                            { action: 'status', show: false },
                        ])
                    }
                })
            break;
            case'install':
                installModule(packageName,function(data){
                    if(data.ok){
                        toggleCardButtons(card,[
                            { action: 'install', show: false },
                            { el: '.command-line', show: true },
                            { el: '.command-buttons', show: false },
                            { action: 'editConfig', show: false },
                            { action: 'cancelInstall', show: true },
                            { action: 'delete', show: false },
                            { action: 'status', show: false },
                        ])
                    }
                })
            break;
            case'cancelInstall':
                $.post(pluginManagerApiPrefix + '/install',{
                    packageName: packageName,
                    cancelInstall: 'true'
                },function(data){
                    if(data.ok){
                        toggleCardButtons(card,[
                            { action: 'install', show: true },
                            { el: '.command-line', show: false },
                            { el: '.command-buttons', show: true },
                            { action: 'editConfig', show: true },
                            { action: 'cancelInstall', show: false },
                            { action: 'delete', show: true },
                            { action: 'status', show: true },
                        ])
                    }
                })
                toggleUsabilityOfYesAndNoButtons(packageName,false)
            break;
            case'status':
                var currentStatus = !!loadedModules[packageName].config.enabled
                var newStatus = !currentStatus
                // Enabling starts the plugin's worker and its output streams into these same
                // panels, so whatever an earlier install or run left behind is cleared first
                // - otherwise the new plugin's first lines land under stale text.
                if(newStatus){
                    loadedBlocks[packageName].stdout.empty()
                    loadedBlocks[packageName].stderr.empty()
                }
                setModuleStatus(packageName,newStatus,function(data){
                    if(data.ok){
                        loadedModules[packageName].config.enabled = newStatus
                        el.text(currentStatus ? lang.Enable : lang.Disable)
                        card.find('.plugin-status-badge').html(buildStatusBadge(loadedModules[packageName]))
                    }
                })
            break;
            case'delete':
                deleteModule(packageName,function(data){
                    if(data.ok){
                        card.remove()
                    }
                })
            break;
            case'command':
                var command = el.attr('command')
                sendInstallerCommand(packageName,command,function(data){
                    if(data.ok){
                        toggleUsabilityOfYesAndNoButtons(packageName,false)
                    }
                })
            break;
            case'editConfig':
                $.get(pluginManagerApiPrefix + '/configuration?packageName=' + packageName,function(data){
                    $.confirm.create({
                        title: lang[`Edit Configuration`],
                        body: `<textarea id="pluginConfigEditContents" class="form-control" style="height:400px;font-family: monospace;border:1px solid #eee; border-radius: 15px;padding: 10px;">${JSON.stringify(data.config,null,3) || {}}</textarea>`,
                        clickOptions: {
                            class: 'btn-success',
                            title: lang.Save,
                        },
                        clickCallback: function(){
                            var newPluginConfigStringed = $('#pluginConfigEditContents').val()
                            $.post(pluginManagerApiPrefix + '/configuration/update',{
                                packageName: packageName,
                                config: newPluginConfigStringed,
                            },function(data){
                                console.log(data)
                            })
                        }
                    })
                })
            break;
            case'docker-deploy':
                var variant = card.find('[docker-field="variant"]').val()
                var hostField = card.find('[docker-field="host"]').val()
                $.confirm.create({
                    title: lang['Pull & Run (Docker)'] || 'Pull & Run (Docker)',
                    body: lang.superPluginDownloadText || 'This will pull the Docker image and run it, replacing any existing container for this plugin.',
                    clickOptions: {
                        class: 'btn-success',
                        title: lang.Run,
                    },
                    clickCallback: function(){
                        loadedBlocks[packageName].stdout.empty()
                        loadedBlocks[packageName].stderr.empty()
                        dockerActionInProgress[packageName] = true
                        $.post(pluginManagerApiPrefix + '/docker/deploy',{
                            packageName: packageName,
                            variant: variant,
                            host: hostField,
                        },function(data){
                            console.log(data)
                        })
                    }
                })
            break;
            case'docker-stop':
                $.post(pluginManagerApiPrefix + '/docker/stop',{
                    packageName: packageName,
                },function(data){
                    refreshModuleList()
                })
            break;
            case'docker-start':
                $.post(pluginManagerApiPrefix + '/docker/start',{
                    packageName: packageName,
                },function(data){
                    refreshModuleList()
                })
            break;
            case'docker-remove':
                $.confirm.create({
                    title: lang['Remove Container'] || 'Remove Container',
                    body: lang['confirmRemoveDockerContainer'] || 'Do you want to remove this plugin\'s Docker container?',
                    clickOptions: {
                        class: 'btn-danger',
                        title: lang.Delete,
                    },
                    clickCallback: function(){
                        $.post(pluginManagerApiPrefix + '/docker/remove',{
                            packageName: packageName,
                        },function(data){
                            refreshModuleList()
                        })
                    }
                })
            break;
            case'docker-logs':
                var logsView = card.find('.docker-logs-view')
                var isHidden = logsView.hasClass('d-none')
                if(isHidden){
                    $.get(pluginManagerApiPrefix + '/docker/logs?packageName=' + packageName,function(data){
                        logsView.removeClass('d-none').find('pre').text(data.logs || '')
                    })
                }else{
                    logsView.addClass('d-none').find('pre').empty()
                }
            break;
        }
    })
    theEnclosure.on('click','[dl-plugin] .download',function(e){
        var pluginName = $(this).parents('[dl-plugin]').attr('dl-plugin')
        console.log(pluginName)
        var theDlPlugin = downloadablePlugins[pluginName]
        downloadModule(theDlPlugin.link,theDlPlugin.dir,function(data){
            if(data.ok){
                $('[data-bs-target="#pluginManagerList"],#pluginManagerList').addClass('active')
                $('[data-bs-target="#pluginManagerDownloadbleList"],#pluginManagerDownloadbleList').removeClass('active')
                var theModule = data.newModule
                theModule.config.enabled = false
                // The download response only carries `docker` when the server found
                // Docker on this host, so its presence is proof enough - without this the
                // panel would stay hidden until the next /list call reset the flag.
                if(theModule.docker)dockerAvailable = true
                drawModuleBlock(theModule)
                if(theModule.installerRunning){
                    toggleCardButtons(card,[
                        { action: 'install', show: false },
                        { el: '.command-line', show: true },
                        { el: '.command-buttons', show: false },
                        { action: 'editConfig', show: false },
                        { action: 'cancelInstall', show: true },
                        { action: 'delete', show: false },
                        { action: 'status', show: false },
                    ])
                }
            }
        })
    })
    $('#tablist a[data-bs-toggle="tab"]').on('shown.bs.tab',function(e){
        var target = $(e.target).attr('data-bs-target')
        if(target === '#pluginManagerDownloadbleList'){
            connectedPluginsCardElement.hide()
            pluginDownloadForm.show()
        }else if(target === '#pluginManagerList'){
            pluginDownloadForm.hide()
            connectedPluginsCardElement.show()
        }
    })
    $('#pluginQuickSelectExec').click(function(){
        var currentVal = quickSelect.val()
        var valParts = currentVal.split('.zip,')
        var packageUrl = `${valParts[0]}.zip`
        var packageRoot = valParts[1]
        pluginDownloadForm.find(`[name="downloadUrl"]`).val(packageUrl)
        pluginDownloadForm.find(`[name="packageRoot"]`).val(packageRoot)
        pluginDownloadForm.submit()
    })
    pluginDownloadableSearch.keyup(function(){
        var searchQuery = $(this).val()
        filterDownloadablePlugins(searchQuery)
    })
    function getObjectAlphabetically(theObject,key){
        return Object.values(theObject).sort(function( a, b ) {
            const aName = new Date(a[key]).getTime()
            const bName = new Date(b[key]).getTime()
            if ( aName < bName ){
                return -1;
            }
            if ( aName > bName ){
                return 1;
            }
            return 0;
        });
    }
    function refreshModuleList(){
        getModules(function(data){
            dockerAvailable = !!data.dockerAvailable
            detectedHostIp = data.detectedHostIp || ''
            loadedModules = data.modules
            // Populated BEFORE drawing: each row's Status cell reports whether that
            // plugin is connected over a websocket, so drawing first would paint every
            // row with last refresh's connection state.
            connectedPluginsStatus = {}
            $.each(data.connectedPlugins || {},function(plug,info){
                connectedPluginsStatus[plug] = Object.assign({},info,{status:'connected'})
            })
            $.each(getObjectAlphabetically(data.modules,'created'),function(n,module){
                drawModuleBlock(module)
            })
            renderConnectedPlugins()
        })
    }
    renderConnectedPlugins()
    setTimeout(refreshModuleList,2000)
    // The two pages hosting this panel have different sockets: the dashboard exposes
    // onWebSocketEvent, the Superuser panel has $.ccio.ws. Both are fed the same
    // 'plugin-info' events from the PLUGINMANAGER room.
    function onPluginManagerEvent(handler){
        if(typeof onWebSocketEvent === 'function'){
            onWebSocketEvent(handler)
        }else if($.ccio && $.ccio.ws){
            $.ccio.ws.on('f',handler)
        }
    }
    onPluginManagerEvent(function(data){
        switch(data.f){
            case'plugin-info':
                var name = data.module
                // A running plugin streams output continuously, so frames can arrive before
                // this page has drawn that plugin's card (or after it was deleted). The
                // output panels only exist on the card, so without this every line would
                // throw. connection-status is still handled - it does not need the card.
                if(!loadedBlocks[name] && data.process !== 'connection-status')return;
                // Output is worth nothing behind a collapsed row, so anything arriving on
                // either stream opens the details for that plugin.
                if(data.process === 'install-stdout' || data.process === 'install-stderr'){
                    showPluginDetails(name)
                }
                switch(data.process){
                    case'install-stdout':
                        appendLoggerData(data.data,loadedBlocks[name].stdout)
                        if(data.data.indexOf('(y)es or (N)o') > -1 || data.data.indexOf('(Y)es or (n)o') > -1){
                            toggleUsabilityOfYesAndNoButtons(name,true)
                        }else if(data.data === '#END_PROCESS'){
                            if(dockerActionInProgress[name]){
                                delete dockerActionInProgress[name]
                                refreshModuleList()
                            }else{
                                var card = $(`[package-name="${name}"]`)
                                toggleCardButtons(card,[
                                    { action: 'install', show: true },
                                    { el: '.command-line', show: false },
                                    { el: '.command-buttons', show: true },
                                    { action: 'editConfig', show: true },
                                    { action: 'cancelInstall', show: false },
                                    { action: 'delete', show: true },
                                    { action: 'status', show: true },
                                ])
                            }
                        }
                    break;
                    case'install-stderr':
                        appendLoggerData(data.data,loadedBlocks[name].stderr)
                    break;
                    case'connection-status':
                        connectedPluginsStatus[name] = Object.assign({},data.plugin,{status:data.status})
                        renderConnectedPlugins()
                        refreshStatusBadgeForPlug(name)
                    break;
                }
            break;
        }
    })
    // The Downloaded / Download Plugins switch is a pair of buttons rather than nav-tabs.
    // Bootstrap still does the switching (the container carries `nav` so its Tab plugin can
    // resolve a parent); it only moves its own `active` class, so the colour swap is done
    // here. Delegated from body because the panel is injected by the page hosting it.
    $('body').on('shown.bs.tab','.plugin-manager-tab-btn',function(){
        $('.plugin-manager-tab-btn').each(function(){
            var btn = $(this)
            var isActive = btn.hasClass('active')
            btn.toggleClass('btn-success',isActive).toggleClass('btn-default',!isActive)
        })
    })
    getDownloadableModules()
})
