/**
 * girigiri 动漫（WeBox 移植版）单测
 *
 * 不需要外网：用固定 HTML 夹具验证列表、详情分集与播放解析；
 * 解析依赖 jQuery 语义，装了 jsdom+jquery 时跑完整用例，否则只跑纯逻辑部分。
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

function optional(name) {
  try { return require(name); } catch (_) { return null; }
}
const jsdom = optional("jsdom");
const jqueryPath = path.join(ROOT, "node_modules", "jquery", "dist", "jquery.js");
const hasDom = !!(jsdom && fs.existsSync(jqueryPath));
const JQ_SRC = hasDom ? fs.readFileSync(jqueryPath, "utf8") : "";

function htmlLoad(html) {
  const dom = new jsdom.JSDOM(String(html || "<html><body></body></html>"), { runScripts: "outside-only" });
  dom.window.eval(JQ_SRC);
  return dom.window.jQuery;
}

function load(responses) {
  const source = fs.readFileSync(path.join(ROOT, "widgets", "girigiri.js"), "utf8");
  const requests = [];
  const ctx = {
    console: { log() {} },
    Date, JSON, Math, Promise, String, Number, Object, Array, Error, RegExp, URL, setTimeout,
    encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN, Uint8Array, TextDecoder,
    Widget: {
      http: {
        get: async (url) => {
          requests.push(url);
          const key = Object.keys(responses).find((pattern) => url.indexOf(pattern) >= 0);
          if (!key) return { data: "", status: 404, url: url };
          const value = responses[key];
          return { data: typeof value === "function" ? value(url) : value, status: 200, url: url, headers: {} };
        },
      },
      html: { load: htmlLoad },
      sharedCache: null,
      storage: null,
    },
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: "girigiri.js" });
  ctx.__requests = requests;
  return ctx;
}

const LIST_HTML = `
<html><body>
  <div class="public-list-box">
    <a class="time-title" href="/GV100/" title="测试番剧 A"></a>
    <img data-src="https://img.example/a.jpg">
    <div class="public-list-prb">更新至 12 话</div>
  </div>
  <div class="public-list-box">
    <a class="time-title" href="/GV101/" title="测试番剧 B"></a>
    <img data-src="https://img.example/b.jpg">
  </div>
  <div class="pages"><a rel="next" href="/show/2-2--------/">下一页</a></div>
</body></html>`;

const DETAIL_HTML = `
<html><body>
  <h1 class="slide-info-title">测试番剧 A</h1>
  <div class="detail-pic"><img data-src="https://img.example/a-big.jpg"></div>
  <div id="height_limit">简介文本</div>
  <div class="anthology-tab"><div class="swiper-slide">线路甲</div></div>
  <div class="anthology-list-box">
    <div class="anthology-list-play">
      <a href="/playGV100-7-1/">第01话</a>
      <a href="/playGV100-7-2/">第02话</a>
    </div>
  </div>
</body></html>`;

const PLAY_HTML = `
<html><body>
  <script>var player_aaaa = {"id":"100","sid":"7","nid":"2","url":"https:\\/\\/cdn.example\\/hls\\/master.m3u8","encrypt":0};</script>
</body></html>`;

function testMetadata() {
  const w = load({});
  const meta = w.WidgetMetadata;
  assert.strictEqual(meta.id, "hyj1817.girigiri.home");
  assert.ok(meta.modules.some((m) => m.id === "categories"));
  assert.strictEqual(meta.modules.filter((m) => m.type === "stream").length, 1);
  assert.ok(meta.search && meta.search.functionName === "search");
  assert.strictEqual(typeof w.loadDetail, "function");
}

function testLinkCodec() {
  const w = load({});
  assert.strictEqual(w.ggMakeLink("100"), "girigiri:100");
  assert.strictEqual(w.ggMakeLink("100", "7", "2"), "girigiri:100-7-2");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(w.ggParseLink("girigiri:100-7-2"))), { id: "100", groupId: "7", episodeId: "2" });
  assert.strictEqual(w.ggParseLink("girigiri:abc"), null);
  assert.strictEqual(w.ggParseLink("huangguo:1:1"), null);
  assert.strictEqual(w.ggParseLink("girigiri:100").groupId, "");
}

function testUrlHelpers() {
  const w = load({});
  assert.strictEqual(w.ggOrigin("https://anime.girigirilove.icu/GV1/"), "https://anime.girigirilove.icu");
  assert.strictEqual(w.ggResolve("/GV1/", "https://anime.girigirilove.icu/"), "https://anime.girigirilove.icu/GV1/");
  assert.strictEqual(w.ggResolve("GV1/", "https://a.b/c/"), "https://a.b/c/GV1/");
}

async function testListing() {
  const w = load({ "/": LIST_HTML, "/show/2": LIST_HTML });
  const items = await w.loadHome({ page: "1" });
  assert.ok(Array.isArray(items));
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0].title, "测试番剧 A");
  assert.strictEqual(items[0].link, "girigiri:100");
  assert.strictEqual(items[0].posterPath, "https://img.example/a.jpg");
  assert.strictEqual(items[0].description, "更新至 12 话");
}

async function testDetailAndPlay() {
  const w = load({
    "/GV100/": DETAIL_HTML,
    "/playGV100-7-2/": PLAY_HTML,
  });
  const detail = await w.loadDetail("girigiri:100");
  assert.ok(detail, "详情应为对象");
  assert.strictEqual(detail.title, "测试番剧 A");
  assert.strictEqual(detail.episodeItems.length, 2);
  assert.strictEqual(detail.episodeItems[1].link, "girigiri:100-7-2");
  assert.strictEqual(detail.episodeItems[1].episode, 2);

  const sources = await w.loadResource({ link: "girigiri:100-7-2" });
  assert.strictEqual(sources.length, 1);
  assert.strictEqual(sources[0].url, "https://cdn.example/hls/master.m3u8");
  assert.strictEqual(sources[0].playerType, "app");
  assert.ok(/^Mozilla/.test(sources[0].customHeaders["User-Agent"]));
}

async function testDisabledAndBadLink() {
  const w = load({});
  let out = await w.loadResource({ multiSource: "disabled", link: "girigiri:100-7-2" });
  assert.strictEqual(out.length, 0);
  out = await w.loadResource({ link: "nope" });
  assert.strictEqual(out.length, 0);
  assert.strictEqual(await w.loadDetail("nope"), null);
}

(async () => {
  testMetadata();
  testLinkCodec();
  testUrlHelpers();
  if (hasDom) {
    await testListing();
    await testDetailAndPlay();
  } else {
    console.log("（跳过解析用例：未安装 jsdom + jquery）");
  }
  await testDisabledAndBadLink();
  console.log("girigiri tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
