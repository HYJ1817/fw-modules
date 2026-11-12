/**
 * 黄果短剧真站回归（需要外网，不在 npm run verify 里）
 *
 *   node tests/huangguo-live.js [站点]
 *
 * 覆盖：首页推荐 / 最近上新 / 排行榜 / 分类 / 加密搜索 / 详情分集 / 播放握手与 master.m3u8。
 * 站点改版时先跑这个，确认是「代码问题」还是「站点问题」。
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const BASE = (process.argv[2] || "https://huangguoai.com").replace(/\/+$/, "");

function load(name) {
  const source = fs.readFileSync(path.join(ROOT, "widgets", name), "utf8");
  const ctx = {
    console: { log() {} }, Date, JSON, Math, Promise, BigInt, Uint8Array, ArrayBuffer,
    Number, String, Object, Array, Error, RegExp, setTimeout,
    encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN,
    crypto: crypto.webcrypto,
    Widget: {
      http: {
        get: async (url, options) => {
          const response = await fetch(url, { headers: (options && options.headers) || {} });
          return { data: await response.text(), status: response.status };
        },
        post: async (url, body, options) => {
          const response = await fetch(url, { method: "POST", headers: (options && options.headers) || {}, body });
          return { data: await response.text(), status: response.status };
        },
      },
      sharedCache: null,
      storage: null,
    },
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: name });
  return ctx;
}

function step(name, value) {
  console.log(`  ✓ ${name}${value === undefined ? "" : " — " + value}`);
}

(async () => {
  console.log(`黄果短剧真站回归：${BASE}`);
  const home = load("huangguo.js");
  const params = { mode: "custom", site: BASE, page: "1", timeout: 20 };

  const pages = [["首页推荐", "loadHome", {}], ["最近上新", "loadLatest", {}], ["排行榜", "loadRank", {}],
    ["分类 短剧", "loadCategory", { category: "ai-duanju" }], ["搜索", "search", { keyword: "总裁" }]];
  for (const [label, fn, extra] of pages) {
    const items = await home[fn]({ ...params, ...extra });
    assert.ok(Array.isArray(items), `${label} 必须返回数组`);
    assert.ok(items.length > 0, `${label} 返回为空`);
    const bad = items.find((item) => !item.link || !item.title);
    assert.ok(!bad, `${label} 存在缺少 link/title 的条目`);
    step(label, `${items.length} 条，首条「${items[0].title}」`);
  }

  const first = await home.loadHome(params);
  const detail = await home.loadDetail(first[0].link);
  assert.ok(detail && detail.episodeItems.length > 0, "详情解析失败");
  step("详情", `${detail.title} / ${detail.episodeItems.length} 集`);

  const resource = load("huangguo-resource.js");
  const sources = await resource.loadResource({ ...params, multiSource: "enabled", link: detail.episodeItems[0].link, episode: 1 });
  assert.ok(sources.length > 0, "播放源为空");
  step("播放线路", sources.map((s) => s.name).join(" / "));

  const pick = sources[0];
  const response = await fetch(pick.url, { headers: pick.customHeaders });
  const text = await response.text();
  assert.ok(response.status === 200 && /#EXTM3U/.test(text), "master.m3u8 取不到");
  step("master.m3u8", `${response.status} / ${text.split("\n").length} 行`);
  const key = /#EXT-X-KEY:METHOD=AES-128,URI="([^"]+)"/.exec(text);
  if (key) {
    const keyResponse = await fetch(key[1], { headers: pick.customHeaders });
    const bytes = Buffer.from(await keyResponse.arrayBuffer());
    assert.ok(keyResponse.status === 200 && bytes.length === 16, "AES 密钥取不到");
    step("crypt.key", `${keyResponse.status} / ${bytes.length} 字节`);
  }

  console.log("真站回归通过");
})().catch((error) => {
  console.error("真站回归失败：" + error.message);
  process.exit(1);
});
