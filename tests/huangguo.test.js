/**
 * 黄果短剧 widget 单测
 *
 * 1. 纯 JS 加密层与 node:crypto 交叉校验（SHA-256 / HMAC / AES-CTR / GCM / P-256）
 * 2. 链接、卡片、详情 HTML 的解析
 * 3. 加密传输端到端：假站点用 node:crypto 当服务端，验证握手、请求解密、响应加密
 * 4. 播放源装配与 CDN 鉴权头
 */
const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const UA_OK = "#EXTM3U\n#EXT-X-VERSION:3\n";

function load(name) {
  const filename = path.join(ROOT, "widgets", name);
  const source = fs.readFileSync(filename, "utf8");
  const context = {
    console: { log() {} },
    Date,
    JSON,
    Math,
    Promise,
    BigInt,
    Uint8Array,
    ArrayBuffer,
    isNaN,
    parseInt,
    parseFloat,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    Widget: {
      http: {
        get: async () => ({ data: "" }),
        post: async () => ({ data: "" }),
      },
      sharedCache: null,
      storage: null,
    },
  };
  if (name.startsWith("huangguo") && typeof crypto.webcrypto !== "undefined") {
    context.crypto = crypto.webcrypto;
  }
  vm.createContext(context);
  vm.runInContext(source, context, { filename });
  return context;
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBuf(text) {
  return Buffer.from(String(text).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function serverGcmEncrypt(keyHex, ivHex, aadHex, plainHex) {
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), Buffer.from(ivHex, "hex"));
  cipher.setAAD(Buffer.from(aadHex, "hex"));
  const body = Buffer.concat([cipher.update(Buffer.from(plainHex, "hex")), cipher.final()]);
  return body.toString("hex") + cipher.getAuthTag().toString("hex");
}

function serverGcmDecrypt(keyHex, ivHex, aadHex, valueHex) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), Buffer.from(ivHex, "hex"));
  decipher.setAAD(Buffer.from(aadHex, "hex"));
  decipher.setAuthTag(Buffer.from(valueHex.slice(-32), "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(valueHex.slice(0, -32), "hex")),
    decipher.final(),
  ]).toString("hex");
}

function deriveKey(sharedHex, saltHex, info) {
  const prk = crypto.createHmac("sha256", Buffer.from(saltHex, "hex"))
    .update(Buffer.from(sharedHex, "hex")).digest();
  return crypto.createHmac("sha256", prk)
    .update(Buffer.concat([Buffer.from(info, "utf8"), Buffer.from([1])]))
    .digest("hex");
}

/** 假站点：实现 /api/<scope>/request 的 hello + call，应答内容由 payloadFor 决定 */
function mockSite(widget, payloadFor) {
  const all = {};
  const sessions = {};
  widget.Widget.http.post = async (url, body) => {
    const message = typeof body === "string" ? JSON.parse(body) : body;
    const scope = /\/api\/([a-z]+)\/request/.exec(url)[1];
    all[scope] = (all[scope] || 0) + 1;
    if (message.type === "hello") {
      const clientPub = b64urlToBuf(message.client_pub);
      assert.strictEqual(clientPub.length, 65, "client_pub 必须是未压缩点");
      assert.strictEqual(clientPub[0], 4, "client_pub 必须以 04 开头");
      const server = crypto.createECDH("prime256v1");
      server.generateKeys();
      const shared = server.computeSecret(clientPub).toString("hex");
      const salt = crypto.randomBytes(32).toString("hex");
      const kid = "kid-" + scope, sid = "sid-" + crypto.randomBytes(10).toString("hex");
      sessions[kid] = { shared, salt, scope, kid, sid, seq: 0 };
      const now = Math.floor(Date.now() / 1000);
      return {
        data: {
          v: 1, type: "hello", kid, sid, site: "huangguoai.com",
          server_pub: b64url(server.getPublicKey()), salt: b64url(Buffer.from(salt, "hex")),
          server_time: now, expires_at: now + 520,
        },
      };
    }
    const session = sessions[message.kid];
    assert.ok(session, "未知的会话 kid");
    assert.strictEqual(message.v, 1);
    assert.strictEqual(message.sid, session.sid);
    assert.strictEqual(message.seq, session.seq + 1, "seq 必须自增");
    session.seq = message.seq;
    const info = ["dx150-edge-v1", scope, "huangguoai.com", session.kid, session.sid].join("\n");
    const reqKey = deriveKey(session.shared, session.salt, info + "\nreq");
    const resKey = deriveKey(session.shared, session.salt, info + "\nres");
    const iv = "0000000000000000" + Number(message.seq).toString(16).padStart(8, "0");
    const aad = (dir) => Buffer.from([info, dir, String(message.seq), String(message.ts)].join("\n"), "utf8").toString("hex");
    const plain = serverGcmDecrypt(reqKey, iv, aad("req"), Buffer.from(b64urlToBuf(message.ciphertext)).toString("hex"));
    const request = JSON.parse(Buffer.from(plain, "hex").toString("utf8")).request;
    assert.ok(request && typeof request.path === "string", "请求体必须携带 path");
    const payload = payloadFor(scope, request);
    const inner = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: Buffer.from(JSON.stringify(payload), "utf8").toString("base64"),
    };
    const ciphertext = b64url(Buffer.from(serverGcmEncrypt(resKey, iv, aad("res"), Buffer.from(JSON.stringify(inner), "utf8").toString("hex")), "hex"));
    return { data: { v: 1, type: "result", kid: session.kid, sid: session.sid, seq: message.seq, ts: message.ts, ciphertext } };
  };
  return all;
}

