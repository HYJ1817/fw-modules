const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

function load(name) {
  const filename = path.join(ROOT, "widgets", name);
  const source = fs.readFileSync(filename, "utf8");
  const context = {
    console: { log() {} },
    URL,
    Date,
    JSON,
    Promise,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    Widget: {
      http: { get: async () => ({ data: "" }), post: async () => ({ data: {} }) },
      sharedCache: null,
      storage: null,
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename });
  return context;
}

async function testMetadata() {
  const homes = [load("hanime.js"), load("yinhentai.js")];
  const resources = [load("hanime-resource.js"), load("yinhentai-resource.js"), load("4kvm-resource.js")];
  const ids = homes.concat(resources).map((x) => x.WidgetMetadata.id);
  assert.strictEqual(new Set(ids).size, ids.length, "widget ids must be unique");
  homes.forEach((x) => {
    assert.ok(x.WidgetMetadata.search, "homepage must expose search");
    assert.ok(x.WidgetMetadata.modules.some((m) => m.id === "categories"));
    assert.strictEqual(typeof x.loadDetail, "function");
  });
  resources.forEach((x) => {
    assert.ok(!x.WidgetMetadata.search, "resource must not be a homepage search provider");
    assert.deepStrictEqual(
      Array.from(x.WidgetMetadata.modules, (m) => m.type),
      ["stream"]
    );
    assert.strictEqual(typeof x.loadResource, "function");
  });
}

async function test4kvmParsing() {
  const r = load("4kvm-resource.js");
  assert.strictEqual(r.WidgetMetadata.modules.length, 1);
  assert.strictEqual(r.WidgetMetadata.modules[0].type, "stream");
  assert.ok(!r.WidgetMetadata.search);
  assert.strictEqual(r.WidgetMetadata.version, "1.0.1");

  const searchHtml = `
    <div class="group relative"><a href="/play/movie-wrong"><img alt="复仇者联盟3：无限战争"><div>2018</div></a></div>
    <div class="group relative"><a href="/play/movie-right"><img alt="复仇者联盟4：终局之战"><div>2019</div><h3>复仇者联盟4：终局之战</h3></a></div>`;
  const cards = r.parseSearchCards(searchHtml);
  assert.strictEqual(cards.length, 2);
  assert.strictEqual(r.pickBestCard(cards, "复仇者联盟4：终局之战", 0).slug, "movie-right");

  const seriesHtml = `
    <meta id="nb-st" content="1000"><meta id="nb-plt" content="2000">
    <nav x-data="{userlink:'signed-play-key'}"></nav>
    <link id="wasm-cfg" data-bg="/static/wasm/current.wasm">
    <a data-line="1" data-episode="1" dataid="2800" href="/play/episode-1">1</a>
    <a data-line="1" data-episode="2" dataid="2801" href="/play/episode-2">2</a>`;
  const target = r.parseEpisodeTarget(seriesHtml, 2);
  assert.strictEqual(target.dataId, "2801");
  assert.strictEqual(target.secretKey, "episode-2");
  assert.strictEqual(target.wasmPath, "/static/wasm/current.wasm");
  assert.strictEqual(target.playKey, "signed-play-key");
  assert.strictEqual(target.meta["nb-st"], "1000");
  assert.strictEqual(target.meta["nb-plt"], "2000");
}

async function test4kvmPlayback() {
  const r = load("4kvm-resource.js");
  assert.strictEqual(typeof r.TextEncoder, "undefined", "test VM must match Forward's bare JS runtime");
  const encodedTitle = r.utf8Encode("复仇 A");
  assert.deepStrictEqual(Array.from(encodedTitle), [229, 164, 141, 228, 187, 135, 32, 65]);
  assert.strictEqual(r.utf8Decode(encodedTitle), "复仇 A");
  const streams = r.resourcesFromPlayPayload({
    code: 200,
    data: {
      quality_urls: [
        { title: "4K", description: "蓝光", locked: true, url: "1" },
        { title: "1080p", description: "超清", locked: false, url: "https://cdn.example/video.m3u8" },
      ],
    },
  }, "movie-right");
  assert.strictEqual(streams.length, 1);
  assert.strictEqual(streams[0].name, "4KVM · 1080p");
  assert.strictEqual(streams[0].url, "https://cdn.example/video.m3u8");
  assert.strictEqual(streams[0].playerType, "app");
  assert.strictEqual(streams[0].customHeaders.Referer, "https://www.4kvm.net/play/movie-right");

  const requested = [];
  r.Widget.http.get = async (url) => {
    requested.push(url);
    if (url.includes("/search?q=")) return { data: '<div class="group"><a href="/play/show-s1"><img alt="绝命毒师: 第1季"><h3>绝命毒师: 第1季</h3></a></div>' };
    if (url.endsWith("/play/show-s1")) return { data: '<link id="wasm-cfg" data-bg="/static/wasm/current.wasm"><a data-episode="2" dataid="22" href="/play/show-s1-e2">2</a>' };
    if (url.includes("/video/play?")) return { data: { code: 200, data: { quality_urls: [{ title: "1080p", url: "https://cdn.example/e2.m3u8", locked: false }] } } };
    throw new Error("unexpected URL " + url);
  };
  r.buildSignedPlayUrl = async (target) => {
    assert.strictEqual(target.dataId, "22");
    assert.strictEqual(target.secretKey, "show-s1-e2");
    return "https://www.4kvm.net/video/play?signed=1";
  };
  const resolved = await r.loadResource({ seriesName: "绝命毒师", season: 1, episode: 2, type: "tv" });
  assert.strictEqual(resolved[0].url, "https://cdn.example/e2.m3u8");
  assert.ok(requested[0].includes(encodeURIComponent("绝命毒师 第1季")));
}

