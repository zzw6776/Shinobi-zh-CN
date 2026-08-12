var helpingHandShows = {
    "motion-preset-pair": {
        name: 'Add a Motion Detection On/Off Preset Pair',
        targetMonitor: true,
        playlist: [
            {
                text: 'Presets are made from <b>Monitor Settings</b>. Open the Monitor you want the preset to control.',
                time: 1,
                handPos: {
                    el: `[page-open="monitorSettings"]`
                },
                cmd: () => {
                    var monitorId = getSelectedHelpingHandMonitorTarget();
                    openMonitorEditorPage(monitorId)
                }
            },
            {
                text: `Change the settings the preset should apply. Here we turn the <b>Detector</b> on.`,
                time: 2,
                handPos: {
                    el: `#tab-monitorSettings [detail="detector"]`
                },
                cmd: () => {
                    $('#tab-monitorSettings [detail="detector"]').val('1').change();
                }
            },
            {
                text: `Open the menu beside the Save button.`,
                time: 1.5,
                handPos: {
                    el: `#monitorsListOptions`
                },
                cmd: () => {
                    $('#monitorsListOptions').dropdown('show');
                }
            },
            {
                text: `Choose <b>Create new Preset</b>.`,
                time: 1.5,
                handPos: {
                    el: `#tab-monitorSettings .create-monitor-state-preset`
                },
                cmd: () => {
                    $('#tab-monitorSettings .create-monitor-state-preset').click();
                }
            },
            {
                text: `Every setting you changed is listed and ticked. Untick anything you do not want, then name the preset.`,
                time: 2,
                handPos: {
                    el: `#confirm_window .monitor-state-preset-name`
                },
                cmd: async () => {
                    await typeWriteInField('Motion Detection On','#confirm_window .monitor-state-preset-name');
                }
            },
            {
                text: `Save the Preset.`,
                time: 1.5,
                handPos: {
                    el: `#confirm_window .confirmaction0`
                },
                cmd: () => {
                    $('#confirm_window .confirmaction0').click();
                }
            },
            /// Motion Off
            {
                text: `A preset only stores what differs from the Monitor's saved settings, so we save the Monitor with the Detector on before making the opposite preset.`,
                time: 2.5,
                handPos: {
                    el: `#tab-monitorSettings .sticky-bar [type="submit"]`
                },
                cmd: () => {
                    $('#tab-monitorSettings form').submit();
                }
            },
            {
                text: `Now turn the <b>Detector</b> off for the second preset.`,
                time: 2,
                handPos: {
                    el: `#tab-monitorSettings [detail="detector"]`
                },
                cmd: () => {
                    $('#tab-monitorSettings [detail="detector"]').val('0').change();
                }
            },
            {
                time: 1.5,
                handPos: {
                    el: `#monitorsListOptions`
                },
                cmd: () => {
                    $('#monitorsListOptions').dropdown('show');
                }
            },
            {
                text: `Create the second Preset the same way. <b>Add to Preset</b> would put this Monitor into a preset you already have.`,
                time: 2,
                handPos: {
                    el: `#tab-monitorSettings .create-monitor-state-preset`
                },
                cmd: () => {
                    $('#tab-monitorSettings .create-monitor-state-preset').click();
                }
            },
            {
                time: 2,
                handPos: {
                    el: `#confirm_window .monitor-state-preset-name`
                },
                cmd: async () => {
                    await typeWriteInField('Motion Detection Off','#confirm_window .monitor-state-preset-name');
                }
            },
            {
                time: 1.5,
                handPos: {
                    el: `#confirm_window .confirmaction0`
                },
                cmd: () => {
                    $('#confirm_window .confirmaction0').click();
                }
            },
            {
                text: `Saved presets are listed under the <b>Monitor States</b> tab, where they can also be deleted.`,
                time: 2,
                handPos: {
                    el: `[page-open="monitorStates"]`
                },
                cmd: () => {
                    openTab('monitorStates',{})
                }
            },
            /// set schedule, motion ON
            {
                text: 'Now we set them to activate automatically based on a time frame.',
                time: 1,
                handPos: {
                    el: `[page-open="schedules"]`
                },
                cmd: () => {
                    openTab('schedules',{})
                }
            },
            {
                time: 1,
                handPos: {
                    el: `#schedulesSelector`
                },
                cmd: () => {
                    $('#schedulesSelector option').prop('selected',false);
                    $('#schedulesSelector').val('').change();
                }
            },
            {
                time: 1,
                handPos: {
                    el: `#tab-schedules [name="name"]`
                },
                cmd: async () => {
                    await typeWriteInField('Motion Detection On','#tab-schedules [name="name"]');
                }
            },
            {
                time: 1,
                handPos: {
                    el: `#tab-schedules [name="enabled"]`
                }
            },
            {
                time: 1,
                handPos: {
                    el: `#tab-schedules [name="start"]`
                },
                cmd: async () => {
                    await typeWriteInField('00:00','#tab-schedules [name="start"]');
                }
            },
            {
                time: 1,
                handPos: {
                    el: `#tab-schedules [name="end"]`
                },
                cmd: async () => {
                    await typeWriteInField('23:00','#tab-schedules [name="end"]');
                }
            },
            {
                time: 1,
                handPos: {
                    el: `#tab-schedules [name="days"]`
                },
                cmd: async () => {
                    var daysSelector = $('#tab-schedules [name="days"]');
                    daysSelector.find('option').prop('selected',false)
                    daysSelector.find('[value="0"],[value="2"],[value="4"],[value="6"]').prop('selected',true)
                }
            },
            {
                time: 2,
                handPos: {
                    el: `#tab-schedules [name="monitorStates"]`
                },
                cmd: async () => {
                    var presetSelector = $('#tab-schedules [name="monitorStates"]');
                    presetSelector.find('option').prop('selected',false)
                    presetSelector.find('[value="Motion Detection On"]').prop('selected',true)
                }
            },
            {
                time: 1,
                handPos: {
                    el: `#tab-schedules .sticky-bar [type="submit"]`
                },
                cmd: () => {
                    $('#tab-schedules form').submit();
                }
            },
            /// set schedule, motion OFF
            {
                time: 3,
                handPos: {
                    el: `#schedulesSelector`
                },
                cmd: () => {
                    $('#schedulesSelector option').prop('selected',false);
                    $('#schedulesSelector').val('').change();
                }
            },
            {
                time: 1,
                handPos: {
                    el: `#tab-schedules [name="name"]`
                },
                cmd: async () => {
                    await typeWriteInField('Motion Detection Off','#tab-schedules [name="name"]');
                }
            },
            {
                time: 1,
                handPos: {
                    el: `#tab-schedules [name="enabled"]`
                }
            },
            {
                time: 1,
                handPos: {
                    el: `#tab-schedules [name="start"]`
                },
                cmd: async () => {
                    await typeWriteInField('00:00','#tab-schedules [name="start"]');
                }
            },
            {
                time: 1,
                handPos: {
                    el: `#tab-schedules [name="end"]`
                },
                cmd: async () => {
                    await typeWriteInField('23:00','#tab-schedules [name="end"]');
                }
            },
            {
                time: 1,
                handPos: {
                    el: `#tab-schedules [name="days"]`
                },
                cmd: async () => {
                    var daysSelector = $('#tab-schedules [name="days"]');
                    daysSelector.find('option').prop('selected',false)
                    daysSelector.find('[value="1"],[value="3"],[value="5"]').prop('selected',true)
                }
            },
            {
                time: 2,
                handPos: {
                    el: `#tab-schedules [name="monitorStates"]`
                },
                cmd: async () => {
                    var presetSelector = $('#tab-schedules [name="monitorStates"]');
                    presetSelector.find('option').prop('selected',false)
                    presetSelector.find('[value="Motion Detection Off"]').prop('selected',true)
                }
            },
            {
                time: 1,
                handPos: {
                    el: `#tab-schedules .sticky-bar [type="submit"]`
                },
                cmd: () => {
                    $('#tab-schedules form').submit();
                }
            },
        ]
    },
    "create-api-key": {
        name: 'Create API Key',
        targetMonitor: false,
        playlist: [
            {
                text: 'Select the <b>API Keys</b> tab in the Main Menu.',
                time: 0,
                handPos: {
                    el: `[page-open="apiKeys"]`
                },
                cmd: () => {
                    var sideMenu = $('#menu-side')
                    var theButton = sideMenu.find('[page-open="apiKeys"]')
                    sideMenu.animate({scrollTop: sideMenu.position().top},1000);
                }
            },
            {
                time: 1,
                handPos: {
                    el: `[page-open="apiKeys"]`
                },
                cmd: () => {
                    openTab('apiKeys',{})
                }
            },
            {
                text: `Set the name for the new Preset.`,
                time: 1,
                handPos: {
                    el: `#tab-apiKeys [name="ip"]`
                },
                cmd: async () => {
                    await typeWriteInField('0.0.0.0','#tab-apiKeys [name="ip"]');
                }
            },
            {
                time: 1,
                handPos: {
                    el: `#tab-apiKeys [detail="permissions"]`
                },
                cmd: async () => {
                    var theSelector = $('#tab-apiKeys [detail="permissions"]');
                    theSelector.find('option').prop('selected',true)
                }
            },
            {
                text: `Generate the Key.`,
                time: 1,
                handPos: {
                    el: `#apiKeySectionAddNew [type="submit"]`
                },
                cmd: () => {
                    $('#apiKeySectionAddNew').submit();
                }
            },
            {
                text: `Generate the Key.`,
                time: 1,
                handPos: {
                    el: `#api_list [api_key]:nth-child(1) .copy`
                },
            },
        ]
    }
}