function ok(data) {
  return { status: 1, data };
}

async function testCrypto() {
  const h = load("huangguo-resource.js");
  // SHA-256 / HMAC
  for (const text of ["", "abc", "黄果短剧", "x".repeat(200)]) {
    assert.strictEqual(h.hgSha256Hex(h.hgUtf8Hex(text)), crypto.createHash("sha256").update(text, "utf8").digest("hex"));
  }
  for (let i = 0; i < 3; i++) {
    const data = crypto.randomBytes(64 + i).toString("hex");
    const key = crypto.randomBytes(32).toString("hex");
    assert.strictEqual(
      h.hgHmac(data, key),
      crypto.createHmac("sha256", Buffer.from(key, "hex")).update(Buffer.from(data, "hex")).digest("hex")
    );
  }
  // UTF-8 往返
  assert.strictEqual(h.hgUtf8FromHex(h.hgUtf8Hex("黄果 · 第12集 ✅")), "黄果 · 第12集 ✅");
  // AES-CTR
  for (const size of [16, 48, 200]) {
    const key = crypto.randomBytes(32).toString("hex");
    const iv = crypto.randomBytes(16).toString("hex");
    const data = crypto.randomBytes(size).toString("hex");
    const cipher = crypto.createCipheriv("aes-256-ctr", Buffer.from(key, "hex"), Buffer.from(iv, "hex"));
    assert.strictEqual(
      h.hgCtr(key, iv, data),
      Buffer.concat([cipher.update(Buffer.from(data, "hex")), cipher.final()]).toString("hex")
    );
  }
  // GCM（12 字节 IV，J0 = IV||1，计数器从 IV||2 起，与站点一致）
  for (let i = 0; i < 3; i++) {
    const key = crypto.randomBytes(32).toString("hex");
    const iv = crypto.randomBytes(12).toString("hex");
    const aad = crypto.randomBytes(21).toString("hex");
    const plain = crypto.randomBytes(40).toString("hex");
    const mine = h.hgGcmEncrypt(key, iv, aad, plain);
    assert.strictEqual(mine, serverGcmEncrypt(key, iv, aad, plain));
    assert.strictEqual(h.hgGcmDecrypt(key, iv, aad, mine), plain);
    assert.throws(() => h.hgGcmDecrypt(key, iv, aad, mine.slice(0, -1) + (mine.endsWith("0") ? "1" : "0")));
  }
  // P-256 ECDH
  const local = crypto.createECDH("prime256v1");
  local.generateKeys();
  const peer = crypto.createECDH("prime256v1");
  peer.generateKeys();
  const priv = local.getPrivateKey("hex");
  assert.strictEqual(h.hgP256Public(priv), local.getPublicKey("hex"));
  assert.strictEqual(h.hgP256Shared(priv, peer.getPublicKey("hex")), local.computeSecret(peer.getPublicKey()).toString("hex"));
  // base64url 往返
  for (const size of [1, 2, 3, 32, 65]) {
    const raw = crypto.randomBytes(size);
    assert.strictEqual(h.hgHexFromB64(b64url(raw)), raw.toString("hex"));
    assert.strictEqual(h.hgB64FromHex(raw.toString("hex")), b64url(raw));
  }
}

