/**
 * SupJav（WeBox 移植版）真站回归（需要外网；不在 npm run verify 里）
 *
 *   npm i -D jsdom jquery
 *   node tests/supjav-webox-live.js
 *
 * 覆盖：最新列表 → 详情分集 → 首个线路解析 → master.m3u8 取流。
 * 站点触发 Cloudflare 验证时用 --cookie 传浏览器 Cookie：
 *   node tests/supjav-webox-live.js --cookie "cf_clearance=..."
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

function optional(name) {
  try {
    return require(name);
  } catch (_) {
    return null;
  }
}

const jsdom = optional("jsdom");
const jqueryPath = path.join(ROOT, "node_modules", "jquery", "dist", "jquery.js");
if (!jsdom || !fs.existsSync(jqueryPath)) {
  console.log("跳过：需要先 npm i -D jsdom jquery（真站回归依赖 DOM 解析）");
  process.exit(0);
}
const JQ_SRC = fs.readFileSync(jqueryPath, "utf8");

function htmlLoad(html) {
  const dom = new jsdom.JSDOM(String(html || "<html><body></body></html>"), { runScripts: "outside-only" });
  dom.window.eval(JQ_SRC);
  return dom.window.jQuery;
}

function argOf(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "") : "";
}

function loadWidget() {
  const source = fs.readFileSync(path.join(ROOT, "widgets", "supjav-webox.js"), "utf8");
  const ctx = {
    console: { log() {} },
    Date, JSON, Math, Promise, String, Number, Object, Array, Error, RegExp, URL, setTimeout,
    encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN,
    Widget: {
      http: {
        get: async (url, options) => {
          const response = await fetch(url, { headers: (options && options.headers) || {} });
          return {
            data: await response.text(),
            status: response.status,
            headers: Object.fromEntries(response.headers),
          };
        },
        post: async (url, body, options) => {
          const response = await fetch(url, { method: "POST", headers: (options && options.headers) || {}, body });
          return { data: await response.text(), status: response.status };
        },
      },
      html: { load: htmlLoad },
      sharedCache: null,
      storage: null,
    },
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: "supjav-webox.js" });
  return ctx;
}

(async () => {
  const widget = loadWidget();
  const params = { mode: "blog", lang: "zh", page: "1", cookie: argOf("--cookie") };

  const list = await widget.loadLatest(params);
  assert.ok(Array.isArray(list) && list.length > 0, "最新列表为空");
  console.log(`  ✓ 最新列表 — ${list.length} 条，首条「${list[0].title}」`);

  const categories = await widget.loadCategory({ ...params, category: "custom", route: "category/uncensored-jav" });
  assert.ok(Array.isArray(categories), "分类必须返回数组");
  console.log(`  ✓ 分类 无码 JAV — ${categories.length} 条`);

  const search = await widget.search({ ...params, keyword: "SSIS" });
  assert.ok(Array.isArray(search), "搜索必须返回数组");
  console.log(`  ✓ 搜索 SSIS — ${search.length} 条`);

  let detail = null;
  for (const item of list.slice(0, 5)) {
    detail = await widget.loadDetail(item.link);
    if (detail && detail.episodeItems.length) break;
    detail = null;
  }
  assert.ok(detail, "前 5 条都没解析出详情（可能是站点改版或 Cloudflare 验证）");
  console.log(`  ✓ 详情 — ${detail.title} / ${detail.episodeItems.length} 个线路分集`);

  let played = 0;
  for (const item of detail.episodeItems.slice(0, 3)) {
    const sources = await widget.loadResource({ ...params, link: item.link });
    if (!sources.length) {
      console.log(`  · ${item.episodeName} — 无线路（可换别的片再试）`);
      continue;
    }
    const primary = sources[0];
    const response = await fetch(primary.url, { headers: primary.customHeaders });
    const text = await response.text();
    assert.ok(response.status === 200 && /#EXTM3U/.test(text), `m3u8 取不到：${primary.url}`);
    played++;
    console.log(`  ✓ 播放 — ${item.episodeName} / ${sources.length} 条线路，master 200（${text.split("\n").length} 行）`);
    if (played >= 2) break;
  }
  assert.ok(played > 0, "三个分集都没解析出可播放线路");
  console.log("真站回归通过");
})().catch((error) => {
  console.error("真站回归失败：" + error.message);
  process.exit(1);
});
