'use strict';

const fs = require('fs');
const vm = require('vm');

const WIDGET_FILE = './widgets/missav-resource.js';
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
  check('站点域名已切换', metadata.site === 'https://missav.fans' && sandbox.BASE === 'https://missav.fans', metadata.site);

  const streams = await sandbox.loadResource({ link: 'https://missav.fans/dm44/cn/ssis-001' });
  check('详情页返回线路', Array.isArray(streams) && streams.length > 0, 'len=' + (streams && streams.length));
  check('线路是 HLS 直链', /\.m3u8/i.test(streams[0].url), streams[0].url);
  console.log('    ' + streams[0].name + ' -> ' + streams[0].url);

  const ranged = await fetch(streams[0].url, {
    headers: { Range: 'bytes=0-512', 'User-Agent': 'Mozilla/5.0', Referer: 'https://missav.fans/cn' },
    signal: AbortSignal.timeout(30000),
  });
  check('直链可访问', ranged.status === 200 || ranged.status === 206, String(ranged.status));
  const playlist = await ranged.text();
  check('返回的是播放列表', playlist.indexOf('#EXTM3U') === 0, playlist.slice(0, 40));

  console.log('\nMissAV 播放源模块 ' + passed + ' 项通过');
})().catch((error) => {
  console.error('MissAV 播放源模块测试失败: ' + (error.stack || error.message));
  process.exit(1);
});
