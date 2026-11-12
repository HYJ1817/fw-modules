// Rex 模块：Perverzija Tube（tube.perverzija.com）
// 列表 / 分类 / 搜索 / 详情 / 播放。
// 播放链路：详情页 iframe -> xtremestream 播放器页取 vt -> proto_api castsign 取 ct
//          -> op=castmaster 生成标准 HLS（EXT-X-KEY + castseg 分片，原生播放器可直接解密播放）
var SITE = "https://tube.perverzija.com";
var XS = "https://perv.xtremestream.xyz";
var UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

WidgetMetadata = {
  id: "user.perverzija",
  title: "Perverzija Tube",
  description: "tube.perverzija.com 列表、片商、标签、搜索与 XtremeStream 播放源",
  author: "Tiamo",
  version: "1.2.0",
  requiredVersion: "0.0.1",
  detailCacheDuration: 30,
  search: {
    title: "Perverzija 搜索",
    functionName: "searchVideos",
    params: [
      { name: "keyword", title: "关键词 / 演员 / 片商", type: "input" },
      { name: "page", title: "页码", type: "page" },
    ],
  },
  modules: [
    {
      id: "loadResource",
      title: "Perverzija 画质线路",
      functionName: "loadResource",
      type: "stream",
      cacheDuration: 0,
      params: [],
    },
    {
      id: "user.perverzija.search",
      title: "搜索",
      description: "关键词 / 演员 / 片商搜索",
      requiresWebView: false,
      type: "video",
      cacheDuration: 60,
      functionName: "searchVideos",
      params: [
        { name: "keyword", title: "关键词 / 演员 / 片商", type: "input", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.perverzija.latest",
      title: "最新",
      description: "按发布时间排序",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/?orderby=date" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.perverzija.popular",
      title: "最多播放",
      description: "按播放量排序",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/?orderby=view" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.perverzija.like",
      title: "最多点赞",
      description: "按点赞排序",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/?orderby=like" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.perverzija.actor",
      title: "演员作品",
      description: "填入演员名，列出本站她的全部作品",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadActorList",
      params: [
        { name: "actor", title: "演员名（如 abella danger）", type: "input", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.perverzija.featured",
      title: "精选场景",
      description: "Featured scenes",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/featured-scenes/" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.perverzija.fullmovie",
      title: "完整影片",
      description: "Full movie",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/full-movie/" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.perverzija.vr",
      title: "VR",
      description: "VR 专区",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/vr/" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.perverzija.brazzers",
      title: "Brazzers",
      description: "片商 Brazzers",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/studio/brazzers/" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.perverzija.realitykings",
      title: "RealityKings",
      description: "片商 RealityKings",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/studio/realitykings/" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.perverzija.bangbros",
      title: "BangBros",
      description: "片商 BangBros",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/studio/bangbros/" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.perverzija.teamskeet",
      title: "TeamSkeet",
      description: "片商 TeamSkeet",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/studio/teamskeet/" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.perverzija.naughty",
      title: "NaughtyAmerica",
      description: "片商 NaughtyAmerica",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/studio/naughtyamerica/" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.perverzija.tags",
      title: "标签热门",
      description: "Anal / MILF / Teen 等",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "path", title: "分类", type: "constant", value: "/tag/anal/" },
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

// proto_api 的 castmaster / castmedia 需要 X-XS-P 头
async function getTextHdr(url, referer, extra) {
  var h = headers(referer);
  if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) h[k] = extra[k];
  var resp = await Widget.http.get(url, { headers: h });
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
      return v == null ? m : v;
    })
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/&#(\d+);/g, function (m, n) {
      return String.fromCharCode(parseInt(n, 10));
    });
}

function clean(s) {
  return decodeEntities(String(s || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

// 只取列表主容器，避开侧栏、轮播与相关推荐
function listingHtml(html) {
  var h = String(html || "");
  var start = h.search(/class="(?:video|search)-listing-content/);
  if (start < 0) start = 0;
  var end = h.length;
  var marks = [
    "wp-pagenavi",
    'class="pagination',
    "<nav class=\"navigation",
    'id="footer',
    'class="tm_related',
    'related-section',
  ];
  for (var i = 0; i < marks.length; i++) {
    var j = h.indexOf(marks[i], start);
    if (j > 0 && j < end) end = j;
  }
  return h.slice(start, end);
}

function parseCards(html) {
  var h = listingHtml(html);
  var out = [];
  var seen = {};
  var re = /<div[^>]+class="[^"]*\bvideo-item\b[^"]*"[^>]*>/g;
  var starts = [];
  var m;
  while ((m = re.exec(h))) starts.push(m.index);
  for (var i = 0; i < starts.length; i++) {
    var seg = h.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : Math.min(starts[i] + 6000, h.length));
    var a = seg.match(/<a\s+href="(https:\/\/tube\.perverzija\.com\/[^"\/]+\/)"(?:\s+title="([^"]*)")?/);
    if (!a) continue;
    var url = a[1];
    if (seen[url]) continue;
    var img = seg.match(/<img[^>]+src="([^"]+)"/);
    var h3 = seg.match(/<h3[^>]*>[\s\S]{0,200}?<a[^>]*>([\s\S]{1,300}?)<\/a>/);
    var alt = seg.match(/<img[^>]+alt="([^"]*)"/);
    var title = clean(a[2] || (h3 && h3[1]) || (alt && alt[1]) || "");
    if (!title) {
      title = url.replace(/\/$/, "").split("/").pop().replace(/-/g, " ");
    }
    var p = seg.match(/<p[^>]*>([\s\S]{20,600}?)<\/p>/);
    var meta = seg.match(/class="item-head"[\s\S]{0,600}?<span>([\s\S]{0,400}?)<\/span>/);
    var desc = clean(p ? p[1] : meta ? meta[1] : "");
    if (!desc || desc.length < 20 || /^[\d\s]+$/.test(desc)) {
      desc = clean(meta ? meta[1] : "");
    }
    if (/^[\d\s]+$/.test(desc)) desc = "";
    seen[url] = 1;
    out.push({
      url: url,
      title: title,
      img: img ? img[1] : (alt ? "" : ""),
      desc: desc.slice(0, 240),
    });
  }
  return out;
}

function pageUrl(path, page) {
  var p = parseInt(page || 1, 10);
  if (isNaN(p) || p < 1) p = 1;
  var base = String(path || "/");
  if (base.charAt(0) !== "/") base = "/" + base;
  var query = "";
  var qi = base.indexOf("?");
  if (qi >= 0) {
    query = base.slice(qi);
    base = base.slice(0, qi);
  }
  if (!/\/$/.test(base)) base += "/";
  if (p <= 1) return SITE + base + query;
  return SITE + base + "page/" + p + "/" + query;
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
  item.backdropPath = url;
  item.backdropPaths = [url];
  item.thumbnailUrl = url;
  item.imageUrl = url;
  item.detailPoster = url;
  item.detailPosterUrl = url;
  item.detailPosterURL = url;
  item.detail_poster = url;
  item.poster_path = url;
  item.detail_poster_path = url;
  return item;
}

function toItems(cards) {
  return cards.map(function (c) {
    return withImages(
      {
        id: c.url,
        type: "detail",
        mediaType: "movie",
        title: c.title,
        link: c.url,
        description: c.desc || "",
      },
      c.img || ""
    );
  });
}

async function loadList(params) {
  params = params || {};
  var url = pageUrl(params.path || "/?orderby=date", params.page);
  var html = await getText(url, SITE + "/");
  var cards = parseCards(html);
  if (!cards.length) {
    // 兜底：去掉排序参数再试
    var u2 = pageUrl("/", params.page);
    cards = parseCards(await getText(u2, SITE + "/"));
  }
  return toItems(cards);
}

async function searchVideos(params) {
  params = params || {};
  var kw = String(params.keyword || params.query || "").trim();
  if (!kw) return [];
  var p = parseInt(params.page || 1, 10);
  if (isNaN(p) || p < 1) p = 1;
  var url = SITE + "/?s=" + encodeURIComponent(kw) + (p > 1 ? "&paged=" + p : "");
  var html = await getText(url, SITE + "/");
  var cards = parseCards(html);
  if (cards.length) return toItems(cards);

  // 关键词不像番号（含空格且无数字）时，按演员名再试一次演员页
  if (/\s/.test(kw) && !/\d/.test(kw)) {
    var slug = slugifyActor(kw);
    if (slug) {
      var actorItems = await loadTaxonomyList("/stars/" + slug + "/", p);
      if (actorItems.length) return actorItems;
    }
  }
  return toItems(cards);
}

function isoDurationToSeconds(v) {
  var m = String(v || "").match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!m) return 0;
  return (parseInt(m[1] || 0, 10) * 3600) + (parseInt(m[2] || 0, 10) * 60) + parseInt(m[3] || 0, 10);
}

