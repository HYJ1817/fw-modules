/* Injected into the standalone trace build; no network requests of its own. */
var FWT_NS = "hyj1817.fw.trace.logs";
var FWT_MEMORY = [];
var FWT_STORAGE = "memory-only";
var FWT_COUNTER = 0;

function fwtEvents() {
  try {
    if (Widget.sharedCache && typeof Widget.sharedCache.get === "function") {
      var data = Widget.sharedCache.get(FWT_NS, "events");
      if (typeof data === "string") {
        var events = JSON.parse(data);
        if (Array.isArray(events)) return events.slice(-60);
      }
    }
  } catch (e) {}
  return FWT_MEMORY.slice(-60);
}

function fwtSave(events) {
  FWT_MEMORY = events.slice(-60);
  FWT_STORAGE = "memory-only";
  try {
    if (Widget.sharedCache && typeof Widget.sharedCache.set === "function" && typeof Widget.sharedCache.get === "function") {
      var text = JSON.stringify(FWT_MEMORY);
      Widget.sharedCache.set(FWT_NS, "events", text);
      if (Widget.sharedCache.get(FWT_NS, "events") === text) FWT_STORAGE = "sharedCache";
    }
  } catch (e) {}
}

function fwtLog(value) {
  try { console.log("FW_TRACE " + JSON.stringify(value)); } catch (e) {}
}

function fwtRecord(event, details) {
  var value = { event: event, at: new Date().toISOString(), details: details };
  var events = fwtEvents();
  events.push(value);
  fwtSave(events);
  fwtLog(value);
}

function fwtType(value) {
  return value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
}

function fwtParams(params) {
  var input = params && typeof params === "object" && !Array.isArray(params) ? params : {};
  var fields = {};
  ["id", "link", "url", "videoUrl", "title", "seriesName", "episodeName", "type", "mediaType", "episode", "season", "tmdbId", "imdbId"].forEach(function (key) {
    var value = input[key];
    fields[key] = { present: value !== undefined && value !== null && value !== "", type: fwtType(value) };
  });
  var route = "none";
  [typeof params === "string" ? params : "", input.id, input.link, input.url].some(function (value) {
    if (typeof value !== "string") return false;
    var match = value.match(/^(hstream|yinhentai|hanime|4kvm)(?::|%3a)/i);
    if (match) { route = match[1].toLowerCase(); return true; }
    return false;
  });
  return { inputType: fwtType(params), fields: fields, route: route, builtinTest: input.id === "forward-test-media" };
}

function fwtId() {
  return Date.now().toString(36) + "-" + (++FWT_COUNTER) + "-" + Math.random().toString(36).slice(2, 7);
}

function fwtError(error) {
  var name = error && error.name;
  return ["Error", "TypeError", "ReferenceError", "SyntaxError", "TimeoutError", "AbortError"].indexOf(name) >= 0 ? name : "Error";
}

function fwtWrap(name, fn) {
  return async function (params) {
    var id = fwtId(), started = Date.now();
    fwtRecord("entry-start", { entry: name, call: id, params: fwtParams(params) });
    try {
      var result = await fn.apply(this, arguments);
      fwtRecord("entry-end", { entry: name, call: id, elapsedMs: Date.now() - started, resultType: fwtType(result), count: Array.isArray(result) ? result.length : null });
      return result;
    } catch (error) {
      fwtRecord("entry-error", { entry: name, call: id, elapsedMs: Date.now() - started, errorType: fwtError(error) });
      throw error;
    }
  };
}

function fwtConsole(scope) {
  return {
    log: function () { fwtRecord("source-note", { scope: scope }); },
    error: function () { fwtRecord("source-note", { scope: scope }); }
  };
}

function fwtHost(scope) {
  var host = Widget;
  var proxy = Object.create(host);
  proxy.sharedCache = null;
  proxy.storage = null;
  proxy.http = Object.create(host.http || {});
  ["get", "post"].forEach(function (method) {
    proxy.http[method] = async function () {
      var args = arguments, id = fwtId(), started = Date.now();
      var options = args[method === "get" ? 1 : 2];
      var stage = typeof args[0] === "string" && /\/(?:api|wp-json)\//.test(args[0]) ? "api" : "document-or-media";
      fwtRecord("http-start", { scope: scope, request: id, method: method, stage: stage, timeoutMs: options && typeof options.timeout === "number" ? options.timeout : null });
      try {
        var response = await host.http[method].apply(host.http, args);
        var status = response && (response.statusCode || response.status);
        fwtRecord("http-end", { scope: scope, request: id, elapsedMs: Date.now() - started, status: typeof status === "number" ? status : null, bodyType: fwtType(response && response.data) });
        return response;
      } catch (error) {
        fwtRecord("http-error", { scope: scope, request: id, elapsedMs: Date.now() - started, errorType: fwtError(error) });
        throw error;
      }
    };
  });
  return proxy;
}

async function startTrace() {
  fwtSave([]);
  fwtRecord("session-start", { version: WidgetMetadata.version, timers: typeof setTimeout === "function", clearTimers: typeof clearTimeout === "function", persistence: FWT_STORAGE });
  fwtLog({ note: "请从本诊断副本的首页重试，然后运行读取记录。只复制 FW_TRACE 行；宿主 debug 行可能包含请求凭据。" });
  return [];
}

async function readTrace() {
  var events = fwtEvents();
  fwtLog({ event: "report", version: WidgetMetadata.version, count: events.length, note: "没有入口记录不等于网站失败；请确认从诊断副本操作。末尾只有 start 可能仍在等待，也可能宿主已终止执行。" });
  events.forEach(fwtLog);
  if (!events.length) fwtLog({ event: "NO_TRACE", note: "没有可读取的记录，请先开始新记录；若缓存不可用，只能在原调用日志查看。" });
  return [];
}
