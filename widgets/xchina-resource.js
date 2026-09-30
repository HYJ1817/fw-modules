WidgetMetadata = {
    id: "hyj1817.xchina.resource",
    title: "XChina 播放源",
    icon: "https://xchina.co/images/sites/favicon/1.png?v=1.0.2",
    version: "1.0.0",
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

function hashOf(link) {
    var value = String(link || "");
    var match = value.match(/^xchina:([a-f0-9]+)$/i) || value.match(/\/video\/id-([a-f0-9]+)\.html/i) || value.match(/^([a-f0-9]{10,})$/);
    return match ? match[1] : "";
}

function line(url, hash) {
    return {
        name: "XChina · HLS",
        url: url,
        playerType: "app",
        customHeaders: {
            "User-Agent": UA,
            Referer: B + "/video/id-" + hash + ".html",
            Accept: "*/*"
        }
    };
}

async function fetchPage(url, referer) {
    try {
        var response = await Widget.http.get(url, {
            headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*;q=0.8", Referer: referer || B + "/" },
            timeout: 15000
        });
        return String((response && response.data) || "");
    } catch (error) {
        return "";
    }
}

async function loadResource(params) {
    var input = params || {};
    if (input.multiSource === "disabled") return [];
    var hash = hashOf(input.link || input.id || input.url);
    if (!hash) return [];

    var url = B + "/hls/" + hash + "/master.m3u8";
    var detailUrl = B + "/video/id-" + hash + ".html";
    var headers = { "User-Agent": UA, Referer: detailUrl, Accept: "*/*" };

    var body = "";
    try {
        var response = await Widget.http.get(url, { headers: headers, timeout: 15000 });
        body = String((response && response.data) || "");
    } catch (error) {
        // 网络抖动时仍给出按约定拼出来的地址，交给播放器判断
        return [line(url, hash)];
    }
    if (body.indexOf("#EXTM3U") >= 0) return [line(url, hash)];

    // 播放列表路径变了：回详情页取播放器实际用的地址
    var page = await fetchPage(detailUrl, B + "/");
    var source = page.match(/src:\s*'([^']+\.m3u8[^']*)'/i) || page.match(/src:\s*"([^"]+\.m3u8[^"]*)"/i);
    if (source) {
        var resolved = source[1].indexOf("http") === 0 ? source[1] : B + source[1];
        return [line(resolved, hash)];
    }
    return [line(url, hash)];
}
