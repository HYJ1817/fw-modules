WidgetMetadata = {
  id: "user.one",
  title: "ONE一个",
  description: "ONE 一个 · 影视类内容（直连官方接口，游客 token 自动获取）",
  author: "YG",
  version: "2.2.0",
  requiredVersion: "0.0.1",
  detailCacheDuration: 30,
  search: {
    title: "搜索 ONE 一个",
    functionName: "searchVideos",
    params: [{ name: "keyword", title: "关键词（番号/演员/标题）", type: "input", value: "" }]
  },
  modules: [
    {
      id: "one-resource",
      title: "播放资源",
      description: "按需解析 ONE 播放地址（详情页调用）",
      requiresWebView: false,
      cacheDuration: 0,
      functionName: "loadResource",
      type: "stream",
      params: [
        { name: "link", title: "详情链接", type: "input", value: "" },
        { name: "title", title: "标题", type: "input", value: "" }
      ]
    },
    {
      id: "one-search",
      title: "搜索",
      description: "搜索 ONE 的片/图/文/音",
      requiresWebView: false,
      cacheDuration: 60,
      functionName: "searchVideos",
      params: [{ name: "keyword", title: "关键词", type: "input", value: "" }]
    },
    {
      id: "one-video-new",
      title: "最新视频",
      description: "全库最新上传（长视频 + 视频），按月自动回溯",
      requiresWebView: false,
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "kind", title: "类型", type: "constant", value: "newest" },
        { name: "page", title: "页码", type: "page" }
      ]
    },
    {
      id: "one-video-hot",
      title: "热门视频",
      description: "全库热门榜（按当月点赞排序，逐月往前）",
      requiresWebView: false,
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "kind", title: "类型", type: "constant", value: "hot" },
        { name: "page", title: "页码", type: "page" }
      ]
    },
    {
      id: "one-part-jp",
      title: "日本",
      description: "日本分区 · 按月自动回溯全部视频",
      requiresWebView: false,
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "kind", title: "类型", type: "constant", value: "partition" },
        { name: "tag", title: "分区", type: "constant", value: "2" },
        { name: "partition", title: "分区", type: "constant", value: "jp" },
        { name: "page", title: "页码（页码＝月份，1 为当月）", type: "page" }
      ]
    },
    {
      id: "one-part-cn",
      title: "国产",
      description: "国产分区 · 按月自动回溯全部视频",
      requiresWebView: false,
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "kind", title: "类型", type: "constant", value: "partition" },
        { name: "tag", title: "分区", type: "constant", value: "3" },
        { name: "partition", title: "分区", type: "constant", value: "cn" },
        { name: "page", title: "页码（页码＝月份，1 为当月）", type: "page" }
      ]
    },
    {
      id: "one-part-us",
      title: "欧美",
      description: "欧美分区 · 按月自动回溯全部视频",
      requiresWebView: false,
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "kind", title: "类型", type: "constant", value: "partition" },
        { name: "tag", title: "分区", type: "constant", value: "1" },
        { name: "partition", title: "分区", type: "constant", value: "us" },
        { name: "page", title: "页码（页码＝月份，1 为当月）", type: "page" }
      ]
    },
    {
      id: "one-part-live",
      title: "ONE 直播",
      description: "ONE 直播回放合集 · 按月自动回溯，点进合集看全部场次",
      requiresWebView: false,
      cacheDuration: 120,
      functionName: "loadList",
      params: [
        { name: "kind", title: "类型", type: "constant", value: "partition" },
        { name: "tag", title: "分区", type: "constant", value: "4" },
        { name: "partition", title: "分区", type: "constant", value: "live" },
        { name: "page", title: "页码（页码＝月份，1 为当月）", type: "page" }
      ]
    }
  ]
};