function prettyDuration(sec) {
  sec = parseInt(sec || 0, 10);
  if (!sec) return "";
  var h = Math.floor(sec / 3600);
  var m = Math.floor((sec % 3600) / 60);
  var s = sec % 60;
  return (h ? h + ":" : "") + (h && m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}

// 详情页 -> { videoId, title, cover, desc, duration, studio, stars, tags }
async function parseDetail(url) {
  var html = await getText(url, SITE + "/");
  var titleM =
    html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]{1,400}?)<\/h1>/) ||
    html.match(/<title>([\s\S]{1,300}?)<\/title>/);
  var title = clean(titleM ? titleM[1] : "").replace(/\s*\|\s*Perverzija\.com\s*$/i, "");
  var coverM =
    html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/) ||
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/);
  var descM =
    html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/) ||
    html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/);
  var durM = html.match(/"duration"\s*:\s*"(PT[^"]+)"/);
  var iframeM =
    html.match(/<iframe[^>]+src="([^"]*xtremestream[^"]*)"/) ||
    html.match(/<iframe[^>]+src="([^"]*\/player\/index\.php\?data=([0-9a-f]{32}))[^"]*"/);
  var videoId = "";
  var embed = "";
  if (iframeM) {
    var src = String(iframeM[1]);
    var idM = src.match(/[?&]data=([0-9a-fA-F]{32})/);
    if (idM) videoId = idM[1].toLowerCase();
    var hostM = src.match(/^(https?:\/\/[^\/]+)/);
    if (hostM) embed = hostM[1];
  }
  if (!videoId) {
    var anyId = html.match(/(?:embedUrl|iframe)[^\n]{0,200}?[?&]data=([0-9a-fA-F]{32})/);
    if (anyId) videoId = anyId[1].toLowerCase();
  }
  var studioM = html.match(/<strong>\s*(?:Studio|Site)s?\s*:?\s*<\/strong>([\s\S]{1,600}?)<\/div>/i);
  var starsM = html.match(/<strong>\s*Stars?\s*:?\s*<\/strong>([\s\S]{1,1200}?)<\/div>/i);
  var tagsM = html.match(/<strong>\s*Tags?\s*:?\s*<\/strong>([\s\S]{1,8000}?)<\/div>/i);
  return {
    videoId: videoId,
    embed: embed,
    title: title,
    cover: coverM ? coverM[1] : "",
    desc: clean(descM ? descM[1] : ""),
    seconds: durM ? isoDurationToSeconds(durM[1]) : 0,
    studio: studioM ? clean(studioM[1]) : "",
    stars: starsM ? clean(starsM[1]) : "",
    tags: tagsM ? clean(tagsM[1]) : "",
    starsList: starsM ? parseLinkList(starsM[1]) : [],
    tagsList: tagsM ? parseLinkList(tagsM[1]) : [],
  };
}

