"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const WIDGETS = path.join(ROOT, "widgets");
const OUTPUT = path.join(WIDGETS, "fw-all.js");

/**
 * 体积上限（字节）。Forward 对单个模块文件有体积上限，超限会被截断，
 * 客户端报「模块无效或解析失败」。实测把苹果CMS 聚合源内联进来后本包涨到 254 KB，
 * 刷新即失败；回到 230 KB 后正常。
 *
 * 这个阈值是保守值，不是精确边界。超过时只警告不中断构建 —— 真实上限未知，
 * 若你实测更高，请调大 MAX_BYTES；若需要装更多源，请改用独立模块而不是继续撑大本包。
 */
const MAX_BYTES = 240 * 1024;

const SOURCES = [
  { key: "hentaimama", namespace: "FW_HENTAI_MAMA_HOME", file: "hentaimama.js", kind: "home", detail: "loadDetail" },
  { key: "hentaimama", namespace: "FW_HENTAI_MAMA_RESOURCE", file: "hentaimama-resource.js", kind: "resource" },
  { key: "missav", namespace: "FW_MISSAV_HOME", file: "missav.js", kind: "home", detail: "loadDetail" },
  { key: "missav", namespace: "FW_MISSAV_RESOURCE", file: "missav-resource.js", kind: "resource" },
  { key: "hstream", namespace: "FW_HSTREAM_HOME", file: "hstream.js", kind: "home", detail: "loadDetail" },
  { key: "yin", namespace: "FW_YIN_HOME", file: "yinhentai.js", kind: "home", detail: "loadDetail" },
  { key: "hanime", namespace: "FW_HANIME_HOME", file: "hanime.js", kind: "home", detail: "loadDetail" },
  { key: "hstream", namespace: "FW_HSTREAM_RESOURCE", file: "hstream-resource.js", kind: "resource" },
  { key: "yin", namespace: "FW_YIN_RESOURCE", file: "yinhentai-resource.js", kind: "resource" },
  { key: "hanime", namespace: "FW_HANIME_RESOURCE", file: "hanime-resource.js", kind: "resource" },
  { key: "fourkvm", namespace: "FW_4KVM_RESOURCE", file: "4kvm-resource.js", kind: "resource" },
];

function vmContext() {
  return {
    console: { log() {}, error() {} },
    URL,
    Date,
    JSON,
    Promise,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    Widget: { http: {}, storage: null, sharedCache: null, tmdb: {} },
  };
}

function readSource(entry) {
  const filename = path.join(WIDGETS, entry.file);
  // 归一化行尾：源文件在 Windows 检出时可能是 CRLF，若原样嵌入，
  // 构建产物就会随检出行尾变化，导致 testDeterministicBuild 之类的
  // 字节级比对在不同机器/不同检出状态下表现不一致。
  const source = fs.readFileSync(filename, "utf8").replace(/\r\n/g, "\n");
  const context = vmContext();
  vm.createContext(context);
  vm.runInContext(source, context, { filename });
  if (!context.WidgetMetadata || !Array.isArray(context.WidgetMetadata.modules)) {
    throw new Error(`Invalid WidgetMetadata in ${entry.file}`);
  }
  return { ...entry, source, metadata: context.WidgetMetadata };
}

function exportNames(entry) {
  const names = entry.metadata.modules.map((module) => module.functionName);
  if (entry.kind === "home") {
    names.push(entry.metadata.search.functionName, entry.detail);
  }
  return [...new Set(names)];
}

function namespaceBlock(entry) {
  const exposed = exportNames(entry)
    .map((name) => `${JSON.stringify(name)}: typeof ${name} === "function" ? ${name} : null`)
    .join(",\n");
  return `var ${entry.namespace} = (function () {\nvar WidgetMetadata;\n${entry.source}\nreturn {\nmetadata: WidgetMetadata,\n${exposed}\n};\n})();`;
}

