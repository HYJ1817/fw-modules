/* 黄果短剧 · 首页入口层
 * 本文件不单独使用，由 scripts/build-huangguo.js 与 lib/huangguo.js 拼接后
 * 生成 widgets/huangguo.js。修改请改这里，不要改生成物。
 */

var HG_CATEGORIES = [
  { title: "短剧", value: "ai-duanju" },
  { title: "漫剧", value: "ai-manju" },
  { title: "自定义栏目", value: "custom" },
];
/* 站点目录接口仍挂着但接口回 410「内容已下线」的栏目，选了只会看到失败提示 */
/* 站点 /api/topics 实测的专题全量（2026-11-13，11 个）；站点加新专题时用「自定义」填 slug */
var HG_TOPICS = [
  { title: "精品高分", value: "hot-aiduanju" },
  { title: "家庭伦理", value: "luanlun-aiduanju" },
  { title: "灵异诡事", value: "paranormal-aiduanju" },
  { title: "校园青春", value: "xiaoyuan—qingcun" },
  { title: "末世重生成人", value: "AImori-chongsheng" },
  { title: "百合女同", value: "baihe-nvtong" },
  { title: "乡村AI成人", value: "xiangcun-AIchengren" },
  { title: "古风穿越", value: "gufen-wuxiachuanyue" },
  { title: "仙侠奇幻", value: "xianxia-qihuanyaoxiai" },
  { title: "天菜男同", value: "tiancai-nantong" },
  { title: "欧美精选", value: "oumei-duanju" },
  { title: "自定义专题", value: "custom" },
];
var HG_DEAD_ROUTES = { "ai-huanlian": true, "ai-mogai": true };