async function testParsing() {
  const h = load("huangguo.js");
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(h.hgParseLink("huangguo:12345:3@huangguoai.com"))),
    { id: "12345", ep: 3, host: "huangguoai.com" }
  );
  assert.strictEqual(h.hgParseLink("huangguo%3A888").id, "888");
  assert.strictEqual(h.hgParseLink("huangguo%3A888%3A2%40huangguoai.com").ep, 2);
  assert.strictEqual(h.hgParseLink("huangguo:0"), null);
  assert.strictEqual(h.hgParseLink("hentaimama:abc"), null);
  assert.strictEqual(h.hgLinkOf("https://huangguoai.com", "12345", 2), "huangguo:12345:2@huangguoai.com");

  const html = `
    <html><body>
    <script id="videoInitialData" type="application/json">{"id":"12345","title":"测试短剧","description":"简介","posterSrc":"/media/a.jpg","ep":2,"trackingEpisodes":{"1":1,"2":2}}</script>
    <a data-ep-id="1" href="/video/12345/">第1集</a>
    <a data-ep-id="2" href="/video/12345/ep-2/">第2集</a>
    <a data-ep-id="9" href="/video/99999/ep-9/">脏数据</a>
    </body></html>`;
  const data = h.hgInitialData(html);
  assert.strictEqual(data.id, "12345");
  assert.deepStrictEqual(Array.from(h.hgEpisodes(html, "12345", data)), [1, 2]);
  assert.deepStrictEqual(Array.from(h.hgEpisodes("", "12345", data)), [1, 2]);
  assert.deepStrictEqual(Array.from(h.hgEpisodes("", "12345", {})), [1]);

  const card = h.hgCard(h.hgCtx({}), "https://huangguoai.com", { id: "777", title: "某短剧", cover: "/c.jpg", episode_count: 12, is_finished: true });
  assert.strictEqual(card.link, "huangguo:777:1@huangguoai.com");
  assert.strictEqual(card.posterPath, "https://huangguoai.com/c.jpg");
  assert.strictEqual(card.description, "全 12 集");
  assert.strictEqual(h.hgCard(h.hgCtx({}), "https://huangguoai.com", { id: "0", title: "x" }), null);

  // 分页
  const page = await h.hgVideoPage(h.hgCtx({}), { items: [{ id: "1", title: "A" }, { id: "1", title: "A" }], pagination: { page: 1, pages: 3 } }, 1);
  assert.strictEqual(page.items.length, 1);
  assert.strictEqual(page.nextCursor, "2");
}

async function testDetail() {
  const h = load("huangguo.js");
  const requested = [];
  h.Widget.http.get = async (url) => {
    requested.push(url);
    return {
      data: `<script id="videoInitialData" type="application/json">{"id":"12345","title":"测试短剧","description":"简介","posterSrc":"https://cdn.example/cover.jpg"}</script>
      <a data-ep-id="1" href="/video/12345/">第1集</a><a data-ep-id="2" href="/video/12345/ep-2/">第2集</a>`,
    };
  };
  const detail = await h.loadDetail("huangguo:12345:1@huangguoai.com");
  assert.strictEqual(requested[0], "https://huangguoai.com/video/12345/");
  assert.strictEqual(detail.title, "测试短剧");
  assert.strictEqual(detail.episodeItems.length, 2);
  assert.strictEqual(detail.episodeItems[1].episode, 2);
  assert.strictEqual(detail.episodeItems[1].link, "huangguo:12345:2@huangguoai.com");
  assert.strictEqual(detail.posterPath, "https://cdn.example/cover.jpg");
  assert.strictEqual(await h.loadDetail("bad:link"), null);
}

