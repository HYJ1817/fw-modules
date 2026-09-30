'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const WIDGET_FILE = './widgets/xchina-resource.js';
const code = fs.readFileSync(WIDGET_FILE, 'utf8');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cloudflare 会把 Node undici 的 TLS/请求指纹拦成 403 Challenge，
// 同一时刻 curl.exe 能拿到 200。因此这里的传输层走 curl，
// 模块逻辑（构造地址、请求头、解析）照常被真实站点验证。
let tmpCounter = 0;
function curlGet(url, headers) {
  const file = path.join(os.tmpdir(), `fw-xchina-${process.pid}-${tmpCounter++}.html`);
  const args = ['-s', '-m', '45', '-L', '-o', file, '-w', '%{http_code}'];
  Object.keys(headers || {}).forEach((key) => args.push('-H', `${key}: ${headers[key]}`));
  args.push(url);
  const status = Number(execFileSync('curl.exe', args, { encoding: 'utf8' }).trim());
  const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  try { fs.unlinkSync(file); } catch (error) { /* 已清理 */ }
  if (status >= 400) throw new Error(`HTTP ${status}: ${url}`);
  return { data: body, status };
}

async function mockGet(url, options) {
  return curlGet(url, (options && options.headers) || {});
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

async function discoverHash() {
  const html = curlGet('https://xchina.co/videos.html', {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    Referer: 'https://xchina.co/',
  }).data;
  const match = html.match(/\/video\/id-([a-f0-9]+)\.html/);
  if (!match) throw new Error('首页没有取到影片 hash（可能被风控拦截）');
  return match[1];
}

(async () => {
  const metadata = sandbox.WidgetMetadata;
  check('播放源注册 loadResource stream', metadata.modules[0].id === 'loadResource' && metadata.modules[0].type === 'stream');
  check('播放源不带搜索', !metadata.search);
  check('站点域名正确', metadata.site === 'https://xchina.co', metadata.site);

  const hash = await discoverHash();
  console.log('    发现影片 hash: ' + hash);
  await wait(900);

  const streams = await sandbox.loadResource({ link: 'xchina:' + hash });
  check('链接返回线路', Array.isArray(streams) && streams.length > 0, 'len=' + (streams && streams.length));
  check('线路按约定拼出 master 地址', streams[0].url === 'https://xchina.co/hls/' + hash + '/master.m3u8', streams[0].url);
  check('线路带详情页 Referer', streams[0].customHeaders && streams[0].customHeaders.Referer === 'https://xchina.co/video/id-' + hash + '.html', JSON.stringify(streams[0].customHeaders));
  console.log('    ' + streams[0].name + ' -> ' + streams[0].url);
  await wait(900);

  const playlist = curlGet(streams[0].url, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Referer: 'https://xchina.co/video/id-' + hash + '.html',
    Range: 'bytes=0-512',
  }).data;
  check('返回的是播放列表', playlist.indexOf('#EXTM3U') === 0, playlist.slice(0, 60));
  check('播放列表里有分片变体', /index\.m3u8/.test(playlist), playlist.slice(0, 200));

  check('关闭多源时返回空', (await sandbox.loadResource({ link: 'xchina:' + hash, multiSource: 'disabled' })).length === 0);
  check('非法链接返回空', (await sandbox.loadResource({ link: 'xchina:zz' })).length === 0);
  check('缺链接返回空', (await sandbox.loadResource({})).length === 0);

  console.log('\nXChina 播放源模块 ' + passed + ' 项通过');
})().catch((error) => {
  console.error('XChina 播放源模块测试失败: ' + (error.stack || error.message));
  process.exit(1);
});
