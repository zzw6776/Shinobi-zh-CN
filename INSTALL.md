**Detailed Instructions for multiple Operating Systems can now be found in the docs.**

https://shinobi.video/docs/start

## conf.json Configuration Reference

Shinobi is configured through `conf.json` at the root of the install. Most of the options below can
also be edited live from the **Super User Config Editor** (`/super` &rarr; Configuration tab), which is
generated from the same list. Any option not yet listed in the Config Editor's form still works if set
directly in `conf.json` — it will just appear there as a plain, unlabeled field. Changes to `conf.json`
require a restart of Shinobi to take effect.

### Core Server

| Key | Type | Default | Description |
|---|---|---|---|
| `port` | integer | `8080` | Port the web server listens on. |
| `ip` | string | `localhost` | IP address the web server binds to. |
| `baseURL` | string | | Overrides the URL prefix when running behind a reverse proxy on a sub-path. |
| `notificationBaseUrl` | string | | Base URL used for links inside push/email notifications. Falls back to `baseURL`, then the detected machine IP. |
| `ssl` | object | | `{ key, cert, port, autoRedirect }` — enables HTTPS. |
| `useUWebsocketJs` | boolean | `true` | Use the faster uWebSockets.js engine for Socket.IO. |
| `socketIoPingTimeout` | integer | `130000` | Socket.IO ping timeout, in ms. |
| `socketIoPingInterval` | integer | `60000` | Socket.IO ping interval, in ms. |
| `socketIoMaxHttpBufferSize` | integer | `1000000` | Max Socket.IO message size, in bytes. |
| `debugLog` | boolean | `false` | Master switch for the debug log. |
| `debugLogVerbose` | boolean | `false` | Extra detail in the debug log (e.g. full SQL errors). |
| `debugLogMonitors` | boolean | `false` | Logs the ffmpeg command used to start each monitor. |
| `debugLogMonitorsVerbose` | boolean | `false` | Logs the full (not shortened) ffmpeg command line. |
| `debugLogZwave` | boolean | `false` | Debug log for the Z-Wave integration. |
| `debugHeap` | boolean | `false` | Periodically logs memory heap usage. |
| `debugMp4Frag` | boolean | `false` | Debug log for the fMP4 fragmenter used by live streaming. |
| `logCronInfo` | boolean | `false` | Logs CRON job activity. |
| `systemLog` | boolean | `true` | General system logging to console/log file. |
| `databaseLogs` | boolean | `false` | Logs every database query (very verbose). |
| `passwordType` | enum | `sha256` | `sha256` \| `sha512` \| `md5` — hashing algorithm for account passwords. |
| `passwordSalt` | string | | Salt used with the `sha512` password type. |
| `subscriptionId` | string | | Shinobi Pro subscription ID, if applicable. |
| `timezone` | string | OS timezone | Server timezone. |
| `useUTC` | boolean | `false` | Store/display timestamps in UTC instead of local time. |
| `iconURL` | string | Shinobi icon | Favicon / app icon URL. |
| `applicationName` | string | | Custom application name shown in the UI. |
| `brandingConfig` | object | | Per-domain overrides (name, icon, etc) keyed by request domain. |
| `pipeAddition` | integer | `10` | Internal buffering value used by the video pipe. |

### Database

| Key | Type | Default | Description |
|---|---|---|---|
| `databaseType` | enum | `mysql` | knex.js client identifier: `mysql` \| `mysql2` \| `pg`/`postgres`/`postgresql` \| `pgnative` \| `mssql` \| `oracledb` \| `redshift` \| `cockroachdb` \| `better-sqlite3` \| `sqlite`. Only `mysql`/`mysql2` ship as installed dependencies; other clients require installing their driver package yourself. |
| `db` | object | | `{ host, user, password, database, port }` — connection details. |
| `databasePoolMin` | integer | `0` | Minimum DB connection pool size. |
| `databasePoolMax` | integer | `10` | Maximum DB connection pool size. |

### Storage / CRON Cleanup (`cron.*`)

