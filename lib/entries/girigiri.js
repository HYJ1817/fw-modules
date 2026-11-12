/* girigiri 动漫（WeBox 移植版）· 入口层
 * 本文件不单独使用：由 scripts/build-girigiri.js 把 lib/vendor/girigiri-core.js
 * （WeBox 插件原文，逐字保留）拼在本文件之后，生成 widgets/girigiri.js。
 *
 * 站点是普通 HTML + player_aaaa 脚本，没有加密通道与媒体改写，
 * 所以只补一层 Forward 运行时桥接 + 结果映射即可。
 */

var GIRIGIRI_PLUGIN = null;
var WeBox = {
  define: function (options) {
    GIRIGIRI_PLUGIN = options;
  },
};

WidgetMetadata = {
  id: "hyj1817.girigiri.home",
  title: "girigiri 动漫",
  description: "girigiri 动漫首页、日番、搜索、详情与分集（WeBox 插件移植）",
  author: "HYJ1817",
  icon: "https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/icon.png",
  site: "https://anime.girigirilove.icu",
  version: "1.0.1",
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
    { name: "site", title: "网站地址", type: "input", description: "站点换域名时改这里，默认 https://anime.girigirilove.icu" },
    { name: "cookie", title: "网站 Cookie（可选）", type: "input", description: "只填自己的合法会话；站点要求验证时用" },
  ],
  modules: [
    {
      id: "home",
      title: "首页推荐",
      functionName: "loadHome",
      type: "video",
      cacheDuration: 300,
      params: [{ name: "page", title: "页码", type: "page", value: "1" }],
    },
    {
      id: "categories",
      title: "日番",
      functionName: "loadJapan",
      type: "video",
      cacheDuration: 600,
      params: [{ name: "page", title: "页码", type: "page", value: "1" }],
    },
    {
      id: "loadResource",
      title: "girigiri 播放线路",
      functionName: "loadResource",
      type: "stream",
      cacheDuration: 0,
      params: [],
    },
  ],
  search: {
    title: "girigiri 搜索",
    functionName: "search",
    params: [
      { name: "keyword", title: "关键词", type: "input" },
      { name: "page", title: "页码", type: "page", value: "1" },
    ],
  },
};

/* ============================ 运行时桥接 ============================ */

/* ============================ 运行时兜底 ============================ */
/* Forward 的 widget 运行时没有保证提供 atob / TextDecoder（4kvm 的单测里就断言过没有 TextEncoder）。
 * 上游插件解码播放地址时两者都用，所以这里补一份等价实现，有原生就用原生。 */
function ggAtob(value) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var text = String(value || "").replace(/[^A-Za-z0-9+/=]/g, "").replace(/=+$/, "");
  var out = "", buffer = 0, bits = 0, i, index;
  for (i = 0; i < text.length; i++) {
    index = chars.indexOf(text.charAt(i));
    if (index < 0) throw new Error("invalid base64");
    buffer = ((buffer << 6) | index) & 0xffffff;
    bits += 6;
    if (bits >= 8) { bits -= 8; out += String.fromCharCode((buffer >> bits) & 255); }
  }
  return out;
}
function ggTextDecoder() {
  this.decode = function (bytes) {
    var input = bytes || [], out = "", i = 0, code;
    while (i < input.length) {
      var b = input[i++];
      if (b < 0x80) code = b;
      else if (b >= 0xf0) code = ((b & 7) << 18) | ((input[i++] & 63) << 12) | ((input[i++] & 63) << 6) | (input[i++] & 63);
      else if (b >= 0xe0) code = ((b & 15) << 12) | ((input[i++] & 63) << 6) | (input[i++] & 63);
      else code = ((b & 31) << 6) | (input[i++] & 63);
      if (code > 0xffff) {
        code -= 0x10000;
        out += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 1023));
      } else out += String.fromCharCode(code);
    }
    return out;
  };
}
var atob = (typeof globalThis !== "undefined" && typeof globalThis.atob === "function") ? globalThis.atob : ggAtob;
var TextDecoder = (typeof globalThis !== "undefined" && typeof globalThis.TextDecoder === "function") ? globalThis.TextDecoder : ggTextDecoder;

