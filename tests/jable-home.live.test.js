'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const WIDGET_FILE = './widgets/jable.js';
const code = fs.readFileSync(WIDGET_FILE, 'utf8');
const memory = new Map();
const requestedUrls = [];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// fs1.app 会按客户端指纹拦 Node 的请求（403），curl 能拿到 200。
// 因此传输层走 curl，模块逻辑（解析、分类、搜索、详情）仍由真实站点验证。
let tmpCounter = 0;
function curlGet(url, headers) {
  const file = path.join(os.tmpdir(), `fw-jable-home-${process.pid}-${tmpCounter++}.html`);
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
  check('首页模块包含 latest/hot/newRelease/categories', ['latest', 'hot', 'newRelease', 'categories'].every((id) => moduleIds.includes(id)));
  check('首页模块包含搜索', metadata.search && metadata.search.functionName === 'search');

  const categoriesModule = metadata.modules.find((module) => module.id === 'categories');
  const categoryParam = categoriesModule && categoriesModule.params.find((param) => param.name === 'category');
  const values = categoryParam ? categoryParam.enumOptions.map((option) => option.value) : [];
  check('分类恰好是站点上的 12 个入口', values.length === 12 && values.every((value) => /^\/categories\/[a-z0-9-]+\/$/.test(value)), values.join(','));
  check('中文字幕在分类里', values.includes('/categories/chinese-subtitle/'));

  const latest = await sandbox.loadLatest({ page: 1 });
  check('最近更新非空', Array.isArray(latest) && latest.length > 0 && latest[0].type !== 'placeholder', 'len=' + latest.length);
  check('列表携带 jable 链接', latest.every((item) => /^jable:[a-z0-9-]+$/.test(item.link)), latest[0].link);
  check('列表标题与系列名一致', latest.every((item) => item.title && item.seriesName === item.title));
  check('列表封面来自站点 CDN', latest.every((item) => /^https:\/\/assets\./.test(item.posterPath)), latest[0].posterPath);
  console.log('    最近: ' + latest[0].title.slice(0, 34) + ' (' + latest[0].link + ') ' + latest[0].durationText);

  await wait(700);
  const hot = await sandbox.loadHot({ page: 1 });
  check('热门列表非空', Array.isArray(hot) && hot.length > 0 && hot[0].type !== 'placeholder', 'len=' + hot.length);

  await wait(700);
  const fresh = await sandbox.loadNewRelease({ page: 1 });
  check('新作列表非空', Array.isArray(fresh) && fresh.length > 0 && fresh[0].type !== 'placeholder', 'len=' + fresh.length);

  await wait(700);
  const sub = await sandbox.loadCategory({ category: '/categories/chinese-subtitle/', page: 1 });
  check('中文字幕分类非空', Array.isArray(sub) && sub.length > 0 && sub[0].type !== 'placeholder', 'len=' + sub.length);

  await wait(700);
  const before = requestedUrls.length;
  const fallback = await sandbox.loadCategory({ category: '../../etc/passwd', page: -3 });
  check(
    '非法分类回退到中文字幕第 1 页',
    requestedUrls.slice(before).some((url) => url.includes('/categories/chinese-subtitle/') && !url.includes('page=')),
    requestedUrls[before]
  );
  check('回退结果可用', Array.isArray(fallback) && fallback.length > 0 && fallback[0].type !== 'placeholder');

  const keyword = latest[0].title.split(/\s+/)[0].replace(/[^\u4e00-\u9fa5A-Za-z0-9-]/g, '');
  check('搜索关键词可用', keyword.length >= 2, keyword);
  await wait(700);
  const results = await sandbox.search({ keyword, page: 1 });
  check('搜索返回结果', Array.isArray(results) && results.length > 0 && results[0].type !== 'placeholder', 'keyword=' + keyword + ' len=' + results.length);
  check('搜索结果都是 jable 链接', results.every((item) => /^jable:[a-z0-9-]+$/.test(item.link)));

  check('空关键词给占位提示', (await sandbox.search({ keyword: '' }))[0].type === 'placeholder');
  check('过短关键词给占位提示', (await sandbox.search({ keyword: 'x' }))[0].type === 'placeholder');

  await wait(700);
  const detail = await sandbox.loadDetail(latest[0].link);
  check('详情可打开', detail && detail.type === 'detail');
  check('详情绑定 HLS 直链', /^https:\/\/[^/]*mushroomtrack\.com\/hls\/.+\.m3u8/.test(detail.videoUrl), detail.videoUrl);
  check('详情播放器为 app', detail.playerType === 'app');
  check('详情带标题', !!detail.title && detail.title !== latest[0].link, detail.title);
  check('详情封面存在', /^https:/.test(detail.posterPath), detail.posterPath);
  check('详情带 Referer 头', !!detail.customHeaders && /\/videos\/[a-z0-9-]+\/$/.test(detail.customHeaders.Referer), detail.customHeaders && detail.customHeaders.Referer);
  check('非法链接详情返回 null', (await sandbox.loadDetail('jable:')) === null);

  check('错误文案带出 HTTP 状态', /403/.test(sandbox.errorText({ status: 403, message: 'blocked' })));
  check('URL 编码后的 id 也能开详情', (await sandbox.loadDetail(encodeURIComponent(latest[0].link))) !== null);

  console.log('\nJable 首页模块: ' + passed + ' 项通过');
})().catch((error) => {
  console.error('Jable 首页模块测试失败:', error.message);
  process.exit(1);
});