| Key | Type | Default | Description |
|---|---|---|---|
| `cron.enabled` | boolean | `true` | Master switch for all scheduled maintenance jobs. |
| `cron.interval` | number | `1` | How often CRON jobs run, in hours. |
| `cron.deleteOld` | boolean | `true` | Delete videos older than the account's configured retention days. |
| `cron.deleteOrphans` | boolean | `false` | Delete database video entries whose file no longer exists on disk. |
| `cron.deleteNoVideo` | boolean | `true` | Delete empty date folders with no videos in them. |
| `cron.deleteNoVideoRecursion` | boolean | `false` | Recurse into subfolders when checking for empty video folders. |
| `cron.deleteOverMax` | boolean | `true` | Purge oldest videos when an account exceeds its storage share. |
| `cron.deleteOverMaxOffset` | number | `0.9` | **Safety multiplier applied to every storage-share percentage before a purge triggers.** e.g. a 90% Video Share threshold actually purges once usage reaches `90% × 0.9 = 81%` of the storage limit. This value is not surfaced anywhere in the per-account storage settings UI — if disk usage appears to cap below the percentage a user configured, check this first. |
| `cron.deleteLogs` | boolean | `true` | Delete old system log entries. |
| `cron.deleteEvents` | boolean | `true` | Delete old event records. |
| `cron.deleteFileBins` | boolean | `true` | Delete old FileBin archive entries. |
| `cron.deleteTimelpaseFrames` | boolean | `true` | Delete old timelapse frames. *(key name has a typo in the source; must be spelled exactly this way in conf.json.)* |
| `cron.purgeTimeout` | integer | `900000` | Safety-net timeout (ms) that releases the internal purge lock if a purge run hangs. |
| `insertOrphans` | boolean | `true` | Insert videos found on disk but missing from the database. |
| `orphanedVideoCheckMax` | integer | `2` | Max orphaned videos processed per scan. |
| `orphanedMountScanTimeout` | integer | | Timeout for scanning mounted drives for orphaned videos. |
| `orphanedMountedVideoCheckMax` | integer | | Max orphaned videos processed per scan on mounted drives. |
| `deleteCorruptFiles` | boolean | `true` | Delete video files that fail integrity checks. |
| `deleteFileBinsOverMax` | boolean | `true` | Purge FileBin archives when an account exceeds its FileBin storage share. |
| `hideCloudSaveUrls` | boolean | `true` | Hide cloud-storage URLs from logs. |
| `dropTimeLapseFrames` | boolean | `false` | Disable timelapse frame capture entirely. |
| `disableAutoCompressVideos` | boolean | `false` | Disable automatic video compression. |
| `autoBuildTimelapseVideosDaily` | boolean | `false` | Automatically compile a timelapse video once per day. |
| `autoDropCache` | boolean | `false` | Periodically ask the OS to drop its disk cache (memory-constrained systems only). |
| `doCronAsWorker` | boolean | `true` | Run CRON jobs in a separate worker process instead of the main process. |
| `addStorage` | array | | Additional storage locations, each `{ name, path }`. |

### Additional Storage & FileBin

| Key | Type | Default | Description |
|---|---|---|---|
| `videosDir` | string | `./videos/` | Primary videos directory. |
| `streamDir` | string | | Directory used for live-stream temp files. |
| `binDir` | string | `./fileBin/` | FileBin archive directory. |
| `windowsTempDir` | string | | Temp directory override for Windows installs. |

### Monitor / Video Behavior

| Key | Type | Default | Description |
|---|---|---|---|
| `monitorStartQueueSize` | integer | `1` | How many monitors can start simultaneously. |
| `monitorStartQueueDelay` | number | `0.5` | Delay (seconds) between queued monitor starts. |
| `monitorStartQueueDisabled` | boolean | `false` | Disable the start queue and start all monitors at once. |
| `probeMonitorOnStart` | boolean | `true` | Probe the camera stream before starting the ffmpeg pipeline. |
| `doSnapshot` | boolean | `true` | Capture a still snapshot when a monitor starts. |
| `oldPowerVideo` | boolean | `false` | Use the legacy video-power-management behavior. |
| `wallClockTimestampAsDefault` | boolean | `true` | Use wall-clock timestamps by default for recordings. |
| `defaultMjpeg` | string | | Default MJPEG stream mode. |
| `restart.onVideoNotExist` | boolean | `true` | Restart a monitor if its expected video file goes missing. |
| `liveJpegApiEnabled` | boolean | `true` | Enables the `/jpeg` live-snapshot API endpoint. |
| `maxJpegChunkPieces` | integer | | Max chunks used when streaming large JPEGs. |
| `detectorCommandEnabled` | boolean | `true` | Allow detector plugins to receive command-line instructions. |
| `detectorMergePamRegionTriggers` | boolean | `true` | Merge overlapping PAM detector region triggers into one event. |
| `detectorPluginsCluster` | boolean | `false` | Balance detector plugin load across instances by CPU usage. |
| `clusterBasedOnGpu` | boolean | `false` | Balance detector plugin load by GPU usage instead. |
| `clusterUseBasicFrameCount` | boolean | `true` | Use a simple frame-count heuristic for clustering. |
| `sendDetectionDataWithoutTrigger` | boolean | `false` | Send raw detection data even when it doesn't cross a trigger threshold. |
| `noEventTriggerForOnvifEvent` | boolean | `false` | Don't create an event when an ONVIF device event fires. |
| `noEventBasedRecordingMaps` | boolean | `false` | Disable event-based recording map generation. |
| `noDefaultRecordingSegmentFormatOptions` | boolean | `false` | Skip the default ffmpeg segment-format flags. |
| `peopleTags` | array | `["person","Person","Man","Woman","Boy","Girl"]` | Object labels treated as a "person" for tagging/icon purposes. |
| `disableSSRFSelfTargetFilter` | boolean | `false` | Disables the filter that blocks camera/plugin URLs from targeting the Shinobi server itself. Security-sensitive; leave off unless you understand the risk. |
| `enableFaceManager` | boolean | `false` | Enables the Face Manager feature. |

