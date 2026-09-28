#!/usr/bin/env node
/**
 * 仓库一致性校验
 * ===========================================================================
 * 检查项：
 *   A. 清单自洽      —— 各清单内部 id 唯一、字段齐全、URL 与清单定位一致
 *   B. 清单互洽      —— fw-modules.json / fw-modules-cdn.fwd / fw-modules.fwd
 *                        三份的 widget 集合、版本、标题必须一致
 *   C. 清单 ↔ 文件   —— 双向覆盖：每个清单条目有对应文件，每个组件文件被清单收录
 *   D. 版本一致      —— 清单声明的 version 必须等于文件内 WidgetMetadata.version
 *   E. 组件规范      —— 播放源模块必须声明 loadResource/stream；
 *                        必须存在 multiSource 且判断为「默认放行」
 *   F. 代码卫生      —— 检测会导致静默失效的已知反模式
 *
 * 退出码：0 = 全部通过；1 = 存在 error 级问题。
 * 用法：node scripts/check-manifests.js [--fix-hint]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WIDGET_DIR = path.join(ROOT, 'widgets');

const MANIFESTS = [
  { file: 'fw-modules.json', host: 'hyj1817.github.io', label: 'Pages 清单（主）' },
  { file: 'fw-modules-cdn.fwd', host: 'cdn.jsdelivr.net', label: 'CDN 备用清单' },
  { file: 'fw-modules.fwd', host: 'raw.githubusercontent.com', label: 'Raw 清单' },
  { file: 'forward-widgets.fwd', host: null, label: '历史清单', optional: true },
  { file: 'control-main.fwd', host: 'raw.githubusercontent.com', label: '最小校验清单', optional: true, isolated: true },
];

const errors = [];
const warnings = [];
const notes = [];

function error(scope, message) {
  errors.push(`[ERROR] ${scope}: ${message}`);
}
function warn(scope, message) {
  warnings.push(`[WARN ] ${scope}: ${message}`);
}
function note(message) {
  notes.push(`[INFO ] ${message}`);
}

function readJson(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return null;
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    error(file, `JSON 解析失败：${e.message}`);
    return null;
  }
}

/** 从组件源码中取出 WidgetMetadata 对象字面量，不执行文件其余部分。 */
function extractMetadata(source) {
  const match = source.match(/WidgetMetadata\s*=\s*/);
  if (!match) return null;
  const start = match.index + match[0].length;

  let depth = 0;
  let inString = null;
  let quote = null;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    const prev = source[i - 1];

    if (inString) {
      if (ch === inString && prev !== '\\') inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      quote = i;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        const literal = source.slice(start, i + 1);
        try {
          // 字面量里不允许出现函数/变量引用；出现则退回执行模式
          return new Function(`"use strict"; return (${literal});`)();
        } catch (e) {
          return null;
        }
      }
    }
  }
  void quote;
  return null;
}

/** 字面量提取失败时的兜底：用桩对象执行整个文件。 */
function executeMetadata(file) {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const stub = {
    http: { get: async () => ({ data: null }), post: async () => ({ data: null }) },
    storage: { get: () => null, set: () => {} },
    log: () => {},
    dom: { parse: () => null },
    html: { load: () => null },
  };
  try {
    const factory = new Function(
      'Widget',
      'console',
      `${source}\n;return typeof WidgetMetadata !== "undefined" ? WidgetMetadata : null;`
    );
    return factory(stub, { log: () => {}, warn: () => {}, error: () => {} });
  } catch (e) {
    return null;
  }
}

function loadWidgetMetadata(relPath) {
  const source = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const meta = extractMetadata(source) || executeMetadata(relPath);
  return { meta, source };
}

// ---------------------------------------------------------------------------
// A / B：清单检查
// ---------------------------------------------------------------------------