// 从 <strong>Stars:</strong> 后面的 HTML 里抽出 {name, url}
function parseLinkList(blockHtml) {
  var out = [];
  var seen = {};
  var re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]{1,160}?)<\/a>/g;
  var m;
  while ((m = re.exec(String(blockHtml || "")))) {
    var name = clean(m[2]);
    var url = String(m[1] || "");
    if (!name || !/^https?:\/\//.test(url) || seen[url]) continue;
    seen[url] = 1;
    out.push({ name: name, url: url });
  }
  return out;
}

// 演员列表：优先用链接，退化为「逗号分隔的名字」
function starsOf(detail) {
  var list = (detail && detail.starsList) || [];
  if (list.length) return list;
  return String((detail && detail.stars) || "")
    .split(/[,，]/)
    .map(function (v) {
      var name = clean(v);
      return name ? { name: name, url: "" } : null;
    })
    .filter(Boolean);
}

function slugifyActor(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function actorPageUrl(actor) {
  var value = String(actor || "").trim();
  if (!value) return "";
  if (/^https?:\/\//.test(value)) return value;
  var slug = value.replace(/^\/+/, "").replace(/\/+$/, "");
  if (slug.indexOf("/") >= 0) {
    if (/^(stars|tag|studio)\//.test(slug)) return SITE + "/" + slug + "/";
    slug = slug.split("/").pop();
  }
  slug = slugifyActor(slug);
  return slug ? SITE + "/stars/" + slug + "/" : "";
}

// 演员 / 标签 / 片商页 -> 作品列表（详情页点击演员走这里）
function taxonomyKind(url) {
  var m = String(url || "").match(/\/(stars|tag|studio)\/([^\/?#]+)/i);
  if (!m) return null;
  return { kind: m[1].toLowerCase(), slug: m[2], path: "/" + m[1].toLowerCase() + "/" + m[2] + "/" };
}

async function loadTaxonomyList(path, page) {
  var p = parseInt(page || 1, 10);
  if (isNaN(p) || p < 1) p = 1;
  var base = String(path || "/");
  if (base.charAt(0) !== "/") base = "/" + base;
  if (!/\/$/.test(base)) base += "/";
  var url = p <= 1 ? SITE + base : SITE + base + "page/" + p + "/";
  var cards = parseCards(await getText(url, SITE + "/"));
  if (!cards.length && p > 1) cards = parseCards(await getText(SITE + base, SITE + "/"));
  return toItems(cards);
}

function titleCase(text) {
  return String(text || "").replace(/(^|\s|[-_])([a-z])/g, function (m, pre, ch) {
    return pre + ch.toUpperCase();
  });
}

function actorDisplayName(actor) {
  var value = String(actor || "").trim();
  if (!value) return "";
  if (/^https?:\/\//.test(value)) {
    var slug = value.replace(/\/+$/, "").split("/").pop() || "";
    return titleCase(decodeURIComponentSafe(slug).replace(/-/g, " "));
  }
  return titleCase(decodeURIComponentSafe(value).replace(/-/g, " "));
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch (_) {
    return String(value || "");
  }
}

// 演员作品模块 / 全局搜索用
async function loadActorList(params) {
  params = params || {};
  var actor = String(params.actor || params.star || params.keyword || "").trim();
  if (!actor) return [];
  var url = actorPageUrl(actor);
  var taxonomy = taxonomyKind(url);
  var path = taxonomy ? taxonomy.path : "";
  if (!path) return [];

  var items = await loadTaxonomyList(path, params.page);
  if (items.length) return items;

  // 演员页不存在时退回站内搜索
  return toItems(parseCards(await getText(SITE + "/?s=" + encodeURIComponent(actorDisplayName(actor)), SITE + "/")));
}

// 线路缓存：详情页与播放资源共用，避免重复探测
var STREAM_CACHE = {};
var STREAM_TTL = 10 * 60 * 1000;

// proto_api 对 m3u8 也返回 application/octet-stream，桥接层可能给 base64，这里统一还原成文本
var B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64Decode(text) {
  var compact = String(text || "").replace(/[^A-Za-z0-9+/=]/g, "");
  var out = "";
  var buffer = 0;
  var bits = 0;
  for (var i = 0; i < compact.length; i++) {
    var ch = compact.charAt(i);
    if (ch === "=") break;
    var val = B64_ALPHABET.indexOf(ch);
    if (val < 0) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return out;
}

function utf8FromBinary(bin) {
  var out = "";
  for (var i = 0; i < bin.length; i++) {
    var c = bin.charCodeAt(i);
    if (c < 0x80) out += String.fromCharCode(c);
    else if (c < 0xe0) {
      out += String.fromCharCode(((c & 0x1f) << 6) | (bin.charCodeAt(++i) & 0x3f));
    } else if (c < 0xf0) {
      out += String.fromCharCode(((c & 0x0f) << 12) | ((bin.charCodeAt(++i) & 0x3f) << 6) | (bin.charCodeAt(++i) & 0x3f));
    } else {
      var cp = ((c & 0x07) << 18) | ((bin.charCodeAt(++i) & 0x3f) << 12) | ((bin.charCodeAt(++i) & 0x3f) << 6) | (bin.charCodeAt(++i) & 0x3f);
      cp -= 0x10000;
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    }
  }
  return out;
}

// proto_api 对 m3u8 返回 application/octet-stream，桥接层可能给 base64，这里统一还原成文本
function binaryToText(body) {
  var text = String(body == null ? "" : body);
  if (text.indexOf("#EXT") >= 0) return text;
  if (text.length < 24) return text;
  var compact = text.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(compact)) return text;
  var bin = base64Decode(compact);
  if (bin.indexOf("#EXT") >= 0) return utf8FromBinary(bin);
  return text;
}

// 部分影片只上传了低画质，master 里却仍列出 1080/720（返回 404 nf），需实测筛掉
async function playlistAlive(playlistUrl, referer) {
  try {
    var raw = await getText(playlistUrl, referer);
    return binaryToText(raw).indexOf("#EXTM3U") >= 0;
  } catch (e) {
    return false;
  }
}

// 播放器页取 vt，castsign 取 ct，产出 castmaster / castmedia 线路
async function resolveStream(url, detailUrl, preset) {
  var d = preset || (await parseDetail(url));
  if (!d.videoId) throw new Error("未找到播放器 id，可能影片无源");
  var cached = STREAM_CACHE[d.videoId];
  if (cached && Date.now() - cached.t < STREAM_TTL) return { detail: d, lines: cached.lines };
  // 站点会随机分配 xtremestream 子域，部分子域（如 j2.*）用旧版 xs1 接口且被 Cloudflare 拦原生播放器。
  // 视频 id 全局通用，因此任一 ftk 播放器子域都能签发 vt/ct，逐个尝试直到拿到令牌。
  var bases = [];
  function pushBase(b) {
    if (b && bases.indexOf(b) < 0) bases.push(b);
  }
  pushBase(d.embed);
  pushBase(XS);
  pushBase("https://pervm1.xtremestream.xyz");
  pushBase("https://pervl5.xtremestream.xyz");
  pushBase("https://pervm2.xtremestream.xyz");
  var playerReferer = detailUrl || url;
  var base = "";
  var vt = "";
  var playerUrl = "";
  var lastErr = "";
  for (var bi = 0; bi < bases.length; bi++) {
    var tryUrl = bases[bi] + "/player/index.php?data=" + d.videoId;
    var page = "";
    try {
      page = await getText(tryUrl, playerReferer);
    } catch (e) {
      lastErr = String(e && e.message ? e.message : e);
      continue;
    }
    var vtM = page.match(/boot\(\s*["']?[0-9a-fA-F]{32}["']?\s*,\s*["']([^"']+)["']/);
    if (vtM) {
      base = bases[bi];
      vt = String(vtM[1]).replace(/\s+/g, "");
      playerUrl = tryUrl;
      break;
    }
    lastErr = "该子域无 ftk 令牌";
  }
  if (!vt) throw new Error("播放器页未返回 vt 令牌" + (lastErr ? "：" + lastErr : ""));
  var apiBase = base + "/player/proto_api.php?data=" + d.videoId;
  var vtParam = "&vt=" + encodeURIComponent(vt);
  var signResp = await Widget.http.get(apiBase + "&op=castsign" + vtParam, {
    headers: {
      "User-Agent": UA,
      "X-XS-P": "1",
      Referer: playerUrl,
      Accept: "*/*",
    },
  });
  var ct = String((signResp && signResp.data) || "").replace(/\s+/g, "");
  if (!ct || ct.indexOf("forbidden") === 0) throw new Error("castsign 签名失败");
  // master 与 castmedia 都必须带 vt；castmaster 返回的变体地址自带完整签名（含新 ct）
  var cm = apiBase + vtParam + "&ct=" + encodeURIComponent(ct) + "&op=castmaster";
  // 默认线路 = 最高画质；自适应档只作兜底放在最后
  var autoLine = { name: "自动（自适应）", description: "HLS · XtremeStream 自适应码率（兜底）", url: cm };
  var master = "";
  try {
    master = binaryToText(await getTextHdr(cm, playerUrl, { "X-XS-P": "1", Accept: "*/*" }));
  } catch (e) {}
  var quals = [];
  var re = /#EXT-X-STREAM-INF:[^\n]*RESOLUTION=(\d+)x(\d+)[^\n]*\n(\S+)/g;
  var mm;
  while ((mm = re.exec(master))) {
    var lineUrl = String(mm[3]).trim();
    var qm = lineUrl.match(/[?&]q=(\d+)/);
    if (!qm) continue;
    quals.push({
      q: qm[1],
      label: qm[1] + "p",
      w: parseInt(mm[1], 10),
      h: parseInt(mm[2], 10),
      url: lineUrl,
    });
  }
  var parsed = quals.length > 0;
  if (!parsed) {
    var fallbackQ = ["1080", "720", "480"];
    for (var qi = 0; qi < fallbackQ.length; qi++) {
      var fl = fallbackQ[qi];
      quals.push({
        q: fl,
        label: fl + "p",
        w: fl === "1080" ? 1920 : fl === "720" ? 1280 : 854,
        h: parseInt(fl, 10),
        url: apiBase + vtParam + "&ct=" + encodeURIComponent(ct) + "&op=castmedia&q=" + fl,
      });
    }
  }
  quals.sort(function (a, b) {
    return parseInt(b.q, 10) - parseInt(a.q, 10);
  });
  var lines = [];
  for (var i = 0; i < quals.length; i++) {
    if (!(await playlistAlive(quals[i].url, playerUrl))) continue;
    lines.push({
      name: quals[i].label,
      description:
        "HLS · " + quals[i].label + (quals[i].h ? " · " + quals[i].w + "x" + quals[i].h : "") + " · XtremeStream",
      url: quals[i].url,
    });
  }
  // 自适应 master 始终兜底放最后
  lines.push(autoLine);
  STREAM_CACHE[d.videoId] = { t: Date.now(), lines: lines };
  return { detail: d, lines: lines };
}

async function loadDetail(link) {
  var url = String(link || "").split("#")[0];
  if (!/^https?:\/\//.test(url)) url = SITE + "/" + url.replace(/^\//, "");
  if (!/\/$/.test(url)) url += "/";

  // 演员 / 标签 / 片商页：返回作品网格，供「点演员看全部作品」
  var taxonomy = taxonomyKind(url);
  if (taxonomy) {
    var works = await loadTaxonomyList(taxonomy.path, 1);
    var kindTitle = taxonomy.kind === "stars" ? "演员" : taxonomy.kind === "tag" ? "标签" : "片商";
    return {
      id: url,
      type: "detail",
      mediaType: "movie",
      title: actorDisplayName(taxonomy.slug),
      link: url,
      description: kindTitle + " · 共 " + works.length + " 部作品",
      videoUrl: "",
      childItems: [],
      relatedItems: works,
    };
  }

  var d = await parseDetail(url);
  var item = {
    id: url,
    type: "detail",
    mediaType: "movie",
    title: d.title || "未命名",
    link: url,
    description: [d.studio, d.stars, d.tags].filter(Boolean).join(" · ").slice(0, 300) || d.desc,
    duration: d.seconds || 0,
    durationText: prettyDuration(d.seconds),
  };
  withImages(item, d.cover || "");

  // 演员列表：Rex 详情页的 cast 区，条目带 link 可直接请求演员页
  var starList = starsOf(d);
  if (starList.length) {
    item.peoples = starList.map(function (star) {
      var personUrl = star.url || actorPageUrl(star.name);
      return {
        id: personUrl || star.name,
        title: star.name,
        name: star.name,
        link: personUrl || "",
        role: "演员",
      };
    });
  }
  var tagList = d.tagsList || [];
  if (tagList.length) {
    item.genreTitle = "标签";
    item.genreItems = tagList.map(function (tag) {
      return { id: tag.url, title: tag.name };
    });
  }

  try {
    var r = await resolveStream(url, url, d);
    item.videoUrl = r.lines[0].url;
    item.childItems = r.lines.map(function (l) {
      return {
        id: l.url,
        type: "url",
        mediaType: "movie",
        title: l.name,
        link: url,
        videoUrl: l.url,
        description: l.description,
      };
    });
  } catch (e) {
    item.videoUrl = "";
    item.childItems = [];
    item.description = (item.description ? item.description + " · " : "") + "无可用播放源：" + String(e && e.message ? e.message : e);
  }
  return item;
}

async function loadResource(params) {
  params = params || {};
  var link = String(params.link || params.id || params.url || "");
  if (!/^https?:\/\//.test(link)) link = SITE + "/" + link.replace(/^\//, "");
  var r = await resolveStream(link, link);
  if (!r.lines.length) throw new Error("没有可用线路");
  return r.lines;
}
