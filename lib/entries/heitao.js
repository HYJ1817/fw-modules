/* 黑桃短剧（WeBox 移植版）· 入口层
 * 本文件不单独使用：由 scripts/build-heitao.js 把 lib/vendor/heitao-core.js
 * （WeBox 插件原文，逐字保留）拼在本文件之后，生成 widgets/heitao.js。
 *
 * 站点是苹果CMS（/index.php/vod/...），播放页给 player_aaaa 配置；
 * 上游还带年龄门 Cookie 处理与导航发现，所以用桥接而不是重写。
 */

var HEITAO_PLUGIN = null;
var WeBox = {
  define: function (options) {
    HEITAO_PLUGIN = options;
  },
};

WidgetMetadata = {
  id: "hyj1817.heitao.home",
  title: "黑桃短剧",
  description: "黑桃短剧首页、栏目、题材、搜索、详情与分集（WeBox 插件移植）",
  author: "HYJ1817",
  icon: "https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/icon.png",
  site: "https://heitaodj.com",
  version: "1.0.0",
  requiredVersion: "0.0.2",
  detailCacheDuration: 60,
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
    { name: "site", title: "站点地址", type: "input", description: "换域名时改这里，默认 https://heitaodj.com" },
    { name: "cookie", title: "访问 Cookie（可选）", type: "input", description: "仅遇到访问验证时填" },
  ],
  modules: [
    {
      id: "latest",
      title: "首页推荐",
      functionName: "loadLatest",
      type: "video",
      cacheDuration: 180,
      params: [{ name: "page", title: "页码", type: "page", value: "1" }],
    },
    {
      id: "categories",
      title: "栏目",
      functionName: "loadCategory",
      type: "video",
      cacheDuration: 600,
      params: [
        {
          name: "category",
          title: "栏目",
          type: "enumeration",
          value: "现代都市",
          enumOptions: [
            { title: "首页推荐", value: "all" },
            { title: "现代都市", value: "现代都市" },
            { title: "古装传奇", value: "古装传奇" },
            { title: "仙侠玄幻", value: "仙侠玄幻" },
            { title: "科幻脑洞", value: "科幻脑洞" },
            { title: "灵异悬疑", value: "灵异悬疑" },
            { title: "其他短剧", value: "其他短剧" },
          ],
        },
        {
          name: "tag",
          title: "题材",
          type: "enumeration",
          value: "",
          enumOptions: [
            { title: "全部题材", value: "" },
            { title: "家庭纠葛", value: "家庭纠葛" },
            { title: "职场权色", value: "职场权色" },
            { title: "逆袭打脸", value: "逆袭打脸" },
            { title: "系统逆袭", value: "系统逆袭" },
            { title: "异能超能", value: "异能超能" },
            { title: "群芳后宫", value: "群芳后宫" },
            { title: "后宫争宠", value: "后宫争宠" },
            { title: "鬼艳志怪", value: "鬼艳志怪" },
            { title: "都市怪谈", value: "都市怪谈" },
            { title: "身体奇谭", value: "身体奇谭" },
            { title: "综合脑洞", value: "综合脑洞" },
          ],
        },
        { name: "page", title: "页码", type: "page", value: "1" },
      ],
    },
    {
      id: "loadResource",
      title: "黑桃短剧 播放线路",
      functionName: "loadResource",
      type: "stream",
      cacheDuration: 0,
      params: [],
    },
  ],
  search: {
    title: "黑桃短剧 搜索",
    functionName: "search",
    params: [
      { name: "keyword", title: "关键词", type: "input" },
      { name: "page", title: "页码", type: "page", value: "1" },
    ],
  },
};

/* ============================ 运行时兜底 ============================ */