function homepageModules(entries) {
  const used = new Set();
  const output = [];

  for (const entry of entries) {
    if (entry.kind !== "home") continue;

    entry.metadata.modules.forEach((module, index) => {
      // 部分组件（当前是 missav.js）的模块既没有 id，functionName 也重复
      // （13 个模块共用 loadPage，仅靠 title 与 params 区分）。
      // 直接用 ${key}_${module.id} 会得到 19 个相同的 "missav_undefined"，
      // 导致 bundle 里模块 id 重复、Forward 无法区分这些模块。
      // 依次回退到 id → functionName → 序号，并对最终碰撞追加后缀。
      const base = `${entry.key}_${module.id || module.functionName || `module${index}`}`;
      let id = base;
      let suffix = 2;
      while (used.has(id)) {
        id = `${base}_${suffix}`;
        suffix += 1;
      }
      used.add(id);

      output.push({
        ...JSON.parse(JSON.stringify(module)),
        id,
        title: `[${entry.metadata.title}] ${module.title}`,
        // functionName 允许重复：多个模块共用同一实现、靠 params 区分是合法用法，
        // 重复的函数声明会指向同一个 wrapper，行为一致。
        functionName: `${entry.key}_${module.functionName}`,
      });
    });
  }

  return output;
}

function homepageWrapperBlocks(entries) {
  return entries.filter((entry) => entry.kind === "home").flatMap((entry) =>
    entry.metadata.modules.map((module) => {
      const exportedName = `${entry.key}_${module.functionName}`;
      return `async function ${exportedName}(params) {\nreturn ${entry.namespace}[${JSON.stringify(module.functionName)}](params || {});\n}`;
    })
  );
}

async function searchAll(params) {
  var calls = [FW_HENTAI_MAMA_HOME.search, FW_HSTREAM_HOME.search, FW_YIN_HOME.search, FW_HANIME_HOME.search, FW_MISSAV_HOME.search];
  var groups = await Promise.all(calls.map(function (fn) {
    return Promise.resolve().then(function () { return fn(params || {}); }).catch(function () { return []; });
  }));
  var seen = {};
  var output = [];
  groups.forEach(function (items) {
    (Array.isArray(items) ? items : []).forEach(function (item) {
      var key = String(item.id || "") + "|" + String(item.link || "") + "|" + String(item.title || "");
      if (!seen[key]) {
        seen[key] = true;
        output.push(item);
      }
    });
  });
  return output;
}

async function loadDetail(link) {
  var value = String(link || "");
  if (value.indexOf("hentaimama:") === 0) return FW_HENTAI_MAMA_HOME.loadDetail(link);
  if (value.indexOf("missav:") === 0) return FW_MISSAV_HOME.loadDetail(link);
  if (value.indexOf("hstream:") === 0) return FW_HSTREAM_HOME.loadDetail(link);
  if (value.indexOf("yinhentai:") === 0) return FW_YIN_HOME.loadDetail(link);
  if (value.indexOf("hanime:") === 0) return FW_HANIME_HOME.loadDetail(link);
  return null;
}

function resourceProviderForLink(link) {
  if (link.indexOf("hentaimama:") === 0) return FW_HENTAI_MAMA_RESOURCE.loadResource;
  if (link.indexOf("missav:") === 0) return FW_MISSAV_RESOURCE.loadResource;
  if (link.indexOf("hstream:") === 0) return FW_HSTREAM_RESOURCE.loadResource;
  if (link.indexOf("yinhentai:") === 0) return FW_YIN_RESOURCE.loadResource;
  if (link.indexOf("hanime:") === 0) return FW_HANIME_RESOURCE.loadResource;
  if (link.indexOf("4kvm:") === 0) return FW_4KVM_RESOURCE.loadResource;
  return null;
}

