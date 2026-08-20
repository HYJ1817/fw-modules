'use strict';

const fs = require('fs');
const vm = require('vm');

const WIDGET_FILE = './widgets/hstream-resource.js';
const code = fs.readFileSync(WIDGET_FILE, 'utf8');
const memory = new Map();

async function mockGet(url, options) {
  const response = await fetch(url, {
    headers: (options && options.headers) || {},
    signal: AbortSignal.timeout(30000),
  });
  const cookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  return { data: await response.text(), status: response.status, headers: { 'set-cookie': cookies } };
}

async function mockPost(url, body, options) {
  const headers = Object.assign({}, (options && options.headers) || {});
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  let data = text;
  try { data = JSON.parse(text); } catch (error) {}
  return { data, status: response.status };
}

const Widget = {
  http: { get: mockGet, post: mockPost },
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
  check('播放源只注册一个模块', metadata.modules.length === 1);
  check('模块是 loadResource stream', metadata.modules[0].id === 'loadResource' && metadata.modules[0].type === 'stream');
  check('播放源提供 multiSource', metadata.globalParams.some(param => param.name === 'multiSource'));

  const direct = await sandbox.loadResource({ link: 'hstream:tropical-kiss-1', multiSource: 'enabled' });
  check('hstream link 返回线路', Array.isArray(direct) && direct.length > 0);
  check('线路是 MP4', /x264\.720p\.mp4$/.test(direct[0].url));

  const contextual = await sandbox.loadResource({
    seriesName: 'Himawari Wa Yoru Ni Saku', episode: 1, type: 'tv', multiSource: 'enabled',
  });
  check('seriesName + episode 返回线路', Array.isArray(contextual) && contextual.length > 0);

  const disabled = await sandbox.loadResource({
    seriesName: 'Tropical Kiss', episode: 1, multiSource: 'disabled',
  });
  check('禁用聚合时返回空数组', Array.isArray(disabled) && disabled.length === 0);

  const noContext = await sandbox.loadResource({ multiSource: 'enabled' });
  check('无上下文返回空数组', Array.isArray(noContext) && noContext.length === 0);

  memory.clear();
  const episodeInfo = await sandbox.fetchEpisodeInfo('tropical-kiss-2');
  const realPost = Widget.http.post;
  let calls = 0;
  Widget.http.post = async function (url, body, options) {
    calls++;
    if (calls === 1) return { data: JSON.stringify({ message: 'CSRF token mismatch.' }), statusCode: 419 };
    return realPost(url, body, options);
  };
  const retried = await sandbox.postPlayerApi('tropical-kiss-2', episodeInfo);
  Widget.http.post = realPost;
  check('419 + JSON 字符串会重试', calls === 2 && retried.stream_url, 'calls=' + calls);

  const range = await fetch(direct[0].url, {
    headers: { Range: 'bytes=0-1023', 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(20000),
  });
  check('真实 MP4 可访问', range.status === 200 || range.status === 206, String(range.status));

  console.log('\n播放源模块: ' + passed + ' 项通过');
})().catch(error => {
  console.error('播放源模块测试失败:', error.message);
  process.exit(1);
});
