// Rex 模块：SupJav（supjav.blog）
// 列表 / 分类 / 搜索 / 详情 / 播放。
// 播放链路：视频页 iframe -> upload18.org 播放页 -> window.PLAYER_CONFIG.m3u8（helvid.com 签名 HLS）
//          helvid 的边缘节点只放行桌面 Chrome UA，因此播放项需带 customHeaders。
var SITE = "https://supjav.blog";
var PLAY_HOST = "https://upload18.org";
var UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var PLAY_HEADERS = { "User-Agent": UA, Referer: PLAY_HOST + "/" };

WidgetMetadata = {
  id: "user.supjav",
  title: "SupJav",
  description: "supjav.blog 列表、分类、搜索与 upload18 HLS 播放源",
  author: "Tiamo",
  version: "1.3.0",
  requiredVersion: "0.0.1",
  detailCacheDuration: 30,
  search: {
    title: "SupJav 搜索",
    functionName: "searchVideos",
    params: [
      { name: "keyword", title: "关键词 / 番号 / 演员", type: "input" },
      { name: "page", title: "页码", type: "page" },
    ],
  },
  modules: [
    {
      id: "loadResource",
      title: "SupJav 播放线路",
      functionName: "loadResource",
      type: "stream",
      cacheDuration: 0,
      params: [],
    },
    {
      id: "user.supjav.search",
      title: "搜索",
      description: "关键词 / 番号 / 演员搜索",
      requiresWebView: false,
      cacheDuration: 60,
      functionName: "searchVideos",
      params: [
        { name: "keyword", title: "关键词 / 番号 / 演员", type: "input", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.supjav.latest",
      title: "最新",
      description: "首页最新更新",
      requiresWebView: false,
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.supjav.uncensored",
      title: "无码",
      description: "Uncensored",
      requiresWebView: false,
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/uncensored" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.supjav.leaked",
      title: "无码流出",
      description: "Uncensored Leaked",
      requiresWebView: false,
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/uncensored-leaked" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.supjav.censored",
      title: "有码",
      description: "Censored",
      requiresWebView: false,
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/censored" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.supjav.chinese",
      title: "中文字幕",
      description: "Chinese AV",
      requiresWebView: false,
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/chinese" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.supjav.amateur",
      title: "素人",
      description: "Amateur",
      requiresWebView: false,
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/amateur" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.supjav.actor",
      title: "演员作品",
      description: "填入演员名，列出本站她的全部作品",
      requiresWebView: false,
      cacheDuration: 120,
      functionName: "loadActorList",
      params: [
        { name: "actor", title: "演员名（如 rika omi）", type: "input", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.supjav.genre",
      title: "分类标签",
      description: "填入标签名，如 censored / amateur / anal",
      requiresWebView: false,
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "genre", title: "标签名", type: "input", value: "censored" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
  ],
};

function headers(referer) {
  var h = {
    "User-Agent": UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };
  if (referer) h.Referer = referer;
  return h;
}

async function getText(url, referer) {
  var resp = await Widget.http.get(url, { headers: headers(referer) });
  var d = resp && resp.data;
  return typeof d === "string" ? d : JSON.stringify(d || "");
}

var NAMED = {
  rsquo: "'",
  lsquo: "'",
  ldquo: '"',
  rdquo: '"',
  ndash: "–",
  mdash: "—",
  middot: "·",
  apos: "'",
  amp: "&",
  quot: '"',
  nbsp: " ",
  hellip: "…",
  lt: "<",
  gt: ">",
};

function decodeEntities(s) {
  return String(s == null ? "" : s)
    .replace(/&([a-zA-Z]+);/g, function (m, name) {
      var v = NAMED[name.toLowerCase()];
      return v === undefined ? m : v;
    })
    .replace(/&#(\d+);/g, function (m, n) {
      return String.fromCharCode(parseInt(n, 10));
    });
}

function clean(s) {
  return decodeEntities(String(s || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

// 列表页/首页都可能有多段 box-item-list，只保留第一段（最新）用于首页
function listingHtml(html) {
  var h = String(html || "");
  var start = h.indexOf("box-item-list");
  if (start < 0) start = 0;
  var end = h.length;
  var marks = ['class="pagination', 'class="pagination ', "<!-- =====", 'id="footer'];
  for (var i = 0; i < marks.length; i++) {
    var j = h.indexOf(marks[i], start);
    if (j > 0 && j < end) end = j;
  }
  return h.slice(start, end);
}

function slugFromHref(href) {
  var v = String(href || "");
  var m = v.match(/[?&]slug=([a-z0-9-]+)/i) || v.match(/\/video\/([a-z0-9-]+)/i) || v.match(/^video\/([a-z0-9-]+)/i);
  return m ? m[1].toLowerCase() : "";
}

function videoUrlFrom(link) {
  var raw = String(link || "").split("#")[0].trim();
  var slug = slugFromHref(raw);
  if (!slug && /^[a-z0-9][a-z0-9-]*$/i.test(raw)) slug = raw.toLowerCase();
  if (slug) return SITE + "/video/" + slug;
  if (!/^https?:\/\//.test(raw)) return SITE + "/" + raw.replace(/^\//, "");
  return raw;
}

function parseCards(html) {
  var h = listingHtml(html);
  var out = [];
  var seen = {};
  var re = /<div class='box-item'>/g;
  var starts = [];
  var m;
  while ((m = re.exec(h))) starts.push(m.index);
  for (var i = 0; i < starts.length; i++) {
    var seg = h.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : Math.min(starts[i] + 4000, h.length));
    var a = seg.match(/<a href='([^']+)'/);
    if (!a) continue;
    var slug = slugFromHref(a[1]);
    if (!slug || seen[slug]) continue;
    var img = seg.match(/<img[^>]+src='([^']+)'/);
    var alt = seg.match(/<img[^>]+alt='([^']*)'/);
    var title = clean(alt ? alt[1] : "");
    if (!title) title = clean(seg.replace(/<img[^>]*>/g, "").replace(/<[^>]+>/g, " "));
    if (!title) title = slug.toUpperCase();
    seen[slug] = 1;
    out.push({
      slug: slug,
      url: SITE + "/video/" + slug,
      title: title.slice(0, 200),
      img: img ? img[1] : "",
    });
  }
  return out;
}

function pageUrl(path, page) {
  var p = parseInt(page || 1, 10);
  if (isNaN(p) || p < 1) p = 1;
  var base = String(path || "/");
  if (base.charAt(0) !== "/") base = "/" + base;
  return SITE + base + (p > 1 ? (base.indexOf("?") >= 0 ? "&" : "?") + "page=" + p : "");
}

// Rex 不同界面（全局搜索 / 列表 / 详情）读的封面字段不一样，这里把所有别名一次填满
function withImages(item, url) {
  if (!url) return item;
  item.coverUrl = url;
  item.posterUrl = url;
  item.posterURL = url;
  item.posterurl = url;
  item.poster_url = url;
  item.posterPath = url;
  item.poster_path = url;
  item.backdropPath = url;
  item.backdropPaths = [url];
  item.thumbnailUrl = url;
  item.imageUrl = url;
  item.detailPoster = url;
  item.detailPosterUrl = url;
  item.detailPosterURL = url;
  item.detail_poster = url;
  item.detail_poster_path = url;
  return item;
}

// ---------- 中文标题（机器翻译 + 本地缓存） ----------
var ZH_CACHE_KEY = "supjav:zh:v1";
var ZH_CACHE_MAX = 2000;
var zhCache = null;

async function loadZhCache() {
  if (zhCache) return zhCache;
  zhCache = {};
  try {
    var raw = await Widget.storage.get(ZH_CACHE_KEY);
    if (raw) {
      var obj = JSON.parse(raw);
      if (obj && typeof obj === "object") zhCache = obj;
    }
  } catch (e) {}
  return zhCache;
}

async function saveZhCache() {
  try {
    var keys = Object.keys(zhCache);
    if (keys.length > ZH_CACHE_MAX) {
      var trim = {};
      for (var i = keys.length - ZH_CACHE_MAX; i < keys.length; i++) trim[keys[i]] = zhCache[keys[i]];
      zhCache = trim;
    }
    await Widget.storage.set(ZH_CACHE_KEY, JSON.stringify(zhCache));
  } catch (e) {}
}

// 番号：DLDSS-555 / FC2-PPV-4991795 / IENFH-20702
function splitCode(title) {
  var text = clean(title);
  // 去掉开头的 [UNCENSORED-LEAK] 这类标签，只当备注
  var tag = "";
  var lead = text.match(/^\[[^\]]{1,40}\]\s*/);
  if (lead) {
    tag = lead[0].replace(/[\[\]]/g, "").trim();
    text = text.slice(lead[0].length);
  }
  var m = text.match(/^((?:FC2[\s_-]?PPV[\s_-]?\d{4,})|[A-Za-z]{2,6}[\s_-]?\d{2,6}(?:[\s_-]\d{1,6})?)/);
  if (m) {
    return {
      code: m[1].toUpperCase().replace(/[\s_]+/g, "-"),
      rest: text.slice(m[1].length).replace(/^[\s\-–—:|、]+/, ""),
      tag: tag,
    };
  }
  // 番号不在开头时，从正文里捞一个
  var inner = text.match(/(?:FC2[\s_-]?PPV[\s_-]?\d{4,})|[A-Z]{2,6}[-_]\d{2,6}/);
  if (inner) {
    return { code: inner[0].toUpperCase().replace(/[\s_]+/g, "-"), rest: text, tag: tag };
  }
  return { code: "", rest: text, tag: tag };
}

function extractCode(title) {
  return splitCode(title).code;
}

function encodeLen(text) {
  try {
    return encodeURIComponent(text).length;
  } catch (e) {
    return String(text).length * 3;
  }
}

// 一次请求翻译多条（换行分隔，Google 会按行返回）
async function translateChunk(lines) {
  var url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=" +
    encodeURIComponent(lines.join("\n"));
  var resp = await Widget.http.get(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json,text/plain,*/*",
    },
  });
  var body = String((resp && resp.data) || "");
  if (typeof body !== "string") body = JSON.stringify(body);
  var data;
  try {
    data = JSON.parse(body);
  } catch (e) {
    return null;
  }
  if (!data || !data[0] || !data[0].length) return null;
  var text = "";
  for (var i = 0; i < data[0].length; i++) {
    if (data[0][i] && data[0][i][0]) text += data[0][i][0];
  }
  var out = text.split("\n");
  if (out.length < lines.length) return null;
  return out.slice(0, lines.length);
}

var CJK_RE = /[\u3400-\u9FFF\uF900-\uFAFF]/;

function hasCJK(s) {
  return CJK_RE.test(String(s || ""));
}

// ---- getav 同番号中文标题：比机翻准，作为中文标题的首选来源 ----
var GETAV = "https://getav.net";
var GETAV_HEADERS = {
  "User-Agent": UA,
  RSC: "1",
  Accept: "*/*",
};

async function lookupGetavTitle(code) {
  var key = String(code || "").toUpperCase().trim();
  if (!key) return "";
  var ck = "getav:" + key;
  if (zhGetav[ck] !== undefined) return zhGetav[ck];
  var hit = "";
  try {
    var resp = await Widget.http.get(
      GETAV + "/zh/search?q=" + encodeURIComponent(key) + "&page=1",
      { headers: GETAV_HEADERS }
    );
    var body = typeof (resp && resp.data) === "string" ? resp.data : JSON.stringify((resp && resp.data) || "");
    var re = new RegExp('"id":"' + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '","title":"((?:[^"\\\\]|\\\\.)*)"');
    var m = body.match(re);
    if (m && m[1]) {
      var t = clean(m[1].replace(/\\u([0-9a-fA-F]{4})/g, function (_x, h) {
        return String.fromCharCode(parseInt(h, 16));
      }));
      if (hasCJK(t)) hit = t;
    }
  } catch (e) {
    hit = "";
  }
  if (hit) zhGetav[ck] = hit;
  return hit;
}

// 单条兜底翻译：批量接口抽风（换行被合并、返回条数不对）时用，两个备用端点轮流试
async function translateOneLine(text) {
  var src = String(text || "").trim();
  if (!src) return "";
  var enc = encodeURIComponent(src);
  var urls = [
    "https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=zh-CN&q=" + enc,
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=" + enc,
  ];
  for (var i = 0; i < urls.length; i++) {
    try {
      var resp = await Widget.http.get(urls[i], {
        headers: { "User-Agent": UA, Accept: "application/json,text/plain,*/*" },
      });
      var body = typeof (resp && resp.data) === "string" ? resp.data : JSON.stringify((resp && resp.data) || "");
      var data = JSON.parse(body);
      var zh = "";
      if (Object.prototype.toString.call(data) === "[object Array]") {
        if (typeof data[0] === "string") zh = data[0];
        else if (data[0] && data[0][0] && typeof data[0][0][0] === "string") {
          for (var j = 0; j < data[0].length; j++) if (data[0][j] && data[0][j][0]) zh += data[0][j][0];
        }
      }
      zh = String(zh || "").trim();
      if (zh && hasCJK(zh)) return zh;
    } catch (e) {}
  }
  return "";
}

async function translateTexts(texts) {
  var cache = await loadZhCache();
  var result = [];
  var missing = [];
  var missingIdx = [];
  for (var i = 0; i < texts.length; i++) {
    var src = String(texts[i] || "").trim();
    if (!src) {
      result[i] = "";
      continue;
    }
    if (cache[src]) {
      result[i] = cache[src];
    } else {
      missing.push(src);
      missingIdx.push(i);
    }
  }
  if (!missing.length) return result;

  // 按 URL 长度分块，单块不超过 ~1500 编码字符
  var chunks = [];
  var cur = [];
  var curLen = 0;
  for (var k = 0; k < missing.length; k++) {
    var len = encodeLen(missing[k]) + 4;
    if (cur.length && curLen + len > 1500) {
      chunks.push(cur);
      cur = [];
      curLen = 0;
    }
    cur.push(missing[k]);
    curLen += len;
  }
  if (cur.length) chunks.push(cur);

  for (var c = 0; c < chunks.length; c++) {
    var zhLines = null;
    try {
      zhLines = await translateChunk(chunks[c]);
    } catch (e) {
      zhLines = null;
    }
    for (var j = 0; j < chunks[c].length; j++) {
      var srcText = chunks[c][j];
      var zh = zhLines && zhLines[j] ? String(zhLines[j]).trim() : "";
      if (zh && hasCJK(zh)) cache[srcText] = zh;
    }
  }
  // 批量没拿到中文的，逐条补翻（4 路并发）
  var retry = [];
  for (var m = 0; m < missing.length; m++) {
    var got = cache[missing[m]] || "";
    if (!got || !hasCJK(got)) retry.push(missing[m]);
  }
  if (retry.length) {
    for (var r = 0; r < retry.length; r += 4) {
      var slice = retry.slice(r, r + 4);
      var fresh = await Promise.all(
        slice.map(function (t) {
          return translateOneLine(t);
        })
      );
      for (var q = 0; q < slice.length; q++) {
        if (fresh[q]) cache[slice[q]] = fresh[q];
      }
    }
  }
  for (var m2 = 0; m2 < missing.length; m2++) {
    result[missingIdx[m2]] = cache[missing[m2]] || "";
  }
  try {
    await saveZhCache();
  } catch (e) {}
  return result;
}

// 标题改成「番号 + 中文」，原文塞进 description
function stripTitleNoise(text, title) {
  var t = clean(text || "");
  if (!t) return "";
  var probe = clean(title || "").toLowerCase();
  if (probe.length > 12 && t.toLowerCase().indexOf(probe.slice(0, 40)) >= 0) return "";
  t = t.replace(/^[\u300c\u300e\[\u3010][^\u300d\u300f\]\u3011]{4,200}[\u300d\u300f\]\u3011]\s*/, "");
  return t;
}

var zhPending = {};
var zhGetav = {};

async function localizeTitle(rawTitle, fallbackDesc) {
  var parts = splitCode(rawTitle);
  var raw = parts.rest || parts.code;
  if (!raw && !parts.code) return { title: "", description: fallbackDesc || "" };

  // 1) 番号能对上就先用 getav 的中文标题（官方译名，最准）
  if (parts.code) {
    var gv = await lookupGetavTitle(parts.code);
    if (gv) {
      var gTitle = gv.toUpperCase().indexOf(parts.code) === 0 ? gv : parts.code + " " + gv;
      return { title: gTitle, description: parts.code };
    }
  }

  // 2) 机翻兜底
  var zh = zhPending[raw];
  if (zh === undefined || !zh) {
    try {
      var arr = await translateTexts([raw]);
      zh = (arr && arr[0]) || "";
    } catch (e) {
      zh = "";
    }
    if (zh && hasCJK(zh)) zhPending[raw] = zh;
    else zh = "";
  }
  var title = zh ? (parts.code ? parts.code + " " + zh : zh) : clean(rawTitle);
  var desc = fallbackDesc || "";
  if (zh) desc = parts.code ? parts.code : raw.slice(0, 120);
  return { title: title, description: desc };
}

async function toItems(cards) {
  var parsed = cards.map(function (c) {
    return splitCode(c.title);
  });
  var bodies = parsed.map(function (p) {
    return p.rest || p.code;
  });
  var zhList = [];
  try {
    zhList = await translateTexts(bodies);
  } catch (e) {
    zhList = [];
  }
  // 机翻没出中文的，按番号去 getav 抄中文标题（最多补 12 条，4 路并发）
  var miss = [];
  for (var mi = 0; mi < parsed.length; mi++) {
    if (!hasCJK(zhList[mi] || "") && parsed[mi].code) miss.push(mi);
  }
  if (miss.length) {
    miss = miss.slice(0, 12);
    for (var mq = 0; mq < miss.length; mq += 4) {
      var chunk = miss.slice(mq, mq + 4);
      var found = await Promise.all(
        chunk.map(function (ix) {
          return lookupGetavTitle(parsed[ix].code);
        })
      );
      for (var fq = 0; fq < chunk.length; fq++) {
        if (found[fq]) zhList[chunk[fq]] = found[fq].toUpperCase().indexOf(parsed[chunk[fq]].code) === 0
          ? found[fq].slice(parsed[chunk[fq]].code.length).trim()
          : found[fq];
      }
    }
  }
  return cards.map(function (c, idx) {
    var p = parsed[idx];
    var zh = zhList[idx] || "";
    var title = zh ? (p.code ? p.code + " " + zh : zh) : clean(c.title) || p.code;
    var desc = "";
    if (zh) desc = (p.tag ? "[" + p.tag + "] " : "") + (p.rest || "").slice(0, 200);
    return withImages(
      {
        id: c.url,
        type: "detail",
        mediaType: "movie",
        title: title,
        link: c.url,
        description: desc,
      },
      c.img || ""
    );
  });
}

async function loadList(params) {
  params = params || {};
  var path = params.path;
  if (params.genre && String(params.genre).trim()) {
    path = "/category/" + encodeURIComponent(String(params.genre).trim());
  }
  if (!path) path = "/";
  var url = pageUrl(path, params.page);
  var html = await getText(url, SITE + "/");
  var cards = parseCards(html);
  if (!cards.length && params.page) {
    cards = parseCards(await getText(pageUrl(path, 1), SITE + "/"));
  }
  return await toItems(cards);
}

async function searchVideos(params) {
  params = params || {};
  var kw = String(params.keyword || params.query || "").trim();
  if (!kw) return [];
  var p = parseInt(params.page || 1, 10);
  if (isNaN(p) || p < 1) p = 1;
  var url = SITE + "/search?keyword=" + encodeURIComponent(kw) + (p > 1 ? "&page=" + p : "");
  var html = await getText(url, SITE + "/");
  return await toItems(parseCards(html));
}

function runtimeToSeconds(v) {
  var s = String(v || "").trim();
  var hms = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (hms) return parseInt(hms[1], 10) * 3600 + parseInt(hms[2], 10) * 60 + parseInt(hms[3], 10);
  var hm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);
  var mins = s.match(/^(\d{1,3})\s*min/i);
  if (mins) return parseInt(mins[1], 10) * 60;
  return 0;
}

function prettyDuration(sec) {
  sec = parseInt(sec || 0, 10);
  if (!sec) return "";
  var h = Math.floor(sec / 3600);
  var m = Math.floor((sec % 3600) / 60);
  var s = sec % 60;
  return (h ? h + ":" : "") + (h && m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}

function actressNames(value) {
  return String(value || "")
    .split(/[,，、&]/)
    .map(function (v) {
      return clean(v);
    })
    .filter(function (v) {
      return v && !/^(unknown|updating|n\/a|-)$/i.test(v);
    });
}

// 本站搜索是整串模糊匹配：不加引号时 "rika omi" 只命中标题里连写的那几条，
// 加引号才是短语精确匹配（实测多命中 1 条正主作品并排除同名不同人）。
function quoteKeyword(name) {
  return '"' + String(name || "").trim() + '"';
}

function actorSearchUrl(name) {
  return SITE + "/search?keyword=" + encodeURIComponent(quoteKeyword(name));
}

function actorPlainSearchUrl(name) {
  return SITE + "/search?keyword=" + encodeURIComponent(String(name || "").trim());
}

// 演员名拆词：用来判定一条结果到底是不是这个人的作品
function actorTokens(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[-_.]+/g, " ")
    .split(/\s+/)
    .map(function (t) {
      return t.replace(/[^0-9a-z\u4e00-\u9fa5]/g, "");
    })
    .filter(function (t) {
      return t && t.length >= 2;
    });
}

function titleMatchesActor(title, tokens) {
  if (!tokens || !tokens.length) return true;
  var text = String(title || "").toLowerCase();
  var need = tokens.length <= 2 ? tokens.length : tokens.length - 1;
  var hit = 0;
  for (var i = 0; i < tokens.length; i++) {
    if (text.indexOf(tokens[i]) >= 0) hit++;
  }
  return hit >= need;
}

function actorDisplayName(value) {
  var text = String(value || "").replace(/[-_]+/g, " ").trim();
  try {
    text = decodeURIComponent(text);
  } catch (_) {}
  return text.replace(/\b([a-z])/g, function (m, ch) {
    return ch.toUpperCase();
  });
}

// 演员作品：本站没有演员页，统一走搜索。
// 顺序：带引号全名 → 不带引号全名 → 最长单词。每一层都用词元过滤，
// 保证列表里只留“标题里真的出现这个名字”的条目，别再把别人的片子混进来。
async function loadActorList(params) {
  params = params || {};
  var actor = String(params.actor || params.star || params.keyword || "").trim();
  if (!actor) return [];
  var p = parseInt(params.page || 1, 10);
  if (isNaN(p) || p < 1) p = 1;
  var tokens = actorTokens(actor);
  var suffix = p > 1 ? "&page=" + p : "";
  var tries = [actorSearchUrl(actor) + suffix, actorPlainSearchUrl(actor) + suffix];

  var words = actor
    .split(/\s+/)
    .filter(function (w) {
      return w.length >= 3;
    })
    .sort(function (a, b) {
      return b.length - a.length;
    });
  if (words.length && words[0].toLowerCase() !== actor.toLowerCase()) {
    tries.push(actorSearchUrl(words[0]) + suffix);
  }

  var fallbackCards = [];
  for (var i = 0; i < tries.length; i++) {
    var cards;
    try {
      cards = parseCards(await getText(tries[i], SITE + "/"));
    } catch (e) {
      continue;
    }
    if (!cards.length) continue;
    if (!fallbackCards.length) fallbackCards = cards;
    // 关键：先按原始英文标题（alt）过滤，再翻译。翻译后的中文标题里
    // 已经没有 "Yua Mikami" 这种写法，拿中文名去比对必然全灭。
    var matched = cards.filter(function (c) {
      return titleMatchesActor(c.title, tokens);
    });
    if (matched.length) return await toItems(matched);
  }
  // 全都没精确命中：宁可返回空，也不要把同名不同人的片子当她的作品
  if (!tokens.length && p === 1) return await toItems(fallbackCards);
  return [];
}

function fieldValue(html, label) {
  var re = new RegExp("<span>" + label + ":</span>\\s*<span>([\\s\\S]{0,200}?)</span>");
  var m = String(html || "").match(re);
  return m ? clean(m[1]) : "";
}

// 详情页 -> { title, cover, code, runtime, genres, actresses, desc, embed }
async function parseDetail(url) {
  var html = await getText(url, SITE + "/");
  var t = html.match(/<h1>([\s\S]{0,400}?)<\/h1>/);
  var title = t ? clean(t[1]) : "";
  if (!title) {
    var og = html.match(/property="og:title" content="([^"]*)"/);
    title = og ? clean(og[1]).replace(/\s*JAV Video HD \| SupJav\s*$/i, "") : "";
  }
  var cover = (html.match(/property="og:image" content="([^"]+)"/) || [])[1] || "";

  var genres = [];
  var genreLinks = [];
  var gre = /<a class="tag" href="([^"]*\/category\/([a-z0-9-]+))"[^>]*>([\s\S]{0,40}?)<\/a>/g;
  var gm;
  while ((gm = gre.exec(html))) {
    var name = clean(gm[3]);
    if (!name) continue;
    if (genres.indexOf(name) < 0) {
      genres.push(name);
      genreLinks.push({ name: name, url: SITE + "/category/" + gm[2], slug: gm[2] });
    }
  }

  var descHtml = (html.match(/<div class="description"[^>]*>([\s\S]{0,2000}?)<a href="javascript/) || [])[1] || "";
  var desc = clean(descHtml);

  var embed = (html.match(/<iframe src="([^"]+)"/) || [])[1] || "";

  return {
    title: title,
    cover: cover,
    code: fieldValue(html, "Code"),
    runtime: fieldValue(html, "Runtime"),
    actresses: fieldValue(html, "Actresses"),
    genres: genres,
    genreLinks: genreLinks,
    desc: desc,
    embed: embed,
  };
}

function parsePlayerConfig(html) {
  var h = String(html || "");
  var i = h.indexOf("window.PLAYER_CONFIG");
  if (i < 0) return null;
  var s = h.indexOf("{", i);
  if (s < 0) return null;
  var depth = 0;
  var inStr = false;
  var esc = false;
  var end = -1;
  for (var k = s; k < h.length; k++) {
    var ch = h.charAt(k);
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = k + 1;
        break;
      }
    }
  }
  if (end < 0) return null;
  var raw = h.slice(s, end).replace(/\\u0026/g, "&");
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// 解析播放源：视频页 -> upload18 播放页 -> helvid 签名 m3u8
async function resolveStream(detailUrl, preset) {
  var d = preset || (await parseDetail(detailUrl));
  var embed = d.embed;
  if (!embed) {
    var slug = String(detailUrl || "").replace(/\/+$/, "").split("/").pop();
    embed = PLAY_HOST + "/play/index/" + slug;
  }
  var html = await getText(embed, SITE + "/");
  var cfg = parsePlayerConfig(html);
  if (!cfg) throw new Error("播放页未返回 PLAYER_CONFIG");
  var lines = [];
  if (cfg.m3u8) {
    lines.push({
      name: "原画 HLS",
      description: "helvid · 签名直连",
      url: String(cfg.m3u8),
    });
  }
  if (cfg.alternate720) {
    lines.push({
      name: "备用 720p",
      description: "helvid · alternate720",
      url: String(cfg.alternate720),
    });
  }
  if (!lines.length) throw new Error("播放页未返回可播地址");
  return { lines: lines, config: cfg, embed: embed, detail: d };
}