function collectPlayback(providers, input, direct) {
  return new Promise(function (resolve) {
    var groups = new Array(providers.length);
    var remaining = providers.length;
    var finished = false;
    var hasTimers = typeof setTimeout === "function";
    var grace;
    var deadline;
    function finish(reason) {
      if (finished) return;
      finished = true;
      if (typeof clearTimeout === "function") {
        clearTimeout(deadline);
        if (grace) clearTimeout(grace);
      }
      var seen = Object.create(null);
      var output = [];
      groups.forEach(function (items) {
        (items || []).forEach(function (item) {
          if (item && item.url && !seen[item.url]) {
            seen[item.url] = true;
            output.push(item);
          }
        });
      });
      console.log("FW playback: " + reason + ", completed=" + (providers.length - remaining) + "/" + providers.length + ", streams=" + output.length);
      resolve(output);
    }
    // A source may perform multiple sequential 15-second HTTP requests.
    // Bound the user-facing wait without claiming to cancel native HTTP work.
    if (hasTimers) {
      deadline = setTimeout(function () { finish("deadline"); }, direct ? 25000 : 20000);
    } else {
      // Embedded JS hosts need not provide browser/Node timer globals.
      // In that case providers rely on their native HTTP timeouts.
      console.log("FW playback: timers unavailable; native HTTP timeouts only");
    }
    providers.forEach(function (provider, index) {
      Promise.resolve().then(function () { return provider(input); }).catch(function () { return []; }).then(function (items) {
        if (finished) return;
        groups[index] = Array.isArray(items) ? items.filter(function (item) { return item && item.url; }) : [];
        remaining--;
        if (!remaining) return finish("all complete");
        if (hasTimers && !direct && groups[index].length && !grace) {
          grace = setTimeout(function () { finish("available streams"); }, 1500);
        }
      });
    });
    if (!remaining) finish("no providers");
  });
}