// ---------- UTF-8 ----------
function utf8Encode(str) {
  var out = [];
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 63)); }
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      var c2 = str.charCodeAt(i + 1);
      var cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
      i++;
      out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    } else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
  }
  return out;
}
function utf8Decode(bytes) {
  var s = "", i = 0;
  while (i < bytes.length) {
    var b = bytes[i++];
    if (b < 0x80) s += String.fromCharCode(b);
    else if (b < 0xe0) { s += String.fromCharCode(((b & 31) << 6) | (bytes[i++] & 63)); }
    else if (b < 0xf0) { s += String.fromCharCode(((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63)); }
    else {
      var cp = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
      cp -= 0x10000;
      s += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 1023));
    }
  }
  return s;
}
// ---------- Base64 ----------
var B64C = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var B64R = null;
function base64Encode(bytes) {
  var out = "", i;
  for (i = 0; i + 2 < bytes.length; i += 3) {
    var n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64C[(n >> 18) & 63] + B64C[(n >> 12) & 63] + B64C[(n >> 6) & 63] + B64C[n & 63];
  }
  var rem = bytes.length - i;
  if (rem === 1) { var n1 = bytes[i] << 16; out += B64C[(n1 >> 18) & 63] + B64C[(n1 >> 12) & 63] + "=="; }
  else if (rem === 2) { var n2 = (bytes[i] << 16) | (bytes[i + 1] << 8); out += B64C[(n2 >> 18) & 63] + B64C[(n2 >> 12) & 63] + B64C[(n2 >> 6) & 63] + "="; }
  return out;
}
function base64Decode(str) {
  if (!B64R) { B64R = {}; for (var k = 0; k < B64C.length; k++) B64R[B64C.charAt(k)] = k; }
  var s = String(str || "").replace(/[^A-Za-z0-9+/]/g, "");
  var out = [], i;
  for (i = 0; i + 3 < s.length; i += 4) {
    var n = (B64R[s.charAt(i)] << 18) | (B64R[s.charAt(i + 1)] << 12) | (B64R[s.charAt(i + 2)] << 6) | B64R[s.charAt(i + 3)];
    out.push((n >> 16) & 255, (n >> 8) & 255, n & 255);
  }
  var rest = s.length - i;
  if (rest === 3) { var m = (B64R[s.charAt(i)] << 18) | (B64R[s.charAt(i + 1)] << 12) | (B64R[s.charAt(i + 2)] << 6); out.push((m >> 16) & 255, (m >> 8) & 255); }
  else if (rest === 2) { var m2 = (B64R[s.charAt(i)] << 18) | (B64R[s.charAt(i + 1)] << 12); out.push((m2 >> 16) & 255); }
  return out;
}
// ---------- MD5 ----------
function md5Hex(str) {
  var msg = utf8Encode(str), len = msg.length;
  var bitLen = len * 8;
  msg.push(0x80);
  while (msg.length % 64 !== 56) msg.push(0);
  var lo = bitLen >>> 0, hi = Math.floor(bitLen / 4294967296) >>> 0;
  msg.push(lo & 255, (lo >>> 8) & 255, (lo >>> 16) & 255, (lo >>> 24) & 255);
  msg.push(hi & 255, (hi >>> 8) & 255, (hi >>> 16) & 255, (hi >>> 24) & 255);
  var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  var S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
           5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
           4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
           6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  var K = [];
  for (var i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
  for (var off = 0; off < msg.length; off += 64) {
    var M = [];
    for (var j = 0; j < 16; j++) M[j] = msg[off + j * 4] | (msg[off + j * 4 + 1] << 8) | (msg[off + j * 4 + 2] << 16) | (msg[off + j * 4 + 3] << 24);
    var A = a0, B = b0, C = c0, D = d0;
    for (var r = 0; r < 64; r++) {
      var F, g;
      if (r < 16) { F = (B & C) | (~B & D); g = r; }
      else if (r < 32) { F = (D & B) | (~D & C); g = (5 * r + 1) % 16; }
      else if (r < 48) { F = B ^ C ^ D; g = (3 * r + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * r) % 16; }
      var tmp = D; D = C; C = B;
      var sum = (A + F + K[r] + M[g]) | 0;
      B = (B + ((sum << S[r]) | (sum >>> (32 - S[r])))) | 0;
      A = tmp;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  function w(x) { var s = ""; for (var i = 0; i < 4; i++) { var b = (x >>> (i * 8)) & 255; s += ("0" + b.toString(16)).slice(-2); } return s; }
  return w(a0) + w(b0) + w(c0) + w(d0);
}
// ---------- AES-128 ----------
var AES = (function () {
  function xt(a) { return ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 0xff; }
  function mul(a, b) { var r = 0; while (b) { if (b & 1) r ^= a; a = xt(a); b >>= 1; } return r & 0xff; }
  var SBOX = [], INV = [];
  for (var a = 0; a < 256; a++) {
    var inv = 0;
    if (a) { for (var b = 1; b < 256; b++) { if (mul(a, b) === 1) { inv = b; break; } } }
    var x = inv;
    var s = x ^ ((x << 1 | x >> 7) & 255) ^ ((x << 2 | x >> 6) & 255) ^ ((x << 3 | x >> 5) & 255) ^ ((x << 4 | x >> 4) & 255) ^ 0x63;
    SBOX[a] = s & 0xff;
  }
  for (var i = 0; i < 256; i++) INV[SBOX[i]] = i;
  function expandKey(key) {
    var w = [], i;
    for (i = 0; i < 4; i++) w[i] = [(key[i * 4] << 24) | (key[i * 4 + 1] << 16) | (key[i * 4 + 2] << 8) | key[i * 4 + 3]];
    w[0] = (key[0] << 24) | (key[1] << 16) | (key[2] << 8) | key[3];
    w[1] = (key[4] << 24) | (key[5] << 16) | (key[6] << 8) | key[7];
    w[2] = (key[8] << 24) | (key[9] << 16) | (key[10] << 8) | key[11];
    w[3] = (key[12] << 24) | (key[13] << 16) | (key[14] << 8) | key[15];
    var rcon = 1;
    for (i = 4; i < 44; i++) {
      var t = w[i - 1];
      if (i % 4 === 0) {
        t = ((t << 8) | (t >>> 24)) >>> 0;
        t = ((SBOX[(t >>> 24) & 255] << 24) | (SBOX[(t >>> 16) & 255] << 16) | (SBOX[(t >>> 8) & 255] << 8) | SBOX[t & 255]) >>> 0;
        t = (t ^ (rcon << 24)) >>> 0;
        rcon = xt(rcon);
      }
      w[i] = (w[i - 4] ^ t) >>> 0;
    }
    return w;
  }
  function encBlock(w, s) {
    var st = [];
    for (var i = 0; i < 4; i++) st[i] = s[i] ^ w[i];
    for (var round = 1; round <= 10; round++) {
      var t = [];
      for (var c = 0; c < 4; c++) {
        t[c] = (SBOX[(st[c] >>> 24) & 255] << 24) | (SBOX[(st[c] >>> 16) & 255] << 16) | (SBOX[(st[c] >>> 8) & 255] << 8) | SBOX[st[c] & 255];
      }
      // shift rows (state is column-major: t[c] holds column c rows 0..3)
      var sh = [];
      for (var c2 = 0; c2 < 4; c2++) {
        var b0 = (t[c2] >>> 24) & 255, b1 = (t[c2] >>> 16) & 255, b2 = (t[c2] >>> 8) & 255, b3 = t[c2] & 255;
        sh[c2] = [b0, b1, b2, b3];
      }
      var rows = [[], [], [], []];
      for (var col = 0; col < 4; col++) for (var row = 0; row < 4; row++) rows[row][col] = sh[col][row];
      for (var row2 = 0; row2 < 4; row2++) {
        var tmp = rows[row2].slice();
        for (var col2 = 0; col2 < 4; col2++) rows[row2][col2] = tmp[(col2 + row2) % 4];
      }
      for (var col3 = 0; col3 < 4; col3++) for (var row3 = 0; row3 < 4; row3++) sh[col3][row3] = rows[row3][col3];
      var mixed = [];
      for (var c3 = 0; c3 < 4; c3++) {
        var a0 = sh[c3][0], a1 = sh[c3][1], a2 = sh[c3][2], a3 = sh[c3][3];
        if (round !== 10) {
          mixed[c3] = ((mul(a0, 2) ^ mul(a1, 3) ^ a2 ^ a3) << 24 | (a0 ^ mul(a1, 2) ^ mul(a2, 3) ^ a3) << 16 | (a0 ^ a1 ^ mul(a2, 2) ^ mul(a3, 3)) << 8 | (mul(a0, 3) ^ a1 ^ a2 ^ mul(a3, 2))) >>> 0;
        } else {
          mixed[c3] = ((a0 << 24) | (a1 << 16) | (a2 << 8) | a3) >>> 0;
        }
      }
      for (var c4 = 0; c4 < 4; c4++) st[c4] = (mixed[c4] ^ w[round * 4 + c4]) >>> 0;
    }
    return st;
  }
  function invShift(st) {
    var cols = [];
    for (var c = 0; c < 4; c++) cols[c] = [(st[c] >>> 24) & 255, (st[c] >>> 16) & 255, (st[c] >>> 8) & 255, st[c] & 255];
    var rows = [[], [], [], []];
    for (var cc = 0; cc < 4; cc++) for (var rr = 0; rr < 4; rr++) rows[rr][cc] = cols[cc][rr];
    for (var r2 = 0; r2 < 4; r2++) { var t2 = rows[r2].slice(); for (var c2 = 0; c2 < 4; c2++) rows[r2][(c2 + r2) % 4] = t2[c2]; }
    for (var c3 = 0; c3 < 4; c3++) for (var r3 = 0; r3 < 4; r3++) cols[c3][r3] = rows[r3][c3];
    var out = [];
    for (var c4 = 0; c4 < 4; c4++) out[c4] = ((cols[c4][0] << 24) | (cols[c4][1] << 16) | (cols[c4][2] << 8) | cols[c4][3]) >>> 0;
    return out;
  }
  function invSub(st) {
    var out = [];
    for (var c = 0; c < 4; c++) out[c] = ((INV[(st[c] >>> 24) & 255] << 24) | (INV[(st[c] >>> 16) & 255] << 16) | (INV[(st[c] >>> 8) & 255] << 8) | INV[st[c] & 255]) >>> 0;
    return out;
  }
  function invMix(st) {
    var out = [];
    for (var c = 0; c < 4; c++) {
      var b0 = (st[c] >>> 24) & 255, b1 = (st[c] >>> 16) & 255, b2 = (st[c] >>> 8) & 255, b3 = st[c] & 255;
      out[c] = ((mul(b0, 14) ^ mul(b1, 11) ^ mul(b2, 13) ^ mul(b3, 9)) << 24 |
                (mul(b0, 9) ^ mul(b1, 14) ^ mul(b2, 11) ^ mul(b3, 13)) << 16 |
                (mul(b0, 13) ^ mul(b1, 9) ^ mul(b2, 14) ^ mul(b3, 11)) << 8 |
                (mul(b0, 11) ^ mul(b1, 13) ^ mul(b2, 9) ^ mul(b3, 14))) >>> 0;
    }
    return out;
  }
  function decBlock(w, s) {
    var st = [];
    for (var i = 0; i < 4; i++) st[i] = s[i] >>> 0;
    for (var round = 10; round >= 1; round--) {
      for (var k = 0; k < 4; k++) st[k] = (st[k] ^ w[round * 4 + k]) >>> 0;
      if (round !== 10) st = invMix(st);
      st = invShift(st);
      st = invSub(st);
    }
    for (var k2 = 0; k2 < 4; k2++) st[k2] = (st[k2] ^ w[k2]) >>> 0;
    return st;
  }
  function cbc(keyBytes, ivBytes, dataBytes, encrypt) {
    var w = expandKey(keyBytes);
    var iv = [];
    for (var i = 0; i < 4; i++) iv[i] = ((ivBytes[i * 4] << 24) | (ivBytes[i * 4 + 1] << 16) | (ivBytes[i * 4 + 2] << 8) | ivBytes[i * 4 + 3]) >>> 0;
    var out = [], prev = iv;
    for (var off = 0; off < dataBytes.length; off += 16) {
      var blk = [];
      for (var j = 0; j < 4; j++) blk[j] = ((dataBytes[off + j * 4] << 24) | (dataBytes[off + j * 4 + 1] << 16) | (dataBytes[off + j * 4 + 2] << 8) | dataBytes[off + j * 4 + 3]) >>> 0;
      var res;
      if (encrypt) res = encBlock(w, [blk[0] ^ prev[0], blk[1] ^ prev[1], blk[2] ^ prev[2], blk[3] ^ prev[3]]);
      else {
        res = decBlock(w, blk);
        res = [(res[0] ^ prev[0]) >>> 0, (res[1] ^ prev[1]) >>> 0, (res[2] ^ prev[2]) >>> 0, (res[3] ^ prev[3]) >>> 0];
      }
      for (var j2 = 0; j2 < 4; j2++) out.push((res[j2] >>> 24) & 255, (res[j2] >>> 16) & 255, (res[j2] >>> 8) & 255, res[j2] & 255);
      if (encrypt) prev = res;
      else prev = blk;
    }
    return out;
  }
  return { cbc: cbc };
})();
function aesEncryptCbcBase64(keyStr, ivStr, plainStr) {
  var data = utf8Encode(plainStr);
  var pad = 16 - (data.length % 16);
  for (var i = 0; i < pad; i++) data.push(pad);
  return base64Encode(AES.cbc(utf8Encode(keyStr), utf8Encode(ivStr), data, true));
}
function aesDecryptCbc(keyStr, ivStr, b64) {
  var bytes = base64Decode(b64);
  if (!bytes.length || bytes.length % 16 !== 0) return "";
  var out = AES.cbc(utf8Encode(keyStr), utf8Encode(ivStr), bytes, false);
  var pad = out[out.length - 1];
  if (pad >= 1 && pad <= 16) out = out.slice(0, out.length - pad);
  return utf8Decode(out);
}


// ============ 常量 ============
var APP_KEY = "l*bv%Ziq000Biaog";
var APP_IV = "8597506002939249";
var SIGN_SALT = "m4n2hjPeYWkD6tFpqKF^3HO^h24P@idT";
// 关键：新版本协议只给 4 分钟预告（video_file === preview_video），
// 而 app-version <= 2.0.0 的旧协议会在 video_download 里下发完整 MP4（无需登录）
var APP_VERSION = "1.6.0";
var UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var SEED_HOSTS = [
  "https://api.2b37894.com",
  "https://api.35a46dd.com",
  "https://api.43b8477.com",
  "https://api.5ce3771.com",
  "https://api.61c76a0.com",
  "https://api.632d809.com",
  "https://api.3459381.com",
  "https://api.em1oifd0.com",
  "https://api.j7y675.com"
];
var SES_KEY = "one:session:v2";
var S = null;          // 运行时会话
var STREAM_CACHE = {}; // id -> lines
var STREAM_TTL = 15 * 60 * 1000;

// ============ 基础工具 ============
function clean(s) {
  return String(s === null || s === undefined ? "" : s)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
function pick() {
  for (var i = 0; i < arguments.length; i++) {
    var v = arguments[i];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}
function encQuery(params) {
  if (!params) return "";
  var parts = [];
  var keys = Object.keys(params);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var v = params[k];
    if (v === undefined || v === null || v === "") continue;
    parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v)));
  }
  return parts.join("&");
}
function todayStr() {
  var d = new Date();
  var p = function (n) { return (n < 10 ? "0" : "") + n; };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function makeUuid() {
  var hex = [];
  for (var i = 0; i < 32; i++) hex.push("0123456789abcdef".charAt(Math.floor(Math.random() * 16)));
  var s = hex.join("");
  return s.slice(0, 8) + "-" + s.slice(8, 12) + "-4" + s.slice(13, 16) + "-a" + s.slice(17, 20) + "-" + s.slice(20, 32);
}
// 明文图床兜底（顺序按官方源码 OneClient.imageHosts：flutter_img 优先，resource 次之）。
// 官方 App 也是同样的做法：只拼 flutter_img，`image`/`image_low`/`flutter_enc_img` 回的是加密图，
// 响应头写着 image/jpeg、内容却是密文（比原图多几字节），拿来只能显示坏图，所以彻底不用。
var PLAIN_HOSTS = ["https://imgpw807.s7n7ue8.com", "https://imgpw807.2u7qzt7.com",
  "https://img807.hkq57tt.com", "https://imgsu807.hkq57tt.com"];
var ENC_HOSTS = ["gdliren123.com", "u3wwetf.com", "m6qzbb4.com", "bdsy56.com", "gzjsqx.com", "k8b3rsp.com"];
// 实测这类域名会被 CDN 发成错的证书（curl/node 报 ERR_TLS_CERT_ALTNAME_INVALID、code 000），
// 接口的 domain 表里还照发，拼上去就是坏图，统一拒掉。
var BAD_HOSTS = ["imgsu807.hkq57tt.com"];
function imgHosts() {
  var list = [];
  function add(arr) {
    if (!arr) return;
    for (var i = 0; i < arr.length; i++) {
      var h = String(arr[i] || "").replace(/\/+$/, "");
      if (!h || list.indexOf(h) >= 0) continue;
      if (hostIsBad(h)) continue;
      list.push(h);
    }
  }
  if (S) { add(S.fimg); add(S.resource); }
  add(PLAIN_HOSTS);
  return list;
}
function pathOf(url) {
  var m = String(url || "").match(/^https?:\/\/[^\/]+(\/.*)$/);
  return m ? m[1] : String(url || "");
}
// 明文图床有 4 个域名（resource ×2 + flutter_img ×2），按路径哈希轮流分配，
// 避免一页 24 张封面全打到同一个 host 被 CDN 限流打断（ECONNRESET → 空白封面）
function pickImgHost(p) {
  var hosts = imgHosts();
  if (!hosts.length) return "https://img807.hkq57tt.com";
  var h = 0;
  for (var i = 0; i < p.length; i++) h = (h * 31 + p.charCodeAt(i)) >>> 0;
  return hosts[h % hosts.length];
}
function absImage(path) {
  if (!path) return "";
  var p = String(path);
  if (/^https?:\/\//.test(p)) {
    for (var i = 0; i < ENC_HOSTS.length; i++) {
      if (p.indexOf(ENC_HOSTS[i]) >= 0) return pickImgHost(pathOf(p)) + pathOf(p);
    }
    return p;
  }
  return pickImgHost(p) + (p.charAt(0) === "/" ? "" : "/") + p;
}

function usableImage(url) {
  return !!url;
}
// 明文图床上的 .gif 是真 GIF（855x481、3–4MB），转成 520 宽 JPEG 静帧交给 Rex
var IMG_PROXY = "https://wsrv.nl/?url=";
function gifToJpeg(url) {
  if (!/\.gif(\?|$)/i.test(String(url))) return url;
  return IMG_PROXY + encodeURIComponent(url) + "&output=jpg&w=520";
}
function fillCovers(items) {
  // 只兜底 gif 转码，避免把别的条目的封面套到当前条目上（会出现整页同一张图）
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (it && it.posterPath && /\.gif(\?|$)/i.test(it.posterPath)) withImages(it, gifToJpeg(it.posterPath));
  }
  return items;
}
function bestImage(a) {
  if (!a) return "";
  // 与 ONE 客户端一致：thumbnail → thumb（Models.swift Article.coverPath），
  // 其后才是视频截帧与图集列表；静态图优先，.gif 放最后并用 wsrv 转 JPEG
  var cands = [a.thumbnail, a.thumb, a.video_cover, a.cover, a.thumb_tiny];
  if (a.multi_pic_thumbnail && a.multi_pic_thumbnail.length) cands = cands.concat(a.multi_pic_thumbnail);
  if (a.thumbnail_list && a.thumbnail_list.length) cands = cands.concat(a.thumbnail_list);
  var gif = "";
  for (var i = 0; i < cands.length; i++) {
    var u = absImage(cands[i]);
    if (!usableImage(u)) continue;
    if (/\.gif(\?|$)/i.test(u)) { if (!gif) gif = u; continue; }
    return u;
  }
  return gif ? gifToJpeg(gif) : "";
}
function absVideo(path, kind) {
  if (!path) return "";
  var p = String(path);
  if (/^https?:\/\//.test(p)) return p;
  var hosts = kind === "hls" ? (S && S.video_hls) : kind === "audio" ? (S && S.audio) : (S && S.video);
  if (!hosts || !hosts.length) hosts = ["https://46e9nz.mfpt8g.com"];
  return hosts[0] + (p.charAt(0) === "/" ? "" : "/") + p;
}
function withImages(item, url) {
  if (!url) return item;
  url = gifToJpeg(url);
  item.coverUrl = url; item.posterUrl = url; item.posterURL = url; item.posterurl = url;
  item.poster_url = url; item.posterPath = url; item.poster_path = url;
  item.backdropPath = url; item.backdropPaths = [url];
  item.thumbnailUrl = url; item.imageUrl = url;
  item.detailPoster = url; item.detailPosterUrl = url; item.detailPosterURL = url;
  item.detail_poster = url; item.detail_poster_path = url;
  return item;
}
// 直播合集标题形如「[ONE直播▶️]xxx」，前缀去掉、类型标为直播回放
function stripLiveTag(title) {
  var t = String(title || "");
  var m = t.match(/^\[(ONE\s*直播[^\]]*)\]\s*/i);
  if (!m) return { title: t, live: false };
  return { title: t.slice(m[0].length).trim(), live: true };
}
// 站点的 size 字段多数是 "612MB"，少数是「暂时保密」这类文字，别塞到描述里
function sizeLabel(v) {
  var t = String(v == null ? "" : v).trim();
  if (!t) return "";
  return /^\d+(\.\d+)?\s*(KB|MB|GB|TB)$/i.test(t) ? t : "";
}
function durationSeconds(a) {
  if (!a) return 0;
  var vl = parseInt(a.video_length, 10) || 0;
  if (vl > 0) return vl;
  var len = String(a.length || a.duration || "").trim();
  if (!len) return 0;
  var hms = len.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hms) {
    return hms[3] ? (+hms[1]) * 3600 + (+hms[2]) * 60 + (+hms[3]) : (+hms[1]) * 60 + (+hms[2]);
  }
  var mins = len.match(/(\d+(?:\.\d+)?)\s*(?:分钟|分|min)/i);
  if (mins) return Math.round(parseFloat(mins[1]) * 60);
  var hrs = len.match(/(\d+(?:\.\d+)?)\s*(?:小时|h)/i);
  if (hrs) return Math.round(parseFloat(hrs[1]) * 3600);
  var secs = len.match(/(\d+)\s*(?:秒|s)$/i);
  if (secs) return parseInt(secs[1], 10);
  return 0;
}
function secondsToText(sec) {
  var s = parseInt(sec, 10) || 0;
  if (s <= 0) return "";
  var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  var p = function (n) { return (n < 10 ? "0" : "") + n; };
  return h > 0 ? h + ":" + p(m) + ":" + p(ss) : m + ":" + p(ss);
}

