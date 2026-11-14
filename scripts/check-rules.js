#!/usr/bin/env node
"use strict";
/**
 * 校验 rules/ 下的规则集是否覆盖了 widgets/ 里所有模块用到的域名。
 *
 *   node scripts/check-rules.js
 *
 * 新增模块或站点换域名后，如果忘了跑 npm run generate:rules，这里会直接报出来。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const RULES = path.join(ROOT, "rules", "fw-modules.qx.list");

/** 不属于站点、无需分流的域名：仓库自身、公共库、占位图等 */
const IGNORE = new Set([
  "github.com",
  "raw.githubusercontent.com",
  "cdn.jsdelivr.net",
  "hyj1817.github.io",
  "w3.org",
  "www.w3.org",
  "schema.org",
  "json-schema.org",
  "example.com",
  "www.example.com",
  "googletagmanager.com",
  "www.googletagmanager.com",
  "cloudflareinsights.com",
  "static.cloudflareinsights.com",
  "via.placeholder.com",
  "widgets-xd.vercel.app",
  "translate.googleapis.com",
  "clients5.google.com",
  "wsrv.nl",
  "i0.wp.com",
]);

function rules() {
  const text = fs.readFileSync(RULES, "utf8");
  const list = [];
  for (const line of text.split("\n")) {
    const match = /^(host-suffix|host-keyword),\s*([^,]+),/.exec(line.trim());
    if (match) list.push({ kind: match[1], value: match[2].trim().toLowerCase() });
  }
  return list;
}

function covered(host, list) {
  for (const rule of list) {
    if (rule.kind === "host-suffix" && (host === rule.value || host.endsWith("." + rule.value))) return true;
    if (rule.kind === "host-keyword" && host.indexOf(rule.value) >= 0) return true;
  }
  return false;
}

function widgetDomains() {
  const found = new Map();
  const dir = path.join(ROOT, "widgets");
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".js") || file.startsWith("fw-") || file === "control.js") continue;
    const source = fs.readFileSync(path.join(dir, file), "utf8");
    const regex = /https?:\/\/([A-Za-z0-9._-]+\.[A-Za-z]{2,10})/g;
    let match;
    while ((match = regex.exec(source))) {
      const host = match[1].toLowerCase();
      if (IGNORE.has(host) || host.endsWith("githubusercontent.com") || host.endsWith("jsdelivr.net")) continue;
      if (!found.has(host)) found.set(host, new Set());
      found.get(host).add(file);
    }
  }
  return found;
}

const list = rules();
const domains = widgetDomains();
const missing = [];
for (const [host, files] of domains) {
  if (!covered(host, list)) missing.push(`${host}（${[...files].join(", ")}）`);
}

if (missing.length) {
  console.error("规则集缺少以下域名，请更新 scripts/generate-rules.js 后跑 npm run generate:rules：");
  for (const item of missing) console.error("  - " + item);
  process.exit(1);
}
console.log(`规则集覆盖完整：${domains.size} 个域名 / ${list.length} 条规则`);
