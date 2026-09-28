#!/usr/bin/env node
/**
 * lib/maccms.js 单元测试（纯离线，不访问网络）
 * 运行：node tests/maccms.test.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'lib', 'maccms.js'), 'utf8');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) {
    passed++;
  } else {
    failed++;
    failures.push(`${name}\n      期望 ${b}\n      实际 ${a}`);
  }
}

function checkTrue(name, condition, detail) {
  if (condition) passed++;
  else {
    failed++;
    failures.push(`${name}${detail ? '\n      ' + detail : ''}`);
  }
}

/** 用给定桩件加载适配层。 */
function loadAdapter(widgetStub) {
  const factory = new Function('Widget', 'console', `${SOURCE}\n;return Maccms;`);
  return factory(widgetStub, { log: () => {}, warn: () => {}, error: () => {} });
}

const noopWidget = {
  http: { get: async () => ({ data: null }), post: async () => ({ data: null }) },
  storage: { get: () => null, set: () => {} },
};
const M = loadAdapter(noopWidget);

// ---------------------------------------------------------------------------
console.log('— unwrap：响应解包 —');
// ---------------------------------------------------------------------------

check('字符串 JSON → 对象', M.unwrap({ data: '{"list":[],"total":3}' }), { list: [], total: 3 });
check('已解析对象 → 原样返回', M.unwrap({ data: { list: [1] } }), { list: [1] });
check('空字符串 → null', M.unwrap({ data: '   ' }), null);
check('非法 JSON → null', M.unwrap({ data: '<html>502</html>' }), null);
check('null 响应 → null', M.unwrap(null), null);
check('裸对象（无 data 包装）→ 原样返回', M.unwrap({ list: [2] }), { list: [2] });

// ---------------------------------------------------------------------------
console.log('— buildUrl：查询串拼接 —');
// ---------------------------------------------------------------------------

check('基础拼接', M.buildUrl('https://a.com/api', { ac: 'detail', wd: '斗破' }), 'https://a.com/api?ac=detail&wd=%E6%96%97%E7%A0%B4');
check('已有 ? 时用 &', M.buildUrl('https://a.com/api?x=1', { wd: 'a' }), 'https://a.com/api?x=1&wd=a');
check('跳过空值', M.buildUrl('https://a.com/api', { ac: 'detail', wd: '', pg: null }), 'https://a.com/api?ac=detail');
check('全空则原样返回', M.buildUrl('https://a.com/api', { wd: '' }), 'https://a.com/api');

// ---------------------------------------------------------------------------
console.log('— normalize / clean —');
// ---------------------------------------------------------------------------

check('去零宽字符', M.normalize('\u200b斗破苍穹\u200b'), '斗破苍穹');
check('去空格标点并小写', M.normalize('F1：狂飙 飞车'), 'f1狂飙飞车');
check('全角冒号与书名号', M.normalize('《狂飙》'), '狂飙');
check('clean 仅去零宽与首尾空白', M.clean('\u200b 斗破苍穹 年番 \u200b'), '斗破苍穹 年番');

// ---------------------------------------------------------------------------
console.log('— parseSeason：季号解析 —');
// ---------------------------------------------------------------------------

check('中文季号', M.parseSeason('斗破苍穹第二季'), { base: '斗破苍穹', season: 2 });
check('阿拉伯季号', M.parseSeason('斗破苍穹 第5季·动态漫'), { base: '斗破苍穹 ·动态漫', season: 5 });
check('部 也识别', M.parseSeason('某剧第一部'), { base: '某剧', season: 1 });
check('结尾 1~2 位数字当季号', M.parseSeason('斗破苍穹 特别篇1'), { base: '斗破苍穹 特别篇', season: 1 });
// 关键回归：4 位年份不得被当成季号，否则「狂飙1998」会与「狂飙」撞车
check('4 位年份不剥离（回归）', M.parseSeason('狂飙1998'), { base: '狂飙1998', season: 1 });
check('无季号', M.parseSeason('狂飙'), { base: '狂飙', season: 1 });
check('空输入', M.parseSeason(''), { base: '', season: 1 });

// ---------------------------------------------------------------------------
console.log('— parseEpisode：集数解析 —');
// ---------------------------------------------------------------------------

