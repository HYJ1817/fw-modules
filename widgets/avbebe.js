WidgetMetadata = {
    id: "hyj1817.avbebe.home",
    title: "Avbebe",
    icon: "https://avbebe.com/wp-content/uploads/2023/12/icon.png",
    version: "1.0.0",
    requiredVersion: "0.0.2",
    description: "Avbebe 动画与同人影片的列表、分类与搜索",
    author: "HYJ1817",
    site: "https://avbebe.com",
    modules: [
        {
            id: "latest",
            title: "最新影片",
            description: "可播放分类的最新影片",
            functionName: "loadLatest",
            type: "video",
            cacheDuration: 600,
            params: [{ name: "page", title: "页码", type: "page", description: "页码", value: "1" }]
        },
        {
            id: "categories",
            title: "分类",
            description: "按分类浏览可播放影片",
            functionName: "loadCategory",
            type: "video",
            cacheDuration: 600,
            params: [
                {
                    name: "category",
                    title: "选择分类",
                    type: "enumeration",
                    description: "选择分类",
                    value: "13684",
                    enumOptions: [
                        { title: "同人動畫 (9050)", value: "13684" },
                        { title: "動畫卡通 (2844)", value: "466" },
                        { title: "Motion Anime (1262)", value: "13683" },
                        { title: "新番 (591)", value: "4380" },
                        { title: "MMD (330)", value: "13685" },
                        { title: "泡麵番 (235)", value: "1710" },
                        { title: "小肉番 (9)", value: "4737" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        }
    ],
    search: {
        title: "搜索",
        functionName: "search",
        params: [
            { name: "keyword", title: "关键词", type: "input", description: "输入影片标题、社团或作者名", value: "" },
            { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
        ]
    }
};

var B = "https://avbebe.com";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var PLAYABLE_CATEGORIES = "13684,466,13683,4380,13685,1710,4737";

function clean(s) {
    return String(s || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#0?39;|&#8217;/g, "'")
        .replace(/&quot;|&#822[01];/g, '"')
        .replace(/&#\d+;/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// 站内有两类播放器：FV Player（data-item，直链 52cute.com，可用）
// 与 aiovg（t33.cdn2020.com，实测无条件返回 451，国内与代理都放不出来）。
// 只认前者，451 的域名一并排除，避免给用户一条必然失败的线路。
function playableSources(html) {
    var text = String(html || "");
    var out = [];
    var item = null;
    var attr = text.match(/data-item="([^"]+)"/);
    if (attr) {
        try {
            item = JSON.parse(attr[1].replace(/&quot;/g, '"').replace(/&#0?38;|&amp;/g, "&").replace(/&#8211;/g, "-"));
        } catch (e) { item = null; }
    }
    if (item && item.sources) {
        item.sources.forEach(function (s) { if (s && s.src) out.push(s.src); });
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

function splashOf(html) {
    var match = String(html || "").match(/(?:&quot;|")splash(?:&quot;|")\s*:\s*(?:&quot;|")([^&"]+)(?:&quot;|")/);
    if (match) return match[1].replace(/\\\//g, "/").replace(/&amp;/g, "&");
    match = String(html || "").match(/<source[^>]+poster=["']([^"']+)["']/i);
    return match ? match[1] : "";
}

function streamHeaders() {
    return { "User-Agent": UA, Referer: B + "/", Accept: "*/*" };
}

function placeholder(message) {
    return {
        id: "content-placeholder",
        type: "placeholder",
        title: "⚠️ " + message,
        mediaType: "placeholder",
        duration: 0,
        durationText: "",
        previewUrl: "",
        videoUrl: "",
        link: "",
        description: message,
        playerType: "none"
    };
}

async function fetchPosts(query) {
    try {
        var response = await Widget.http.get(B + "/wp-json/wp/v2/posts?" + query + "&per_page=20&_fields=id,link,title,content,date", {
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

function toItem(post) {
    var html = post.content && (post.content.rendered || post.content) || "";
    var sources = playableSources(html);
    if (!sources.length) return null;
    var title = clean(post.title && post.title.rendered) || String(post.id);
    var cover = splashOf(html) || "";
    var link = "avbebe:" + post.id;
    return {
        id: link,
        type: "video",
        title: title,
        seriesName: title,
        description: title,
        posterPath: cover,
        backdropPath: cover,
        mediaType: "movie",
        link: link
    };
}

function toItems(posts) {
    var out = [];
    (posts || []).forEach(function (post) {
        var item = toItem(post);
        if (item) out.push(item);
    });
    return out;
}

function postId(link) {
    var value = String(link || "");
    var match = value.match(/^avbebe:(\d+)$/) || value.match(/avbebe\.com\/archives\/(\d+)/);
    return match ? match[1] : "";
}

// WP REST 对 page<=0 直接返回 400，页码必须收敛到正整数
function pageOf(value) {
    var page = parseInt(value) || 1;
    return page < 1 ? 1 : page;
}

async function loadLatest(params) {
    var page = pageOf((params || {}).page);
    var posts = await fetchPosts("categories=" + PLAYABLE_CATEGORIES + "&orderby=date&order=desc&page=" + page);
    if (!posts) return [placeholder("网络请求失败，请稍后重试")];
    return toItems(posts);
}

async function loadCategory(params) {
    var options = params || {};
    var category = String(options.category || "13684").replace(/[^\d,]/g, "");
    if (!category) category = "13684";
    var page = pageOf(options.page);
    var posts = await fetchPosts("categories=" + category + "&orderby=date&order=desc&page=" + page);
    if (!posts) return [placeholder("网络请求失败，请稍后重试")];
    return toItems(posts);
}

async function search(params) {
    var options = params || {};
    var keyword = String(options.keyword || "").trim();
    if (!keyword) return [placeholder("请输入搜索关键词")];
    var page = pageOf(options.page);
    // 搜索同样限定在可播放分类里，否则结果大多是 aiovg（451）与 iframe 假播放器
    var posts = await fetchPosts("search=" + encodeURIComponent(keyword) + "&categories=" + PLAYABLE_CATEGORIES + "&orderby=date&order=desc&page=" + page);
    if (!posts) return [placeholder("网络请求失败，请稍后重试")];
    return toItems(posts);
}

async function loadDetail(link) {
    var id = postId(link);
    if (!id) return null;
    var html = "";
    var title = "";
    var post = null;
    try {
        var response = await Widget.http.get(B + "/wp-json/wp/v2/posts/" + id + "?_fields=id,link,title,content", {
            headers: { "User-Agent": UA, Accept: "application/json, text/plain, */*", Referer: B + "/" },
            timeout: 20000
        });
        var data = response && response.data;
        if (typeof data === "string") data = JSON.parse(data);
        if (data && data.id) post = data;
    } catch (error) { post = null; }

    if (post) {
        html = post.content && (post.content.rendered || post.content) || "";
        title = clean(post.title && post.title.rendered) || "";
    } else {
        try {
            var page = await Widget.http.get(B + "/archives/" + id, {
                headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*", Referer: B + "/" },
                timeout: 20000
            });
            html = String((page && page.data) || "");
            var heading = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            title = clean(heading && heading[1]) || "";
        } catch (error) { html = ""; }
    }

    var sources = playableSources(html);
    var cover = splashOf(html) || "";
    var headers = streamHeaders();
    return {
        id: link,
        type: "detail",
        title: title || id,
        videoUrl: sources[0] || link,
        posterPath: cover,
        backdropPath: cover,
        mediaType: "movie",
        duration: 0,
        durationText: "",
        previewUrl: "",
        playerType: sources.length ? "app" : "system",
        link: link,
        customHeaders: headers,
        headers: headers
    };
}
