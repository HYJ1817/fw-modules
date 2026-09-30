'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const WIDGET_FILE = './widgets/xchina.js';
const code = fs.readFileSync(WIDGET_FILE, 'utf8');
const memory = new Map();
const requestedUrls = [];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cloudflare 会把 Node undici 的 TLS/请求指纹拦成 403 Challenge，
// 同一时刻 curl.exe 能拿到 200。因此传输层走 curl，
// 模块逻辑（列表解析、分类、搜索、详情）照常被真实站点验证。
let tmpCounter = 0;
function curlGet(url, headers) {
  const file = path.join(os.tmpdir(), `fw-xchina-home-${process.pid}-${tmpCounter++}.html`);
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
  requestedUrls.push(url);
  return curlGet(url, (options && options.headers) || {});
}

const Widget = {
  http: { get: mockGet },
  storage: {
    get(key) { return memory.has(key) ? memory.get(key) : null; },
    set(key, value) { memory.set(key, value); },
  },
  sharedCache: {
    get(namespace, key) { return memory.get(namespace + ':' + key) || null; },
    set(namespace, key, value) { memory.set(namespace + ':' + key, value); },
  },
};

const sandbox = {
  Widget, console, Date, Promise, JSON, encodeURIComponent, decodeURIComponent,
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
  const moduleIds = metadata.modules.map((module) => module.id);
  check('首页模块不注册 loadResource', !moduleIds.includes('loadResource'), moduleIds.join(','));
  check('首页模块包含 latest/popular/categories', ['latest', 'popular', 'categories'].every((id) => moduleIds.includes(id)));
  check('首页模块包含搜索', metadata.search && metadata.search.functionName === 'search');

  const categoriesModule = metadata.modules.find((module) => module.id === 'categories');
  const categoryParam = categoriesModule && categoriesModule.params.find((param) => param.name === 'category');
  const expectedValues = [
    '/videos.html', '/videos/cat-cn.html', '/videos/cat-jav.html', '/videos/tag-sub.html',
    '/videos/sort-read.html', '/videos/sort-comment.html', '/videos/sort-length.html',
    '/videos/xs-1.html', '/videos/xs-2.html', '/videos/xs-3.html', '/videos/xs-4.html',
    '/videos/xs-5.html', '/videos/xs-6.html', '/videos/xs-7.html', '/videos/xs-8.html',
    '/videos/xs-9.html', '/videos/xs-10.html', '/videos/xs-11.html', '/videos/xs-12.html',
    '/videos/xs-13.html',
  ];
  check(
    '分类恰好是扒到的 20 个入口',
    categoryParam && JSON.stringify(categoryParam.enumOptions.map((option) => option.value)) === JSON.stringify(expectedValues),
    categoryParam && categoryParam.enumOptions.map((option) => option.value).join(',')
  );

  const latest = await sandbox.loadLatest({ page: 1 });
  check('最新列表非空', Array.isArray(latest) && latest.length > 0 && latest[0].type !== 'placeholder', 'len=' + latest.length);
  check('列表携带 xchina 链接', latest.every((item) => /^xchina:[a-f0-9]+$/.test(item.link)), latest[0].link);
  check('列表标题与系列名一致', latest.every((item) => item.title && item.seriesName === item.title));
  check('列表封面指向 r2 CDN', latest.every((item) => /^https:\/\/r2\.xchina\.download\/cover\//.test(item.posterPath)), latest[0].posterPath);
  console.log('    最新: ' + latest[0].title + ' (' + latest[0].link + ') ' + latest[0].durationText);

  await wait(900);
  const cn = await sandbox.loadCategory({ category: '/videos/cat-cn.html', page: 1 });
  check('国产分类非空', Array.isArray(cn) && cn.length > 0 && cn[0].type !== 'placeholder', 'len=' + cn.length);
  check('分类结果仍带可播链接', cn.every((item) => /^xchina:[a-f0-9]+$/.test(item.link)));

  await wait(900);
  const before = requestedUrls.length;
  const fallback = await sandbox.loadCategory({ category: '../../etc/passwd', page: -3 });
  check(
    '非法分类回退到首页列表第 1 页',
    requestedUrls.slice(before).some((url) => url.includes('/videos.html') && !url.includes('page=')),
    requestedUrls[before]
  );
  check('回退结果可用', Array.isArray(fallback) && fallback.length > 0 && fallback[0].type !== 'placeholder');

  const keyword = (latest[0].title.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '').slice(0, 4) || '');
  check('搜索关键词可用', keyword.length >= 2, keyword);
  await wait(900);
  const results = await sandbox.search({ keyword });
  check('搜索返回结果', Array.isArray(results) && results.length > 0 && results[0].type !== 'placeholder', 'keyword=' + keyword + ' len=' + results.length);
  check('搜索命中首条影片', results.some((item) => item.link === latest[0].link), results.map((item) => item.link).join(','));

  check('过短关键词给占位提示', (await sandbox.search({ keyword: 'x' }))[0].type === 'placeholder');
  check('空关键词给占位提示', (await sandbox.search({ keyword: '' }))[0].type === 'placeholder');

  await wait(900);
  const detail = await sandbox.loadDetail(latest[0].link);
  const masterRe = /^https:\/\/(?:tw\.)?xchina\.co\/hls\/[a-f0-9]+\/master\.m3u8$/;
  check('详情可打开', detail && detail.type === 'detail');
  check('详情直接绑定 master 地址', masterRe.test(detail.videoUrl), detail.videoUrl);
  check('详情播放器为 app', detail.playerType === 'app');
  check('详情带标题', !!detail.title && detail.title !== latest[0].link, detail.title);
  check('详情封面存在', /^https:/.test(detail.posterPath), detail.posterPath);
  check('详情带 Referer 头', detail.customHeaders && /^https:\/\/(?:tw\.)?xchina\.co\/video\/id-[a-f0-9]+\.html$/.test(detail.customHeaders.Referer), detail.customHeaders && detail.customHeaders.Referer);
  check('非法链接详情返回 null', (await sandbox.loadDetail('xchina:zz')) === null);

  check('成功取页后清空错误标记', sandbox.LAST_ERROR === '', sandbox.LAST_ERROR);
  check('错误文案带出 HTTP 状态', /403/.test(sandbox.errorText({ status: 403, message: 'blocked' })), sandbox.errorText({ status: 403, message: 'blocked' }));
  check('错误文案带出原始异常', /boom/.test(sandbox.errorText(new Error('boom'))), sandbox.errorText(new Error('boom')));

  const hash = latest[0].link.split(':')[1];
  await wait(900);
  const byEncoded = await sandbox.loadDetail(encodeURIComponent('xchina:' + hash));
  check('URL 编码后的 id 也能开详情', byEncoded && masterRe.test(byEncoded.videoUrl), byEncoded && byEncoded.videoUrl);
  await wait(900);
  const byHlsUrl = await sandbox.loadDetail('https://xchina.co/hls/' + hash + '/master.m3u8');
  check('master 地址也能开详情', byHlsUrl && masterRe.test(byHlsUrl.videoUrl), byHlsUrl && byHlsUrl.videoUrl);

  console.log('\nXChina 首页模块: ' + passed + ' 项通过');
})().catch((error) => {
  console.error('XChina 首页模块测试失败:', error.message);
  process.exit(1);
});
