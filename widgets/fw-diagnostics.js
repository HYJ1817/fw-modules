/* Independent, metadata-only diagnostics. Never fetches or returns media. */
var WidgetMetadata = {
  id: "hyj1817.fw.diagnostics",
  title: "FW 独立诊断",
  description: "检查运行环境和播放源调用参数；不提供线路，不修改 FW 总模块。报告见各测试入口的运行日志。",
  author: "HYJ1817",
  site: "https://github.com/HYJ1817/fw-modules",
  icon: "https://raw.githubusercontent.com/HYJ1817/fw-modules/refs/heads/main/icon.png",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  detailCacheDuration: 0,
  modules: [
    { id: "environment", title: "1. 环境自检（查看运行日志）", functionName: "runEnvironmentCheck", requiresWebView: false, cacheDuration: 0, params: [] },
    { id: "lastCall", title: "2. 读取最近调用记录（查看运行日志）", functionName: "readLastCall", requiresWebView: false, cacheDuration: 0, params: [] },
    { id: "loadResource", title: "诊断监听（不提供播放线路）", functionName: "loadResource", type: "stream", cacheDuration: 0, params: [] }
  ]
};

var DIAG_NS = "hyj1817.fw.diagnostics";
var DIAG_LAST = null;

function diagHost() {
  return typeof Widget !== "undefined" && Widget ? Widget : {};
}

function diagLog(report) {
  console.log("FW_DIAG " + JSON.stringify(report));
}

function diagType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function diagRead(key) {
  var host = diagHost();
  try {
    if (host.sharedCache && typeof host.sharedCache.get === "function") {
      var shared = host.sharedCache.get(DIAG_NS, key);
      if (shared !== undefined && shared !== null) return shared;
    }
  } catch (e) {}
  try {
    if (host.storage && typeof host.storage.get === "function") {
      return host.storage.get(DIAG_NS + ":" + key);
    }
  } catch (e) {}
  return null;
}

function diagWrite(key, value) {
  var host = diagHost();
  try {
    if (host.sharedCache && typeof host.sharedCache.set === "function" && typeof host.sharedCache.get === "function") {
      host.sharedCache.set(DIAG_NS, key, value);
      if (diagRead(key) === value) return "sharedCache";
    }
  } catch (e) {}
  try {
    if (host.storage && typeof host.storage.set === "function" && typeof host.storage.get === "function") {
      host.storage.set(DIAG_NS + ":" + key, value);
      if (host.storage.get(DIAG_NS + ":" + key) === value) return "storage";
    }
  } catch (e) {}
  return "memory-only";
}

function diagFields(params) {
  var input = params && typeof params === "object" && !Array.isArray(params) ? params : {};
  var fields = {};
  // Never enumerate arbitrary keys or persist raw values, even on errors.
  ["id", "link", "url", "videoUrl", "title", "seriesName", "episodeName", "type", "mediaType", "season", "episode", "tmdbId", "imdbId"].forEach(function (key) {
    var value = input[key];
    fields[key] = { present: value !== undefined && value !== null && value !== "", type: diagType(value) };
  });
  return fields;
}

async function runEnvironmentCheck() {
  var host = diagHost();
  var probe = "diag-" + Date.now();
  var persistence = diagWrite("probe", probe);
  diagLog({
    event: "environment", version: WidgetMetadata.version, at: new Date().toISOString(),
    capabilities: {
      setTimeout: typeof setTimeout === "function",
      clearTimeout: typeof clearTimeout === "function",
      Promise: typeof Promise === "function",
      URL: typeof URL === "function",
      httpGet: !!(host.http && typeof host.http.get === "function")
    },
    persistence: persistence, roundTrip: diagRead("probe") === probe,
    note: "仅检测本模块环境；未发出网络请求，不代表网站可用。"
  });
  return [];
}

async function loadResource(params) {
  var report = {
    event: "stream-entry", version: WidgetMetadata.version, at: new Date().toISOString(),
    inputType: diagType(params),
    builtinTest: !!(params && params.id === "forward-test-media"),
    fields: diagFields(params)
  };
  // Store only this redacted report. No raw params, URLs or exceptions enter storage.
  DIAG_LAST = report;
  var persistence = diagWrite("lastCall", JSON.stringify(report));
  diagLog({ event: "capture", persistence: persistence, report: report, returnedResources: 0 });
  return [];
}

async function readLastCall() {
  var saved = diagRead("lastCall"), report = null;
  try {
    if (typeof saved === "string") report = JSON.parse(saved);
  } catch (e) {}
  if (!report) report = DIAG_LAST;
  if (!report || report.event !== "stream-entry") {
    diagLog({ event: "NO_CAPTURE", note: "暂无本诊断模块的调用记录。可能未被调用、未启用或缓存不可用；不能据此判断 FW 总模块是否执行。请先运行环境自检。" });
  } else {
    diagLog({ event: "last-call", report: report, note: "仅为独立诊断模块收到的参数，不是 FW 总模块内部请求日志。请核对时间和 builtinTest，避免把历史或模拟记录当作本次播放。" });
  }
  return [];
}