// ============ 会话 / 请求 ============
async function loadSession() {
  if (S) return S;
  var raw = null;
  try { raw = Widget.storage.get(SES_KEY); } catch (e) { raw = null; }
  if (typeof raw === "string" && raw) {
    try {
      var saved = JSON.parse(raw);
      if (saved && saved.token) { S = saved; return S; }
    } catch (e) {}
  }
  S = { uuid: makeUuid(), host: "", token: "", api: [], image: [], resource: [], fimg: [], video: [], video_hls: [], audio: [], vplay: [], vdl: [], audl: [], ts: 0 };
  return S;
}
function saveSession() {
  try { Widget.storage.set(SES_KEY, JSON.stringify(S)); } catch (e) {}
}
function applyDomains(domain) {
  if (!domain) return;
  if (domain.api && domain.api.length) S.api = domain.api.slice();
  if (domain.image && domain.image.length) S.image = domain.image.slice();
  if (domain.resource && domain.resource.length) S.resource = domain.resource.slice();
  if (domain.flutter_img && domain.flutter_img.length) S.fimg = domain.flutter_img.slice();
  if (domain.video && domain.video.length) S.video = domain.video.slice();
  if (domain.video_hls && domain.video_hls.length) S.video_hls = domain.video_hls.slice();
  if (domain.audio && domain.audio.length) S.audio = domain.audio.slice();
  // 官方播放/下载用的 CDN 键（OneClient / MediaResolver 的 filePlay / fileDownload）：
  // flutter_video_play、flutter_video_download、audio_download、flutter_audio_download
  if (domain.flutter_video_play && domain.flutter_video_play.length) S.vplay = domain.flutter_video_play.slice();
  if (domain.flutter_video_download && domain.flutter_video_download.length) S.vdl = domain.flutter_video_download.slice();
  if (domain.audio_download && domain.audio_download.length) S.audl = domain.audio_download.slice();
}
function hostCandidates() {
  var list = [];
  if (S && S.host) list.push(S.host);
  if (S && S.api) for (var i = 0; i < S.api.length; i++) if (list.indexOf(S.api[i]) < 0) list.push(S.api[i]);
  for (var j = 0; j < SEED_HOSTS.length; j++) if (list.indexOf(SEED_HOSTS[j]) < 0) list.push(SEED_HOSTS[j]);
  return list;
}
function buildHeaders(token) {
  var ts = Math.floor(Date.now() / 1000);
  var sign = md5Hex(md5Hex("0.0.0.0.3." + ts + ".." + S.uuid) + SIGN_SALT);
  return {
    "platform": "3",
    "uuid": S.uuid,
    "timestamp": String(ts),
    "token": token === undefined ? (S.token || "") : token,
    "app-version": APP_VERSION,
    "sign": sign,
    "user-key": "",
    "ip": "0.0.0.0",
    "User-Agent": UA,
    "Accept": "*/*",
    "Content-Type": "application/x-www-form-urlencoded"
  };
}
function parsePayload(text) {
  if (text === null || text === undefined) return null;
  var str = typeof text === "string" ? text : JSON.stringify(text);
  str = str.trim();
  if (!str) return null;
  if (str.charAt(0) === "{") {
    try { return JSON.parse(str); } catch (e) { return null; }
  }
  var plain = "";
  try { plain = aesDecryptCbc(APP_KEY, APP_IV, str); } catch (e) { plain = ""; }
  if (!plain) return null;
  try { return JSON.parse(plain); } catch (e) { return null; }
}
async function postRaw(host, path, params, token) {
  var body = "";
  var qs = encQuery(params);
  if (qs) body = aesEncryptCbcBase64(APP_KEY, APP_IV, qs);
  var url = host + "/v2.5/" + path;
  var resp = await Widget.http.post(url, body, { headers: buildHeaders(token) });
  var text = resp && (resp.data !== undefined ? resp.data : resp);
  return parsePayload(text);
}
async function call(path, params, opts) {
  opts = opts || {};
  await loadSession();
  var retried = false;
  var bootstrapped = !!S.token;
  for (var attempt = 0; attempt < 3; attempt++) {
    var hosts = hostCandidates();
    var lastErr = null;
    for (var i = 0; i < hosts.length; i++) {
      try {
        var json = await postRaw(hosts[i], path, params, opts.tokenOverride);
        if (!json) { lastErr = new Error("empty response"); continue; }
        if (json.code === 200) {
          if (!opts.tokenOverride) { S.host = hosts[i]; saveSession(); }
          return json.data;
        }
        if (json.code === 401) { lastErr = new Error("401 " + (json.message || "")); break; }
        throw new Error("ONE " + json.code + " " + (json.message || ""));
      } catch (e) {
        lastErr = e;
      }
    }
    if (!retried && (String(lastErr && lastErr.message || "").indexOf("401") >= 0 || !bootstrapped)) {
      retried = true;
      await bootstrap(true);
      bootstrapped = true;
      continue;
    }
    throw lastErr || new Error("ONE 请求失败");
  }
  throw new Error("ONE 请求失败");
}
var BOOT_P = null;
async function bootstrap(force) {
  await loadSession();
  if (!force && S.token && S.host) return S;
  if (BOOT_P) return await BOOT_P;
  var p = doBootstrap();
  BOOT_P = p;
  try { return await p; } finally { if (BOOT_P === p) BOOT_P = null; }
}
async function doBootstrap() {
  var hosts = hostCandidates();
  var lastErr = null;
  for (var i = 0; i < hosts.length; i++) {
    try {
      var json = await postRaw(hosts[i], "bootstrap", null, "");
      if (json && json.code === 200 && json.data) {
        var user = json.data.user || {};
        S.host = hosts[i];
        S.token = user.token || "";
        applyDomains(json.data.domain);
        S.ts = Date.now();
        saveSession();
        return S;
      }
      lastErr = new Error("bootstrap " + (json && json.code));
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("ONE 初始化失败");
}

// ============ 数据整形 ============
function modelName(mid) {
  var m = parseInt(mid, 10);
  if (m === 1) return "图集";
  if (m === 2) return "视频";
  if (m === 3) return "视频";
  if (m === 4) return "图文";
  if (m === 5) return "音频";
  if (m === 6) return "长视频";
  return "内容";
}
function articleLink(id) { return "one://a/" + id; }
function seriesLink(kind, id) { return "one://s/" + kind + "/" + id; }
function actorLink(id) { return "one://p/" + id; }
function tagLink(id, title) { return "one://t/" + id + "/" + encodeURIComponent(String(title || "")); }

// 分区（用户要求：日本 / 国产 / 欧美 / ONE 直播）
// 服务端 demand_tag_id 只标了近期的少量内容（2024-11 各 tag 只有 0–1 条），
// 所以分区不再靠 tag 过滤，改为「按月扫描 model 6 长视频 + model 3 视频的完整视频流 + 本地地区分类」，
// 这样能一直往下刷到站点最早的内容。
// model 6 = 长视频库/直播合集（旧协议下 video_download 是完整片），model 3 = 视频库
var VIDEO_MODELS = [6, 3];
var TILE_TAGS = [1, 2, 3];
var PARTITIONS = [
  { id: "jp", tag: 2, title: "日本" },
  { id: "cn", tag: 3, title: "国产" },
  { id: "us", tag: 1, title: "欧美" },
  { id: "live", tag: 4, title: "ONE 直播" }
];
var PCOVER = {};

function partitionById(pid) {
  var key = String(pid || "").toLowerCase();
  for (var i = 0; i < PARTITIONS.length; i++) {
    if (PARTITIONS[i].id === key) return PARTITIONS[i];
  }
  return null;
}
function partitionByTag(tag) {
  var t = parseInt(tag, 10);
  for (var i = 0; i < PARTITIONS.length; i++) {
    if (PARTITIONS[i].tag === t) return PARTITIONS[i];
  }
  return null;
}
function monthStart(offset) {
  var d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - (parseInt(offset, 10) || 0));
  var m = d.getMonth() + 1;
  return d.getFullYear() + "-" + (m < 10 ? "0" + m : "" + m) + "-01";
}
function monthLabel(offset) {
  var d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - (parseInt(offset, 10) || 0));
  return d.getFullYear() + "年" + (d.getMonth() + 1) + "月";
}

