/** 4KVM playback source for Forward. */
WidgetMetadata = {
  id: "fourkvm_resource",
  title: "4KVM 播放源",
  icon: "https://www.4kvm.net/favicon.ico",
  version: "1.0.1",
  requiredVersion: "0.0.1",
  description: "4KVM 电影、电视剧与动漫的 HLS 播放源",
  author: "Forward Widgets",
  site: "https://www.4kvm.net",
  globalParams: [{ name: "multiSource", title: "是否启用聚合搜索", type: "enumeration", value: "enabled", enumOptions: [{ title: "启用", value: "enabled" }, { title: "禁用", value: "disabled" }] }],
  modules: [{ id: "loadResource", title: "加载资源", functionName: "loadResource", type: "stream", cacheDuration: 0, params: [] }],
};

var BASE = "https://www.4kvm.net";
var DEFAULT_WASM = "/static/wasm/nbmovie_wasm_bg.d5d51939.wasm";
var UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";

function decodeEntities(value) {
  return String(value || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function stripTags(value) {
  return decodeEntities(String(value || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function attr(attrs, name) {
  var match = String(attrs || "").match(new RegExp("\\b" + name + "\\s*=\\s*[\"']([^\"']*)[\"']", "i"));
  return match ? decodeEntities(match[1]) : "";
}

function normalizeTitle(value) {
  return stripTags(value).toLowerCase().replace(/[：:·・—_\-–（）()\[\]【】\s]/g, "").replace(/第0*(\d+)季/g, "第$1季");
}

function slugFromParams(params) {
  params = params || {};
  var values = [params.link, params.url, params.id];
  for (var i = 0; i < values.length; i++) {
    var text = decodeURIComponent(String(values[i] || ""));
    var match = text.match(/(?:4kvm:|\/play\/)([A-Za-z0-9_-]+)/i);
    if (match) return match[1];
  }
  return "";
}

function searchTitle(params) {
  params = params || {};
  var title = String(params.seriesName || params.title || params.name || "").trim();
  var season = parseInt(params.season, 10) || 0;
  if (season && !/第\s*\d+\s*季/.test(title)) title += " 第" + season + "季";
  return title;
}

function parseSearchCards(html) {
  var output = [], seen = {}, match;
  var pattern = /<a\b([^>]*href=["']\/play\/([A-Za-z0-9_-]+)["'][^>]*)>([\s\S]*?)<\/a>/gi;
  while ((match = pattern.exec(String(html || "")))) {
    if (seen[match[2]]) continue;
    var body = match[3];
    var title = (body.match(/<img\b[^>]*\balt=["']([^"']+)["']/i) || [])[1]
      || (body.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i) || [])[1]
      || attr(match[1], "title");
    title = stripTags(title);
    if (!title) continue;
    var year = (stripTags(body).match(/(?:19|20)\d{2}/) || [])[0] || "";
    seen[match[2]] = true;
    output.push({ slug: match[2], title: title, year: year });
  }
  return output;
}

function pickBestCard(cards, title, season) {
  cards = cards || [];
  var wanted = normalizeTitle(title), wantedBase = wanted.replace(/第\d+季/g, "");
  var best = null, bestScore = -1;
  for (var i = 0; i < cards.length; i++) {
    var current = normalizeTitle(cards[i].title);
    var currentBase = current.replace(/第\d+季/g, "");
    var score = 0;
    if (current === wanted) score += 120;
    else if (currentBase === wantedBase) score += 80;
    else if (current.indexOf(wanted) >= 0 || wanted.indexOf(current) >= 0) score += 45;
    if (season) {
      if (current.indexOf("第" + season + "季") >= 0) score += 40;
      else score -= 25;
    }
    if (score > bestScore) { best = cards[i]; bestScore = score; }
  }
  return bestScore > 0 ? best : null;
}

function parseEpisodeTarget(html, episode) {
  html = String(html || "");
  var wasm = (html.match(/\bid=["']wasm-cfg["'][^>]*\bdata-bg=["']([^"']+)["']/i) || html.match(/\bdata-bg=["']([^"']+\.wasm)["']/i) || [])[1] || DEFAULT_WASM;
  var playKey = (html.match(/\buserlink\s*:\s*["']([^"']+)["']/i) || [])[1] || "0";
  var meta = {}, metaMatch, metaPattern = /<meta\b([^>]*)>/gi;
  while ((metaMatch = metaPattern.exec(html))) {
    var metaId = attr(metaMatch[1], "id");
    if (metaId === "nb-st" || metaId === "nb-plt") meta[metaId] = attr(metaMatch[1], "content");
  }
  var targets = [], match;
  var pattern = /<a\b([^>]*(?:\bdata-episode|\bdataid)[^>]*)>/gi;
  while ((match = pattern.exec(html))) {
    var attrs = match[1];
    var dataId = attr(attrs, "dataid") || attr(attrs, "data-id");
    var href = attr(attrs, "href");
    var secret = (href.match(/\/play\/([A-Za-z0-9_-]+)/i) || [])[1] || "";
    if (!dataId || !secret) continue;
    targets.push({ dataId: dataId, secretKey: secret, episode: parseInt(attr(attrs, "data-episode"), 10) || 1, wasmPath: wasm, playKey: playKey, meta: meta });
  }
  if (!targets.length) return null;
  var wanted = Math.max(1, parseInt(episode, 10) || 1);
  for (var i = 0; i < targets.length; i++) if (targets[i].episode === wanted) return targets[i];
  return wanted === 1 ? targets[0] : null;
}

function parseData(response) {
  var data = response && response.data;
  if (typeof data === "string") { try { return JSON.parse(data); } catch (e) {} }
  return data;
}

function absoluteUrl(value) {
  value = decodeEntities(String(value || ""));
  if (/^https?:\/\//i.test(value)) return value;
  if (value.indexOf("//") === 0) return "https:" + value;
  return BASE + (value.charAt(0) === "/" ? value : "/" + value);
}

function requestHeaders(referer, json) {
  var headers = { "User-Agent": UA, Accept: json ? "application/json" : "text/html,application/xhtml+xml,*/*", Referer: referer || BASE + "/", Origin: BASE };
  if (json) headers["Content-Type"] = "application/json;charset=UTF-8";
  return headers;
}

async function get(url, referer, json, binary) {
  var options = { headers: requestHeaders(referer, json), timeout: 15000 };
  if (binary) options.responseType = "arraybuffer";
  return Widget.http.get(url, options);
}

function toBytes(data) {
  if (typeof Uint8Array !== "undefined" && data instanceof Uint8Array) return data;
  if (typeof ArrayBuffer !== "undefined" && data instanceof ArrayBuffer) return new Uint8Array(data);
  if (data && data.buffer && typeof Uint8Array !== "undefined") return new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength || data.length);
  if (Array.isArray(data)) return new Uint8Array(data);
  if (typeof data === "string") {
    var bytes = new Uint8Array(data.length);
    for (var i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i) & 255;
    return bytes;
  }
  throw new Error("WASM 响应不是二进制数据");
}

function utf8Encode(value) {
  value = String(value || "");
  var output = [];
  for (var i = 0; i < value.length; i++) {
    var code = value.charCodeAt(i);
    if (code >= 0xD800 && code <= 0xDBFF && i + 1 < value.length) {
      var low = value.charCodeAt(i + 1);
      if (low >= 0xDC00 && low <= 0xDFFF) { code = 0x10000 + ((code - 0xD800) << 10) + (low - 0xDC00); i++; }
    }
    if (code < 0x80) output.push(code);
    else if (code < 0x800) output.push(0xC0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) output.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else output.push(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
  }
  return new Uint8Array(output);
}

function utf8Decode(bytes) {
  bytes = toBytes(bytes);
  var output = "", i = 0;
  while (i < bytes.length) {
    var first = bytes[i++], code;
    if (first < 0x80) code = first;
    else if (first < 0xE0) code = ((first & 31) << 6) | (bytes[i++] & 63);
    else if (first < 0xF0) code = ((first & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    else code = ((first & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    if (code <= 0xFFFF) output += String.fromCharCode(code);
    else { code -= 0x10000; output += String.fromCharCode(0xD800 + (code >> 10), 0xDC00 + (code & 1023)); }
  }
  return output;
}

async function createUrlBuilder(bytes, target) {
  if (typeof WebAssembly === "undefined") throw new Error("当前 Forward 版本不支持 WebAssembly");
  var wasm, vectorLength = 0;
  var heap = new Array(1024).fill(undefined);
  heap.push(undefined, null, true, false);
  var heapNext = heap.length;
  target = target || {};
  var metaValues = target.meta || {};
  var fakeMetas = {
    "nb-st": { __meta: true, content: String(metaValues["nb-st"] || Date.now()) },
    "nb-plt": { __meta: true, content: String(metaValues["nb-plt"] || Date.now()) },
  };
  var fakeDocument = { getElementById: function (id) { return fakeMetas[id] || null; } };
  var fakeWindow = { __window: true, document: fakeDocument };

  function getObject(index) { return heap[index]; }
  function addObject(value) { if (heapNext === heap.length) heap.push(heap.length + 1); var index = heapNext; heapNext = heap[index]; heap[index] = value; return index; }
  function dropObject(index) { if (index < 1028) return; heap[index] = heapNext; heapNext = index; }
  function takeObject(index) { var value = getObject(index); dropObject(index); return value; }
  function memory() { return new Uint8Array(wasm.memory.buffer); }
  function view() { return new DataView(wasm.memory.buffer); }
  function readString(pointer, length) { return utf8Decode(memory().subarray(pointer >>> 0, (pointer >>> 0) + length)); }
  function passString(value) {
    var encoded = utf8Encode(String(value));
    var pointer = wasm.__wbindgen_export(encoded.length, 1) >>> 0;
    memory().subarray(pointer, pointer + encoded.length).set(encoded);
    vectorLength = encoded.length;
    return pointer;
  }

  var bridge = {
    __wbg___wbindgen_is_undefined_52709e72fb9f179c: function (a) { return getObject(a) === undefined; },
    __wbindgen_object_drop_ref: function (a) { takeObject(a); },
    __wbg_static_accessor_GLOBAL_8adb955bd33fac2f: function () { return addObject(fakeWindow); },
    __wbg_static_accessor_GLOBAL_THIS_ad356e0db91c7913: function () { return addObject(fakeWindow); },
    __wbg_static_accessor_WINDOW_bb9f1ba69d61b386: function () { return addObject(fakeWindow); },
    __wbg_static_accessor_SELF_f207c857566db248: function () { return addObject(fakeWindow); },
    __wbindgen_object_clone_ref: function (a) { return addObject(getObject(a)); },
    __wbg_instanceof_Window_23e677d2c6843922: function (a) { return !!(getObject(a) && getObject(a).__window); },
    __wbg_document_c0320cd4183c6d9b: function (a) { var value = getObject(a).document; return value == null ? 0 : addObject(value); },
    __wbg_getElementById_d1f25d287b19a833: function (a, p, l) { var value = getObject(a).getElementById(readString(p, l)); return value == null ? 0 : addObject(value); },
    __wbg_instanceof_HtmlMetaElement_07f78901e9785572: function (a) { return !!(getObject(a) && getObject(a).__meta); },
    __wbg_content_4373268a6f34e443: function (ret, a) { var p = passString(getObject(a).content); view().setInt32(ret, p, true); view().setInt32(ret + 4, vectorLength, true); },
    __wbg_now_16f0c993d5dd6c27: function () { return Date.now(); },
    __wbg___wbindgen_throw_6ddd609b62940d55: function (p, l) { throw new Error(readString(p, l)); },
  };
  var result = await WebAssembly.instantiate(bytes, { "./nbmovie_wasm_bg.js": bridge });
  wasm = result.instance ? result.instance.exports : result.exports;
  return function (dataId, secretKey, quality, playKey) {
    var ret = wasm.__wbindgen_add_to_stack_pointer(-16);
    var p0 = passString(dataId), l0 = vectorLength;
    var p1 = passString(secretKey), l1 = vectorLength;
    var p2 = passString(quality), l2 = vectorLength;
    var p3 = passString(playKey), l3 = vectorLength;
    wasm.build_play_url(ret, p0, l0, p1, l1, p2, l2, p3, l3);
    var out = view().getInt32(ret, true), length = view().getInt32(ret + 4, true);
    var value = readString(out, length);
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export3(out, length, 1);
    return value;
  };
}

async function buildSignedPlayUrl(target, pageUrl) {
  var wasmResponse = await get(absoluteUrl(target.wasmPath || DEFAULT_WASM), pageUrl, false, true);
  var builder = await createUrlBuilder(toBytes(wasmResponse && wasmResponse.data), target);
  return absoluteUrl(builder(String(target.dataId), String(target.secretKey), "1080", String(target.playKey || "0")));
}

function resourcesFromPlayPayload(payload, slug) {
  payload = payload || {};
  var qualities = (payload.data && payload.data.quality_urls) || payload.quality_urls || [];
  var output = [], seen = {};
  for (var i = 0; i < qualities.length; i++) {
    var item = qualities[i] || {}, url = String(item.url || "");
    if (item.locked === true || item.isvip === true && item.locked !== false || !/^https?:\/\//i.test(url) || url === "1" || seen[url]) continue;
    seen[url] = true;
    output.push({
      name: "4KVM" + (item.title ? " · " + item.title : ""),
      description: item.description || (/\.m3u8(?:[?#]|$)/i.test(url) ? "HLS" : "视频"),
      url: url,
      customHeaders: { "User-Agent": UA, Referer: BASE + "/play/" + slug, Origin: BASE },
      playerType: "app",
    });
  }
  return output;
}

async function loadResource(params) {
  params = params || {};
  if (params.multiSource === "disabled") return [];
  var slug = slugFromParams(params);
  var title = searchTitle(params);
  if (!slug) {
    if (!title) return [];
    try {
      var search = await get(BASE + "/search?q=" + encodeURIComponent(title), BASE + "/", false, false);
      var card = pickBestCard(parseSearchCards(search && search.data), title, parseInt(params.season, 10) || 0);
      if (!card) return [];
      slug = card.slug;
    } catch (searchError) { console.log("4KVM search failed: " + searchError.message); return []; }
  }
  var pageUrl = BASE + "/play/" + slug;
  try {
    var page = await get(pageUrl, BASE + "/", false, false);
    var target = parseEpisodeTarget(page && page.data, params.episode);
    if (!target) return [];
    var signedUrl = await buildSignedPlayUrl(target, pageUrl);
    var play = await get(signedUrl, pageUrl, true, false);
    return resourcesFromPlayPayload(parseData(play), target.secretKey || slug);
  } catch (error) { console.log("4KVM resource failed: " + error.message); return []; }
}
