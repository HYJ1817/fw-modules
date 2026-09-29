const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const builder = require(path.join(ROOT, "scripts", "build-fw-all.js"));

/**
 * 从各首页组件源码推导期望的首页模块数。
 * 早期这里硬编码了 19（恰好等于 missav.js 一个文件的模块数），
 * 组件增加模块后测试就会失败，且失败信息指向 bundle 而非测试本身。
 */
function expectedHomeModuleCount() {
  return builder.SOURCES.filter((entry) => entry.kind === "home").reduce(
    (total, entry) => total + builder.readSource(entry).metadata.modules.length,
    0
  );
}

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
  // 期望值从源码推导，避免组件增减模块后测试变成假失败
  assert.strictEqual(
    metadata.modules.filter((item) => item.type !== "stream").length,
    expectedHomeModuleCount()
  );
  // 模块 id 必须唯一 —— Forward 以 id 区分模块，重复会导致模块不可用
  const ids = Array.from(metadata.modules, (item) => item.id);
  const duplicated = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepStrictEqual(
    duplicated,
    [],
    `模块 id 重复：${JSON.stringify(Array.from(new Set(duplicated)))}`
  );
  assert.strictEqual(new Set(ids).size, metadata.modules.length);
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

  // 域名路由：已知站点的 https 链接只允许命中对应源，落到 6 源并发会明显变慢且抢带宽
  const calls = { missav: 0, hentaimama: 0, hstream: 0, yin: 0, hanime: 0, f4k: 0 };
  const originals = {
    missav: bundle.FW_MISSAV_RESOURCE.loadResource,
    hentaimama: bundle.FW_HENTAI_MAMA_RESOURCE.loadResource,
    hstream: bundle.FW_HSTREAM_RESOURCE.loadResource,
    yin: bundle.FW_YIN_RESOURCE.loadResource,
    hanime: bundle.FW_HANIME_RESOURCE.loadResource,
    f4k: bundle.FW_4KVM_RESOURCE.loadResource,
  };
  bundle.FW_MISSAV_RESOURCE.loadResource = async () => { calls.missav++; return []; };
  bundle.FW_HENTAI_MAMA_RESOURCE.loadResource = async () => { calls.hentaimama++; return []; };
  bundle.FW_HSTREAM_RESOURCE.loadResource = async () => { calls.hstream++; return []; };
  bundle.FW_YIN_RESOURCE.loadResource = async () => { calls.yin++; return []; };
  bundle.FW_HANIME_RESOURCE.loadResource = async () => { calls.hanime++; return []; };
  bundle.FW_4KVM_RESOURCE.loadResource = async () => { calls.f4k++; return []; };

  const missavCalls = async (link) => {
    for (const key of Object.keys(calls)) calls[key] = 0;
    await bundle.loadResource({ link });
    return { ...calls };
  };

  assert.deepStrictEqual(
    await missavCalls("https://missav.fans/dm44/cn/ssis-001"),
    { missav: 1, hentaimama: 0, hstream: 0, yin: 0, hanime: 0, f4k: 0 },
    "missav.fans 链接必须只走 missav 源"
  );
  assert.deepStrictEqual(
    await missavCalls("https://missav.live/dm44/cn/ssis-001"),
    { missav: 1, hentaimama: 0, hstream: 0, yin: 0, hanime: 0, f4k: 0 },
    "missav.live 链接必须只走 missav 源"
  );
  assert.deepStrictEqual(
    await missavCalls("https://hentaimama.io/tvshows/demo"),
    { missav: 0, hentaimama: 1, hstream: 0, yin: 0, hanime: 0, f4k: 0 },
    "hentaimama.io 链接必须只走 hentaimama 源"
  );
  assert.deepStrictEqual(
    await missavCalls("https://www.4kvm.net/play/demo"),
    { missav: 0, hentaimama: 0, hstream: 0, yin: 0, hanime: 0, f4k: 1 },
    "4kvm.net 链接必须只走 4kvm 源"
  );
  assert.deepStrictEqual(
    await missavCalls("https://unknown.example/play/demo"),
    { missav: 1, hentaimama: 1, hstream: 1, yin: 1, hanime: 1, f4k: 1 },
    "未知域名仍然 6 源并发兜底"
  );

  Object.assign(bundle.FW_MISSAV_RESOURCE, { loadResource: originals.missav });
  Object.assign(bundle.FW_HENTAI_MAMA_RESOURCE, { loadResource: originals.hentaimama });
  Object.assign(bundle.FW_HSTREAM_RESOURCE, { loadResource: originals.hstream });
  Object.assign(bundle.FW_YIN_RESOURCE, { loadResource: originals.yin });
  Object.assign(bundle.FW_HANIME_RESOURCE, { loadResource: originals.hanime });
  Object.assign(bundle.FW_4KVM_RESOURCE, { loadResource: originals.f4k });
}

