$(document).ready(function () {
  var schema = {
    "title": lang["Main Configuration"],
    "type": "object",
    "properties": {
      "isFailover": {
        "title": lang["Enable as Failover Server"],
        "type": "boolean",
        "default": false
      },
      "logCpuAndRamDangerZone": {
        "title": lang["Enable Critical CPU and RAM Logging"],
        "type": "boolean",
        "default": false
      },
      "logFailoverActivity": {
        "title": lang["Enable Failover Status Logging"],
        "type": "boolean",
        "default": false
      },
      "logCentralManagementActivity": {
        "title": lang["Enable Central Management Status Logging"],
        "type": "boolean",
        "default": false
      },
      "failoverAllowCloudUploaders": {
        "title": lang["Enable Failover Cloud Uploads"],
        "type": "boolean",
        "default": false
      },
      "monitorStartQueueSize": {
        "title": lang["Simultaneous Monitor Start"],
        "type": "integer",
        "default": 1
      },
      "monitorStartQueueDelay": {
        "title": lang["Monitor Start Delay"],
        "type": "number",
        "default": 0.5
      },
      "debugLog": {
        "title": lang["Enable Debug Log"],
        "type": "boolean",
        "default": false
      },
      "debugLogVerbose": {
        "title": lang["debugLogVerbose"],
        "type": "boolean",
        "description": lang["debugLogVerboseDes"],
        "default": false
      },
      "debugLogMonitors": {
        "title": lang["debugLogMonitors"],
        "type": "boolean",
        "description": lang["debugLogMonitorsDes"],
        "default": false
      },
      "debugLogMonitorsVerbose": {
        "title": lang["debugLogMonitorsVerbose"],
        "type": "boolean",
        "description": lang["debugLogMonitorsVerboseDes"],
        "default": false
      },
      "debugLogZwave": {
        "title": lang["debugLogZwave"],
        "type": "boolean",
        "default": false
      },
      "debugHeap": {
        "title": lang["debugHeap"],
        "type": "boolean",
        "description": lang["debugHeapDes"],
        "default": false
      },
      "debugMp4Frag": {
        "title": lang["debugMp4Frag"],
        "type": "boolean",
        "default": false
      },
      "logCronInfo": {
        "title": lang["logCronInfo"],
        "type": "boolean",
        "default": false
      },
      "systemLog": {
        "title": lang["systemLog"],
        "type": "boolean",
        "description": lang["systemLogDes"],
        "default": true
      },
      "databaseLogs": {
        "title": lang["databaseLogs"],
        "type": "boolean",
        "description": lang["databaseLogsDes"],
        "default": false
      },
      "subscriptionId": {
        "title": lang["Fill in subscription ID"],
        "type": "string",
        "default": null
      },
      "port": {
        "title": lang["Server port"],
        "type": "integer",
        "default": 8080
      },
      "passwordType": {
        "title": lang["Password type"],
        "type": "string",
        "enum": [
          "sha256",
          "sha512",
          "md5"
        ],
        "default": "sha256"
      },
      "ip": {
        "title": lang["ip"],
        "type": "string",
        "description": lang["ipDes"],
        "default": "localhost"
      },
      "baseURL": {
        "title": lang["baseURL"],
        "type": "string",
        "description": lang["baseURLDes"]
      },
      "notificationBaseUrl": {
        "title": lang["notificationBaseUrl"],
        "type": "string",
        "description": lang["notificationBaseUrlDes"]
      },
      "ssl": {
        "type": "object",
        "format": "table",
        "title": lang["ssl"],
        "description": lang["sslDes"],
        "properties": {
          "key": {
            "title": lang["sslKey"],
            "type": "string"
          },
          "cert": {
            "title": lang["sslCert"],
            "type": "string"
          },
          "port": {
            "title": lang["Port"],
            "type": "integer",
            "default": 443
          },
          "autoRedirect": {
            "title": lang["sslAutoRedirect"],
            "type": "boolean",
            "default": false
          }
        }
      },
      "socketIoPingTimeout": {
        "title": lang["socketIoPingTimeout"],
        "type": "integer",
        "default": 130000
      },
      "socketIoPingInterval": {
        "title": lang["socketIoPingInterval"],
        "type": "integer",
        "default": 60000
      },
      "socketIoMaxHttpBufferSize": {
        "title": lang["socketIoMaxHttpBufferSize"],
        "type": "integer",
        "default": 1000000
      },
      "useUWebsocketJs": {
        "title": lang["useUWebsocketJs"],
        "type": "boolean",
        "default": true
      },
      "databaseType": {
        "title": lang["databaseType"],
        "type": "string",
        "enum": [
          "mysql",
          "mysql2",
          "pg",
          "postgres",
          "postgresql",
          "pgnative",
          "mssql",
          "oracledb",
          "redshift",
          "cockroachdb",
          "better-sqlite3",
          "sqlite"
        ],
        "default": "mysql"
      },
      "databasePoolMin": {
        "title": lang["databasePoolMin"],
        "type": "integer",
        "default": 0
      },
      "databasePoolMax": {
        "title": lang["databasePoolMax"],
        "type": "integer",
        "default": 10
      },
      "addStorage": {
        "type": "array",
        "format": "table",
        "title": lang["Additional Storage"],
        "description": lang["AdditionalStorageDes"],
        "uniqueItems": true,
        "items": {
          "type": "object",
          "title": lang["Storage Array"],
          "properties": {
            "name": {
              "type": "string",
            },
            "path": {
              "type": "string",
              "default": "__DIR__/videos2"
            }
          }
        },
        "default": [
          {
            "name": "second",
            "path": "__DIR__/videos2"
          }
        ]
      },
      "plugins": {
        "type": "array",
        "format": "table",
        "title": lang["Plugins"],
        "descripton": lang["PluginsDes"],
        "uniqueItems": true,
        "items": {
          "type": "object",
          "title": lang["Plugin"],
          "properties": {
            "plug": {
              "title": lang["Plug"],
              "type": "string",
              "default": "pluginName"
            },
            "key": {
              "title": lang["Key"],
              "type": "string"
            },
            "mode": {
              "title": lang["Mode"],
              "type": "string",
              "enum": [
                "host",
                "client"
              ],
              "default": "client"
            },
            "https": {
              "title": lang["Https"],
              "type": "boolean",
              "descripton": "Only for Host mode.",
              "default": false
            },
            "host": {
              "title": lang["Host"],
              "type": "string",
              "descripton": "Only for Host mode.",
              "default": "localhost"
            },
            "port": {
              "title": lang["Port"],
              "type": "integer",
              "descripton": "Only for Host mode.",
              "default": 8082
            },
            "type": {
              "title": lang["Type"],
              "type": "string",
              "default": "detector"
            }
          }
        }
      },
      "pluginKeys": {
        "type": "object",
        "format": "table",
        "title": lang["Plugin Keys"],
        "description": lang["PluginKeysDes"],
        "uniqueItems": true,
        "items": {
          "type": "object",
          "title": "Plugin Key",
          "properties": {}
        }
      },
      "db": {
        "type": "object",
        "format": "table",
        "title": lang["Database Options"],
        "description": lang["DatabaseOptionDes"],
        "properties": {
          "host": {
            "title": lang["Hostname / IP"],
            "type": "string",
            "default": "127.0.0.1"
          },
          "user": {
            "title": lang["User"],
            "type": "string",
            "default": "majesticflame"
          },
          "password": {
            "title": lang["Password"],
            "type": "string",
            "default": ""
          },
          "database": {
            "title": lang["Database"],
            "type": "string",
            "default": "ccio"
          },
          "port": {
            "title": lang["Port"],
            "type": "integer",
            "default": 3306
          }
        },
        "default": {
          "host": "127.0.0.1",
          "user": "majesticflame",
          "password": "",
          "database": "ccio",
          "port": 3306
        }
      },
      "cron": {
        "type": "object",
        "format": "table",
        "title": lang["CRON Options"],
        "properties": {
          "key": {
            "type": "string",
          },
          "enabled": {
            "title": lang["cronEnabled"],
            "type": "boolean",
            "description": lang["cronEnabledDes"],
            "default": true
          },
          "interval": {
            "title": lang["cronInterval"],
            "type": "number",
            "description": lang["cronIntervalDes"],
            "default": 1
          },
          "deleteOld": {
            "title": lang["deleteOld"],
            "type": "boolean",
            "description": lang["deleteOldDes"],
            "default": true
          },
          "deleteOrphans": {
            "title": lang["deleteOrphans"],
            "type": "boolean",
            "description": lang["deleteOrphansDes"],
            "default": false
          },
          "deleteNoVideo": {
            "title": lang["deleteNoVideo"],
            "type": "boolean",
            "description": lang["deleteNoVideoDes"],
            "default": true
          },
          "deleteNoVideoRecursion": {
            "title": lang["deleteNoVideoRecursion"],
            "type": "boolean",
            "description": lang["deleteNoVideoRecursionDes"],
            "default": false
          },
          "deleteOverMax": {
            "title": lang["deleteOverMax"],
            "type": "boolean",
            "description": lang["deleteOverMaxDes"],
            "default": true
          },
          "deleteOverMaxOffset": {
            "title": lang["deleteOverMaxOffset"],
            "type": "number",
            "description": lang["deleteOverMaxOffsetDes"],
            "default": 0.9
          },
          "deleteLogs": {
            "title": lang["deleteLogs"],
            "type": "boolean",
            "description": lang["deleteLogsDes"],
            "default": true
          },
          "deleteEvents": {
            "title": lang["deleteEvents"],
            "type": "boolean",
            "description": lang["deleteEventsDes"],
            "default": true
          },
          "deleteFileBins": {
            "title": lang["deleteFileBins"],
            "type": "boolean",
            "description": lang["deleteFileBinsDes"],
            "default": true
          },
          "deleteTimelpaseFrames": {
            "title": lang["deleteTimelpaseFrames"],
            "type": "boolean",
            "description": lang["deleteTimelpaseFramesDes"],
            "default": true
          },
          "purgeTimeout": {
            "title": lang["purgeTimeout"],
            "type": "integer",
            "description": lang["purgeTimeoutDes"],
            "default": 900000
          },
        }
      },
      "detectorMergePamRegionTriggers": {
        "title": lang["detectorMergePamRegionTriggers"],
        "type": "boolean",
        "default": true
      },
      "doSnapshot": {
        "title": lang["doSnapshot"],
        "type": "boolean",
        "default": true
      },
      "discordBot": {
        "title": lang["discordBot"],
        "type": "boolean",
        "default": false
      },
      "dropInEventServer": {
        "title": lang["dropInEventServer"],
        "type": "boolean",
        "default": false
      },
      "ftpServer": {
        "title": lang["ftpServer"],
        "type": "boolean",
        "default": false
      },
      "oldPowerVideo": {
        "title": lang["oldPowerVideo"],
        "type": "boolean",
        "default": false
      },
      "wallClockTimestampAsDefault": {
        "title": lang["wallClockTimestampAsDefault"],
        "type": "boolean",
        "default": true
      },
      "defaultMjpeg": {
        "title": lang["defaultMjpeg"],
        "type": "string",
      },
      "streamDir": {
        "title": lang["streamDir"],
        "type": "string",
      },
      "videosDir": {
        "title": lang["videosDir"],
        "type": "string",
      },
      "windowsTempDir": {
        "title": lang["windowsTempDir"],
        "type": "string",
      },
      "enableFaceManager": {
        "type": "boolean",
        "default": false,
        "title": lang["Enable Face Manager"],
        "description": lang["enableFaceManagerDes"]
      },
      "disableSSRFSelfTargetFilter": {
        "type": "boolean",
        "default": false,
        "title": lang["Disable SSRF Self-Target Filter"],
        "description": lang["disableSSRFSelfTargetFilterDes"]
      },
      "useBetterP2P": {
        "title": lang["useBetterP2P"],
        "type": "boolean",
        "default": true
      },
      "p2pEnabled": {
        "title": lang["p2pEnabled"],
        "type": "boolean",
        "default": false
      },
      "p2pApiKey": {
        "title": lang["p2pApiKey"],
        "type": "string"
      },
      "p2pHostSelected": {
        "title": lang["p2pHostSelected"],
        "type": "string"
      },
      "p2pHostMultiSelected": {
        "type": "array",
        "format": "table",
        "title": lang["p2pHostMultiSelected"],
        "items": {
          "type": "string"
        }
      },
      "p2pServerList": {
        "type": "array",
        "format": "table",
        "title": lang["p2pServerList"],
        "description": lang["p2pServerListDes"],
        "items": {
          "type": "string"
        }
      },
      "p2pShellAccess": {
        "title": lang["p2pShellAccess"],
        "type": "boolean",
        "description": lang["p2pShellAccessDes"],
        "default": false
      },
      "p2pAllowNetworkAccess": {
        "title": lang["p2pAllowNetworkAccess"],
        "type": "boolean",
        "default": false
      },
      "p2pRestrictedTo": {
        "title": lang["p2pRestrictedTo"],
        "type": "string"
      },
      "ftpServerPort": {
        "title": lang["ftpServerPort"],
        "type": "integer",
        "default": 21
      },
      "ftpServerUrl": {
        "title": lang["ftpServerUrl"],
        "type": "string",
        "description": lang["ftpServerUrlDes"]
      },
      "ftpServerPasvUrl": {
        "title": lang["ftpServerPasvUrl"],
        "type": "string"
      },
      "ftpServerPasvMinPort": {
        "title": lang["ftpServerPasvMinPort"],
        "type": "integer",
        "default": 10050
      },
      "ftpServerPasvMaxPort": {
        "title": lang["ftpServerPasvMaxPort"],
        "type": "integer",
        "default": 10100
      },
      "smtpServer": {
        "title": lang["smtpServer"],
        "type": "boolean",
        "description": lang["smtpServerDes"],
        "default": false
      },
      "smtpServerPort": {
        "title": lang["smtpServerPort"],
        "type": "integer",
        "description": lang["smtpServerPortDes"]
      },
      "smtpServerHideStartTls": {
        "title": lang["smtpServerHideStartTls"],
        "type": "boolean",
        "default": false
      },
      "smtpServerLog": {
        "title": lang["smtpServerLog"],
        "type": "boolean",
        "default": false
      },
      "smtpServerOptions": {
        "type": "object",
        "format": "table",
        "title": lang["smtpServerOptions"],
        "description": lang["smtpServerOptionsDes"],
        "properties": {}
      },
      "smtpServerSsl": {
        "type": "object",
        "format": "table",
        "title": lang["smtpServerSsl"],
        "properties": {
          "enabled": {
            "title": lang["Enabled"],
            "type": "boolean",
            "default": false
          },
          "key": {
            "title": lang["sslKey"],
            "type": "string"
          },
          "cert": {
            "title": lang["sslCert"],
            "type": "string"
          }
        }
      },
      "videoDropInServer": {
        "title": lang["videoDropInServer"],
        "type": "boolean",
        "description": lang["videoDropInServerDes"],
        "default": false
      },
      "videoDropInServerPort": {
        "title": lang["videoDropInServerPort"],
        "type": "integer",
        "default": 420
      },
      "videoDropInServerUrl": {
        "title": lang["videoDropInServerUrl"],
        "type": "string"
      },
      "dropInEventForceSaveEvent": {
        "title": lang["dropInEventForceSaveEvent"],
        "type": "boolean",
        "description": lang["dropInEventForceSaveEventDes"],
        "default": true
      },
      "dropInEventDeleteFileAfterTrigger": {
        "title": lang["dropInEventDeleteFileAfterTrigger"],
        "type": "boolean",
        "default": true
      },
      "dropInEventsDir": {
        "title": lang["dropInEventsDir"],
        "type": "string"
      },
      "mqttClient": {
        "title": lang["mqttClient"],
        "type": "boolean",
        "description": lang["mqttClientDes"],
        "default": false
      },
      "mqttEventForceSaveEvent": {
        "title": lang["mqttEventForceSaveEvent"],
        "type": "boolean",
        "default": true
      },
      "rtmpServer": {
        "title": lang["rtmpServer"],
        "type": "boolean",
        "description": lang["rtmpServerDes"],
        "default": false
      },
      "rtmp": {
        "type": "object",
        "format": "table",
        "title": lang["rtmp"],
        "properties": {
          "port": {
            "title": lang["Port"],
            "type": "integer",
            "default": 1935
          },
          "chunk_size": {
            "title": lang["rtmpChunkSize"],
            "type": "integer",
            "default": 60000
          },
          "gop_cache": {
            "title": lang["rtmpGopCache"],
            "type": "boolean",
            "default": true
          },
          "ping": {
            "title": lang["rtmpPing"],
            "type": "integer",
            "default": 60
          },
          "ping_timeout": {
            "title": lang["rtmpPingTimeout"],
            "type": "integer",
            "default": 30
          }
        }
      },
      "auth": {
        "type": "object",
        "format": "table",
        "title": lang["rtmpAuth"],
        "description": lang["rtmpAuthDes"],
        "properties": {
          "play": {
            "title": lang["rtmpAuthPlay"],
            "type": "boolean",
            "default": false
          },
          "publish": {
            "title": lang["rtmpAuthPublish"],
            "type": "boolean",
            "default": false
          },
          "secret": {
            "title": lang["rtmpAuthSecret"],
            "type": "string"
          }
        }
      },
      "mgmtServers": {
        "type": "object",
        "format": "table",
        "title": lang["mgmtServers"],
        "properties": {}
      },
      "enableMgmtConnect": {
        "title": lang["enableMgmtConnect"],
        "type": "boolean",
        "default": false
      },
      "peerConnectKey": {
        "title": lang["peerConnectKey"],
        "type": "string"
      },
      "pairPort": {
        "title": lang["pairPort"],
        "type": "integer"
      },
      "noCentralSsh": {
        "title": lang["noCentralSsh"],
        "type": "boolean",
        "default": false
      },
      "saveLogsInCentral": {
        "title": lang["saveLogsInCentral"],
        "type": "boolean",
        "default": false
      },
      "autoRestartManagementConnectionInterval": {
        "title": lang["autoRestartManagementConnectionInterval"],
        "type": "integer",
        "description": lang["autoRestartManagementConnectionIntervalDes"]
      },
      "failoverConnectionKeys": {
        "type": "array",
        "format": "table",
        "title": lang["failoverConnectionKeys"],
        "items": {
          "type": "string"
        }
      },
      "failoverServers": {
        "type": "array",
        "format": "table",
        "title": lang["failoverServers"],
        "items": {
          "type": "string"
        }
      },
      "childNodes": {
        "type": "object",
        "format": "table",
        "title": lang["childNodes"],
        "description": lang["childNodesDes"],
        "properties": {
          "enabled": {
            "title": lang["Enabled"],
            "type": "boolean",
            "default": false
          },
          "mode": {
            "title": lang["Mode"],
            "type": "string",
            "enum": [
              "master",
              "child"
            ],
            "default": "master"
          },
          "host": {
            "title": lang["childNodesHost"],
            "type": "string",
            "description": lang["childNodesHostDes"]
          },
          "ip": {
            "title": lang["childNodesIp"],
            "type": "string"
          },
          "port": {
            "title": lang["Port"],
            "type": "integer",
            "default": 8288
          },
          "key": {
            "title": lang["Key"],
            "type": "string"
          },
          "masterDoWorkToo": {
            "title": lang["childNodesMasterDoWorkToo"],
            "type": "boolean",
            "default": false
          },
          "maxCpuPercent": {
            "title": lang["childNodesMaxCpuPercent"],
            "type": "integer",
            "default": 75
          },
          "maxRamPercent": {
            "title": lang["childNodesMaxRamPercent"],
            "type": "integer",
            "default": 75
          }
        }
      },
      "cloudUploaders": {
        "type": "object",
        "format": "table",
        "title": lang["cloudUploaders"],
        "description": lang["cloudUploadersDes"],
        "properties": {}
      },
      "allowGoogleSignOn": {
        "title": lang["allowGoogleSignOn"],
        "type": "boolean",
        "default": false
      },
      "appIdGoogleSignIn": {
        "title": lang["appIdGoogleSignIn"],
        "type": "string"
      },
      "allowLdapSignOn": {
        "title": lang["allowLdapSignOn"],
        "type": "boolean",
        "default": false
      },
      "allowBindingAltLoginsFromLoginPage": {
        "title": lang["allowBindingAltLoginsFromLoginPage"],
        "type": "boolean",
        "default": false
      },
      "allowSpammingViaEmail": {
        "title": lang["allowSpammingViaEmail"],
        "type": "boolean",
        "description": lang["allowSpammingViaEmailDes"],
        "default": false
      },
      "showLoginTypeSelector": {
        "title": lang["showLoginTypeSelector"],
        "type": "boolean",
        "default": true
      },
      "superUserLoginDisabled": {
        "title": lang["superUserLoginDisabled"],
        "type": "boolean",
        "description": lang["superUserLoginDisabledDes"],
        "default": false
      },
      "passwordSalt": {
        "title": lang["passwordSalt"],
        "type": "string",
        "description": lang["passwordSaltDes"]
      },
      "staticUsers": {
        "type": "array",
        "format": "table",
        "title": lang["staticUsers"],
        "description": lang["staticUsersDes"],
        "uniqueItems": true,
        "items": {
          "type": "object",
          "title": lang["staticUser"],
          "properties": {
            "mail": {
              "title": lang["Email"],
              "type": "string"
            },
            "pass": {
              "title": lang["Password"],
              "type": "string"
            }
          }
        }
      },
      "telegramBot": {
        "title": lang["telegramBot"],
        "type": "boolean",
        "default": false
      },
      "matrixBot": {
        "title": lang["matrixBot"],
        "type": "boolean",
        "default": false
      },
      "pushover": {
        "title": lang["pushover"],
        "type": "boolean",
        "default": false
      },
      "fcm": {
        "title": lang["fcm"],
        "type": "boolean",
        "description": lang["fcmDes"],
        "default": true
      },
      "detectorCommandEnabled": {
        "title": lang["detectorCommandEnabled"],
        "type": "boolean",
        "default": true
      },
      "detectorPluginsCluster": {
        "title": lang["detectorPluginsCluster"],
        "type": "boolean",
        "description": lang["detectorPluginsClusterDes"],
        "default": false
      },
      "clusterBasedOnGpu": {
        "title": lang["clusterBasedOnGpu"],
        "type": "boolean",
        "default": false
      },
      "clusterUseBasicFrameCount": {
        "title": lang["clusterUseBasicFrameCount"],
        "type": "boolean",
        "default": true
      },
      "sendDetectionDataWithoutTrigger": {
        "title": lang["sendDetectionDataWithoutTrigger"],
        "type": "boolean",
        "default": false
      },
      "noEventTriggerForOnvifEvent": {
        "title": lang["noEventTriggerForOnvifEvent"],
        "type": "boolean",
        "default": false
      },
      "noEventBasedRecordingMaps": {
        "title": lang["noEventBasedRecordingMaps"],
        "type": "boolean",
        "default": false
      },
      "noDefaultRecordingSegmentFormatOptions": {
        "title": lang["noDefaultRecordingSegmentFormatOptions"],
        "type": "boolean",
        "default": false
      },
      "peopleTags": {
        "type": "array",
        "format": "table",
        "title": lang["peopleTags"],
        "description": lang["peopleTagsDes"],
        "items": {
          "type": "string"
        },
        "default": [
          "person",
          "Person",
          "Man",
          "Woman",
          "Boy",
          "Girl"
        ]
      },
      "insertOrphans": {
        "title": lang["insertOrphans"],
        "type": "boolean",
        "default": true
      },
      "orphanedVideoCheckMax": {
        "title": lang["orphanedVideoCheckMax"],
        "type": "integer",
        "default": 2
      },
      "orphanedMountScanTimeout": {
        "title": lang["orphanedMountScanTimeout"],
        "type": "integer"
      },
      "orphanedMountedVideoCheckMax": {
        "title": lang["orphanedMountedVideoCheckMax"],
        "type": "integer"
      },
      "autoDropCache": {
        "title": lang["autoDropCache"],
        "type": "boolean",
        "description": lang["autoDropCacheDes"],
        "default": false
      },
      "deleteCorruptFiles": {
        "title": lang["deleteCorruptFiles"],
        "type": "boolean",
        "default": true
      },
      "deleteFileBinsOverMax": {
        "title": lang["deleteFileBinsOverMax"],
        "type": "boolean",
        "default": true
      },
      "hideCloudSaveUrls": {
        "title": lang["hideCloudSaveUrls"],
        "type": "boolean",
        "default": true
      },
      "dropTimeLapseFrames": {
        "title": lang["dropTimeLapseFrames"],
        "type": "boolean",
        "default": false
      },
      "disableAutoCompressVideos": {
        "title": lang["disableAutoCompressVideos"],
        "type": "boolean",
        "default": false
      },
      "autoBuildTimelapseVideosDaily": {
        "title": lang["autoBuildTimelapseVideosDaily"],
        "type": "boolean",
        "default": false
      },
      "monitorStartQueueDisabled": {
        "title": lang["monitorStartQueueDisabled"],
        "type": "boolean",
        "default": false
      },
      "probeMonitorOnStart": {
        "title": lang["probeMonitorOnStart"],
        "type": "boolean",
        "default": true
      },
      "restart": {
        "type": "object",
        "format": "table",
        "title": lang["restart"],
        "properties": {
          "onVideoNotExist": {
            "title": lang["restartOnVideoNotExist"],
            "type": "boolean",
            "default": true
          }
        }
      },
      "liveJpegApiEnabled": {
        "title": lang["liveJpegApiEnabled"],
        "type": "boolean",
        "default": true
      },
      "maxJpegChunkPieces": {
        "title": lang["maxJpegChunkPieces"],
        "type": "integer"
      },
      "binDir": {
        "title": lang["binDir"],
        "type": "string"
      },
      "ffmpegDir": {
        "title": lang["ffmpegDir"],
        "type": "string",
        "description": lang["ffmpegDirDes"]
      },
      "ffmpegBinary": {
        "title": lang["ffmpegBinary"],
        "type": "string"
      },
      "ffbinariesVersion": {
        "title": lang["ffbinariesVersion"],
        "type": "string"
      },
      "monitorDaemonPath": {
        "title": lang["monitorDaemonPath"],
        "type": "string"
      },
      "monitorDetectorDaemonPath": {
        "title": lang["monitorDetectorDaemonPath"],
        "type": "string"
      },
      "iconURL": {
        "title": lang["iconURL"],
        "type": "string"
      },
      "applicationName": {
        "title": lang["applicationName"],
        "type": "string"
      },
      "brandingConfig": {
        "type": "object",
        "format": "table",
        "title": lang["brandingConfig"],
        "description": lang["brandingConfigDes"],
        "properties": {}
      },
      "timezone": {
        "title": lang["timezone"],
        "type": "string"
      },
      "useUTC": {
        "title": lang["useUTC"],
        "type": "boolean",
        "default": false
      },
      "pipeAddition": {
        "title": lang["pipeAddition"],
        "type": "integer",
        "default": 10
      },
      "safeMode": {
        "title": lang["safeMode"],
        "type": "boolean",
        "default": false
      },
      "shinobiHubEndpoint": {
        "title": lang["shinobiHubEndpoint"],
        "type": "string",
        "default": "https://hub.shinobi.video/"
      },
      "shinobiHubAutoBackup": {
        "title": lang["shinobiHubAutoBackup"],
        "type": "boolean",
        "default": false
      },
      "shinobiHubApiKey": {
        "title": lang["shinobiHubApiKey"],
        "type": "string"
      },
      "easyRemotePort": {
        "title": lang["easyRemotePort"],
        "type": "integer"
      },
      "alarmManagement": {
        "title": lang["alarmManagement"],
        "type": "boolean",
        "default": false
      },
      "webDavUpload": {
        "title": lang["webDavUpload"],
        "type": "boolean",
        "default": false
      },
      "cpuUsageMarker": {
        "title": lang["cpuUsageMarker"],
        "type": "string",
        "default": "%Cpu"
      },
      "customCpuCommand": {
        "title": lang["customCpuCommand"],
        "type": "string"
      },
      "doCronAsWorker": {
        "title": lang["doCronAsWorker"],
        "type": "boolean",
        "default": true
      },
      "pushRelayApiKey": {
        "title": lang["pushRelayApiKey"],
        "type": "string"
      },
      "pushRelayUrl": {
        "title": lang["pushRelayUrl"],
        "type": "string"
      }
    }
  };

  const configurationTab = $("#config");
  const configurationForm = configurationTab.find("form");

  const moduleData = {
    endpoint: null,
    configurationEditor: null
  }

  const handleGetConfigurationData = data => {
    const dataConfig = data.config;
    const dataConfigKeys = Object.keys(dataConfig);
    const schemaItemsKeys = Object.keys(schema.properties);

    const schemaWithoutData = schemaItemsKeys.filter(
      (sk) => !dataConfigKeys.includes(sk)
    );
    const dataWithoutSchema = dataConfigKeys.filter(
      (dk) => !schemaItemsKeys.includes(dk)
    );

    schemaWithoutData.forEach((sk) => {
      const schemaItem = schema.properties[sk];
      const defaultConfig = schemaItem.default;

      data.config[sk] = defaultConfig;
    });

    if (dataWithoutSchema.length > 0) {
      dataWithoutSchema.forEach((dk) => {
        const schemaItem = {
          title: dk,
          options: {
            hidden: true,
          },
        };

        schema.properties[dk] = schemaItem;
      });

      // Set default options
      JSONEditor.defaults.options.theme = "bootstrap3";
      JSONEditor.defaults.options.iconlib = "fontawesome4";
    }

    const configurationEditor = new JSONEditor(
      document.getElementById("configForHumans"), {
      schema: schema,
    }
    );
    window.configurationEditor = configurationEditor;

    configurationEditor.setValue(data.config);

    moduleData.configurationEditor = configurationEditor;
    window.configurationEditor = configurationEditor;
  };

  const handlePostConfigurationData = data => {
    // console.log(data);
  }

  function loadConfiguationIntoEditor(d) {
    moduleData.endpoint = `${superApiPrefix}${$user.sessionKey}/system/configure`;

    $.get(moduleData.endpoint, handleGetConfigurationData);
  }

  var submitConfiguration = function () {
    var errors = configurationEditor.validate();
    console.log(errors.length)
    console.log(errors)
    if (errors.length === 0) {
      var newConfiguration = JSON.stringify(configurationEditor.getValue(), null, 3)
      var html = '<p>This is a change being applied to the configuration file (conf.json). Are you sure you want to do this? You must restart Shinobi for these changes to take effect. <b>The JSON below is what you are about to save.</b></p>'
      html += `<pre>${newConfiguration}</pre>`
      $.confirm.create({
        title: 'Save Configuration',
        body: html,
        clickOptions: {
          class: 'btn-success',
          title: lang.Save,
        },
        clickCallback: function () {
          const requestData = {
            data: newConfiguration
          };

          $.post(moduleData.endpoint, requestData, handlePostConfigurationData);
        }
      })
    } else {
      new PNotify({ text: 'Invalid JSON Syntax, Cannot Save.', type: 'error' });
    }
  };

  configurationTab.find('.submit').click(function () {
    submitConfiguration();
  });

  configurationForm.submit(function (e) {
    e.preventDefault();
    submitConfiguration();
    return false;
  });

  $.ccio.ws.on("f", d => {
    if (d.f === "init_success") {
      loadConfiguationIntoEditor();
    }
  });

})
