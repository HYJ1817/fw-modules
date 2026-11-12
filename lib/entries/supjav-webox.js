/* SupJav（WeBox 移植版）· 入口层
 * 本文件不单独使用：由 scripts/build-supjav-webox.js 把 lib/vendor/supjav-webox-core.js
 * （WeBox 插件原文，逐字保留）拼在本文件之后，生成 widgets/supjav-webox.js。
 *
 * 思路：不重写上游逻辑，只提供一层 Forward 运行时桥接（ctx.* → Widget.*），
 * 然后把 list / detail / play 的返回值映射成 Forward 的条目、详情与播放源结构。
 */

var SUPJAV_PLUGIN = null;
var WeBox = {
  define: function (options) {
    SUPJAV_PLUGIN = options;
  },
};

WidgetMetadata = {
  id: "hyj1817.supjav.webox",
  title: "SupJav 新版",
  description: "supjav.blog 列表、分类、搜索、详情与多线路播放（WeBox 插件移植：多镜像、embed 接口探测、packer 解包、广告过滤）",
  author: "HYJ1817",
  icon: "https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/icon.png",
  site: "https://supjav.blog",
  version: "1.0.2",
  requiredVersion: "0.0.2",
  detailCacheDuration: 30,
  globalParams: [
    {
      name: "multiSource",
      title: "是否启用聚合搜索",
      type: "enumeration",
      value: "enabled",
      enumOptions: [
        { title: "启用", value: "enabled" },
        { title: "禁用", value: "disabled" },
      ],
    },
    {
      name: "mode",
      title: "站点域名",
      type: "enumeration",
      value: "blog",
      enumOptions: [
        { title: "默认站点 supjav.blog", value: "blog" },
        { title: "主站镜像 supjav.com", value: "com" },
        { title: "自定义地址", value: "custom" },
      ],
    },
    { name: "site", title: "自定义站点地址", type: "input", description: "域名选「自定义」时生效，形如 https://supjav.blog" },
    {
      name: "lang",
      title: "站点语言目录",
      type: "enumeration",
      value: "zh",
      enumOptions: [
        { title: "中文 /zh", value: "zh" },
        { title: "英文 /", value: "en" },
        { title: "日文 /ja", value: "ja" },
      ],
    },
    { name: "cookie", title: "访问 Cookie（可选）", type: "input", description: "站点触发 Cloudflare 验证时填浏览器里的 cf_clearance 等" },
    {
      name: "prefetch",
      title: "预取首集线路",
      type: "enumeration",
      value: "on",
      enumOptions: [
        { title: "开启（打开详情时就解析首集，点播放更快）", value: "on" },
        { title: "关闭（少发请求）", value: "off" },
      ],
    },
  ],
  modules: [
    {
      id: "latest",
      title: "最新更新",
      functionName: "loadLatest",
      type: "video",
      cacheDuration: 180,
      params: [{ name: "page", title: "页码", type: "page", value: "1" }],
    },
    {
      id: "categories",
      title: "分类栏目",
      functionName: "loadCategory",
      type: "video",
      cacheDuration: 600,
      params: [
        {
          name: "category",
          title: "栏目",
          type: "enumeration",
          value: "category/chinese-subtitles",
          enumOptions: [
            { title: "中文字幕", value: "category/chinese-subtitles" },
            { title: "有码 JAV", value: "category/censored-jav" },
            { title: "无码 JAV", value: "category/uncensored-jav" },
            { title: "流出无码", value: "category/reducing-mosaic" },
            { title: "素人精选", value: "category/amateur" },
            { title: "自定义栏目", value: "custom" },
          ],
        },
        { name: "route", title: "自定义栏目 route", type: "input", description: "栏目选「自定义」时生效，如 category/amateur" },
        { name: "page", title: "页码", type: "page", value: "1" },
      ],
    },
    {
      id: "loadResource",
      title: "SupJav 播放线路",
      functionName: "loadResource",
      type: "stream",
      cacheDuration: 0,
      params: [],
    },
  ],
  search: {
    title: "SupJav 搜索",
    functionName: "search",
    params: [
      { name: "keyword", title: "关键词 / 番号 / 演员", type: "input" },
      { name: "page", title: "页码", type: "page", value: "1" },
    ],
  },
};

/* ============================ 运行时桥接 ============================ */