async function testSearch() {
  const h = load("huangguo.js");
  const calls = mockSite(h, (scope, request) => {
    assert.strictEqual(scope, "dynamic");
    assert.ok(request.path.indexOf("/api/search?q=") === 0);
    return ok({ items: [{ id: "4210", title: "命中短剧" }], pagination: { page: 1, pages: 1 } });
  });
  const page = await h.search({ keyword: "命中", page: "1" });
  assert.strictEqual(page.items.length, 1);
  assert.strictEqual(page.items[0].link, "huangguo:4210:1@huangguoai.com");
  assert.strictEqual(calls.dynamic, 2, "首次搜索应完成一次握手 + 一次调用");
  // 会话复用：第二次不应重新握手
  await h.search({ keyword: "命中", page: "2" });
  assert.strictEqual(calls.dynamic, 3);
}

async function testResource() {
  const r = load("huangguo-resource.js");
  const probed = [];
  r.Widget.http.get = async (url, options) => {
    probed.push({ url, headers: options.headers });
    if (options.headers["x-hg-auth"] === "tok" && options.headers["x-cdn-app"] === "hg") return { data: UA_OK };
    throw Object.assign(new Error("forbidden"), { status: 403 });
  };
  mockSite(r, (scope, request) => {
    assert.strictEqual(scope, "playback");
    assert.strictEqual(request.path, "/api/videos/12345/episodes/2/playback");
    return ok({
      id: "12345", ep: 2, manifest_method: "GET",
      streams: { main: "https://cdn.example/master.m3u8", hevc: "https://cdn.example/hevc.m3u8" },
      cdn: { authKey: "x-hg-auth", authValue: "tok", app: "hg", m3u8Enabled: true },
    });
  });
  const sources = await r.loadResource({ multiSource: "enabled", link: "huangguo:12345:2@huangguoai.com", episode: 2 });
  assert.strictEqual(sources.length, 2);
  assert.strictEqual(sources[0].url, "https://cdn.example/master.m3u8");
  assert.strictEqual(sources[0].playerType, "app");
  assert.strictEqual(sources[0].customHeaders["x-hg-auth"], "tok");
  assert.strictEqual(sources[0].customHeaders.Referer, "https://huangguoai.com/video/12345/ep-2/");
  assert.ok(!/未校验/.test(sources[0].name), "鉴权头探测通过不应标注未校验");
  assert.ok(probed.length >= 2);

  // 聚合开关
  const disabled = await r.loadResource({ multiSource: "disabled", link: "huangguo:12345:2" });
  assert.strictEqual(disabled.length, 0, "关闭聚合时应直接返回空");
  // 无 link 时用片名在加密通道里找回 id
  const byTitle = await r.loadResource({ seriesName: "测试短剧", episode: 1 });
  assert.ok(Array.isArray(byTitle));
}

async function testResourceTitleFallback() {
  const r = load("huangguo-resource.js");
  r.Widget.http.get = async () => ({ data: UA_OK });
  mockSite(r, (scope, request) => {
    if (scope === "dynamic") {
      return ok({ items: [{ id: "555", title: "别的剧" }, { id: "777", title: "目标短剧 第1季" }], pagination: { page: 1, pages: 1 } });
    }
    assert.strictEqual(request.path, "/api/videos/777/episodes/1/playback");
    return ok({ id: "777", ep: 1, streams: { main: "https://cdn.example/a.m3u8" }, cdn: {} });
  });
  const sources = await r.loadResource({ seriesName: "目标短剧", season: 1, episode: 1, type: "tv" });
  assert.strictEqual(sources.length, 1);
  assert.strictEqual(sources[0].url, "https://cdn.example/a.m3u8");
}

async function testProbeFailureKeepsLine() {
  const r = load("huangguo-resource.js");
  r.Widget.http.get = async () => { throw Object.assign(new Error("blocked"), { status: 403 }); };
  mockSite(r, () => ok({ id: "1", ep: 1, streams: { main: "https://cdn.example/master.m3u8" }, cdn: { authKey: "x-hg-auth", authValue: "tok", m3u8Enabled: true } }));
  const sources = await r.loadResource({ link: "huangguo:1:1" });
  assert.strictEqual(sources.length, 1);
  assert.ok(/未校验/.test(sources[0].name));
}

async function main() {
  await testCrypto();
  await testParsing();
  await testDetail();
  await testSearch();
  await testResource();
  await testResourceTitleFallback();
  await testProbeFailureKeepsLine();
  console.log("huangguo tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
