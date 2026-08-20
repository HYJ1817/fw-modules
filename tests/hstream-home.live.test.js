'use strict';

const fs = require('fs');
const vm = require('vm');

const WIDGET_FILE = './widgets/hstream.js';
const code = fs.readFileSync(WIDGET_FILE, 'utf8');
const memory = new Map();

async function mockGet(url, options) {
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
  Widget, console, Date, Promise, JSON, encodeURIComponent, Math,
  String, Number, parseInt, Array, Object, Error,
};
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: WIDGET_FILE });

let passed = 0;
function check(name, condition, detail) {
  if (!condition) throw new Error(name + (detail ? ': ' + detail : ''));
  passed++;
  console.log('  ✅ ' + name);
}

(async () => {
  const metadata = sandbox.WidgetMetadata;
  const moduleIds = metadata.modules.map(module => module.id);
  check('首页模块不注册 loadResource', !moduleIds.includes('loadResource'), moduleIds.join(','));
  check('首页模块包含 latest/recent/popular', ['latest', 'recent', 'popular'].every(id => moduleIds.includes(id)));
  check('首页模块包含搜索', metadata.search && metadata.search.functionName === 'search');
  const categoriesModule = metadata.modules.find(module => module.id === 'categories');
  check('首页模块包含 Categories', !!categoriesModule);
  const categoryParam = categoriesModule && categoriesModule.params.find(param => param.name === 'category');
  const expectedCategories = [
    'uncensored', 'milf', 'maid', 'school-girl', 'succubus',
    'tentacle', 'big-boobs', 'bdsm', 'elf', '4k-48fps',
  ];
  check(
    'Categories 恰好包含网站首页十类',
    categoryParam && JSON.stringify(categoryParam.enumOptions.map(option => option.value)) === JSON.stringify(expectedCategories)
  );
  check('Categories 默认 Uncensored', categoryParam && categoryParam.value === 'uncensored');
  const expectedCategoryTitles = [
    '无码', '熟女', '女仆', '女学生', '魅魔',
    '触手', '巨乳', 'BDSM', '精灵', '4K 48帧',
  ];
  check('Categories 栏目显示为分类', categoriesModule && categoriesModule.title === '分类');
  check(
    '十个分类使用确认的中文显示名',
    categoryParam && JSON.stringify(categoryParam.enumOptions.map(option => option.title)) === JSON.stringify(expectedCategoryTitles)
  );

  const latest = await sandbox.loadLatest({});
  check('最新列表非空', Array.isArray(latest) && latest.length > 0);
  check('列表携带 seriesName', latest[0] && latest[0].seriesName === latest[0].title);
  check('列表使用 hstream link', /^hstream:/.test(latest[0].link));

  const results = await sandbox.search({ keyword: 'tropical' });
  check('搜索可用', results.some(item => /tropical/i.test(item.title)));

  const detail = await sandbox.loadDetail('hstream:tropical-kiss');
  check('详情包含三集', detail && detail.episodeItems && detail.episodeItems.length === 3);
  check('详情不直接绑定 videoUrl', !detail.videoUrl);
  check('分集携带 seriesName', detail.episodeItems.every(item => item.seriesName === detail.title));
  check('分集携带 episode', detail.episodeItems.every(item => item.episode > 0));
  check('分集使用 hstream link', detail.episodeItems.every(item => /^hstream:/.test(item.link)));

  const uncensored = await sandbox.loadCategory({ category: 'uncensored', page: 1 });
  check('Uncensored 分类非空', Array.isArray(uncensored) && uncensored.length > 0);
  check('分类结果携带播放上下文', uncensored.every(item => item.seriesName && /^hstream:/.test(item.link)));

  const fourK = await sandbox.loadCategory({ category: '4k-48fps', page: 1 });
  check('4K 48FPS 分类非空', Array.isArray(fourK) && fourK.length > 0);

  memory.clear();
  const requestedUrls = [];
  const originalGet = Widget.http.get;
  Widget.http.get = async function (url, options) {
    requestedUrls.push(url);
    return originalGet(url, options);
  };
  await sandbox.loadCategory({ category: 'not-a-real-category', page: -5 });
  Widget.http.get = originalGet;
  check(
    '非法参数回退到 uncensored 第 1 页',
    requestedUrls.some(url => url.includes('tags%5B0%5D=uncensored') && url.includes('page=1'))
  );

  console.log('\n首页模块: ' + passed + ' 项通过');
})().catch(error => {
  console.error('首页模块测试失败:', error.message);
  process.exit(1);
});
