const { spawn } = require('child_process');
const { parentPort, workerData } = require('worker_threads');
const fs = require("fs").promises;
const net = require("net");
const bson = require('bson');
const WebSocket = require('cws');
const os = require('os');
const { EventEmitter } = require('node:events');

// Constants
const EXPECTED_CONFIG_PATH = './conf.json';
const HEARTBEAT_INTERVAL = 10000; // 10 seconds
const SOCKET_CHECK_INTERVAL = 20000; // 20 seconds
const RECONNECT_DELAY = 2000; // 2 seconds
const HEARTBEAT_TIMEOUT_MULTIPLIER = 1.5;
const MAX_RECONNECT_DELAY = 30000;
// Retry shape : keep trying for a minute, and if the server is still not there, stop
// hammering it and wait ten minutes before starting another minute of attempts. An
// unreachable management server is usually down for maintenance or gone for good, and
// either way reconnecting every 30s forever helps nobody.
const RETRY_WINDOW = 60000; // 1 minute of attempts
const RETRY_WINDOW_PAUSE = 600000; // then 10 minutes of waiting

// Error handling
process.on("uncaughtException", (error) => {
  console.error('Uncaught Exception:', error);
});

class CentralConnection {
  constructor() {
    this.activeTerminalCommands = {};
    this.requestConnections = {};
    this.requestConnectionsData = {};
    this.responseTunnels = {};
    this.timers = {
      socketCheck: null,
      heartbeat: null,
      heartbeatCheck: null,
      onClosed: null
    };
    this.stayDisconnected = false;
    this.allMessageHandlers = [];
    this.internalEvents = new EventEmitter();
    this.reconnectAttempts = 0;
    this.retryWindowStartedAt = null;
    // reconnectAttempts drives the backoff curve and restarts with each 1-minute window;
    // this one is the running total since the last good connection, which is what decides
    // whether the panel says "Retrying" or "Failed Connection".
    this.failedAttemptsSinceConnected = 0;

    this.initConfig();
    this.initLogging();
    this.setupParentPortHandlers();
  }

  initConfig() {
    const { config, serverIp: hostPeerServer, p2pKey: peerConnectKey } = workerData;
    this.config = config;
    this.hostPeerServer = hostPeerServer;
    this.peerConnectKey = peerConnectKey;
    this.sslInfo = config.ssl || {};
  }

  initLogging() {
    this.logger = {
      debugLog: () => {},
      systemLog: (...args) => {
        parentPort.postMessage({ f: 'systemLog', data: args });
      }
    };

    if (this.config.logCentralManagementActivity) {
        this.logger.main = (...args) => {
            parentPort.postMessage({ f: 'systemLog', data: args });
        }
    }else{
        this.logger.main = (...args) => {
            parentPort.postMessage({ f: 'debugLog', data: args });
        }
    }
    // if (this.config.debugLog) {
      this.logger.debugLog = (...args) => {
        parentPort.postMessage({ f: 'debugLog', data: args });
      };
    // }
  }

  setupParentPortHandlers() {
      const _this = this;
    parentPort.on('message', (data) => {
      switch (data.f) {
        case 'init':
          _this.initialize();
          break;
        case 'connectDetails':
          data.connectDetails.peerConnectKey = this.peerConnectKey;
          _this.internalEvents.emit('connectDetails', data.connectDetails);
          break;
        case 'onTriggerNotificationSend':
          data.peerConnectKey = this.peerConnectKey;
          _this.internalEvents.emit('onTriggerNotificationSend', data);
          break;
        case 'saveLogToCentral':
          data.data.peerConnectKey = this.peerConnectKey;
          _this.internalEvents.emit('saveLogToCentral', data.data);
          break;
        case 'exit':
          _this.logger.main('Closing Central Connection...');
          process.exit(0);
          break;
      }
    });
    this.internalEvents.on('onTriggerNotificationSend', (data) => {
        this.sendDataToTunnel({ f: 'onTriggerNotificationSend', data });
    });
    this.internalEvents.on('saveLogToCentral', (data) => {
        this.sendDataToTunnel({ f: 'saveLogToCentral', data });
    });
  }

  clearAllTimers() {
    Object.values(this.timers).forEach(timer => {
      if (timer) clearTimeout(timer);
    });
    this.timers = {
      socketCheck: null,
      heartbeat: null,
      heartbeatCheck: null,
      onClosed: null
    };
  }

  getServerIPAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const interfaceName in interfaces) {
      for (const iface of interfaces[interfaceName]) {
        if (iface.family === 'IPv4' && !iface.internal && iface.address !== '127.0.0.1' && !iface.address.includes(':')) {
          addresses.push(iface.address);
        }
      }
    }
    return addresses;
  }

  getRequestConnection(requestId) {
    return this.requestConnections[requestId] || {
      write: () => {}
    };
  }

  async getConnectionDetails(targetUser) {
    return new Promise((resolve) => {
      this.internalEvents.once('connectDetails', (data) => {
        resolve(data);
      });
      parentPort.postMessage({ f: 'connectDetailsRequest', mail: targetUser });
    });
  }

  async startConnection() {
    this.stayDisconnected = false;
    await this.startWebsocketConnection();
  }

  startWebsocketConnection() {
    this.logger.main('Central : Connecting to Central Server...');
    this.clearAllTimers();

    try {
      if (this.tunnelToP2P) {
        this.tunnelToP2P.removeAllListeners('open');
        this.tunnelToP2P.removeAllListeners('error');
        this.tunnelToP2P.removeAllListeners('close');
        this.tunnelToP2P.onmessage = null;
        this.tunnelToP2P.close();
      }
    } catch (err) {
      console.log('Error closing previous connection:', err);
    }

    this.tunnelToP2P = new WebSocket(this.hostPeerServer);
    this.tunnelToP2P.on('open', () => this.onWebsocketOpen());
    this.tunnelToP2P.on('error', (err) => this.onWebsocketError(err));
    this.tunnelToP2P.on('close', () => this.onWebsocketClose());
    this.tunnelToP2P.onmessage = (event) => this.handleWebsocketMessage(event);
  }

  onWebsocketOpen() {
    this.reconnectAttempts = 0; // Reset backoff on successful connection
    this.retryWindowStartedAt = null; // and the 1-minute-then-pause cycle starts over
    this.failedAttemptsSinceConnected = 0;
    this.logger.main('Central : Connected! Authenticating...');
    // The parent tracks connection state for the Central Management tab's badge. This
    // worker retries internally and never exits while doing so, so without these the
    // parent would only ever see the very first "connecting".
    parentPort.postMessage({ f: 'connectionState', state: 'authenticating' });
    this.authenticateConnection();
  }

  onWebsocketError(err) {
    this.logger.main(`Central tunnelToCentral Error: ${err.toString()}`);
    parentPort.postMessage({ f: 'connectionState', state: 'error', error: err.toString() });
    // Don't call disconnectedConnection here — onWebsocketClose will fire after
  }

  onWebsocketClose() {
    this.logger.main('Central Connection Closed!');
    this.clearAllTimers();

    if (this.stayDisconnected) {
      parentPort.postMessage({ f: 'connectionState', state: 'disconnected' });
      return;
    }

    const now = Date.now();
    if (!this.retryWindowStartedAt) this.retryWindowStartedAt = now;
    const windowElapsed = now - this.retryWindowStartedAt;
    let delay;
    let isPausing = false;
    if (windowElapsed >= RETRY_WINDOW) {
      // A minute of attempts has not got us connected - back off for a long wait, then
      // begin a fresh minute (the next close after this one starts a new window).
      delay = RETRY_WINDOW_PAUSE;
      isPausing = true;
      this.retryWindowStartedAt = null;
      // The next window should open with quick attempts again, not at the 30s cap.
      this.reconnectAttempts = 0;
    } else {
      delay = Math.min(
        RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
        MAX_RECONNECT_DELAY
      );
    }
    if (!isPausing) this.reconnectAttempts++;
    this.failedAttemptsSinceConnected++;
    this.logger.main(isPausing
      ? `Central : No connection after ${Math.round(RETRY_WINDOW / 1000)}s, pausing ${Math.round(delay / 60000)} minutes before trying again...`
      : `Central : Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
    parentPort.postMessage({
      f: 'connectionState',
      state: isPausing ? 'paused' : 'retrying',
      attempts: this.failedAttemptsSinceConnected,
      delay,
      nextAttemptAt: new Date(now + delay).toISOString(),
    });

    this.timers.onClosed = setTimeout(() => {
      this.startWebsocketConnection();
    }, delay);
  }

  async authenticateConnection() {
    const configData = JSON.parse(await fs.readFile(EXPECTED_CONFIG_PATH, 'utf8'));
    const mgmtTargetUser = configData.mgmtTargetUser
    const connectDetails = await this.getConnectionDetails(mgmtTargetUser);

    this.sendDataToTunnel({
        isShinobi: !!this.config.passwordType,
        peerConnectKey: this.peerConnectKey,
        connectDetails,
        ipAddresses: this.getServerIPAddresses(),
        config: configData,
    });

    this.setupHeartbeat();
    this.scheduleHeartbeatCheck();
  }

  sendDataToTunnel(data, logFailureToSend) {
    if (this.tunnelToP2P.readyState === 1) {
        this.tunnelToP2P.send(bson.serialize(data));
    }else if(logFailureToSend){
        console.log('Cant Send Data, Tunnel Not Ready!')
    }
  }

  setupSocketCheckTimer() {
    this.timers.socketCheck = setInterval(() => {
      if (this.tunnelToP2P.readyState !== 1) {
        this.logger.main('Tunnel NOT Ready! Reconnecting...');
        this.disconnectedConnection();
      }
    }, SOCKET_CHECK_INTERVAL);
  }

  setupHeartbeat() {
    if (this.timers.heartbeat) clearInterval(this.timers.heartbeat);
    if (this.timers.heartbeatCheck) clearTimeout(this.timers.heartbeatCheck);

    this.timers.heartbeat = setInterval(() => {
      this.sendDataToTunnel({ f: 'ping' });
      // Start a timeout — if no pong arrives, reconnect
      this.timers.heartbeatCheck = setTimeout(() => {
        this.logger.main('Central : Heartbeat timeout, reconnecting...');
        this.startWebsocketConnection();
      }, HEARTBEAT_INTERVAL * HEARTBEAT_TIMEOUT_MULTIPLIER);
    }, HEARTBEAT_INTERVAL);
  }

  scheduleHeartbeatCheck() {
    setTimeout(() => {
      if (this.tunnelToP2P.readyState !== 1) {
        this.refreshHeartBeatCheck();
      }
    }, 5000);
  }

  refreshHeartBeatCheck() {
    this.clearAllTimers();
    this.timers.heartbeatCheck = setTimeout(() => {
      this.startWebsocketConnection();
    }, HEARTBEAT_INTERVAL * HEARTBEAT_TIMEOUT_MULTIPLIER);
  }

  disconnectedConnection() {
    this.logger.debugLog('stayDisconnected', this.stayDisconnected);
    this.clearAllTimers();
    this.logger.main('Disconnected from Managment Server!');

    if (this.stayDisconnected) return;

    this.logger.main('Restarting Connection to Management Server!');
    setTimeout(() => {
        console.log(`!this.tunnelToP2P || this.tunnelToP2P.readyState !== 1`,!this.tunnelToP2P || this.tunnelToP2P.readyState !== 1)
      if (!this.tunnelToP2P || this.tunnelToP2P.readyState !== 1) {
        this.startWebsocketConnection();
      }
    }, RECONNECT_DELAY);
  }

  handleWebsocketMessage(event) {
    const data = bson.deserialize(Buffer.from(event.data));
    this.allMessageHandlers.forEach((handler) => {
      if (data.f === handler.key) {
        handler.callback(data.data, data.rid);
      }
    });
  }

  onIncomingMessage(key, callback) {
    this.allMessageHandlers.push({ key, callback });
  }

  outboundMessage(key, data, requestId) {
    this.sendDataToTunnel({
      f: key,
      data: data,
      rid: requestId
    });
  }

  async createRemoteSocket(host, port, requestId, initData) {
    const responseTunnel = await this.getResponseTunnel(requestId);
    const remoteSocket = new net.Socket();

    remoteSocket.on('ready', () => {
      remoteSocket.write(initData.buffer);
    });

    remoteSocket.on('error', (err) => {
      this.logger.debugLog('createRemoteSocket ERROR', err);
    });

    remoteSocket.on('data', (data) => {
      this.requestConnectionsData[requestId] = data.toString();
      responseTunnel.send('data', data);
    });

    remoteSocket.on('drain', () => {
      responseTunnel.send('resume', {});
    });

    remoteSocket.on('close', () => {
      delete this.requestConnectionsData[requestId];
      responseTunnel.send('end', {});
      setTimeout(() => {
        if (responseTunnel && (responseTunnel.readyState === 0 || responseTunnel.readyState === 1)) {
          responseTunnel.close();
        }
      }, 5000);
    });

    remoteSocket.connect(port, host || 'localhost');
    this.requestConnections[requestId] = remoteSocket;
    return remoteSocket;
  }

  writeToServer(data, requestId) {
    const flushed = this.getRequestConnection(requestId).write(data.buffer);
    if (!flushed) {
      this.outboundMessage('pause', {}, requestId);
    }
  }

  async getResponseTunnel(originalRequestId) {
    return this.responseTunnels[originalRequestId] || await this.createResponseTunnel(originalRequestId);
  }

  createResponseTunnel(originalRequestId) {
    return new Promise((resolve) => {
      const responseTunnelMessageHandlers = [];
      const responseTunnel = new WebSocket(this.hostPeerServer);

      const sendToResponseTunnel = (data) => {
        responseTunnel.send(bson.serialize(data));
      };

      const sendData = (key, data) => {
        sendToResponseTunnel({
          f: key,
          data: data,
          rid: originalRequestId
        });
      };

      const onMessage = (key, callback) => {
        responseTunnelMessageHandlers.push({ key, callback });
      };

      responseTunnel.on('error', (err) => {
        this.logger.debugLog('responseTunnel ERROR', err);
      });

      responseTunnel.on('open', () => {
        sendToResponseTunnel({
          responseTunnel: originalRequestId,
          peerConnectKey: this.peerConnectKey,
        });
      });

      responseTunnel.on('close', () => {
        delete this.responseTunnels[originalRequestId];
      });

      responseTunnel.onmessage = (event) => {
        const data = bson.deserialize(Buffer.from(event.data));
        responseTunnelMessageHandlers.forEach((handler) => {
          if (data.f === handler.key) {
            handler.callback(data.data, data.rid);
          }
        });
      };

      onMessage('ready', () => {
        const finalData = {
          onMessage,
          send: sendData,
          sendRaw: sendToResponseTunnel,
          close: responseTunnel.close.bind(responseTunnel)
        };
        this.responseTunnels[originalRequestId] = finalData;
        resolve(finalData);
      });
    });
  }

  closeResponseTunnel(originalRequestId) {
    try {
      this.responseTunnels[originalRequestId]?.close();
    } catch (err) {
      this.logger.debugLog('closeResponseTunnel', err);
    }
  }

  initialize() {
    this.setupMessageHandlers();
    this.startConnection();
  }

  setupMessageHandlers() {
    this.onIncomingMessage('connect', async (data, requestId) => {
      this.logger.debugLog('New Request Incoming', 'localhost', this.config.port, requestId);
      await this.createRemoteSocket('localhost', this.config.port, requestId, data.init);
    });

    this.onIncomingMessage('data', (data, requestId) => this.writeToServer(data, requestId));
    this.onIncomingMessage('resume', (data, requestId) => this.requestConnections[requestId].resume());
    this.onIncomingMessage('pause', (data, requestId) => this.requestConnections[requestId].pause());
    this.onIncomingMessage('pong', () => {
      if (this.timers.heartbeatCheck) {
        clearTimeout(this.timers.heartbeatCheck);
        this.timers.heartbeatCheck = null;
      }
    });

    this.onIncomingMessage('init', () => {
      this.logger.main('Central : Authenticated!');
      parentPort.postMessage({ f: 'authenticated' });
    });

    this.onIncomingMessage('modifyConfiguration', (data) => {
      parentPort.postMessage({ f: 'modifyConfiguration', data });
    });

    this.onIncomingMessage('getConfiguration', (data, requestId) => {
      this.outboundMessage('getConfigurationResponse', { ...this.config }, requestId);
    });

    this.onIncomingMessage('restart', () => {
      parentPort.postMessage({ f: 'restart' });
    });

    this.onIncomingMessage('end', (data, requestId) => {
      try {
        this.requestConnections[requestId]?.end();
      } catch (err) {
        this.logger.debugLog(`Request Failed to END ${requestId}`);
        this.logger.debugLog(`Failed Request ${this.requestConnectionsData[requestId]}`);
        delete this.requestConnectionsData[requestId];
        this.logger.debugLog(err);
      }
    });

    this.onIncomingMessage('disconnect', (data) => {
      this.logger.main('Central : FAILED LICENSE CHECK ON CENTRAL');
      this.stayDisconnected = !data?.retryLater;
      if (data?.retryLater) this.logger.main('Central : Retrying Central Later...');
    });
  }
}

// Start the connection
const centralConnection = new CentralConnection();
centralConnection.initialize();
