"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const WIDGETS_DIR = path.join(ROOT, "widgets");
const OUTPUT_FILES = [
  path.join(ROOT, "forward-widgets.fwd"),
  path.join(ROOT, "fw-modules.fwd"),
];
const CDN_OUTPUT_FILE = path.join(ROOT, "fw-modules-cdn.fwd");
const PAGES_OUTPUT_FILE = path.join(ROOT, "fw-modules.json");
const OWNER = "HYJ1817";
const REPOSITORY = "fw-modules";
const BRANCH = "main";

function metadataFromFile(filename) {
  const fullPath = path.join(WIDGETS_DIR, filename);
  const context = {
    Widget: { http: {}, storage: null, sharedCache: null },
    console: { log() {} },
    URL,
    Date,
    JSON,
    Promise,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(fullPath, "utf8"), context, { filename: fullPath });
  const item = context.WidgetMetadata;
  if (!item || !item.id || !item.title) throw new Error(`WidgetMetadata 无效: ${filename}`);
  const repositoryPath = encodeURIComponent(REPOSITORY);
  return {
    id: item.id,
    title: item.title,
    description: item.description || "",
    requiredVersion: item.requiredVersion || "0.0.1",
    version: item.version || "1.0.0",
    author: item.author || OWNER,
    url: `https://raw.githubusercontent.com/${OWNER}/${repositoryPath}/${BRANCH}/widgets/${encodeURIComponent(filename)}`,
  };
}

const files = [
  "hstream.js",
  "hstream-resource.js",
  "yinhentai.js",
  "yinhentai-resource.js",
  "hanime.js",
  "hanime-resource.js",
  "4kvm-resource.js",
];
const output = {
  title: "fw模块",
  description: "Forward 自用首页模块与播放源",
  icon: "https://raw.githubusercontent.com/HYJ1817/fw-modules/refs/heads/main/icon.png",
  widgets: files.map(metadataFromFile),
};
const cdnBase = `https://cdn.jsdelivr.net/gh/${OWNER}/${REPOSITORY}@${BRANCH}`;
const cdnOutput = {
  ...output,
  icon: `${cdnBase}/icon.png`,
  widgets: output.widgets.map((widget) => ({
    ...widget,
    url: `${cdnBase}/widgets/${widget.url.split("/").pop()}`,
  })),
};
const pagesBase = `https://${OWNER.toLowerCase()}.github.io/${REPOSITORY}`;
const pagesOutput = {
  ...output,
  icon: `${pagesBase}/icon.png`,
  widgets: output.widgets.map((widget) => ({
    ...widget,
    url: `${pagesBase}/widgets/${widget.url.split("/").pop()}`,
  })),
};

for (const outputFile of OUTPUT_FILES) {
  fs.writeFileSync(outputFile, `${JSON.stringify(output, null, 2)}\n`);
}
fs.writeFileSync(CDN_OUTPUT_FILE, `${JSON.stringify(cdnOutput, null, 2)}\n`);
fs.writeFileSync(PAGES_OUTPUT_FILE, `${JSON.stringify(pagesOutput, null, 2)}\n`);
console.log(`Generated ${OUTPUT_FILES.concat(CDN_OUTPUT_FILE, PAGES_OUTPUT_FILE).map((file) => path.relative(ROOT, file)).join(", ")} with ${output.widgets.length} widgets.`);