check('第01集', M.parseEpisode('第01集'), 1);
check('第1集', M.parseEpisode('第1集'), 1);
check('第 12 集（含空格）', M.parseEpisode('第 12 集'), 12);
check('第3话', M.parseEpisode('第3话'), 3);
check('EP03', M.parseEpisode('EP03'), 3);
check('纯数字', M.parseEpisode('07'), 7);
check('正片 → null', M.parseEpisode('正片'), null);
check('正片 → 回退值', M.parseEpisode('正片', 1), 1);

// ---------------------------------------------------------------------------
console.log('— isDirectStream —');
// ---------------------------------------------------------------------------

checkTrue('index.m3u8 为直链', M.isDirectStream('https://h/a/index.m3u8') === true);
checkTrue('.mp4 为直链', M.isDirectStream('https://h/a.mp4') === true);
checkTrue('带查询串的 m3u8', M.isDirectStream('https://h/a/index.m3u8?token=1') === true);
checkTrue('解析型网页不是直链', M.isDirectStream('https://hd.kuktxu.com/play/9b6nMrRb') === false);
checkTrue('非 http 协议不是直链', M.isDirectStream('ftp://h/a.m3u8') === false);

// ---------------------------------------------------------------------------
console.log('— parseSites —');
// ---------------------------------------------------------------------------

check(
  '文本行解析',
  M.parseSites('金鹰资源,https://jyzyapi.com/api.php/provide/vod/'),
  [{ title: '金鹰资源', value: 'https://jyzyapi.com/api.php/provide/vod/' }]
);
check(
  '多行 + 过滤非法行',
  M.parseSites('A,https://a.com/\n坏行\nB,https://b.com/\nC,不是网址'),
  [
    { title: 'A', value: 'https://a.com/' },
    { title: 'B', value: 'https://b.com/' },
  ]
);
check(
  'JSON 数组',
  M.parseSites('[{"title":"A","url":"https://a.com/"}]'),
  [{ title: 'A', value: 'https://a.com/' }]
);
check('空输入走 fallback', M.parseSites('', 'D,https://d.com/'), [{ title: 'D', value: 'https://d.com/' }]);
check('两者都空 → []', M.parseSites('', ''), []);

// ---------------------------------------------------------------------------
console.log('— scoreTitle：匹配打分（核心） —');
// ---------------------------------------------------------------------------

const wanted = { raw: '斗破苍穹', base: '斗破苍穹', season: 1 };
check('全名一致 = 300', M.scoreTitle('斗破苍穹', wanted), 300);
check('主名+季号一致 = 200', M.scoreTitle('斗破苍穹 第1季', wanted), 200);
check('主名一致季号不同 = 150', M.scoreTitle('斗破苍穹 第2季', wanted), 150);
check('包含关系 = 60', M.scoreTitle('斗破苍穹年番', wanted), 60);
check('无关 = -1', M.scoreTitle('狂飙', wanted), -1);

// 关键回归：年份不得造成误匹配
check('「狂飙1998」查「狂飙」只能是模糊 60（回归）', M.scoreTitle('狂飙1998', { raw: '狂飙', base: '狂飙', season: 1 }), 60);
check('空格差异仍算全名一致', M.scoreTitle('斗破苍穹 年番', { raw: '斗破苍穹年番', base: '斗破苍穹年番', season: 1 }), 300);
check('零宽字符差异仍算全名一致', M.scoreTitle('\u200b斗破苍穹\u200b', wanted), 300);

check('quality: 300 → exact', M.matchQuality(300), 'exact');
check('quality: 200 → exact', M.matchQuality(200), 'exact');
check('quality: 150 → base', M.matchQuality(150), 'base');
check('quality: 60 → fuzzy', M.matchQuality(60), 'fuzzy');

// ---------------------------------------------------------------------------
console.log('— collectLines：线路拆解 —');
// ---------------------------------------------------------------------------

const lines = M.collectLines({
  vod_play_from: 'jinyingm3u8$$$jinyingyun',
  vod_play_url:
    '第01集$https://h/1/index.m3u8#第02集$https://h/2/index.m3u8$$$第01集$https://h/p1#第02集$https://h/p2',
});
check('线路数量', lines.length, 4);
check('首条线路名', lines[0].sourceName, 'jinyingm3u8');
check('首条集名', lines[0].label, '第01集');
check('第三条线路名', lines[2].sourceName, 'jinyingyun');
checkTrue('第三条是解析型', M.isDirectStream(lines[2].url) === false);

