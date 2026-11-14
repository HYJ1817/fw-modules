/* JAVDay · 入口层（元信息 + 栏目入口）
 * 上游是 Forward/Rex 原生模块，函数体逐字保留在 lib/vendor/javday-core.js；
 * 本文件只做两件事：补齐仓库要求的元信息，把「列表地址」从参数改成每个栏目一个固定函数。
 */

WidgetMetadata = {
  id: "hyj1817.javday.home",
  title: "JAVDay",
  description: "JAVDay 最新、人气、新作、有码、无码、无码流出、杏吧、玩偶姐姐、国产 AV 与国产厂商",
  author: "HYJ1817",
  icon: "https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/icon.png",
  site: "https://javday.app",
  version: "1.2.0",
  requiredVersion: "0.0.2",
  detailCacheDuration: 60,
  modules: [
    { id: "latest", title: "最新更新", description: "浏览最新更新视频", functionName: "loadJavdayNew", type: "video", cacheDuration: 1800, params: [{ name: "page", title: "页码", type: "page", value: "1" }] },
    { id: "hot", title: "人气系列", description: "按人气排序", functionName: "loadJavdayHot", type: "video", cacheDuration: 1800, params: [{ name: "page", title: "页码", type: "page", value: "1" }] },
    { id: "release", title: "新作上市", description: "新作上市", functionName: "loadJavdayRelease", type: "video", cacheDuration: 1800, params: [{ name: "page", title: "页码", type: "page", value: "1" }] },
    { id: "censored", title: "有码视频", description: "有码作品", functionName: "loadJavdayCensored", type: "video", cacheDuration: 1800, params: [{ name: "page", title: "页码", type: "page", value: "1" }] },
    { id: "uncensored", title: "无码视频", description: "无码作品", functionName: "loadJavdayUncensored", type: "video", cacheDuration: 1800, params: [{ name: "page", title: "页码", type: "page", value: "1" }] },
    { id: "leaked", title: "无码流出", description: "流出无码", functionName: "loadJavdayLeaked", type: "video", cacheDuration: 1800, params: [{ name: "page", title: "页码", type: "page", value: "1" }] },
    { id: "sex8", title: "杏吧视频", description: "杏吧", functionName: "loadJavdaySex8", type: "video", cacheDuration: 1800, params: [{ name: "page", title: "页码", type: "page", value: "1" }] },
    { id: "hongkongdoll", title: "玩偶姐姐", description: "玩偶姐姐系列", functionName: "loadJavdayDoll", type: "video", cacheDuration: 1800, params: [{ name: "page", title: "页码", type: "page", value: "1" }] },
    { id: "chinese", title: "国产 AV", description: "国产作品", functionName: "loadJavdayChinese", type: "video", cacheDuration: 1800, params: [{ name: "page", title: "页码", type: "page", value: "1" }] },
    { id: "madou", title: "国产厂商", description: "麻豆等厂商", functionName: "loadJavdayMadou", type: "video", cacheDuration: 1800, params: [{ name: "page", title: "页码", type: "page", value: "1" }] },
  ],
  search: {
    title: "JAVDay 搜索",
    functionName: "search",
    params: [
      { name: "keyword", title: "女優 / 番號 / 關鍵字", type: "input" },
      { name: "page", title: "页码", type: "page", value: "1" },
    ],
  },
};

/* 每个栏目一个固定入口：不依赖宿主是否把 type:"constant" 参数传下来 */
function javdayPage(params, url, sortBy) {
  return loadPage({ url: url, page: (params && params.page) || "1", sort_by: sortBy || "new" });
}
async function loadJavdayNew(params) { return javdayPage(params, "https://javday.app/label/new/", "new"); }
async function loadJavdayHot(params) { return javdayPage(params, "https://javday.app/label/hot/", "hot"); }
async function loadJavdayRelease(params) { return javdayPage(params, "https://javday.app/category/new-release/", "new"); }
async function loadJavdayCensored(params) { return javdayPage(params, "https://javday.app/category/censored/", "new"); }
async function loadJavdayUncensored(params) { return javdayPage(params, "https://javday.app/category/uncensored/", "new"); }
async function loadJavdayLeaked(params) { return javdayPage(params, "https://javday.app/category/uncensored-leaked/", "new"); }
async function loadJavdaySex8(params) { return javdayPage(params, "https://javday.app/category/sex8/", "new"); }
async function loadJavdayDoll(params) { return javdayPage(params, "https://javday.app/category/hongkongdoll/", "new"); }
async function loadJavdayChinese(params) { return javdayPage(params, "https://javday.app/category/chinese-av/", "new"); }
async function loadJavdayMadou(params) { return javdayPage(params, "https://javday.app/index.php/category/madou/", "new"); }
