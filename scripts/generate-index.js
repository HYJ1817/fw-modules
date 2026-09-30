"use strict";
/**
 * 生成三份订阅清单：forward-widgets.fwd / fw-modules.fwd（Raw）、
 * fw-modules-cdn.fwd（jsDelivr）、fw-modules.json（GitHub Pages）。
 * ---------------------------------------------------------------------------
 * 相比早期版本的三处修正：
 *   1. 自动发现 widgets/*.js，不再维护硬编码文件列表。
 *      早期硬编码列表只有 7 个文件，比实际清单少 4 条 —— 跑一次就会把
 *      hentaimama 与 missav 的条目从清单里删掉，且不会有任何报错。
 *   2. 保留清单中已存在的额外字段（如 type: "url"）。这些字段生成器不产出，
 *      早期版本重新生成时会把它们全部丢失。
 *   3. 条目数减少时直接报错退出，避免误删。
 *
 * 用法：node scripts/generate-index.js [--allow-shrink]
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const WIDGETS_DIR = path.join(ROOT, "widgets");

const RAW_OUTPUT_FILES = [path.join(ROOT, "forward-widgets.fwd"), path.join(ROOT, "fw-modules.fwd")];
const CDN_OUTPUT_FILE = path.join(ROOT, "fw-modules-cdn.fwd");
const PAGES_OUTPUT_FILE = path.join(ROOT, "fw-modules.json");
/** 两站子集清单：只装 Avbebe + XChina 的四个组件，供不想装全量模块的场景单独订阅。 */
const SUBSET_OUTPUT_FILE = path.join(ROOT, "fw-avbebe-xchina.fwd");
const SUBSET_FILES = new Set(["avbebe.js", "avbebe-resource.js", "xchina.js", "xchina-resource.js"]);

const OWNER = "HYJ1817";
const REPOSITORY = "fw-modules";
const BRANCH = "main";

/** 不进入正式清单的文件：构建产物与独立诊断模块，按设计走单独的 Raw 链接。 */
const EXCLUDED_FILES = new Set([
  "fw-all.js",
  "fw-trace.js",
  "fw-diagnostics.js",
  "fw-sourcecheck.js",
  "fw-probe.js",
  "control.js",
]);

/** 生成器负责产出的字段；其余字段从现有清单继承，避免丢失手工配置。 */
const GENERATED_FIELDS = new Set(["id", "title", "description", "requiredVersion", "version", "author", "url"]);

function widgetFiles() {
  return fs
    .readdirSync(WIDGETS_DIR)
    .filter((name) => name.endsWith(".js"))
    .filter((name) => !EXCLUDED_FILES.has(name))
    .sort();
}

function metadataFromFile(filename) {
  const fullPath = path.join(WIDGETS_DIR, filename);
  const context = {
    Widget: { http: {}, storage: null, sharedCache: null },
    console: { log() {}, error() {}, warn() {} },
    URL,
    Date,
    JSON,
    Math,
    Object,
    Array,
    String,
    Number,
    RegExp,
    Promise,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    clearTimeout,
    Uint8Array,
    DataView,
    ArrayBuffer,
    WebAssembly,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(fullPath, "utf8"), context, { filename: fullPath });
  const item = context.WidgetMetadata;
  if (!item || !item.id || !item.title) throw new Error(`WidgetMetadata 无效: ${filename}`);
  return {
    file: filename,
    entry: {
      id: item.id,
      title: item.title,
      description: item.description || "",
      requiredVersion: item.requiredVersion || "0.0.1",
      version: item.version || "1.0.0",
      author: item.author || OWNER,
      url: `https://raw.githubusercontent.com/${OWNER}/${encodeURIComponent(REPOSITORY)}/${BRANCH}/widgets/${encodeURIComponent(filename)}`,
    },
  };
}

/** 读取现有清单中生成器不负责的字段（例如 type: "url"），按 id 保留。 */
function readInheritedExtras() {
  const extras = new Map();
  let current;
  try {
    current = JSON.parse(fs.readFileSync(PAGES_OUTPUT_FILE, "utf8"));
  } catch (error) {
    return extras;
  }
  for (const widget of current.widgets || []) {
    const extra = {};
    for (const key of Object.keys(widget)) {
      if (!GENERATED_FIELDS.has(key)) extra[key] = widget[key];
    }
    if (Object.keys(extra).length) extras.set(widget.id, extra);
  }
  return extras;
}

/** 沿用现有清单的顺序，新增文件追加在后，保证 diff 最小。 */
function readExistingOrder() {
  try {
    const current = JSON.parse(fs.readFileSync(PAGES_OUTPUT_FILE, "utf8"));
    return (current.widgets || []).map((widget) => widget.id);
  } catch (error) {
    return [];
  }
}