WidgetMetadata = {
  id: "hyj1817.huangguo.home",
  title: "黄果短剧",
  icon: "https://huangguoai.com/apple-touch-icon.png",
  version: "1.0.3",
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
      value: "off",
      enumOptions: [
        { title: "不加载封面（默认：站点封面是密文，Forward 无法解码）", value: "off" },
        { title: "尝试站点原图 URL（多半显示为占位，且每页多拉数 MB）", value: "original" },
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
        { name: "category", title: "分类", type: "enumeration", value: "ai-duanju", enumOptions: HG_CATEGORIES },
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
        {
          name: "slug",
          title: "专题",
          type: "enumeration",
          value: "hot-aiduanju",
          enumOptions: HG_TOPICS,
        },
        { name: "custom", title: "自定义专题 slug", type: "input", description: "专题选「自定义」时生效" },
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

// Forward 首页模块的函数必须直接返回条目数组；出错时返回一条占位条目，
// 否则界面上只会显示「没有内容」，无从判断是网络、参数还是解析的问题。
function hgNotice(message, ctx) {
  var host = "huangguoai.com";
  try { host = hgHostOf(hgBase(ctx)); } catch (_) {}
  return [{
    id: "huangguo:notice",
    type: "video",
    title: "黄果短剧：" + hgText(message, 120),
    seriesName: "黄果短剧",
    description: "这只是提示，点开没有内容；修好后刷新即可恢复。",
    mediaType: "tv",
    link: "huangguo:0:1@" + host,
  }];
}

async function loadHome(params) {
  var ctx = hgHomeCtx(params);
  try {
    return hgVideoPage(ctx, await hgPublic(ctx, hgQuery("/api/videos", { page: hgPageOf(params), size: 30 })));
  } catch (error) {
    hgLog("首页推荐失败 - " + ((error && error.message) || error));
    return hgNotice("首页推荐加载失败：" + ((error && error.message) || "未知错误"), ctx);
  }
}

async function loadLatest(params) {
  var ctx = hgHomeCtx(params);
  try {
    return hgVideoPage(ctx, await hgPublic(ctx, hgQuery("/api/videos", { page: hgPageOf(params), size: 30, sort: "new" })));
  } catch (error) {
    hgLog("最近上新失败 - " + ((error && error.message) || error));
    return hgNotice("最近上新加载失败：" + ((error && error.message) || "未知错误"), ctx);
  }
}

async function loadRank(params) {
  var ctx = hgHomeCtx(params);
  try {
    return hgVideoPage(ctx, await hgPublic(ctx, hgQuery("/api/ranks/hot", { page: hgPageOf(params), size: 30 })));
  } catch (error) {
    hgLog("排行榜失败 - " + ((error && error.message) || error));
    return hgNotice("排行榜加载失败：" + ((error && error.message) || "未知错误"), ctx);
  }
}

var HG_CATEGORY_ALIAS = {
  drama: "ai-duanju", "短剧": "ai-duanju", duanju: "ai-duanju",
  comic: "ai-manju", "漫剧": "ai-manju", manju: "ai-manju",
  "ai-huanlian": "ai-huanlian", "ai换脸": "ai-huanlian", "ai 换脸": "ai-huanlian", "AI换脸": "ai-huanlian",
  "ai-mogai": "ai-mogai", "ai魔改": "ai-mogai", "ai 魔改": "ai-mogai", "AI魔改": "ai-mogai",
};
async function loadCategory(params) {
  var ctx = hgHomeCtx(params);
  var raw = hgText(params && params.category, 40) || "ai-duanju";
  var route = raw === "custom" ? hgText(params && params.route, 64).replace(/^\/+|\/+$/g, "") : (HG_CATEGORY_ALIAS[raw] || raw);
  if (HG_DEAD_ROUTES[route]) return hgNotice("站点已把「" + route + "」栏目下线了（接口回 410），换短剧或漫剧", ctx);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(route)) return hgNotice("请先填写自定义栏目 route（站点栏目地址尾段）", ctx);
  try {
    return hgVideoPage(ctx, await hgPublic(ctx, hgQuery("/api/videos/category/" + route, { page: hgPageOf(params), size: 30 })));
  } catch (error) {
    var message = (error && error.message) || "未知错误";
    if (/410/.test(message)) message = "该栏目已被站点下线，换短剧或漫剧";
    hgLog("分类 " + route + " 失败 - " + message);
    return hgNotice("分类「" + route + "」加载失败：" + message, ctx);
  }
}

async function loadTopic(params) {
  var ctx = hgHomeCtx(params);
  var slug = String((params && params.slug) || "").trim();
  if (slug === "custom") slug = hgText(params && params.custom, 200);
  if (!slug) return hgNotice("请先选择专题或填写自定义 slug", ctx);
  // 站点自己的 slug 里就有长破折号（xiaoyuan—qingcun），不能按纯 ASCII 校验
  if (!/^[^\u0000-\u001f\u007f]{1,200}$/.test(slug)) return hgNotice("专题 slug 无效", ctx);
  try {
    var value = await hgPublic(ctx, hgQuery("/api/topics/" + encodeURIComponent(slug), { page: hgPageOf(params), size: 30 }));
    // 专题接口的影片列表在 value.videos.{items,pagination} 里
    return hgVideoPage(ctx, (value && value.videos) || value);
  } catch (error) {
    hgLog("专题 " + slug + " 失败 - " + ((error && error.message) || error));
    return hgNotice("专题「" + slug + "」加载失败：" + ((error && error.message) || "未知错误"), ctx);
  }
}

async function search(params) {
  var ctx = hgHomeCtx(params);
  var keyword = hgText(params && params.keyword, 200);
  if (!keyword) return [];
  try {
    return hgVideoPage(ctx, await hgEncrypted(ctx, "dynamic", {
      method: "GET",
      path: hgQuery("/api/search", { q: keyword, type: "video", page: hgPageOf(params), size: 30 }),
      body: "",
      content_type: "",
    }));
  } catch (error) {
    hgLog("搜索失败 - " + ((error && error.message) || error));
    return hgNotice("搜索「" + keyword + "」失败：" + ((error && error.message) || "未知错误"), ctx);
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
    hgLog("详情失败 - " + ((error && error.message) || error));
    return null;
  }
}
