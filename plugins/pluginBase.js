"use strict";
//
// Shinobi – Plugin Base (Refactored 2025‑05‑24)
// Copyright (C) 2016‑2025 Moe Alam, moeiscool
//
// • Memory‑leak hardening
// • Clear separation of concerns
// • Re‑usable helper utilities
//
const fs = require("fs");
const { exec, spawn } = require("child_process");
const path = require("path");
const moment = require("moment");
const express = require("express");
const http = require("http");
const { Server: SocketIOServer } = require("socket.io");
const SocketIOClient = require("socket.io-client");
const CWSServer = require("cws").Server;
let stayDisconnected = false;

// ────────────────────────────────────────────────────────────────────────────────
// Globals guarded so that multiple require() calls don’t duplicate listeners
// ────────────────────────────────────────────────────────────────────────────────
if (!process.__PLUGIN_BASE_LISTENERS__) {
  process.__PLUGIN_BASE_LISTENERS__ = true;
  process.once("uncaughtException", (err) => console.error("uncaughtException", err));
  ["SIGINT", "SIGTERM"].forEach((sig) =>
    process.once(sig, () => {
      console.log("\nReceived ", sig, " – exiting cleanly.");
      process.exit(0);
    }),
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────────────────────────
const bytesToMiB = (b) => (b / (1024 * 1024)).toFixed(2);

const ensureTrailing = (str, t = "/") => (str.endsWith(t) ? str : str + t);

const gid = (len = 10) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () => chars[(Math.random() * chars.length) | 0]).join("");
};

const safeJSON = (x) => JSON.stringify(x, null, 2);

