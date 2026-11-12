/* 黄果短剧适配层
 * 本文件不单独分发：由 scripts/build-huangguo.js 内联进入口层，
 * 生成 widgets/huangguo.js 与 widgets/huangguo-resource.js。要改逻辑请改这里。
 *
 * 站点接口说明（来自站点自身的 Web 客户端）：
 *   - 列表 / 分类 / 专题 / 详情页元数据：POST /api/public/request 转发 GET
 *   - 搜索 / 播放：ECDH(P-256) 握手后 AES-256-GCM 双向加密，见 hgSession()
 * Forward 的 widget 运行时没有 WebCrypto，因此 SHA-256 / HMAC / AES / GHASH / P-256
 * 全部为纯 JS 实现（已与 node:crypto 交叉校验，见 tests/huangguo.test.js）。
 */

var HG_SITE = "https://huangguoai.com";
var HG_AI = "https://huangguoai.ai";
var HG_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/* ============================== 通用工具 ============================== */

function hgText(value, max) {
  return String(value === undefined || value === null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max || 1024);
}
function hgFail(message) {
  var error = new Error(message);
  error.hg = true;
  return error;
}
function hgLog(message) {
  try { console.log("FW huangguo: " + message); } catch (_) {}
}
function hgHex(bytes) {
  var out = "";
  for (var i = 0; i < bytes.length; i++) out += (bytes[i] & 255).toString(16).padStart(2, "0");
  return out;
}
function hgBytes(hex) {
  var value = String(hex || ""), out = [];
  for (var i = 0; i + 1 < value.length; i += 2) out.push(parseInt(value.substr(i, 2), 16));
  return out;
}
function hgUtf8Hex(text) {
  var s = String(text), out = [];
  for (var i = 0; i < s.length; i++) {
    var code = s.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < s.length) {
      var low = s.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) { code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00); i++; }
    }
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
  }
  return hgHex(out);
}
function hgUtf8FromHex(hex) {
  var bytes = hgBytes(hex), out = "", i = 0;
  while (i < bytes.length) {
    var b = bytes[i++], code;
    if (b < 0x80) code = b;
    else if (b >= 0xf0) { code = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63); }
    else if (b >= 0xe0) { code = ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63); }
    else { code = ((b & 31) << 6) | (bytes[i++] & 63); }
    if (code > 0xffff) {
      code -= 0x10000;
      out += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 1023));
    } else out += String.fromCharCode(code);
  }
  return out;
}
var HG_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function hgB64FromHex(hex) {
  var bytes = hgBytes(hex), out = "", i;
  for (i = 0; i + 2 < bytes.length; i += 3) {
    var n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += HG_B64[(n >> 18) & 63] + HG_B64[(n >> 12) & 63] + HG_B64[(n >> 6) & 63] + HG_B64[n & 63];
  }
  var left = bytes.length - i;
  if (left === 1) {
    var a = bytes[i] << 16;
    out += HG_B64[(a >> 18) & 63] + HG_B64[(a >> 12) & 63];
  } else if (left === 2) {
    var c = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += HG_B64[(c >> 18) & 63] + HG_B64[(c >> 12) & 63] + HG_B64[(c >> 6) & 63];
  }
  return out;
}
function hgStdB64(text) {
  var bytes = hgBytes(hgUtf8Hex(text));
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var out = "", i, a, c;
  for (i = 0; i + 2 < bytes.length; i += 3) {
    var n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + chars[(n >> 6) & 63] + chars[n & 63];
  }
  var left = bytes.length - i;
  if (left === 1) { a = bytes[i] << 16; out += chars[(a >> 18) & 63] + chars[(a >> 12) & 63] + "=="; }
  else if (left === 2) { c = (bytes[i] << 16) | (bytes[i + 1] << 8); out += chars[(c >> 18) & 63] + chars[(c >> 12) & 63] + chars[(c >> 6) & 63] + "="; }
  return out;
}
function hgHexFromB64(value) {
  var s = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var out = [], buffer = 0, bits = 0;
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    if (c === "=") break;
    var index = chars.indexOf(c);
    if (index < 0) throw hgFail("站点返回的编码无效");
    buffer = ((buffer << 6) | index) & 0xffffff;
    bits += 6;
    if (bits >= 8) { bits -= 8; out.push((buffer >> bits) & 255); }
  }
  return hgHex(out);
}
function hgRandomHex(bytes) {
  var out = [], i, got = false;
  var source = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (source && typeof source.getRandomValues === "function") {
    var buf = new Uint8Array(bytes);
    source.getRandomValues(buf);
    for (i = 0; i < bytes; i++) out.push(buf[i]);
    got = true;
  }
  if (!got) for (i = 0; i < bytes; i++) out.push(Math.floor(Math.random() * 256));
  return hgHex(out);
}