### Binaries & Daemons

| Key | Type | Default | Description |
|---|---|---|---|
| `ffmpegDir` | string | auto-detected | Full path to the ffmpeg executable. |
| `ffmpegBinary` | string | | Alias for `ffmpegDir`; if set, it overrides `ffmpegDir`. |
| `ffbinariesVersion` | string | | Version of ffmpeg to fetch when auto-downloading binaries. |
| `monitorDaemonPath` | string | built-in | Override path to the per-monitor worker script. |
| `monitorDetectorDaemonPath` | string | built-in | Override path to the per-monitor detector script. |
| `cpuUsageMarker` | string | `%Cpu` | Text marker used to parse CPU usage from the `top` command output. |
| `customCpuCommand` | string | | Custom shell command used to read CPU usage instead of `top`. |

### Login & Authentication

| Key | Type | Default | Description |
|---|---|---|---|
| `showLoginTypeSelector` | boolean | `true` | Show the login-method selector on the login page. |
| `allowGoogleSignOn` | boolean | `false` | Enable "Sign in with Google". |
| `appIdGoogleSignIn` | string | | Google OAuth App/Client ID. |
| `allowLdapSignOn` | boolean | `false` | Enable LDAP-based sign-on. |
| `allowBindingAltLoginsFromLoginPage` | boolean | `false` | Allow linking a Google/LDAP identity to an existing account from the login page. |
| `allowSpammingViaEmail` | boolean | `false` | Disables the normal cooldown between account emails (password resets, etc). Not recommended. |
| `superUserLoginDisabled` | boolean | `false` | Blocks `/super` login entirely. Irreversible from the UI once set — only enable if superuser access is managed another way. |
| `staticUsers` | array | | Admin accounts (`{ mail, pass }`) automatically created/verified on every startup. |

### FTP Drop-In Event Server

| Key | Type | Default | Description |
|---|---|---|---|
| `ftpServer` | boolean | `false` | Enables a local FTP server that turns uploaded files into events (for cameras that only support FTP-on-motion). |
| `ftpServerPort` | integer | `21` | FTP server port. |
| `ftpServerUrl` | string | `ftp://0.0.0.0:{port}` | Advertised FTP URL. |
| `ftpServerPasvUrl` | string | derived from `ftpServerUrl` | Passive-mode FTP URL. |
| `ftpServerPasvMinPort` | integer | `10050` | Passive mode port range start. |
| `ftpServerPasvMaxPort` | integer | `10100` | Passive mode port range end. |

### SMTP Drop-In Event Server

| Key | Type | Default | Description |
|---|---|---|---|
| `smtpServer` | boolean | `false` | Enables a local SMTP server that turns received emails into events. |
| `smtpServerPort` | integer | `465`/`25` | Defaults to 465 with SSL enabled, else 25. |
| `smtpServerHideStartTls` | boolean | `false` | Hides the STARTTLS capability advertisement. |
| `smtpServerLog` | boolean | `false` | Logs SMTP server activity. |
| `smtpServerOptions` | object | | Raw options passed through to the underlying SMTP server library. |
| `smtpServerSsl` | object | | `{ enabled, key, cert }`. |

### Video Drop-In Server