const single = M.collectLines({ vod_play_from: '', vod_play_url: '正片$https://h/a/index.m3u8' });
check('无 play_from 时给默认线路名', single[0].sourceName, '线路1');

check('空 play_url → []', M.collectLines({ vod_play_url: '' }), []);

// ---------------------------------------------------------------------------
console.log('— toResource —');
// ---------------------------------------------------------------------------

const directRes = M.toResource(
  { sourceName: 'jinyingm3u8', label: '第1集', url: 'https://h/1/index.m3u8' },
  '金鹰资源',
  '狂飙',
  1,
  '',
  'exact'
);
checkTrue('直链：名称含站点与集号', directRes.name === '金鹰资源 · jinyingm3u8 · 第1集', directRes.name);
checkTrue('直链：描述标注 HLS', directRes.description.includes('HLS 直链'), directRes.description);
checkTrue('直链：URL 未改写', directRes.url === 'https://h/1/index.m3u8');

const noParse = M.toResource({ sourceName: 's', label: '第1集', url: 'https://h/play/x' }, '站', '剧', 1, '', 'exact');
check('解析型且未配解析接口 → null', noParse, null);

const withParse = M.toResource(
  { sourceName: 's', label: '第1集', url: 'https://h/play/x' },
  '站',
  '剧',
  1,
  'https://p/?url={url}',
  'exact'
);
checkTrue('解析型：URL 经解析接口改写', withParse.url === 'https://p/?url=' + encodeURIComponent('https://h/play/x'), withParse.url);
checkTrue('解析型：名称带解析后缀', withParse.name.endsWith('· 解析'), withParse.name);

const fuzzy = M.toResource({ sourceName: 's', label: '第1集', url: 'https://h/1/index.m3u8' }, '站', '剧', 1, '', 'fuzzy');
checkTrue('模糊匹配：描述显式标注', fuzzy.description.includes('模糊匹配'), fuzzy.description);

// ---------------------------------------------------------------------------
console.log('— filterByEpisode —');
// ---------------------------------------------------------------------------

const pool = [
  { url: 'u1', _ep: 1 },
  { url: 'u2', _ep: 2 },
  { url: 'u3', _ep: 2 },
];
check('按集过滤', M.filterByEpisode(pool, 2, 'tv').length, 2);
check('电影不过滤', M.filterByEpisode(pool, null, 'movie').length, 3);
check('集号不存在且非首集 → 空', M.filterByEpisode(pool, 9, 'tv').length, 0);
check('请求首集但源站首集编号非 1 → 回退首集', M.filterByEpisode([{ url: 'a', _ep: 5 }, { url: 'b', _ep: 6 }], 1, 'tv').length, 1);

// ---------------------------------------------------------------------------
console.log('— loadResources：端到端（桩件） —');
// ---------------------------------------------------------------------------

function makeStub({ data, stringMode = true, storage = {} }) {
  return {
    http: {
      async get(url) {
        const body = typeof data === 'function' ? data(url) : data;
        const payload = stringMode ? JSON.stringify(body) : body;
        return { data: payload };
      },
    },
    storage: {
      get: (k) => (k in storage ? storage[k] : null),
      set: (k, v) => {
        storage[k] = v;
      },
    },
  };
}

const SAMPLE = {
  code: 1,
  page: 1,
  pagecount: 1,
  limit: '20',
  total: 1,
  list: [
    {
      vod_name: '狂飙',
      vod_play_from: 'jinyingm3u8',
      vod_play_url: '第01集$https://h/1/index.m3u8#第02集$https://h/2/index.m3u8',
    },
  ],
};