// 地区分类：直播合集 → live；欧美 → us；日本 → jp；其余中文内容 → cn
// 站点自带的 tags 里有地区标签（国产 / 欧美 / 日本 等），比按标题猜准得多
// 地区标签（按站点真实标签词表统计得出：国产/日本/欧美/俄罗斯/捷克/越南/韩国/黑人/金发/阿拉伯/异域…）
// 站点标签里常带尾随空格（"欧美 "），所以匹配前统一 trim
var TAG_US = /^(欧美|美国|英国|德国|法国|意大利|西班牙|荷兰|瑞典|瑞士|奥地利|波兰|捷克|匈牙利|罗马尼亚|保加利亚|俄罗斯|乌克兰|白俄罗斯|拉脱维亚|立陶宛|爱沙尼亚|巴西|墨西哥|阿根廷|哥伦比亚|秘鲁|智利|古巴|委内瑞拉|拉美|拉丁|加拿大|澳洲|澳大利亚|新西兰|印度|泰国|越南|菲律宾|印尼|马来西亚|阿拉伯|异域|土耳其|迪拜|以色列|伊朗|黑人|金发|白人|碧眼|西方|外国|欧美无码|欧美精品)$/;
var TAG_JP = /^(日本|日系|日韩|日本无码|日本精品)$/;
var TAG_CN = /^(国产|国语|华语|国产精品|国产无码|港台|台湾|香港|新加坡)$/;
function tagList(a) {
  var arr = (a && a.tags) || [];
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var t = arr[i];
    var v = typeof t === "string" ? t : (t && (t.slug || t.name || t.title || t.tag_name)) || "";
    v = String(v).replace(/\s+/g, " ").trim();
    if (v) out.push(v);
  }
  return out;
}
function regionByTags(a) {
  var tags = tagList(a);
  var us = 0;
  var jp = 0;
  var cn = 0;
  for (var i = 0; i < tags.length; i++) {
    var t = tags[i];
    if (TAG_US.test(t)) us++;
    else if (TAG_JP.test(t)) jp++;
    else if (TAG_CN.test(t)) cn++;
  }
  if (us && us >= jp && us >= cn) return "us";
  if (jp && jp >= cn) return "jp";
  if (cn) return "cn";
  return "";
}
function classifyByText(a) {
  var title = String(pick(a.title, a.video_name, "") || "");
  var t = title + " " + String(a.author || "");
  var low = t.toLowerCase();
  if (/[\u3040-\u30ff]/.test(t)) return "jp";
  if (/(p站|pornhub|onlyfans|fansly|faphouse|pjgirls|deeper|tushy|vixen|blacked|brazzers|realitykings|naught(y|iamerica)|bangbros|teamskeet|mylf|chaturbate|cb站|推特|x站|洋马|白人|金发|碧眼|欧美|美国|英国|德国|法国|俄罗斯|乌克兰|巴西|拉美|拉丁|大洋马|洋妞|老外|外国|bbc|bwc|尼哥|黑大炮|捷克|西班牙|意大利|加拿大|澳洲|印度|泰国|越南|菲律宾|印尼|马来西亚|阿拉伯|异域|土耳其|迪拜|以色列|韩国|韩系|波兰|匈牙利|罗马尼亚|latina|ebony|russian|blonde)/i.test(low)) return "us";
  if (/\b[a-z]{2,5}[-_]\d{2,5}\b/.test(low)) return "jp";
  if (/(无码|有码|人妻|女优|痴女|素人|日系|日本|和服|风俗|fc2|heyzo|jav|myfans|oppai|s1|sod|falen|moodyz|prestige|ideapocket|ipx|ssni|miaa|madonna|ダスッ|カリビアン|加勒比|一本道|天然むすめ|tokyo\s*hot|10musume|heydouga|无修正|中文字幕|熟女|女教师|痴汉|电车|东京|大阪|温泉)/i.test(t)) return "jp";
  if (/(ai短剧|短剧|探花|门事件|绿播|福利姬|网红|主播|大秀|微密圈|抖音|快手|b站|私拍|旗袍|学生妹|御姐|大圈|传媒|天美|麻豆|星空|糖心|91|抖阴|杏吧|蜜桃|精东|国产|国语|华语|coser|cosplay|推特福利|私人订制|定制合集)/i.test(t)) return "cn";
  var cjk = (t.match(/[\u3400-\u9fff]/g) || []).length;
  var lat = (t.match(/[a-z]/gi) || []).length;
  if (lat > cjk * 1.5 && lat > 6) return "us";
  return "cn";
}
// 标题里的强标记优先于站点 tags（tags 偶尔标错，比如 OnlyFans 的片被标成「日本」）
var STRONG_US = /(p站|onlyfans|fansly|faphouse|pjgirls|deeper|tushy|vixen|blacked|brazzers|realitykings|bangbros|teamskeet|mylf|chaturbate|cb站|推特|fansone|manyvids)/i;
var STRONG_CN = /(ai短剧|短剧|探花|门事件|绿播|微密圈|抖音|快手|b站|91|抖阴|杏吧|麻豆|天美|糖心|精东|国语|华语|国产精品)/i;
function classifyPart(a) {
  var title = String(pick(a.title, a.video_name, "") || "");
  if (title.indexOf("[ONE直播") >= 0) return "live";
  if (/直播回放/.test(title) && /one直播/i.test(title)) return "live";
  if (STRONG_US.test(title)) return "us";
  if (STRONG_CN.test(title)) return "cn";
  if (/[\u3040-\u30ff]/.test(title)) return "jp";
  if (/\b[a-z]{2,5}[-_]\d{2,5}\b/i.test(title)) return "jp";
  var byTag = regionByTags(a);
  if (byTag) return byTag;
  return classifyByText(a);
}

