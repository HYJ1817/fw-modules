const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const originalPath = path.join(root, 'widgets/fw-all.js');
const original = fs.readFileSync(originalPath);
execFileSync(process.execPath, [path.join(root, 'scripts/build-fw-trace.js')]);
assert.ok(original.equals(fs.readFileSync(originalPath)), 'builder must not change original');
const source = fs.readFileSync(path.join(root, 'widgets/fw-trace.js'), 'utf8');
const saved = new Map();
function boot(get = async () => ({ status: 200, data: '' })) {
  const logs = [], calls = [];
  const c = {
    console: { log: text => logs.push(text) },
    Widget: {
      http: { get: (...args) => { calls.push(args); return get(...args); }, post: async () => ({ status: 200, data: {} }) },
      sharedCache: {
        get: (ns, key) => saved.get(ns + ':' + key),
        set: (ns, key, value) => saved.set(ns + ':' + key, value),
      },
      storage: null,
    },
  };
  vm.createContext(c);
  vm.runInContext(source, c);
  return { c, logs, calls };
}
async function main() {
  const a = boot();
  assert.strictEqual(a.c.WidgetMetadata.id, 'hyj1817.fw.trace');
  assert.strictEqual(a.c.WidgetMetadata.version, '1.0.0');
  assert.ok(a.c.WidgetMetadata.modules.find(m => m.functionName === 'readTrace'));
  assert.strictEqual(a.c.WidgetMetadata.modules.filter(m => m.type === 'stream').length, 1);
  await a.c.startTrace();
  assert.ok(a.logs.join('\n').includes('"timers":false'));
  const sentinel = [{ url: 'https://example.invalid/private-media?secret=hidden' }];
  let received;
  a.c.FW_YIN_RESOURCE.loadResource = async params => { received = params; return sentinel; };
  const result = await a.c.loadResource({ id: 'yinhentai:private-id', title: 'private-title', sessionToken: 'private-token' });
  assert.strictEqual(received.link, 'yinhentai:private-id');
  assert.strictEqual(result[0].url, sentinel[0].url);
  const reader = boot();
  await reader.c.readTrace();
  const trace = reader.logs.join('\n');
  assert.ok(trace.includes('entry-start'));
  assert.ok(trace.includes('entry-end'));
  assert.ok(!/private-|secret=hidden/.test(trace));
  console.log('PASS independent metadata, real dispatch, timerless host, cross-context redaction');

  const payload = { status: 403, data: 'private-response-body' };
  const b = boot(async () => payload);
  const adapter = b.c.fwtHost('TEST_SCOPE');
  const options = { headers: { Cookie: 'private-cookie' }, timeout: 15000 };
  const response = await adapter.http.get('https://example.invalid/private-url?token=hidden', options);
  assert.strictEqual(response, payload);
  assert.strictEqual(b.calls[0][1], options);
  assert.ok(b.logs.join('\n').includes('"status":403'));
  assert.ok(!/private-|token=hidden/.test(b.logs.join('\n')));
  assert.strictEqual(adapter.sharedCache, null);
  assert.strictEqual(adapter.storage, null);
  console.log('PASS HTTP forwarding, status-only trace, cache isolation');

  const integrated = boot(async () => ({ status: 200, data: '' }));
  await integrated.c.startTrace();
  const empty = await integrated.c.loadResource({ id: 'yinhentai:synthetic-fixture', title: 'private-title' });
  assert.strictEqual(empty.length, 0);
  assert.strictEqual(integrated.calls.length, 10, 'original fallback flow is preserved');
  assert.ok(integrated.logs.join('\n').includes('"scope":"FW_YIN_RESOURCE"'));
  const integratedRead = boot();
  await integratedRead.c.readTrace();
  assert.ok(integratedRead.logs.join('\n').includes('http-end'));
  assert.ok(!/synthetic-fixture|private-title/.test(integratedRead.logs.join('\n')));
  console.log('PASS actual provider flow instrumented with synthetic empty responses');

  const err = new Error('private-error-token');
  const failed = boot(() => { throw err; });
  await assert.rejects(failed.c.fwtHost('TEST_SCOPE').http.get('https://example.invalid'), e => e === err);
  assert.ok(failed.logs.join('\n').includes('http-error'));
  assert.ok(!failed.logs.join('\n').includes('private-error-token'));
  const hung = boot(() => new Promise(() => {}));
  hung.c.fwtHost('TEST_SCOPE').http.get('https://example.invalid');
  assert.ok(hung.logs.join('\n').includes('http-start'));
  assert.ok(!hung.logs.join('\n').includes('http-end'));
  console.log('PASS synchronous error identity and hanging request visibility');

  const broken = boot();
  broken.c.Widget.sharedCache = { get() { throw err; }, set() { throw err; } };
  await broken.c.startTrace();
  for (let i = 0; i < 90; i++) broken.c.fwtRecord('test-event', {});
  await broken.c.readTrace();
  assert.ok(broken.logs.join('\n').includes('memory-only'));
  assert.strictEqual(broken.c.fwtEvents().length, 60);
  console.log('PASS bounded records and nonfatal storage failures');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
