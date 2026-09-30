WidgetMetadata = {
    id: "hyj1817.avbebe.resource",
    title: "Avbebe 播放源",
    icon: "https://avbebe.com/wp-content/uploads/2023/12/icon.png",
    version: "1.0.0",
    requiredVersion: "0.0.2",
    description: "解析 Avbebe 文章内嵌的 HLS 直链",
    author: "HYJ1817",
    site: "https://avbebe.com",
    globalParams: [{ name: "multiSource", title: "是否启用聚合搜索", type: "enumeration", value: "enabled", enumOptions: [{ title: "启用", value: "enabled" }, { title: "禁用", value: "disabled" }] }],
    modules: [
        {
            id: "loadResource",
            title: "Avbebe 播放源",
            description: "解析 Avbebe 文章内嵌的 HLS 直链",
            functionName: "loadResource",
            type: "stream",
            cacheDuration: 0,
            params: []
        }
    ]
};

var B = "https://avbebe.com";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function postId(link) {
    var value = String(link || "");
    var match = value.match(/^avbebe:(\d+)$/) || value.match(/avbebe\.com\/archives\/(\d+)/);
    return match ? match[1] : "";
}

// 只认 FV Player（52cute.com）那类直链；aiovg 的 t33.cdn2020.com 实测恒返回 451，
// 返回它只会得到一条必然失败的线路。
function extractSources(html) {
    var text = String(html || "");
    var out = [];
    var attr = text.match(/data-item="([^"]+)"/);
    if (attr) {
        try {
            var item = JSON.parse(attr[1].replace(/&quot;/g, '"').replace(/&#0?38;|&amp;/g, "&").replace(/&#8211;/g, "-"));
            if (item && item.sources) {
                item.sources.forEach(function (s) { if (s && s.src) out.push(s.src); });
            }
        } catch (error) { /* 回退到下面的通用匹配 */ }
    }
    var source = /<source[^>]+src=["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
    var match;
    while ((match = source.exec(text))) out.push(match[1]);
    var bare = /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi;
    while ((match = bare.exec(text))) out.push(match[0].replace(/\\\//g, "/"));
    var seen = {};
    return out.filter(function (url) {
        if (!url || seen[url]) return false;
        seen[url] = true;
        return !/cdn2020\.com/i.test(url);
    });
}

function streamHeaders() {
    return { "User-Agent": UA, Referer: B + "/", Accept: "*/*" };
}

async function fetchHtml(url) {
    try {
        var response = await Widget.http.get(url, {
            headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/json,*/*", Referer: B + "/" },
            timeout: 20000
        });
        var data = response && response.data;
        if (data && typeof data === "object") {
            return data.content && (data.content.rendered || data.content) || "";
        }
        var text = String(data || "");
        if (/^\s*\{/.test(text)) {
            try {
                var json = JSON.parse(text);
                if (json && json.content) return json.content.rendered || json.content || "";
            } catch (error) { return text; }
        }
        return text;
    } catch (error) {
        return "";
    }
}

async function loadResource(params) {
    var input = params || {};
    if (input.multiSource === "disabled") return [];
    var id = postId(input.link || input.id || input.url);
    if (!id) return [];

    var html = await fetchHtml(B + "/wp-json/wp/v2/posts/" + id + "?_fields=content");
    if (!html || html.indexOf("data-item") < 0) {
        html = await fetchHtml(B + "/archives/" + id);
    }
    var sources = extractSources(html);
    if (!sources.length) return [];

    var headers = streamHeaders();
    return sources.map(function (url, index) {
        return {
            name: index === 0 ? "Avbebe · HLS" : "Avbebe · HLS " + (index + 1),
            url: url,
            playerType: "app",
            customHeaders: headers
        };
    });
}