function hdUtf8Bytes(text) {
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
function hdUtf8FromBytes(bytes) {
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
var HD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function hdB64UrlEncode(text) {
  var bytes = hdUtf8Bytes(text), out = "", i, n;
  for (i = 0; i + 2 < bytes.length; i += 3) {
    n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += HD_ALPHABET[(n >> 18) & 63] + HD_ALPHABET[(n >> 12) & 63] + HD_ALPHABET[(n >> 6) & 63] + HD_ALPHABET[n & 63];
  }
  var left = bytes.length - i;
  if (left === 1) { n = bytes[i] << 16; out += HD_ALPHABET[(n >> 18) & 63] + HD_ALPHABET[(n >> 12) & 63]; }
  else if (left === 2) { n = (bytes[i] << 16) | (bytes[i + 1] << 8); out += HD_ALPHABET[(n >> 18) & 63] + HD_ALPHABET[(n >> 12) & 63] + HD_ALPHABET[(n >> 6) & 63]; }
  return out;
}
function hdB64Decode(text) {
  var s = String(text || "").replace(/[\r\n\s]/g, "").replace(/-/g, "+").replace(/_/g, "/");
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var out = [], buffer = 0, bits = 0;
  for (var i = 0; i < s.length; i++) {
    if (s.charAt(i) === "=") break;
    var index = chars.indexOf(s.charAt(i));
    if (index < 0) throw new Error("invalid base64");
    buffer = ((buffer << 6) | index) & 0xffffff;
    bits += 6;
    if (bits >= 8) { bits -= 8; out.push((buffer >> bits) & 255); }
  }
  return hdUtf8FromBytes(out);
}
function hdB64UrlDecode(text) {
  return hdB64Decode(String(text || "").replace(/-/g, "+").replace(/_/g, "/"));
}

/* 纯 JS MD5：上游只用它给缓存键做摘要，这里实现完整版本 */
function hdMd5(text) {
  function add32(a, b) { return (a + b) & 0xffffffff; }
  function rol(n, c) { return (n << c) | (n >>> (32 - c)); }
  var bytes = hdUtf8Bytes(text), bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  var low = bitLen & 0xffffffff, high = Math.floor(bitLen / 0x100000000);
  bytes.push(low & 255, (low >>> 8) & 255, (low >>> 16) & 255, (low >>> 24) & 255);
  bytes.push(high & 255, (high >>> 8) & 255, (high >>> 16) & 255, (high >>> 24) & 255);
  var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  var S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  var K = [];
  for (var i = 0; i < 64; i++) K.push(Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0);
  for (var off = 0; off < bytes.length; off += 64) {
    var M = [];
    for (var j = 0; j < 16; j++) M.push(bytes[off + j * 4] | (bytes[off + j * 4 + 1] << 8) | (bytes[off + j * 4 + 2] << 16) | (bytes[off + j * 4 + 3] << 24));
    var A = a0, B = b0, C = c0, D = d0;
    for (var k = 0; k < 64; k++) {
      var F, g;
      if (k < 16) { F = (B & C) | (~B & D); g = k; }
      else if (k < 32) { F = (D & B) | (~D & C); g = (5 * k + 1) % 16; }
      else if (k < 48) { F = B ^ C ^ D; g = (3 * k + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * k) % 16; }
      var tmp = D;
      D = C; C = B;
      B = add32(B, rol(add32(add32(A, F | 0), add32(K[k], M[g] | 0)), S[(k >> 4) * 4 + (k % 4)]));
      A = tmp;
    }
    a0 = add32(a0, A); b0 = add32(b0, B); c0 = add32(c0, C); d0 = add32(d0, D);
  }
  function hex(n) {
    var out = "";
    for (var i = 0; i < 4; i++) out += ((n >>> (i * 8)) & 255).toString(16).padStart(2, "0");
    return out;
  }
  return hex(a0) + hex(b0) + hex(c0) + hex(d0);
}

/* ============================ 运行时桥接 ============================ */

function hdOrigin(url) {
  var match = /^(https?):\/\/([^/?#]+)/i.exec(String(url || ""));
  return match ? match[1].toLowerCase() + "://" + match[2].toLowerCase() : "";
}
function hdResolve(path, base) {
  var value = String(path === undefined || path === null ? "" : path).trim();
  if (!value) return String(base || "");
  if (/^https?:\/\//i.test(value)) return value;
  if (value.indexOf("//") === 0) return "https:" + value;
  var origin = hdOrigin(base) || String(base || "");
  if (value.charAt(0) === "/") return origin + value;
  var baseUrl = String(base || "").split(/[?#]/)[0];
  var dir = baseUrl && baseUrl.lastIndexOf("/") > 8 ? baseUrl.slice(0, baseUrl.lastIndexOf("/") + 1) : origin + "/";
  return dir + value;
}
function hdQuery(url, query) {
  var pairs = [];
  for (var key in query || {}) {
    if (!Object.prototype.hasOwnProperty.call(query, key)) continue;
    if (query[key] === undefined || query[key] === null || query[key] === "") continue;
    pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(query[key]));
  }
  if (!pairs.length) return String(url);
  return String(url) + (String(url).indexOf("?") >= 0 ? "&" : "?") + pairs.join("&");
}
function hdPayload(response) {
  var data = response && response.data !== undefined ? response.data : response;
  if (typeof data === "string") return data;
  if (data === undefined || data === null) return "";
  return JSON.stringify(data);
}
function hdCtx(params) {
  params = params || {};
  var settings = {
    site: String(params.site || "https://heitaodj.com"),
    cookie: String(params.cookie || ""),
    timeout: Number(params.timeout) || 15,
  };
  return {
    settings: settings,
    cache: { seconds: function (value) { return Number(value) || 0; }, generation: 1 },
    url: { resolve: hdResolve, origin: hdOrigin },
    html: { load: function (html) { return Widget.html.load(String(html || "")); } },
    crypto: { md5: hdMd5, base64Decode: hdB64Decode },
    signal: { throwIfAborted: function () {} },
    fail: function (code, message) {
      var error = new Error(message || code || "请求失败");
      error.code = code;
      throw error;
    },
    http: {
      get: async function (url, options) {
        options = options || {};
        var target = hdQuery(url, options.query);
        var headers = {};
        for (var key in options.headers || {}) {
          if (Object.prototype.hasOwnProperty.call(options.headers, key)) headers[key] = options.headers[key];
        }
        var response = await Widget.http.get(target, {
          headers: headers,
          timeout: Math.max(5, Number(settings.timeout) || 15) * 1000,
        });
        return {
          status: Number(response && (response.status || response.statusCode)) || 200,
          headers: (response && response.headers) || {},
          url: target,
          data: hdPayload(response),
        };
      },
    },
  };
}

/* ============================ 链接编解码 ============================ */

function hdMakeLink(contentId, groupId, episodeId) {
  var packed = groupId && episodeId ? [contentId, groupId, episodeId] : [contentId];
  return "heitao:" + hdB64UrlEncode(JSON.stringify(packed));
}
function hdParseLink(link) {
  var text = String(link || "");
  if (/%3A/i.test(text)) { try { text = decodeURIComponent(text); } catch (_) {} }
  var match = /^heitao:([A-Za-z0-9_-]+)$/.exec(text.trim());
  if (!match) return null;
  try {
    var packed = JSON.parse(hdB64UrlDecode(match[1]));
    if (!Array.isArray(packed) || !packed[0]) return null;
    return { contentId: String(packed[0]), groupId: packed[1] ? String(packed[1]) : "", episodeId: packed[2] ? String(packed[2]) : "" };
  } catch (_) {
    return null;
  }
}

/* ============================ 映射到 Forward ============================ */

function hdCardToItem(card) {
  var link = hdMakeLink(card.id);
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
function hdMapCards(cards) {
  var out = [];
  for (var i = 0; i < cards.length; i++) {
    if (cards[i] && cards[i].id && cards[i].title) out.push(hdCardToItem(cards[i]));
  }
  return out;
}
function hdPageOf(params) {
  var page = parseInt((params || {}).page, 10);
  return page > 0 ? page : 1;
}
function hdNotice(message) {
  return [{
    id: "heitao:notice",
    type: "video",
    title: "黑桃短剧：" + String(message || "请求失败").slice(0, 100),
    seriesName: "黑桃短剧",
    description: "只是提示，点开没有内容；修好后刷新即可恢复。",
    mediaType: "tv",
    link: "heitao:notice",
  }];
}
async function hdList(params, filters) {
  var ctx = hdCtx(params), page = hdPageOf(params);
  var result = await HEITAO_PLUGIN.list(ctx, { cursor: page > 1 ? String(page) : null, filters: filters || {} });
  return hdMapCards((result && result.items) || []);
}

/* ============================ 对外函数 ============================ */

async function loadLatest(params) {
  try {
    return await hdList(params, { category: "all", tag: "" });
  } catch (error) {
    console.log("FW heitao 首页失败: " + ((error && error.message) || error));
    return hdNotice((error && error.message) || "未知错误");
  }
}

async function loadCategory(params) {
  var category = String((params && params.category) || "").trim() || "all";
  var tag = String((params && params.tag) || "").trim();
  try {
    return await hdList(params, { category: category, tag: tag });
  } catch (error) {
    console.log("FW heitao 栏目 " + category + " 失败: " + ((error && error.message) || error));
    return hdNotice((error && error.message) || "未知错误");
  }
}

async function search(params) {
  var keyword = String((params && params.keyword) || "").trim();
  if (!keyword) return [];
  var ctx = hdCtx(params), page = hdPageOf(params);
  try {
    var result = await HEITAO_PLUGIN.search(ctx, { query: keyword, cursor: page > 1 ? String(page) : null });
    return hdMapCards((result && result.items) || []);
  } catch (error) {
    console.log("FW heitao 搜索失败: " + ((error && error.message) || error));
    return hdNotice((error && error.message) || "未知错误");
  }
}

async function loadDetail(input) {
  var link = typeof input === "string" ? input : (input && (input.link || input.id || input.url)) || "";
  var parsed = hdParseLink(link);
  if (!parsed) return null;
  var params = (input && typeof input === "object" && input.site) ? input : {};
  var ctx = hdCtx(params);
  try {
    var detail = await HEITAO_PLUGIN.detail(ctx, { id: parsed.contentId });
    if (!detail || !detail.groups || !detail.groups.length) return null;
    var title = detail.title || parsed.contentId;
    var episodeItems = [], index = 0;
    for (var g = 0; g < detail.groups.length; g++) {
      var group = detail.groups[g];
      var episodes = group.episodes || [];
      for (var e = 0; e < episodes.length; e++) {
        index++;
        var itemLink = hdMakeLink(parsed.contentId, group.id, episodes[e].id);
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
      id: hdMakeLink(parsed.contentId),
      type: "url",
      title: title,
      seriesName: title,
      mediaType: "tv",
      episodeItems: episodeItems,
      link: hdMakeLink(parsed.contentId),
    };
    if (detail.poster) { result.posterPath = detail.poster; result.backdropPath = detail.poster; }
    if (detail.summary) result.description = detail.summary;
    return result;
  } catch (error) {
    console.log("FW heitao 详情失败: " + ((error && error.message) || error));
    return null;
  }
}

async function loadResource(params) {
  params = params || {};
  if (params.multiSource === "disabled") return [];
  var parsed = hdParseLink(params.link || params.url || params.id);
  if (!parsed || !parsed.groupId || !parsed.episodeId) {
    console.log("FW heitao 播放参数无效，请重新打开详情");
    return [];
  }
  var ctx = hdCtx(params);
  try {
    var result = await HEITAO_PLUGIN.play(ctx, {
      contentId: parsed.contentId,
      groupId: parsed.groupId,
      episodeId: parsed.episodeId,
    });
    var sources = (result && result.sources) || [], output = [];
    for (var i = 0; i < sources.length; i++) {
      var source = sources[i];
      if (!source || !/^https?:\/\//i.test(String(source.url || ""))) continue;
      var duplicate = false;
      for (var j = 0; j < output.length; j++) if (output[j].url === source.url) duplicate = true;
      if (duplicate) continue;
      output.push({
        name: "黑桃短剧 · " + (source.name || ("线路" + (output.length + 1))),
        description: /mpegurl/i.test(String(source.mime || "")) ? "HLS" : "视频",
        url: source.url,
        customHeaders: source.headers || {},
        playerType: "app",
      });
    }
    if (!output.length) console.log("FW heitao 没有解析到可播放线路");
    return output;
  } catch (error) {
    console.log("FW heitao 播放失败: " + ((error && error.message) || error));
    return [];
  }
}
