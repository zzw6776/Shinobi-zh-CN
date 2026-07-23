module.exports = (s,config,lang) => {
    function parseMessageOptions(data){
        const senderName = data.senderName || config.applicationName || lang.applicationName || lang.Shinobi;
        const recipientAddress = data.recipientAddress;
        const title = data.title || data.text;
        const text = data.text;
        const monitorId = data.id || data.mid;
        const details = data.details;
        const footer = data.footer || data.subtitle;
        const time = data.time || new Date();
        return {
            senderName,
            recipientAddress,
            title,
            text,
            footer,
            time,
            monitorId,
            details,
        }
    }
    // Link that opens the Shinobi Go mobile app on the triggering monitor,
    // via the web redirect page (/app/open) so the link is clickable in
    // Discord, email clients, etc. notificationBaseUrl is resolved at startup
    // in libs/webServer.js (conf value -> baseURL -> detected machine IP); the
    // raw scheme link is only a safety net if that somehow never ran.
    function getAppDeepLink(event){
        const monitorId = event.mid || event.id;
        const query = 'ke=' + encodeURIComponent(event.ke) + '&mid=' + encodeURIComponent(monitorId);
        if(config.notificationBaseUrl){
            return config.notificationBaseUrl + 'app/open?' + query;
        }
        return 'shinobi://monitor?' + query;
    }
    return {
        parseMessageOptions,
        getAppDeepLink,
    }
}