// ────────────────────────────────────────────────────────────────────────────────
// Main exported factory
// ────────────────────────────────────────────────────────────────────────────────
module.exports = function makePluginBase(__dirname, cfg = {}) {
  const config = { ...cfg }; // don’t mutate caller’s object
  if (!config.plug) throw new Error("config.plug is required");

  // basic defaults ----------------------------------------------------------------
  Object.assign(config, {
    dirname: ".",
    port: 8080,
    hostPort: 8082,
    systemLog: true,
    connectionType: "websocket",
    streamDir: config.streamDir || (process.platform === "win32" ? config.windowsTempDir : "/dev/shm"),
  });
  config.streamDir = ensureTrailing(config.streamDir || path.join(config.dirname, "streams"));

  // logging helpers ----------------------------------------------------------------
  const plugLog = (...msg) => console.log(new Date(), config.plug, ...msg);
  const sysLog = (...msg) => config.systemLog && console.log(moment().format(), ...msg);
  const dbgLog = (...msg) => config.debugLog && console.log(new Date(), ...msg);

  // leak‑detector (does nothing if the lib is missing)
  try {
    require("../libs/basic/leakDetector").start({
      sampleInterval: 15_000,
      absGrowthLimit: 10 * 1024 * 1024,
      consecutiveHits: 4,
      snapshotDir: "/tmp",
    });
  } catch (_) {}

  // ensure stream directory exists --------------------------------------------------
  fs.mkdirSync(config.streamDir, { recursive: true });

  // in‑memory state -----------------------------------------------------------------
  const s = {
    group: {},
    monitors: new Map(), // keyed by `${ke}${mid}`
    monitorInfo: new Map(),
    callbacks: new Map(), // Python RPC callbacks with timeout
    ext: {
      cameraInit: new Set(),
      pluginEvent: new Set(),
      cpuUsage: new Set(),
    },
    dir: { streams: config.streamDir },
    isWin: process.platform === "win32",
    getWebsocket: () => io,
  };

  // ───────────────────────────── image buffering & guard ──────────────────────────
  // Frames arrive as raw ffmpeg pipe chunks, which don't line up with JPEG boundaries:
  // under load one chunk can carry the end of one frame and the start of the next.
  // Only checking whether a chunk *ends* in EOI then kept appending frame after frame
  // until a chunk happened to line up, so the buffer could grow without limit. A frame
  // is complete at an EOI (FF D9) that ends the chunk or is directly followed by the
  // next frame's SOI (FF D8); an EOI anywhere else (an EXIF thumbnail) is not a boundary.
  const imageBuffers = new Map(); // Map<monitorKey,{chunks:Buffer[], bytes:number, tail:Buffer, started:number}>
  const MAX_IMG_AGE_MS = 5_000; // drop partial frames after 5 s
  const maxFrameBytes = config.maxFrameBytes || 16 * 1024 * 1024;
  const JPEG_FRAME_BOUNDARY = Buffer.from([0xff, 0xd9, 0xff, 0xd8]);
  const newImageEntry = (now, first) => ({
    chunks: first ? [first] : [],
    bytes: first ? first.length : 0,
    // last bytes held, so a marker split across two chunks is still found
    tail: first ? Buffer.from(first.subarray(-3)) : Buffer.alloc(0),
    started: now,
  });

  function appendImageChunk(monitorKey, chunk) {
    const now = Date.now();
    // a frame that started over MAX_IMG_AGE_MS ago is never finishing ➜ discard
    for (const [k, v] of imageBuffers) {
      if (now - v.started > MAX_IMG_AGE_MS) imageBuffers.delete(k);
    }
    let entry = imageBuffers.get(monitorKey);
    if (!entry) {
      entry = newImageEntry(now);
      imageBuffers.set(monitorKey, entry);
    }

    const probe = entry.tail.length ? Buffer.concat([entry.tail, chunk]) : chunk;
    let split = -1; // offset in probe just past the frame's EOI
    if (probe.at(-2) === 0xff && probe.at(-1) === 0xd9) {
      split = probe.length;
    } else {
      const boundary = probe.lastIndexOf(JPEG_FRAME_BOUNDARY);
      if (boundary !== -1) split = boundary + 2;
    }
    entry.chunks.push(chunk);
    entry.bytes += chunk.length;
    entry.tail = Buffer.from(probe.subarray(-3));

    if (split === -1) {
      if (entry.bytes > maxFrameBytes) {
        dbgLog(`Frame for ${monitorKey} passed ${maxFrameBytes} bytes without an end marker, discarding`);
        imageBuffers.delete(monitorKey);
      }
      return null;
    }

    const held = Buffer.concat(entry.chunks);
    const end = held.length - probe.length + split;
    let frame = held.subarray(0, end);
    // several whole frames arrived at once ➜ keep only the newest
    const previous = frame.lastIndexOf(JPEG_FRAME_BOUNDARY, frame.length - 4);
    if (previous !== -1) frame = frame.subarray(previous + 2);

    // whatever follows the boundary is the start of the next frame
    if (end < held.length) imageBuffers.set(monitorKey, newImageEntry(now, held.subarray(end)));
    else imageBuffers.delete(monitorKey);
    return frame;
  }

  // ───────────────────────────────── cpu / nvidia helpers ─────────────────────────
  const getCpuUsage = (cb) => {
    const cmd = (() => {
      switch (process.platform) {
        case "win32":
          return "wmic cpu get loadpercentage /value";
        case "darwin":
          return "ps -A -o %cpu | awk '{s+=$1} END {print s}'";
        case "linux":
          return "top -b -n 2 | awk 'toupper($0) ~ /^.?CPU/ {gsub(\"id,\",\"100\",$8); gsub(\"%\",$8); print 100-$8}' | tail -n 1";
        default:
          return null;
      }
    })();

    if (!cmd) return cb(0);
    const child = spawn(cmd, { shell: true });
    let out = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.on("close", () => cb(parseFloat(out.trim())));
  };

  // ───────────────────────────────── event dispatch helpers ────────────────────────
  function runExtenders(set, ...args) {
    for (const fn of set) {
      try {
        fn(...args);
      } catch (e) {
        console.error("extender error", e);
      }
    }
  }

  // ───────────────────────────────── processImage wrapper ─────────────────────────
  // Shinobi sends every frame it has, with no backpressure. If a plugin can't keep up,
  // frames that are still waiting on detection pile up without limit (in this process
  // and often in a backend like a Python server), and memory climbs until the host
  // runs out. Each monitor gets at most `maxInFlightPerMonitor` frames in detection at
  // once, and any more are dropped. A slot is freed when the plugin calls `done`, when
  // its detectObject promise settles, or after `detectTimeout` ms, whichever comes
  // first, so a plugin that misses `done` on some code path can't stall a monitor forever.
  const maxInFlightPerMonitor = config.maxInFlightPerMonitor ?? 2;
  const detectTimeout = config.detectTimeout ?? 30_000;
  const inFlightPerMonitor = new Map(); // Map<monitorKey,number>
  let overallProcessingCount = 0;
  async function processImage(buffer, d, tx, frameLocation) {
    const mKey = `${d.ke}${d.id}`;
    const inFlight = inFlightPerMonitor.get(mKey) || 0;
    if (inFlight >= maxInFlightPerMonitor) {
      if (frameLocation) fs.rm(frameLocation, () => {});
      return;
    }
    inFlightPerMonitor.set(mKey, inFlight + 1);

    const socket = s.getWebsocket();
    ++overallProcessingCount;
    socket?.emit("processCount", overallProcessingCount);

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      clearTimeout(watchdog);
      const left = (inFlightPerMonitor.get(mKey) || 1) - 1;
      if (left > 0) inFlightPerMonitor.set(mKey, left);
      else inFlightPerMonitor.delete(mKey);
      --overallProcessingCount;
      socket?.emit("processCount", overallProcessingCount);
    };
    const watchdog = setTimeout(release, detectTimeout);

    // async detectObject ➜ user‑provided
    try {
      const result = s.detectObject?.(buffer, d, tx, frameLocation, release);
      if (result && typeof result.then === "function") {
        result.then(release, (err) => {
          console.error("detectObject error", err);
          release();
        });
      }
    } catch (err) {
      console.error("detectObject error", err);
      release();
    }
  }

  // placeholder overridable
  s.detectObject = (_buf, _d, _tx, _frameLoc, done) => {
    console.warn("detectObject handler not set");
    done?.();
  };

  // ─────────────────────────────────── socket.io setup ────────────────────────────
  const app = express();
  const server = http.createServer(app);
  let io; // will hold either server or client instance

  // reusable cleanup of socket listeners -------------------------------------------
  function cleanupSocket(sock) {
    if (!sock) return;
    sock.removeAllListeners();
    sock.disconnect?.();
  }

  // server / host mode --------------------------------------------------------------
  function startHost() {
    const sio = new SocketIOServer(server, { transports: ["websocket"] });
    sio.engine.ws = new CWSServer({ noServer: true, perMessageDeflate: false });

    s.connectedClients = new Map();

    sio.on("connection", (cn) => {
      plugLog("Client connected", cn.id);
      const tx = (data) => cn.emit("ocv", { ...data, pluginKey: config.key, plug: config.plug });
      s.connectedClients.set(cn.id, { cn, tx });

      cn.on("f", (d) => mainEventController(d, cn, tx));
      cn.once("disconnect", () => {
        plugLog("Client disconnected", cn.id);
        s.connectedClients.delete(cn.id);
        cleanupSocket(cn);
      });
    });

    s.disconnectWebSocket = () => {
      for (const { cn } of s.connectedClients.values()) cleanupSocket(cn);
      s.connectedClients.clear();
    };

    io = sio;
  }

  // client mode --------------------------------------------------------------------
  function startClient() {
    let retry = 0;
    const MAX_RETRY = parseInt(config.maxRetryConnection, 10) || 5;
    const url = `ws://${config.host || "localhost"}:${config.port}`;

    function connect() {
        cleanupSocket(io)
      const sock = SocketIOClient(url, { transports: ["websocket"] });
      io = sock;

      const reconnect = () => {
          if(stayDisconnected)return;
        if (++retry > MAX_RETRY){
            stayDisconnected = true;
            s.disconnectWebSocket()
            return plugLog("Max retries reached");
        }
        setTimeout(connect, 3_000);
      };

      sock.once("connect", () => {
        retry = 0;
        plugLog("Connected to host");
        sock.emit("ocv", { f: "init", plug: config.plug, notice: config.notice, type: config.type, connectionType: config.connectionType, pluginKey: config.key });
      });

      sock.on("disconnect", (reason) => {
        // socket.io reports this exact reason only when the SERVER called
        // socket.disconnect() - which Shinobi's plugin handler does right
        // after rejecting an "init" handshake with a bad/missing pluginKey.
        // A repeating connect -> immediate "io server disconnect" -> retry
        // loop almost always means config.key here doesn't match this
        // plugin's entry in Shinobi's conf.json pluginKeys.
        if (reason === "io server disconnect") {
          plugLog(`Disconnected by host immediately after connecting - check that this plugin's key matches conf.json's pluginKeys."${config.plug}" on the Shinobi server.`);
        }
        reconnect();
      });
      ["connect_error", "error"].forEach((ev) => sock.on(ev, reconnect));

      sock.on("f", (d) => mainEventController(d, null, (data) => sock.emit("ocv", { ...data, pluginKey: config.key, plug: config.plug })));

      s.disconnectWebSocket = () => cleanupSocket(sock);
    }

    connect();
  }

  // choose host vs client -----------------------------------------------------------
  if (config.mode === "host") startHost();
  else startClient();

  // start http server with retry ----------------------------------------------------
  (function listen(tries = 0) {
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE" && tries < 5) {
        const old = config.hostPort;
        config.hostPort = parseInt(config.hostPort, 10) + 1;
        plugLog(`Port ${old} busy – trying ${config.hostPort}`);
        return listen(tries + 1);
      }
      throw err;
    });

    server.listen(config.hostPort, () => plugLog(`HTTP server on ${config.hostPort}`));
  })();

  // ─────────────────────────── main event controller ──────────────────────────────
  function mainEventController(d, cn, tx) {
    switch (d.f) {
      case "init_plugin_as_host": {
        if (!cn) return plugLog("No CN for init_plugin_as_host", d);
        if (d.key !== config.key) {
          plugLog("Plugin key mismatch from", cn.request?.connection?.remoteAddress);
          cn.emit("init", { ok: false });
          cn.disconnect();
          return;
        }
        cn.emit("init", { ok: true, plug: config.plug, notice: config.notice, type: config.type });
        break;
      }

      case "monitorUpdate": {
        const m = d.monitorConfig;
        const mKey = `${m.ke}${m.mid}`;
        s.monitors.set(mKey, { ...m });

        const det = m.details;
        const separate = det.detector_use_detect_object === "1";
        // When separate object-detection scaling is on and left blank, this
        // must match the 1280x720 default libs/ffmpeg/builders.js actually
        // encodes that stream at - falling back to the base motion-detector
        // scale (det.detector_scale_x/y) instead was wrong and caused
        // detector plugins to assume the wrong reference resolution.
        // The non-separate branch defaults to the 640x480 builders.js encodes the base
        // detector stream at; without it a blank field yields NaN and every matrix on
        // the event becomes unplottable.
        const width = parseFloat(separate ? (det.detector_scale_x_object || 1280) : (det.detector_scale_x || 640));
        const height = parseFloat(separate ? (det.detector_scale_y_object || 720) : (det.detector_scale_y || 480));
        s.monitorInfo.set(mKey, { isObjectDetectionSeparate: separate, separate, width, height });

        imageBuffers.delete(mKey);
        runExtenders(s.ext.cameraInit, m, cn, tx);
        break;
      }

      case "frame": {
        // same key monitorUpdate uses, so a config change actually clears a half-built frame
        const mKey = `${d.ke}${d.id}`;
        const buf = appendImageChunk(mKey, d.frame);
        if (buf) processImage(buf, d, tx);
        break;
      }

      case "frameFromRam": {
        processImage(d.buffer, d, tx, d.frameLocation);
        break;
      }
    }

    runExtenders(s.ext.pluginEvent, d, cn, tx);
  }

  // expose API to caller -----------------------------------------------------------
  s.onCameraInit = (fn) => s.ext.cameraInit.add(fn);
  s.onPluginEventExtender = (fn) => s.ext.pluginEvent.add(fn);
  s.onGetCpuUsageExtensions = new Set();

  // cpu usage polling for cluster mode --------------------------------------------
  if (config.clusterMode) {
    setInterval(() => {
      if (config.clusterBasedOnGpu) return; // left as exercise to parse nvidia‑smi
      getCpuUsage((pct) => io?.emit("cpuUsage", pct));
    }, 10_000);
  }

  // python integration (simplified) -----------------------------------------------
  if (config.createPythonBridge) {
    startPythonBridge();
  }

  function startPythonBridge() {
    const pyPort = config.pythonPort || 7990;
    const script = config.pythonScript || path.join(config.dirname, "pumpkin.py");

    let pyProc;
    const launch = () => {
      pyProc = spawn("python3", [script, pyPort], { env: { ...process.env, PYTHONUNBUFFERED: 1 } });
      pyProc.stdout.on("data", (d) => dbgLog("PY", d.toString()));
      pyProc.stderr.on("data", (d) => console.error("PYERR", d.toString()));
      pyProc.once("close", () => setTimeout(launch, 3_000));
    };
    launch();

    // RPC bridge
    s.createCameraBridgeToPython = (uniqueId) => {
      const sock = SocketIOClient(`ws://localhost:${pyPort}`, { transports: ["websocket"] });
      const pending = new Map();

      function sendToPython(data, cb, timeout = 5_000) {
        const id = data.id || gid();
        data.id = id;
        pending.set(id, cb);
        sock.emit("f", data);
        setTimeout(() => pending.delete(id), timeout); // auto‑cleanup
      }

      sock.on("f", (d) => {
        pending.get(d.id)?.(d.data);
        pending.delete(d.id);
      });

      sock.on("disconnect", () => setTimeout(() => sock.connect(), 3_000));

      return {
        refreshTracker: (trackerId) => sock.emit("refreshTracker", { trackerId }),
        sendToPython,
        destroy: () => cleanupSocket(sock),
      };
    };
  }

  // helper to get scaled dims ------------------------------------------------------
  s.getImageDimensions = (d) => {
    const det = d.mon;
    const separate = det.detector_use_detect_object === "1";
    // Same fix as the monitorUpdate case above - blank object-detection
    // scale fields must fall back to 1280x720 (what the stream is actually
    // encoded at), not the unrelated base motion-detector scale.
    const height = separate ? (det.detector_scale_y_object || 720) : (det.detector_scale_y || 480);
    const width = separate ? (det.detector_scale_x_object || 1280) : (det.detector_scale_x || 640);
    return { height: parseFloat(height), width: parseFloat(width) };
  };

  return s;
};