var MONTH_CACHE = {};
var PART_CACHE = {};
var MONTH_TTL = 10 * 60 * 1000;
var MONTH_TTL_OLD = 12 * 60 * 60 * 1000;
function monthTtl(offset) {
  return (parseInt(offset, 10) || 0) <= 1 ? MONTH_TTL : MONTH_TTL_OLD;
}

// 某个月的完整视频流（model 6 长视频 + model 3 视频，model 2 是图文/小说故排除；
// model 6 每月常超 100 条，需翻页）
async function fetchMonthPage(model, offset, page, size, sortMode) {
  try {
    var arr = await call("article/discovery", {
      model_id: model,
      published_at: monthStart(offset),
      page: page,
      size: size,
      sort: sortMode || "published_at"
    });
    return arr || [];
  } catch (e) {
    return [];
  }
}
async function monthFeed(offset) {
  var key = "m" + offset;
  var c = MONTH_CACHE[key];
  if (c && Date.now() - c.ts < monthTtl(offset)) return c.arr;
  // 各 model 的第一页并行拿
  var firstJobs = [];
  for (var mi = 0; mi < VIDEO_MODELS.length; mi++) {
    firstJobs.push(fetchMonthPage(VIDEO_MODELS[mi], offset, 1, 100));
  }
  var firsts = await Promise.all(firstJobs);
  var chunks = [];
  var moreJobs = [];
  for (var mi2 = 0; mi2 < firsts.length; mi2++) {
    var p1 = firsts[mi2] || [];
    chunks.push(p1);
    if (p1.length >= 100) {
      // model 6 每月常 200–400 条，2..4 页并行补齐
      for (var pg = 2; pg <= 4; pg++) moreJobs.push(fetchMonthPage(VIDEO_MODELS[mi2], offset, pg, 100));
    }
  }
  if (moreJobs.length) {
    var mores = await Promise.all(moreJobs);
    for (var mk = 0; mk < mores.length; mk++) chunks.push(mores[mk] || []);
  }
  var arr = [];
  var seen = {};
  for (var ci = 0; ci < chunks.length; ci++) {
    var chunk = chunks[ci] || [];
    for (var i = 0; i < chunk.length; i++) {
      var it = chunk[i];
      var id = String(it.id);
      if (seen[id]) continue;
      if (isPreviewOnly(it)) continue;
      seen[id] = 1;
      arr.push(it);
    }
  }
  arr.sort(function (x, y) {
    return String(y.published_at || "").localeCompare(String(x.published_at || ""));
  });
  MONTH_CACHE[key] = { ts: Date.now(), arr: arr };
  return arr;
}

// 某分区某月的条目（用分类器从全库月度流里筛出来）
async function partitionFeed(part, offset) {
  var key = part.id + ":" + offset;
  var c = PART_CACHE[key];
  if (c && Date.now() - c.ts < monthTtl(offset)) return c.arr;
  var all = await monthFeed(offset);
  var out = [];
  for (var i = 0; i < all.length; i++) {
    if (classifyPart(all[i]) === part.id) out.push(all[i]);
  }
  out.sort(function (x, y) {
    return String(y.published_at || "").localeCompare(String(x.published_at || ""));
  });
  PART_CACHE[key] = { ts: Date.now(), arr: out };
  return out;
}

// 直播合集：直接走标题搜索，24 条/页，能一直翻到最早
async function liveItems(part, page, size) {
  var arr = await call("article/search", {
    keyword: "ONE直播",
    model_id: 0,
    series_category: 0,
    page: page,
    size: size
  });
  var out = [];
  for (var i = 0; i < (arr || []).length; i++) {
    if (isPreviewOnly(arr[i])) continue;
    out.push(articleItem(arr[i]));
  }
  if (!out.length && page <= 1) {
    return [{
      id: "one://notice",
      type: "detail",
      mediaType: "movie",
      title: "ONE 直播回放需要登录账号",
      description: "接口对未登录用户只返回 4 分钟预告，完整回放需手机号登录 ONE 账号",
      overview: "ONE 直播回放为长视频合集，官方只对已登录账号下发完整地址，游客拿到的 video_file 就是 4 分钟预告片段。",
      link: "one://notice"
    }];
  }
  return fillCovers(out);
}

