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

async function testVerifyCommand() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.strictEqual(packageJson.scripts.verify, "npm run build:all && npm run test:all && npm test");
}

async function main() {
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