async function testHanimeParsing() {
  const h = load("hanime.js");
  assert.ok(h.HANIME_CATEGORIES.length >= 60, "Hanime must include all homepage categories");
  assert.ok(h.HANIME_CATEGORIES.every((x) => /[\u3400-\u9fff]|BDSM|3D|HD|POV|NTR|X光|Yaoi|Yuri/.test(x.title)));
  assert.strictEqual(h.HANIME_CATEGORIES.find((x) => x.title === "巨乳").value, "big boobs");
  assert.strictEqual(h.HANIME_CATEGORIES.find((x) => x.title === "女学生").value, "school girl");

  const html = '<a href="/videos/hentai/test-title-2"><img src="https://cdn/p.jpg"><h3>Test Title 2</h3></a>';
  const items = h.parseVideoCards(html);
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].link, "hanime:test-title-2");

  const detail = h.detailFromApi({
    hentai_video: { slug: "test-title-2", name: "Test Title 2", poster_url: "p", cover_url: "c", description: "<p>Desc</p>" },
    hentai_franchise_hentai_videos: [
      { slug: "test-title-1", name: "Test Title 1", cover_url: "e1" },
      { slug: "test-title-2", name: "Test Title 2", cover_url: "e2" },
    ],
  });
  assert.strictEqual(detail.episodeItems.length, 2);
  assert.strictEqual(detail.episodeItems[1].episode, 2);
}

async function testHanimeRoutes() {
  const h = load("hanime.js");
  const requested = [];
  h.Widget.http.post = async () => ({ data: { hits: [] } });
  h.Widget.http.get = async (url) => {
    requested.push(url);
    return { data: '<a href="/videos/hentai/test-title-1"><h3>Test</h3></a>' };
  };
  await h.loadCategory({ category: "big boobs", page: 2 });
  await h.loadTrending();
  await h.loadRandom();
  assert.ok(requested.includes("https://hanime.tv/browse/tags/big%20boobs?page=2"));
  assert.ok(requested.includes("https://hanime.tv/browse/trending"));
  assert.ok(requested.includes("https://hanime.tv/browse/random"));
}

async function testHanimeStreams() {
  const r = load("hanime-resource.js");
  const streams = r.resourcesFromPayload(
    { videos_manifest: { servers: [{ name: "A", streams: [{ height: 720, url: "https://cdn/test.m3u8" }] }] } },
    "test-title-1"
  );
  assert.strictEqual(streams.length, 1);
  assert.strictEqual(streams[0].url, "https://cdn/test.m3u8");
  assert.strictEqual(streams[0].playerType, "app");

  const requested = [];
  r.Widget.http.get = async (url) => {
    requested.push(url);
    if (url.includes("/stream/movie/")) {
      return { data: { streams: [{ name: "1080p", url: "https://cdn/modern.m3u8" }] } };
    }
    return { data: {} };
  };
  const resolved = await r.loadResource({
    link: "hanime:test-title-1",
    resolverUrl: "https://resolver.example/manifest.json",
  });
  assert.strictEqual(requested[0], "https://resolver.example/stream/movie/hanime%3Atest-title-1.json");
  assert.strictEqual(resolved[0].url, "https://cdn/modern.m3u8");
}

async function testYinParsing() {
  const y = load("yinhentai.js");
  assert.strictEqual(y.YIN_CATEGORIES.length, 254);
  const html = '<article><a href="/434"><img data-src="/cover.jpg"><h2>Demo Episode 1</h2></a></article>';
  const items = y.parseCards(html);
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].link, "yinhentai:434");
  assert.strictEqual(items[0].posterPath, "https://yinhentai.com/cover.jpg");
  assert.strictEqual(y.inferEpisode("作品 ＃2 [中文字幕]", 1), 2);
  assert.strictEqual(y.inferSeries("作品 ＃2 [中文字幕]", "434"), "作品");
}

async function testYinStreams() {
  const r = load("yinhentai-resource.js");
  const html = '<video><source src="https://media.example/video.m3u8" type="application/x-mpegURL"></video>';
  const streams = r.extractResources(html, "demo-episode-1");
  assert.strictEqual(streams.length, 1);
  assert.strictEqual(streams[0].url, "https://media.example/video.m3u8");
  assert.strictEqual(streams[0].customHeaders.Referer, "https://yinhentai.com/demo-episode-1");
  const encoded = Buffer.from("https://cdn.example/434_1080p.mp4").toString("base64");
  const iframeStreams = r.resourcesFromIframeData(`<iframe src="https://player.example/embed.html?data=${encoded}&type=video.mp4"></iframe>`, "434");
  assert.strictEqual(iframeStreams[0].url, "https://cdn.example/434_1080p.mp4");
}

async function main() {
  const tests = [testMetadata, test4kvmParsing, test4kvmPlayback, testHanimeParsing, testHanimeRoutes, testHanimeStreams, testYinParsing, testYinStreams];
  for (const test of tests) {
    await test();
    process.stdout.write(`PASS ${test.name}\n`);
  }
  process.stdout.write(`PASS ${tests.length} tests\n`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
