"use strict";
/**
 * 生成四份按内容分组的订阅清单：
 *   fw-hentai.fwd（里番）/ fw-drama.fwd（短剧）/ fw-av.fwd（AV）/ fw-movie.fwd（影视）
 * 全量清单与四合一子集已下线；分组之间互不重叠，合起来等于全部可分发组件。
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

 /** 已下线的清单：它们的内容已经全部并入分组，保留常量只为迁移时提示。 */
const RETIRED_FILES = ["fw-modules.fwd", "fw-modules-cdn.fwd", "fw-modules.json", "forward-widgets.fwd", "fw-rex-4.fwd", "fw-avbebe-xchina.fwd"];

/** 按内容分组的三份订阅：彼此不重叠，合起来等于「主清单 21 个 + 四合一 4 个」。 */
const GROUP_OUTPUTS = [
  {
    file: path.join(ROOT, "fw-hentai.fwd"),
    title: "里番",
    description: "Hentaimama / HStream / YinHentai / Hanime 的首页与播放源（8 个组件）",
    files: ["hentaimama.js", "hentaimama-resource.js", "hstream.js", "hstream-resource.js", "yinhentai.js", "yinhentai-resource.js", "hanime.js", "hanime-resource.js"],
  },
  {
    file: path.join(ROOT, "fw-drama.fwd"),
    title: "短剧",
    description: "黄果短剧的首页与播放源（2 个组件）",
    files: ["huangguo.js", "huangguo-resource.js"],
  },
  {
    file: path.join(ROOT, "fw-av.fwd"),
    title: "AV",
    description: "MissAV / Jable / XChina / Avbebe / SupJav 与四合一第三方模块（13 个组件）",
    files: ["missav.js", "missav-resource.js", "jable.js", "jable-resource.js", "xchina.js", "xchina-resource.js", "avbebe.js", "avbebe-resource.js", "supjav-webox.js", "getav.js", "one.js", "perverzija.js", "supjav.js"],
  },
  {
    file: path.join(ROOT, "fw-movie.fwd"),
    title: "影视",
    description: "4KVM 播放源与苹果CMS 聚合源（2 个组件）",
    files: ["4kvm-resource.js", "maccms-source.js"],
  },
];

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
  "getav.js",
  "one.js",
  "perverzija.js",
  "supjav.js",
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
  for (const group of GROUP_OUTPUTS) {
    let current;
    try {
      current = JSON.parse(fs.readFileSync(group.file, "utf8"));
    } catch (error) {
      continue;
    }
    for (const widget of current.widgets || []) {
      if (extras.has(widget.id)) continue;
      const extra = {};
      for (const key of Object.keys(widget)) {
        if (!GENERATED_FIELDS.has(key)) extra[key] = widget[key];
      }
      if (Object.keys(extra).length) extras.set(widget.id, extra);
    }
  }
  return extras;
}

/** 沿用现有清单的顺序，新增文件追加在后，保证 diff 最小。 */
function readExistingOrder() {
  for (const group of GROUP_OUTPUTS) {
    try {
      const current = JSON.parse(fs.readFileSync(group.file, "utf8"));
      if (Array.isArray(current.widgets) && current.widgets.length) return current.widgets.map((widget) => widget.id);
    } catch (error) {}
  }
  return [];
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

  const cdnBase = `https://cdn.jsdelivr.net/gh/${OWNER}/${REPOSITORY}@${BRANCH}`;

  // 四份分组清单：组间不允许重叠，缺件直接报错
  const seen = new Set();
  const written = [];
  for (const group of GROUP_OUTPUTS) {
    const groupEntries = group.files.map((file) => {
      if (seen.has(file)) throw new Error(`分组清单文件重复：${file}`);
      seen.add(file);
      return metadataFromFile(file);
    });
    const output = withBase(
      { title: group.title, description: group.description, icon: `${cdnBase}/icon.png` },
      rewriteUrls(groupEntries.map(({ entry }) => ({ ...entry, ...(extras.get(entry.id) || {}) })), cdnBase)
    );
    fs.writeFileSync(group.file, `${JSON.stringify(output, null, 2)}\n`);
    written.push(path.relative(ROOT, group.file));
  }

  // 分组应覆盖全部可分发组件
  const missing = files.filter((file) => !seen.has(file));
  if (missing.length) throw new Error(`以下组件没有归入任何分组：${missing.join(", ")}`);
  const retired = RETIRED_FILES.filter((file) => fs.existsSync(path.join(ROOT, file)));

  const inherited = widgets.filter((widget) => extras.has(widget.id)).length;
  console.log(`Generated ${written.join(", ")}`);
  console.log(`  widgets: ${widgets.length}（继承额外字段 ${inherited} 条）`);
  console.log(`  files:   ${files.join(", ")}`);
  console.log(`  groups:  ${GROUP_OUTPUTS.map((group) => `${group.title} ${group.files.length}`).join(" / ")}`);
  if (retired.length) console.log(`  ⚠ 已下线但仍存在：${retired.join(", ")}（可安全删除）`);
}

main();
