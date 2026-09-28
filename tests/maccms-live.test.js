#!/usr/bin/env node
/**
 * widgets/maccms-source.js 实网验证（会真实请求 jyzyapi.com）
 * 运行：npm run test:maccms:live
 *
 * 与 tests/maccms.test.js 的分工：
 *   maccms.test.js       纯离线，用桩件验证逻辑分支
 *   本文件               打真实接口，验证端到端可用性
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'widgets', 'maccms-source.js');
const SOURCE = fs.readFileSync(TARGET, 'utf8');

let passed = 0;
let failed = 0;
const failures = [];

function ok(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ' —— ' + detail : ''}`);
    console.log(`  FAIL  ${name}${detail ? ' —— ' + detail : ''}`);
  }
}

/** 桩件：stringMode 模拟宿主对 text/html 不做 JSON 解析的情形。 */
function makeWidget({ stringMode = true } = {}) {
  const store = new Map();
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    http: {
      async get(url, options = {}) {
        calls++;
        const response = await fetch(url, { headers: options.headers || {} });
        const text = await response.text();
        let data;
        if (stringMode) {
          data = text;
        } else {
          try {
            data = JSON.parse(text);
          } catch (error) {
            data = text;
          }
        }
        return { data, status: response.status, headers: {} };
      },
    },
    storage: {
      get: (key) => (store.has(key) ? store.get(key) : null),
      set: (key, value) => store.set(key, value),
    },
  };
}

function loadWidget(widget) {
  const factory = new Function(
    'Widget',
    'console',
    `${SOURCE}\n;return { metadata: WidgetMetadata, loadResource: loadResource };`
  );
  return factory(widget, { log: () => {}, warn: () => {}, error: () => {} });
}

(async () => {
  console.log(`目标组件：${path.relative(ROOT, TARGET)}`);
  console.log('');

  // -------------------------------------------------------------------------
  console.log('1. 组件元数据');
  const probeWidget = makeWidget();
  const instance = loadWidget(probeWidget);
  ok('id 正确', instance.metadata.id === 'hyj1817.maccms.resource', instance.metadata.id);
  ok(
    '声明了 loadResource / stream 模块',
    instance.metadata.modules.some((m) => m.id === 'loadResource' && m.type === 'stream')
  );
  const multiSource = (instance.metadata.globalParams || []).find((p) => p.name === 'multiSource');
  ok('multiSource 有默认值 enabled', multiSource && multiSource.value === 'enabled', JSON.stringify(multiSource));

  // -------------------------------------------------------------------------
  console.log('');
  console.log('2. 端到端：命中 + 线路可用（响应为原始字符串）');
  const widgetA = makeWidget({ stringMode: true });
  const sourceA = loadWidget(widgetA);

  const yearFan = await sourceA.loadResource({
    seriesName: '斗破苍穹 年番',
    type: 'tv',
    season: 1,
    episode: 1,
    multiSource: 'enabled',
  });
  ok('「斗破苍穹 年番」第 1 集有结果', yearFan.length > 0, `${yearFan.length} 条`);
  if (yearFan.length) {
    ok('返回的是 HLS 直链', /index\.m3u8/.test(yearFan[0].url), yearFan[0].url);
    ok('线路名含集号', yearFan[0].name.includes('第1集'), yearFan[0].name);
  }

  // -------------------------------------------------------------------------
  console.log('');
  console.log('3. 端到端：翻页命中（精确片名不在第 1 页）');
  const widgetB = makeWidget({ stringMode: true });
  const sourceB = loadWidget(widgetB);
  const kuangbiao = await sourceB.loadResource({
    seriesName: '狂飙',
    type: 'tv',
    season: 1,
    episode: 1,
    multiSource: 'enabled',
  });
  ok('「狂飙」第 1 集有结果', kuangbiao.length > 0, `${kuangbiao.length} 条`);
  if (kuangbiao.length) {
    ok('命中的不是「狂飙1998」等旁支', !/^狂飙\d/.test(kuangbiao[0].description), kuangbiao[0].description);
    ok('集号正确为第 1 集', kuangbiao[0].name.includes('第1集'), kuangbiao[0].name);
    ok('触发了翻页（请求次数 > 1）', widgetB.calls > 1, `${widgetB.calls} 次请求`);
  }

  // -------------------------------------------------------------------------
  console.log('');
  console.log('4. 响应形态无关性：已解析对象应得到相同结果');
  const sourceC = loadWidget(makeWidget({ stringMode: false }));
  const asObject = await sourceC.loadResource({
    seriesName: '斗破苍穹 年番',
    type: 'tv',
    season: 1,
    episode: 1,
    multiSource: 'enabled',
  });
  ok('字符串与对象两种形态结果一致', asObject.length === yearFan.length, `${asObject.length} vs ${yearFan.length}`);

  // -------------------------------------------------------------------------
  console.log('');
  console.log('5. 参数缺失容错：未注入 multiSource 仍应工作');
  const sourceD = loadWidget(makeWidget({ stringMode: true }));
  const noMulti = await sourceD.loadResource({ seriesName: '斗破苍穹 年番', type: 'tv', season: 1, episode: 1 });
  ok('未注入 multiSource 仍有结果（默认放行）', noMulti.length > 0, `${noMulti.length} 条`);

  const disabled = await sourceD.loadResource({
    seriesName: '斗破苍穹 年番',
    type: 'tv',
    season: 1,
    episode: 1,
    multiSource: 'disabled',
  });
  ok('multiSource=disabled 返回空', disabled.length === 0, `${disabled.length} 条`);

  // -------------------------------------------------------------------------
  console.log('');
  console.log('6. 反例：查无此片必须返回空，不能误匹配');
  const sourceE = loadWidget(makeWidget({ stringMode: true }));
  const missing = await sourceE.loadResource({
    seriesName: '不存在的片子XYZ',
    type: 'tv',
    season: 1,
    episode: 1,
    multiSource: 'enabled',
  });
  ok('不存在的片名返回空', missing.length === 0, `${missing.length} 条`);

  // -------------------------------------------------------------------------
  console.log('');
  if (failures.length) {
    console.log('失败明细：');
    for (const item of failures) console.log('  ✗ ' + item);
    console.log('');
  }
  console.log(`maccms 实网验证：${passed} 通过 / ${failed} 失败`);
  process.exitCode = failed ? 1 : 0;
})();
