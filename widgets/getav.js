// Rex 模块：GetAV（getav.net）
// 列表 / 搜索 / 播放。播放地址来自影片页 RSC 数据里的 videoSources（HLS，伪装成 index.txt）
WidgetMetadata = {
  id: "user.getav",
  title: "GetAV",
  description: "GetAV 最新、热门、字幕、无码、4K 列表和番号搜索",
  author: "Tiamo",
  version: "0.5.0",
  requiredVersion: "0.0.1",
  detailCacheDuration: 30,
  search: {
    title: "GetAV",
    functionName: "searchVideos",
    params: [
      { name: "keyword", title: "番号 / 演员 / 关键词", type: "input" },
      { name: "page", title: "页码", type: "page" },
    ],
  },
  modules: [
    {
      id: "loadResource",
      title: "GetAV 画质线路",
      functionName: "loadResource",
      type: "stream",
      cacheDuration: 0,
      params: [],
    },
    {
      id: "user.getav.search",
      title: "搜索",
      description: "输入番号、演员或关键词",
      requiresWebView: false,
      type: "video",
      cacheDuration: 60,
      functionName: "searchVideos",
      params: [
        { name: "keyword", title: "番号 / 演员 / 关键词", type: "input", value: "" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.getav.latest",
      title: "最新",
      description: "GetAV 最新",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "category", title: "分类", type: "constant", value: "latest?sort=uploadDate" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.getav.hot",
      title: "热门",
      description: "GetAV 热门",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "category", title: "分类", type: "constant", value: "hot" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.getav.new",
      title: "新片上市",
      description: "GetAV 新片上市",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "category", title: "分类", type: "constant", value: "new-releases" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.getav.subtitle",
      title: "字幕影片",
      description: "GetAV 字幕影片",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "category", title: "分类", type: "constant", value: "subtitle" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.getav.uncensored",
      title: "无码影片",
      description: "GetAV 无码影片",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "category", title: "分类", type: "constant", value: "uncensored" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
    {
      id: "user.getav.4k",
      title: "4K",
      description: "GetAV 4K",
      requiresWebView: false,
      type: "video",
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "category", title: "分类", type: "constant", value: "4k" },
        { name: "page", title: "页码", type: "page" },
      ],
    },
  ],
};

var BASE = "https://getav.net";
var IMG = "https://static.worldstatic.com";
var UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
var CODE_RE = /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/;

function headers(rsc) {
  var h = {
    "User-Agent": UA,
    Referer: BASE + "/zh",
    "Accept-Language": "zh-CN,zh;q=0.9",
  };
  if (rsc) h["RSC"] = "1";
  return h;
}

async function getText(url, rsc) {
  var resp = await Widget.http.get(url, { headers: headers(rsc) });
  var d = resp && resp.data;
  return typeof d === "string" ? d : JSON.stringify(d || "");
}

// 有些内容是放在 HTML 里转义过的 JSON，统一反转义
function normalize(t) {
  return String(t || "")
    .replace(/\\"/g, '"')
    .replace(/\\\//g, "/")
    .replace(/\\u0026/g, "&");
}

function abs(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.indexOf("//") === 0) return "https:" + u;
  return IMG + (u.charAt(0) === "/" ? "" : "/") + u;
}

// GetAV 的封面现在大多是 AVIF（搜索页尤其多），Rex 的图片管线对 AVIF 不稳，
// 统一转成 JPEG 再交给播放器。wsrv.nl 是免费图床代理，支持 AVIF -> JPEG 转码。
var IMG_PROXY = "https://wsrv.nl/?url=";
var AVIF_RE = /\.avif(\?|#|$)/i;

function jpegCover(url) {
  if (!url) return "";
  if (!AVIF_RE.test(url)) return url;
  return IMG_PROXY + encodeURIComponent(url) + "&output=jpg&w=600";
}

// 一次把 Rex 认识的所有封面字段填满：列表卡片、详情页、搜索卡片用的键名不一样
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

function pick(chunk, re) {
  var m = chunk.match(re);
  return m ? m[1] : "";
}

function decodeStr(s) {
  try {
    return JSON.parse('"' + s + '"');
  } catch (e) {
    return s;
  }
}

// 从 RSC / HTML 里抽出影片卡片
function parseCards(text) {
  var t = normalize(text);
  var re = /\{"id":"([A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)","title":"((?:[^"\\]|\\.)*)"/g;
  var hits = [];
  var m;
  while ((m = re.exec(t))) hits.push({ idx: m.index, id: m[1].toUpperCase(), title: decodeStr(m[2]) });
  var seen = {};
  var items = [];
  for (var i = 0; i < hits.length; i++) {
    var h = hits[i];
    if (!CODE_RE.test(h.id) || seen[h.id]) continue;
    var chunk = t.slice(h.idx, i + 1 < hits.length ? hits[i + 1].idx : h.idx + 4000);
    seen[h.id] = true;
    var cover =
      pick(chunk, /"localImg":"([^"]+)"/) ||
      pick(chunk, /"img":"((?:https?:)?\/\/[^"]+|\/images\/cover\/[^"]+)"/) ||
      pick(chunk, /"(https?:\/\/[^"]*\/images\/cover\/[^"]+)"/) ||
      pick(chunk, /"(\/images\/cover\/[^"]+)"/) ||
      pick(chunk, /"(?:cover|coverUrl|thumbnail|poster|image)":"([^"]+)"/);
    var dur = parseInt(pick(chunk, /"durationSeconds":(\d+)/) || "0", 10);
    var durText = pick(chunk, /"durationFormatted":"([^".]+)/);
    var preview = pick(chunk, /"previewM3u8Path":"([^"]+)"/);
    var release = pick(chunk, /"releaseDate":"\$?D?(\d{4}-\d{2}-\d{2})/);
    var title = h.title.indexOf(h.id) === 0 ? h.title : h.id + " " + h.title;
    var item = {
      id: BASE + "/zh/videos/" + h.id.toLowerCase(),
      type: "url",
      mediaType: "movie",
      title: title,
      link: BASE + "/zh/videos/" + h.id.toLowerCase(),
      description: title,
    };
    if (cover) withImages(item, jpegCover(abs(cover)));
    if (dur) item.duration = dur;
    if (durText) item.durationText = durText;
    if (release) item.releaseDate = release;
    items.push(item);
  }
  return items;
}

