WidgetMetadata = {
    id: "hyj1817.jable.home",
    title: "Jable",
    icon: "https://assets.fs1.app/assets/images/logo.png",
    version: "1.0.0",
    requiredVersion: "0.0.2",
    description: "Jable 影片列表、分类与搜索",
    author: "HYJ1817",
    site: "https://jable.tv",
    modules: [
        {
            id: "latest",
            title: "最近更新",
            description: "全站最近更新",
            functionName: "loadLatest",
            type: "video",
            cacheDuration: 300,
            params: [{ name: "page", title: "页码", type: "page", description: "页码", value: "1" }]
        },
        {
            id: "hot",
            title: "热门",
            description: "按热度排序",
            functionName: "loadHot",
            type: "video",
            cacheDuration: 300,
            params: [{ name: "page", title: "页码", type: "page", description: "页码", value: "1" }]
        },
        {
            id: "newRelease",
            title: "新作",
            description: "最新上架新作",
            functionName: "loadNewRelease",
            type: "video",
            cacheDuration: 300,
            params: [{ name: "page", title: "页码", type: "page", description: "页码", value: "1" }]
        },
        {
            id: "categories",
            title: "分类",
            description: "按分类浏览",
            functionName: "loadCategory",
            type: "video",
            cacheDuration: 300,
            params: [
                {
                    name: "category",
                    title: "选择分类",
                    type: "enumeration",
                    description: "选择分类",
                    value: "/categories/chinese-subtitle/",
                    enumOptions: [
                        { title: "中文字幕 (21350)", value: "/categories/chinese-subtitle/" },
                        { title: "角色劇情 (32857)", value: "/categories/roleplay/" },
                        { title: "制服誘惑 (12324)", value: "/categories/uniform/" },
                        { title: "絲襪美腿 (7452)", value: "/categories/pantyhose/" },
                        { title: "直接開啪 (6699)", value: "/categories/sex-only/" },
                        { title: "多P群交 (5622)", value: "/categories/groupsex/" },
                        { title: "主奴調教 (5493)", value: "/categories/bdsm/" },
                        { title: "男友視角 (4188)", value: "/categories/pov/" },
                        { title: "凌辱快感 (3664)", value: "/categories/insult/" },
                        { title: "盜攝偷拍 (540)", value: "/categories/private-cam/" },
                        { title: "女同歡愉 (444)", value: "/categories/lesbian/" },
                        { title: "無碼解放 (266)", value: "/categories/uncensored/" }
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
            { name: "keyword", title: "关键词", type: "input", description: "输入番号、标题或女优名", value: "" },
            { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
        ]
    }
};

// 主域名被 Cloudflare 挑战挡住非浏览器客户端，官方备用域名 fs1.app 只放行普通 HTTP/1.1 客户端
var HOSTS = ["https://fs1.app", "https://jable.tv"];
var ACTIVE_HOST = "https://fs1.app";
var LAST_ERROR = "";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function requestHeaders() {
    return {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Upgrade-Insecure-Requests": "1",
        Referer: ACTIVE_HOST + "/"
    };
}

function errorText(error) {
    if (!error) return "unknown";
    var status = error.status || error.statusCode || (error.response && error.response.status);
    var message = error.message || String(error);
    if (status && String(message).indexOf(String(status)) < 0) message = "HTTP " + status + " " + message;
    return String(message).replace(/\s+/g, " ").slice(0, 90);
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

async function fetchPage(path) {
    var order = [HOSTS[0], HOSTS[0], HOSTS[1]];
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
    if (/Just a moment|Please verify/i.test(text)) return null;
    var out = [];
    var chunks = text.split(/class="video-img-box/);
    for (var i = 1; i < chunks.length; i++) {
        var chunk = chunks[i];
        var href = (chunk.match(/href="([^"]*\/videos\/([a-z0-9-]+)\/)"/) || []);
        if (!href[1]) continue;
        var slug = href[2];
        var title = decodeText((chunk.match(/<h6 class="title">\s*<a[^>]*>([\s\S]*?)<\/a>/) || [])[1] || "");
        if (!title) continue;
        var poster = (chunk.match(/data-src="([^"]+)"/) || [])[1] || "";
        var duration = (chunk.match(/<span class="label">(\d{1,2}:\d{2}(?::\d{2})?)<\/span>/) || [])[1] || "";
        var id = "jable:" + slug;
        out.push({
            id: id,
            type: "video",
            title: title,
            seriesName: title,
            description: title,
            posterPath: poster,
            backdropPath: poster,
            mediaType: "movie",
            durationText: duration,
            link: id
        });
    }
    return out;
}

function withPage(path, page) {
    if (page <= 1) return path;
    return path + (path.indexOf("?") >= 0 ? "&" : "?") + "page=" + page;
}

async function list(path, page) {
    page = parseInt(page) || 1;
    if (page < 1) page = 1;
    var html = await fetchPage(withPage(path, page));
    if (!html) return [placeholder("网络请求失败（" + (LAST_ERROR || "未知错误") + "），稍后重试")];
    var items = parseCards(html);
    if (items === null) return [placeholder("站点风控拦截，稍后重试")];
    if (!items.length) return [placeholder("没有可显示的结果")];
    return items;
}

async function loadLatest(params) {
    return list("/latest-updates/", parseInt((params || {}).page) || 1);
}

async function loadHot(params) {
    return list("/hot/", parseInt((params || {}).page) || 1);
}

async function loadNewRelease(params) {
    return list("/new-release/", parseInt((params || {}).page) || 1);
}

async function loadCategory(params) {
    var options = params || {};
    var category = String(options.category || "/categories/chinese-subtitle/");
    if (!/^\/categories\/[a-z0-9-]+\/$/.test(category)) category = "/categories/chinese-subtitle/";
    return list(category, parseInt(options.page) || 1);
}

async function search(params) {
    var options = params || {};
    var keyword = String(options.keyword || "").trim();
    if (!keyword) return [placeholder("请输入搜索关键词")];
    var normalized = keyword.replace(/[\*"?&<>]/g, "").replace(/\s+/g, " ").trim();
    if (normalized.length < 2) return [placeholder("关键词至少 2 个字")];
    var page = parseInt(options.page) || 1;
    if (page < 1) page = 1;
    var path = "/search/" + encodeURIComponent(normalized) + "/?search_query=" + encodeURIComponent(normalized);
    if (page > 1) path += "&page=" + page;
    var html = await fetchPage(path);
    if (!html) return [placeholder("网络请求失败（" + (LAST_ERROR || "未知错误") + "），稍后重试")];
    var items = parseCards(html);
    if (items === null) return [placeholder("站点风控拦截，稍后重试")];
    if (!items.length) return [placeholder("没有搜索到相关影片")];
    return items;
}

function cleanTitle(raw) {
    var title = String(raw || "").replace(/\s+/g, " ").trim();
    title = title.replace(/\s*-\s*Jable\.TV[\s\S]*$/i, "");
    return title.trim();
}

function slugOf(value) {
    var text = String(value || "");
    try { text = decodeURIComponent(text); } catch (error) { /* 原样使用 */ }
    var match = text.match(/^jable:([a-z0-9-]+)$/i)
        || text.match(/\/videos\/([a-z0-9-]+)\/?/i)
        || text.match(/^([a-z0-9-]{3,})$/i);
    return match ? match[1].toLowerCase() : "";
}

async function loadDetail(params) {
    var input = typeof params === "object" && params !== null ? params : { link: params };
    var link = input.link || input.id || input.url || input.videoUrl || "";
    var slug = slugOf(link) || slugOf(input.url) || slugOf(input.videoUrl);
    if (!slug) return null;
    var html = await fetchPage("/videos/" + slug + "/");
    var title = "";
    var cover = "";
    var source = "";
    var duration = "";

    if (html) {
        title = cleanTitle((html.match(/property="og:title"\s+content="([^"]+)"/i) || [])[1] || "");
        cover = (html.match(/property="og:image"\s+content="([^"]+)"/i) || [])[1] || "";
        var hls = html.match(/hlsUrl\s*[:=]\s*['"]([^'"]+)['"]/i)
            || html.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i);
        source = hls ? (hls[1] || hls[0]) : "";
        duration = (html.match(/<span class="label">(\d{1,2}:\d{2}(?::\d{2})?)<\/span>/) || [])[1] || "";
    }
    if (!title) title = slug;
    if (!source) return null;

    var headers = {
        "User-Agent": UA,
        Referer: ACTIVE_HOST + "/videos/" + slug + "/",
        Origin: ACTIVE_HOST,
        Accept: "*/*"
    };
    return {
        id: link,
        type: "detail",
        title: title,
        videoUrl: source,
        posterPath: cover,
        backdropPath: cover,
        mediaType: "movie",
        duration: 0,
        durationText: duration,
        previewUrl: "",
        playerType: "app",
        link: link,
        customHeaders: headers,
        headers: headers
    };
}