/* ============================== SHA-256 / HMAC ============================== */

var HG_K256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function hgSha256Hex(hexOrBytes) {
  var bytes = typeof hexOrBytes === "string" ? hgBytes(hexOrBytes) : hexOrBytes;
  var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  var len = bytes.length, total = Math.ceil((len + 9) / 64) * 64;
  var buf = new Array(total);
  for (var i = 0; i < total; i++) buf[i] = 0;
  for (i = 0; i < len; i++) buf[i] = bytes[i];
  buf[len] = 0x80;
  var bits = len * 8;
  buf[total - 4] = (bits >>> 24) & 255; buf[total - 3] = (bits >>> 16) & 255;
  buf[total - 2] = (bits >>> 8) & 255; buf[total - 1] = bits & 255;
  var w = new Array(64), a, b, c, d, e, f, g, k, s0, s1, ch, maj, t1, t2, t, j;
  for (var off = 0; off < total; off += 64) {
    for (t = 0; t < 16; t++) {
      j = off + t * 4;
      w[t] = ((buf[j] << 24) | (buf[j + 1] << 16) | (buf[j + 2] << 8) | buf[j + 3]) | 0;
    }
    for (t = 16; t < 64; t++) {
      var x = w[t - 15], y = w[t - 2];
      s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    a = h[0]; b = h[1]; c = h[2]; d = h[3]; e = h[4]; f = h[5]; g = h[6]; k = h[7];
    for (t = 0; t < 64; t++) {
      s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      ch = (e & f) ^ (~e & g);
      maj = (a & b) ^ (a & c) ^ (b & c);
      t1 = (k + s1 + ch + HG_K256[t] + w[t]) | 0;
      t2 = (s0 + maj) | 0;
      k = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + k) | 0;
  }
  var out = [];
  for (i = 0; i < 8; i++) out.push((h[i] >>> 24) & 255, (h[i] >>> 16) & 255, (h[i] >>> 8) & 255, h[i] & 255);
  return hgHex(out);
}
function hgHmac(dataHex, keyHex) {
  var key = hgBytes(keyHex);
  if (key.length > 64) key = hgBytes(hgSha256Hex(key));
  while (key.length < 64) key.push(0);
  var ipad = [], opad = [];
  for (var i = 0; i < 64; i++) { ipad.push(key[i] ^ 0x36); opad.push(key[i] ^ 0x5c); }
  return hgSha256Hex(opad.concat(hgBytes(hgSha256Hex(ipad.concat(hgBytes(dataHex))))));
}
function hgDerive(sharedHex, saltHex, info) {
  return hgHmac(hgUtf8Hex(info) + "01", hgHmac(sharedHex, saltHex));
}

/* ============================== AES-256 ============================== */

var HG_SBOX = null;
var HG_RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a];
function hgSbox() {
  if (HG_SBOX) return HG_SBOX;
  var sbox = new Array(256), p = 1, q = 1;
  do {
    p = (p ^ (p << 1) ^ (p & 0x80 ? 0x1b : 0)) & 255;
    q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 255;
    if (q & 0x80) q ^= 0x09;
    sbox[p] = (q ^ ((q << 1) | (q >>> 7)) ^ ((q << 2) | (q >>> 6)) ^ ((q << 3) | (q >>> 5)) ^ ((q << 4) | (q >>> 4)) ^ 0x63) & 255;
  } while (p !== 1);
  sbox[0] = 0x63;
  HG_SBOX = sbox;
  return sbox;
}
function hgXtime(x) { return ((x << 1) ^ (x & 0x80 ? 0x1b : 0)) & 255; }
function hgGmul(a, b) { var r = 0; while (b) { if (b & 1) r ^= a; a = hgXtime(a); b >>= 1; } return r; }
function hgExpandKey(keyHex) {
  var sbox = hgSbox(), key = hgBytes(keyHex), nk = key.length / 4, nr = nk + 6, w = [], i, c, r;
  for (i = 0; i < nk; i++) w.push([key[i * 4], key[i * 4 + 1], key[i * 4 + 2], key[i * 4 + 3]]);
  for (i = nk; i < 4 * (nr + 1); i++) {
    var t = w[i - 1].slice();
    if (i % nk === 0) t = [sbox[t[1]] ^ HG_RCON[i / nk - 1], sbox[t[2]], sbox[t[3]], sbox[t[0]]];
    else if (nk > 6 && i % nk === 4) t = [sbox[t[0]], sbox[t[1]], sbox[t[2]], sbox[t[3]]];
    w.push([w[i - nk][0] ^ t[0], w[i - nk][1] ^ t[1], w[i - nk][2] ^ t[2], w[i - nk][3] ^ t[3]]);
  }
  return { w: w, nr: nr };
}
function hgEncryptBlock(ks, blockHex) {
  var sbox = hgSbox(), st = hgBytes(blockHex), w = ks.w, nr = ks.nr, i, r, c, round, a;
  for (i = 0; i < 4; i++) for (r = 0; r < 4; r++) st[i * 4 + r] ^= w[i][r];
  for (round = 1; round <= nr; round++) {
    for (i = 0; i < 16; i++) st[i] = sbox[st[i]];
    var t = st.slice();
    for (c = 0; c < 4; c++) for (r = 0; r < 4; r++) st[c * 4 + r] = t[((c + r) % 4) * 4 + r];
    if (round !== nr) {
      for (c = 0; c < 4; c++) {
        a = st.slice(c * 4, c * 4 + 4);
        st[c * 4] = hgGmul(a[0], 2) ^ hgGmul(a[1], 3) ^ a[2] ^ a[3];
        st[c * 4 + 1] = a[0] ^ hgGmul(a[1], 2) ^ hgGmul(a[2], 3) ^ a[3];
        st[c * 4 + 2] = a[0] ^ a[1] ^ hgGmul(a[2], 2) ^ hgGmul(a[3], 3);
        st[c * 4 + 3] = hgGmul(a[0], 3) ^ a[1] ^ a[2] ^ hgGmul(a[3], 2);
      }
    }
    for (i = 0; i < 4; i++) for (r = 0; r < 4; r++) st[i * 4 + r] ^= w[round * 4 + i][r];
  }
  return hgHex(st);
}
function hgCtr(keyHex, ivHex, dataHex) {
  var ks = hgExpandKey(keyHex), data = hgBytes(dataHex), counter = hgBytes(ivHex), out = [], i, off;
  for (off = 0; off < data.length; off += 16) {
    var block = hgBytes(hgEncryptBlock(ks, hgHex(counter)));
    for (i = 0; i < 16 && off + i < data.length; i++) out.push(data[off + i] ^ block[i]);
    for (i = 15; i >= 0; i--) { counter[i] = (counter[i] + 1) & 255; if (counter[i]) break; }
  }
  return hgHex(out);
}
var HG_R128 = 0xe1000000000000000000000000000000n;
function hgGhash(aadHex, cipherHex, hHex) {
  var H = BigInt("0x" + hHex), y = 0n;
  var aad = String(aadHex || ""), cipher = String(cipherHex || "");
  function pad(s) { var extra = s.length % 32; return extra ? s + "0".repeat(32 - extra) : s; }
  var blocks = pad(aad) + pad(cipher) +
    (aad.length * 4).toString(16).padStart(16, "0") + (cipher.length * 4).toString(16).padStart(16, "0");
  for (var i = 0; i < blocks.length; i += 32) {
    var x = y ^ BigInt("0x" + blocks.slice(i, i + 32)), z = 0n, v = H;
    for (var b = 127n; b >= 0n; b--) {
      if ((x >> b) & 1n) z ^= v;
      v = (v >> 1n) ^ (v & 1n ? HG_R128 : 0n);
    }
    y = z;
  }
  return y.toString(16).padStart(32, "0");
}
function hgGcmEncrypt(keyHex, ivHex, aadHex, plainHex) {
  var ks = hgExpandKey(keyHex);
  var h = hgCtr(keyHex, "00000000000000000000000000000000", "00000000000000000000000000000000");
  var cipher = hgCtr(keyHex, ivHex + "00000002", plainHex);
  var tag = (BigInt("0x" + hgGhash(aadHex, cipher, h)) ^ BigInt("0x" + hgEncryptBlock(ks, ivHex + "00000001"))).toString(16).padStart(32, "0");
  return cipher + tag;
}
function hgGcmDecrypt(keyHex, ivHex, aadHex, valueHex) {
  var cipher = valueHex.slice(0, -32), tag = valueHex.slice(-32);
  var ks = hgExpandKey(keyHex);
  var h = hgCtr(keyHex, "00000000000000000000000000000000", "00000000000000000000000000000000");
  var want = (BigInt("0x" + hgGhash(aadHex, cipher, h)) ^ BigInt("0x" + hgEncryptBlock(ks, ivHex + "00000001"))).toString(16).padStart(32, "0");
  if (want.toLowerCase() !== tag.toLowerCase()) throw hgFail("站点响应认证失败");
  return hgCtr(keyHex, ivHex + "00000002", cipher);
}

