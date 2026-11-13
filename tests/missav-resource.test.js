/**
 * MissAV 播放源（1.2.0）单测
 * 不依赖外网：用固定 HTML + 假 http 验证候选过滤、并发测速排序、单变体展开与缓存。
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

function load(responses) {
  const source = fs.readFileSync(path.join(ROOT, "widgets", "missav-resource.js"), "utf8");
  const requests = [];
  const ctx = {
    console: { log() {} },
    Date, JSON, Math, Promise, String, Number, Object, Array, Error, RegExp, setTimeout,
    encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN,
    Widget: {
      http: {
        get: async (url, options) => {
          requests.push(url);
          const hit = Object.keys(responses || {}).find((k) => url.indexOf(k) >= 0);
          if (!hit) return { data: "", status: 404 };
          const value = responses[hit];
          const body = typeof value === "function" ? value(url) : value;
          return { data: body, status: /#EXTM3U|\.ts/.test(String(body)) || body.length > 100 ? 200 : 200 };
        },
      },
      sharedCache: null,
      storage: null,
    },
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: "missav-resource.js" });
  ctx.__requests = requests;
  return ctx;
}

const PAGE = `<html><body>
  <video><source src="https://surrit.com/abc/playlist.m3u8"></video>
  <script>var x = "https://fourhoi.com/xyz/1500k/video.m3u8";</script>
  <script>var ad = "https://ads.popads.net/track.m3u8";</script>
  <script>var dead = "https://cdn.example.com/gone.mp4";</script>
  <a href="https://missav.fans/dm1/cn/other">x</a>
<!-- filler: 真实页面都是几十 KB，这里补长度以通过模块的完整性校验 -->
<!-- xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx -->
</body></html>`;

const MASTER = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=900000,RESOLUTION=1280x720,NAME=\"720p\"\nhttps://surrit.com/abc/720.m3u8\n";
const VARIANT = "#EXTM3U\n#EXTINF:5,\nseg1.ts\n";

function testMetadata() {
  const w = load({});
  assert.strictEqual(w.WidgetMetadata.id, "hyj1817.missav.resource");
  assert.ok(/^1\.2\./.test(w.WidgetMetadata.version), "版本应为 1.2.x");
  assert.strictEqual(w.WidgetMetadata.modules[0].id, "loadResource");
  assert.strictEqual(w.WidgetMetadata.modules[0].type, "stream");
  assert.ok(w.WidgetMetadata.globalParams.some((p) => p.name === "multiSource"));
}

function testRank() {
  const w = load({});
  const list = w.rankCandidates([
    "https://ads.popads.net/track.m3u8",
    "https://cdn.example.com/gone.mp4",
    "https://surrit.com/a/playlist.m3u8",
    "https://surrit.com/a/playlist.m3u8",
    "https://fourhoi.com/b/video.m3u8",
  ]);
  assert.strictEqual(list.length, 3, "广告域应被剔除、重复应合并");
  assert.strictEqual(list[0].url, "https://surrit.com/a/playlist.m3u8", "媒体 + HLS 应排最前");
  assert.ok(list.every((item) => !/popads/.test(item.url)));
}

async function testProbingAndOrder() {
  const w = load({
    "/dm1/cn/film-001": PAGE,
    "surrit.com/abc/playlist.m3u8": "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=900000,NAME=\"720p\"\nhttps://surrit.com/abc/720.m3u8\n",
    "surrit.com/abc/720.m3u8": VARIANT,
    "fourhoi.com/xyz/1500k/video.m3u8": VARIANT,
    "cdn.example.com/gone.mp4": "",
    "popads.net": "#EXTM3U",
  });
  const out = await w.loadResource({ link: "https://missav.fans/dm1/cn/film-001" });
  assert.ok(out.length >= 2, "应至少返回两条可用线路");
  assert.ok(out.every((item) => !/popads/.test(item.url)), "广告线路不应返回");
  assert.ok(out.every((item) => item.playerType === "app"));
  assert.ok(out.every((item) => /ms/.test(item.name)), "开启测速时线路名应带耗时");
  // master 只有一路变体时直接下发变体
  assert.ok(/surrit\.com\/abc\/720\.m3u8/.test(out.map((s) => s.url).join(" ")));

  // 缓存：第二次调用不应再打页面请求
  const before = w.__requests.length;
  const again = await w.loadResource({ link: "https://missav.fans/dm1/cn/film-001" });
  assert.strictEqual(w.__requests.length, before, "命中缓存后不应再发请求");
  assert.strictEqual(again.length, out.length);
}

async function testProbingOff() {
  const w = load({ "/dm1/cn/film-001": PAGE });
  const out = await w.loadResource({ link: "https://missav.fans/dm1/cn/film-001", probing: "off" });
  assert.ok(out.length >= 2);
  assert.ok(out.every((item) => !/ms/.test(item.name)), "关闭测速时不应带耗时标签");
  assert.ok(w.__requests.every((url) => !/popads/.test(url)), "关闭测速也不该探测广告域");
}

async function testDisabledAndEmpty() {
  const w = load({});
  assert.strictEqual((await w.loadResource({ multiSource: "disabled", link: "https://missav.fans/x" })).length, 0);
  assert.strictEqual((await w.loadResource({ link: "" })).length, 0);
  assert.strictEqual((await w.loadResource({ link: "https://missav.fans/dm1/cn/film-001" })).length, 0);
}

(async () => {
  testMetadata();
  testRank();
  await testProbingAndOrder();
  await testProbingOff();
  await testDisabledAndEmpty();
  console.log("missav-resource tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