var PALL = {};
async function regionItems(part, page, size, startOff) {
  var need = page * size;
  var st = PALL[part.id];
  if (!st) {
    st = { items: [], seen: {}, off: 0, emptyRun: 0, done: false, cover: "" };
    PALL[part.id] = st;
  }
  var start = parseInt(startOff, 10) || 0;
  if (start > 0 && !st.items.length) st.off = start;
  if (!st.cover) {
    try { st.cover = await partitionCover(part); } catch (e) { st.cover = ""; }
  }
  while (st.items.length < need && !st.done && st.off < 400) {
    var arr = await partitionFeed(part, st.off);
    if (!arr.length) {
      st.emptyRun++;
      st.off++;
      if (st.emptyRun >= 8) st.done = true;
      continue;
    }
    st.emptyRun = 0;
    var label = monthLabel(st.off);
    for (var i = 0; i < arr.length; i++) {
      var key = String(arr[i].id);
      if (st.seen[key]) continue;
      st.seen[key] = 1;
      var it = articleItem(arr[i], st.cover);
      it.description = label + " · " + it.description;
      st.items.push(it);
    }
    st.off++;
  }
  var from = (page - 1) * size;
  return st.items.slice(from, from + size);
}

async function partitionItems(part, page, size, startOff) {
  page = Math.max(1, parseInt(page, 10) || 1);
  size = Math.max(4, parseInt(size, 10) || 24);
  if (part.id === "live") return await liveItems(part, page, size);
  return await regionItems(part, page, size, startOff);
}

// 最新视频：全库按月倒序（model 6 长视频 + model 3 视频），一直能往前翻
var NEWEST = { items: [], seen: {}, off: 0, emptyRun: 0, done: false };
async function newestItems(page, size) {
  var need = page * size;
  while (NEWEST.items.length < need && !NEWEST.done && NEWEST.off < 400) {
    var arr = await monthFeed(NEWEST.off);
    if (!arr.length) {
      NEWEST.emptyRun++;
      NEWEST.off++;
      if (NEWEST.emptyRun >= 8) NEWEST.done = true;
      continue;
    }
    NEWEST.emptyRun = 0;
    var label = monthLabel(NEWEST.off);
    for (var i = 0; i < arr.length; i++) {
      var key = String(arr[i].id);
      if (NEWEST.seen[key]) continue;
      NEWEST.seen[key] = 1;
      var it = articleItem(arr[i]);
      it.description = label + " · " + it.description;
      NEWEST.items.push(it);
    }
    NEWEST.off++;
  }
  var start = (page - 1) * size;
  return fillCovers(NEWEST.items.slice(start, start + size));
}

// 热门视频：按月取「当月的赞数榜」（服务端 sort=like_number 只在本月内生效），
// 逐月往前累积，所以既有热度又不会只有本月那几条
var HOTMONTH = {};
var HOT_TTL = 30 * 60 * 1000;
async function hotMonth(offset) {
  var key = "h" + offset;
  var c = HOTMONTH[key];
  if (c && Date.now() - c.ts < (offset <= 1 ? MONTH_TTL : 6 * 60 * 60 * 1000)) return c.arr;
  var jobs = [];
  for (var mi = 0; mi < VIDEO_MODELS.length; mi++) {
    jobs.push(fetchMonthPage(VIDEO_MODELS[mi], offset, 1, 100, "like_number"));
  }
  var parts = await Promise.all(jobs);
  var arr = [];
  var seen = {};
  for (var pi = 0; pi < parts.length; pi++) {
    var chunk = parts[pi] || [];
    for (var i = 0; i < chunk.length; i++) {
      var id = String(chunk[i].id);
      if (seen[id]) continue;
      if (isPreviewOnly(chunk[i])) continue;
      seen[id] = 1;
      arr.push(chunk[i]);
    }
  }
  arr.sort(function (x, y) {
    return (parseInt(y.like_number, 10) || 0) - (parseInt(x.like_number, 10) || 0);
  });
  HOTMONTH[key] = { ts: Date.now(), arr: arr };
  return arr;
}
var HOT = { items: [], seen: {}, off: 0, emptyRun: 0, done: false };
async function hotItems(page, size) {
  var need = page * size;
  while (HOT.items.length < need && !HOT.done && HOT.off < 400) {
    var arr = await hotMonth(HOT.off);
    if (!arr.length) {
      HOT.emptyRun++;
      HOT.off++;
      if (HOT.emptyRun >= 8) HOT.done = true;
      continue;
    }
    HOT.emptyRun = 0;
    var label = monthLabel(HOT.off);
    for (var i = 0; i < arr.length; i++) {
      var key = String(arr[i].id);
      if (HOT.seen[key]) continue;
      HOT.seen[key] = 1;
      var it = articleItem(arr[i]);
      it.description = label + " 热门 · " + it.description;
      HOT.items.push(it);
    }
    HOT.off++;
  }
  var start = (page - 1) * size;
  return fillCovers(HOT.items.slice(start, start + size));
}

async function partitionCover(part) {
  var cached = PCOVER[part.id];
  if (cached) return cached;
  try {
    for (var off = 0; off < 12; off++) {
      var arr = await partitionFeed(part, off);
      for (var i = 0; i < arr.length; i++) {
        var u = bestImage(arr[i]);
        if (u) { PCOVER[part.id] = u; return u; }
      }
    }
    return "";
  } catch (e) {
    return "";
  }
}

function articleItem(a, fallbackCover) {
  var id = a.id;
  var cover = bestImage(a) || (fallbackCover || "");
  var liveInfo = stripLiveTag(clean(pick(a.title, a.video_name, "ONE #" + id)));
  var title = liveInfo.title;
  var bits = [];
  bits.push(liveInfo.live ? "直播回放" : modelName(a.model_id));
  if (a.author) bits.push(clean(a.author));
  if (a.published_at) bits.push(String(a.published_at).slice(0, 10));
  if (a.views) bits.push("观看 " + a.views);
  if (a.like_number) bits.push("赞 " + a.like_number);
  var item = {
    id: String(id),
    type: "detail",
    mediaType: "movie",
    title: title,
    link: articleLink(id),
    description: bits.join(" · "),
    duration: 0,
    overview: clean(pick(a.description, a.subtitle))
  };
  var sec = durationSeconds(a);
  if (sec > 0) { item.duration = sec; item.durationText = secondsToText(sec); }
  if (sizeLabel(a.size)) bits.push(sizeLabel(a.size));
  item.description = bits.join(" · ");
  return withImages(item, cover);
}
function seriesItem(s, kind) {
  var bits = [kind === "manga" ? "漫画连载" : "写真连载"];
  if (s.author) bits.push(clean(s.author));
  if (s.latest_at) bits.push("更新 " + String(s.latest_at).slice(0, 10));
  if (s.like_total) bits.push("赞 " + s.like_total);
  var item = {
    id: String(s.id),
    type: "detail",
    mediaType: "movie",
    title: clean(s.title),
    link: seriesLink(kind, s.id),
    description: bits.join(" · "),
    overview: s.end ? "已完结" : "连载中"
  };
  return withImages(item, absImage(pick(s.thumbnail, s.thumb)));
}
function actorItem(a, kind) {
  var bits = [kind === "new" ? "新晋演员" : "热门演员"];
  if (a.score) bits.push("热度 " + a.score);
  if (a.latest_published_at) bits.push("最新 " + String(a.latest_published_at).slice(0, 10));
  var item = {
    id: String(a.id),
    type: "detail",
    mediaType: "movie",
    title: clean(pick(a.main_name, "演员 #" + a.id)),
    link: actorLink(a.id),
    description: bits.join(" · ")
  };
  return withImages(item, absImage(pick(a.thumbnail, a.thumb)));
}
function tagItem(t, cover) {
  var part = partitionByTag(t.id);
  var item = {
    id: String(t.id),
    type: "detail",
    mediaType: "movie",
    title: clean(t.title),
    link: tagLink(t.id, t.title),
    description: "分区 · 按月更新，点进去向下滚动看更早月份"
  };
  return withImages(item, cover || "");
}