function orderEntries(entries, existingOrder) {
  const rank = new Map(existingOrder.map((id, index) => [id, index]));
  return entries.slice().sort((a, b) => {
    const ra = rank.has(a.entry.id) ? rank.get(a.entry.id) : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(b.entry.id) ? rank.get(b.entry.id) : Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.file.localeCompare(b.file);
  });
}

function withBase(base, widgets) {
  return { ...base, widgets };
}

function rewriteUrls(widgets, base) {
  return widgets.map((widget) => ({ ...widget, url: `${base}/widgets/${widget.url.split("/").pop()}` }));
}

// ---------------------------------------------------------------------------

function main() {
  const allowShrink = process.argv.includes("--allow-shrink");

  const files = widgetFiles();
  if (!files.length) throw new Error("widgets/ 下没有可用的组件文件");

  const extras = readInheritedExtras();
  const entries = orderEntries(files.map(metadataFromFile), readExistingOrder());

  const widgets = entries.map(({ entry }) => ({ ...entry, ...(extras.get(entry.id) || {}) }));

  // 防误删：条目数比现有清单少时直接退出
  let previousCount = null;
  try {
    previousCount = (JSON.parse(fs.readFileSync(PAGES_OUTPUT_FILE, "utf8")).widgets || []).length;
  } catch (error) {
    previousCount = null;
  }
  if (previousCount !== null && widgets.length < previousCount && !allowShrink) {
    throw new Error(
      `拒绝写入：新清单 ${widgets.length} 条，少于现有 ${previousCount} 条。` +
        `若确需删减，请显式加 --allow-shrink。`
    );
  }

  const base = {
    title: "fw模块",
    description: "Forward 自用首页模块与播放源",
    icon: `https://raw.githubusercontent.com/${OWNER}/${REPOSITORY}/refs/heads/${BRANCH}/icon.png`,
  };

  const cdnBase = `https://cdn.jsdelivr.net/gh/${OWNER}/${REPOSITORY}@${BRANCH}`;
  const pagesBase = `https://${OWNER.toLowerCase()}.github.io/${REPOSITORY}`;

  const rawOutput = withBase(base, widgets);
  const cdnOutput = withBase({ ...base, icon: `${cdnBase}/icon.png` }, rewriteUrls(widgets, cdnBase));
  const pagesOutput = withBase({ ...base, icon: `${pagesBase}/icon.png` }, rewriteUrls(widgets, pagesBase));

  for (const outputFile of RAW_OUTPUT_FILES) {
    fs.writeFileSync(outputFile, `${JSON.stringify(rawOutput, null, 2)}\n`);
  }
  fs.writeFileSync(CDN_OUTPUT_FILE, `${JSON.stringify(cdnOutput, null, 2)}\n`);
  fs.writeFileSync(PAGES_OUTPUT_FILE, `${JSON.stringify(pagesOutput, null, 2)}\n`);

  // 两站子集：文件改名或删减时直接报错，避免子集清单悄悄缺件
  const subsetEntries = entries.filter((entry) => SUBSET_FILES.has(entry.file));
  if (subsetEntries.length !== SUBSET_FILES.size) {
    const missing = [...SUBSET_FILES].filter((file) => !subsetEntries.some((entry) => entry.file === file));
    throw new Error(`两站子集清单缺件：${missing.join(", ")}`);
  }
  const subsetOutput = withBase(
    {
      title: "Avbebe + XChina",
      description: "Avbebe 与 XChina 的首页模块与播放源（4 个组件）",
      icon: `${cdnBase}/icon.png`,
    },
    rewriteUrls(
      subsetEntries.map(({ entry }) => ({ ...entry, ...(extras.get(entry.id) || {}) })),
      cdnBase
    )
  );
  fs.writeFileSync(SUBSET_OUTPUT_FILE, `${JSON.stringify(subsetOutput, null, 2)}\n`);

  const written = RAW_OUTPUT_FILES.concat(CDN_OUTPUT_FILE, PAGES_OUTPUT_FILE, SUBSET_OUTPUT_FILE).map((file) => path.relative(ROOT, file));
  const inherited = widgets.filter((widget) => extras.has(widget.id)).length;
  console.log(`Generated ${written.join(", ")}`);
  console.log(`  widgets: ${widgets.length}（继承额外字段 ${inherited} 条）`);
  console.log(`  files:   ${files.join(", ")}`);
  console.log(`  subset:  ${subsetEntries.map((entry) => entry.file).join(", ")}`);
}

main();