function playbackInput(params) {
  var input = Object.assign({}, params || {});
  var values = [input.link, input.id, input.url];
  for (var i = 0; i < values.length; i++) {
    var value = String(values[i] || "");
    try { value = decodeURIComponent(value); } catch (e) {}
    var prefix = value.match(/^(hentaimama|missav|hstream|yinhentai|hanime|4kvm|avbebe|xchina):(.+)$/i);
    if (prefix) { input.link = prefix[1].toLowerCase() + ":" + prefix[2]; return input; }
    // 命中已知站点域名时只查对应的那一个源；漏掉的域名会落到 resolvePlayback 的
    // 6 源并发，慢且互相抢带宽（踩过：missav.fans 不在表里，用户起播要等全量并发）。
    var url = value.match(/^https?:\/\/(?:www\.)?(hstream\.moe|yinhentai\.com|hanime\.tv|4kvm\.net|hentaimama\.io|avbebe\.com|xchina\.co|missav\.(?:live|fans|ws|ai))\/([^?#]+)/i);
    if (!url) continue;
    var routes = { "hstream.moe": ["hstream", /^hentai\/(.+?)\/?$/], "yinhentai.com": ["yinhentai", /^(?:(?:watch|video|videos|hentai|anime)\/)?([^/]+)\/?$/], "hanime.tv": ["hanime", /^videos\/hentai\/(.+?)\/?$/], "4kvm.net": ["4kvm", /^play\/(.+?)\/?$/], "hentaimama.io": ["hentaimama", /^(.*)$/], "avbebe.com": ["avbebe", /^archives\/(\d+)/], "xchina.co": ["xchina", /^video\/id-([a-f0-9]+)\.html/], "missav.live": ["missav", /^(?:cn\/)?(.+?)\/?$/], "missav.fans": ["missav", /^(?:cn\/)?(.+?)\/?$/], "missav.ws": ["missav", /^(?:cn\/)?(.+?)\/?$/], "missav.ai": ["missav", /^(?:cn\/)?(.+?)\/?$/] };
    var route = routes[url[1].toLowerCase()];
    if (!route) continue;
    var slug = url[2].match(route[1]);
    if (slug) { input.link = route[0] + ":" + slug[1]; return input; }
  }
  return input;
}

function loadResource(params) {
  if (params && params.multiSource === "disabled") return Promise.resolve([]);
  var input = playbackInput(params);
  var key = JSON.stringify(Object.keys(input).sort().map(function (name) { return [name, input[name]]; }));
  if (FW_PLAYBACK_PENDING[key]) return FW_PLAYBACK_PENDING[key];
  var pending = resolvePlayback(input).then(function (items) {
    delete FW_PLAYBACK_PENDING[key];
    return items;
  }, function (error) {
    delete FW_PLAYBACK_PENDING[key];
    throw error;
  });
  FW_PLAYBACK_PENDING[key] = pending;
  return pending;
}

async function resolvePlayback(params) {
  var input = params || {};
  // avbebe / xchina 走各自的独立模块（fw-all 受体积上限约束没有内联它们）。
  // 这里直接返回空，避免为了两条不存在的线路把 6 个内置源全查一遍、
  // 让用户白等几秒（见 README「线路列表为空」）。
  if (/^(avbebe|xchina):/i.test(String(input.link || ""))) return [];
  var direct = resourceProviderForLink(String(input.link || ""));
  if (direct) return collectPlayback([direct], input, true);
  var providers = [
    FW_HENTAI_MAMA_RESOURCE.loadResource,
    FW_HSTREAM_RESOURCE.loadResource,
    FW_YIN_RESOURCE.loadResource,
    FW_HANIME_RESOURCE.loadResource,
    FW_4KVM_RESOURCE.loadResource,
    FW_MISSAV_RESOURCE.loadResource,
  ];
  return collectPlayback(providers, input, false);
}

function build() {
  const entries = SOURCES.map(readSource);
  const resourceEntries = entries.filter((entry) => entry.kind === "resource");
  const hanimeResource = resourceEntries.find((entry) => entry.key === "hanime");
  const metadata = {
    id: "hyj1817.fw.all",
    title: "FW 总模块",
    description: "Hentaimama、HStream、YinHentai、MissAV、Hanime 首页与六站播放源",
    author: "HYJ1817",
    site: "https://github.com/HYJ1817/fw-modules",
    icon: "https://raw.githubusercontent.com/HYJ1817/fw-modules/refs/heads/main/icon.png",
    // 每次改动任何被内联的源都必须手动 bump：客户端只按 version 决定是否重新拉取 fw-all.js，
    // 版本不变时会一直用缓存的旧内联代码（踩过：missav 改了 fans 域名但没 bump，用户端仍是旧源）。
    version: "1.0.5",
    requiredVersion: "0.0.1",
    detailCacheDuration: 60,
    globalParams: JSON.parse(JSON.stringify(hanimeResource.metadata.globalParams || [])),
    modules: homepageModules(entries).concat({
      id: "loadResource",
      title: "统一播放源",
      functionName: "loadResource",
      type: "stream",
      cacheDuration: 0,
      params: [],
    }),
    search: {
      title: "聚合搜索",
      functionName: "searchAll",
      params: [{ name: "keyword", title: "关键词", type: "input", description: "同时搜索三个网站" }],
    },
  };
  const runtimeBlocks = [
    searchAll.toString(),
    loadDetail.toString(),
    resourceProviderForLink.toString(),
    "var FW_PLAYBACK_PENDING = Object.create(null);",
    collectPlayback.toString(),
    playbackInput.toString(),
    resolvePlayback.toString(),
    loadResource.toString(),
  ];
  const output = [
    "/* Generated by scripts/build-fw-all.js. Do not edit directly. */",
    `var WidgetMetadata = ${JSON.stringify(metadata, null, 2)};`,
    ...entries.map(namespaceBlock),
    ...homepageWrapperBlocks(entries),
    ...runtimeBlocks,
  ].join("\n\n") + "\n";

  const temporary = `${OUTPUT}.tmp`;
  fs.writeFileSync(temporary, output, "utf8");
  const verify = vmContext();
  vm.createContext(verify);
  vm.runInContext(output, verify, { filename: OUTPUT });
  fs.rmSync(OUTPUT, { force: true });
  fs.renameSync(temporary, OUTPUT);

  const bytes = Buffer.byteLength(output);
  if (bytes > MAX_BYTES) {
    console.warn(
      `\n⚠️  fw-all.js 体积 ${(bytes / 1024).toFixed(0)} KB，超过保守阈值 ${(MAX_BYTES / 1024).toFixed(0)} KB。\n` +
        `    Forward 可能截断该文件并报「模块无效或解析失败」。\n` +
        `    建议把新增播放源做成独立模块，而不是继续内联进本包。\n`
    );
  }

  return output;
}

// 作为脚本执行时构建；被 require 时只导出，供测试推导期望值。
if (require.main === module) {
  build();
}

module.exports = {
  SOURCES,
  build,
  readSource,
  homepageModules,
  exportNames,
  vmContext,
  OUTPUT,
};
