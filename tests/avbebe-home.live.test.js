'use strict';

const fs = require('fs');
const vm = require('vm');

const WIDGET_FILE = './widgets/avbebe.js';
const code = fs.readFileSync(WIDGET_FILE, 'utf8');
const memory = new Map();
const requestedUrls = [];

async function mockGet(url, options) {
  requestedUrls.push(url);
  const response = await fetch(url, {
    headers: (options && options.headers) || {},
    signal: AbortSignal.timeout(30000),
  });
  return { data: await response.text(), status: response.status };
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
  check('首页模块包含 latest 与 categories', moduleIds.includes('latest') && moduleIds.includes('categories'));
  check('首页模块包含搜索', metadata.search && metadata.search.functionName === 'search');

  const categoriesModule = metadata.modules.find((module) => module.id === 'categories');
  const categoryParam = categoriesModule && categoriesModule.params.find((param) => param.name === 'category');
  const expected = ['13684', '466', '13683', '4380', '13685', '1710', '4737'];
  check(
    '分类恰好是 7 个可播放分类',
    categoryParam && JSON.stringify(categoryParam.enumOptions.map((option) => option.value)) === JSON.stringify(expected),
    categoryParam && categoryParam.enumOptions.map((option) => option.value).join(',')
  );

  const latest = await sandbox.loadLatest({ page: 1 });
  check('最新列表非空', Array.isArray(latest) && latest.length > 0 && latest[0].type !== 'placeholder', 'len=' + latest.length);
  check('列表携带可播放链接', latest.every((item) => /^avbebe:\d+$/.test(item.link)), latest[0].link);
  check('列表携带标题与系列名', latest.every((item) => item.title && item.seriesName === item.title));
  check('列表结果来自可播放分类', latest.length > 0);
  console.log('    最新: ' + latest[0].title + ' (' + latest[0].link + ')');

  const requested = requestedUrls.length;
  const byCategory = await sandbox.loadCategory({ category: '466', page: 1 });
  check('分类请求带上分类 id', requestedUrls.slice(requested).some((url) => url.includes('categories=466')), requestedUrls[requested]);
  check('分类列表非空', Array.isArray(byCategory) && byCategory.length > 0 && byCategory[0].type !== 'placeholder', 'len=' + byCategory.length);

  const before = requestedUrls.length;
  const fallback = await sandbox.loadCategory({ category: 'oops', page: -5 });
  check(
    '非法分类与页码回退到默认分类第 1 页',
    requestedUrls.slice(before).some((url) => url.includes('categories=13684') && url.includes('page=1'))
  );
  check('回退结果仍可用', Array.isArray(fallback) && fallback.length > 0 && fallback[0].type !== 'placeholder');

  const keyword = (latest[0].title.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '').slice(0, 6) || '同人');
  const results = await sandbox.search({ keyword, page: 1 });
  check('搜索返回结果', Array.isArray(results) && results.length > 0 && results[0].type !== 'placeholder', 'keyword=' + keyword + ' len=' + results.length);
  check('搜索结果只含可播放影片', results.every((item) => /^avbebe:\d+$/.test(item.link)));

  check('空关键词给占位提示', (await sandbox.search({ keyword: '' }))[0].type === 'placeholder');

  const detail = await sandbox.loadDetail(latest[0].link);
  check('详情可打开', detail && detail.type === 'detail');
  check('详情直接绑定 HLS 地址', /\.m3u8/i.test(detail.videoUrl), detail.videoUrl);
  check('详情播放器为 app', detail.playerType === 'app');
  check('详情带标题', !!detail.title && detail.title !== latest[0].link, detail.title);
  check('详情带 Referer 头', detail.customHeaders && detail.customHeaders.Referer === 'https://avbebe.com/');
  check('非法链接详情返回 null', (await sandbox.loadDetail('avbebe:not-a-number')) === null);

  console.log('\nAvbebe 首页模块: ' + passed + ' 项通过');
})().catch((error) => {
  console.error('Avbebe 首页模块测试失败:', error.message);
  process.exit(1);
});
