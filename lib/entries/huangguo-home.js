/* 黄果短剧 · 首页入口层
 * 本文件不单独使用，由 scripts/build-huangguo.js 与 lib/huangguo.js 拼接后
 * 生成 widgets/huangguo.js。修改请改这里，不要改生成物。
 */

var HG_CATEGORIES = [
  { title: "AI 短剧", value: "drama" },
  { title: "AI 漫剧", value: "comic" },
  { title: "自定义栏目", value: "custom" },
];

WidgetMetadata = {
  id: "hyj1817.huangguo.home",
  title: "黄果短剧",
  icon: "https://huangguoai.com/apple-touch-icon.png",
  version: "1.0.0",
  requiredVersion: "0.0.2",
  description: "黄果短剧首页推荐、最近上新、排行榜、分类、专题、搜索与分集",
  author: "HYJ1817",
  site: "https://huangguoai.com",
  detailCacheDuration: 120,
  globalParams: [
    {
      name: "mode",
      title: "站点线路",
      type: "enumeration",
      value: "main",
      enumOptions: [
        { title: "主站 huangguoai.com", value: "main" },
        { title: "备用站 huangguoai.ai", value: "ai" },
        { title: "自定义地址", value: "custom" },
      ],
    },
    {
      name: "site",
      title: "自定义站点地址",
      type: "input",
      description: "线路选「自定义地址」时生效，填入口站给的实际域名，形如 https://huangguoai.com",
    },
    {
      name: "cookie",
      title: "访问 Cookie（可选）",
      type: "input",
      description: "只填写自己的登录 Cookie；不填则按匿名访客访问",
    },
    {
      name: "cover",
      title: "封面显示",
      type: "enumeration",
      value: "original",
      enumOptions: [
        { title: "站点原图（站点加密封面会显示为占位）", value: "original" },
        { title: "不显示封面", value: "off" },
      ],
    },
  ],
  modules: [
    {
      id: "home",
      title: "首页推荐",
      functionName: "loadHome",
      type: "video",
      cacheDuration: 600,
      params: [{ name: "page", title: "页码", type: "page", value: "1" }],
    },
    {
      id: "latest",
      title: "最近上新",
      functionName: "loadLatest",
      type: "video",
      cacheDuration: 300,
      params: [{ name: "page", title: "页码", type: "page", value: "1" }],
    },
    {
      id: "rank",
      title: "排行榜",
      functionName: "loadRank",
      type: "video",
      cacheDuration: 900,
      params: [{ name: "page", title: "页码", type: "page", value: "1" }],
    },
    {
      id: "categories",
      title: "分类",
      functionName: "loadCategory",
      type: "video",
      cacheDuration: 600,
      params: [
        { name: "category", title: "分类", type: "enumeration", value: "drama", enumOptions: HG_CATEGORIES },
        {
          name: "route",
          title: "自定义栏目 route",
          type: "input",
          description: "分类选「自定义栏目」时生效，填站点栏目地址尾段，如 guochan",
        },
        { name: "page", title: "页码", type: "page", value: "1" },
      ],
    },
    {
      id: "topics",
      title: "精选专题",
      functionName: "loadTopic",
      type: "video",
      cacheDuration: 1800,
      params: [
        { name: "slug", title: "专题标识", type: "input", description: "站点专题地址尾段，如 nveru" },
        { name: "page", title: "页码", type: "page", value: "1" },
      ],
    },
  ],
  search: {
    title: "搜索",
    functionName: "search",
    params: [
      { name: "keyword", title: "关键词", type: "input" },
      { name: "page", title: "页码", type: "page", value: "1" },
    ],
  },
};

function hgHomeCtx(params) { return hgCtx(params || {}); }

async function loadHome(params) {
  var ctx = hgHomeCtx(params), page = hgPageOf(params);
  try {
    var value = await hgPublic(ctx, hgQuery("/api/videos", { page: page, size: 30 }));
    return await hgVideoPage(ctx, value, page);
  } catch (error) {
    hgLog("首页推荐失败 - " + error.message);
    return { items: [], nextCursor: null };
  }
}

async function loadLatest(params) {
  var ctx = hgHomeCtx(params), page = hgPageOf(params);
  try {
    var value = await hgPublic(ctx, hgQuery("/api/videos", { page: page, size: 30, sort: "new" }));
    return await hgVideoPage(ctx, value, page);
  } catch (error) {
    hgLog("最近上新失败 - " + error.message);
    return { items: [], nextCursor: null };
  }
}

async function loadRank(params) {
  var ctx = hgHomeCtx(params), page = hgPageOf(params);
  try {
    var value = await hgPublic(ctx, hgQuery("/api/ranks/hot", { page: page, size: 30 }));
    return await hgVideoPage(ctx, value, page);
  } catch (error) {
    hgLog("排行榜失败 - " + error.message);
    return { items: [], nextCursor: null };
  }
}

async function loadCategory(params) {
  var ctx = hgHomeCtx(params), page = hgPageOf(params), category = String((params && params.category) || "drama");
  var route;
  if (category === "drama") route = "ai-duanju";
  else if (category === "comic") route = "ai-manju";
  else route = String((params && params.route) || "").replace(/^\/+|\/+$/g, "");
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(route)) {
    hgLog("分类 route 无效");
    return { items: [], nextCursor: null };
  }
  try {
    var value = await hgPublic(ctx, hgQuery("/api/videos/category/" + route, { page: page, size: 30 }));
    return await hgVideoPage(ctx, value, page);
  } catch (error) {
    hgLog("分类 " + route + " 失败 - " + error.message);
    return { items: [], nextCursor: null };
  }
}

async function loadTopic(params) {
  var ctx = hgHomeCtx(params), page = hgPageOf(params), slug = String((params && params.slug) || "").trim();
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(slug)) {
    hgLog("请先填写专题标识");
    return { items: [], nextCursor: null };
  }
  try {
    var value = await hgPublic(ctx, hgQuery("/api/topics/" + encodeURIComponent(slug), { page: page, size: 30 }));
    return await hgVideoPage(ctx, value, page);
  } catch (error) {
    hgLog("专题 " + slug + " 失败 - " + error.message);
    return { items: [], nextCursor: null };
  }
}

async function search(params) {
  var ctx = hgHomeCtx(params), page = hgPageOf(params);
  var keyword = hgText(params && params.keyword, 200);
  if (!keyword) return { items: [], nextCursor: null };
  try {
    var value = await hgEncrypted(ctx, "dynamic", {
      method: "GET",
      path: hgQuery("/api/search", { q: keyword, type: "video", page: page, size: 30 }),
      body: "",
      content_type: "",
    });
    return await hgVideoPage(ctx, value, page);
  } catch (error) {
    hgLog("搜索失败 - " + error.message);
    return { items: [], nextCursor: null };
  }
}

async function loadDetail(input) {
  var link = typeof input === "string" ? input : (input && (input.link || input.id || input.url)) || "";
  var parsed = hgParseLink(link);
  if (!parsed) return null;
  var ctx = hgCtx({ site: parsed.host ? "https://" + parsed.host : "", mode: parsed.host ? "custom" : "main" });
  try {
    return await hgDetail(ctx, link);
  } catch (error) {
    hgLog("详情失败 - " + error.message);
    return null;
  }
}