| Key | Type | Default | Description |
|---|---|---|---|
| `videoDropInServer` | boolean | `false` | Enables a separate FTP server for dropping in pre-recorded video files. |
| `videoDropInServerPort` | integer | `420` | Port for the video drop-in FTP server. |
| `videoDropInServerUrl` | string | `ftp://0.0.0.0:{port}` | Advertised URL for the video drop-in server. |

### Generic Drop-In Events / MQTT

| Key | Type | Default | Description |
|---|---|---|---|
| `dropInEventServer` | boolean | `false` | Master switch for the generic drop-in event pipeline (FTP/SMTP/MQTT feed into this). |
| `dropInEventForceSaveEvent` | boolean | `true` | Always save an event/video for drop-in triggers, ignoring monitor detector settings. |
| `dropInEventDeleteFileAfterTrigger` | boolean | `true` | Delete the source file after it's processed into an event. |
| `dropInEventsDir` | string | `streams/dropInEvents/` | Directory used to stage drop-in event files. |
| `mqttClient` | boolean | `false` | Connect to an MQTT broker so monitors can be triggered by / publish to MQTT topics. |
| `mqttEventForceSaveEvent` | boolean | `true` | Always save an event for MQTT-triggered triggers. |

### RTMP Server

| Key | Type | Default | Description |
|---|---|---|---|
| `rtmpServer` | boolean | `false` | Enables Shinobi's built-in RTMP ingest/relay server. |
| `rtmp` | object | | `{ port(1935), chunk_size, gop_cache, ping, ping_timeout }`. |
| `auth` | object | | `{ play, publish, secret }` — auth requirements for RTMP play/publish streams. |

### Remote Access / Shinobi Cloud (P2P)

| Key | Type | Default | Description |
|---|---|---|---|
| `p2pEnabled` | boolean | `false` | Enables the Shinobi Cloud remote-access connection. |
| `useBetterP2P` | boolean | `true` | Use the newer P2P networking implementation. |
| `p2pApiKey` | string | | API key for the P2P relay account. |
| `p2pHostSelected` | string | `paris-1` / `paris-1-v2` | Selected P2P relay host. |
| `p2pHostMultiSelected` | array | | Multiple selected P2P relay hosts. |
| `p2pServerList` | array | | Custom list of P2P relay servers, overriding the default list. |
| `p2pShellAccess` | boolean | `false` | Allows the P2P connection to open a remote terminal shell on this machine. Only enable if you trust the paired account. |
| `p2pAllowNetworkAccess` | boolean | `false` | Allows remote network access (port forwarding-like) via the P2P connection. |
| `p2pRestrictedTo` | string | | Restricts P2P access to a specific target. |

### Failover & Central Management Cluster

| Key | Type | Default | Description |
|---|---|---|---|
| `isFailover` | boolean | `false` | Marks this server as a Failover Server for another Shinobi instance. |
| `failoverConnectionKeys` | array | | Keys that normal servers use to authenticate to this failover server. |
| `failoverServers` | array | | List of failover servers this (normal) server can connect to. |
| `failoverAllowCloudUploaders` | boolean | `false` | Allow cloud uploads to continue while running in failover mode. |
| `logFailoverActivity` | boolean | `false` | Log failover connection activity. |
| `enableMgmtConnect` | boolean | `false` | Enables Central Management connectivity. |
| `mgmtServers` | object | | Map of Central Management servers this instance reports to. |
| `peerConnectKey` | string | | Auth key used when pairing with a Central Management server. |
| `pairPort` | integer | | Port used during the Central Management pairing handshake. |
| `noCentralSsh` | boolean | `false` | Disable SSH access from the Central Management server. |
| `saveLogsInCentral` | boolean | `false` | Forward local logs to the Central Management server. |
| `autoRestartManagementConnectionInterval` | integer | | If set, periodically restarts the Central Management connection at this interval (ms). |
| `logCentralManagementActivity` | boolean | `false` | Log Central Management connection activity. |
| `logCpuAndRamDangerZone` | boolean | `false` | Log when CPU/RAM usage crosses critical thresholds (reported to Central Management). |

### Child Nodes (distributed processing)

