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
  check('首选是不校验 UA 的通用线路', streams[0].url === 'https://myjav.tv/hls/' + hash + '/master.m3u8', streams[0].url);
  check('通用线路 Referer 指向托管站', streams[0].customHeaders && streams[0].customHeaders.Referer === 'https://myjav.tv/', JSON.stringify(streams[0].customHeaders));
  check(
    '同时列出主站与镜像备选',
    streams.length === 3
      && streams[1].url === 'https://xchina.co/hls/' + hash + '/master.m3u8'
      && streams[2].url === 'https://tw.xchina.co/hls/' + hash + '/master.m3u8',
    streams.map((item) => item.url).join(',')
  );
  console.log('    ' + streams[0].name + ' -> ' + streams[0].url);
  await wait(900);

  const byEncoded = await sandbox.loadResource({ link: encodeURIComponent('xchina:' + hash) });
  check('URL 编码的 id 也能解析', byEncoded.length > 0 && byEncoded[0].url === 'https://myjav.tv/hls/' + hash + '/master.m3u8', byEncoded.length && byEncoded[0].url);
  await wait(900);

  const byHlsUrl = await sandbox.loadResource({ videoUrl: 'https://xchina.co/hls/' + hash + '/master.m3u8' });
  check('master 地址也能解析', byHlsUrl.length > 0 && byHlsUrl[0].url === 'https://myjav.tv/hls/' + hash + '/master.m3u8', byHlsUrl.length && byHlsUrl[0].url);
  await wait(900);

  // 端到端按最坏情况验证：播放器自带 okhttp UA、不带任何自定义头。
  // xchina.co 在这种条件下全链路 403（页面一直转圈），通用线路必须全通。
  const okhttpUA = 'okhttp/4.12.0';
  const playlist = curlGet(streams[0].url, { 'User-Agent': okhttpUA }).data;
  check('播放器 UA(okhttp) 取到播放列表', playlist.indexOf('#EXTM3U') === 0, playlist.slice(0, 60));
  check('播放列表里有分片变体', /index\.m3u8/.test(playlist), playlist.slice(0, 200));
  await wait(900);

  const variantPath = playlist.split('\n').find((row) => row && row[0] !== '#').trim();
  const variantUrl = /^https?:/.test(variantPath) ? variantPath : 'https://myjav.tv/hls/' + hash + '/' + variantPath;
  const variant = curlGet(variantUrl, { 'User-Agent': okhttpUA }).data;
  check('变体播放列表同样可取', variant.indexOf('#EXTM3U') === 0, variant.slice(0, 60));
  const keyUrl = (variant.match(/URI="([^"]+)"/) || [])[1];
  check('变体里带密钥地址', !!keyUrl, variant.slice(0, 240));
  const keyAbs = /^https?:/.test(keyUrl) ? keyUrl : (keyUrl.charAt(0) === '/' ? 'https://myjav.tv' + keyUrl : 'https://myjav.tv/hls/' + hash + '/' + keyUrl);
  const keyBody = curlGet(keyAbs, { 'User-Agent': okhttpUA }).data;
  check('密钥用播放器 UA 也能取到', Buffer.byteLength(keyBody, 'utf8') > 0 && !/^</.test(keyBody), keyBody.slice(0, 40));

  check('关闭多源时返回空', (await sandbox.loadResource({ link: 'xchina:' + hash, multiSource: 'disabled' })).length === 0);
  check('非法链接返回空', (await sandbox.loadResource({ link: 'xchina:zz' })).length === 0);
  check('缺链接返回空', (await sandbox.loadResource({})).length === 0);

  console.log('\nXChina 播放源模块 ' + passed + ' 项通过');
})().catch((error) => {
  console.error('XChina 播放源模块测试失败: ' + (error.stack || error.message));
  process.exit(1);
});
