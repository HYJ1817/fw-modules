'use strict';

const fs = require('fs');
const vm = require('vm');

const WIDGET_FILE = './widgets/avbebe-resource.js';
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

async function discoverPlayablePost() {
  const url = 'https://avbebe.com/wp-json/wp/v2/posts?categories=13684&per_page=10&_fields=id,title,content';
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', Referer: 'https://avbebe.com/' },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`发现影片失败: HTTP ${response.status}`);
  const posts = await response.json();
  const post = posts.find((item) => /data-item=/.test((item.content && item.content.rendered) || ''));
  if (!post) throw new Error('同人動畫分类里没找到 FV Player 影片');
  return post;
}

(async () => {
  const metadata = sandbox.WidgetMetadata;
  check('播放源注册 loadResource stream', metadata.modules[0].id === 'loadResource' && metadata.modules[0].type === 'stream');
  check('播放源不带搜索', !metadata.search);
  check('站点域名正确', metadata.site === 'https://avbebe.com', metadata.site);

  const post = await discoverPlayablePost();
  console.log('    发现可播放影片 #' + post.id + ' ' + String((post.title && post.title.rendered) || '').slice(0, 30));

  const streams = await sandbox.loadResource({ link: 'avbebe:' + post.id });
  check('链接返回线路', Array.isArray(streams) && streams.length > 0, 'len=' + (streams && streams.length));
  check('线路是 HLS 直链', /\.m3u8/i.test(streams[0].url), streams[0].url);
  check('线路名称标注站点', /avbebe/i.test(streams[0].name), streams[0].name);
  check('线路带 Referer 头', streams[0].customHeaders && streams[0].customHeaders.Referer === 'https://avbebe.com/');
  console.log('    ' + streams[0].name + ' -> ' + streams[0].url);

  const byUrl = await sandbox.loadResource({ link: 'https://avbebe.com/archives/' + post.id });
  check('文章链接同样可用', Array.isArray(byUrl) && byUrl.length > 0, 'len=' + (byUrl && byUrl.length));

  const byEncoded = await sandbox.loadResource({ link: encodeURIComponent('avbebe:' + post.id) });
  check('URL 编码的 id 也能解析', Array.isArray(byEncoded) && byEncoded.length > 0, 'len=' + (byEncoded && byEncoded.length));

  const byArchiveUrl = await sandbox.loadResource({ videoUrl: 'https://avbebe.com/archives/' + post.id });
  check('videoUrl 里的文章链接也能解析', Array.isArray(byArchiveUrl) && byArchiveUrl.length > 0, 'len=' + (byArchiveUrl && byArchiveUrl.length));

  const ranged = await fetch(streams[0].url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://avbebe.com/',
      Range: 'bytes=0-512',
    },
    signal: AbortSignal.timeout(30000),
  });
  check('直链可访问', ranged.status === 200 || ranged.status === 206, String(ranged.status));
  const playlist = await ranged.text();
  check('返回的是播放列表', playlist.indexOf('#EXTM3U') === 0, playlist.slice(0, 60));

  check('关闭多源时返回空', (await sandbox.loadResource({ link: 'avbebe:' + post.id, multiSource: 'disabled' })).length === 0);
  check('非法链接返回空', (await sandbox.loadResource({ link: 'avbebe:not-a-number' })).length === 0);
  check('缺链接返回空', (await sandbox.loadResource({})).length === 0);

  console.log('\nAvbebe 播放源模块 ' + passed + ' 项通过');
})().catch((error) => {
  console.error('Avbebe 播放源模块测试失败: ' + (error.stack || error.message));
  process.exit(1);
});
