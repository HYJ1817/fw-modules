const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

function loadBundle() {
  const filename = path.join(ROOT, "widgets", "fw-all.js");
  const context = {
    console: { log() {}, error() {} },
    URL,
    Date,
    JSON,
    Promise,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    clearTimeout,
    Widget: {
      http: { get: async () => ({ data: "" }), post: async () => ({ data: {} }) },
      storage: null,
      sharedCache: null,
      tmdb: { get: async () => ({ results: [] }) },
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  return context;
}

async function testMetadata() {
  const bundle = loadBundle();
  const metadata = bundle.WidgetMetadata;
  assert.strictEqual(metadata.id, "hyj1817.fw.all");
  assert.strictEqual(metadata.modules.filter((item) => item.type === "stream").length, 1);
  assert.strictEqual(metadata.modules.find((item) => item.type === "stream").id, "loadResource");
  assert.strictEqual(metadata.modules.filter((item) => item.type !== "stream").length, 13);
  assert.strictEqual(new Set(metadata.modules.map((item) => item.id)).size, metadata.modules.length);
  assert.strictEqual(metadata.search.functionName, "searchAll");
  assert.deepStrictEqual(
    Array.from(metadata.globalParams, (item) => item.name),
    ["multiSource", "resolverUrl", "sessionToken"]
  );
  assert.ok(bundle.FW_HSTREAM_HOME);
  assert.ok(bundle.FW_YIN_HOME);
  assert.ok(bundle.FW_HANIME_HOME);
  assert.ok(bundle.FW_HSTREAM_RESOURCE);
  assert.ok(bundle.FW_YIN_RESOURCE);
  assert.ok(bundle.FW_HANIME_RESOURCE);
  assert.ok(bundle.FW_4KVM_RESOURCE);
  assert.strictEqual(typeof bundle.hstream_loadLatest, "function");
  assert.strictEqual(typeof bundle.yin_loadCategory, "function");
  assert.strictEqual(typeof bundle.hanime_loadRandom, "function");
}

async function testSearchAll() {
  const bundle = loadBundle();
  bundle.FW_HSTREAM_HOME.search = async () => [{ id: "a", link: "hstream:a", title: "A" }];
  bundle.FW_YIN_HOME.search = async () => { throw new Error("yin unavailable"); };
  bundle.FW_HANIME_HOME.search = async () => [
    { id: "a", link: "hstream:a", title: "A" },
    { id: "b", link: "hanime:b", title: "B" },
  ];
  const items = await bundle.searchAll({ keyword: "demo" });
  assert.deepStrictEqual(Array.from(items, (item) => item.title), ["A", "B"]);
}

async function testDetailDispatch() {
  const bundle = loadBundle();
  bundle.FW_HSTREAM_HOME.loadDetail = async (link) => ({ source: "hstream", link });
  bundle.FW_YIN_HOME.loadDetail = async (link) => ({ source: "yin", link });
  bundle.FW_HANIME_HOME.loadDetail = async (link) => ({ source: "hanime", link });
  assert.strictEqual((await bundle.loadDetail("hstream:a")).source, "hstream");
  assert.strictEqual((await bundle.loadDetail("yinhentai:b")).source, "yin");
  assert.strictEqual((await bundle.loadDetail("hanime:c")).source, "hanime");
  assert.strictEqual(await bundle.loadDetail("unknown:d"), null);
}

async function testResourceDispatch() {
  const bundle = loadBundle();
  bundle.FW_HSTREAM_RESOURCE.loadResource = async () => [{ name: "H", url: "https://cdn/h.m3u8" }];
  bundle.FW_YIN_RESOURCE.loadResource = async () => [{ name: "Y", url: "https://cdn/shared.m3u8" }];
  bundle.FW_HANIME_RESOURCE.loadResource = async () => { throw new Error("login required"); };
  bundle.FW_4KVM_RESOURCE.loadResource = async () => [
    { name: "4K duplicate", url: "https://cdn/shared.m3u8" },
    { name: "4K", url: "https://cdn/4k.m3u8" },
  ];

  const direct = await bundle.loadResource({ link: "hstream:test" });
  assert.deepStrictEqual(Array.from(direct, (item) => item.name), ["H"]);

  const aggregate = await bundle.loadResource({ seriesName: "Demo", type: "movie" });
  assert.deepStrictEqual(
    Array.from(aggregate, (item) => item.url),
    ["https://cdn/h.m3u8", "https://cdn/shared.m3u8", "https://cdn/4k.m3u8"]
  );
}

async function testDeterministicBuild() {
  const filename = path.join(ROOT, "widgets", "fw-all.js");
  const before = fs.readFileSync(filename, "utf8");
  childProcess.execFileSync(process.execPath, [path.join(ROOT, "scripts", "build-fw-all.js")]);
  const after = fs.readFileSync(filename, "utf8");
  assert.strictEqual(after, before);
}

async function testPlaybackLatency() {
  const bundle = loadBundle();
  // Scale runtime deadlines, keeping the outer test watchdog independent.
  bundle.setTimeout = (fn, ms) => setTimeout(fn, ms / 100);
  let calls = 0;
  let release;
  const delayed = new Promise(resolve => { release = resolve; });
  bundle.FW_HSTREAM_RESOURCE.loadResource = async () => { calls++; return delayed; };
  let unrelated = 0;
  bundle.FW_YIN_RESOURCE.loadResource = async () => { unrelated++; return []; };
  bundle.FW_HANIME_RESOURCE.loadResource = async () => { unrelated++; return []; };
  bundle.FW_4KVM_RESOURCE.loadResource = async () => { unrelated++; return []; };
  const one = bundle.loadResource({ id: 'hstream%3Atest-1' });
  const two = bundle.loadResource({ id: 'hstream%3Atest-1' });
  await new Promise(resolve => setImmediate(resolve));
  release([{ url: 'https://cdn/test.mp4' }]);
  await Promise.all([one, two]);
  assert.strictEqual(unrelated, 0, 'id must select only its own provider');
  assert.strictEqual(calls, 1, 'concurrent identical playback requests must share work');

  bundle.FW_HSTREAM_RESOURCE.loadResource = async () => [{ url: 'https://cdn/fast.mp4' }];
  bundle.FW_4KVM_RESOURCE.loadResource = () => new Promise(() => {});
  let watchdog;
  const result = await Promise.race([
    bundle.loadResource({ title: 'test' }),
    new Promise(resolve => { watchdog = setTimeout(() => resolve('hung'), 100); }),
  ]);
  clearTimeout(watchdog);
  assert.notStrictEqual(result, 'hung', 'a hung provider must not withhold working streams');
  assert.strictEqual(result[0].url, 'https://cdn/fast.mp4');
}

async function testPlaybackRecovery() {
  const bundle = loadBundle();
  bundle.setTimeout = (fn, ms) => setTimeout(fn, ms / 1000);
  let late;
  bundle.FW_HSTREAM_RESOURCE.loadResource = () => new Promise(resolve => { late = resolve; });
  const result = await bundle.loadResource({ link: 'hstream:test-1' });
  assert.strictEqual(result.length, 0, 'direct source deadline must settle');
  late([{ url: 'https://cdn/late.mp4' }]);
  await new Promise(resolve => setImmediate(resolve));
  assert.strictEqual(result.length, 0, 'late completion must not mutate returned results');
  bundle.FW_HSTREAM_RESOURCE.loadResource = async () => [{ url: 'https://cdn/recovered.mp4' }];
  const retry = await bundle.loadResource({ link: 'hstream:test-1' });
  assert.strictEqual(retry[0].url, 'https://cdn/recovered.mp4', 'empty results must not be cached');
  const cases = [
    ['FW_HSTREAM_RESOURCE', { url: 'https://hstream.moe/hentai/test-1' }, 'hstream:test-1'],
    ['FW_YIN_RESOURCE', { id: 'yinhentai%3Atest-1' }, 'yinhentai:test-1'],
    ['FW_HANIME_RESOURCE', { url: 'https://hanime.tv/videos/hentai/test-1' }, 'hanime:test-1'],
    ['FW_4KVM_RESOURCE', { url: 'https://www.4kvm.net/play/test-1' }, '4kvm:test-1'],
  ];
  for (const [name, input, expected] of cases) {
    const invoked = [];
    for (const [provider] of cases) {
      bundle[provider].loadResource = async params => {
        invoked.push([provider, params.link]);
        return [{ url: 'https://cdn/test.mp4' }];
      };
    }
    await bundle.loadResource(input);
    assert.deepStrictEqual(invoked, [[name, expected]]);
    invoked.length = 0;
    await bundle.loadResource({ ...input, multiSource: 'disabled' });
    assert.strictEqual(invoked.length, 0);
  }
}

async function testVerifyCommand() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.strictEqual(packageJson.scripts.verify, "npm run build:all && npm run test:all && npm test");
}

async function main() {
  await testPlaybackLatency();
  process.stdout.write("PASS testPlaybackLatency\n");
  await testPlaybackRecovery();
  process.stdout.write("PASS testPlaybackRecovery\n");
  await testMetadata();
  process.stdout.write("PASS testMetadata\n");
  await testSearchAll();
  process.stdout.write("PASS testSearchAll\n");
  await testDetailDispatch();
  process.stdout.write("PASS testDetailDispatch\n");
  await testResourceDispatch();
  process.stdout.write("PASS testResourceDispatch\n");
  await testDeterministicBuild();
  process.stdout.write("PASS testDeterministicBuild\n");
  await testVerifyCommand();
  process.stdout.write("PASS testVerifyCommand\n");
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
