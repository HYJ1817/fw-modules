'use strict';

const fs = require('fs');
const vm = require('vm');

const WIDGET_FILE = './widgets/yinhentai-resource.js';
const code = fs.readFileSync(WIDGET_FILE, 'utf8');

async function mockGet(url, options) {
  const response = await fetch(url, {
    headers: (options && options.headers) || {},
    signal: AbortSignal.timeout(40000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return { data: text, status: response.status };
}

const sandbox = {
  Widget: { http: { get: mockGet } },
  console, Date, Promise, JSON, Math, URL,
  encodeURIComponent, decodeURIComponent,
  String, Number, parseInt, Array, Object, Error, RegExp,
};
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: WIDGET_FILE });

let passed = 0;
function check(name, condition, detail) {
  if (!condition) throw new Error(name + (detail ? ': ' + detail : ''));
  passed++;
  console.log('  ok - ' + name);
}

(async () => {
  const metadata = sandbox.WidgetMetadata;
  check('播放源注册 loadResource stream', metadata.modules[0].id === 'loadResource' && metadata.modules[0].type === 'stream');

  const streams = await sandbox.loadResource({ link: 'yinhentai:407019', multiSource: 'enabled' });
  check('详情页返回线路', Array.isArray(streams) && streams.length > 0, 'len=' + (streams && streams.length));
  check('线路是直链', /https?:\/\/.+/i.test(streams[0].url), streams[0].url);
  check('线路不含网页型地址', !/\/watch\?v=|pixeldrain\.com\/u\//i.test(streams[0].url), streams[0].url);
  console.log('    ' + streams[0].name + ' -> ' + streams[0].url);

  const ranged = await fetch(streams[0].url, {
    headers: { Range: 'bytes=0-1023', 'User-Agent': 'Mozilla/5.0', Referer: 'https://yinhentai.com/' },
    method: 'GET',
    signal: AbortSignal.timeout(40000),
  });
  check('直链可访问', ranged.status === 200 || ranged.status === 206, String(ranged.status));
  const type = ranged.headers.get('content-type') || '';
  check('返回媒体类型', /video|mpegurl|octet-stream|mp4/i.test(type), type);

  const disabled = await sandbox.loadResource({ link: 'yinhentai:407019', multiSource: 'disabled' });
  check('禁用聚合时返回空数组', Array.isArray(disabled) && disabled.length === 0);

  console.log('\nYinHentai 播放源模块 ' + passed + ' 项通过');
})().catch((error) => {
  console.error('YinHentai 播放源模块测试失败: ' + (error.stack || error.message));
  process.exit(1);
});
