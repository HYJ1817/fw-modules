/** Hanime.tv playback source for Forward. */
WidgetMetadata = {
  id: "hyj1817.hanime.resource",
  title: "Hanime 播放源",
  icon: "https://hanime.tv/favicon.ico",
  version: "1.1.0",
  requiredVersion: "0.0.1",
  description: "Hanime 多画质播放源；支持自建的已认证解析服务，并兼容旧版直链",
  author: "Forward Widgets",
  site: "https://hanime.tv",
  globalParams: [
    { name: "multiSource", title: "是否启用聚合搜索", type: "enumeration", value: "enabled", enumOptions: [{ title: "启用", value: "enabled" }, { title: "禁用", value: "disabled" }] },
    { name: "resolverUrl", title: "Hanime 解析地址", type: "input", description: "填写已配置账号的自建 Hanime Stremio manifest 地址，或包含 {slug} 的完整解析地址" },
    { name: "sessionToken", title: "Hanime 会话令牌（可选）", type: "input", description: "只填写你自己的 Hanime session token；匿名流可留空" },
  ],
  modules: [{ id: "loadResource", title: "加载资源", functionName: "loadResource", type: "stream", cacheDuration: 0, params: [] }],
};

var BASE = "https://hanime.tv";
var UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";

function parseData(response) {
  var data = response && response.data;
  if (typeof data === "string") { try { return JSON.parse(data); } catch (e) {} }
  return data;
}

function slugFromParams(params) {
  params = params || {};
  var values = [params.link, params.id, params.url];
  for (var i = 0; i < values.length; i++) {
    var value = String(values[i] || "");
    var match = value.match(/(?:hanime(?::|%3A)|\/videos\/hentai\/)([^?#/]+)/i);
    if (match) return match[1];
  }
  return "";
}

function requestHeaders(slug, token, json) {
  var headers = { "User-Agent": UA, Accept: json ? "application/json" : "text/html,application/xhtml+xml,*/*", Origin: BASE, Referer: BASE + "/videos/hentai/" + slug };
  if (json) headers["Content-Type"] = "application/json;charset=UTF-8";
  if (token) {
    if (/^[^=;]+=[^;]+/.test(token)) headers.Cookie = token;
    else {
      headers.Authorization = "Bearer " + token;
      headers["X-Session-Token"] = token;
    }
  }
  return headers;
}

function streamCandidates(payload) {
  payload = payload || {};
  var output = [];
  function walk(value, label, depth) {
    if (depth > 8 || value === null || value === undefined) return;
    if (typeof value === "string") {
      var normalized = value.replace(/\\u002F/g, "/").replace(/\\\//g, "/");
      if (/^https?:\/\/.+\.(?:m3u8|mp4)(?:[?#].*)?$/i.test(normalized) || /^https?:\/\/[^\s]+\/hls\//i.test(normalized)) output.push({ url: normalized, name: label || "Hanime" });
      return;
    }
    if (Array.isArray(value)) { for (var i = 0; i < value.length; i++) walk(value[i], label, depth + 1); return; }
    if (typeof value === "object") {
      if (typeof value.url === "string") walk(value.url, value.name || value.label || value.height || value.quality || label, depth + 1);
      for (var key in value) if (key !== "url") walk(value[key], value.name || value.label || value.height || value.quality || key, depth + 1);
    }
  }
  walk(payload, "Hanime", 0);
  return output;
}

function resourcesFromPayload(payload, slug) {
  var candidates = streamCandidates(payload);
  var resources = [], seen = {};
  for (var i = 0; i < candidates.length; i++) {
    var url = candidates[i].url;
    if (!url || seen[url]) continue;
    seen[url] = true;
    var quality = String(candidates[i].name || "").match(/\d{3,4}/);
    resources.push({
      name: "Hanime" + (quality ? " · " + quality[0] + "p" : "") + (resources.length ? " · 备用" : ""),
      description: /\.m3u8|\/hls\//i.test(url) ? "HLS" : "MP4",
      url: url,
      customHeaders: { "User-Agent": UA, Referer: BASE + "/videos/hentai/" + slug, Origin: BASE },
      playerType: "app",
    });
  }
  return resources;
}

function resourcesFromHtml(html, slug) {
  html = String(html || "");
  var urls = [];
  var pattern = /https?:\\?\/\\?\/[^"'<>\s]+?(?:\.m3u8|\.mp4|\/hls\/[^"'<>\s\\]+)(?:\?[^"'<>\s]*)?/gi;
  var match;
  while ((match = pattern.exec(html))) urls.push(match[0].replace(/\\u002F/g, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&"));
  return resourcesFromPayload({ streams: urls }, slug);
}

function resolverStreamUrl(value, slug) {
  var url = String(value || "").trim();
  if (!url) return "";
  var encodedSlug = encodeURIComponent(slug);
  var encodedId = encodeURIComponent("hanime:" + slug);
  if (url.indexOf("{slug}") >= 0) return url.replace(/\{slug\}/g, encodedSlug).replace(/\{id\}/g, encodedId);
  if (url.indexOf("{id}") >= 0) return url.replace(/\{id\}/g, encodedId);
  url = url.replace(/\/+$/, "");
  if (/\/manifest\.json(?:\?.*)?$/i.test(url)) return url.replace(/\/manifest\.json(?:\?.*)?$/i, "/stream/movie/" + encodedId + ".json");
  return url + "/stream/movie/" + encodedId + ".json";
}

async function get(url, headers) {
  return Widget.http.get(url, { headers: headers, timeout: 15000 });
}

async function loadResource(params) {
  params = params || {};
  if (params.multiSource === "disabled") return [];
  var slug = slugFromParams(params);
  if (!slug) return [];
  var token = String(params.sessionToken || "").trim();
  var resolverUrl = resolverStreamUrl(params.resolverUrl, slug);
  if (resolverUrl) {
    try {
      var resolved = await get(resolverUrl, requestHeaders(slug, token, true));
      var modern = resourcesFromPayload(parseData(resolved), slug);
      if (modern.length) return modern;
    } catch (resolverError) { console.log("Hanime resolver failed: " + resolverError.message); }
  }
  try {
    var api = await get(BASE + "/api/v8/video?id=" + encodeURIComponent(slug), requestHeaders(slug, token, false));
    var fromApi = resourcesFromPayload(parseData(api), slug);
    if (fromApi.length) return fromApi;
  } catch (e) { console.log("Hanime v8 fallback: " + e.message); }
  try {
    var page = await get(BASE + "/videos/hentai/" + slug, requestHeaders(slug, token, false));
    return resourcesFromHtml(page && page.data, slug);
  } catch (e2) { console.log("Hanime resource failed: " + e2.message); return []; }
}
