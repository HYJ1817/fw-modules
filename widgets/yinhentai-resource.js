/** YinHentai playback source for Forward. */
WidgetMetadata = {
  id: "hyj1817.yinhentai.resource",
  title: "YinHentai 播放源",
  icon: "https://hyj1817.github.io/fw-modules/icon.png",
  version: "1.1.1",
  requiredVersion: "0.0.1",
  description: "YinHentai HLS/MP4 多线路播放源",
  author: "Forward Widgets",
  site: "https://yinhentai.com",
  globalParams: [{ name: "multiSource", title: "是否启用聚合搜索", type: "enumeration", value: "enabled", enumOptions: [{ title: "启用", value: "enabled" }, { title: "禁用", value: "disabled" }] }],
  modules: [{ id: "loadResource", title: "加载资源", functionName: "loadResource", type: "stream", cacheDuration: 0, params: [] }],
};

var BASE = "https://yinhentai.com";
var UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";

function normalizeSlug(value) {
  return decodeURIComponent(String(value || "")).replace(/^yinhentai:/i, "").replace(/^https?:\/\/[^/]+/i, "").replace(/^\/(?:watch|video|videos|hentai|anime)\//i, "").replace(/^\/+|\/+$/g, "").replace(/[?#].*$/, "");
}

function slugFromParams(params) {
  params = params || {};
  var values = [params.link, params.id, params.url];
  for (var i = 0; i < values.length; i++) {
    var value = String(values[i] || "");
    if (/^yinhentai(?::|%3A)/i.test(value) || /\/(?:watch|video|videos|hentai|anime)\//i.test(value) || /^https?:\/\/yinhentai\.com\/\d+/i.test(value)) return normalizeSlug(value.replace(/^yinhentai%3A/i, "yinhentai:"));
  }
  return "";
}

function pageUrl(slug) { return BASE + "/" + slug; }

function decodeBase64(value) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var output = "", buffer = 0, bits = 0;
  value = String(value || "").replace(/-/g, "+").replace(/_/g, "/").replace(/[^A-Za-z0-9+/=]/g, "");
  for (var i = 0; i < value.length; i++) {
    var index = chars.indexOf(value.charAt(i));
    if (index < 0 || index === 64) break;
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) { bits -= 8; output += String.fromCharCode((buffer >> bits) & 255); }
  }
  return output;
}

function resource(url, slug, index, label) {
  return {
    name: "YinHentai" + (label ? " · " + label : "") + (index ? " · 备用" : ""),
    description: /\.m3u8|\/hls\//i.test(url) ? "HLS" : "MP4",
    url: url,
    customHeaders: { "User-Agent": UA, Referer: pageUrl(slug), Origin: BASE },
    playerType: "app",
  };
}

function normalizeMediaUrl(value) {
  return String(value || "").replace(/\\u002F/g, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&").replace(/%3A/ig, ":").replace(/%2F/ig, "/");
}

function extractResources(payload, slug) {
  var urls = [], labels = [];
  function add(url, label) {
    url = normalizeMediaUrl(url);
    if (/^\/\//.test(url)) url = "https:" + url;
    if (/^\//.test(url)) url = BASE + url;
    if (/^https?:\/\//i.test(url) && (/(?:\.m3u8|\.mp4)(?:[?#]|$)/i.test(url) || /\/hls\//i.test(url))) { urls.push(url); labels.push(label || ""); }
  }
  function walk(value, label, depth) {
    if (depth > 8 || value === null || value === undefined) return;
    if (typeof value === "string") {
      var text = normalizeMediaUrl(value);
      if (/^https?:\/\//i.test(text) || /^\//.test(text)) add(text, label);
      var match, pattern = /(?:https?:)?\\?\/\\?\/[^"'<>\s]+?(?:\.m3u8|\.mp4)(?:\?[^"'<>\s]*)?/gi;
      while ((match = pattern.exec(value))) add(match[0], label);
      return;
    }
    if (Array.isArray(value)) { for (var i = 0; i < value.length; i++) walk(value[i], label, depth + 1); return; }
    if (typeof value === "object") {
      if (value.file || value.src || value.url) walk(value.file || value.src || value.url, value.label || value.quality || value.name || label, depth + 1);
      for (var key in value) if (key !== "file" && key !== "src" && key !== "url") walk(value[key], value.label || value.quality || value.name || key, depth + 1);
    }
  }
  walk(payload, "", 0);
  var seen = {}, output = [];
  for (var i = 0; i < urls.length; i++) if (!seen[urls[i]]) { seen[urls[i]] = true; output.push(resource(urls[i], slug, output.length, labels[i])); }
  return output;
}

function iframeUrls(html) {
  var result = [], match, pattern = /<iframe[^>]+(?:data-src|src)=["']([^"']+)["']/gi;
  while ((match = pattern.exec(String(html || "")))) {
    var url = normalizeMediaUrl(match[1]);
    if (url.indexOf("//") === 0) url = "https:" + url;
    else if (url.charAt(0) === "/") url = BASE + url;
    if (/^https?:\/\//i.test(url)) result.push(url);
  }
  return result;
}

function resourcesFromIframeData(html, slug) {
  var frames = iframeUrls(html), output = [];
  for (var i = 0; i < frames.length; i++) {
    var match = frames[i].match(/[?&]data=([^&#]+)/i);
    if (!match) continue;
    var decoded = decodeBase64(decodeURIComponent(match[1]));
    var found = extractResources(decoded, slug);
    for (var j = 0; j < found.length; j++) output.push(found[j]);
  }
  return output;
}

function parseData(response) {
  var data = response && response.data;
  if (typeof data === "string") { try { return JSON.parse(data); } catch (e) {} }
  return data;
}

async function get(url, referer, acceptJson) {
  return Widget.http.get(url, { headers: { "User-Agent": UA, Accept: acceptJson ? "application/json" : "text/html,application/xhtml+xml,*/*", Referer: referer || BASE + "/", Origin: BASE }, timeout: 15000 });
}

async function loadResource(params) {
  params = params || {};
  if (params.multiSource === "disabled") return [];
  var slug = slugFromParams(params);
  if (!slug) return [];
  var paths = ["/" + slug, "/watch/" + slug, "/video/" + slug, "/videos/" + slug, "/hentai/" + slug, "/anime/" + slug];
  for (var i = 0; i < paths.length; i++) {
    try {
      var page = await get(BASE + paths[i], BASE + "/", false);
      var html = page && page.data;
      var direct = extractResources(html, slug);
      if (direct.length) return direct;
      var encoded = resourcesFromIframeData(html, slug);
      if (encoded.length) return encoded;
      var frames = iframeUrls(html);
      for (var f = 0; f < frames.length; f++) {
        try { var frame = await get(frames[f], BASE + paths[i], false); var framed = extractResources(frame && frame.data, slug); if (framed.length) return framed; } catch (frameError) { console.log("YinHentai iframe fallback: " + frameError.message); }
      }
    } catch (pageError) { console.log("YinHentai page fallback: " + pageError.message); }
  }
  var apis = ["/api/video/" + slug, "/api/videos/" + slug, "/api/watch/" + slug, "/wp-json/wp/v2/search?search=" + encodeURIComponent(slug)];
  for (var a = 0; a < apis.length; a++) {
    try { var api = await get(BASE + apis[a], pageUrl(slug), true); var apiResources = extractResources(parseData(api), slug); if (apiResources.length) return apiResources; } catch (apiError) { console.log("YinHentai API fallback: " + apiError.message); }
  }
  return [];
}
