WidgetMetadata = {
    id: "hyj1817.avbebe.resource",
    title: "Avbebe 播放源",
    icon: "https://avbebe.com/wp-content/uploads/2023/12/icon.png",
    version: "1.0.1",
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
var PLAYABLE_CATEGORIES = "13684,466,1087,13683,4380,13685,1710,4737";

// Forward 可能传 avbebe:<id>、archives URL、?p=<id>、纯数字，也可能是被
// encodeURIComponent 转过的 id —— 先解码再匹配，否则拿不到 id 只能返回空线路。
function postId(value) {
    var text = String(value || "");
    try { text = decodeURIComponent(text); } catch (error) { /* 原样使用 */ }
    var match = text.match(/^avbebe:(\d+)$/)
        || text.match(/avbebe\.com\/archives\/(\d+)/)
        || text.match(/[?&]p=(\d+)/)
        || text.match(/^\d+$/);
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

async function fetchPosts(query) {
    try {
        var response = await Widget.http.get(B + "/wp-json/wp/v2/posts?" + query + "&per_page=10&_fields=id,content", {
            headers: { "User-Agent": UA, Accept: "application/json, text/plain, */*", Referer: B + "/" },
            timeout: 20000
        });
        var data = response && response.data;
        if (typeof data === "string") data = JSON.parse(data);
        return Array.isArray(data) ? data : null;
    } catch (error) {
        return null;
    }
}

function toLines(sources) {
    if (!sources.length) return [];
    var headers = streamHeaders();
    return sources.map(function (url, index) {
        return {
            name: index === 0 ? "Avbebe · HLS" : "Avbebe · HLS " + (index + 1),
            description: "HLS",
            url: url,
            playerType: "app",
            customHeaders: headers,
            headers: headers
        };
    });
}

async function loadResource(params) {
    var input = params || {};
    if (input.multiSource === "disabled") return [];
    var id = postId(input.link) || postId(input.id) || postId(input.url) || postId(input.videoUrl);

    if (id) {
        var html = await fetchHtml(B + "/wp-json/wp/v2/posts/" + id + "?_fields=content");
        if (!html || html.indexOf("data-item") < 0) {
            html = await fetchHtml(B + "/archives/" + id);
        }
        var lines = toLines(extractSources(html));
        if (lines.length) return lines;
    }

    // 兜底：拿不到 id 或按 id 解析失败时，用片名在站内搜索第一条可播放文章，
    // 避免只传 seriesName 的调用直接拿到空线路。
    var title = String(input.seriesName || input.title || "").replace(/[\*"?&<>]/g, "").replace(/\s+/g, " ").trim();
    if (title.length < 2) return [];
    var posts = await fetchPosts("search=" + encodeURIComponent(title) + "&categories=" + PLAYABLE_CATEGORIES + "&orderby=date&order=desc");
    if (!posts) return [];
    for (var i = 0; i < posts.length; i++) {
        var content = posts[i].content && (posts[i].content.rendered || posts[i].content) || "";
        var sources = extractSources(content);
        if (sources.length) return toLines(sources);
    }
    return [];
}