async function testDeterministicBuild() {
  const filename = path.join(ROOT, "widgets", "fw-all.js");
  // 归一化行尾后再比对：构建脚本固定写 LF，而 Windows 检出可能是 CRLF。
  // 本测试要验证的是「构建结果确定」，不是「输出使用哪种行尾」，
  // 因此不应因检出行尾不同而失败（仓库已用 .gitattributes 统一为 LF）。
  const normalize = (text) => text.replace(/\r\n/g, "\n");
  const before = normalize(fs.readFileSync(filename, "utf8"));

  // 首选真实子进程路径（同时验证 build-fw-all.js 可作为 CLI 执行）。
  // 受限环境（容器 / 沙箱）可能禁止创建任何子进程，此时退回进程内构建，
  // 仍然验证「构建结果确定」这一核心性质，只是不再覆盖 CLI 入口。
  let viaChildProcess = true;
  try {
    childProcess.execFileSync(process.execPath, [path.join(ROOT, "scripts", "build-fw-all.js")]);
  } catch (error) {
    if (!["EBUSY", "EPERM", "EACCES", "ENOENT"].includes(error.code)) throw error;
    viaChildProcess = false;
    builder.build();
  }

  const after = normalize(fs.readFileSync(filename, "utf8"));
  assert.strictEqual(after, before, "重复构建必须产生完全相同的输出");
  if (!viaChildProcess) {
    process.stdout.write("  note: 当前环境禁止创建子进程，已退回进程内构建验证（未覆盖 CLI 入口）\n");
  }
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
  const verify = packageJson.scripts.verify || "";
  // 断言结构性要求，而不是整串字符串 —— 调整脚本顺序不应导致测试失败
  assert.ok(/build:all/.test(verify), "verify 必须包含 build:all");
  assert.ok(/test:all/.test(verify), "verify 必须包含 test:all");
  assert.ok(/npm test(\s|$)/.test(verify), "verify 必须包含 npm test");
  assert.ok(/verify:fast/.test(verify), "verify 应包含 verify:fast（构建 + 单测 + 清单校验）");
  assert.ok(/verify:fast/.test(verify) && verify.indexOf("verify:fast") < verify.indexOf("build:all"), "verify:fast 应排在 build:all 之前，便于快速失败");
}

async function testPlaybackWithoutTimers() {
  const bundle = loadBundle();
  delete bundle.setTimeout;
  delete bundle.clearTimeout;
  const logs = [];
  bundle.console.log = message => logs.push(message);
  const stream = { url: 'https://example.invalid/sample.mp4' };
  const provider = async () => [stream];
  const result = await bundle.collectPlayback([provider], {}, true);
  assert.strictEqual(result[0].url, stream.url);
  const aggregate = await bundle.collectPlayback([
    provider,
    async () => { throw new Error('unavailable'); },
    provider,
  ], {}, false);
  assert.strictEqual(aggregate.length, 1, 'timerless aggregation still deduplicates and isolates failures');
  assert.ok(logs.some(message => /timers unavailable/.test(message)), 'report degraded deadline support');
}

async function main() {
  await testPlaybackWithoutTimers();
  process.stdout.write("PASS testPlaybackWithoutTimers\n");
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