// ============ 列表 ============
async function listDay(params) {
  var page = Math.max(1, parseInt((params && params.page) || 1, 10) || 1);
  await bootstrap(false);
  var date = todayStr();
  try {
    var last = await call("article/last/date", null);
    if (last && last.date) date = String(last.date).slice(0, 10);
  } catch (e) {}
  var data = await call("article/day", { published_at: date });
  var items = [];
  if (data && data.article_top_text) {
    items.push({
      id: "top-text",
      type: "detail",
      mediaType: "movie",
      title: "一句话 · " + clean(data.article_top_text).slice(0, 40),
      link: "one://text",
      description: "今日一句话"
    });
  }
  var info = (data && data.info) || [];
  for (var i = 0; i < info.length; i++) items.push(articleItem(info[i]));
  if (page > 1) return [];
  return fillCovers(items);
}
async function listDiscovery(params) {
  var model = parseInt((params && params.model) || 3, 10) || 3;
  var sort = (params && params.sort) || "published_at";
  var tag = parseInt((params && params.tag) || 0, 10) || 0;
  var page = Math.max(1, parseInt((params && params.page) || 1, 10) || 1);
  await bootstrap(false);
  var arr = await call("article/discovery", {
    model_id: model,
    demand_tag_id: tag,
    published_at: todayStr(),
    page: page,
    size: 24,
    sort: sort
  });
  var out = [];
  for (var i = 0; i < (arr || []).length; i++) out.push(articleItem(arr[i]));
  return fillCovers(out);
}
async function listSeries(params) {
  var kind = (params && (params.kind2 || params.sub)) || "album";
  var page = Math.max(1, parseInt((params && params.page) || 1, 10) || 1);
  await bootstrap(false);
  var path = kind === "manga" ? "series/manga/list" : "series/album/list";
  var arr = await call(path, { type: 1, page: page, size: 24, sort: "published_at" });
  var out = [];
  for (var i = 0; i < (arr || []).length; i++) out.push(seriesItem(arr[i], kind));
  return out;
}
async function listActors(params) {
  var kind = (params && (params.kind2 || params.sub)) || "hot";
  var page = Math.max(1, parseInt((params && params.page) || 1, 10) || 1);
  await bootstrap(false);
  var path = kind === "new" ? "actor/getNewActors" : "actor/getHotActors";
  var data = await call(path, { page: page, size: 24 });
  var arr = (data && data.list) || [];
  var out = [];
  for (var i = 0; i < arr.length; i++) out.push(actorItem(arr[i], kind));
  return out;
}
async function listTags(params) {
  await bootstrap(false);
  var arr = await call("navigation/getDemandTagList", null);
  var out = [];
  for (var i = 0; i < (arr || []).length; i++) {
    var t = arr[i];
    var tagId = parseInt(t.id, 10) || 0;
    if (TILE_TAGS.indexOf(tagId) < 0) continue;
    var part = partitionByTag(tagId);
    var cover = part ? await partitionCover(part) : "";
    out.push(tagItem(t, cover));
  }
  return out;
}
async function listPartition(params) {
  var part = partitionById((params && (params.partition || params.pid)) || "") || partitionByTag((params && params.tag) || 0);
  if (!part) throw new Error("未知分区");
  await bootstrap(false);
  var page = Math.max(1, parseInt((params && params.page) || 1, 10) || 1);
  var size = parseInt((params && (params.size || params.count)) || 24, 10) || 24;
  return await partitionItems(part, page, size, (params && params.offset) || 0);
}
async function searchVideos(params) {
  var keyword = clean((params && (params.keyword || params.q)) || "");
  if (!keyword) return [];
  var page = Math.max(1, parseInt((params && params.page) || 1, 10) || 1);
  var model = parseInt((params && params.model) || 0, 10) || 0;
  await bootstrap(false);
  var arr = await call("article/search", {
    keyword: keyword,
    model_id: model,
    series_category: 0,
    page: page,
    size: 24
  });
  var out = [];
  for (var i = 0; i < (arr || []).length; i++) out.push(articleItem(arr[i]));
  return fillCovers(out);
}
function pageOf(params) {
  return Math.max(1, parseInt((params && params.page) || 1, 10) || 1);
}
function sizeOf(params) {
  return Math.max(4, parseInt((params && (params.size || params.count)) || 24, 10) || 24);
}
async function loadList(params) {
  var kind = (params && params.kind) || "discovery";
  if (kind === "day") return await listDay(params);
  if (kind === "series") return await listSeries(params);
  if (kind === "actor") return await listActors(params);
  if (kind === "tags") return await listTags(params);
  if (kind === "partition") return await listPartition(params);
  if (kind === "newest") return await newestItems(pageOf(params), sizeOf(params));
  if (kind === "hot") return await hotItems(pageOf(params), sizeOf(params));
  return await listDiscovery(params);
}

