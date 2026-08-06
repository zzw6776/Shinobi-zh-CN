function hasOnvifEventsEnabled(monitorConfig) {
    const d = monitorConfig.details || {};
    // Accept the string '1' (normal UI save) as well as a numeric 1 — some API/DB
    // edits store these flags as numbers, and a strict === '1' would silently gate
    // ONVIF events off (1 === '1' is false).
    return String(d.is_onvif) === '1' && String(d.onvif_events) === '1';
}

module.exports = function (s, config, lang) {
    // ONVIF events use shinobi-onvif (the same library as the scanner and PTZ) via a
    // PullPoint subscription. The previous implementation used the separate `onvif`
    // package whose handshake fails ("socket hang up") on some cameras (e.g. Tapo)
    // even though shinobi-onvif talks to them fine.
    const onvif = require("shinobi-onvif");
    const soapClient = require("shinobi-onvif/lib/modules/soap.js");
    const mUrl = require('url');
    const {
        triggerEvent,
    } = require('./utils.js')(s, config, lang)

    const PULL_MESSAGES_ACTION = 'http://www.onvif.org/ver10/events/wsdl/PullPointSubscription/PullMessagesRequest';
    const UNSUBSCRIBE_ACTION = 'http://docs.oasis-open.org/wsn/bw-2/SubscriptionManager/UnsubscribeRequest';

    // Best-effort snapshot fetch via shinobi-onvif's own device.fetchSnapshot() (uses the
    // media profile's GetSnapshotUri, populated during device.init()). Returns a raw JPEG
    // Buffer - the same shape runEventExecutions()/saveImageFromEvent() already expect from
    // d.frame (it writes the buffer straight to disk via fs.writeFile, no decoding), matching
    // what s.getRawSnapshotFromMonitor() hands back as `screenShot` for the motion-frame path.
    async function fetchOnvifSnapshotFrame(device, monitorConfig) {
        if (!device) return null;

        // --- Attempt 1: fetchSnapshot() ---
        if (typeof device.fetchSnapshot === 'function') {
            try {
                const snap = await device.fetchSnapshot();
                if (snap && snap.body) {
                    // Ensure it returns a Buffer if it's not one already
                    return Buffer.isBuffer(snap.body) ? snap.body : Buffer.from(snap.body, 'binary');
                }
            } catch (err) {
                s.debugLog(`ONVIF fetchSnapshot failed for ${monitorConfig.name}, trying URI fallback...`, err);
            }
        }

        // --- Attempt 2: getSnapshotUri() + Fetch Buffer ---
        if (typeof device.getSnapshotUri === 'function') {
            try {
                const uri = device.getSnapshotUri();
                if (uri) {
                    const buffer = await fetchUriAsBuffer(uri);
                    if (buffer) return buffer;
                }
            } catch (err) {
                s.debugLog(`ONVIF getSnapshotUri fallback failed for ${monitorConfig.name}`, err);
            }
        }

        return null;
    }

    // Helper function to download an image from a URL as a Buffer
    function fetchUriAsBuffer(urlStr) {
        return new Promise((resolve) => {
            try {
                const client = urlStr.startsWith('https') ? https : http;
                client.get(urlStr, (res) => {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        return resolve(null);
                    }

                    const chunks = [];
                    res.on('data', (chunk) => chunks.push(chunk));
                    res.on('end', () => resolve(Buffer.concat(chunks)));
                    res.on('error', () => resolve(null));
                }).on('error', () => resolve(null));
            } catch (e) {
                resolve(null);
            }
        });
    }

    async function handleEvent(event, monitorConfig, onvifEventLog, callback = () => {}, device) {
        try{
            const monitorId = monitorConfig.mid;
            const groupKey = monitorConfig.ke;
            s.runExtensionsForArray('onOnvifEventTrigger', null, [event, groupKey, monitorId]);
            const message = event.message && event.message.message ? event.message.message : event.message;
            if(!message){
                console.error(`Missing Message in ONVIF Event from ${monitorConfig.name}`)
                console.error(JSON.stringify(event,null,3))
                return
            }
            if(!message.source){
                // ignore event with no source
                return;
            }
            const topicInternalName = event.topic?._;
            const sourceSimpleItem = message.source?.simpleItem;
            const sourceSelected = (sourceSimpleItem instanceof Array ? sourceSimpleItem[sourceSimpleItem.length - 1] : sourceSimpleItem)?.$;
            const dataSimpleItem = message.data?.simpleItem;
            const data = (dataSimpleItem instanceof Array ? dataSimpleItem[dataSimpleItem.length - 1] : dataSimpleItem)?.$;
            if(!sourceSelected || !data){
                return;
            }
            const topicShortName = sourceSelected.Value;
            const eventValue = data.Value;
            const eventIsInactive = (
                eventValue === false ||
                eventValue === 0 ||
                eventValue === '0' ||
                eventValue === 'false'
            );
            if(topicShortName === "Processor_Usage"){
                // ignore camera CPU stats
                return
            }else if (eventIsInactive) {
                onvifEventLog(`ONVIF Event Stopped`, `topic ${topicInternalName}`)
                return
            }
            onvifEventLog(`ONVIF Event Detected!`, `topic ${topicInternalName}`)
            const frame = await fetchOnvifSnapshotFrame(device, monitorConfig);
            callback({
                f: 'trigger',
                id: monitorId,
                ke: groupKey,
                frame: frame,
                saveFrame: true,
                details: {
                    plug: 'onvifEvent',
                    name: 'onvifEvent',
                    reason: topicInternalName,
                    confidence: 100,
                    token: topicShortName,
                    [data.Name]: eventValue
                }
            })
        }catch(err){
            console.error(`Failure to parse ONVIF Event from ${monitorConfig.name}`)
            console.error(err)
            console.error(JSON.stringify(event,null,3))
        }
    }

    // Map a shinobi-onvif PullMessages NotificationMessage (PascalCase) into the
    // shape handleEvent expects (event.topic._, event.message.message.source/data.simpleItem).
    // The per-item `$` attribute container is the same in both, so no deeper mapping is needed.
    function adaptNotification(notif) {
        const inner = (notif && notif.Message && notif.Message.Message) ? notif.Message.Message : (notif && notif.Message);
        return {
            topic: notif && notif.Topic,
            message: {
                message: {
                    source: inner && inner.Source ? { simpleItem: inner.Source.SimpleItem } : undefined,
                    data: inner && inner.Data ? { simpleItem: inner.Data.SimpleItem } : undefined,
                }
            }
        };
    }

    const subscriptions = {};

    async function createEventDevice(monitorConfig) {
        const controlBaseUrl = monitorConfig.details.control_base_url || s.buildMonitorUrl(monitorConfig, true);
        const controlURLOptions = s.cameraControlOptionsFromUrl(controlBaseUrl, monitorConfig);
        const onvifPort = parseInt(monitorConfig.details.onvif_port) || 8000;
        const device = new onvif.OnvifDevice({
            address: controlURLOptions.host + ':' + onvifPort,
            user: controlURLOptions.username,
            pass: controlURLOptions.password,
        });
        await device.init();
        return device;
    }

    // Add WS-Addressing To/Action to a subscription-manager request (PullMessages, Unsubscribe).
    function addAddressing(soap, subscriptionAddress, action) {
        const wsa = '<wsa:To s:mustUnderstand="1">' + subscriptionAddress + '</wsa:To>'
                  + '<wsa:Action s:mustUnderstand="1">' + action + '</wsa:Action>';
        return soap.replace('<s:Header>', '<s:Header>' + wsa);
    }

    function buildPullSoap(eventsService, subscriptionAddress) {
        const body = '<tev:PullMessages><tev:Timeout>PT5S</tev:Timeout><tev:MessageLimit>10</tev:MessageLimit></tev:PullMessages>';
        return addAddressing(eventsService._createRequestSoap(body), subscriptionAddress, PULL_MESSAGES_ACTION);
    }

    // Some cameras (e.g. Tapo) close an idle PullMessages long-poll with a connection
    // reset instead of returning an empty response. That is not a dead subscription —
    // it just means "no events right now", so we poll again on the same subscription.
    // Real subscription problems come back as SOAP faults, which we let re-subscribe.
    function isTransientPullError(err) {
        const m = ((err && err.message) ? err.message : String(err)).toLowerCase();
        return m.indexOf('socket hang up') > -1
            || m.indexOf('econnreset') > -1
            || m.indexOf('etimedout') > -1
            || m.indexOf('esockettimedout') > -1
            || m.indexOf('network error') > -1
            || m.indexOf('epipe') > -1;
    }

    // Best-effort release of the camera-side subscription. Cameras cap the number of
    // concurrent pull-point subscriptions, so failing to unsubscribe on stop/restart
    // leaks slots until they expire and eventually makes new subscriptions fail.
    function unsubscribe(sub) {
        if (!sub || !sub.eventsService || !sub.subscriptionAddress) return;
        try {
            const subOxaddr = mUrl.parse(sub.subscriptionAddress);
            subOxaddr.auth = sub.eventsService.user + ':' + sub.eventsService.pass;
            const body = '<Unsubscribe xmlns="http://docs.oasis-open.org/wsn/b-2"/>';
            const soap = addAddressing(sub.eventsService._createRequestSoap(body), sub.subscriptionAddress, UNSUBSCRIBE_ACTION);
            soapClient.requestCommand(subOxaddr, 'Unsubscribe', soap).catch(function () {});
        } catch (err) { /* best-effort */ }
        sub.subscriptionAddress = null;
        sub.eventsService = null;
    }

    async function runSubscription(monitorConfig, onvifEventLog, sub) {
        const triggerCallback = config.noEventTriggerForOnvifEvent ? function(){} : triggerEvent;
        const sleep = (ms) => new Promise((r) => { sub.timer = setTimeout(r, ms); });
        let backoff = 2000;
        while (!sub.stopped) {
            try {
                const device = await createEventDevice(monitorConfig);
                if (sub.stopped) return;
                const eventsService = device.services.events;
                if (!eventsService) throw new Error('device has no events service');
                const createBody = '<tev:CreatePullPointSubscription><tev:InitialTerminationTime>PT300S</tev:InitialTerminationTime></tev:CreatePullPointSubscription>';
                const createRes = await soapClient.requestCommand(eventsService.oxaddr, 'CreatePullPointSubscription', eventsService._createRequestSoap(createBody));
                const resp = (createRes.data && createRes.data.CreatePullPointSubscriptionResponse) || createRes.data || {};
                let subscriptionAddress = resp.SubscriptionReference && resp.SubscriptionReference.Address;
                if (subscriptionAddress && typeof subscriptionAddress === 'object') subscriptionAddress = subscriptionAddress._ || subscriptionAddress;
                if (!subscriptionAddress) throw new Error('no subscription address returned');
                if (sub.stopped) { sub.eventsService = eventsService; sub.subscriptionAddress = subscriptionAddress; unsubscribe(sub); return; }
                sub.eventsService = eventsService;
                sub.subscriptionAddress = subscriptionAddress;
                const subOxaddr = mUrl.parse(subscriptionAddress);
                subOxaddr.auth = eventsService.user + ':' + eventsService.pass;
                onvifEventLog('ONVIF Events Subscribed', `${monitorConfig.name}`);
                backoff = 2000;
                const subscribedAt = Date.now();
                while (!sub.stopped) {
                    // Proactively renew before the InitialTerminationTime (PT300S) expires,
                    // rather than relying on the camera to keep the subscription alive.
                    if (Date.now() - subscribedAt > 240000) break;
                    let pullRes;
                    try {
                        pullRes = await soapClient.requestCommand(subOxaddr, 'PullMessages', buildPullSoap(eventsService, subscriptionAddress));
                    } catch (pullErr) {
                        if (sub.stopped) break;
                        if (isTransientPullError(pullErr)) {
                            // idle long-poll closed by the camera: no events, poll again
                            await sleep(500);
                            continue;
                        }
                        throw pullErr; // real SOAP fault -> re-subscribe
                    }
                    if (sub.stopped) break;
                    const pr = (pullRes.data && pullRes.data.PullMessagesResponse) || pullRes.data || {};
                    let msgs = pr.NotificationMessage;
                    if (msgs) {
                        msgs = Array.isArray(msgs) ? msgs : [msgs];
                        for (const notif of msgs) {
                            if (sub.stopped) break;
                            // awaited so a batch's snapshot fetches run one at a time instead
                            // of firing several concurrent HTTP requests at the camera
                            await handleEvent(adaptNotification(notif), monitorConfig, onvifEventLog, triggerCallback, device);
                        }
                    }
                    // Pace the loop: some cameras return immediately instead of honoring the
                    // PullMessages long-poll timeout, so cap the rate to avoid a tight spin.
                    await sleep(1000);
                }
                // Left the pull loop because the subscription was stopped or is being
                // renewed: release it before looping (a stopped sub just ends the loop).
                unsubscribe(sub);
            } catch (err) {
                // The subscription may have expired or the camera may be momentarily out of
                // slots; release it (best-effort) and retry with backoff (self-heals).
                unsubscribe(sub);
                if (sub.stopped) break;
                onvifEventLog('ONVIF Event Error', (err && err.message) ? err.message : String(err));
                await sleep(backoff);
                backoff = Math.min(backoff * 2, 60000);
            }
        }
    }

    function subscriptionKey(monitorConfig) {
        return `${monitorConfig.ke}${monitorConfig.mid}`;
    }

    function startOnvifEvents(monitorConfig) {
        const key = subscriptionKey(monitorConfig);
        const onvifEventLog = function (type, data) {
            s.userLog({ ke: monitorConfig.ke, mid: monitorConfig.mid }, { type: type, msg: data });
        };
        if (!hasOnvifEventsEnabled(monitorConfig)) {
            stopOnvifEvents(monitorConfig);
            return;
        }
        if (subscriptions[key] && !subscriptions[key].stopped) {
            return; // already subscribed
        }
        const sub = { stopped: false, timer: null, eventsService: null, subscriptionAddress: null };
        subscriptions[key] = sub;
        runSubscription(monitorConfig, onvifEventLog, sub);
    }

    function stopOnvifEvents(monitorConfig) {
        const key = subscriptionKey(monitorConfig);
        const sub = subscriptions[key];
        if (sub) {
            sub.stopped = true;
            if (sub.timer) clearTimeout(sub.timer);
            unsubscribe(sub);
            delete subscriptions[key];
        }
    }

    s.onMonitorStart((monitorConfig) => { startOnvifEvents(monitorConfig); });
    if (s.onMonitorStop) s.onMonitorStop((monitorConfig) => { stopOnvifEvents(monitorConfig); });
    if (s.onMonitorDied) s.onMonitorDied((monitorConfig) => { stopOnvifEvents(monitorConfig); });

    const connectionInfoArray = s.definitions["Monitor Settings"].blocks["Detector"].info
    connectionInfoArray.splice(2, 0, {
        "name": "detail=onvif_events",
        "field": lang['ONVIF Events'],
        "default": "0",
        "selector": "h_onvif_events",
        "form-group-class": "h_onvif_input h_onvif_1",
        "fieldType": "select",
        "possible": [
            {
                "name": lang.No,
                "value": "0"
            },
            {
                "name": lang.Yes,
                "value": "1"
            }
        ]
    });
}
