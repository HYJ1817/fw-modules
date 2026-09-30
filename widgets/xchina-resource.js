WidgetMetadata = {
    id: "hyj1817.xchina.resource",
    title: "XChina 播放源",
    icon: "https://xchina.co/images/sites/favicon/1.png?v=1.0.2",
    version: "1.0.2",
    requiredVersion: "0.0.2",
    description: "解析 XChina 影片的 HLS 直链",
    author: "HYJ1817",
    site: "https://xchina.co",
    globalParams: [{ name: "multiSource", title: "是否启用聚合搜索", type: "enumeration", value: "enabled", enumOptions: [{ title: "启用", value: "enabled" }, { title: "禁用", value: "disabled" }] }],
    modules: [
        {
            id: "loadResource",
            title: "XChina 播放源",
            description: "解析 XChina 影片的 HLS 直链",
            functionName: "loadResource",
            type: "stream",
            cacheDuration: 0,
            params: []
        }
    ]
};

var B = "https://xchina.co";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function decode(value) {
    var text = String(value || "");
    try { text = decodeURIComponent(text); } catch (error) { /* 原样使用 */ }
    return text;
}

// Forward 传进来的可能是 xchina:<hash>、详情页 URL、/hls/<hash>/master.m3u8、
// 纯 hash，也可能是被 encodeURIComponent 转过的 id —— 逐个兜底，
// 否则拿不到 hash 就会返回空线路（踩过：id 里是 xchina%3A... 时匹配失败）。
function hashOf(value) {
    var link = decode(value);
    var match = link.match(/^xchina:([a-f0-9]+)$/i)
        || link.match(/\/video\/id-([a-f0-9]+)\.html/i)
        || link.match(/\/hls\/([a-f0-9]+)\//i)
        || link.match(/\b([a-f0-9]{12,16})\b/i);
    return match ? match[1].toLowerCase() : "";
}

// 播放器的 UA 决定能不能取到片子：xchina.co 对 okhttp / curl / Java 等 UA 全部 403，
// 播放页就会一直转圈。myjav.tv 托管同一套 /hls 内容且不校验 UA，用它当主线；
// 主站与镜像仍列出，通用线路失效时可手动切换。
var MIRROR = "https://myjav.tv";

function streamHeaders(hash) {
    var headers = {
        "User-Agent": UA,
        Referer: B + "/video/id-" + hash + ".html",
        Origin: B,
        Accept: "*/*",
        "Accept-Language": "zh-CN,zh;q=0.9"
    };
    return headers;
}

function mirrorHeaders() {
    return { "User-Agent": UA, Referer: MIRROR + "/", Accept: "*/*" };
}

function line(url, hash, label, headers) {
    return {
        name: "XChina · HLS" + (label ? " · " + label : ""),
        description: "HLS",
        url: url,
        playerType: "app",
        customHeaders: headers || streamHeaders(hash),
        headers: headers || streamHeaders(hash)
    };
}

async function isPlaylist(url, headers) {
    try {
        var response = await Widget.http.get(url, { headers: headers, timeout: 15000 });
        return String((response && response.data) || "").indexOf("#EXTM3U") >= 0;
    } catch (error) {
        return false;
    }
}

function requestHeaders(referer) {
    return {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Upgrade-Insecure-Requests": "1",
        Referer: referer || B + "/"
    };
}

async function fetchPage(url, referer) {
    try {
        var response = await Widget.http.get(url, { headers: requestHeaders(referer), timeout: 15000 });
        return String((response && response.data) || "");
    } catch (error) {
        return "";
    }
}

// 兜底：只给了片名时按站内搜索取第一条，避免直接返回空线路
async function hashByTitle(title) {
    var keyword = decode(title).replace(/[\*"?&<>]/g, "").replace(/\s+/g, " ").trim();
    if (keyword.length < 2) return "";
    var encoded = keyword.split(/\s+/).map(encodeURIComponent).join("%20");
    var html = await fetchPage(B + "/videos/keyword-" + encoded + ".html", B + "/videos.html");
    var match = html.match(/\/video\/id-([a-f0-9]+)\.html/);
    return match ? match[1] : "";
}

async function loadResource(params) {
    var input = params || {};
    if (input.multiSource === "disabled") return [];

    var hash = hashOf(input.link) || hashOf(input.id) || hashOf(input.url) || hashOf(input.videoUrl);
    if (!hash) hash = await hashByTitle(input.seriesName || input.title || "");
    if (!hash) return [];

    var generic = MIRROR + "/hls/" + hash + "/master.m3u8";
    var master = B + "/hls/" + hash + "/master.m3u8";
    var twin = "https://tw.xchina.co/hls/" + hash + "/master.m3u8";
    var detailUrl = B + "/video/id-" + hash + ".html";
    var headers = streamHeaders(hash);

    // 通用线路在前：不挑播放器 UA；主站与镜像同源同一份内容，留作备选
    var lines = [
        line(generic, hash, "通用", mirrorHeaders()),
        line(master, hash, "主站", headers),
        line(twin, hash, "镜像", headers)
    ];

    if (await isPlaylist(generic, mirrorHeaders())) return lines;

    // 通用线路不通时确认主站；播放列表路径变了就回详情页取播放器实际用的地址
    if (!(await isPlaylist(master, headers))) {
        var page = await fetchPage(detailUrl, B + "/");
        var source = page.match(/src:\s*'([^']+\.m3u8[^']*)'/i) || page.match(/src:\s*"([^"]+\.m3u8[^"]*)"/i);
        if (source) {
            var resolved = source[1].indexOf("http") === 0 ? source[1] : B + source[1];
            lines[1] = line(resolved, hash, "主站", headers);
        }
    }
    return lines;
}