function ggOrigin(url) {
  var match = /^(https?):\/\/([^/?#]+)/i.exec(String(url || ""));
  return match ? match[1].toLowerCase() + "://" + match[2].toLowerCase() : "";
}
function ggResolve(path, base) {
  var value = String(path === undefined || path === null ? "" : path).trim();
  if (!value) return String(base || "");
  if (/^https?:\/\//i.test(value)) return value;
  if (value.indexOf("//") === 0) return "https:" + value;
  var origin = ggOrigin(base) || String(base || "");
  if (value.charAt(0) === "/") return origin + value;
  var baseUrl = String(base || "").split(/[?#]/)[0];
  var dir = baseUrl && baseUrl.lastIndexOf("/") > 8 ? baseUrl.slice(0, baseUrl.lastIndexOf("/") + 1) : origin + "/";
  return dir + value;
}
function ggText(response) {
  var data = response && response.data !== undefined ? response.data : response;
  if (typeof data === "string") return data;
  if (data === undefined || data === null) return "";
  return JSON.stringify(data);
}
/** Forward 的 HTML 解析器若缺 clone/remove，补一个够用于 anthology 标签页的实现 */
function ggHtmlLoad(html) {
  var $ = Widget.html.load(String(html || ""));
  if ($ && $.fn) {
    if (typeof $.fn.clone !== "function") {
      $.fn.clone = function () {
        var nodes = [];
        this.each(function (index, element) {
          nodes.push(element && element.cloneNode ? element.cloneNode(true) : element);
        });
        return $(nodes);
      };
    }
    if (typeof $.fn.remove !== "function") {
      $.fn.remove = function () {
        this.each(function (index, element) {
          if (element && element.parentNode) element.parentNode.removeChild(element);
        });
        return this;
      };
    }
  }
  return $;
}
function ggCtx(params) {
  params = params || {};
  var settings = {
    site: String(params.site || "https://anime.girigirilove.icu"),
    cookie: String(params.cookie || ""),
  };
  return {
    settings: settings,
    url: { resolve: ggResolve, origin: ggOrigin },
    html: { load: ggHtmlLoad },
    signal: { throwIfAborted: function () {} },
    fail: function (code, message) {
      var error = new Error(message || code || "请求失败");
      error.code = code;
      throw error;
    },
    http: {
      get: async function (url, options) {
        options = options || {};
        var headers = {};
        for (var key in options.headers || {}) {
          if (Object.prototype.hasOwnProperty.call(options.headers, key)) headers[key] = options.headers[key];
        }
        var response = await Widget.http.get(url, {
          headers: headers,
          timeout: Math.max(5, Number(settings.timeout) || 18) * 1000,
        });
        return {
          status: Number(response && (response.status || response.statusCode)) || 200,
          headers: (response && response.headers) || {},
          url: (response && response.url) || url,
          data: ggText(response),
        };
      },
    },
  };
}

/* ============================ 链接编解码 ============================ */

function ggMakeLink(id, groupId, episodeId) {
  var packed = groupId && episodeId ? [String(id), String(groupId), String(episodeId)] : [String(id)];
  return "girigiri:" + packed.join("-");
}
function ggParseLink(link) {
  var text = String(link || "");
  if (/%3A/i.test(text)) { try { text = decodeURIComponent(text); } catch (_) {} }
  var match = /^girigiri:([1-9]\d{0,11})(?:-([1-9]\d{0,11})-([1-9]\d{0,11}))?$/.exec(text.trim());
  if (!match) return null;
  return { id: match[1], groupId: match[2] || "", episodeId: match[3] || "" };
}

/* ============================ 映射到 Forward ============================ */

function ggToItem(card) {
  var link = ggMakeLink(card.id);
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
function ggNotice(message) {
  return [{
    id: "girigiri:notice",
    type: "video",
    title: "girigiri：" + String(message || "请求失败").slice(0, 100),
    seriesName: "girigiri 动漫",
    description: "只是提示，点开没有内容；修好后刷新即可恢复。",
    mediaType: "tv",
    link: "girigiri:0",
  }];
}
function ggPageOf(params) {
  var page = parseInt((params || {}).page, 10);
  return page > 0 ? page : 1;
}
/* 插件用「游标」表示下一页（cursor 里带站点、scope 与站内路径）。
 * Forward 只给页码，所以这里按需向后走页：拿到第 1 页的 nextCursor 就存下来，
 * 请求第 N 页时从已有游标依次往下走，最多走 10 页，避免一次点太深的页码打出几十个请求。 */
var GG_CURSORS = {};

function ggStateKey(ctx, category, query) {
  return ggOrigin(ctx.settings.site) + "|" + category + "|" + (query || "");
}
async function ggPage(params, category, query, page) {
  var ctx = ggCtx(params);
  var key = ggStateKey(ctx, category, query);
  var state = GG_CURSORS[key];
  if (!state) {
    state = { cursors: [null], pages: {} };
    GG_CURSORS[key] = state;
  }
  var guard = 0;
  var fetched = Object.keys(state.pages).length;
  while (fetched < page && guard < 10) {
    var index = fetched + 1;
    var request = { cursor: state.cursors[index - 1] };
    var result;
    if (category === "search") {
      request.query = query;
      result = await GIRIGIRI_PLUGIN.search(ctx, request);
    } else {
      request.filters = { category: category };
      result = await GIRIGIRI_PLUGIN.list(ctx, request);
    }
    state.pages[index] = (result && result.items) || [];
    fetched++;
    guard++;
    if (!result || !result.nextCursor) break;
    state.cursors.push(result.nextCursor);
  }
  return state.pages[page] || [];
}
function ggMapItems(cards) {
  var mapped = [];
  for (var i = 0; i < cards.length; i++) {
    if (cards[i] && cards[i].id && cards[i].title) mapped.push(ggToItem(cards[i]));
  }
  return mapped;
}

/* ============================ 对外函数 ============================ */

async function loadHome(params) {
  try {
    return ggMapItems(await ggPage(params, "home", "", ggPageOf(params)));
  } catch (error) {
    console.log("FW girigiri 首页失败: " + ((error && error.message) || error));
    return ggNotice((error && error.message) || "未知错误");
  }
}

async function loadJapan(params) {
  try {
    return ggMapItems(await ggPage(params, "japan", "", ggPageOf(params)));
  } catch (error) {
    console.log("FW girigiri 日番失败: " + ((error && error.message) || error));
    return ggNotice((error && error.message) || "未知错误");
  }
}

async function search(params) {
  var keyword = String((params && params.keyword) || "").trim();
  if (!keyword) return [];
  try {
    return ggMapItems(await ggPage(params, "search", keyword, ggPageOf(params)));
  } catch (error) {
    console.log("FW girigiri 搜索失败: " + ((error && error.message) || error));
    return ggNotice((error && error.message) || "未知错误");
  }
}

async function loadDetail(input) {
  var link = typeof input === "string" ? input : (input && (input.link || input.id || input.url)) || "";
  var parsed = ggParseLink(link);
  if (!parsed) return null;
  var params = (input && typeof input === "object" && input.site) ? input : {};
  var ctx = ggCtx(params);
  try {
    var detail = await GIRIGIRI_PLUGIN.detail(ctx, { id: parsed.id });
    if (!detail) return null;
    var title = detail.title || ("GV" + parsed.id);
    var groups = detail.groups || [], episodeItems = [], index = 0;
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var episodes = group.episodes || [];
      for (var e = 0; e < episodes.length; e++) {
        index++;
        var itemLink = ggMakeLink(parsed.id, group.id, episodes[e].id);
        var name = episodes[e].name || ("第" + (index) + "集");
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
      id: ggMakeLink(parsed.id),
      type: "url",
      title: title,
      seriesName: title,
      mediaType: "tv",
      episodeItems: episodeItems,
      link: ggMakeLink(parsed.id),
    };
    if (detail.poster) { result.posterPath = detail.poster; result.backdropPath = detail.poster; }
    if (detail.summary) result.description = detail.summary;
    return result;
  } catch (error) {
    console.log("FW girigiri 详情失败: " + ((error && error.message) || error));
    return null;
  }
}

async function loadResource(params) {
  params = params || {};
  if (params.multiSource === "disabled") return [];
  var parsed = ggParseLink(params.link || params.url || params.id);
  if (!parsed || !parsed.groupId || !parsed.episodeId) {
    console.log("FW girigiri 播放参数无效，请重新打开详情");
    return [];
  }
  var ctx = ggCtx(params);
  try {
    var result = await GIRIGIRI_PLUGIN.play(ctx, {
      contentId: parsed.id,
      groupId: parsed.groupId,
      episodeId: parsed.episodeId,
    });
    var sources = (result && result.sources) || [], output = [];
    for (var i = 0; i < sources.length; i++) {
      var source = sources[i];
      if (!source || !/^https?:\/\//i.test(String(source.url || ""))) continue;
      output.push({
        name: "girigiri · " + (source.name || ("线路" + (i + 1))),
        description: /mpegurl/i.test(String(source.mime || "")) ? "HLS" : "视频",
        url: source.url,
        customHeaders: source.headers || {},
        playerType: "app",
      });
    }
    if (!output.length) console.log("FW girigiri 没有解析到可播放线路");
    return output;
  } catch (error) {
    console.log("FW girigiri 播放失败: " + ((error && error.message) || error));
    return [];
  }
}