(async () => {
  const SITES = '测试站,https://t.com/api.php/provide/vod/';

  // 1. 未注入 multiSource 时必须仍然工作（默认放行）
  let M2 = loadAdapter(makeStub({ data: SAMPLE }));
  let result = await M2.loadResources({ seriesName: '狂飙', type: 'tv', episode: 1 }, { defaultSites: SITES });
  checkTrue('未注入 multiSource 仍有结果（默认放行）', result.length === 1, `实际 ${result.length} 条`);

  // 2. 显式 disabled 必须返回空
  M2 = loadAdapter(makeStub({ data: SAMPLE }));
  result = await M2.loadResources(
    { seriesName: '狂飙', type: 'tv', episode: 1, multiSource: 'disabled' },
    { defaultSites: SITES }
  );
  check('multiSource=disabled → 空', result.length, 0);

  // 3. 字符串响应与对象响应结果一致
  const stubString = loadAdapter(makeStub({ data: SAMPLE, stringMode: true }));
  const stubObject = loadAdapter(makeStub({ data: SAMPLE, stringMode: false }));
  const r1 = await stubString.loadResources({ seriesName: '狂飙', type: 'tv', episode: 1 }, { defaultSites: SITES });
  const r2 = await stubObject.loadResources({ seriesName: '狂飙', type: 'tv', episode: 1 }, { defaultSites: SITES });
  check('字符串/对象两种响应形态结果一致', r1.length === 1 && r2.length === 1, true);

  // 4. 响应是 HTML（网关错误页）时不能抛异常
  M2 = loadAdapter(makeStub({ data: '<html>502 Bad Gateway</html>' }));
  result = await M2.loadResources({ seriesName: '狂飙', type: 'tv', episode: 1 }, { defaultSites: SITES });
  check('网关错误页 → 空列表而非异常', result.length, 0);

  // 5. 站点全部失败不能抛异常
  const failing = loadAdapter({
    http: {
      async get() {
        throw new Error('网络不可达');
      },
    },
    storage: { get: () => null, set: () => {} },
  });
  let threw = null;
  try {
    result = await failing.loadResources({ seriesName: '狂飙', type: 'tv', episode: 1 }, { defaultSites: SITES });
  } catch (e) {
    threw = e;
  }
  checkTrue('站点失败被吞掉，不外抛', threw === null && result.length === 0, threw ? threw.message : '');

  // 6. onError 回调应被触发
  let errSite = null;
  await failing.loadResources({ seriesName: '狂飙', type: 'tv', episode: 1 }, { defaultSites: SITES, onError: (s) => (errSite = s.title) });
  check('onError 回调收到站点名', errSite, '测试站');

  // 7. 无片名 → 空
  M2 = loadAdapter(makeStub({ data: SAMPLE }));
  result = await M2.loadResources({ type: 'tv' }, { defaultSites: SITES });
  check('无片名 → 空', result.length, 0);

  // 8. 分页：第 1 页没有，第 2 页才有
  const paged = loadAdapter(
    makeStub({
      data: (url) => {
        const page = (url.match(/[?&]pg=(\d+)/) || [])[1] || '1';
        if (page === '1') {
          return { page: 1, pagecount: 2, total: 21, list: [{ vod_name: '狂飙之别的', vod_play_url: '第01集$https://h/x/index.m3u8', vod_play_from: 's' }] };
        }
        return { page: 2, pagecount: 2, total: 21, list: [SAMPLE.list[0]] };
      },
    })
  );
  result = await paged.loadResources({ seriesName: '狂飙', type: 'tv', episode: 1 }, { defaultSites: SITES, maxPages: 3 });
  checkTrue('翻页后命中第 2 页的精确片名', result.length === 1, `实际 ${result.length} 条`);

  // 9. 缓存命中不重复请求
  const storage = {};
  const counting = loadAdapter({
    http: {
      async get() {
        counting.calls = (counting.calls || 0) + 1;
        return { data: JSON.stringify(SAMPLE) };
      },
    },
    storage: {
      get: (k) => (k in storage ? storage[k] : null),
      set: (k, v) => {
        storage[k] = v;
      },
    },
  });
  await counting.loadResources({ seriesName: '狂飙', type: 'tv', episode: 1 }, { defaultSites: SITES });
  const afterFirst = counting.calls;
  await counting.loadResources({ seriesName: '狂飙', type: 'tv', episode: 1 }, { defaultSites: SITES });
  checkTrue('第二次命中缓存，无新增请求', counting.calls === afterFirst, `${afterFirst} → ${counting.calls}`);

  // -------------------------------------------------------------------------
  console.log('');
  if (failures.length) {
    console.log('失败明细：');
    for (const f of failures) console.log('  ✗ ' + f);
    console.log('');
  }
  console.log(`maccms 单元测试：${passed} 通过 / ${failed} 失败`);
  process.exitCode = failed ? 1 : 0;
})();