function streamItem(item, url, name, desc) {
  return {
    id: url,
    type: "url",
    mediaType: "movie",
    title: name || "原画 HLS",
    link: item.link,
    videoUrl: url,
    description: desc || "",
    customHeaders: PLAY_HEADERS,
    headers: PLAY_HEADERS,
  };
}

async function loadDetail(link) {
  var raw = String(link || "").trim();

  // 演员搜索页：点演员名进来时返回她的作品网格
  var searchM = raw.match(/[?&]keyword=([^&]+)/);
  if (/\/search\b/.test(raw) && searchM) {
    var actorKw = "";
    try {
      actorKw = decodeURIComponent(searchM[1].replace(/\+/g, " "));
    } catch (_) {
      actorKw = searchM[1];
    }
    var actorWorks = await loadActorList({ actor: actorKw });
    var worksTitle = actorDisplayName(actorKw.replace(/^["'\s]+|["'\s]+$/g, ""));
    return {
      id: raw,
      type: "detail",
      mediaType: "movie",
      title: worksTitle,
      link: raw,
      description: "演员 · 共 " + actorWorks.length + " 部作品",
      videoUrl: "",
      childItems: [],
      relatedItems: actorWorks,
    };
  }

  // 分类页链接：返回该类作品网格
  var catM = raw.match(/\/category\/([a-z0-9-]+)/i);
  if (catM && !/\/video\//.test(raw) && !/[?&]slug=/.test(raw)) {
    var catSlug = catM[1];
    var catHtml = await getText(SITE + "/category/" + catSlug, SITE + "/");
    var catItems = await toItems(parseCards(catHtml));
    return {
      id: raw,
      type: "detail",
      mediaType: "movie",
      title: actorDisplayName(catSlug),
      link: SITE + "/category/" + catSlug,
      description: "分类 · 共 " + catItems.length + " 部作品",
      videoUrl: "",
      childItems: [],
      relatedItems: catItems,
    };
  }

  var url = videoUrlFrom(link);
  var slug = url.split("/").pop();

  var d = await parseDetail(url);
  if (!d.title || /^SupJav\b/i.test(d.title)) throw new Error("未能解析视频页：" + url);
  if (/^(unknown|updating|n\/a|-)?$/i.test(String(d.actresses || "").trim())) d.actresses = "";
  if (/^(unknown|updating|n\/a|-)?$/i.test(String(d.runtime || "").trim())) d.runtime = "";
  var seconds = runtimeToSeconds(d.runtime);
  var item = {
    id: url,
    type: "detail",
    mediaType: "movie",
    title: d.title || slug.toUpperCase() || "未命名",
    link: url,
    description: [d.code, d.actresses, d.genres.join(" / "), d.desc.slice(0, 120)]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 300),
    duration: seconds,
    durationText: prettyDuration(seconds),
    customHeaders: PLAY_HEADERS,
  };
  withImages(item, d.cover || "");

  // 详情标题也转中文，原名放 description 方便对番号
  try {
    var loc = await localizeTitle(d.title, "");
    if (loc.title && loc.title !== clean(d.title)) {
      item.title = loc.title;
      item.originalTitle = clean(d.title);
      // 中文标题顶上去了，就把描述里重复的英文原名去掉
      item.description = [d.code, d.actresses, d.genres.join(" / "), stripTitleNoise(d.desc, d.title)]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 300);
    }
  } catch (e) {}

  var stars = actressNames(d.actresses);
  if (stars.length) {
    item.peoples = stars.map(function (name) {
      var link = actorSearchUrl(name);
      return { id: link, title: name, name: name, link: link, role: "演员" };
    });
  }
  var genreLinks = d.genreLinks || [];
  if (!genreLinks.length && d.genres.length) {
    genreLinks = d.genres.map(function (name) {
      return {
        name: name,
        url: SITE + "/category/" + encodeURIComponent(String(name).toLowerCase().replace(/\s+/g, "-")),
      };
    });
  }
  if (genreLinks.length) {
    item.genreTitle = "分类";
    item.genreItems = genreLinks.map(function (g) {
      return { id: g.url, title: g.name };
    });
  }

  try {
    var r = await resolveStream(url, d);
    item.videoUrl = r.lines[0].url;
    item.childItems = r.lines.map(function (l) {
      return streamItem(item, l.url, l.name, l.description);
    });
    var cfg = r.config || {};
    var cfgSec = parseInt(cfg.duration || 0, 10);
    if (!item.duration && cfgSec > 0) {
      item.duration = cfgSec;
      item.durationText = prettyDuration(cfgSec);
    }
    if (!d.cover && cfg.thumb) withImages(item, String(cfg.thumb));
    item.description = (item.description ? item.description + " · " : "") + "HLS · helvid";
  } catch (e) {
    item.videoUrl = "";
    item.childItems = [];
    item.description =
      (item.description ? item.description + " · " : "") +
      "无可用播放源：" +
      String(e && e.message ? e.message : e);
  }
  return item;
}

async function loadResource(params) {
  params = params || {};
  var link = String(params.link || params.id || params.url || "");
  if (!link && params.slug) link = String(params.slug);
  if (!link) throw new Error("缺少视频链接");
  var url = videoUrlFrom(link);
  if (url === SITE + "/" || !slugFromHref(url)) throw new Error("缺少视频链接");
  var r = await resolveStream(url);
  if (!r.lines.length) throw new Error("没有可用线路");
  return r.lines.map(function (l) {
    return { name: l.name, description: l.description, url: l.url };
  });
}
