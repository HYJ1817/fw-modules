/**
 * SupJav（WeBox 移植版）单测
 *
 * 桥接层不依赖 DOM 的部分在这里覆盖：链接编解码、URL 归一、栏目别名、元信息。
 * 真正的解析与播放链在 tests/supjav-webox-live.js（需要外网 + jsdom，不在 verify 里）。
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

function load() {
  const source = fs.readFileSync(path.join(ROOT, "widgets", "supjav-webox.js"), "utf8");
  const ctx = {
    console: { log() {} },
    Date,
    JSON,
    Math,
    Promise,
    String,
    Number,
    Object,
    Array,
    Error,
    RegExp,
    encodeURIComponent,
    decodeURIComponent,
    parseInt,
    parseFloat,
    isNaN,
    setTimeout,
    URL,
    Widget: {
      http: { get: async () => ({ data: "", status: 200 }), post: async () => ({ data: "", status: 200 }) },
      html: { load: () => { throw new Error("unit test 不应触碰 DOM"); } },
      sharedCache: null,
      storage: null,
    },
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: "supjav-webox.js" });
  return ctx;
}

function testMetadata() {
  const w = load();
  const meta = w.WidgetMetadata;
  assert.strictEqual(meta.id, "hyj1817.supjav.webox");
  assert.ok(meta.icon.startsWith("https://"), "icon 必须是绝对地址");
  assert.ok(meta.modules.some((m) => m.id === "categories"), "首页必须暴露分类模块");
  assert.strictEqual(typeof w.loadDetail, "function");
  assert.strictEqual(typeof w.search, "function");
  const stream = meta.modules.filter((m) => m.type === "stream");
  assert.strictEqual(stream.length, 1, "必须且只能有一个播放源模块");
  assert.strictEqual(stream[0].id, "loadResource");
  assert.strictEqual(stream[0].functionName, "loadResource");
  assert.ok(meta.globalParams.some((p) => p.name === "mode"));
  assert.ok(meta.globalParams.some((p) => p.name === "cookie"));
}

function testLinkCodec() {
  const w = load();
  const link = w.fwMakeLink("/zh/video/abc-123");
  assert.ok(link.startsWith("supjav2:"));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(w.fwParseLink(link))), {
    contentId: "/zh/video/abc-123",
    groupId: "",
    episodeId: "",
  });

  // 分集 link：groupId / episodeId 里可能带冒号（datalink:token:api），必须原样还原
  const ep = w.fwMakeLink("https://supjav.blog/video/x", "server:upload18", "server-slot:upload18:2");
  const parsed = w.fwParseLink(ep);
  assert.strictEqual(parsed.groupId, "server:upload18");
  assert.strictEqual(parsed.episodeId, "server-slot:upload18:2");

  // 百分号编码过的 link
  assert.strictEqual(w.fwParseLink(encodeURIComponent(link)).contentId, "/zh/video/abc-123");
  // 非本模块的链接一律不认
  assert.strictEqual(w.fwParseLink("huangguo:1:1"), null);
  assert.strictEqual(w.fwParseLink("supjav2:"), null);
  assert.strictEqual(w.fwParseLink(""), null);
}

function testUrlHelpers() {
  const w = load();
  assert.strictEqual(w.fwOrigin("https://supjav.blog/video/x?y=1"), "https://supjav.blog");
  assert.strictEqual(w.fwResolve("/video/x", "https://supjav.blog/zh/"), "https://supjav.blog/video/x");
  assert.strictEqual(w.fwResolve("video/x", "https://supjav.blog/zh/"), "https://supjav.blog/zh/video/x");
  assert.strictEqual(w.fwResolve("//cdn.x/y.jpg", "https://supjav.blog/"), "https://cdn.x/y.jpg");
  assert.strictEqual(w.fwResolve("https://a.b/c", "https://supjav.blog/"), "https://a.b/c");
  assert.strictEqual(w.fwQueryString("https://x/y", { a: 1, b: "" }), "https://x/y?a=1");
  assert.strictEqual(w.fwQueryString("https://x/y?z=1", { a: "中 文" }), "https://x/y?z=1&a=%E4%B8%AD%20%E6%96%87");
}

function testCategoryAlias() {
  const w = load();
  assert.strictEqual(w.FWV_CATEGORY_ALIAS.chinese, "category/chinese-subtitles");
  assert.strictEqual(w.FWV_CATEGORY_ALIAS.censored, "category/censored-jav");
  assert.strictEqual(w.FWV_CATEGORY_ALIAS.uncensored, "category/uncensored-jav");
  assert.strictEqual(w.FWV_CATEGORY_ALIAS.leaked, "category/reducing-mosaic");
  assert.strictEqual(w.FWV_CATEGORY_ALIAS.amateur, "category/amateur");
}

async function testEmptyKeyword() {
  const w = load();
  const result = await w.search({ keyword: "   " });
  assert.ok(Array.isArray(result));
  assert.strictEqual(result.length, 0);
}

async function testDisabledMultiSource() {
  const w = load();
  const result = await w.loadResource({ multiSource: "disabled", link: w.fwMakeLink("/video/x", "g", "e") });
  assert.ok(Array.isArray(result));
  assert.strictEqual(result.length, 0);
}

async function testBadLinkFails() {
  const w = load();
  const result = await w.loadResource({ link: "not-a-link" });
  assert.ok(Array.isArray(result));
  assert.strictEqual(result.length, 0);
}

(async () => {
  testMetadata();
  testLinkCodec();
  testUrlHelpers();
  testCategoryAlias();
  await testEmptyKeyword();
  await testDisabledMultiSource();
  await testBadLinkFails();
  console.log("supjav-webox tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
