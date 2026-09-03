#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const RESEARCH_DIR = path.resolve(TOOL_DIR, "..");
const RAW_DIR = path.join(RESEARCH_DIR, "raw");
const SCREENSHOT_DIR = path.join(RESEARCH_DIR, "screenshots");
const PROFILE_DIR = path.join(RAW_DIR, "chrome-profile");
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const TARGET_URL = process.env.TARGET_URL || "https://datacurve.ai/";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForFile(file, timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (existsSync(file)) return;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${file}`);
}

class CDPClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.url);
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
        else pending.resolve(message.result);
        return;
      }
      const handlers = this.handlers.get(message.method) || [];
      for (const handler of handlers) handler(message.params || {});
    });
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
  }

  on(method, handler) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(handler);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws?.close();
  }
}

const probeScript = String.raw`
(() => {
  const state = {
    installedAt: performance.now(),
    contextCalls: [],
    drawSummary: {},
    recentDraws: [],
    buffers: [],
    bufferUpdates: [],
    attributes: [],
    shaders: [],
    programs: [],
    uniformWrites: {},
    errors: []
  };
  const canvasIds = new WeakMap();
  const contextIds = new WeakMap();
  const contextRefs = [];
  const bufferIds = new WeakMap();
  const shaderIds = new WeakMap();
  const programIds = new WeakMap();
  const uniformNames = new WeakMap();
  const currentProgram = new WeakMap();
  const currentBuffers = new WeakMap();
  let nextCanvasId = 1;
  let nextContextId = 1;
  let nextBufferId = 1;
  let nextShaderId = 1;
  let nextProgramId = 1;

  const clipped = (value) => {
    if (ArrayBuffer.isView(value)) return Array.from(value).slice(0, 32);
    if (Array.isArray(value)) return value.slice(0, 32);
    if (typeof value === "number" || typeof value === "boolean" || value == null) return value;
    return String(value).slice(0, 200);
  };
  const canvasId = (canvas) => {
    if (!canvasIds.has(canvas)) canvasIds.set(canvas, nextCanvasId++);
    return canvasIds.get(canvas);
  };
  const contextId = (context) => {
    if (!contextIds.has(context)) {
      contextIds.set(context, nextContextId++);
      contextRefs.push(context);
    }
    return contextIds.get(context);
  };
  const bufferId = (buffer) => {
    if (!buffer) return null;
    if (!bufferIds.has(buffer)) bufferIds.set(buffer, nextBufferId++);
    return bufferIds.get(buffer);
  };
  const shaderId = (shader) => {
    if (!shaderIds.has(shader)) shaderIds.set(shader, nextShaderId++);
    return shaderIds.get(shader);
  };
  const programId = (program) => {
    if (!programIds.has(program)) programIds.set(program, nextProgramId++);
    return programIds.get(program);
  };
  const rememberRecent = (list, entry, max = 500) => {
    list.push(entry);
    if (list.length > max) list.splice(0, list.length - max);
  };

  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, attributes) {
    const context = originalGetContext.apply(this, arguments);
    if (context && /^(webgl|webgl2|experimental-webgl)$/.test(type)) {
      const cid = contextId(context);
      const entry = {
        at: performance.now(),
        canvasId: canvasId(this),
        contextId: cid,
        requestedType: type,
        actualType: context.constructor?.name || "unknown",
        requestedAttributes: attributes || null
      };
      if (!state.contextCalls.some((item) => item.contextId === cid)) {
        try {
          entry.actualAttributes = context.getContextAttributes();
        } catch {}
        state.contextCalls.push(entry);
      }
    }
    return context;
  };

  function patch(proto, label) {
    if (!proto) return;
    const originals = {};
    for (const name of [
      "createBuffer", "bindBuffer", "bufferData", "bufferSubData",
      "createShader", "shaderSource", "createProgram", "attachShader",
      "linkProgram", "useProgram", "getUniformLocation", "getAttribLocation",
      "vertexAttribPointer", "vertexAttribIPointer", "vertexAttribDivisor",
      "drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"
    ]) {
      if (typeof proto[name] === "function") originals[name] = proto[name];
    }

    if (originals.createBuffer) {
      proto.createBuffer = function() {
        const result = originals.createBuffer.apply(this, arguments);
        bufferId(result);
        return result;
      };
    }
    if (originals.bindBuffer) {
      proto.bindBuffer = function(target, buffer) {
        if (!currentBuffers.has(this)) currentBuffers.set(this, {});
        currentBuffers.get(this)[target] = buffer;
        return originals.bindBuffer.apply(this, arguments);
      };
    }
    if (originals.bufferData) {
      proto.bufferData = function(target, dataOrSize, usage) {
        const bound = currentBuffers.get(this)?.[target];
        const byteLength =
          typeof dataOrSize === "number"
            ? dataOrSize
            : dataOrSize?.byteLength ?? null;
        rememberRecent(state.buffers, {
          at: performance.now(),
          contextId: contextId(this),
          bufferId: bufferId(bound),
          target,
          byteLength,
          valueType: dataOrSize?.constructor?.name || typeof dataOrSize,
          usage
        }, 1000);
        return originals.bufferData.apply(this, arguments);
      };
    }
    if (originals.bufferSubData) {
      proto.bufferSubData = function(target, offset, data) {
        const bound = currentBuffers.get(this)?.[target];
        rememberRecent(state.bufferUpdates, {
          at: performance.now(),
          contextId: contextId(this),
          bufferId: bufferId(bound),
          target,
          offset,
          byteLength: data?.byteLength ?? null
        }, 1000);
        return originals.bufferSubData.apply(this, arguments);
      };
    }
    if (originals.createShader) {
      proto.createShader = function(type) {
        const result = originals.createShader.apply(this, arguments);
        shaderId(result);
        return result;
      };
    }
    if (originals.shaderSource) {
      proto.shaderSource = function(shader, source) {
        const id = shaderId(shader);
        const existing = state.shaders.find((item) => item.shaderId === id);
        if (existing) existing.source = source;
        else state.shaders.push({
          shaderId: id,
          contextId: contextId(this),
          shaderType: this.getShaderParameter
            ? (this.getShaderParameter(shader, this.SHADER_TYPE) || null)
            : null,
          source
        });
        return originals.shaderSource.apply(this, arguments);
      };
    }
    if (originals.createProgram) {
      proto.createProgram = function() {
        const result = originals.createProgram.apply(this, arguments);
        state.programs.push({
          programId: programId(result),
          contextId: contextId(this),
          shaderIds: [],
          attributes: [],
          uniforms: []
        });
        return result;
      };
    }
    if (originals.attachShader) {
      proto.attachShader = function(program, shader) {
        const record = state.programs.find((item) => item.programId === programId(program));
        if (record && !record.shaderIds.includes(shaderId(shader))) record.shaderIds.push(shaderId(shader));
        return originals.attachShader.apply(this, arguments);
      };
    }
    if (originals.linkProgram) {
      proto.linkProgram = function(program) {
        const result = originals.linkProgram.apply(this, arguments);
        try {
          const record = state.programs.find((item) => item.programId === programId(program));
          if (record) {
            record.linked = this.getProgramParameter(program, this.LINK_STATUS);
            record.linkLog = this.getProgramInfoLog(program) || "";
            const attributeCount = this.getProgramParameter(program, this.ACTIVE_ATTRIBUTES) || 0;
            record.attributes = [];
            for (let index = 0; index < attributeCount; index++) {
              const info = this.getActiveAttrib(program, index);
              if (!info) continue;
              record.attributes.push({
                name: info.name,
                size: info.size,
                type: info.type,
                location: originals.getAttribLocation.call(this, program, info.name)
              });
            }
            const uniformCount = this.getProgramParameter(program, this.ACTIVE_UNIFORMS) || 0;
            record.uniforms = [];
            for (let index = 0; index < uniformCount; index++) {
              const info = this.getActiveUniform(program, index);
              if (info) record.uniforms.push({ name: info.name, size: info.size, type: info.type });
            }
          }
        } catch (error) {
          state.errors.push("linkProgram probe: " + error.message);
        }
        return result;
      };
    }
    if (originals.useProgram) {
      proto.useProgram = function(program) {
        currentProgram.set(this, program);
        return originals.useProgram.apply(this, arguments);
      };
    }
    if (originals.getUniformLocation) {
      proto.getUniformLocation = function(program, name) {
        const result = originals.getUniformLocation.apply(this, arguments);
        if (result) uniformNames.set(result, {
          name,
          programId: programId(program),
          contextId: contextId(this)
        });
        return result;
      };
    }
    if (originals.getAttribLocation) {
      proto.getAttribLocation = function(program, name) {
        return originals.getAttribLocation.apply(this, arguments);
      };
    }

    for (const name of ["vertexAttribPointer", "vertexAttribIPointer"]) {
      if (!originals[name]) continue;
      proto[name] = function(location, size, type, normalized, stride, offset) {
        const program = currentProgram.get(this);
        const pid = program ? programId(program) : null;
        const programRecord = state.programs.find((item) => item.programId === pid);
        const attribute = programRecord?.attributes?.find((item) => item.location === location);
        const bound = currentBuffers.get(this)?.[this.ARRAY_BUFFER];
        rememberRecent(state.attributes, {
          at: performance.now(),
          contextId: contextId(this),
          programId: pid,
          location,
          name: attribute?.name || null,
          size,
          type,
          normalized: Boolean(normalized),
          stride,
          offset,
          bufferId: bufferId(bound),
          integer: name === "vertexAttribIPointer"
        }, 1500);
        return originals[name].apply(this, arguments);
      };
    }
    if (originals.vertexAttribDivisor) {
      proto.vertexAttribDivisor = function(location, divisor) {
        rememberRecent(state.attributes, {
          at: performance.now(),
          contextId: contextId(this),
          programId: currentProgram.get(this) ? programId(currentProgram.get(this)) : null,
          location,
          divisor
        }, 1500);
        return originals.vertexAttribDivisor.apply(this, arguments);
      };
    }

    for (const name of [
      "uniform1f", "uniform2f", "uniform3f", "uniform4f",
      "uniform1i", "uniform2i", "uniform3i", "uniform4i",
      "uniform1fv", "uniform2fv", "uniform3fv", "uniform4fv",
      "uniform1iv", "uniform2iv", "uniform3iv", "uniform4iv",
      "uniformMatrix2fv", "uniformMatrix3fv", "uniformMatrix4fv"
    ]) {
      const original = proto[name];
      if (typeof original !== "function") continue;
      proto[name] = function(location, ...values) {
        const details = uniformNames.get(location);
        if (details) {
          state.uniformWrites[details.programId + ":" + details.name] = {
            at: performance.now(),
            contextId: contextId(this),
            programId: details.programId,
            name: details.name,
            method: name,
            values: values.map(clipped)
          };
        }
        return original.call(this, location, ...values);
      };
    }

    for (const name of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
      if (!originals[name]) continue;
      proto[name] = function(mode, firstOrCount, countOrType, typeOrOffset, offsetOrInstances, maybeInstances) {
        let count;
        let instances = 1;
        if (name === "drawArrays") count = countOrType;
        else if (name === "drawElements") count = firstOrCount;
        else if (name === "drawArraysInstanced") {
          count = countOrType;
          instances = typeOrOffset;
        } else {
          count = firstOrCount;
          instances = maybeInstances;
        }
        const program = currentProgram.get(this);
        const pid = program ? programId(program) : null;
        const key = [label, name, mode, pid, count, instances].join(":");
        if (!state.drawSummary[key]) {
          state.drawSummary[key] = {
            api: label,
            method: name,
            mode,
            programId: pid,
            count,
            instances,
            calls: 0
          };
        }
        state.drawSummary[key].calls++;
        rememberRecent(state.recentDraws, {
          at: performance.now(),
          api: label,
          method: name,
          mode,
          programId: pid,
          count,
          instances
        });
        return originals[name].apply(this, arguments);
      };
    }
  }

  patch(globalThis.WebGLRenderingContext?.prototype, "WebGL1");
  patch(globalThis.WebGL2RenderingContext?.prototype, "WebGL2");

  state.inspect = (includeShaders = false) => {
    const canvases = [...document.querySelectorAll("canvas")].map((canvas) => {
      const id = canvasId(canvas);
      const context = contextRefs.find((item) => item.canvas === canvas) ||
        contextRefs.find((item) => item.canvas === canvas);
      const matchingContext = contextRefs.find((item) => {
        try { return item.canvas === canvas; } catch { return false; }
      });
      const rect = canvas.getBoundingClientRect();
      const result = {
        canvasId: id,
        className: canvas.className,
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        style: {
          opacity: getComputedStyle(canvas).opacity,
          display: getComputedStyle(canvas).display,
          visibility: getComputedStyle(canvas).visibility,
          transform: getComputedStyle(canvas).transform
        }
      };
      if (matchingContext) {
        const gl = matchingContext;
        const parameter = (name) => {
          try { return gl.getParameter(gl[name]); } catch { return null; }
        };
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        result.context = {
          contextId: contextId(gl),
          type: gl.constructor?.name,
          drawingBufferWidth: gl.drawingBufferWidth,
          drawingBufferHeight: gl.drawingBufferHeight,
          attributes: gl.getContextAttributes(),
          version: parameter("VERSION"),
          shadingLanguageVersion: parameter("SHADING_LANGUAGE_VERSION"),
          vendor: parameter("VENDOR"),
          renderer: parameter("RENDERER"),
          unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
          unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
          maxTextureSize: parameter("MAX_TEXTURE_SIZE"),
          maxVertexAttribs: parameter("MAX_VERTEX_ATTRIBS"),
          maxVertexUniformVectors: parameter("MAX_VERTEX_UNIFORM_VECTORS"),
          maxFragmentUniformVectors: parameter("MAX_FRAGMENT_UNIFORM_VECTORS"),
          extensions: gl.getSupportedExtensions()
        };
      }
      return result;
    });
    return {
      now: performance.now(),
      href: location.href,
      viewport: {
        innerWidth,
        innerHeight,
        devicePixelRatio,
        scrollX,
        scrollY,
        scrollHeight: document.documentElement.scrollHeight
      },
      canvases,
      contextCalls: state.contextCalls,
      drawSummary: Object.values(state.drawSummary),
      recentDraws: state.recentDraws.slice(-80),
      buffers: state.buffers,
      bufferUpdates: state.bufferUpdates,
      attributes: state.attributes,
      programs: state.programs,
      shaders: includeShaders ? state.shaders : undefined,
      uniformWrites: state.uniformWrites,
      errors: state.errors
    };
  };
  globalThis.__dcProbe = state;
})();
`;

function summarizeInitiator(initiator) {
  if (!initiator) return null;
  const frame =
    initiator.stack?.callFrames?.[0] ||
    initiator.stack?.parent?.callFrames?.[0] ||
    null;
  return {
    type: initiator.type || null,
    url: initiator.url || frame?.url || null,
    lineNumber: initiator.lineNumber ?? frame?.lineNumber ?? null,
    columnNumber: initiator.columnNumber ?? frame?.columnNumber ?? null,
    functionName: frame?.functionName || null
  };
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  await rm(PROFILE_DIR, { recursive: true, force: true });
  await mkdir(PROFILE_DIR, { recursive: true });

  const chromeArgs = [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${PROFILE_DIR}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-sync",
    "--disable-extensions",
    "--disable-component-update",
    "--disable-features=Translate,OptimizationHints,MediaRouter",
    "--enable-gpu",
    "--window-size=1440,900",
    "about:blank"
  ];
  const chrome = spawn(CHROME, chromeArgs, {
    stdio: ["ignore", "pipe", "pipe"]
  });
  let chromeLog = "";
  chrome.stdout.on("data", (chunk) => (chromeLog += chunk));
  chrome.stderr.on("data", (chunk) => (chromeLog += chunk));

  const portFile = path.join(PROFILE_DIR, "DevToolsActivePort");
  let client;
  try {
    await waitForFile(portFile);
    const [port] = (await readFile(portFile, "utf8")).trim().split(/\s+/);
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) =>
      response.json()
    );
    const target = targets.find((item) => item.type === "page");
    if (!target) throw new Error("Chrome did not expose a page target");
    client = new CDPClient(target.webSocketDebuggerUrl);
    await client.connect();

    let phase = "startup";
    let sequence = 0;
    const requests = [];
    const requestById = new Map();
    const phaseChanges = [];
    const consoleMessages = [];
    let lastNetworkActivity = Date.now();

    const setPhase = (name) => {
      phase = name;
      phaseChanges.push({ phase: name, at: new Date().toISOString() });
    };

    client.on("Network.requestWillBeSent", (event) => {
      if (!/^https?:/i.test(event.request.url)) return;
      lastNetworkActivity = Date.now();
      if (event.redirectResponse && requestById.has(event.requestId)) {
        requestById.get(event.requestId).redirectResponse = {
          status: event.redirectResponse.status,
          url: event.redirectResponse.url,
          mimeType: event.redirectResponse.mimeType
        };
      }
      const record = {
        sequence: ++sequence,
        requestId: event.requestId,
        url: event.request.url,
        method: event.request.method,
        resourceType: event.type || null,
        phase,
        documentURL: event.documentURL || null,
        initiator: summarizeInitiator(event.initiator),
        requestTimestamp: event.timestamp,
        wallTime: event.wallTime
          ? new Date(event.wallTime * 1000).toISOString()
          : null,
        hasUserGesture: event.hasUserGesture || false
      };
      requests.push(record);
      requestById.set(event.requestId, record);
    });
    client.on("Network.responseReceived", (event) => {
      lastNetworkActivity = Date.now();
      const record = requestById.get(event.requestId);
      if (!record) return;
      const response = event.response;
      Object.assign(record, {
        responseTimestamp: event.timestamp,
        status: response.status,
        statusText: response.statusText,
        mimeType: response.mimeType || null,
        protocol: response.protocol || null,
        fromDiskCache: Boolean(response.fromDiskCache),
        fromServiceWorker: Boolean(response.fromServiceWorker),
        remoteIPAddress: response.remoteIPAddress || null,
        remotePort: response.remotePort || null,
        responseTiming: response.timing || null,
        responseEncodedDataLength: response.encodedDataLength ?? null
      });
    });
    client.on("Network.dataReceived", (event) => {
      const record = requestById.get(event.requestId);
      if (!record) return;
      record.decodedDataLength = (record.decodedDataLength || 0) + (event.dataLength || 0);
      record.dataReceivedEncodedLength =
        (record.dataReceivedEncodedLength || 0) + (event.encodedDataLength || 0);
    });
    client.on("Network.loadingFinished", (event) => {
      lastNetworkActivity = Date.now();
      const record = requestById.get(event.requestId);
      if (!record) return;
      record.finishTimestamp = event.timestamp;
      record.encodedDataLength = event.encodedDataLength;
      if (record.requestTimestamp) {
        record.durationMs = Math.round((event.timestamp - record.requestTimestamp) * 1000);
      }
    });
    client.on("Network.loadingFailed", (event) => {
      lastNetworkActivity = Date.now();
      const record = requestById.get(event.requestId);
      if (!record) return;
      record.finishTimestamp = event.timestamp;
      record.failed = true;
      record.errorText = event.errorText;
      record.canceled = Boolean(event.canceled);
    });
    client.on("Runtime.consoleAPICalled", (event) => {
      consoleMessages.push({
        at: event.timestamp,
        type: event.type,
        text: (event.args || []).map((item) => item.value ?? item.description ?? "").join(" ")
      });
    });
    client.on("Runtime.exceptionThrown", (event) => {
      consoleMessages.push({
        at: event.timestamp,
        type: "exception",
        text: event.exceptionDetails?.text || "Runtime exception",
        description: event.exceptionDetails?.exception?.description || null
      });
    });

    await Promise.all([
      client.send("Page.enable"),
      client.send("Runtime.enable"),
      client.send("Network.enable", {
        maxTotalBufferSize: 100_000_000,
        maxResourceBufferSize: 20_000_000
      }),
      client.send("Performance.enable")
    ]);
    await client.send("Network.setCacheDisabled", { cacheDisabled: true });
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
      screenWidth: 1440,
      screenHeight: 900
    });
    await client.send("Page.addScriptToEvaluateOnNewDocument", { source: probeScript });

    const evaluate = async (expression) => {
      const result = await client.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true
      });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      }
      return result.result.value;
    };

    const waitForNetworkIdle = async (quietMs = 1200, timeoutMs = 20_000) => {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        if (Date.now() - lastNetworkActivity >= quietMs) return;
        await sleep(100);
      }
    };

    const screenshot = async (name) => {
      const result = await client.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false
      });
      await writeFile(path.join(SCREENSHOT_DIR, name), Buffer.from(result.data, "base64"));
    };

    const getPageState = async (label, normalizedScroll = null) =>
      evaluate(`(() => {
        const section = document.querySelector(".defining-intelligence-section");
        const sectionRect = section?.getBoundingClientRect();
        const sectionStart = section ? sectionRect.top + scrollY : 0;
        const sectionEnd = section ? sectionStart + section.offsetHeight - innerHeight : 0;
        const texts = section
          ? [...section.querySelectorAll("h1,h2,h3,p")].map((element, index) => {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return {
                index,
                tag: element.tagName,
                text: (element.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 500),
                className: element.className,
                opacity: style.opacity,
                visibility: style.visibility,
                display: style.display,
                transform: style.transform,
                reveal: style.getPropertyValue("--reveal") || element.style.getPropertyValue("--reveal") || null,
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
              };
            })
          : [];
        const animatedElements = section
          ? [...section.querySelectorAll("[style]")].filter((element) => {
              const style = element.getAttribute("style") || "";
              return /opacity|transform|--reveal/.test(style);
            }).slice(0, 100).map((element, index) => {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return {
                index,
                tag: element.tagName,
                className: element.className,
                text: (element.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 180),
                inlineStyle: element.getAttribute("style"),
                opacity: style.opacity,
                transform: style.transform,
                reveal: style.getPropertyValue("--reveal") || null,
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
              };
            })
          : [];
        const morph = globalThis.__morph;
        return {
          label: ${JSON.stringify(label)},
          normalizedScroll: ${JSON.stringify(normalizedScroll)},
          capturedAt: new Date().toISOString(),
          section: section ? {
            offsetHeight: section.offsetHeight,
            start: sectionStart,
            end: sectionEnd,
            rect: {
              x: sectionRect.x,
              y: sectionRect.y,
              width: sectionRect.width,
              height: sectionRect.height
            }
          } : null,
          texts,
          animatedElements,
          probe: globalThis.__dcProbe?.inspect?.() || null,
          morph: morph ? {
            scroll: morph.scroll,
            introT: morph.introT,
            finalProgress: morph.finalProgress,
            densityScale: morph.densityScale,
            transitionSpeed: morph.transitionSpeed,
            mouseX: morph.mouseX,
            mouseY: morph.mouseY,
            cameraRotX: morph.cameraRotX,
            cameraRotY: morph.cameraRotY,
            viewportWidth: morph.viewportWidth,
            viewportHeight: morph.viewportHeight,
            sourceAspect: morph.sourceAspect,
            lastParticleTarget: morph.lastParticleTarget,
            sceneState: morph.getSceneState?.() || null,
            timelinePhases: morph.timelinePhases?.() || null,
            sources: (morph.sources || []).map((source) => ({
              label: source.label,
              src: source.src,
              flipY: source.flipY,
              enterDirection: source.enterDirection,
              exitDirection: source.exitDirection,
              depthGamma: source.depthGamma,
              holdMultiplier: source.holdMultiplier,
              textRevealSpeed: source.textRevealSpeed,
              transitionInScale: source.transitionInScale,
              playbackEndAt: source.playbackEndAt,
              reverse: source.reverse
            })),
            records: (morph.records || []).map((record) => ({
              duration: record.duration,
              aspect: record.aspect,
              isReady: record.isReady,
              loadFailed: record.loadFailed,
              currentTime: record.video?.currentTime,
              videoWidth: record.video?.videoWidth,
              videoHeight: record.video?.videoHeight,
              seeking: record.video?.seeking
            }))
          } : null,
          globals: {
            nextFlightData: Array.isArray(globalThis.__next_f),
            nextData: Boolean(globalThis.__NEXT_DATA__),
            reactRootCount: document.querySelectorAll("[data-reactroot],next-route-announcer").length
          },
          userAgent: navigator.userAgent
        };
      })()`);

    const scrollToFraction = async (fraction, settleMs = 350) => {
      await evaluate(`(() => {
        const section = document.querySelector(".defining-intelligence-section");
        if (!section) return false;
        const start = section.getBoundingClientRect().top + scrollY;
        const end = start + section.offsetHeight - innerHeight;
        scrollTo(0, start + (end - start) * ${fraction});
        return true;
      })()`);
      await sleep(settleMs);
    };

    const mouseMove = async (x, y) => {
      await client.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x,
        y,
        modifiers: 0
      });
    };

    const measureAnimationFrames = async (durationMs) =>
      evaluate(`new Promise((resolve) => {
        const timings = [];
        const started = performance.now();
        let previous = started;
        function frame(now) {
          timings.push(now - previous);
          previous = now;
          if (now - started < ${durationMs}) requestAnimationFrame(frame);
          else {
            const sorted = timings.slice(1).sort((a, b) => a - b);
            const percentile = (value) =>
              sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))] || null;
            resolve({
              durationMs: now - started,
              frameCount: timings.length,
              estimatedFps: timings.length / ((now - started) / 1000),
              meanFrameMs: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
              p50FrameMs: percentile(0.5),
              p95FrameMs: percentile(0.95),
              maxFrameMs: sorted[sorted.length - 1] || null
            });
          }
        }
        requestAnimationFrame(frame);
      })`);

    setPhase("desktop-load");
    await client.send("Page.navigate", { url: TARGET_URL });
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 20_000);
      client.on("Page.loadEventFired", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    await waitForNetworkIdle();
    await sleep(2500);

    const timeline = [];
    const desktopStart = await getPageState("desktop-start", 0);
    timeline.push(desktopStart);
    await screenshot("desktop-scroll-000.png");

    const sampleFractions = Array.from({ length: 101 }, (_, index) => index / 100);
    const screenshotFractions = new Map([
      [0.1, "desktop-scroll-010.png"],
      [0.25, "desktop-scroll-025.png"],
      [0.4, "desktop-scroll-040.png"],
      [0.55, "desktop-scroll-055.png"],
      [0.7, "desktop-scroll-070.png"],
      [0.85, "desktop-scroll-085.png"],
      [1, "desktop-scroll-100.png"]
    ]);
    for (const fraction of sampleFractions.slice(1)) {
      setPhase(`desktop-scroll-${String(Math.round(fraction * 100)).padStart(3, "0")}`);
      await scrollToFraction(fraction);
      timeline.push(await getPageState(`desktop-${fraction.toFixed(2)}`, fraction));
      const screenshotName = screenshotFractions.get(Number(fraction.toFixed(2)));
      if (screenshotName) await screenshot(screenshotName);
    }
    await waitForNetworkIdle();

    const pointer = [];
    await scrollToFraction(0.55, 1000);
    const pointerPositions = [
      ["center", 720, 450],
      ["left", 24, 450],
      ["right", 1416, 450],
      ["top", 720, 24],
      ["bottom", 720, 876],
      ["top-left", 24, 24],
      ["top-right", 1416, 24],
      ["bottom-left", 24, 876],
      ["bottom-right", 1416, 876],
      ["center-return", 720, 450]
    ];
    for (const [name, x, y] of pointerPositions) {
      setPhase(`pointer-${name}`);
      await mouseMove(x, y);
      await sleep(1200);
      pointer.push({
        name,
        x,
        y,
        state: await getPageState(`pointer-${name}`, 0.55)
      });
      if (["center", "top-left", "bottom-right"].includes(name)) {
        await screenshot(`desktop-pointer-${name}.png`);
      }
    }

    setPhase("idle-test");
    await mouseMove(720, 450);
    const idle = [];
    for (const [name, delay] of [["t0", 0], ["t1", 1000], ["t3", 2000], ["t6", 3000]]) {
      if (delay) await sleep(delay);
      idle.push({
        name,
        elapsedMs: { t0: 0, t1: 1000, t3: 3000, t6: 6000 }[name],
        state: await getPageState(`idle-${name}`, 0.55)
      });
      if (name === "t0" || name === "t6") await screenshot(`desktop-idle-${name}.png`);
    }

    const desktopRaf = await measureAnimationFrames(5000);
    const desktopProbe = await evaluate("globalThis.__dcProbe?.inspect?.(true) || null");
    const desktopPerformance = await client.send("Performance.getMetrics");
    await writeFile(
      path.join(RAW_DIR, "runtime-probe-desktop.json"),
      JSON.stringify(desktopProbe, null, 2)
    );

    setPhase("high-dpr-resize");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1200,
      height: 800,
      deviceScaleFactor: 3,
      mobile: false,
      screenWidth: 1200,
      screenHeight: 800
    });
    await sleep(1500);
    const highDprState = await getPageState("high-dpr-resize", 0.55);

    setPhase("mobile-load");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
      screenWidth: 390,
      screenHeight: 844
    });
    lastNetworkActivity = Date.now();
    await client.send("Page.reload", { ignoreCache: true });
    await sleep(5000);
    await waitForNetworkIdle();
    const mobileStates = [];
    for (const fraction of [0, 0.25, 0.55, 0.85, 1]) {
      setPhase(`mobile-scroll-${String(Math.round(fraction * 100)).padStart(3, "0")}`);
      await scrollToFraction(fraction, 600);
      mobileStates.push(await getPageState(`mobile-${fraction.toFixed(2)}`, fraction));
      if ([0, 0.55, 1].includes(fraction)) {
        await screenshot(`mobile-scroll-${String(Math.round(fraction * 100)).padStart(3, "0")}.png`);
      }
    }
    await waitForNetworkIdle();
    const mobileRaf = await measureAnimationFrames(3000);
    const mobileProbe = await evaluate("globalThis.__dcProbe?.inspect?.(true) || null");
    const mobilePerformance = await client.send("Performance.getMetrics");

    await writeFile(
      path.join(RAW_DIR, "runtime-probe-mobile.json"),
      JSON.stringify(mobileProbe, null, 2)
    );
    await writeFile(
      path.join(RAW_DIR, "timeline-samples.json"),
      JSON.stringify(timeline, null, 2)
    );
    await writeFile(
      path.join(RAW_DIR, "pointer-samples.json"),
      JSON.stringify(pointer, null, 2)
    );
    await writeFile(
      path.join(RAW_DIR, "idle-samples.json"),
      JSON.stringify(idle, null, 2)
    );
    await writeFile(
      path.join(RAW_DIR, "responsive-samples.json"),
      JSON.stringify({ desktopStart, highDprState, mobileStates }, null, 2)
    );
    await writeFile(
      path.join(RAW_DIR, "performance-metrics.json"),
      JSON.stringify(
        {
          desktop: desktopPerformance.metrics,
          mobile: mobilePerformance.metrics,
          animationFrames: {
            desktop: desktopRaf,
            mobile: mobileRaf
          }
        },
        null,
        2
      )
    );
    await writeFile(
      path.join(RAW_DIR, "console.json"),
      JSON.stringify(consoleMessages, null, 2)
    );

    const initialHtml = await readFile(path.join(RESEARCH_DIR, "index.html"), "utf8");
    const initialUrls = new Set(
      [...initialHtml.matchAll(/(?:src|href)="([^"]+)"/g)]
        .map((match) => {
          try {
            return new URL(match[1], TARGET_URL).href;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    );
    const cleanRequests = requests
      .filter((record) => /^https?:/i.test(record.url))
      .map((record) => ({
        ...record,
        initialHtmlReference: initialUrls.has(record.url),
        dynamic:
          record.resourceType === "Script" &&
          !initialUrls.has(record.url)
      }))
      .sort((a, b) => a.sequence - b.sequence);
    await writeFile(
      path.join(RESEARCH_DIR, "network-requests.json"),
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          target: TARGET_URL,
          browser: "Google Chrome",
          chromeExecutable: CHROME,
          scenarios: [
            { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 2 },
            { name: "high-dpr-resize", width: 1200, height: 800, deviceScaleFactor: 3 },
            { name: "mobile", width: 390, height: 844, deviceScaleFactor: 3 }
          ],
          phaseChanges,
          requests: cleanRequests
        },
        null,
        2
      )
    );
    await writeFile(path.join(RAW_DIR, "chrome.log"), chromeLog);
    console.log(`Captured ${cleanRequests.length} requests.`);
    console.log(`Desktop programs: ${desktopProbe?.programs?.length ?? 0}.`);
    console.log(`Mobile programs: ${mobileProbe?.programs?.length ?? 0}.`);
  } finally {
    client?.close();
    if (chrome.exitCode == null) chrome.kill("SIGTERM");
    await sleep(500);
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
