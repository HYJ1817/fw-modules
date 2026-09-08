const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, '../widgets/fw-diagnostics.js'), 'utf8');

function boot(sharedCache, storage) {
  const logs = [];
  const context = {
    console: { log: message => logs.push(message) },
    Widget: {
      sharedCache, storage,
      http: { get() { throw new Error('must not access network'); } },
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, logs };
}

function cache() {
  const data = new Map();
  return {
    get(ns, key) { return data.get(ns + ':' + key); },
    set(ns, key, value) { data.set(ns + ':' + key, value); },
  };
}

async function main() {
  const shared = cache();
  const { context: c, logs } = boot(shared);
  assert.strictEqual(c.WidgetMetadata.id, 'hyj1817.fw.diagnostics');
  assert.strictEqual(c.WidgetMetadata.version, '1.0.0');
  assert.strictEqual(c.WidgetMetadata.modules.filter(m => m.type === 'stream').length, 1);
  assert.strictEqual(c.WidgetMetadata.modules.length, 3);
  assert.strictEqual((await c.runEnvironmentCheck()).length, 0);
  assert.ok(logs.join('\n').includes('"setTimeout":false'));
  assert.ok(logs.join('\n').includes('"roundTrip":true'));
  console.log('PASS timerless environment and independent metadata');

  const result = await c.loadResource({
    id: 'private-id', link: 'https://example.invalid/private?token=secret',
    title: 'private-title', episode: 2, cookie: 'private-cookie',
    sessionToken: 'private-token', secretField: 'private-value',
  });
  assert.strictEqual(result.length, 0);
  const next = boot(shared);
  await next.context.readLastCall();
  const report = next.logs.join('\n');
  assert.ok(report.includes('"event":"stream-entry"'));
  assert.ok(report.includes('"builtinTest":false'));
  assert.ok(report.includes('"present":true'));
  for (const secret of ['private-', 'token=secret', 'secretField', 'sessionToken', 'cookie']) {
    assert.ok(!report.includes(secret), 'must redact ' + secret);
  }
  console.log('PASS cross-context record and redaction');

  await c.loadResource({ id: 'forward-test-media' });
  const testRead = boot(shared);
  await testRead.context.readLastCall();
  assert.ok(testRead.logs.join('\n').includes('"builtinTest":true'));
  const empty = boot(cache());
  await empty.context.readLastCall();
  assert.ok(empty.logs.join('\n').includes('NO_CAPTURE'));
  console.log('PASS built-in test distinction and empty record');

  const storageData = new Map();
  const storage = { get: k => storageData.get(k), set: (k, v) => storageData.set(k, v) };
  const failing = { get() { throw Error('secret'); }, set() { throw Error('secret'); } };
  const fallback = boot(failing, storage);
  await fallback.context.loadResource(null);
  const fallbackRead = boot(failing, storage);
  await fallbackRead.context.readLastCall();
  assert.ok(fallbackRead.logs.join('\n').includes('"inputType":"null"'));
  assert.ok(Array.from(storageData.keys()).every(k => k.startsWith('hyj1817.fw.diagnostics:')));
  const noCache = boot();
  await noCache.context.loadResource('secret-string');
  await noCache.context.readLastCall();
  assert.ok(noCache.logs.join('\n').includes('"persistence":"memory-only"'));
  assert.ok(!noCache.logs.join('\n').includes('secret-string'));
  console.log('PASS storage fallback and no-storage safety');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