/* ============================== P-256 ============================== */

var HG_P = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn;
var HG_N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
var HG_GX = 0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n;
var HG_GY = 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n;
function hgMod(x) { return (x % HG_P + HG_P) % HG_P; }
function hgInv(x) {
  var a = hgMod(x), b = HG_P, u = 1n, v = 0n;
  while (b) { var q = a / b, t = b; b = a % b; a = t; t = v; v = u - q * v; u = t; }
  if (a !== 1n) throw hgFail("曲线逆元失败");
  return hgMod(u);
}
function hgAdd(p1, p2) {
  if (!p1) return p2;
  if (!p2) return p1;
  if (p1[0] === p2[0] && hgMod(p1[1] + p2[1]) === 0n) return null;
  var m = p1[0] === p2[0]
    ? hgMod((3n * p1[0] * p1[0] - 3n) * hgInv(2n * p1[1]))
    : hgMod((p2[1] - p1[1]) * hgInv(p2[0] - p1[0]));
  var x = hgMod(m * m - p1[0] - p2[0]);
  return [x, hgMod(m * (p1[0] - x) - p1[1])];
}
function hgMul(n, p) {
  var r = null;
  for (var i = 0; i < 256; i++) { if (n & 1n) r = hgAdd(r, p); n >>= 1n; p = hgAdd(p, p); }
  if (!r) throw hgFail("曲线点无效");
  return r;
}
function hgP256Public(nHex) {
  var pub = hgMul(BigInt("0x" + nHex), [HG_GX, HG_GY]);
  return "04" + pub[0].toString(16).padStart(64, "0") + pub[1].toString(16).padStart(64, "0");
}
function hgP256Shared(nHex, publicHex) {
  var raw = String(publicHex || "").toLowerCase().replace(/^04/, "");
  if (!/^[0-9a-f]{128}$/.test(raw)) throw hgFail("站点公钥格式无效");
  var p = [BigInt("0x" + raw.slice(0, 64)), BigInt("0x" + raw.slice(64))];
  var b = 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn;
  if (p[0] >= HG_P || p[1] >= HG_P || hgMod(p[1] * p[1] - (p[0] * p[0] * p[0] - 3n * p[0] + b)) !== 0n) {
    throw hgFail("站点公钥不在 P-256 曲线上");
  }
  return hgMul(BigInt("0x" + nHex), p)[0].toString(16).padStart(64, "0");
}

