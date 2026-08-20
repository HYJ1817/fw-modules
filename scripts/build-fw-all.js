"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const WIDGETS = path.join(ROOT, "widgets");
const OUTPUT = path.join(WIDGETS, "fw-all.js");

const SOURCES = [
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
  const source = fs.readFileSync(filename, "utf8");
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
  return entries.filter((entry) => entry.kind === "home").flatMap((entry) =>
    entry.metadata.modules.map((module) => ({
      ...JSON.parse(JSON.stringify(module)),
      id: `${entry.key}_${module.id}`,
      title: `[${entry.metadata.title}] ${module.title}`,
      functionName: `${entry.key}_${module.functionName}`,
    }))
  );
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
  var calls = [FW_HSTREAM_HOME.search, FW_YIN_HOME.search, FW_HANIME_HOME.search];
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
  if (value.indexOf("hstream:") === 0) return FW_HSTREAM_HOME.loadDetail(link);
  if (value.indexOf("yinhentai:") === 0) return FW_YIN_HOME.loadDetail(link);
  if (value.indexOf("hanime:") === 0) return FW_HANIME_HOME.loadDetail(link);
  return null;
}

function resourceProviderForLink(link) {
  if (link.indexOf("hstream:") === 0) return FW_HSTREAM_RESOURCE.loadResource;
  if (link.indexOf("yinhentai:") === 0) return FW_YIN_RESOURCE.loadResource;
  if (link.indexOf("hanime:") === 0) return FW_HANIME_RESOURCE.loadResource;
  if (link.indexOf("4kvm:") === 0) return FW_4KVM_RESOURCE.loadResource;
  return null;
}

async function loadResource(params) {
  var input = params || {};
  var direct = resourceProviderForLink(String(input.link || ""));
  if (direct) return direct(input);
  var providers = [
    FW_HSTREAM_RESOURCE.loadResource,
    FW_YIN_RESOURCE.loadResource,
    FW_HANIME_RESOURCE.loadResource,
    FW_4KVM_RESOURCE.loadResource,
  ];
  var groups = await Promise.all(providers.map(function (provider) {
    return Promise.resolve().then(function () { return provider(input); }).catch(function () { return []; });
  }));
  var seen = {};
  var output = [];
  groups.forEach(function (items) {
    (Array.isArray(items) ? items : []).forEach(function (item) {
      var key = String(item.url || "");
      if (key && !seen[key]) {
        seen[key] = true;
        output.push(item);
      }
    });
  });
  return output;
}

function build() {
  const entries = SOURCES.map(readSource);
  const resourceEntries = entries.filter((entry) => entry.kind === "resource");
  const hanimeResource = resourceEntries.find((entry) => entry.key === "hanime");
  const metadata = {
    id: "hyj1817.fw.all",
    title: "FW 总模块",
    description: "HStream、YinHentai、Hanime 首页与四站播放源",
    author: "HYJ1817",
    site: "https://github.com/HYJ1817/fw-modules",
    icon: "https://raw.githubusercontent.com/HYJ1817/fw-modules/refs/heads/main/icon.png",
    version: "1.0.0",
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
}

build();
