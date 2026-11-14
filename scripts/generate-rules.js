#!/usr/bin/env node
"use strict";
/**
 * 生成仓库内所有模块用到的站点域名规则集：
 *   rules/fw-modules.qx.list      Quantumult X（host-suffix）
 *   rules/fw-modules.surge.list   Surge / Loon / Stash / Shadowrocket（DOMAIN-SUFFIX）
 *   rules/fw-modules.clash.yaml   Clash / Mihomo（rule-provider classical payload）
 *
 * 域名按内容分组整理，并在注释里标明归属模块。改完 widget 或换域名后跑：
 *   npm run generate:rules
 *
 * 策略名用占位符 PROXY：QX 里换成自己的策略组（例如 Emby），Clash 在 RULE-SET 那行指定。
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "rules");
const POLICY = "PROXY";

/** 分组 -> 域名（含注释说明）。key 是分组标题，值里 suffix 是域名后缀，note 是归属说明。 */
const GROUPS = [
  {
    title: "里番 / 动漫",
    items: [
      { suffix: "hentaimama.io", note: "Hentaimama 站点与图片" },
      { suffix: "hstream.moe", note: "HStream 站点与播放" },
      { suffix: "yinhentai.com", note: "YinHentai 站点与播放" },
      { suffix: "hanime.tv", note: "Hanime 站点" },
      { suffix: "htv-services.com", note: "Hanime 搜索接口" },
      { suffix: "girigirilove.icu", note: "girigiri 动漫站点" },
      { suffix: "girigirilove.com", note: "girigiri 图片与 m3u8 CDN" },
      { suffix: "girigirilove.top", note: "girigiri 备用域名" },
    ],
  },
  {
    title: "短剧",
    items: [
      { suffix: "huangguoai.com", note: "黄果短剧主站" },
      { suffix: "huangguoai.ai", note: "黄果短剧备用站" },
      { suffix: "heitaodj.com", note: "黑桃短剧站点" },
      { suffix: "djqiepian.app", note: "黑桃短剧封面与 m3u8 CDN" },
    ],
  },
  {
    title: "AV",
    items: [
      { suffix: "supjav.blog", note: "SupJav 主站" },
      { suffix: "supjav.com", note: "SupJav 镜像" },
      { suffix: "upload18.org", note: "SupJav 播放器页" },
      { suffix: "upload18.cc", note: "SupJav 封面图床" },
      { suffix: "helvid.com", note: "SupJav HLS 签名 CDN" },
      { suffix: "supremejav.com", note: "SupJav embed 解析接口（lk1.）" },
      { suffix: "streamtape.com", note: "SupJav 备用线路 ST" },
      { suffix: "streamtape.net", note: "SupJav 备用线路 ST 备用域" },
      { suffix: "missav.fans", note: "MissAV 默认站" },
      { suffix: "missav.ws", note: "MissAV 主域" },
      { suffix: "missav.live", note: "MissAV 备用镜像" },
      { suffix: "mrstcdn.store", note: "MissAV 封面与 m3u8 CDN（surrit / fourhoi 子域）" },
      { suffix: "fourhoi.com", note: "MissAV 女优头像 CDN" },
      { suffix: "surrit.com", note: "MissAV 分片 CDN" },
      { suffix: "jable.tv", note: "Jable 主站" },
      { suffix: "fs1.app", note: "Jable 取页备用域" },
      { suffix: "xchina.co", note: "XChina 站点与语言镜像" },
      { suffix: "xchina.download", note: "XChina 图片 CDN" },
      { suffix: "myjav.tv", note: "XChina 播放 CDN" },
      { suffix: "avbebe.com", note: "Avbebe 站点" },
      { suffix: "52cute.com", note: "Avbebe 播放 CDN" },
      { suffix: "getav.net", note: "GetAV 站点" },
      { suffix: "worldstatic.com", note: "GetAV 静态资源" },
      { suffix: "perverzija.com", note: "Perverzija 站点" },
      { suffix: "xtremestream.xyz", note: "Perverzija 播放 CDN" },
      { suffix: "wufazhuce.com", note: "ONE 一个官方站" },
      { suffix: "javday.app", note: "JAVDay 站点" },
      { suffix: "javday.homes", note: "JAVDay 播放 CDN" },
      { suffix: "91porn.com", note: "91Porn 站点" },
      { suffix: "killcovid2021.com", note: "91Porn 预览缩略图" },
      { suffix: "btc620.com", note: "91Porn 视频 CDN（la.btc620.com）" },
      { suffix: "maiyoux.com", note: "碧池直播列表接口（api.maiyoux.com:81）" },
      { suffix: "xn--ypzw80d.com", note: "碧池直播 FLV 流（xbo.视频.com）" },
      { suffix: "quanyuanhj.com", note: "碧池直播封面图" },
      { suffix: "api.2b37894.com", note: "ONE 后端 API（会轮换）" },
      { suffix: "api.3459381.com", note: "ONE 后端 API（会轮换）" },
      { suffix: "api.35a46dd.com", note: "ONE 后端 API（会轮换）" },
      { suffix: "api.43b8477.com", note: "ONE 后端 API（会轮换）" },
      { suffix: "api.5ce3771.com", note: "ONE 后端 API（会轮换）" },
      { suffix: "api.61c76a0.com", note: "ONE 后端 API（会轮换）" },
      { suffix: "api.632d809.com", note: "ONE 后端 API（会轮换）" },
      { suffix: "api.em1oifd0.com", note: "ONE 后端 API（会轮换）" },
      { suffix: "api.j7y675.com", note: "ONE 后端 API（会轮换）" },
    ],
  },
  {
    title: "ONE 一个的轮换域名（后端 API 与图床会变，用关键字兜）",
    keyword: true,
    items: [
      { suffix: "mfpt8g.com", note: "ONE 后端 API（随机前缀）" },
      { suffix: "hkq57tt.com", note: "ONE 图床" },
      { suffix: "2u7qzt7.com", note: "ONE 图床" },
      { suffix: "s7n7ue8.com", note: "ONE 图床" },
      { suffix: "upmf83.com", note: "ONE 后端 API" },
    ],
  },
  {
    title: "影视",
    items: [
      { suffix: "4kvm.net", note: "4KVM 站点与播放" },
      { suffix: "jyzyapi.com", note: "苹果CMS 默认采集站" },
    ],
  },
];

