/**
 * HStream (hstream.moe) Forward Widget
 * ------------------------------------
 * 抓取 hstream.moe 的系列、详情与分集数据。
 *
 * 模块:
 *   - 最新发布 (loadLatest)
 *   - 最近上传 (loadRecent)
 *   - 热门     (loadPopular)
 *   - 搜索     (search, 顶层配置)
 * 播放线路由独立的 hstream-resource.js 提供。
 */
var HOMEPAGE_CATEGORIES = [
  { title: "无码", value: "uncensored" },
  { title: "熟女", value: "milf" },
  { title: "女仆", value: "maid" },
  { title: "女学生", value: "school-girl" },
  { title: "魅魔", value: "succubus" },
  { title: "触手", value: "tentacle" },
  { title: "巨乳", value: "big-boobs" },
  { title: "BDSM", value: "bdsm" },
  { title: "精灵", value: "elf" },
  { title: "4K 48帧", value: "4k-48fps" },
];

WidgetMetadata = {
  id: "hyj1817.hstream.home",
  title: "HStream",
  icon: "https://hstream.moe/favicon.ico",
  version: "2.1.1",
  requiredVersion: "0.0.1",
  description: "HStream.moe 首页、搜索、详情与分集",
  author: "hstream",
  site: "https://hstream.moe",
  modules: [
    {
      id: "latest",
      title: "最新发布",
      functionName: "loadLatest",
      cacheDuration: 600,
      params: [],
    },
    {
      id: "recent",
      title: "最近上传",
      functionName: "loadRecent",
      cacheDuration: 600,
      params: [],
    },
    {
      id: "popular",
      title: "热门",
      functionName: "loadPopular",
      cacheDuration: 600,
      params: [],
    },
    {
      id: "categories",
      title: "分类",
      functionName: "loadCategory",
      cacheDuration: 600,
      params: [
        {
          name: "category",
          title: "分类",
          type: "enumeration",
          value: "uncensored",
          enumOptions: HOMEPAGE_CATEGORIES,
        },
        {
          name: "page",
          title: "页码",
          type: "page",
          value: "1",
        },
      ],
    },
  ],
  search: {
    title: "搜索",
    functionName: "search",
    params: [
      {
        name: "keyword",
        title: "关键词",
        type: "input",
        description: "输入英文作品名",
      },
    ],
  },
};

var BASE = "https://hstream.moe";
var UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
var NS = "hyj1817.hstream.home";

// ---------------------------------------------------------------------------
// 缓存(sharedCache + storage 兼容兜底;自带 TTL,值存为 {t, v})
// ---------------------------------------------------------------------------
function readCache(key) {
  if (Widget.sharedCache && typeof Widget.sharedCache.get === "function") {
    try {
      var v = Widget.sharedCache.get(NS, key);
      if (v !== null && v !== undefined) return v;
    } catch (e) {}
  }
  try {
    if (Widget.storage && typeof Widget.storage.get === "function") {
      return Widget.storage.get(key);
    }
  } catch (e) {}
  return null;
}

function writeCache(key, value) {
  if (Widget.sharedCache && typeof Widget.sharedCache.set === "function") {
    try {
      Widget.sharedCache.set(NS, key, value);
      return;
    } catch (e) {}
  }
  try {
    if (Widget.storage && typeof Widget.storage.set === "function") {
      Widget.storage.set(key, value);
    }
  } catch (e) {}
}

function readCacheTtl(key, ttlMs, fn) {
  var hit = readCache(key);
  if (hit && typeof hit === "object" && hit.t && Date.now() - hit.t < ttlMs) {
    return Promise.resolve(hit.v);
  }
  return Promise.resolve(fn()).then(function (v) {
    try {
      writeCache(key, { t: Date.now(), v: v });
    } catch (e) {}
    return v;
  });
}

// ---------------------------------------------------------------------------
// HTTP 帮助函数
// ---------------------------------------------------------------------------
async function getHTML(url, referer) {
  var headers = {
    "User-Agent": UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };
  if (referer) headers.Referer = referer;
  var response = await Widget.http.get(url, { headers: headers });
  var html = response && response.data;
  if (typeof html !== "string" || !html.length) {
    throw new Error("HTML 获取失败: " + url);
  }
  return html;
}

