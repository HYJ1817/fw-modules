WidgetMetadata = {
    id: "hyj1817.jable.resource",
    title: "Jable 播放源",
    icon: "https://assets.fs1.app/assets/images/logo.png",
    version: "1.0.0",
    requiredVersion: "0.0.2",
    description: "解析 Jable 影片的 HLS 直链",
    author: "HYJ1817",
    site: "https://jable.tv",
    globalParams: [{ name: "multiSource", title: "是否启用聚合搜索", type: "enumeration", value: "enabled", enumOptions: [{ title: "启用", value: "enabled" }, { title: "禁用", value: "disabled" }] }],
    modules: [
        {
            id: "loadResource",
            title: "Jable 播放源",
            description: "解析 Jable 影片的 HLS 直链",
            functionName: "loadResource",
            type: "stream",
            cacheDuration: 0,
            params: []
        }
    ]
};

// 取页只能走没被 Cloudflare 挑战的前端域名；片源本身（mushroomtrack）不校验 UA 与 Referer
var HOSTS = ["https://fs1.app", "https://jable.tv"];
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function decode(value) {
    var text = String(value || "");
    try { text = decodeURIComponent(text); } catch (error) { /* 原样使用 */ }
    return text;
}

function slugOf(value) {
    var text = decode(value);
    var match = text.match(/^jable:([a-z0-9-]+)$/i)
        || text.match(/\/videos\/([a-z0-9-]+)\/?/i)
        || text.match(/^([a-z0-9-]{3,})$/i);
    return match ? match[1].toLowerCase() : "";
}

function pageHeaders(host) {
    return {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9",
        Referer: host + "/"
    };
}

async function fetchDetail(slug) {
    var errors = [];
    for (var i = 0; i < HOSTS.length; i++) {
        try {
            var response = await Widget.http.get(HOSTS[i] + "/videos/" + slug + "/", { headers: pageHeaders(HOSTS[i]), timeout: 20000 });
            var body = String((response && response.data) || "");
            if (body) return { host: HOSTS[i], html: body };
            errors.push(HOSTS[i] + " empty");
        } catch (error) {
            errors.push(HOSTS[i] + " " + (error && error.message ? error.message : String(error)));
        }
    }
    return { host: HOSTS[0], html: "", error: errors.join("; ") };
}

function line(url, host, slug) {
    var headers = {
        "User-Agent": UA,
        Referer: host + "/videos/" + slug + "/",
        Origin: host,
        Accept: "*/*"
    };
    return {
        name: "Jable · HLS",
        description: "HLS",
        url: url,
        playerType: "app",
        customHeaders: headers,
        headers: headers
    };
}

async function loadResource(params) {
    var input = params || {};
    if (input.multiSource === "disabled") return [];

    // 详情页已经给出直链时直接用，省一次取页
    var videoUrl = decode(input.videoUrl);
    if (/^https?:\/\/[^\s"']+\.m3u8/i.test(videoUrl)) {
        return [line(videoUrl, HOSTS[0], slugOf(input.link) || slugOf(input.id) || "")];
    }

    var slug = slugOf(input.link) || slugOf(input.id) || slugOf(input.url);
    if (!slug) return [];

    var detail = await fetchDetail(slug);
    if (!detail.html) return [];
    var match = detail.html.match(/hlsUrl\s*[:=]\s*['"]([^'"]+)['"]/i)
        || detail.html.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i);
    if (!match) return [];
    return [line(match[1] || match[0], detail.host, slug)];
}
