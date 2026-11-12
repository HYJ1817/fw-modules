#!/usr/bin/env node
/**
 * 第三方 Rex 模块的列表模块上游没写 `type` 字段，Forward 校验模块信息时会整份拒绝
 * （表现：「模块信息校验失败」）。本脚本只补这一行，其余内容逐字保留。
 *
 *   node scripts/patch-rex-type.js
 *
 * 覆盖 widgets/{getav,one,perverzija,supjav}.js；可反复执行（已补过不会重复插入）。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const FILES = ["getav.js", "one.js", "perverzija.js", "supjav.js"];

let changed = 0;
for (const name of FILES) {
  const file = path.join(ROOT, "widgets", name);
  const source = fs.readFileSync(file, "utf8");
  const next = source.replace(/^(\s*)requiresWebView\s*(:\s*(?:true|false)),(?!\n\s*type:)/gm, (all, indent, rest) => {
    changed++;
    return `${indent}requiresWebView${rest},\n${indent}type: "video",`;
  });
  if (next !== source) fs.writeFileSync(file, next);
  console.log(`${next === source ? "=" : "✓"} ${name}`);
}
console.log(changed ? `补了 ${changed} 处 type` : "无需改动");
