/** Hanime.tv homepage widget for Forward. */
var HANIME_CATEGORIES = [
  { title: "两千岁龙女", value: "2000 year old dragon girl" },
  { title: "3D 动画", value: "3d" },
  { title: "阿嘿颜", value: "ahegao" },
  { title: "肛交", value: "anal" },
  { title: "BDSM", value: "bdsm" },
  { title: "巨乳", value: "big boobs" },
  { title: "口交", value: "blow job" },
  { title: "束缚", value: "bondage" },
  { title: "乳交", value: "boob job" },
  { title: "有码", value: "censored" },
  { title: "喜剧", value: "comedy" },
  { title: "角色扮演", value: "cosplay" },
  { title: "中出", value: "creampie" },
  { title: "黑皮", value: "dark skin" },
  { title: "颜射", value: "facial" },
  { title: "奇幻", value: "fantasy" },
  { title: "真人拍摄", value: "filmed" },
  { title: "足交", value: "foot job" },
  { title: "扶她", value: "futanari" },
  { title: "群交", value: "gangbang" },
  { title: "眼镜娘", value: "glasses" },
  { title: "手交", value: "hand job" },
  { title: "后宫", value: "harem" },
  { title: "HD 高清", value: "hd" },
  { title: "恐怖", value: "horror" },
  { title: "乱伦", value: "incest" },
  { title: "腹部膨胀", value: "inflation" },
  { title: "泌乳", value: "lactation" },
  { title: "女仆", value: "maid" },
  { title: "自慰", value: "masturbation" },
  { title: "熟女", value: "milf" },
  { title: "精神崩坏", value: "mind break" },
  { title: "精神控制", value: "mind control" },
  { title: "怪物", value: "monster" },
  { title: "猫耳", value: "nekomimi" },
  { title: "NTR", value: "ntr" },
  { title: "护士", value: "nurse" },
  { title: "乱交派对", value: "orgy" },
  { title: "剧情", value: "plot" },
  { title: "POV 主视角", value: "pov" },
  { title: "孕妇", value: "pregnant" },
  { title: "公开场合", value: "public sex" },
  { title: "舔肛", value: "rimjob" },
  { title: "排泄", value: "scat" },
  { title: "女学生", value: "school girl" },
  { title: "软色情", value: "softcore" },
  { title: "泳装", value: "swimsuit" },
  { title: "教师", value: "teacher" },
  { title: "触手", value: "tentacle" },
  { title: "三人行", value: "threesome" },
  { title: "玩具", value: "toys" },
  { title: "伪娘", value: "trap" },
  { title: "傲娇", value: "tsundere" },
  { title: "丑男", value: "ugly bastard" },
  { title: "无码", value: "uncensored" },
  { title: "纯爱", value: "vanilla" },
  { title: "处女", value: "virgin" },
  { title: "水上运动", value: "watersports" },
  { title: "X光透视", value: "x ray" },
  { title: "Yaoi 男同", value: "yaoi" },
  { title: "Yuri 百合", value: "yuri" },
];

WidgetMetadata = {
  id: "hyj1817.hanime.home",
  title: "Hanime",
  icon: "https://hyj1817.github.io/fw-modules/icon.png",
  version: "1.1.1",
  requiredVersion: "0.0.1",
  description: "Hanime.tv 首页、中文分类、搜索、详情与分集",
  author: "Forward Widgets",
  site: "https://hanime.tv",
  modules: [
    { id: "recent", title: "最近上传", functionName: "loadRecent", cacheDuration: 600, params: [] },
    { id: "new", title: "新作发布", functionName: "loadNew", cacheDuration: 600, params: [] },
    { id: "trending", title: "热门趋势", functionName: "loadTrending", cacheDuration: 600, params: [] },
    { id: "random", title: "随机推荐", functionName: "loadRandom", cacheDuration: 300, params: [] },
    {
      id: "categories",
      title: "分类",
      functionName: "loadCategory",
      cacheDuration: 600,
      params: [
        { name: "category", title: "分类", type: "enumeration", value: "uncensored", enumOptions: HANIME_CATEGORIES },
        { name: "page", title: "页码", type: "page", value: "1" },
      ],
    },
  ],
  search: {
    title: "搜索",
    functionName: "search",
    params: [{ name: "keyword", title: "关键词", type: "input", description: "输入作品名称" }],
  },
};

var BASE = "https://hanime.tv";
var SEARCH_API = "https://search.htv-services.com/";
var UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
var NS = "hyj1817.hanime.home";