| Key | Type | Default | Description |
|---|---|---|---|
| `childNodes.enabled` | boolean | `false` | Enables distributing camera processing across multiple machines. |
| `childNodes.mode` | enum | `master` | `master` \| `child`. |
| `childNodes.host` | string | | Address of the master node (set on child nodes only). |
| `childNodes.ip` | string | | Bind IP for this node's child-node listener. |
| `childNodes.port` | integer | `8288` | Child node communication port. |
| `childNodes.key` | string | random | Shared auth key between master and child nodes. |
| `childNodes.masterDoWorkToo` | boolean | `false` | Let the master node also process cameras, not just coordinate. |
| `childNodes.maxCpuPercent` | integer | `75` | CPU % threshold used when assigning work to a child node. |
| `childNodes.maxRamPercent` | integer | `75` | RAM % threshold used when assigning work to a child node. |

### Cloud Uploaders (global credentials)

| Key | Type | Default | Description |
|---|---|---|---|
| `cloudUploaders.AmazonS3` | object | | Shared Amazon S3 credentials sub-accounts can opt into. |
| `cloudUploaders.BackblazeB2` | object | | Shared Backblaze B2 credentials. |
| `cloudUploaders.GoogleDrive` | object | | Shared Google Drive credentials. |
| `cloudUploaders.WasabiHotCloudStorage` | object | | Shared Wasabi credentials. |
| `cloudUploaders.WebDAV` | object | | Shared WebDAV credentials. |
| `cloudUploaders.mountedDrive` | object | | Shared mounted-drive target. |

### Notifications

| Key | Type | Default | Description |
|---|---|---|---|
| `fcm` | boolean | `true` | Firebase Cloud Messaging push notifications to the Shinobi mobile apps. |
| `pushover` | boolean | `false` | Enable Pushover notifications. |
| `discordBot` | boolean | `false` | Enable the Discord notification bot. |
| `telegramBot` | boolean | `false` | Enable the Telegram notification bot. |
| `matrixBot` | boolean | `false` | Enable the Matrix notification bot. |
| `pushRelayApiKey` / `pushRelayUrl` | string | | Credentials/endpoint for a custom push relay service. |

### Plugins

| Key | Type | Default | Description |
|---|---|---|---|
| `plugins` | array | | Detector/other plugin connections: `{ plug, key, mode(host\|client), https, host, port, type }`. |
| `pluginKeys` | object | | Auth keys for plugins connecting in `host` mode. |

### Misc / Integrations

| Key | Type | Default | Description |
|---|---|---|---|
| `alarmManagement` | boolean | `false` | Enables the Alarm Management panel/webhook block. |
| `shinobiHubEndpoint` | string | `https://hub.shinobi.video/` | Endpoint for the Shinobi Hub config-backup service. |
| `shinobiHubAutoBackup` | boolean | `false` | Automatically back up configuration to Shinobi Hub. |
| `shinobiHubApiKey` | string | | Shinobi Hub API key. |
| `easyRemotePort` | integer | *The Port Shinobi is running on* | Port used by the "Easy Remote" quick-connect worker. |
| `webDavUpload` | boolean | `false` | Enables WebDAV as an upload target option. |
| `safeMode` | boolean | `false` | Starts Shinobi in a reduced-feature safe mode for recovery/troubleshooting. |

### Advanced / Internal (rarely edited by hand)

These are set automatically at startup and only need manual overrides in unusual deployments. They are
intentionally left out of the Super User Config Editor form to avoid accidental breakage, but they are
still valid `conf.json` keys:

| Key | Description |
|---|---|
| `webPaths.*` | URL path prefixes (`home`, `admin`, `super`, `libs`, `apiPrefix`, `adminApiPrefix`, `superApiPrefix`). |
| `renderPaths.*` | Server-side template names for each page (login, dashboard, admin, super, etc). |
| `bindip` | Derived from `ip`; the actual address the HTTP server binds to. Left unset (bind all interfaces) when `ip` is empty, `0.0.0.0`, or `localhost`. Set `ip` to `127.0.0.1` for a loopback-only bind. |
| `availableHWAccels` | Hardware acceleration methods detected on this machine. |
| `timeZones` | Static list used to populate timezone dropdowns in the UI. |
| `webBlocksPreloaded` | Which dashboard "web blocks" (widgets) are preloaded on login. |
| `sslEnabled` | Computed at startup based on whether `ssl` is valid; not meant to be set directly. |

---

**Note on storage purge behavior**: the percentage-based storage limits configured per-account
(Video/Timelapse/FileBin share) are all discounted by `cron.deleteOverMaxOffset` (default `0.9`) before
a purge is triggered. If disk usage plateaus below the percentage you configured, check that value —
see the Storage / CRON Cleanup section above.