function collect() {
  const seen = new Map();
  for (const group of GROUPS) {
    for (const item of group.items) {
      if (seen.has(item.suffix)) continue;
      seen.set(item.suffix, { ...item, group: group.title, keyword: !!group.keyword });
    }
  }
  return seen;
}

function qxLine(entry) {
  const kind = entry.keyword ? "host-keyword" : "host-suffix";
  return `${kind}, ${entry.suffix}, ${POLICY}`;
}
function surgeLine(entry) {
  const kind = entry.keyword ? "DOMAIN-KEYWORD" : "DOMAIN-SUFFIX";
  return `${kind},${entry.suffix},${POLICY}`;
}

function buildQx(entries) {
  const lines = [
    "# fw-modules 站点域名 · Quantumult X",
    "# 用法：把本文件放进 [filter_local]，或作为 filter_remote 引用",
    "#   https://raw.githubusercontent.com/HYJ1817/fw-modules/main/rules/fw-modules.qx.list",
    `# 策略名占位符 ${POLICY}：换成你自己的策略组（例如 Emby）`,
    "# 由 npm run generate:rules 生成，勿手改",
    "",
  ];
  let current = "";
  for (const entry of entries.values()) {
    if (entry.group !== current) {
      current = entry.group;
      lines.push("", `# ── ${current} ──`);
    }
    lines.push(`${qxLine(entry)}${entry.note ? "   ; " + entry.note : ""}`);
  }
  return lines.join("\n") + "\n";
}

function buildSurge(entries) {
  const lines = [
    "# fw-modules 站点域名 · Surge / Loon / Stash / Shadowrocket",
    "# 用法：作为规则集文件引用，或粘进 [Rule] 段",
    "#   https://raw.githubusercontent.com/HYJ1817/fw-modules/main/rules/fw-modules.surge.list",
    `# 策略名占位符 ${POLICY}：换成你自己的策略组`,
    "# 由 npm run generate:rules 生成，勿手改",
    "",
  ];
  let current = "";
  for (const entry of entries.values()) {
    if (entry.group !== current) {
      current = entry.group;
      lines.push("", `# ── ${current} ──`);
    }
    lines.push(surgeLine(entry));
  }
  return lines.join("\n") + "\n";
}

function buildClash(entries) {
  const lines = [
    "# fw-modules 站点域名 · Clash / Mihomo rule-provider（classical）",
    "# 用法：",
    "#   rule-providers:",
    "#     fw-modules:",
    "#       type: http",
    "#       behavior: classical",
    "#       url: https://raw.githubusercontent.com/HYJ1817/fw-modules/main/rules/fw-modules.clash.yaml",
    "#       path: ./rules/fw-modules.yaml",
    "#       interval: 86400",
    "#   rules:",
    "#     - RULE-SET,fw-modules,PROXY",
    "# 由 npm run generate:rules 生成，勿手改",
    "payload:",
  ];
  let current = "";
  for (const entry of entries.values()) {
    if (entry.group !== current) {
      current = entry.group;
      lines.push("", `  # ── ${current} ──`);
    }
    if (entry.keyword) lines.push(`  - DOMAIN-KEYWORD,${entry.suffix}`);
    else lines.push(`  - '+.${entry.suffix}'`);
  }
  return lines.join("\n") + "\n";
}

function main() {
  const entries = collect();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const targets = [
    ["fw-modules.qx.list", buildQx(entries)],
    ["fw-modules.surge.list", buildSurge(entries)],
    ["fw-modules.clash.yaml", buildClash(entries)],
  ];
  for (const [name, content] of targets) {
    fs.writeFileSync(path.join(OUT_DIR, name), content);
    console.log(`✓ rules/${name}  ${content.split("\n").length - 1} 行`);
  }
  console.log(`  域名 ${entries.size} 个，分 ${GROUPS.length} 组，策略占位符 ${POLICY}`);
}

main();
