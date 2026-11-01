'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const WIDGET_FILE = './widgets/jable-resource.js';
const code = fs.readFileSync(WIDGET_FILE, 'utf8');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let tmpCounter = 0;
function curlGet(url, headers) {
  const file = path.join(os.tmpdir(), `fw-jable-${process.pid}-${tmpCounter++}.out`);
  const args = ['-s', '-m', '45', '-L', '-o', file, '-w', '%{http_code}'];
  Object.keys(headers || {}).forEach((key) => args.push('-H', `${key}: ${headers[key]}`));
  args.push(url);
  const status = Number(execFileSync('curl.exe', args, { encoding: 'utf8' }).trim());
  const body = fs.existsSync(file) ? fs.readFileSync(file) : Buffer.alloc(0);
  try { fs.unlinkSync(file); } catch (error) { /* 已清理 */ }
  if (status >= 400) throw new Error(`HTTP ${status}: ${url}`);
  return { data: body.toString('utf8'), status };
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

const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function discoverSlug() {
  const html = curlGet('https://fs1.app/latest-updates/', { 'User-Agent': UA_BROWSER }).data;
  const match = html.match(/\/videos\/([a-z0-9-]+)\//);
  if (!match) throw new Error('列表页没有取到影片 slug');
  return match[1];
}

(async () => {
  const metadata = sandbox.WidgetMetadata;
  check('播放源注册 loadResource stream', metadata.modules[0].id === 'loadResource' && metadata.modules[0].type === 'stream');
  check('播放源不带搜索', !metadata.search);
  check('站点域名正确', metadata.site === 'https://jable.tv', metadata.site);

  const slug = await discoverSlug();
  console.log('    发现影片 slug: ' + slug);
  await wait(700);

  const streams = await sandbox.loadResource({ link: 'jable:' + slug });
  check('链接返回线路', Array.isArray(streams) && streams.length > 0, 'len=' + (streams && streams.length));
  check('线路是 HLS 直链', /\.m3u8/.test(streams[0].url), streams[0].url);
  check('线路名称标注站点', /jable/i.test(streams[0].name), streams[0].name);
  check('线路带 Referer 与 Origin', !!streams[0].customHeaders && !!streams[0].customHeaders.Referer && !!streams[0].customHeaders.Origin);
  console.log('    ' + streams[0].name + ' -> ' + streams[0].url);

  await wait(700);
  const byUrl = await sandbox.loadResource({ link: 'https://jable.tv/videos/' + slug + '/' });
  check('详情页链接同样可用', Array.isArray(byUrl) && byUrl.length > 0, 'len=' + (byUrl && byUrl.length));

  await wait(700);
  const byEncoded = await sandbox.loadResource({ link: encodeURIComponent('jable:' + slug) });
  check('URL 编码的 id 也能解析', Array.isArray(byEncoded) && byEncoded.length > 0, 'len=' + (byEncoded && byEncoded.length));

  const direct = await sandbox.loadResource({ videoUrl: streams[0].url });
  check('已有直链时直接返回，不再取页', direct.length === 1 && direct[0].url === streams[0].url, direct.length && direct[0].url);

  // 端到端：按最坏情况用 okhttp UA、不带自定义头验证 播放列表 → 密钥 → 分片
  const okhttp = { 'User-Agent': 'okhttp/4.12.0' };
  const playlist = curlGet(streams[0].url, okhttp).data;
  check('播放器 UA(okhttp) 取到播放列表', playlist.indexOf('#EXTM3U') === 0, playlist.slice(0, 40));
  check('播放列表里有分片', /\.ts/.test(playlist), playlist.slice(0, 160));

  const base = streams[0].url.replace(/\/[^/]*$/, '/');
  const keyRel = (playlist.match(/URI="([^"]+)"/) || [])[1] || '';
  const segRel = (playlist.split('\n').find((row) => row && row[0] !== '#' && /\.ts/.test(row)) || '').trim();
  check('播放列表带 AES-128 密钥', !!keyRel, playlist.slice(0, 120));
  if (keyRel) {
    const keyAbs = /^https?:/.test(keyRel) ? keyRel : base + keyRel;
    const key = curlGet(keyAbs, okhttp).data;
    check('密钥用播放器 UA 能取到', key.length > 0 && key.charAt(0) !== '<', 'len=' + key.length);
  }
  if (segRel) {
    const segAbs = /^https?:/.test(segRel) ? segRel : base + segRel;
    const seg = curlGet(segAbs, okhttp).data;
    check('分片用播放器 UA 能取到', seg.length > 1000, 'len=' + seg.length);
  }

  check('关闭多源时返回空', (await sandbox.loadResource({ link: 'jable:' + slug, multiSource: 'disabled' })).length === 0);
  check('非法链接返回空', (await sandbox.loadResource({ link: 'jable:' })).length === 0);
  check('缺链接返回空', (await sandbox.loadResource({})).length === 0);

  console.log('\nJable 播放源模块 ' + passed + ' 项通过');
})().catch((error) => {
  console.error('Jable 播放源模块测试失败: ' + (error.stack || error.message));
  process.exit(1);
});