function absoluteUrl(url) {
  url = decodeEntities(String(url || "").replace(/\\u002F/g, "/").replace(/\\\//g, "/"));
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.indexOf("//") === 0) return "https:" + url;
  return BASE + (url.charAt(0) === "/" ? url : "/" + url);
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
}

function stripTags(value) {
  return decodeEntities(String(value || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function readCache(key) {
  try { if (Widget.sharedCache && Widget.sharedCache.get) return Widget.sharedCache.get(NS, key); } catch (e) {}
  try { if (Widget.storage && Widget.storage.get) return Widget.storage.get(key); } catch (e) {}
  return null;
}

function writeCache(key, value) {
  try { if (Widget.sharedCache && Widget.sharedCache.set) return Widget.sharedCache.set(NS, key, value); } catch (e) {}
  try { if (Widget.storage && Widget.storage.set) Widget.storage.set(key, value); } catch (e) {}
}

async function cached(key, ttl, loader) {
  var hit = readCache(key);
  if (hit && hit.t && Date.now() - hit.t < ttl) return hit.v;
  var value = await loader();
  writeCache(key, { t: Date.now(), v: value });
  return value;
}

function responseData(response) {
  var data = response && response.data;
  if (typeof data === "string") { try { return JSON.parse(data); } catch (e) {} }
  return data;
}

async function getHTML(url) {
  var response = await Widget.http.get(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*", Referer: BASE + "/" }, timeout: 15000 });
  var html = response && response.data;
  if (typeof html !== "string" || !html) throw new Error("HTML 获取失败: " + url);
  return html;
}

function episodeNumber(slug, fallback) {
  var match = String(slug || "").match(/(?:-|\b)(\d+)(?:$|\D)/);
  return match ? parseInt(match[1], 10) : (fallback || 1);
}

function videoItem(video) {
  var slug = String(video.slug || video.id || "").replace(/^.*\/hentai\//, "").replace(/[?#].*$/, "");
  if (!slug) return null;
  var title = stripTags(video.name || video.title || video.alt || slug.replace(/-/g, " "));
  return {
    id: "hanime:" + slug,
    type: "url",
    title: title,
    seriesName: title.replace(/\s+\d+$/, ""),
    posterPath: absoluteUrl(video.poster_url || video.poster || video.cover_url || video.cover || video.image),
    backdropPath: absoluteUrl(video.cover_url || video.cover || video.poster_url || video.image),
    description: stripTags(video.description || (video.views ? "播放 " + video.views : "Hanime")),
    mediaType: "tv",
    link: "hanime:" + slug,
  };
}

function parseVideoCards(html) {
  html = String(html || "");
  var output = [];
  var seen = {};
  var anchor = /<a\b([^>]*href=["'][^"']*\/videos\/hentai\/([^"'?#/]+)[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
  var match;
  while ((match = anchor.exec(html))) {
    var attrs = match[1], body = match[3], slug = match[2];
    if (seen[slug]) continue;
    var image = (body.match(/(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i) || attrs.match(/(?:data-src|src)=["']([^"']+)["']/i) || [])[1];
    var heading = (body.match(/<(?:h[1-6]|strong|span)[^>]*>([\s\S]*?)<\/(?:h[1-6]|strong|span)>/i) || [])[1];
    var alt = (body.match(/alt=["']([^"']+)["']/i) || [])[1];
    var item = videoItem({ slug: slug, name: heading || alt || slug, cover_url: image });
    if (item) { seen[slug] = true; output.push(item); }
  }
  var jsonPattern = /["']slug["']\s*:\s*["']([^"']+)["'][\s\S]{0,900}?["'](?:name|title)["']\s*:\s*["']([^"']+)["'][\s\S]{0,900}?["'](?:cover_url|poster_url)["']\s*:\s*["']([^"']*)["']/gi;
  while ((match = jsonPattern.exec(html))) {
    if (seen[match[1]]) continue;
    var jsonItem = videoItem({ slug: match[1], name: match[2], cover_url: match[3] });
    if (jsonItem) { seen[match[1]] = true; output.push(jsonItem); }
  }
  return output;
}

function hitsFromSearchPayload(data) {
  data = data || {};
  var hits = data.hits;
  if (typeof hits === "string") { try { hits = JSON.parse(hits); } catch (e) { hits = []; } }
  if (!Array.isArray(hits)) hits = data.results || data.hentai_videos || [];
  return (hits || []).map(videoItem).filter(Boolean);
}

async function apiSearch(query, tags, orderBy, page) {
  var response = await Widget.http.post(SEARCH_API, {
    blacklist: [], brands: [], order_by: orderBy || "created_at_unix", ordering: "desc",
    page: Math.max(0, (parseInt(page, 10) || 1) - 1), search_text: query || "", tags: tags || [], tags_mode: "AND",
  }, { headers: { "User-Agent": UA, "Content-Type": "application/json;charset=UTF-8", Origin: BASE, Referer: BASE + "/" }, timeout: 15000 });
  return hitsFromSearchPayload(responseData(response));
}

async function loadPage(path, cacheKey) {
  return cached("list:" + cacheKey, 10 * 60e3, async function () { return parseVideoCards(await getHTML(BASE + path)); });
}

async function withApiFallback(query, tags, orderBy, page, path, key) {
  return cached("list:" + key, 10 * 60e3, async function () {
    try { var items = await apiSearch(query, tags, orderBy, page); if (items.length) return items; } catch (e) { console.log("Hanime search API fallback: " + e.message); }
    return parseVideoCards(await getHTML(BASE + path));
  });
}

async function loadRecent() { return withApiFallback("", [], "created_at_unix", 1, "/", "recent"); }
async function loadNew() { return withApiFallback("", [], "released_at_unix", 1, "/new-releases", "new"); }
async function loadTrending() { return withApiFallback("", [], "views", 1, "/browse/trending", "trending"); }
async function loadRandom() { return loadPage("/browse/random", "random:" + Math.floor(Date.now() / 300000)); }

function validCategory(value) {
  for (var i = 0; i < HANIME_CATEGORIES.length; i++) if (HANIME_CATEGORIES[i].value === value) return value;
  return "uncensored";
}

async function loadCategory(params) {
  params = params || {};
  var category = validCategory(String(params.category || "uncensored"));
  var page = Math.max(1, parseInt(params.page, 10) || 1);
  return withApiFallback("", [category], "created_at_unix", page, "/browse/tags/" + encodeURIComponent(category) + "?page=" + page, "category:" + category + ":" + page);
}

async function search(params) {
  var keyword = String((params && params.keyword) || "").trim();
  if (!keyword) return [];
  return withApiFallback(keyword, [], "created_at_unix", 1, "/search?query=" + encodeURIComponent(keyword), "search:" + keyword.toLowerCase());
}

function detailFromApi(data) {
  data = data || {};
  var current = data.hentai_video || data.video || data;
  var base = videoItem(current);
  if (!base) return null;
  var franchise = data.hentai_franchise_hentai_videos || data.franchise_videos || data.episodes || [current];
  if (!Array.isArray(franchise) || !franchise.length) franchise = [current];
  base.description = stripTags(current.description || base.description);
  base.seriesName = stripTags((data.hentai_franchise && data.hentai_franchise.title) || current.franchise_title || base.seriesName);
  base.title = base.seriesName || base.title;
  base.backdropPaths = franchise.map(function (x) { return absoluteUrl(x.cover_url || x.poster_url || x.image); }).filter(Boolean);
  base.episodeItems = franchise.map(function (x, index) {
    var item = videoItem(x) || base;
    var slug = String(x.slug || current.slug || "");
    var ep = episodeNumber(slug, index + 1);
    return {
      id: "hanime:" + slug, type: "url", title: stripTags(x.name || x.title || base.seriesName) || base.seriesName,
      seriesName: base.seriesName, episodeName: "EP" + ep, episode: ep, mediaType: "tv",
      posterPath: absoluteUrl(x.cover_url || x.poster_url || x.image), link: "hanime:" + slug,
    };
  }).sort(function (a, b) { return a.episode - b.episode; });
  return base;
}

function detailFromHtml(html, slug) {
  var title = stripTags((String(html).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || (String(html).match(/property=["']og:title["'][^>]*content=["']([^"']+)/i) || [])[1] || slug.replace(/-/g, " "));
  var poster = absoluteUrl((String(html).match(/property=["']og:image["'][^>]*content=["']([^"']+)/i) || [])[1]);
  var description = stripTags((String(html).match(/property=["']og:description["'][^>]*content=["']([^"']*)/i) || [])[1]);
  var cards = parseVideoCards(html);
  if (!cards.length) cards = [videoItem({ slug: slug, name: title, cover_url: poster })];
  return detailFromApi({ hentai_video: { slug: slug, name: title, cover_url: poster, description: description }, hentai_franchise_hentai_videos: cards.map(function (x) { return { slug: x.link.replace("hanime:", ""), name: x.title, cover_url: x.posterPath }; }) });
}

async function loadDetail(link) {
  var slug = String(link || "").replace(/^hanime%3A/i, "").replace(/^hanime:/i, "").replace(/^.*\/hentai\//, "").replace(/[?#].*$/, "");
  if (!slug) return null;
  try {
    var response = await Widget.http.get(BASE + "/api/v8/video?id=" + encodeURIComponent(slug), { headers: { "User-Agent": UA, Accept: "application/json", Referer: BASE + "/videos/hentai/" + slug }, timeout: 15000 });
    var detail = detailFromApi(responseData(response));
    if (detail) return detail;
  } catch (e) { console.log("Hanime detail API fallback: " + e.message); }
  return detailFromHtml(await getHTML(BASE + "/videos/hentai/" + slug), slug);
}