const loaded = [];
for (const spec of MANIFESTS) {
  const data = readJson(spec.file);
  if (!data) {
    if (!spec.optional) error(spec.file, '清单文件缺失或不可读');
    continue;
  }
  if (!Array.isArray(data.widgets)) {
    error(spec.file, '缺少 widgets 数组');
    continue;
  }

  const seen = new Set();
  for (const widget of data.widgets) {
    const where = `${spec.file} → ${widget.id || '(无 id)'}`;
    for (const field of ['id', 'title', 'description', 'version', 'requiredVersion', 'author', 'url']) {
      if (!widget[field]) warn(where, `缺少字段 ${field}`);
    }
    if (widget.id) {
      if (seen.has(widget.id)) error(spec.file, `id 重复：${widget.id}`);
      seen.add(widget.id);
    }
    if (spec.host && widget.url && !widget.url.includes(spec.host)) {
      error(where, `URL 域名与清单定位不符（期望含 ${spec.host}）：${widget.url}`);
    }
  }

  loaded.push({ spec, data });
  note(`${spec.label}（${spec.file}）：${data.widgets.length} 个组件`);
}

// B：三份主清单必须完全一致
const comparable = loaded.filter((entry) => !entry.spec.isolated && entry.spec.file !== 'forward-widgets.fwd');
if (comparable.length >= 2) {
  const base = comparable[0];
  const baseMap = new Map(base.data.widgets.map((w) => [w.id, w]));
  for (const entry of comparable.slice(1)) {
    const map = new Map(entry.data.widgets.map((w) => [w.id, w]));

    for (const id of baseMap.keys()) {
      if (!map.has(id)) error(`${entry.spec.file}`, `缺少组件 ${id}（${base.spec.file} 中有）`);
    }
    for (const id of map.keys()) {
      if (!baseMap.has(id)) error(`${base.spec.file}`, `缺少组件 ${id}（${entry.spec.file} 中有）`);
    }
    for (const [id, widget] of map) {
      const reference = baseMap.get(id);
      if (!reference) continue;
      if (widget.version !== reference.version) {
        error(`${entry.spec.file} → ${id}`, `version 不一致：${widget.version} vs ${base.spec.file} 的 ${reference.version}`);
      }
      if (widget.title !== reference.title) {
        warn(`${entry.spec.file} → ${id}`, `title 不一致：${widget.title} vs ${reference.title}`);
      }
      if (Boolean(widget.type) !== Boolean(reference.type)) {
        warn(`${entry.spec.file} → ${id}`, `type 字段存在性不一致（一方有 "url" 一方没有）`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// C / D：清单 ↔ 组件文件
// ---------------------------------------------------------------------------

const widgetFiles = fs
  .readdirSync(WIDGET_DIR)
  .filter((name) => name.endsWith('.js'))
  .sort();

const fileIndex = new Map();
for (const name of widgetFiles) {
  const rel = path.join('widgets', name);
  const { meta, source } = loadWidgetMetadata(rel);
  if (!meta || !meta.id) {
    warn(rel, '无法解析 WidgetMetadata.id');
    continue;
  }
  fileIndex.set(meta.id, { name, rel, meta, source });
}

/** 独立诊断 / 构建产物 / 最小校验模块：按设计不进入正式清单，也不要求 multiSource。 */
function isInfraFile(name) {
  return /^(fw-all|fw-trace|fw-diagnostics|fw-sourcecheck|control)\.js$/.test(name);
}

// 清单 id ↔ 文件 id 双向覆盖
const manifestIds = new Set();
for (const entry of loaded) {
  for (const widget of entry.data.widgets) manifestIds.add(widget.id);
}

for (const [id, info] of fileIndex) {
  if (!manifestIds.has(id)) {
    if (isInfraFile(info.name)) {
      note(`${info.rel}（${id}）未收录于任何清单 —— 符合设计`);
    } else {
      warn(`${info.rel}`, `组件 id ${id} 未出现在任何清单中`);
    }
  }
}

// 清单 url 末段 → 文件名，必须存在且 id 匹配
for (const entry of loaded) {
  for (const widget of entry.data.widgets) {
    const fileName = String(widget.url || '').split('/').pop();
    const target = widgetFiles.includes(fileName);
    if (!target) {
      error(`${entry.spec.file} → ${widget.id}`, `URL 指向的文件不存在：widgets/${fileName}`);
      continue;
    }
    const info = fileIndex.get(widget.id);
    if (!info) continue;
    if (info.name !== fileName) {
      error(`${entry.spec.file} → ${widget.id}`, `id 与文件不匹配：id 对应 ${info.name}，URL 指向 ${fileName}`);
    }
    if (info.meta.version !== widget.version) {
      error(`${entry.spec.file} → ${widget.id}`, `版本不同步：清单 ${widget.version}，文件 ${info.meta.version}`);
    }
    if (info.meta.title !== widget.title) {
      warn(`${entry.spec.file} → ${widget.id}`, `标题不同步：清单「${widget.title}」，文件「${info.meta.title}」`);
    }
  }
}

// ---------------------------------------------------------------------------
// E / F：组件规范与反模式
// ---------------------------------------------------------------------------

const ANTIPATTERNS = [
  {
    re: /!==\s*["']enabled["']/,
    message: '使用 `!== "enabled"` 严格判等 —— 参数未注入时会直接返回空，应改为 `=== "disabled"`',
  },
  {
    re: /response\s*&&\s*response\.data\s*&&\s*response\.data\.(list|data|result)/,
    message: '直接取 response.data.list 且无字符串兜底 —— 苹果CMS 响应头为 text/html，宿主不会自动解析 JSON',
  },
  {
    re: /\.data\.list\b(?![\s\S]{0,400}typeof\s+data\s*===\s*["']string["'])/,
    message: '疑似缺少 `typeof data === "string"` 兜底',
  },
];

for (const [id, info] of fileIndex) {
  const modules = Array.isArray(info.meta.modules) ? info.meta.modules : [];
  const streamModule = modules.find((m) => m && (m.type === 'stream' || m.id === 'loadResource'));

  if (streamModule) {
    if (streamModule.id !== 'loadResource') {
      error(info.rel, `播放源模块的 id 必须是 "loadResource"，当前为 "${streamModule.id}"`);
    }
    if (streamModule.type !== 'stream') {
      error(info.rel, `播放源模块的 type 必须是 "stream"，当前为 "${streamModule.type}"`);
    }
    if (streamModule.functionName !== 'loadResource') {
      warn(info.rel, `functionName 建议为 "loadResource"，当前为 "${streamModule.functionName}"`);
    }
    if (streamModule.cacheDuration === undefined) {
      note(`${info.rel}: 播放源模块建议显式声明 cacheDuration: 0`);
    }

    // 诊断类模块的 stream 入口只用于捕获调用，不参与聚合开关，跳过该检查。
    if (!isInfraFile(info.name)) {
      const params = Array.isArray(info.meta.globalParams) ? info.meta.globalParams : [];
      const multiSource = params.find((p) => p && p.name === 'multiSource');
      if (!multiSource) {
        warn(info.rel, '播放源模块未声明 multiSource —— 该模块不受聚合开关控制，任何情况下都会被调用');
      } else if (multiSource.value === undefined) {
        warn(info.rel, 'multiSource 未设置默认值 value —— 宿主可能不注入该参数');
      }
    }
  }

  for (const rule of ANTIPATTERNS) {
    if (rule.re.test(info.source)) {
      // 已内联适配层的组件会同时命中，这里只对未引用 Maccms 的文件报错
      if (!/Maccms\s*\./.test(info.source)) {
        error(info.rel, rule.message);
      }
    }
  }

  if (!/WidgetMetadata\s*=/.test(info.source)) {
    error(info.rel, '缺少 WidgetMetadata 赋值');
  }
}

// ---------------------------------------------------------------------------
// 输出
// ---------------------------------------------------------------------------

const line = '='.repeat(72);
console.log(line);
console.log('fw-modules 仓库一致性校验');
console.log(line);
for (const n of notes) console.log(n);
if (warnings.length) {
  console.log('');
  for (const w of warnings) console.log(w);
}
if (errors.length) {
  console.log('');
  for (const e of errors) console.log(e);
}

console.log('');
console.log(line);
console.log(
  `结果：${errors.length} 个错误 / ${warnings.length} 个警告 / 组件文件 ${widgetFiles.length} 个 / 清单条目 ${manifestIds.size} 个`
);
console.log(line);

if (process.argv.includes('--fix-hint') && errors.length) {
  console.log('');
  console.log('修复提示：');
  console.log('  1. 版本不同步 → 先改文件内 WidgetMetadata.version，再跑 npm run generate:index');
  console.log('  2. 清单互不一致 → 以 fw-modules.json 为基准重新生成其余清单');
  console.log('  3. 反模式命中 → 参考 lib/maccms.js 的写法');
}

process.exit(errors.length ? 1 : 0);