function withPage(path, page) {
  var p = parseInt(page || 1, 10) || 1;
  return BASE + "/zh/" + path + (path.indexOf("?") >= 0 ? "&" : "?") + "page=" + p;
}

async function loadList(params) {
  var cat = (params && params.category) || "latest?sort=uploadDate";
  var url = withPage(cat, params && params.page);
  var items = parseCards(await getText(url, true));
  if (!items.length) items = parseCards(await getText(url, false));
  if (!items.length) throw new Error("没取到列表，可能被 Cloudflare 拦了，稍后再试");
  return items;
}

async function searchVideos(params) {
  var kw = ((params && (params.keyword || params.query)) || "").trim();
  if (!kw) return [];
  var url = withPage("search?q=" + encodeURIComponent(kw), params && params.page);
  var items = parseCards(await getText(url, true));
  if (!items.length) items = parseCards(await getText(url, false));
  return items;
}

var QUALITY_NAME = {
  uc_1080p: "无码 1080P",
  uc_720p: "无码 720P",
  uc_480p: "无码 480P",
  raw_1080p: "1080P",
  raw_720p: "720P",
  raw_480p: "480P",
  raw_240p: "240P",
};

function parseSources(t) {
  var m = t.match(/"videoSources":\[([\s\S]*?)\]/);
  if (!m) return [];
  var list = [];
  var re = /\{"id":"[^"]*","source":"[^"]*","type":"([^"]+)","url":"([^"]+)","priority":(\d+)/g;
  var s;
  while ((s = re.exec(m[1]))) list.push({ type: s[1], url: abs(s[2]), priority: parseInt(s[3], 10) });
  // 兜底：字段顺序变了也能抓到地址
  if (!list.length) {
    var re2 = /"url":"([^"]*deliveries[^"]+)"/g;
    while ((s = re2.exec(m[1]))) list.push({ type: "线路", url: abs(s[1]), priority: 0 });
  }
  // 先按分辨率，再无码优先，再看站点优先级
  function res(t) {
    var m = String(t).match(/(\d{3,4})p/i);
    return m ? parseInt(m[1], 10) : 0;
  }
  list.sort(function (a, b) {
    return (
      res(b.type) - res(a.type) ||
      (/^uc_/.test(b.type) ? 1 : 0) - (/^uc_/.test(a.type) ? 1 : 0) ||
      b.priority - a.priority
    );
  });
  return list;
}

async function loadDetail(link) {
  var url = String(link).split("#")[0];
  if (/deliveries|\.m3u8|index\.txt/i.test(url)) {
    return { id: url, type: "detail", mediaType: "movie", title: "播放", link: url, videoUrl: url };
  }
  var code = url.split("/").pop().toUpperCase();
  var t = normalize(await getText(url, true));
  var sources = parseSources(t);
  if (!sources.length) {
    t = normalize(await getText(url, false));
    sources = parseSources(t);
  }
  if (!sources.length) throw new Error("没找到播放地址，可能被 Cloudflare 拦了或影片暂无片源");

  var titleHit = pick(t, new RegExp('"id":"' + code + '","title":"((?:[^"\\\\]|\\\\.)*)"', "i"));
  var title = (titleHit ? decodeStr(titleHit) : "") || pick(t, /<title[^>]*>([^<]*)<\/title>/i) || code;
  title = title.replace(/\s*\|\s*GetAV\s*$/i, "");
  if (title.indexOf(code) !== 0) title = code + " " + title;
  var coverRe = new RegExp('"(https?://[^"]*/images/cover/' + code + '[^"]*)"', "i");
  var cover =
    pick(t, coverRe) ||
    pick(t, /"localImg":"([^"]+)"/) ||
    pick(t, /"(https?:\/\/[^"]*\/images\/cover\/[^"]+)"/) ||
    pick(t, /"(\/images\/cover\/[^"]+)"/);
  var best = sources[0];

  var item = {
    id: url,
    type: "detail",
    mediaType: "movie",
    title: title,
    link: url,
    videoUrl: best.url,
    description: title + "（" + (QUALITY_NAME[best.type] || best.type) + "）",
  };
  if (cover) withImages(item, jpegCover(abs(cover)));
  if (sources.length > 1) {
    item.childItems = sources.map(function (s) {
      return {
        id: s.url,
        type: "url",
        mediaType: "movie",
        title: QUALITY_NAME[s.type] || s.type,
        link: s.url,
        videoUrl: s.url,
      };
    });
  }
  return item;
}

// 起播时由 Rex 调用，列出所有画质 / 无码线路供切换
async function loadResource(params) {
  var link = String((params && (params.link || params.id)) || "");
  var m = link.match(/getav\.[a-z]+\/(?:[a-z-]+\/)?videos\/([A-Za-z0-9-]+)/i);
  if (!m) return [];
  var url = BASE + "/zh/videos/" + m[1].toLowerCase();
  var t = normalize(await getText(url, true));
  var sources = parseSources(t);
  if (!sources.length) sources = parseSources(normalize(await getText(url, false)));
  return sources.map(function (s) {
    var uc = /^uc_/.test(s.type);
    return {
      name: QUALITY_NAME[s.type] || s.type,
      description: (uc ? "无码" : "原版") + " · GetAV",
      url: s.url,
    };
  });
}
