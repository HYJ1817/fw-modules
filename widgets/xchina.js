WidgetMetadata = {
    id: "hyj1817.xchina.home",
    title: "XChina",
    icon: "https://xchina.co/images/sites/favicon/1.png?v=1.0.2",
    version: "1.0.3",
    requiredVersion: "0.0.2",
    description: "XChina 影片列表、分类与搜索",
    author: "HYJ1817",
    site: "https://xchina.co",
    modules: [
        {
            id: "latest",
            title: "最新影片",
            description: "全站最新影片",
            functionName: "loadLatest",
            type: "video",
            cacheDuration: 300,
            params: [{ name: "page", title: "页码", type: "page", description: "页码", value: "1" }]
        },
        {
            id: "popular",
            title: "观看最多",
            description: "按观看量排序",
            functionName: "loadPopular",
            type: "video",
            cacheDuration: 300,
            params: [{ name: "page", title: "页码", type: "page", description: "页码", value: "1" }]
        },
        {
            id: "categories",
            title: "分类",
            description: "按分类或排序浏览",
            functionName: "loadCategory",
            type: "video",
            cacheDuration: 300,
            params: [
                {
                    name: "category",
                    title: "选择分类",
                    type: "enumeration",
                    description: "选择分类",
                    value: "/videos.html",
                    enumOptions: [
                        { title: "全部影片", value: "/videos.html" },
                        { title: "国产", value: "/videos/cat-cn.html" },
                        { title: "日本AV", value: "/videos/cat-jav.html" },
                        { title: "中文字幕", value: "/videos/tag-sub.html" },
                        { title: "观看最多", value: "/videos/sort-read.html" },
                        { title: "评论最多", value: "/videos/sort-comment.html" },
                        { title: "时长最长", value: "/videos/sort-length.html" },
                        { title: "精选 · 渡边传媒", value: "/videos/xs-1.html" },
                        { title: "精选 · 杏吧花棍哥", value: "/videos/xs-2.html" },
                        { title: "精选 · 色情按摩师", value: "/videos/xs-3.html" },
                        { title: "精选 · 有码", value: "/videos/xs-4.html" },
                        { title: "精选 · 无码", value: "/videos/xs-5.html" },
                        { title: "精选 · Caribbean", value: "/videos/xs-6.html" },
                        { title: "精选 · HEYZO", value: "/videos/xs-7.html" },
                        { title: "精选 · 香蕉视频", value: "/videos/xs-8.html" },
                        { title: "精选 · 中国X站", value: "/videos/xs-9.html" },
                        { title: "精选 · 维度", value: "/videos/xs-10.html" },
                        { title: "精选 · Pacopacomama", value: "/videos/xs-11.html" },
                        { title: "精选 · 10musume", value: "/videos/xs-12.html" },
                        { title: "精选 · 步宾探花", value: "/videos/xs-13.html" }
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
            { name: "keyword", title: "关键词", type: "input", description: "输入标题、女优或番号", value: "" }
        ]
    }
};

var B = "https://xchina.co";
// 主域名瞬时不通或被限流时依次换镜像域名；四个域名同一套内容与 HTML 结构
var HOSTS = ["https://xchina.co", "https://tw.xchina.co", "https://en.xchina.co", "https://kr.xchina.co"];
// 与主站同源同一份 /hls 内容、但不校验 UA 的托管域名：播放器自带 okhttp 等 UA 时
// xchina.co 全链路 403（播放页一直转圈），这里取片不受 UA 影响。
var GENERIC_ORIGIN = "https://myjav.tv";
var GENERIC_MASTER = GENERIC_ORIGIN + "/hls/";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function requestHeaders() {
    return {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Upgrade-Insecure-Requests": "1",
        Referer: B + "/"
    };
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

var LAST_ERROR = "";
// 最近一次成功取回页面的域名：详情页拿不到播放器地址时，用它拼备用直链
var ACTIVE_HOST = "https://xchina.co";

// 把异常整理成能看懂的一行：HTTP 状态码优先，其次原始错误文本。
// 之前失败一律显示"网络请求失败"，分不清是 403 风控还是网络不通。
function errorText(error) {
    if (!error) return "unknown";
    var status = error.status || error.statusCode || (error.response && error.response.status);
    var message = error.message || String(error);
    if (status && String(message).indexOf(String(status)) < 0) message = "HTTP " + status + " " + message;
    return String(message).replace(/\s+/g, " ").slice(0, 90);
}

// path 形如 /videos.html；依次尝试主站与镜像，主站重试一次
async function fetchPage(path) {
    var order = [B, B, HOSTS[1], HOSTS[2], HOSTS[3]];
    var errors = [];
    for (var i = 0; i < order.length; i++) {
        try {
            var response = await Widget.http.get(order[i] + path, { headers: requestHeaders(), timeout: 20000 });
            var body = String((response && response.data) || "");
            if (!body) throw new Error("empty response");
            LAST_ERROR = "";
            ACTIVE_HOST = order[i];
            return body;
        } catch (error) {
            errors.push(order[i].replace("https://", "") + " " + errorText(error));
        }
    }
    LAST_ERROR = errors[errors.length - 1] || "unknown";
    return "";
}

function coverOf(hash) {
    return "https://r2.xchina.download/cover/" + hash + ".webp";
}

function decodeText(value) {
    return String(value || "")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;|&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
}

function parseCards(html) {
    var text = String(html || "");
    if (/Just a moment|Attention Required/i.test(text)) return null;
    var out = [];
    var chunks = text.split(/class="item\s+video/);
    for (var i = 1; i < chunks.length; i++) {
        var chunk = chunks[i];
        var href = (chunk.match(/href="([^"]*\/video\/id-[a-f0-9]+\.html)[^"]*"/) || [])[1] || "";
        var match = href.match(/\/video\/id-([a-f0-9]+)\.html/);
        if (!match) continue;
        var hash = match[1];
        var title = decodeText((chunk.match(/<a[^>]*\stitle="([^"]+)"/) || [])[1] || "");
        if (!title) title = decodeText((chunk.match(/class="title"[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/) || [])[1] || "");
        if (!title) continue;
        var style = (chunk.match(/class="img"[^>]*style="([^"]+)"/) || [])[1] || "";
        var cover = (style.match(/url\(['"]?([^'")]+)/) || [])[1] || coverOf(hash);
        var model = decodeText((chunk.match(/class="model-item"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || "");
        var duration = (chunk.match(/fa-clock"[^>]*><\/i>\s*(\d{1,3}:\d{2}(?::\d{2})?)/) || [])[1] || (chunk.match(/(\d{1,3}:\d{2}(?::\d{2})?)/) || [])[1] || "";
        var id = "xchina:" + hash;
        out.push({
            id: id,
            type: "video",
            title: title,
            seriesName: title,
            description: model ? "女优: " + model : title,
            posterPath: cover,
            backdropPath: cover,
            mediaType: "movie",
            durationText: duration,
            link: id
        });
    }
    return out;
}

function decode(value) {
    var text = String(value || "");
    try { text = decodeURIComponent(text); } catch (error) { /* 原样使用 */ }
    return text;
}

function hashOf(link) {
    var value = decode(link);
    var match = value.match(/^xchina:([a-f0-9]+)$/i)
        || value.match(/\/video\/id-([a-f0-9]+)\.html/i)
        || value.match(/\/hls\/([a-f0-9]+)\//i)
        || value.match(/\b([a-f0-9]{12,16})\b/i);
    return match ? match[1].toLowerCase() : "";
}

async function list(url, page) {
    // 页码收敛到正整数：page<=0 会让分页链接带脏参数
    page = parseInt(page) || 1;
    if (page < 1) page = 1;
    var target = url + (page > 1 ? (url.indexOf("?") >= 0 ? "&" : "?") + "page=" + page : "");
    var html = await fetchPage(target);
    if (!html) return [placeholder("网络请求失败（" + (LAST_ERROR || "未知错误") + "），稍后重试")];
    var items = parseCards(html);
    if (items === null) return [placeholder("站点风控拦截，稍后重试")];
    if (!items.length) return [placeholder("没有可显示的结果")];
    return items;
}

async function loadLatest(params) {
    return list("/videos.html", parseInt((params || {}).page) || 1);
}

async function loadPopular(params) {
    return list("/videos/sort-read.html", parseInt((params || {}).page) || 1);
}

async function loadCategory(params) {
    var options = params || {};
    var category = String(options.category || "/videos.html");
    if (!/^\/videos\/?[a-z0-9-]*\.html$/i.test(category)) category = "/videos.html";
    return list(category, parseInt(options.page) || 1);
}

async function search(params) {
    var keyword = String((params || {}).keyword || "").trim();
    if (!keyword) return [placeholder("请输入搜索关键词")];
    var normalized = keyword.replace(/[\*"?&<>]/g, "").replace(/\s+/g, " ").trim();
    if (normalized.length < 2) return [placeholder("关键词至少 2 个字")];
    // 站内搜索页形如 /videos/keyword-<关键词>.html；多词用 %20 拼接
    var encoded = normalized.split(/\s+/).map(encodeURIComponent).join("%20");
    return list("/videos/keyword-" + encoded + ".html", 1);
}

function cleanTitle(raw) {
    var title = String(raw || "").replace(/\s+/g, " ").trim();
    title = title.replace(/\s*-\s*小黄书\s*xChina\s*$/i, "");
    var parts = title.split(" - ");
    if (parts.length > 1) {
        var tail = parts[parts.length - 1];
        if (tail.length <= 8 && !/[，。！？…\u3002\uff01\uff1f]/.test(tail)) parts.pop();
        title = parts.join(" - ");
    }
    return title.trim();
}

async function loadDetail(params) {
    var input = typeof params === "object" && params !== null ? params : { link: params };
    var link = input.link || input.id || input.url || input.videoUrl || "";
    var hash = hashOf(link) || hashOf(input.videoUrl) || hashOf(input.url);
    if (!hash) return null;
    var detailPath = "/video/id-" + hash + ".html";
    var html = await fetchPage(detailPath);
    var title = "";
    var source = "";
    var cover = coverOf(hash);

    if (html) {
        var heading = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        title = cleanTitle(heading && heading[1]);
        if (!title) {
            var og = html.match(/property="og:title"\s+content="([^"]+)"/i);
            title = cleanTitle(og && og[1]);
        }
        var poster = html.match(/poster:\s*'([^']+)'/i) || html.match(/property="og:image"\s+content="([^"]+)"/i);
        if (poster) cover = poster[1];
    }

    // 播放地址固定走不校验 UA 的通用线路：xchina.co 对 okhttp / Java 等播放器 UA 一律 403，
    // 详情页会一直转圈；通用线路（myjav.tv）与主站同源同一份 /hls 内容，任何 UA 都能取到。
    // 主站与镜像线路仍由播放源模块提供，可在播放器里切换。
    source = GENERIC_MASTER + hash + "/master.m3u8";

    var headers = {
        "User-Agent": UA,
        Referer: GENERIC_ORIGIN + "/",
        Accept: "*/*"
    };
    return {
        id: link,
        type: "detail",
        title: title || hash,
        videoUrl: source,
        posterPath: cover,
        backdropPath: cover,
        mediaType: "movie",
        duration: 0,
        durationText: "",
        previewUrl: "",
        playerType: "app",
        link: link,
        customHeaders: headers,
        headers: headers
    };
}