/* ============================== 站点上下文 ============================== */

function hgCtx(params) {
  params = params || {};
  return {
    mode: String(params.mode || "main"),
    site: String(params.site || "").trim(),
    cookie: String(params.cookie || "").trim(),
    timeout: Math.max(5, Math.min(30, Number(params.timeout) || 15)),
    cover: String(params.cover || "off"),
  };
}
function hgBase(ctx) {
  if (ctx.mode === "custom") {
    var value = String(ctx.site || "").trim().replace(/\/+$/, "");
    if (!/^https?:\/\/[^/]+/i.test(value)) throw hgFail("请先填写自定义站点地址，形如 https://huangguoai.com");
    return value;
  }
  return ctx.mode === "ai" ? HG_AI : HG_SITE;
}
function hgHostOf(base) { return String(base).replace(/^https?:\/\//i, "").replace(/\/.*$/, ""); }
function hgOriginOf(url) {
  var m = /^(https?):\/\/([^/?#]+)/i.exec(String(url || ""));
  return m ? m[1].toLowerCase() + "://" + m[2].toLowerCase() : "";
}
function hgJoin(base, path) {
  var value = String(path || "");
  if (/^https?:\/\//i.test(value)) return value;
  return base + (value.charAt(0) === "/" ? value : "/" + value);
}
function hgQuery(path, params) {
  var parts = [];
  for (var key in params) {
    if (!Object.prototype.hasOwnProperty.call(params, key)) continue;
    if (params[key] === undefined || params[key] === null || params[key] === "") continue;
    parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
  }
  return path + (parts.length ? "?" + parts.join("&") : "");
}
function hgAbs(base, raw) {
  var value = String(raw === undefined || raw === null ? "" : raw)
    .replace(/\\u0026/gi, "&").replace(/\\u002f/gi, "/").replace(/\\\//g, "/").replace(/&amp;/gi, "&").trim();
  if (!value || /^(?:data|javascript|blob):/i.test(value)) return "";
  if (/^https?%3a%2f%2f/i.test(value)) { try { value = decodeURIComponent(value); } catch (_) { return ""; } }
  if (/^https?:\/\//i.test(value)) return value;
  if (value.indexOf("//") === 0) return "https:" + value;
  return base + (value.charAt(0) === "/" ? value : "/" + value);
}

/* ============================== HTTP 传输 ============================== */

function hgPayload(response) {
  var data = response && response.data !== undefined ? response.data : response;
  if (typeof data === "string") {
    var text = data, trimmed = text.trim();
    var json = null;
    if (trimmed.charAt(0) === "{" || trimmed.charAt(0) === "[") {
      try { json = JSON.parse(trimmed); } catch (_) { json = null; }
    }
    return { text: text, json: json };
  }
  if (data === undefined || data === null) return { text: "", json: null };
  return { text: JSON.stringify(data), json: data };
}
function hgStatusOf(error) {
  if (!error) return 0;
  return Number(error.status || error.statusCode || (error.response && (error.response.status || error.response.statusCode))) || 0;
}
async function hgRequest(ctx, method, path, body, extra) {
  var base = hgBase(ctx), url = hgJoin(base, path);
  if (hgOriginOf(url) !== base.toLowerCase()) throw hgFail("接口地址不属于当前站点");
  var headers = { "User-Agent": HG_UA, Referer: base + "/", Origin: base, Accept: "application/json, text/plain, */*" };
  for (var key in extra || {}) if (Object.prototype.hasOwnProperty.call(extra, key)) headers[key] = extra[key];
  if (ctx.cookie) {
    if (/[\r\n]/.test(ctx.cookie)) throw hgFail("Cookie 不能包含换行");
    headers.Cookie = ctx.cookie;
  }
  if (method === "POST") headers["Content-Type"] = "application/json";
  var options = { headers: headers, timeout: ctx.timeout * 1000 };
  var response;
  try {
    response = method === "POST"
      ? await Widget.http.post(url, JSON.stringify(body || {}), options)
      : await Widget.http.get(url, options);
  } catch (error) {
    var status = hgStatusOf(error);
    if (status === 400 && error.response) {
      var parsed = hgPayload(error.response);
      if (parsed.json && parsed.json.error === "session_expired") return { status: 400, json: parsed.json, text: parsed.text };
    }
    if (status) {
      throw hgFail(status === 429 ? "站点请求受限，请稍后重试" : (status === 401 || status === 403) ? "站点拒绝访问，请检查访问条件或 Cookie" : "站点接口请求失败（HTTP " + status + "）");
    }
    throw hgFail("无法连接站点，请检查网络或节点");
  }
  var payload = hgPayload(response);
  payload.status = Number((response && (response.status || response.statusCode)) || 200);
  if (payload.status === 400 && payload.json && payload.json.error === "session_expired") return payload;
  if (payload.status < 200 || payload.status >= 300) throw hgFail("站点接口请求失败（HTTP " + payload.status + "）");
  return payload;
}
function hgBusiness(json) {
  if (!json || typeof json !== "object") throw hgFail("站点接口未返回有效数据");
  var status = Number(json.status === undefined ? json.code : json.status);
  if (status !== 1 && status !== 200) {
    var reason = hgText(json.msg || json.message, 160);
    if (!reason) reason = "站点接口返回失败状态";
    if (status === 401 || status === 403 || status === 110) throw hgFail("站点限制访问：" + reason);
    if (status === 429) throw hgFail("站点请求受限，请稍后重试");
    throw hgFail(reason);
  }
  if (!json.data || typeof json.data !== "object") throw hgFail("站点接口缺少数据");
  return json.data;
}

/* ============================== 公开接口 ============================== */

function hgRetryable(message) {
  message = String(message || "");
  if (/拒绝访问|限制访问|Cookie|不存在|已下线|请重新/.test(message)) return false;
  return /HTTP 5\d\d|超时|无法连接站点|失败|繁忙|稍后/.test(message);
}
async function hgPublic(ctx, path, attempt) {
  // 站点前置了 CloudFront，偶发 5xx / 超时；重试一次能省掉用户手动刷新
  try {
    var response = await hgRequest(ctx, "POST", "/api/public/request",
      { method: "GET", path: path, body: "", content_type: "" }, { "X-HG-Public-JSON": "1" });
    return hgBusiness(response.json);
  } catch (error) {
    if ((attempt || 0) < 2 && hgRetryable(error && error.message)) {
      await new Promise(function (resolve) { setTimeout(resolve, 600 + 600 * (attempt || 0)); });
      return hgPublic(ctx, path, (attempt || 0) + 1);
    }
    throw error;
  }
}
async function hgHtml(ctx, path) {
  var response = await hgRequest(ctx, "GET", path, null, { Accept: "text/html,application/xhtml+xml,*/*" });
  return response.text;
}

/* ============================== 加密会话 ============================== */

var HG_SESSIONS = {};
function hgSessionKey(ctx, scope) { return hgBase(ctx) + "|" + scope + "|" + ctx.cookie; }

async function hgOpenSession(ctx, scope) {
  var n;
  do { n = BigInt("0x" + hgRandomHex(32)); } while (n < 1n || n >= HG_N);
  var nHex = n.toString(16).padStart(64, "0");
  var helloResponse = await hgRequest(ctx, "POST", "/api/" + scope + "/request",
    { v: 1, type: "hello", client_pub: hgB64FromHex(hgP256Public(nHex)) });
  var hello = helloResponse.json;
  if (!hello || hello.v !== 1 || hello.type !== "hello" || !/^[A-Za-z0-9_-]{1,64}$/.test(String(hello.kid || "")) ||
      !/^[A-Za-z0-9_-]{16,128}$/.test(String(hello.sid || "")) || !Number.isSafeInteger(hello.server_time) ||
      !Number.isSafeInteger(hello.expires_at) || hello.expires_at <= hello.server_time || hello.expires_at - hello.server_time > 600) {
    throw hgFail("站点加密会话握手失败");
  }
  var sharedHex = hgP256Shared(nHex, hgHexFromB64(hello.server_pub));
  var saltHex = hgHexFromB64(hello.salt);
  if (saltHex.length !== 64) throw hgFail("站点加密会话参数无效");
  var info = ["dx150-edge-v1", scope, String(hello.site || ""), String(hello.kid), String(hello.sid)].join("\n");
  var local = Math.floor(Date.now() / 1000);
  return {
    kid: String(hello.kid), sid: String(hello.sid), info: info, sequence: 0,
    expires: local + hello.expires_at - hello.server_time,
    skew: Number(hello.server_time) - local,
    requestKey: hgDerive(sharedHex, saltHex, info + "\nreq"),
    responseKey: hgDerive(sharedHex, saltHex, info + "\nres"),
  };
}
async function hgEncrypted(ctx, scope, request, renewed) {
  if (scope !== "playback" && scope !== "dynamic") throw hgFail("不支持的站点接口范围");
  var key = hgSessionKey(ctx, scope), session = HG_SESSIONS[key];
  if (!session || session.expires <= Date.now() / 1000 + 5 || session.sequence >= 16384) {
    session = await hgOpenSession(ctx, scope);
    var keys = Object.keys(HG_SESSIONS);
    if (keys.length >= 4) delete HG_SESSIONS[keys[0]];
    HG_SESSIONS[key] = session;
  }
  var seq = ++session.sequence;
  var ts = Math.floor(Date.now() / 1000) + session.skew;
  // 12 字节 IV：8 字节零 + 4 字节序号（与站点 Web 客户端一致）
  var iv = "0000000000000000" + seq.toString(16).padStart(8, "0");
  function aad(dir) { return hgUtf8Hex([session.info, dir, seq, ts].join("\n")); }
  var ciphertext = hgB64FromHex(hgGcmEncrypt(session.requestKey, iv, aad("req"), hgUtf8Hex(JSON.stringify({ request: request }))));
  var response = await hgRequest(ctx, "POST", "/api/" + scope + "/request",
    { v: 1, type: "call", kid: session.kid, sid: session.sid, seq: seq, ts: ts, ciphertext: ciphertext });
  var result = response.json || {};
  if (result.error === "session_expired") {
    delete HG_SESSIONS[key];
    if (!renewed) return hgEncrypted(ctx, scope, request, true);
    throw hgFail("站点会话已失效，请稍后重试");
  }
  if (result.v !== 1 || result.type !== "result" || result.sid !== session.sid || result.kid !== session.kid ||
      result.seq !== seq || result.ts !== ts) {
    delete HG_SESSIONS[key];
    throw hgFail("站点加密响应与本次请求不匹配");
  }
  var inner;
  try {
    inner = JSON.parse(hgUtf8FromHex(hgGcmDecrypt(session.responseKey, iv, aad("res"), hgHexFromB64(result.ciphertext))));
  } catch (error) {
    delete HG_SESSIONS[key];
    throw hgFail("站点响应认证或解密失败");
  }
  if (!Number.isInteger(inner.status) || inner.status < 200 || inner.status > 599) throw hgFail("站点响应状态无效");
  if (inner.status < 200 || inner.status >= 300) {
    throw hgFail((inner.status === 401 || inner.status === 403) ? "站点拒绝访问，请检查访问条件或 Cookie" : "站点接口请求失败（HTTP " + inner.status + "）");
  }
  var data;
  try { data = JSON.parse(hgUtf8FromHex(hgHexFromB64(inner.body))); } catch (_) { throw hgFail("站点响应正文无效"); }
  return hgBusiness(data);
}

/* ============================== 条目映射 ============================== */

function hgItems(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && Array.isArray(value.videos)) return value.videos;
  if (value && Array.isArray(value.list)) return value.list;
  return [];
}
function hgPoster(ctx, base, url) {
  if (ctx.cover === "off") return "";
  return hgAbs(base, url);
}
function hgLinkOf(base, id, ep) {
  return "huangguo:" + id + ":" + (ep || 1) + "@" + hgHostOf(base);
}
function hgParseLink(link) {
  var text = String(link || "");
  if (/%3A/i.test(text)) { try { text = decodeURIComponent(text); } catch (_) {} }
  var match = /^huangguo:([1-9]\d{0,18})(?::([1-9]\d{0,3}))?(?:@([A-Za-z0-9.\-]+(?::\d{1,5})?))?$/i.exec(text.trim());
  if (!match) return null;
  return { id: match[1], ep: Number(match[2] || 1), host: match[3] || "" };
}
function hgCard(ctx, base, row) {
  var id = String(row.id || row.video_id || "");
  var title = hgText(row.title || row.name, 240);
  if (!/^[1-9]\d{0,18}$/.test(id) || !title) return null;
  var poster = hgPoster(ctx, base, row.cover || row.coverSrc || row.poster);
  var count = Number(row.episode_count || row.total_episodes || 0);
  var item = {
    id: hgLinkOf(base, id, 1),
    type: "video",
    title: title,
    seriesName: title,
    mediaType: "tv",
    link: hgLinkOf(base, id, 1),
  };
  if (poster) { item.posterPath = poster; item.backdropPath = poster; }
  if (count > 1) item.description = (row.is_finished ? "全 " : "更新至 ") + count + " 集";
  else if (row.description) item.description = hgText(row.description, 300);
  return item;
}
function hgVideoPage(ctx, value) {
  var base = hgBase(ctx), rows = hgItems(value), seen = {}, items = [];
  for (var i = 0; i < rows.length; i++) {
    var item = hgCard(ctx, base, rows[i] || {});
    if (item && !seen[item.link]) { seen[item.link] = true; items.push(item); }
  }
  return items;
}
function hgPageOf(params) {
  var page = parseInt(params && params.page, 10);
  return page > 0 ? page : 1;
}

/* ============================== 详情 ============================== */

function hgInitialData(html) {
  var match = /<script[^>]*\bid\s*=\s*["']videoInitialData["'][^>]*>([\s\S]*?)<\/script>/i.exec(String(html || ""));
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch (_) { return null; }
}
function hgAttr(attrs, name) {
  var match = new RegExp("\\b" + name + "\\s*=\\s*[\"']([^\"']*)[\"']", "i").exec(String(attrs || ""));
  return match ? match[1] : "";
}
function hgEpisodes(html, id, data) {
  var episodes = {}, match;
  var pattern = /<a\b([^>]*\bdata-ep-id\s*=\s*["']?(\d{1,4})["']?[^>]*)>/gi;
  while ((match = pattern.exec(String(html || "")))) {
    var ep = Number(match[2]);
    if (!Number.isInteger(ep) || ep < 1 || ep > 10000) continue;
    var href = hgAttr(match[1], "href");
    var path = /^\/video\/([1-9]\d{0,18})\/(?:ep-([1-9]\d{0,3})\/)?/.exec(String(href));
    if (path && path[1] === id && Number(path[2] || 1) === ep) episodes[ep] = ep;
  }
  if (!Object.keys(episodes).length && data && data.trackingEpisodes) {
    for (var key in data.trackingEpisodes) {
      var value = Number(key);
      if (Number.isInteger(value) && value > 0 && value <= 10000) episodes[value] = value;
    }
  }
  if (!Object.keys(episodes).length) {
    var single = Number(data && data.ep) || 1;
    episodes[single] = single;
  }
  return Object.keys(episodes).map(Number).sort(function (a, b) { return a - b; });
}
async function hgDetail(ctx, link) {
  var parsed = hgParseLink(link);
  if (!parsed) return null;
  var base = hgBase(ctx), id = parsed.id;
  var html = await hgHtml(ctx, "/video/" + id + "/");
  var data = hgInitialData(html);
  if (data && String(data.id) !== id) data = null;
  var title = hgText((data && data.title) || ((/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html) || [])[1] || "").replace(/<[^>]+>/g, ""), 240);
  if (!title) return null;
  var poster = hgPoster(ctx, base, (data && (data.posterSrc || data.coverSrc)) || "");
  var episodes = hgEpisodes(html, id, data || {});
  var episodeItems = episodes.map(function (ep) {
    var item = {
      id: hgLinkOf(base, id, ep),
      type: "url",
      title: title + " · 第" + ep + "集",
      seriesName: title,
      episodeName: "第" + ep + "集",
      episode: ep,
      mediaType: "tv",
      link: hgLinkOf(base, id, ep),
    };
    if (poster) item.posterPath = poster;
    return item;
  });
  var detail = {
    id: hgLinkOf(base, id, 1),
    type: "url",
    title: title,
    seriesName: title,
    mediaType: "tv",
    episodeItems: episodeItems,
    link: hgLinkOf(base, id, 1),
  };
  if (poster) { detail.posterPath = poster; detail.backdropPath = poster; }
  if (data && data.description) detail.description = hgText(data.description, 4000);
  return detail;
}

/* ============================== 播放 ============================== */

function hgMime(url) {
  var match = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(String(url || ""));
  var ext = match ? match[1].toLowerCase() : "";
  return { m3u8: "application/vnd.apple.mpegurl", mp4: "video/mp4", webm: "video/webm", mkv: "video/x-matroska", flv: "video/x-flv" }[ext] || "";
}
async function hgPlayback(ctx, id, ep) {
  var base = hgBase(ctx);
  var value = await hgEncrypted(ctx, "playback", {
    method: "POST",
    path: "/api/videos/" + id + "/episodes/" + ep + "/playback",
    body: hgStdB64("{}"),
    content_type: "application/json",
  });
  if (!value || String(value.id) !== id || Number(value.ep) !== ep || !value.streams) throw hgFail("播放接口返回的影片或选集不匹配");
  var referer = base + "/video/" + id + "/" + (ep > 1 ? "ep-" + ep + "/" : "");
  var cdn = value.cdn || {};
  var streams = [];
  var pairs = [["main", "默认线路", value.streams.main], ["hevc", "HEVC 线路", value.streams.hevc]];
  for (var i = 0; i < pairs.length; i++) {
    var url = hgAbs(base, pairs[i][2]);
    if (!url || !/^https?:\/\//i.test(url)) continue;
    var duplicate = false;
    for (var j = 0; j < streams.length; j++) if (streams[j].url === url) duplicate = true;
    if (duplicate) continue;
    streams.push({
      id: pairs[i][0],
      name: pairs[i][1],
      url: url,
      mime: hgMime(url),
      referer: referer,
      origin: hgOriginOf(url),
      authKey: /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(String(cdn.authKey || "")) ? String(cdn.authKey) : "",
      authValue: /[\r\n]/.test(String(cdn.authValue || "")) ? "" : String(cdn.authValue || ""),
      app: /[\r\n]/.test(String(cdn.app || "")) ? "" : String(cdn.app || ""),
      m3u8Enabled: !!cdn.m3u8Enabled,
      otherEnabled: !!cdn.otherEnabled,
    });
  }
  if (!streams.length) throw hgFail("播放接口没有返回有效的媒体地址");
  return streams;
}
function hgHeadersFor(stream, withAuth) {
  var headers = { "User-Agent": HG_UA };
  if (stream.referer) { headers.Referer = stream.referer; headers.Origin = hgOriginOf(stream.referer); }
  if (withAuth && stream.authKey && stream.authValue) {
    headers[stream.authKey] = stream.authValue;
    if (stream.app) headers["x-cdn-app"] = stream.app;
  }
  return headers;
}
function hgWantsAuth(stream) {
  if (!stream.authKey || !stream.authValue) return false;
  if (stream.m3u8Enabled) return true;
  return stream.otherEnabled && /\.(?:ts|m4s|key)(?:[?#]|$)/i.test(stream.url);
}
async function hgProbe(url, headers) {
  try {
    var response = await Widget.http.get(url, { headers: headers, timeout: 15000 });
    var payload = hgPayload(response);
    var status = Number((response && (response.status || response.statusCode)) || 200);
    if (status < 200 || status >= 300) return false;
    return /#EXTM3U/i.test(payload.text) || payload.text.length > 0;
  } catch (error) {
    return false;
  }
}