// ============ 详情 / 播放 ============
function isPreviewOnly(a) {
  if (!a) return true;
  if (String(a.video_download || "")) return false;
  var file = String(a.video_file || "");
  if (!file) {
    // 搜索结果这类精简条目根本没有视频字段，属于「未知」，不能当预告过滤掉
    if (!String(a.preview_video || "")) return false;
    return true;
  }
  if (String(a.preview_video || "") === file) return true;
  if (/preview|sample|_pr\.mp4|-pr\.mp4/i.test(file)) return true;
  return false;
}
// 播放线路的 CDN 域名池：按官方 MediaResolver 的 filePlay 顺序
// （flutter_video_play → flutter_video_download → audio_download → audio），再并上 video 老键。
// 同一路径在这几个域名上都能取（实测 vd.qmq85ps.com 与 46e9nz.mfpt8g.com 同片同大小）。
function hostIsBad(h) {
  for (var i = 0; i < BAD_HOSTS.length; i++) if (String(h).indexOf(BAD_HOSTS[i]) >= 0) return true;
  return false;
}
function videoHosts() {
  var list = [];
  function add(arr) {
    if (!arr) return;
    for (var i = 0; i < arr.length; i++) {
      var h = String(arr[i] || "").replace(/\/+$/, "");
      if (!h || list.indexOf(h) >= 0 || hostIsBad(h)) continue;
      list.push(h);
    }
  }
  // 顺序：video 组最稳（老 CDN，任意 UA 都能直连）→ flutter_video_download → flutter_video_play
  // （vd.* 只在官方 App 的 TLS/UA 下握手成功，ffmpeg/curl 会 handshake failure，所以排后面）→ 音频组
  if (S) { add(S.video); add(S.vdl); add(S.vplay); add(S.audl); add(S.audio); }
  if (!list.length) list = ["https://46e9nz.mfpt8g.com", "https://f86xxm.upmf83.com"];
  return list;
}
function videoLines(a) {
  var lines = [];
  var hosts = videoHosts();
  function pushMp4(path, label, desc) {
    if (!path) return;
    var p = String(path);
    for (var i = 0; i < hosts.length && i < 5; i++) {
      var url = /^https?:\/\//.test(p) ? p : hosts[i] + (p.charAt(0) === "/" ? "" : "/") + p;
      lines.push({
        name: label + " · 线路 " + (i + 1) + (/h265/i.test(p) ? "（H.265）" : ""),
        description: desc,
        url: url
      });
    }
  }
  var previewOnly = isPreviewOnly(a);
  // 旧版协议下发的完整 MP4（video_download）优先，其次是能直接播的 video_file
  pushMp4(a.video_download, "完整版 MP4", "ONE 直连 · 完整片 · 支持拖动");
  if (!previewOnly && a.video_file && String(a.video_file) !== String(a.video_download || "")) {
    pushMp4(a.video_file, "MP4", "ONE 直连 · 支持拖动");
  } else if (previewOnly) {
    pushMp4(a.video_file, "预告 MP4", "ONE 直连 · 预告片（非完整版）");
  }
  // HLS 清单是 /encry/ 加密 m3u8（二进制密文，端上解密），公开可播性差，只在没有 MP4 时兜底
  if (!lines.length || previewOnly) {
    if (a.video_hls) {
      lines.push({ name: "HLS 备用", description: "ONE HLS · 加密清单，可能无法直接播放", url: absVideo(a.video_hls, "hls") });
    }
    if (a.video_hls_h265) {
      lines.push({ name: "HLS H.265 备用", description: "ONE HLS · 加密清单，可能无法直接播放", url: absVideo(a.video_hls_h265, "hls") });
    }
  }
  if (a.audio_file) {
    lines.push({ name: "音频", description: "ONE FM", url: absVideo(a.audio_file, "audio") });
  }
  if (a.audio_hls) {
    lines.push({ name: "音频 HLS", description: "ONE FM · HLS", url: absVideo(a.audio_hls, "hls") });
  }
  if (!lines.length && a.preview_video) {
    lines.push({ name: "预览", description: "ONE 预览片段", url: absVideo(a.preview_video) });
  }
  return lines;
}
function streamItem(a, lines, cover, title, desc) {
  var item = {
    id: String(a.id),
    type: "detail",
    mediaType: "movie",
    title: title,
    link: articleLink(a.id),
    description: desc,
    videoUrl: lines.length ? lines[0].url : "",
    childItems: lines.map(function (l, idx) {
      return {
        id: String(a.id) + "-" + (idx + 1),
        type: "url",
        mediaType: "movie",
        title: l.name,
        description: l.description,
        videoUrl: l.url,
        link: l.url
      };
    })
  };
  if (lines.length) {
    var dsec = durationSeconds(a);
    item.duration = dsec;
    if (dsec > 0) item.durationText = secondsToText(dsec);
  }
  return withImages(item, cover);
}
async function fetchArticle(id) {
  await bootstrap(false);
  var a = await call("article/detail", { id: id });
  if (!a) throw new Error("ONE 未返回详情：" + id);
  return a;
}
async function resolveArticle(id) {
  var cached = STREAM_CACHE[id];
  if (cached && Date.now() - cached.ts < STREAM_TTL) return cached;
  var a = await fetchArticle(id);
  var lines = videoLines(a);
  var rec = { article: a, lines: lines, ts: Date.now() };
  STREAM_CACHE[id] = rec;
  return rec;
}
function articleDesc(a) {
  var bits = [];
  bits.push(modelName(a.model_id));
  if (a.author) bits.push(clean(a.author));
  if (a.published_at) bits.push(String(a.published_at).slice(0, 10));
  if (a.views) bits.push("观看 " + a.views);
  if (a.like_number) bits.push("赞 " + a.like_number);
  if (a.collection_number) bits.push("收藏 " + a.collection_number);
  if (a.is_limit_free) bits.push("限时免费");
  var dsec2 = durationSeconds(a);
  if (dsec2 > 0) bits.push(secondsToText(dsec2));
  if (sizeLabel(a.size)) bits.push(sizeLabel(a.size));
  var head = bits.join(" · ");
  var body = clean(pick(a.description, a.video_name, ""));
  return body ? head + "\n" + body : head;
}
async function detailArticle(id) {
  var rec = await resolveArticle(id);
  var a = rec.article;
  var cover = bestImage(a) || (a.__partCover || "");
  var liveInfo2 = stripLiveTag(clean(pick(a.title, a.video_name, "ONE #" + id)));
  var title = liveInfo2.title;
  var item = streamItem(a, rec.lines, cover, title, articleDesc(a));
  var tags = [];
  if (a.tag_list && a.tag_list.length) tags = a.tag_list;
  else if (a.tags && a.tags.length) tags = a.tags;
  if (tags.length) {
    item.genreTitle = "标签";
    // 详情里的 tag_list 是对象数组，名字在 slug 字段（id/slug/type/target_id/icons）；
    // tags 是纯字符串数组。两种都认，空的丢掉，别生成一堆空标签
    var names = [];
    for (var ti = 0; ti < tags.length; ti++) {
      var tt = tags[ti];
      var nm = typeof tt === "string" ? tt : (tt && (tt.slug || tt.name || tt.title || tt.tag_name)) || "";
      nm = clean(nm);
      if (nm && names.indexOf(nm) < 0) names.push(nm);
    }
    if (names.length) {
      item.genreTitle = "标签";
      item.genreItems = names.map(function (name) {
        return { id: "one://k/" + encodeURIComponent(name), title: name, name: name, link: "one://k/" + encodeURIComponent(name) };
      });
    }
  }
  if (a.collection_list && a.collection_list.length) {
    var eps = [];
    for (var ei = 0; ei < a.collection_list.length; ei++) {
      var ep = a.collection_list[ei];
      var epTitle = clean(pick(ep.video_name, ep.title, "第 " + (ep.episode || ei + 1) + " 场"));
      var epBits = ["第 " + (ep.episode || ei + 1) + " 场"];
      if (ep.length) epBits.push(String(ep.length));
      if (ep.published_at) epBits.push(String(ep.published_at).slice(0, 10));
      var epLines = videoLines(ep);
      var epItem = {
        id: String(ep.id),
        type: "url",
        mediaType: "movie",
        title: epTitle,
        description: epBits.join(" · "),
        link: articleLink(ep.id)
      };
      if (epLines.length) epItem.videoUrl = epLines[0].url;
      eps.push(withImages(epItem, cover));
    }
    if (eps.length) {
      item.childItems = eps;
      item.description = item.description + "\n共 " + eps.length + " 场直播回放";
    }
  }
  var peoples = [];
  if (a.author) {
    var an = clean(a.author);
    peoples.push({ id: "one://k/" + encodeURIComponent(an), title: an, name: an, link: "one://k/" + encodeURIComponent(an), role: "作者" });
  }
  if (peoples.length) item.peoples = peoples;
  if (!rec.lines.length) {
    item.description = item.description + "\n（本条为" + modelName(a.model_id) + "，无视频源）";
  }
  return item;
}
async function detailSeries(kind, id, page) {
  await bootstrap(false);
  var data = await call("series/chapters", { series_id: id, page: page || 1, size: 24 });
  if (!data) throw new Error("ONE 未返回连载：" + id);
  var chapters = data.chapters || [];
  var items = [];
  for (var i = 0; i < chapters.length; i++) {
    var c = chapters[i];
    var it = {
      id: String(c.id),
      type: "detail",
      mediaType: "movie",
      title: clean(pick(c.title, "第 " + c.chapter + " 话")),
      link: articleLink(c.id),
      description: "第 " + c.chapter + " 话" + (c.published_at ? " · " + String(c.published_at).slice(0, 10) : ""),
      overview: clean(c.description)
    };
    items.push(withImages(it, absImage(pick(c.thumbnail, c.thumb))));
  }
  var album = {
    id: String(id),
    type: "detail",
    mediaType: "movie",
    title: clean(pick(data.title, "连载 #" + id)),
    description: (kind === "manga" ? "漫画连载" : "写真连载") + " · " + items.length + " 话" + (data.end ? " · 已完结" : " · 连载中"),
    relatedItems: items
  };
  return withImages(album, absImage(pick(data.thumbnail, data.thumb)));
}
async function detailActor(id) {
  await bootstrap(false);
  var a = await call("actor/detail", { id: id });
  if (!a) throw new Error("ONE 未返回演员：" + id);
  var name = clean(pick(a.main_name, "演员 #" + id));
  var bits = [];
  if (a.japanese_name) bits.push(clean(a.japanese_name));
  if (a.alias_name) bits.push(clean(a.alias_name));
  if (a.height) bits.push("身高 " + a.height);
  if (a.bust_waist_hip) bits.push(a.bust_waist_hip);
  if (a.cup_size) bits.push(a.cup_size + " 罩杯");
  if (a.birth_date) bits.push("生日 " + a.birth_date);
  var item = {
    id: String(id),
    type: "detail",
    mediaType: "movie",
    title: name,
    link: actorLink(id),
    description: bits.join(" · ") || "演员",
    overview: clean(a.desc)
  };
  withImages(item, absImage(pick(a.thumbnail, a.thumb)));
  var related = [];
  try {
    var res = await call("article/search", { keyword: name, model_id: 0, series_category: 0, page: 1, size: 24 });
    for (var i = 0; i < (res || []).length; i++) related.push(articleItem(res[i]));
  } catch (e) {}
  if (related.length) item.relatedItems = related;
  return item;
}
async function detailTag(id, title) {
  await bootstrap(false);
  var part = partitionByTag(id);
  var items = [];
  if (part) items = await partitionItems(part, 1, 48);
  var name = decodeURIComponent(String(title || "")) || (part ? part.title : "分区 " + id);
  return {
    id: "tag-" + id,
    type: "detail",
    mediaType: "movie",
    title: name,
    description: "分区 · 共 " + items.length + " 条（按月份连续排列，向下滚动看更早内容）",
    relatedItems: items
  };
}
async function detailKeyword(keyword) {
  await bootstrap(false);
  var arr = await call("article/search", { keyword: keyword, model_id: 0, series_category: 0, page: 1, size: 24 });
  var items = [];
  for (var i = 0; i < (arr || []).length; i++) items.push(articleItem(arr[i]));
  return {
    id: "kw-" + keyword,
    type: "detail",
    mediaType: "movie",
    title: keyword,
    description: "搜索 · 共 " + items.length + " 条",
    relatedItems: items
  };
}
async function loadDetail(link) {
  if (String(link).indexOf("one://notice") === 0) {
    return {
      id: "one://notice",
      type: "detail",
      mediaType: "movie",
      title: "ONE 直播回放需要登录账号",
      description: "游客只能拿到 4 分钟预告",
      overview: "ONE 的直播回放/长视频合集在接口层只对已登录账号下发完整地址（article/download 对游客返回 450 请先登录账号），游客拿到的 video_file 与 preview_video 相同，都是 4 分钟预告片段。",
      link: "one://notice"
    };
  }
  var raw = String(link || "").trim();
  if (!raw) throw new Error("ONE 链接为空");
  if (/^one:\/\/a\//.test(raw)) return await detailArticle(raw.replace("one://a/", "").replace(/\/.*$/, ""));
  if (/^one:\/\/s\//.test(raw)) {
    var parts = raw.replace("one://s/", "").split("/");
    return await detailSeries(parts[0] || "album", parts[1] || "");
  }
  if (/^one:\/\/p\//.test(raw)) return await detailActor(raw.replace("one://p/", "").replace(/\/.*$/, ""));
  if (/^one:\/\/t\//.test(raw)) {
    var t2 = raw.replace("one://t/", "").split("/");
    return await detailTag(t2[0], t2[1] || "");
  }
  if (/^one:\/\/k\//.test(raw)) return await detailKeyword(decodeURIComponent(raw.replace("one://k/", "")));
  if (/^one:\/\/text$/.test(raw)) {
    return { id: "text", type: "detail", mediaType: "movie", title: "一句话", description: "ONE 每日一句话" };
  }
  if (/^\d+$/.test(raw)) return await detailArticle(raw);
  throw new Error("无法识别 ONE 链接：" + raw);
}
async function loadResource(params) {
  var link = (params && (params.link || params.url || params.id)) || "";
  var id = String(link).replace(/^one:\/\/a\//, "").replace(/\/.*$/, "");
  if (!/^\d+$/.test(id)) {
    // 直接打开「播放资源」模块、或条目本身不是视频时，安静返回空列表（别弹错误）
    return [];
  }
  var rec = await resolveArticle(id);
  if (!rec.lines.length) return [{ name: "无可用播放源", description: "该条目没有视频/音频地址（可能是图文或图集）", url: "" }];
  return rec.lines.map(function (l) {
    return { name: l.name, description: l.description, url: l.url };
  });
}