// ---------------------------------------------------------------------------
// 解析帮助函数
// ---------------------------------------------------------------------------
var stripTags = function (s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/** 提取剧集链接: /hentai/<slug>-<N> */
function extractEpisodeLinks(html) {
  var out = [];
  var seen = {};
  var re = /href="(?:https:\/\/hstream\.moe)?\/hentai\/([a-z0-9][a-z0-9-]*?)-(\d+)(?:[?"#]|")/g;
  var m;
  while ((m = re.exec(html))) {
    var slug = m[1];
    var ep = parseInt(m[2], 10);
    var key = slug + "-" + ep;
    if (seen[key]) continue;
    seen[key] = true;
    out.push({ slug: slug, ep: ep, key: key });
  }
  return out;
}

function normalizeSlug(s) {
  return String(s || "").replace(/^hstream%3A/, "").replace(/^hstream:/, "");
}

function titleCase(slug) {
  return String(slug || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
}

function posterUrl(slug, maxEp) {
  return BASE + "/images/hentai/" + slug + "/cover-ep-" + maxEp + ".webp";
}

function backdropUrl(slug) {
  return BASE + "/images/hentai/" + slug + "/gallery-ep-1-0.webp";
}

function galleryUrl(slug, ep) {
  return BASE + "/images/hentai/" + slug + "/gallery-ep-" + ep + "-0-thumbnail.webp";
}

function decodeHtmlEntities(s) {
  return String(s || "")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// ---------------------------------------------------------------------------
// 列表: 把剧集链接按系列分组, 输出 VideoItem[]
// ---------------------------------------------------------------------------
function seriesItemsFromLinks(links) {
  var map = {};
  for (var i = 0; i < links.length; i++) {
    var l = links[i];
    if (!map[l.slug]) map[l.slug] = { slug: l.slug, eps: [] };
    map[l.slug].eps.push(l);
  }
  var items = [];
  for (var slug in map) {
    var s = map[slug];
    var maxEp = 0;
    for (var j = 0; j < s.eps.length; j++) {
      if (s.eps[j].ep > maxEp) maxEp = s.eps[j].ep;
    }
    items.push({
      id: "hstream:" + slug,
      type: "url",
      title: titleCase(slug),
      seriesName: titleCase(slug),
      posterPath: posterUrl(slug, maxEp),
      backdropPath: backdropUrl(slug),
      description: "HStream · " + s.eps.length + " 集",
      mediaType: "tv",
      link: "hstream:" + slug,
    });
  }
  return items;
}

async function loadSeriesList(sourceUrl, cacheKey) {
  return readCacheTtl("list:" + cacheKey, 10 * 60e3, async function () {
    var html = await getHTML(sourceUrl);
    return seriesItemsFromLinks(extractEpisodeLinks(html));
  });
}

async function loadLatest(params) {
  return loadSeriesList(BASE + "/", "latest");
}

async function loadRecent(params) {
  return loadSeriesList(BASE + "/search?order=recently-uploaded", "recent");
}

async function loadPopular(params) {
  return loadSeriesList(BASE + "/search?order=view-count", "popular");
}

function validHomepageCategory(value) {
  for (var i = 0; i < HOMEPAGE_CATEGORIES.length; i++) {
    if (HOMEPAGE_CATEGORIES[i].value === value) return value;
  }
  return "uncensored";
}

async function loadCategory(params) {
  params = params || {};
  var category = validHomepageCategory(String(params.category || "uncensored"));
  var page = parseInt(params.page, 10);
  if (!page || page < 1) page = 1;
  var url =
    BASE +
    "/search?order=recently-uploaded&tags%5B0%5D=" +
    encodeURIComponent(category) +
    "&page=" +
    page;
  return loadSeriesList(url, "category:" + category + ":page:" + page);
}

async function search(params) {
  var keyword = String((params && params.keyword) || "").trim();
  if (!keyword) return [];
  var html = await getHTML(BASE + "/search?search=" + encodeURIComponent(keyword));
  return seriesItemsFromLinks(extractEpisodeLinks(html));
}

// ---------------------------------------------------------------------------
// 详情: 系列页 -> 简介 / 剧照 / 分集; 单集页兜底
// ---------------------------------------------------------------------------
async function loadDetail(link) {
  var slug = normalizeSlug(link);
  if (!slug) return null;
  var id = "hstream:" + slug;

  // 先按系列页解析
  try {
    var html = await getHTML(BASE + "/hentai/" + slug);
    var h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1];
    var name = h1 ? stripTags(h1) : titleCase(slug);
    var ogImg = (html.match(/property="og:image" content="([^"]+)"/) || [])[1];
    var ogDesc = (html.match(/property="og:description" content="([^"]*)"/) || [])[1];
    var eps = extractEpisodeLinks(html)
      .filter(function (e) {
        return e.slug === slug;
      })
      .sort(function (a, b) {
        return a.ep - b.ep;
      });

    if (eps.length) {
      var maxEp = eps[eps.length - 1].ep;
      return {
        id: id,
        type: "url",
        title: name,
        seriesName: name,
        posterPath: posterUrl(slug, maxEp),
        backdropPath: ogImg || backdropUrl(slug),
        description: decodeHtmlEntities(ogDesc),
        mediaType: "tv",
        backdropPaths: eps.map(function (e) {
          return galleryUrl(slug, e.ep);
        }),
        episodeItems: eps.map(function (e) {
          return {
            id: "hstream:" + e.key,
            type: "url",
            title: name + " · EP" + e.ep,
            seriesName: name,
            episodeName: "EP" + e.ep,
            episode: e.ep,
            mediaType: "tv",
            posterPath: galleryUrl(slug, e.ep),
            link: "hstream:" + e.key,
          };
        }),
        link: id,
      };
    }
  } catch (e) {
    console.log("系列页解析失败, 尝试单集模式: " + e.message);
  }

  // 兜底: 当作单集
  var singleHtml = await getHTML(BASE + "/hentai/" + slug);
  var singleH1 = (singleHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1];
  var singleTitle = singleH1 ? stripTags(singleH1) : titleCase(slug);
  return {
    id: id,
    type: "url",
    title: singleTitle,
    seriesName: singleTitle,
    mediaType: "tv",
    episodeItems: [
      {
        id: id,
        type: "url",
        title: singleTitle,
        seriesName: singleTitle,
        episodeName: "EP1",
        episode: 1,
        mediaType: "tv",
        link: id,
      },
    ],
    link: id,
  };
}
