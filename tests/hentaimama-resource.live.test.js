'use strict';

const fs = require('fs');
const vm = require('vm');

const WIDGET_FILE = './widgets/hentaimama-resource.js';
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

async function mockPost(url, body, options) {
  const response = await fetch(url, {
    method: 'POST',
    headers: (options && options.headers) || {},
    body,
    signal: AbortSignal.timeout(40000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return { data: text, status: response.status };
}

const sandbox = {
  Widget: { http: { get: mockGet, post: mockPost } },
  console, Date, Promise, JSON, Math, URL,
  encodeURIComponent, decodeURIComponent, atob,
  String, Number, parseInt, Array, Object, Error, RegExp, setTimeout,
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

  const direct = await sandbox.loadResource({
    link: 'https://hentaimama.io/episodes/pure-x-holic-junketsu-otome-to-konin-kankei-the-animation-episode-2/',
  });
  check('分集链接返回线路', Array.isArray(direct) && direct.length > 0, 'len=' + (direct && direct.length));
  check('线路是直链', /https?:\/\/.+\.(m3u8|mp4)/i.test(direct[0].url), direct[0].url);
  console.log('    ' + direct[0].name + ' -> ' + direct[0].url);

  const ranged = await fetch(direct[0].url, {
    headers: { Range: 'bytes=0-1023', 'User-Agent': 'Mozilla/5.0', Referer: 'https://hentaimama.io/' },
    signal: AbortSignal.timeout(30000),
  });
  check('直链可访问', ranged.status === 200 || ranged.status === 206, String(ranged.status));

  const show = await sandbox.loadResource({ seriesName: 'Pure x Holic' });
  check('按系列名检索也返回线路', Array.isArray(show) && show.length > 0, 'len=' + (show && show.length));

  // fw-all 路由改写后的形态：无前导斜杠的 tvshows 路径，必须仍能解析到分集
  const routed = await sandbox.loadResource({
    link: 'hentaimama:tvshows/pure-x-holic-junketsu-otome-to-konin-kankei-the-animation/',
  });
  check('tvshows 路径形式返回线路', Array.isArray(routed) && routed.length > 0, 'len=' + (routed && routed.length));
  check('tvshows 线路是直链', /https?:\/\/.+\.(m3u8|mp4)/i.test(routed[0].url), routed[0].url);

  console.log('\nHentaimama 播放源模块 ' + passed + ' 项通过');
})().catch((error) => {
  console.error('Hentaimama 播放源模块测试失败: ' + (error.stack || error.message));
  process.exit(1);
});