var FWV_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function fwUtf8Bytes(text) {
  var s = String(text), out = [], i, code;
  for (i = 0; i < s.length; i++) {
    code = s.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < s.length) {
      var low = s.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) { code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00); i++; }
    }
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
  }
  return out;
}
function fwUtf8FromBytes(bytes) {
  var out = "", i = 0;
  while (i < bytes.length) {
    var b = bytes[i++], code;
    if (b < 0x80) code = b;
    else if (b >= 0xf0) code = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    else if (b >= 0xe0) code = ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    else code = ((b & 31) << 6) | (bytes[i++] & 63);
    if (code > 0xffff) {
      code -= 0x10000;
      out += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 1023));
    } else out += String.fromCharCode(code);
  }
  return out;
}
function fwB64UrlEncode(text) {
  var bytes = fwUtf8Bytes(text), out = "", i, n;
  for (i = 0; i + 2 < bytes.length; i += 3) {
    n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += FWV_ALPHABET[(n >> 18) & 63] + FWV_ALPHABET[(n >> 12) & 63] + FWV_ALPHABET[(n >> 6) & 63] + FWV_ALPHABET[n & 63];
  }
  var left = bytes.length - i;
  if (left === 1) { n = bytes[i] << 16; out += FWV_ALPHABET[(n >> 18) & 63] + FWV_ALPHABET[(n >> 12) & 63]; }
  else if (left === 2) { n = (bytes[i] << 16) | (bytes[i + 1] << 8); out += FWV_ALPHABET[(n >> 18) & 63] + FWV_ALPHABET[(n >> 12) & 63] + FWV_ALPHABET[(n >> 6) & 63]; }
  return out;
}
function fwB64UrlDecode(text) {
  var s = String(text || "").replace(/-/g, "+").replace(/_/g, "/"), bytes = [], buffer = 0, bits = 0, i, index;
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (i = 0; i < s.length; i++) {
    if (s.charAt(i) === "=") break;
    index = chars.indexOf(s.charAt(i));
    if (index < 0) continue;
    buffer = ((buffer << 6) | index) & 0xffffff;
    bits += 6;
    if (bits >= 8) { bits -= 8; bytes.push((buffer >> bits) & 255); }
  }
  return fwUtf8FromBytes(bytes);
}
function fwB64Decode(text) {
  var s = String(text || "").replace(/[\r\n\s]/g, "").replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return fwB64UrlDecode(s);
}
function fwOrigin(url) {
  var match = /^(https?):\/\/([^/?#]+)/i.exec(String(url || ""));
  return match ? match[1].toLowerCase() + "://" + match[2].toLowerCase() : "";
}
function fwResolve(path, base) {
  var value = String(path === undefined || path === null ? "" : path).trim();
  if (!value) return String(base || "");
  if (/^https?:\/\//i.test(value)) return value;
  if (value.indexOf("//") === 0) return "https:" + value;
  var origin = fwOrigin(base) || String(base || "");
  if (value.charAt(0) === "/") return origin + value;
  var baseUrl = String(base || "").split(/[?#]/)[0];
  if (!/^https?:\/\//i.test(baseUrl)) return origin + "/" + value;
  var dir = baseUrl.slice(0, baseUrl.lastIndexOf("/") + 1) || origin + "/";
  return dir + value;
}
function fwQueryString(url, query) {
  var pairs = [];
  for (var key in query || {}) {
    if (!Object.prototype.hasOwnProperty.call(query, key)) continue;
    if (query[key] === undefined || query[key] === null || query[key] === "") continue;
    pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(query[key]));
  }
  if (!pairs.length) return String(url);
  return String(url) + (String(url).indexOf("?") >= 0 ? "&" : "?") + pairs.join("&");
}
function fwPayload(response) {
  var data = response && response.data !== undefined ? response.data : response;
  if (typeof data === "string") return data;
  if (data === undefined || data === null) return "";
  return JSON.stringify(data);
}
function fwSettings(params) {
  params = params || {};
  return {
    mode: String(params.mode || "blog"),
    site: String(params.site || ""),
    lang: String(params.lang || "zh"),
    cookie: String(params.cookie || ""),
    timeout: Number(params.timeout) || 18,
  };
}
function fwCtx(params) {
  var settings = fwSettings(params);
  return {
    settings: settings,
    cache: { seconds: function (value) { return Number(value) || 0; }, generation: 1 },
    url: { resolve: fwResolve, origin: fwOrigin },
    html: { load: function (html) { return Widget.html.load(String(html || "")); } },
    crypto: { base64Decode: function (value) { return fwB64Decode(value); } },
    signal: { throwIfAborted: function () {} },
    fail: function (code, message) {
      var error = new Error(message || code || "请求失败");
      error.code = code;
      throw error;
    },
    http: {
      get: async function (url, options) {
        options = options || {};
        var target = fwQueryString(url, options.query);
        var headers = {};
        for (var key in options.headers || {}) {
          if (Object.prototype.hasOwnProperty.call(options.headers, key)) headers[key] = options.headers[key];
        }
        var response = await Widget.http.get(target, {
          headers: headers,
          timeout: Math.max(5, Number(settings.timeout) || 18) * 1000,
        });
        return {
          status: Number(response && (response.status || response.statusCode)) || 200,
          headers: (response && response.headers) || {},
          url: target,
          data: fwPayload(response),
        };
      },
    },
  };
}

/* ============================ 链接编解码 ============================ */

function fwMakeLink(contentId, groupId, episodeId) {
  var packed = groupId && episodeId ? [contentId, groupId, episodeId] : [contentId];
  return "supjav2:" + fwB64UrlEncode(JSON.stringify(packed));
}
function fwParseLink(link) {
  var text = String(link || "");
  if (/%3A/i.test(text)) { try { text = decodeURIComponent(text); } catch (_) {} }
  var match = /^supjav2:([A-Za-z0-9_-]+)$/.exec(text.trim());
  if (!match) return null;
  try {
    var packed = JSON.parse(fwB64UrlDecode(match[1]));
    if (!Array.isArray(packed) || !packed[0]) return null;
    return { contentId: String(packed[0]), groupId: packed[1] ? String(packed[1]) : "", episodeId: packed[2] ? String(packed[2]) : "" };
  } catch (_) {
    return null;
  }
}

/* ============================ 缓存与测速 ============================ */

var FWV_MEM_CACHE = {};

function fwCacheGet(key) {
  var entry = FWV_MEM_CACHE[key];
  if (entry && entry.expires > Date.now()) return entry.value;
  if (entry) delete FWV_MEM_CACHE[key];
  return null;
}
function fwCacheSet(key, value, ttlMs) {
  var keys = Object.keys(FWV_MEM_CACHE);
  if (keys.length >= 48) delete FWV_MEM_CACHE[keys[0]];
  FWV_MEM_CACHE[key] = { value: value, expires: Date.now() + ttlMs };
  return value;
}
/** 站点偶发超时/拒绝，重试一次能省掉用户手动再来一遍 */
async function fwWithRetry(task, attempts) {
  var lastError = null;
  for (var i = 0; i < (attempts || 2); i++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      var code = String((error && error.code) || "");
      if (code && code !== "NETWORK" && code !== "TIMEOUT" && code !== "RATE_LIMITED") throw error;
      if (i + 1 < (attempts || 2)) await new Promise(function (resolve) { setTimeout(resolve, 800); });
    }
  }
  throw lastError;
}

/** master 只有一路变体时直接下发它：省掉播放器启动时的一次往返（本站实际只有 480p 一路） */
async function fwUnwrapSingleVariant(sources) {
  var output = [];
  for (var i = 0; i < sources.length; i++) {
    var source = sources[i];
    if (!/\.m3u8|\/m\//i.test(source.url) && !/mpegurl/i.test(String(source.description || ""))) {
      output.push(source);
      continue;
    }
    try {
      var response = await Widget.http.get(source.url, { headers: source.customHeaders || {}, timeout: 4000 });
      var text = fwPayload(response);
      var variants = String(text).split(/\r?\n/).filter(function (line) {
        return /^https?:\/\//.test(line.trim());
      });
      var infos = String(text).match(/#EXT-X-STREAM-INF:[^\n]*/g) || [];
      if (infos.length === 1 && variants.length === 1) {
        var copy = {};
        for (var key in source) if (Object.prototype.hasOwnProperty.call(source, key)) copy[key] = source[key];
        copy.url = variants[0].trim();
        var name = /NAME="([^"]+)"/.exec(infos[0]);
        if (name) copy.description = (copy.description || "HLS") + " · " + name[1];
        output.push(copy);
        continue;
      }
    } catch (_) {}
    output.push(source);
  }
  return output;
}

/** 并发探测各线路首字节耗时；只有一条线路时不测，省掉这段时间 */
async function fwProbeSources(sources) {
  if (sources.length < 2) return sources;
  var probes = sources.map(function (source) {
    var started = Date.now();
    var timer = new Promise(function (resolve) { setTimeout(function () { resolve(3000); }, 3000); });
    var request = Widget.http
      .get(source.url, { headers: source.customHeaders || {}, timeout: 3000 })
      .then(function () { return Date.now() - started; })
      .catch(function () { return Number.MAX_SAFE_INTEGER; });
    return Promise.race([request, timer]).then(function (ms) { return { source: source, ms: ms }; });
  });
  var results = await Promise.all(probes);
  results.sort(function (a, b) { return a.ms - b.ms; });
  var output = [];
  for (var i = 0; i < results.length; i++) {
    var item = results[i];
    if (item.ms === Number.MAX_SAFE_INTEGER) continue;
    item.source.description = (item.source.description || "HLS") + " · " + item.ms + "ms";
    output.push(item.source);
  }
  // 全部探不通时保留原顺序，交给播放器自己重试
  return output.length ? output : sources;
}

/* ============================ 映射到 Forward ============================ */

function fwCardToItem(card) {
  var link = fwMakeLink(card.id);
  var item = {
    id: link,
    type: "video",
    title: card.title,
    seriesName: card.title,
    mediaType: "tv",
    link: link,
  };
  if (card.poster) { item.posterPath = card.poster; item.backdropPath = card.poster; }
  if (card.subtitle) item.description = card.subtitle;
  return item;
}
function fwPageOf(params) {
  var page = parseInt((params || {}).page, 10);
  return page > 0 ? page : 1;
}
async function fwCallList(params, filters) {
  var ctx = fwCtx(params);
  var page = fwPageOf(params);
  var result = await SUPJAV_PLUGIN.list(ctx, {
    cursor: page > 1 ? String(page) : null,
    filters: filters || {},
  });
  var items = (result && result.items) || [];
  var mapped = [];
  for (var i = 0; i < items.length; i++) {
    if (items[i] && items[i].id && items[i].title) mapped.push(fwCardToItem(items[i]));
  }
  return mapped;
}
function fwNotice(message, params) {
  var host = "supjav.blog";
  try { host = fwOrigin(fwCtx(params).url.resolve("/", SUPJAV_PLUGIN ? "https://supjav.blog" : "https://supjav.blog")).replace(/^https?:\/\//, ""); } catch (_) {}
  return [{
    id: "supjav2:notice",
    type: "video",
    title: "SupJav：" + String(message || "请求失败").slice(0, 100),
    seriesName: "SupJav",
    description: "只是提示，点开没有内容；修好后刷新即可恢复。",
    mediaType: "tv",
    link: "supjav2:notice",
  }];
}

/* ============================ 对外函数 ============================ */

async function loadLatest(params) {
  try {
    return await fwCallList(params, { category: "latest" });
  } catch (error) {
    console.log("FW supjav-webox 最新失败: " + ((error && error.message) || error));
    return fwNotice((error && error.message) || "未知错误", params);
  }
}

var FWV_CATEGORY_ALIAS = {
  chinese: "category/chinese-subtitles",
  "chinese-subtitles": "category/chinese-subtitles",
  censored: "category/censored-jav",
  uncensored: "category/uncensored-jav",
  leaked: "category/reducing-mosaic",
  "uncensored-leaked": "category/reducing-mosaic",
  amateur: "category/amateur",
  latest: "latest",
};
async function loadCategory(params) {
  var raw = String((params && params.category) || "").trim();
  if (raw === "custom") raw = String((params && params.route) || "").trim();
  raw = raw || "latest";
  var category = FWV_CATEGORY_ALIAS[raw] || raw;
  try {
    return await fwCallList(params, { category: category });
  } catch (error) {
    console.log("FW supjav-webox 栏目 " + category + " 失败: " + ((error && error.message) || error));
    return fwNotice((error && error.message) || "未知错误", params);
  }
}

async function search(params) {
  var keyword = String((params && params.keyword) || "").trim();
  if (!keyword) return [];
  var ctx = fwCtx(params);
  var page = fwPageOf(params);
  try {
    var result = await SUPJAV_PLUGIN.search(ctx, { query: keyword, cursor: page > 1 ? String(page) : null });
    var items = (result && result.items) || [], mapped = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i] && items[i].id && items[i].title) mapped.push(fwCardToItem(items[i]));
    }
    return mapped;
  } catch (error) {
    console.log("FW supjav-webox 搜索失败: " + ((error && error.message) || error));
    return fwNotice((error && error.message) || "未知错误", params);
  }
}

async function loadDetail(input) {
  var link = typeof input === "string" ? input : (input && (input.link || input.id || input.url)) || "";
  var parsed = fwParseLink(link);
  if (!parsed) return null;
  var params = (input && typeof input === "object" && input.mode) ? input : {};
  var ctx = fwCtx(params);
  var cacheKey = "detail:" + ctx.settings.mode + "|" + ctx.settings.lang + "|" + parsed.contentId;
  var cached = fwCacheGet(cacheKey);
  if (cached) return cached;
  try {
    var detail = await fwWithRetry(function () {
      return SUPJAV_PLUGIN.detail(ctx, { id: parsed.contentId });
    }, 2);
    if (!detail || !detail.groups || !detail.groups.length) return null;
    var title = detail.title || parsed.contentId;
    var episodeItems = [], index = 0;
    for (var g = 0; g < detail.groups.length; g++) {
      var group = detail.groups[g];
      var episodes = group.episodes || [];
      for (var e = 0; e < episodes.length; e++) {
        index++;
        var itemLink = fwMakeLink(parsed.contentId, group.id, episodes[e].id);
        var name = episodes[e].name || ("第" + (e + 1) + "集");
        episodeItems.push({
          id: itemLink,
          type: "url",
          title: title + " · " + group.name + " · " + name,
          seriesName: title,
          episodeName: group.name + " · " + name,
          episode: index,
          mediaType: "tv",
          link: itemLink,
        });
      }
    }
    var result = {
      id: fwMakeLink(parsed.contentId),
      type: "url",
      title: title,
      seriesName: title,
      mediaType: "tv",
      episodeItems: episodeItems,
      link: fwMakeLink(parsed.contentId),
    };
    if (detail.poster) { result.posterPath = detail.poster; result.backdropPath = detail.poster; }
    if (detail.summary) result.description = detail.summary;
    fwCacheSet(cacheKey, result, 30 * 60 * 1000);
    // 详情已经返回，用零延时把首集线路预取排到事件循环尾部：
    // 宿主若在跳转后保留上下文，点播放时就能直接命中缓存。
    if (String(params.prefetch || "on") !== "off" && result.episodeItems.length) {
      var firstLink = result.episodeItems[0].link;
      setTimeout(function () {
        loadResource({ link: firstLink, mode: params.mode, site: params.site, lang: params.lang, cookie: params.cookie, timeout: params.timeout })
          .catch(function () {});
      }, 0);
    }
    return result;
  } catch (error) {
    console.log("FW supjav-webox 详情失败: " + ((error && error.message) || error));
    return null;
  }
}

async function loadResource(params) {
  params = params || {};
  if (params.multiSource === "disabled") return [];
  var parsed = fwParseLink(params.link || params.url || params.id);
  if (!parsed || !parsed.groupId || !parsed.episodeId) {
    console.log("FW supjav-webox 播放参数无效，请重新打开详情");
    return [];
  }
  var ctx = fwCtx(params);
  var cacheKey = "play:" + ctx.settings.mode + "|" + ctx.settings.lang + "|" + parsed.contentId + "|" + parsed.groupId + "|" + parsed.episodeId;
  var cached = fwCacheGet(cacheKey);
  if (cached) return cached;
  try {
    var result = await fwWithRetry(function () {
      return SUPJAV_PLUGIN.play(ctx, {
        contentId: parsed.contentId,
        groupId: parsed.groupId,
        episodeId: parsed.episodeId,
      });
    }, 2);
    var sources = (result && result.sources) || [], output = [];
    for (var i = 0; i < sources.length; i++) {
      var source = sources[i];
      if (!source || !/^https?:\/\//i.test(String(source.url || ""))) continue;
      var duplicate = false;
      for (var j = 0; j < output.length; j++) if (output[j].url === source.url) duplicate = true;
      if (duplicate) continue;
      output.push({
        name: "SupJav · " + (source.name || ("线路" + (output.length + 1))),
        description: /mpegurl/i.test(String(source.mime || "")) ? "HLS" : "视频",
        url: source.url,
        customHeaders: source.headers || {},
        playerType: "app",
      });
    }
    if (!output.length) console.log("FW supjav-webox 没有解析到可播放线路");
    var unwrapped = await fwUnwrapSingleVariant(output);
    return fwCacheSet(cacheKey, await fwProbeSources(unwrapped), 10 * 60 * 1000);
  } catch (error) {
    console.log("FW supjav-webox 播放失败: " + ((error && error.message) || error));
    return [];
  }
}
