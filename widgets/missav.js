/* 站点域名可切：missav.fans 被墙时切到 missav.ws / missav.live。
 * 页面路径结构是同一套（/dm{id}/cn/...），所以只换 origin 即可。 */
var MISSAV_SITE = "https://missav.fans";
function missavSite(params) {
    var value = String((params && params.site) || "").trim();
    if (value === "ws") return "https://missav.ws";
    if (value === "live") return "https://missav.live";
    if (/^https?:\/\//i.test(value)) return value.replace(/\/+$/, "");
    return "https://missav.fans";
}
function missavRehost(url) {
    return String(url || "").replace(/^https?:\/\/(?:missav\.(?:fans|ws|live|123|tv))/i, MISSAV_SITE);
}
/* 女优排行 TOP50（2026-11 实测 /actresses/ranking，名次、链接与头像一并内置，不依赖排行页实时抓取） */
var MISSAAV_ACTRESSES = [
    { name: "瀬戶環奈", href: "/dm24/actresses/%E7%80%AC%E6%88%B8%E7%92%B0%E5%A5%88", img: "https://fourhoi.com/actress/1099472-t.jpg" },
    { name: "松本一香", href: "/dm389/actresses/%E6%9D%BE%E6%9C%AC%E3%81%84%E3%81%A1%E3%81%8B", img: "https://fourhoi.com/actress/1054998-t.jpg" },
    { name: "逢澤みゆ", href: "/dm3/actresses/%E9%80%A2%E6%B2%A2%E3%81%BF%E3%82%86", img: "https://fourhoi.com/actress/1088602-t.jpg" },
    { name: "河北彩花", href: "/dm565/actresses/%E6%B2%B3%E5%8C%97%E5%BD%A9%E8%8A%B1", img: "https://fourhoi.com/actress/1044864-t.jpg" },
    { name: "美園和花", href: "/dm178/actresses/%E7%BE%8E%E5%9C%92%E5%92%8C%E8%8A%B1", img: "https://fourhoi.com/actress/1044099-t.jpg" },
    { name: "波多野結衣", href: "/dm289/actresses/%E6%B3%A2%E5%A4%9A%E9%87%8E%E7%B5%90%E8%A1%A3", img: "https://fourhoi.com/actress/26225-t.jpg" },
    { name: "北岡果林", href: "/dm5/actresses/%E5%8C%97%E5%B2%A1%E6%9E%9C%E6%9E%97", img: "https://fourhoi.com/actress/1092427-t.jpg" },
    { name: "倉本すみれ", href: "/dm100/actresses/%E5%80%89%E6%9C%AC%E3%81%99%E3%81%BF%E3%82%8C", img: "https://fourhoi.com/actress/1072360-t.jpg" },
    { name: "彌生美月", href: "/dm126/actresses/%E5%BC%A5%E7%94%9F%E3%81%BF%E3%81%A5%E3%81%8D", img: "https://fourhoi.com/actress/1054168-t.jpg" },
    { name: "木下日葵", href: "/dm248/actresses/%E6%9C%A8%E4%B8%8B%E3%81%B2%E3%81%BE%E3%82%8A", img: "https://fourhoi.com/actress/1060141-t.jpg" },
    { name: "森澤佳奈 (飯岡佳奈子)", href: "/dm195/actresses/%E6%A3%AE%E6%B2%A2%E3%81%8B%E3%81%AA%EF%BC%88%E9%A3%AF%E5%B2%A1%E3%81%8B%E3%81%AA%E3%81%93%EF%BC%89", img: "https://fourhoi.com/actress/1020685-t.jpg" },
    { name: "鷲尾芽衣", href: "/dm117/actresses/%E9%B7%B2%E5%B0%BE%E3%82%81%E3%81%84", img: "https://fourhoi.com/actress/1060824-t.jpg" },
    { name: "篠田優", href: "/dm352/actresses/%E7%AF%A0%E7%94%B0%E3%82%86%E3%81%86", img: "https://fourhoi.com/actress/1008785-t.jpg" },
    { name: "沙月惠奈", href: "/dm710/actresses/%E6%B2%99%E6%9C%88%E6%81%B5%E5%A5%88", img: "https://fourhoi.com/actress/1064143-t.jpg" },
    { name: "miru", href: "/dm89/actresses/miru", img: "https://fourhoi.com/actress/1069632-t.jpg" },
    { name: "夢乃愛佳", href: "/dm114/actresses/%E5%A4%A2%E4%B9%83%E3%81%82%E3%81%84%E3%81%8B", img: "https://fourhoi.com/actress/1019323-t.jpg" },
    { name: "三上悠亞", href: "/dm218/actresses/%E4%B8%89%E4%B8%8A%E6%82%A0%E4%BA%9C", img: "https://fourhoi.com/actress/1030262-t.jpg" },
    { name: "石原希望", href: "/dm44/actresses/%E7%9F%B3%E5%8E%9F%E5%B8%8C%E6%9C%9B", img: "https://fourhoi.com/actress/1061063-t.jpg" },
    { name: "森日向子", href: "/dm129/actresses/%E6%A3%AE%E6%97%A5%E5%90%91%E5%AD%90", img: "https://fourhoi.com/actress/1061586-t.jpg" },
    { name: "柏木こなつ", href: "/dm57/actresses/%E6%9F%8F%E6%9C%A8%E3%81%93%E3%81%AA%E3%81%A4", img: "https://fourhoi.com/actress/1075302-t.jpg" },
    { name: "石川澪", href: "/dm74/actresses/%E7%9F%B3%E5%B7%9D%E6%BE%AA", img: "https://fourhoi.com/actress/1072127-t.jpg" },
    { name: "小宵虎南", href: "/dm83/actresses/%E5%B0%8F%E5%AE%B5%E3%81%93%E3%81%AA%E3%82%93", img: "https://fourhoi.com/actress/1069330-t.jpg" },
    { name: "清原みゆう", href: "/dm30/actresses/%E6%B8%85%E5%8E%9F%E3%81%BF%E3%82%86%E3%81%86", img: "https://fourhoi.com/actress/1084111-t.jpg" },
    { name: "神宮寺奈緒", href: "/dm160/actresses/%E7%A5%9E%E5%AE%AE%E5%AF%BA%E3%83%8A%E3%82%AA", img: "https://fourhoi.com/actress/1041897-t.jpg" },
    { name: "北野未奈", href: "/dm115/actresses/%E5%8C%97%E9%87%8E%E6%9C%AA%E5%A5%88", img: "https://fourhoi.com/actress/1068671-t.jpg" },
    { name: "川越にこ", href: "/dm2/actresses/%E5%B7%9D%E8%B6%8A%E3%81%AB%E3%81%93", img: "https://fourhoi.com/actress/1084346-t.jpg" },
    { name: "楓ふうあ", href: "/dm64/actresses/%E6%A5%93%E3%81%B5%E3%81%86%E3%81%82", img: "https://fourhoi.com/actress/1071155-t.jpg" },
    { name: "皆月光", href: "/dm84/actresses/%E7%9A%86%E6%9C%88%E3%81%B2%E3%81%8B%E3%82%8B", img: "https://fourhoi.com/actress/1046723-t.jpg" },
    { name: "七森莉莉", href: "/dm131/actresses/%E4%B8%83%E3%83%84%E6%A3%AE%E3%82%8A%E3%82%8A", img: "https://fourhoi.com/actress/1063214-t.jpg" },
    { name: "東條夏", href: "/dm65/actresses/%E6%9D%B1%E6%A2%9D%E3%81%AA%E3%81%A4", img: "https://fourhoi.com/actress/1059080-t.jpg" },
    { name: "吉根柚莉愛", href: "/dm163/actresses/%E5%90%89%E6%A0%B9%E3%82%86%E3%82%8A%E3%81%82", img: "https://fourhoi.com/actress/1052930-t.jpg" },
    { name: "新井リマ", href: "/dm68/actresses/%E6%96%B0%E4%BA%95%E3%83%AA%E3%83%9E", img: "https://fourhoi.com/actress/1069952-t.jpg" },
    { name: "奧田咲", href: "/dm95/actresses/%E5%A5%A5%E7%94%B0%E5%92%B2", img: "https://fourhoi.com/actress/1008965-t.jpg" },
    { name: "大槻響", href: "/dm6681/actresses/%E5%A4%A7%E6%A7%BB%E3%81%B2%E3%81%B3%E3%81%8D", img: "https://fourhoi.com/actress/30130-t.jpg" },
    { name: "花守夏步", href: "/dm5/actresses/%E8%8A%B1%E5%AE%88%E5%A4%8F%E6%AD%A9", img: "https://fourhoi.com/actress/1099813-t.jpg" },
    { name: "宍戶里帆", href: "/dm33/actresses/%E5%AE%8D%E6%88%B8%E9%87%8C%E5%B8%86", img: "https://fourhoi.com/actress/1075010-t.jpg" },
    { name: "安達夕莉", href: "/dm28/actresses/%E5%AE%89%E9%81%94%E5%A4%95%E8%8E%89", img: "https://fourhoi.com/actress/1077684-t.jpg" },
    { name: "淺野こころ", href: "/dm112/actresses/%E6%B5%85%E9%87%8E%E3%81%93%E3%81%93%E3%82%8D", img: "https://fourhoi.com/actress/1086581-t.jpg" },
    { name: "伊藤舞雪", href: "/dm177/actresses/%E4%BC%8A%E8%97%A4%E8%88%9E%E9%9B%AA", img: "https://fourhoi.com/actress/1042907-t.jpg" },
    { name: "AIKA", href: "/dm177/actresses/AIKA", img: "https://fourhoi.com/actress/1008887-t.jpg" },
    { name: "七瀨愛麗絲", href: "/dm163/actresses/%E4%B8%83%E7%80%AC%E3%82%A2%E3%83%AA%E3%82%B9", img: "https://fourhoi.com/actress/1063724-t.jpg" },
    { name: "椿莉香", href: "/dm36/actresses/%E6%A4%BF%E3%82%8A%E3%81%8B", img: "https://fourhoi.com/actress/1061348-t.jpg" },
    { name: "幸村泉希", href: "/actresses/%E5%B9%B8%E6%9D%91%E6%B3%89%E5%B8%8C", img: "https://fourhoi.com/actress/1104612-t.jpg" },
    { name: "月乃露娜", href: "/dm80/actresses/%E6%9C%88%E4%B9%83%E3%83%AB%E3%83%8A", img: "https://fourhoi.com/actress/1050439-t.jpg" },
    { name: "風間由美", href: "/dm208/actresses/%E9%A2%A8%E9%96%93%E3%82%86%E3%81%BF", img: "https://fourhoi.com/actress/2752-t.jpg" },
    { name: "羽月乃蒼", href: "/dm83/actresses/%E7%BE%BD%E6%9C%88%E4%B9%83%E8%92%BC", img: "https://fourhoi.com/actress/1084337-t.jpg" },
    { name: "小花のん", href: "/dm95/actresses/%E5%B0%8F%E8%8A%B1%E3%81%AE%E3%82%93", img: "https://fourhoi.com/actress/1072206-t.jpg" },
    { name: "末廣純", href: "/dm110/actresses/%E6%9C%AB%E5%BA%83%E7%B4%94", img: "https://fourhoi.com/actress/1075675-t.jpg" },
    { name: "未步なな", href: "/dm27/actresses/%E6%9C%AA%E6%AD%A9%E3%81%AA%E3%81%AA", img: "https://fourhoi.com/actress/1077071-t.jpg" },
    { name: "新村晶", href: "/dm51/actresses/%E6%96%B0%E6%9D%91%E3%81%82%E3%81%8B%E3%82%8A", img: "https://fourhoi.com/actress/1036352-t.jpg" },
];
function actressByName(input) {
    var text = String(input || "").replace(/\s+/g, "");
    if (!text) return null;
    for (var i = 0; i < MISSAAV_ACTRESSES.length; i++) {
        var name = MISSAAV_ACTRESSES[i].name.replace(/\s+/g, "");
        if (name === text || name.indexOf(text) >= 0 || text.indexOf(name) >= 0) return MISSAAV_ACTRESSES[i];
    }
    return null;
}

var MISSAAV_MIRRORS = ["https://missav.ws", "https://missav.live", "https://missav.fans"];
function rehostTo(url, base) {
    return String(url || "").replace(/^https?:\/\/(?:missav\.(?:fans|ws|live|123|tv))/i, base);
}

/* 统一改写请求 URL 与请求头里的站点地址，正文里的硬编码路径因此不用逐条改 */
(function () {
    var rawGet = Widget.http.get;
    Widget.http.get = function (url, options) {
        var target = missavRehost(url);
        if (options && options.headers) {
            var headers = {};
            for (var key in options.headers) {
                var value = options.headers[key];
                headers[key] = typeof value === "string" ? missavRehost(value) : value;
            }
            options.headers = headers;
        }
        return rawGet.call(Widget.http, target, options);
    };
})();

var WidgetMetadata = {
    id: "hyj1817.missav.home",
    title: "MissAV",
    description: "获取 MissAV 推荐",
    author: "𝓑𝓾𝓽𝓽𝓮𝓻𝓯𝓵𝔂",
    site: "https://widgets-xd.vercel.app",
    version: "1.3.1",
    requiredVersion: "0.0.2",
    detailCacheDuration: 3600,
    globalParams: [
        {
            name: "site",
            title: "站点域名",
            type: "enumeration",
            value: "fans",
            enumOptions: [
                { title: "missav.fans（默认）", value: "fans" },
                { title: "missav.ws（主域，被墙时可用）", value: "ws" },
                { title: "missav.live", value: "live" },
                { title: "自定义地址", value: "custom" }
            ]
        },
        { name: "custom_site", title: "自定义站点地址", type: "input", description: "站点选「自定义地址」时生效，如 https://missav.ws" },
    ],
    search: { title: "搜索", functionName: "searchVideos", params: [] },
    modules: [
        {
            id: "actressVideos",
            title: "女优影片",
            description: "从排行前 50 名里选一位，直接看她的影片",
            functionName: "loadActressVideos",
            type: "video",
            cacheDuration: 1800,
            params: [
                {
                    name: "actress",
                    title: "女优（排行前 50）",
                    type: "enumeration",
                    value: "瀬戶環奈",
                    enumOptions: [
                { title: "瀬戶環奈", value: "瀬戶環奈" },
                { title: "松本一香", value: "松本一香" },
                { title: "逢澤みゆ", value: "逢澤みゆ" },
                { title: "河北彩花", value: "河北彩花" },
                { title: "美園和花", value: "美園和花" },
                { title: "波多野結衣", value: "波多野結衣" },
                { title: "北岡果林", value: "北岡果林" },
                { title: "倉本すみれ", value: "倉本すみれ" },
                { title: "彌生美月", value: "彌生美月" },
                { title: "木下日葵", value: "木下日葵" },
                { title: "森澤佳奈 (飯岡佳奈子)", value: "森澤佳奈 (飯岡佳奈子)" },
                { title: "鷲尾芽衣", value: "鷲尾芽衣" },
                { title: "篠田優", value: "篠田優" },
                { title: "沙月惠奈", value: "沙月惠奈" },
                { title: "miru", value: "miru" },
                { title: "夢乃愛佳", value: "夢乃愛佳" },
                { title: "三上悠亞", value: "三上悠亞" },
                { title: "石原希望", value: "石原希望" },
                { title: "森日向子", value: "森日向子" },
                { title: "柏木こなつ", value: "柏木こなつ" },
                { title: "石川澪", value: "石川澪" },
                { title: "小宵虎南", value: "小宵虎南" },
                { title: "清原みゆう", value: "清原みゆう" },
                { title: "神宮寺奈緒", value: "神宮寺奈緒" },
                { title: "北野未奈", value: "北野未奈" },
                { title: "川越にこ", value: "川越にこ" },
                { title: "楓ふうあ", value: "楓ふうあ" },
                { title: "皆月光", value: "皆月光" },
                { title: "七森莉莉", value: "七森莉莉" },
                { title: "東條夏", value: "東條夏" },
                { title: "吉根柚莉愛", value: "吉根柚莉愛" },
                { title: "新井リマ", value: "新井リマ" },
                { title: "奧田咲", value: "奧田咲" },
                { title: "大槻響", value: "大槻響" },
                { title: "花守夏步", value: "花守夏步" },
                { title: "宍戶里帆", value: "宍戶里帆" },
                { title: "安達夕莉", value: "安達夕莉" },
                { title: "淺野こころ", value: "淺野こころ" },
                { title: "伊藤舞雪", value: "伊藤舞雪" },
                { title: "AIKA", value: "AIKA" },
                { title: "七瀨愛麗絲", value: "七瀨愛麗絲" },
                { title: "椿莉香", value: "椿莉香" },
                { title: "幸村泉希", value: "幸村泉希" },
                { title: "月乃露娜", value: "月乃露娜" },
                { title: "風間由美", value: "風間由美" },
                { title: "羽月乃蒼", value: "羽月乃蒼" },
                { title: "小花のん", value: "小花のん" },
                { title: "末廣純", value: "末廣純" },
                { title: "未步なな", value: "未步なな" },
                { title: "新村晶", value: "新村晶" }
                    ]
                },
                { name: "page", title: "页码", type: "page", value: "1" }
            ]
        },
        {
            title: "搜索影片",
            description: "搜索 MissAV 影片内容",
            requiresWebView: false,
            functionName: "searchVideos",
            cacheDuration: 3600,
            params: [
                {
                    name: "keyword",
                    title: "搜索关键词",
                    type: "input",
                    description: "输入搜索关键词（演员名、番号、标题等）",
                    value: ""
                },
                {
                    name: "sort_by",
                    title: "排序",
                    type: "enumeration",
                    description: "排序方式",
                    value: "released_at",
                    enumOptions: [
                        { title: "发行日期", value: "released_at" },
                        { title: "最近更新", value: "published_at" },
                        { title: "收藏数", value: "saved" },
                        { title: "今日浏览数", value: "today_views" },
                        { title: "本周浏览数", value: "weekly_views" },
                        { title: "本月浏览数", value: "monthly_views" },
                        { title: "总浏览数", value: "views" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "今日热门",
            description: "今日热门影片",
            requiresWebView: false,
            functionName: "loadTodayHot",
            cacheDuration: 3600,
            params: [
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "本周热门",
            description: "本周热门影片",
            requiresWebView: false,
            functionName: "loadWeeklyHot",
            cacheDuration: 3600,
            params: [
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "本月热门",
            description: "本月热门影片",
            requiresWebView: false,
            functionName: "loadMonthlyHot",
            cacheDuration: 3600,
            params: [
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "新作上市",
            description: "新作上市影片",
            requiresWebView: false,
            functionName: "loadNewRelease",
            cacheDuration: 3600,
            params: [
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "中文字幕",
            description: "中文字幕影片",
            requiresWebView: false,
            functionName: "loadChineseSubtitle",
            cacheDuration: 3600,
            params: [
                {
                    name: "sort_by",
                    title: "排序",
                    type: "enumeration",
                    description: "排序方式",
                    value: "released_at",
                    enumOptions: [
                        { title: "发行日期", value: "released_at" },
                        { title: "最近更新", value: "published_at" },
                        { title: "收藏数", value: "saved" },
                        { title: "今日浏览数", value: "today_views" },
                        { title: "本周浏览数", value: "weekly_views" },
                        { title: "本月浏览数", value: "monthly_views" },
                        { title: "总浏览数", value: "views" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "无码影片库",
            description: "无码影片各分类",
            requiresWebView: false,
            functionName: "loadPage",
            cacheDuration: 3600,
            params: [
                {
                    name: "url",
                    title: "选择分类",
                    type: "enumeration",
                    description: "选择分类",
                    enumOptions: [
                        { title: "无码流出", value: "https://missav.fans/dm621/cn/uncensored-leak" },
                        { title: "FC2", value: "https://missav.fans/dm99/cn/fc2" },
                        { title: "HEYZO", value: "https://missav.fans/dm319995/cn/heyzo" },
                        { title: "东京热", value: "https://missav.fans/dm29/cn/tokyohot" },
                        { title: "Caribbeancom", value: "https://missav.fans/dm1271239/cn/caribbeancom" },
                        { title: "Gachinco", value: "https://missav.fans/dm135/cn/gachinco" },
                        { title: "XXX-AV", value: "https://missav.fans/dm29/cn/xxxav" },
                        { title: "人妻斩", value: "https://missav.fans/dm24/cn/marriedslash" },
                        { title: "顽皮 4610", value: "https://missav.fans/dm19/cn/naughty4610" },
                        { title: "顽皮 0930", value: "https://missav.fans/dm22/cn/naughty0930" }
                    ]
                },
                {
                    name: "sort_by",
                    title: "排序",
                    type: "enumeration",
                    description: "排序方式",
                    value: "released_at",
                    enumOptions: [
                        { title: "发行日期", value: "released_at" },
                        { title: "最近更新", value: "published_at" },
                        { title: "收藏数", value: "saved" },
                        { title: "今日浏览数", value: "today_views" },
                        { title: "本周浏览数", value: "weekly_views" },
                        { title: "本月浏览数", value: "monthly_views" },
                        { title: "总浏览数", value: "views" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "亚洲AV专区",
            description: "亚洲AV各分类",
            requiresWebView: false,
            functionName: "loadPage",
            cacheDuration: 3600,
            params: [
                {
                    name: "url",
                    title: "选择分类",
                    type: "enumeration",
                    description: "选择分类",
                    enumOptions: [
                        { title: "麻豆传媒", value: "https://missav.fans/dm34/cn/madou" },
                        { title: "韩国直播", value: "https://missav.fans/cn/klive" },
                        { title: "中国直播", value: "https://missav.fans/cn/clive" }
                    ]
                },
                {
                    name: "sort_by",
                    title: "排序",
                    type: "enumeration",
                    description: "排序方式",
                    value: "released_at",
                    enumOptions: [
                        { title: "发行日期", value: "released_at" },
                        { title: "最近更新", value: "published_at" },
                        { title: "收藏数", value: "saved" },
                        { title: "今日浏览数", value: "today_views" },
                        { title: "本周浏览数", value: "weekly_views" },
                        { title: "本月浏览数", value: "monthly_views" },
                        { title: "总浏览数", value: "views" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "影片质量类",
            description: "影片质量类 - 12个类型，748,863部影片",
            requiresWebView: false,
            functionName: "loadPage",
            cacheDuration: 3600,
            params: [
                {
                    name: "url",
                    title: "选择类型",
                    type: "enumeration",
                    description: "选择具体类型",
                    enumOptions: [
                        { title: "高清 (248,852部)", value: "https://missav.fans/dm95/cn/genres/%E9%AB%98%E6%B8%85" },
                        { title: "独家 (220,805部)", value: "https://missav.fans/dm136/cn/genres/%E7%8B%AC%E5%AE%B6" },
                        { title: "单体作品 (185,259部)", value: "https://missav.fans/dm118/cn/genres/%E5%8D%95%E4%BD%93%E4%BD%9C%E5%93%81" },
                        { title: "薄格 (93,610部)", value: "https://missav.fans/dm95/cn/genres/%E8%96%84%E6%A0%BC" },
                        { title: "全高清 (FHD) (11928部)", value: "https://missav.fans/cn/genres/%E5%85%A8%E9%AB%98%E6%B8%85%20(FHD)" },
                        { title: "低成本影片 (70部)", value: "https://missav.fans/cn/genres/%E4%BD%8E%E6%88%90%E6%9C%AC%E5%BD%B1%E7%89%87" },
                        { title: "套装商品 (44部)", value: "https://missav.fans/cn/genres/%E5%A5%97%E8%A3%85%E5%95%86%E5%93%81" },
                        { title: "限时特卖 (37部)", value: "https://missav.fans/cn/genres/%E9%99%90%E6%97%B6%E7%89%B9%E5%8D%96" },
                        { title: "高清 (HD) (36部)", value: "https://missav.fans/cn/genres/%E9%AB%98%E6%B8%85%20%28HD%29" },
                        { title: "协力作品 (32部)", value: "https://missav.fans/cn/genres/%E5%8D%8F%E5%8A%9B%E4%BD%9C%E5%93%81" },
                        { title: "单一作品 (13部)", value: "https://missav.fans/cn/genres/%E5%8D%95%E4%B8%80%E4%BD%9C%E5%93%81" },
                        { title: "仅限分发 (12部)", value: "https://missav.fans/cn/genres/%E4%BB%85%E9%99%90%E5%88%86%E5%8F%91" }
                    ]
                },
                {
                    name: "sort_by",
                    title: "排序",
                    type: "enumeration",
                    description: "排序方式",
                    value: "released_at",
                    enumOptions: [
                        { title: "发行日期", value: "released_at" },
                        { title: "最近更新", value: "published_at" },
                        { title: "收藏数", value: "saved" },
                        { title: "今日浏览数", value: "today_views" },
                        { title: "本周浏览数", value: "weekly_views" },
                        { title: "本月浏览数", value: "monthly_views" },
                        { title: "总浏览数", value: "views" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "角色与身份",
            description: "角色与身份 - 23个类型，609,543部影片",
            requiresWebView: false,
            functionName: "loadPage",
            cacheDuration: 3600,
            params: [
                {
                    name: "url",
                    title: "选择类型",
                    type: "enumeration",
                    description: "选择具体类型",
                    enumOptions: [
                        { title: "人妻 (123,405部)", value: "https://missav.fans/dm67/cn/genres/%E4%BA%BA%E5%A6%BB" },
                        { title: "熟女 (111,004部)", value: "https://missav.fans/dm107/cn/genres/%E7%86%9F%E5%A5%B3" },
                        { title: "素人 (97,868部)", value: "https://missav.fans/dm95/cn/genres/%E7%B4%A0%E4%BA%BA" },
                        { title: "美少女 (89,506部)", value: "https://missav.fans/dm93/cn/genres/%E7%BE%8E%E5%B0%91%E5%A5%B3" },
                        { title: "痴女 (71,969部)", value: "https://missav.fans/dm68/cn/genres/%E7%97%B4%E5%A5%B3" },
                        { title: "女高中生 (62,542部)", value: "https://missav.fans/dm61/cn/genres/%E5%A5%B3%E9%AB%98%E4%B8%AD%E7%94%9F" },
                        { title: "秘书 (997部)", value: "https://missav.fans/dm63/cn/genres/秘书" },
                        { title: "美丽的成熟女人 (135部)", value: "https://missav.fans/cn/genres/美丽的成熟女人" },
                        { title: "妈妈朋友 (98部)", value: "https://missav.fans/cn/genres/%E5%A6%88%E5%A6%88%E6%9C%8B%E5%8F%8B" },
                        { title: "M女人 (77部)", value: "https://missav.fans/dm1/cn/genres/M%E5%A5%B3%E4%BA%BA" },
                        { title: "成熟的女人 (32部)", value: "https://missav.fans/cn/genres/%E6%88%90%E7%86%9F%E7%9A%84%E5%A5%B3%E4%BA%BA" },
                        { title: "家庭主妇 (32部)", value: "https://missav.fans/cn/genres/%E5%AE%B6%E5%BA%AD%E4%B8%BB%E5%A6%87" },
                        { title: "成熟女人 / 已婚女人 (29部)", value: "https://missav.fans/cn/genres/%E6%88%90%E7%86%9F%E5%A5%B3%E4%BA%BA%20/%20%E5%B7%B2%E5%A9%9A%E5%A5%B3%E4%BA%BA" },
                        { title: "其他学生 (21部)", value: "https://missav.fans/cn/genres/%E5%85%B6%E4%BB%96%E5%AD%A6%E7%94%9F" },
                        { title: "大小姐 (19部)", value: "https://missav.fans/dm69/cn/genres/%E5%A4%A7%E5%B0%8F%E5%A7%90" },
                        { title: "公主 (18部)", value: "https://missav.fans/cn/genres/%E5%85%AC%E4%B8%BB" },
                        { title: "美丽的女孩 (12部)", value: "https://missav.fans/dm89/cn/genres/%E7%BE%8E%E4%B8%BD%E7%9A%84%E5%A5%B3%E5%AD%A9" },
                        { title: "新娘 / 年轻的妻子 (10部)", value: "https://missav.fans/cn/genres/%E6%96%B0%E5%A8%98%20/%20%E5%B9%B4%E8%BD%BB%E7%9A%84%E5%A6%BB%E5%AD%90" },
                        { title: "养女 (10部)", value: "https://missav.fans/dm1/cn/genres/%E5%85%BB%E5%A5%B3" }
                    ]
                },
                {
                    name: "sort_by",
                    title: "排序",
                    type: "enumeration",
                    description: "排序方式",
                    value: "released_at",
                    enumOptions: [
                        { title: "发行日期", value: "released_at" },
                        { title: "最近更新", value: "published_at" },
                        { title: "收藏数", value: "saved" },
                        { title: "今日浏览数", value: "today_views" },
                        { title: "本周浏览数", value: "weekly_views" },
                        { title: "本月浏览数", value: "monthly_views" },
                        { title: "总浏览数", value: "views" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "性行为类型",
            description: "性行为类型 - 19个类型，759,620部影片",
            requiresWebView: false,
            functionName: "loadPage",
            cacheDuration: 3600,
            params: [
                {
                    name: "url",
                    title: "选择类型",
                    type: "enumeration",
                    description: "选择具体类型",
                    enumOptions: [
                        { title: "中出 (198,292部)", value: "https://missav.fans/dm127/cn/genres/%E4%B8%AD%E5%87%BA" },
                        { title: "口交 (95,026部)", value: "https://missav.fans/dm93/cn/genres/%E5%8F%A3%E4%BA%A4" },
                        { title: "骑乘 (86,850部)", value: "https://missav.fans/dm82/cn/genres/%E9%AA%91%E4%B9%98" },
                        { title: "潮吹 (73,825部)", value: "https://missav.fans/dm71/cn/genres/%E6%BD%AE%E5%90%B9" },
                        { title: "乳交 (68,569部)", value: "https://missav.fans/dm67/cn/genres/%E4%B9%B3%E4%BA%A4" },
                        { title: "颜射 (63,513部)", value: "https://missav.fans/dm59/cn/genres/%E9%A2%9C%E5%B0%84" },
                        { title: "自慰 (60,648部)", value: "https://missav.fans/dm59/cn/genres/%E8%87%AA%E6%85%B0" },
                        { title: "手淫 (58,635部)", value: "https://missav.fans/dm57/cn/genres/%E6%89%8B%E6%B7%AB" },
                        { title: "内射精 (57部)", value: "https://missav.fans/dm77/cn/genres/%E5%86%85%E5%B0%84%E7%B2%BE" },
                        { title: "极致高潮 (88部)", value: "https://missav.fans/dm19/cn/genres/%E6%9E%81%E8%87%B4%E9%AB%98%E6%BD%AE" },
                        { title: "3P (26部)", value: "https://missav.fans/dm45/cn/genres/3P" },
                        { title: "多人 (26部)", value: "https://missav.fans/cn/genres/%E5%A4%9A%E4%BA%BA" },
                        { title: "狗狗式 (19部)", value: "https://missav.fans/cn/genres/%E7%8B%97%E7%8B%97%E5%BC%8F" },
                        { title: "撒尿 (17部)", value: "https://missav.fans/cn/genres/%E6%92%92%E5%B0%BF" },
                        { title: "盐吹 (16部)", value: "https://missav.fans/cn/genres/%E7%9B%90%E5%90%B9" },
                        { title: "撒尿 (14部)", value: "https://missav.fans/dm12/cn/genres/%E6%92%92%E5%B0%BF" },
                        { title: "3P / 4P (11部)", value: "https://missav.fans/cn/genres/3P%20/%204P" },
                        { title: "洗澡 (26部)", value: "https://missav.fans/cn/genres/%E6%B4%97%E6%BE%A1" }
                    ]
                },
                {
                    name: "sort_by",
                    title: "排序",
                    type: "enumeration",
                    description: "排序方式",
                    value: "released_at",
                    enumOptions: [
                        { title: "发行日期", value: "released_at" },
                        { title: "最近更新", value: "published_at" },
                        { title: "收藏数", value: "saved" },
                        { title: "今日浏览数", value: "today_views" },
                        { title: "本周浏览数", value: "weekly_views" },
                        { title: "本月浏览数", value: "monthly_views" },
                        { title: "总浏览数", value: "views" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "情节与主题",
            description: "情节与主题 - 15个类型，363,926部影片",
            requiresWebView: false,
            functionName: "loadPage",
            cacheDuration: 3600,
            params: [
                {
                    name: "url",
                    title: "选择类型",
                    type: "enumeration",
                    description: "选择具体类型",
                    enumOptions: [
                        { title: "企划 (67,686部)", value: "https://missav.fans/dm67/cn/genres/%E4%BC%81%E5%88%92" },
                        { title: "乱伦 (56,481部)", value: "https://missav.fans/dm55/cn/genres/%E4%B9%B1%E4%BC%A6" },
                        { title: "NTR (51,273部)", value: "https://missav.fans/dm51/cn/genres/NTR" },
                        { title: "搭讪 (48,965部)", value: "https://missav.fans/dm48/cn/genres/%E6%90%AD%E8%AE%AA" },
                        { title: "淫乱 (47,821部)", value: "https://missav.fans/dm47/cn/genres/%E6%B7%AB%E4%B9%B1" },
                        { title: "剧情 (46,573部)", value: "https://missav.fans/dm46/cn/genres/%E5%89%A7%E6%83%85" },
                        { title: "羞辱 (44,892部)", value: "https://missav.fans/dm44/cn/genres/%E7%BE%9E%E8%BE%B1" },
                        { title: "妻子的出轨 / NTR / 戴绿帽子 (74部)", value: "https://missav.fans/cn/genres/%E5%A6%BB%E5%AD%90%E7%9A%84%E5%87%BA%E8%BD%A8%20/%20NTR%20/%20%E6%88%B4%E7%BB%BF%E5%B8%BD%E5%AD%90" },
                        { title: "戴绿帽子 (39部)", value: "https://missav.fans/cn/genres/%E6%88%B4%E7%BB%BF%E5%B8%BD%E5%AD%90" },
                        { title: "告白体验 (30部)", value: "https://missav.fans/cn/genres/%E5%91%8A%E7%99%BD%E4%BD%93%E9%AA%8C" },
                        { title: "外遇妻子 / NTR / 戴绿帽子 (17部)", value: "https://missav.fans/cn/genres/%E5%A4%96%E9%81%87%E5%A6%BB%E5%AD%90%20/%20NTR%20/%20%E6%88%B4%E7%BB%BF%E5%B8%BD%E5%AD%90" },
                        { title: "交往 (13部)", value: "https://missav.fans/cn/genres/%E4%BA%A4%E5%BE%80" }
                    ]
                },
                {
                    name: "sort_by",
                    title: "排序",
                    type: "enumeration",
                    description: "排序方式",
                    value: "released_at",
                    enumOptions: [
                        { title: "发行日期", value: "released_at" },
                        { title: "最近更新", value: "published_at" },
                        { title: "收藏数", value: "saved" },
                        { title: "今日浏览数", value: "today_views" },
                        { title: "本周浏览数", value: "weekly_views" },
                        { title: "本月浏览数", value: "monthly_views" },
                        { title: "总浏览数", value: "views" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "特殊玩法类",
            description: "特殊玩法 - 9个类型，85,102部影片",
            requiresWebView: false,
            functionName: "loadPage",
            cacheDuration: 3600,
            params: [
                {
                    name: "url",
                    title: "选择类型",
                    type: "enumeration",
                    description: "选择具体类型",
                    enumOptions: [
                        { title: "多人运动 (53,962部)", value: "https://missav.fans/dm53/cn/genres/%E5%A4%9A%E4%BA%BA%E8%BF%90%E5%8A%A8" },
                        { title: "拘束 (41,628部)", value: "https://missav.fans/dm41/cn/genres/%E6%8B%98%E6%9D%9F" },
                        { title: "脏话 (63部)", value: "https://missav.fans/cn/genres/%E8%84%8F%E8%AF%9D" },
                        { title: "催眠洗脑 (62部)", value: "https://missav.fans/cn/genres/%E5%82%AC%E7%9C%A0%E6%B4%97%E8%84%91" },
                        { title: "口球 (51部)", value: "https://missav.fans/cn/genres/%E5%8F%A3%E7%90%83" },
                        { title: "放置Play (31部)", value: "https://missav.fans/cn/genres/%E6%94%BE%E7%BD%AEPlay" },
                        { title: "奴隶 (26部)", value: "https://missav.fans/dm6/cn/genres/%E5%A5%B4%E9%9A%B6" }
                    ]
                },
                {
                    name: "sort_by",
                    title: "排序",
                    type: "enumeration",
                    description: "排序方式",
                    value: "released_at",
                    enumOptions: [
                        { title: "发行日期", value: "released_at" },
                        { title: "最近更新", value: "published_at" },
                        { title: "收藏数", value: "saved" },
                        { title: "今日浏览数", value: "today_views" },
                        { title: "本周浏览数", value: "weekly_views" },
                        { title: "本月浏览数", value: "monthly_views" },
                        { title: "总浏览数", value: "views" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "身材特征类",
            description: "身材特征 - 14个类型，234,821部影片",
            requiresWebView: false,
            functionName: "loadPage",
            cacheDuration: 3600,
            params: [
                {
                    name: "url",
                    title: "选择类型",
                    type: "enumeration",
                    description: "选择具体类型",
                    enumOptions: [
                        { title: "巨乳 (165,810部)", value: "https://missav.fans/dm112/cn/genres/%E5%B7%A8%E4%B9%B3" },
                        { title: "苗条 (34,968部)", value: "https://missav.fans/dm34/cn/genres/%E8%8B%97%E6%9D%A1" },
                        { title: "美乳 (33,527部)", value: "https://missav.fans/dm33/cn/genres/%E7%BE%8E%E4%B9%B3" },
                        { title: "D罩杯 (79部)", value: "https://missav.fans/cn/genres/D%E7%BD%A9%E6%9D%AF" },
                        { title: "背部 (73部)", value: "https://missav.fans/dm355/cn/genres/%E8%83%8C%E9%83%A8" },
                        { title: "美丽的屁股 (60部)", value: "https://missav.fans/cn/genres/%E7%BE%8E%E4%B8%BD%E7%9A%84%E5%B1%81%E8%82%A1" },
                        { title: "E罩杯以上的Judai（青少年） (55部)", value: "https://missav.fans/cn/genres/E%E7%BD%A9%E6%9D%AF%E4%BB%A5%E4%B8%8A%E7%9A%84Judai%EF%BC%88%E9%9D%92%E5%B0%91%E5%B9%B4%EF%BC%89" },
                        { title: "甜屁股 (54部)", value: "https://missav.fans/cn/genres/%E7%94%9C%E5%B1%81%E8%82%A1" },
                        { title: "美尻 (46部)", value: "https://missav.fans/cn/genres/%E7%BE%8E%E5%B0%BB" },
                        { title: "性感的腿 (42部)", value: "https://missav.fans/cn/genres/%E6%80%A7%E6%84%9F%E7%9A%84%E8%85%BF" },
                        { title: "大乳房 (31部)", value: "https://missav.fans/cn/genres/%E5%A4%A7%E4%B9%B3%E6%88%BF" },
                        { title: "白皙的皮肤 (16部)", value: "https://missav.fans/cn/genres/%E7%99%BD%E7%9A%99%E7%9A%84%E7%9A%AE%E8%82%A4" },
                        { title: "小乳房 (16部)", value: "https://missav.fans/cn/genres/%E5%B0%8F%E4%B9%B3%E6%88%BF" },
                        { title: "皮肤黑 (44部)", value: "https://missav.fans/cn/genres/%E7%9A%AE%E8%82%A4%E9%BB%91" }
                    ]
                },
                {
                    name: "sort_by",
                    title: "排序",
                    type: "enumeration",
                    description: "排序方式",
                    value: "released_at",
                    enumOptions: [
                        { title: "发行日期", value: "released_at" },
                        { title: "最近更新", value: "published_at" },
                        { title: "收藏数", value: "saved" },
                        { title: "今日浏览数", value: "today_views" },
                        { title: "本周浏览数", value: "weekly_views" },
                        { title: "本月浏览数", value: "monthly_views" },
                        { title: "总浏览数", value: "views" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "职业角色类",
            description: "职业角色 - 8个类型，372部影片",
            requiresWebView: false,
            functionName: "loadPage",
            cacheDuration: 3600,
            params: [
                {
                    name: "url",
                    title: "选择类型",
                    type: "enumeration",
                    description: "选择具体类型",
                    enumOptions: [
                        { title: "接待员 (97部)", value: "https://missav.fans/cn/genres/%E6%8E%A5%E5%BE%85%E5%91%98" },
                        { title: "女导游 (92部)", value: "https://missav.fans/dm2/cn/genres/%E5%A5%B3%E5%AF%BC%E6%B8%B8" },
                        { title: "啦啦队 (69部)", value: "https://missav.fans/cn/genres/%E5%95%A6%E5%95%A6%E9%98%9F" },
                        { title: "空中小姐 CA (50部)", value: "https://missav.fans/cn/genres/%E7%A9%BA%E4%B8%AD%E5%B0%8F%E5%A7%90%20CA" },
                        { title: "台湾模特儿 (20部)", value: "https://missav.fans/cn/genres/%E5%8F%B0%E6%B9%BE%E6%A8%A1%E7%89%B9%E5%84%BF" },
                        { title: "迷你裙女警 (20部)", value: "https://missav.fans/dm1/cn/genres/%E8%BF%B7%E4%BD%A0%E8%A3%99%E5%A5%B3%E8%AD%A6" },
                        { title: "色情明星 (14部)", value: "https://missav.fans/cn/genres/%E8%89%B2%E6%83%85%E6%98%8E%E6%98%9F" },
                        { title: "演员 (10部)", value: "https://missav.fans/cn/genres/%E6%BC%94%E5%91%98" }
                    ]
                },
                {
                    name: "sort_by",
                    title: "排序",
                    type: "enumeration",
                    description: "排序方式",
                    value: "released_at",
                    enumOptions: [
                        { title: "发行日期", value: "released_at" },
                        { title: "最近更新", value: "published_at" },
                        { title: "收藏数", value: "saved" },
                        { title: "今日浏览数", value: "today_views" },
                        { title: "本周浏览数", value: "weekly_views" },
                        { title: "本月浏览数", value: "monthly_views" },
                        { title: "总浏览数", value: "views" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "拍摄方式类",
            description: "拍摄方式 - 6个类型，78,894部影片",
            requiresWebView: false,
            functionName: "loadPage",
            cacheDuration: 3600,
            params: [
                {
                    name: "url",
                    title: "选择类型",
                    type: "enumeration",
                    description: "选择具体类型",
                    enumOptions: [
                        { title: "自拍 (39,847部)", value: "https://missav.fans/dm39/cn/genres/%E8%87%AA%E6%8B%8D" },
                        { title: "偷拍 (38,924部)", value: "https://missav.fans/dm38/cn/genres/%E5%81%B7%E6%8B%8D" },
                        { title: "第一次拍摄 (48部)", value: "https://missav.fans/cn/genres/%E7%AC%AC%E4%B8%80%E6%AC%A1%E6%8B%8D%E6%91%84" },
                        { title: "主观性 (16部)", value: "https://missav.fans/cn/genres/%E4%B8%BB%E8%A7%82%E6%80%A7" },
                        { title: "记录 (15部)", value: "https://missav.fans/cn/genres/%E8%AE%B0%E5%BD%95" },
                        { title: "按摩 (15部)", value: "https://missav.fans/dm6/cn/genres/%E6%8C%89%E6%91%A9" }
                    ]
                },
                {
                    name: "sort_by",
                    title: "排序",
                    type: "enumeration",
                    description: "排序方式",
                    value: "released_at",
                    enumOptions: [
                        { title: "发行日期", value: "released_at" },
                        { title: "最近更新", value: "published_at" },
                        { title: "收藏数", value: "saved" },
                        { title: "今日浏览数", value: "today_views" },
                        { title: "本周浏览数", value: "weekly_views" },
                        { title: "本月浏览数", value: "monthly_views" },
                        { title: "总浏览数", value: "views" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "时长合集类",
            description: "时长与合集 - 3个类型，73,839部影片",
            requiresWebView: false,
            functionName: "loadPage",
            cacheDuration: 3600,
            params: [
                {
                    name: "url",
                    title: "选择类型",
                    type: "enumeration",
                    description: "选择具体类型",
                    enumOptions: [
                        { title: "4小时以上 (37,685部)", value: "https://missav.fans/dm37/cn/genres/4%E5%B0%8F%E6%97%B6%E4%BB%A5%E4%B8%8A" },
                        { title: "合集 (36,142部)", value: "https://missav.fans/dm36/cn/genres/%E5%90%88%E9%9B%86" },
                        { title: "超过工作时间 4 小时 (12部)", value: "https://missav.fans/cn/genres/%E8%B6%85%E8%BF%87%E5%B7%A5%E4%BD%9C%E6%97%B6%E9%97%B4%204%20%E5%B0%8F%E6%97%B6" }
                    ]
                },
                {
                    name: "sort_by",
                    title: "排序",
                    type: "enumeration",
                    description: "排序方式",
                    value: "released_at",
                    enumOptions: [
                        { title: "发行日期", value: "released_at" },
                        { title: "最近更新", value: "published_at" },
                        { title: "收藏数", value: "saved" },
                        { title: "今日浏览数", value: "today_views" },
                        { title: "本周浏览数", value: "weekly_views" },
                        { title: "本月浏览数", value: "monthly_views" },
                        { title: "总浏览数", value: "views" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "服装造型类",
            description: "服装与造型 - 13个类型，657部影片",
            requiresWebView: false,
            functionName: "loadPage",
            cacheDuration: 3600,
            params: [
                {
                    name: "url",
                    title: "选择类型",
                    type: "enumeration",
                    description: "选择具体类型",
                    enumOptions: [
                        { title: "裙子单声道 (75部)", value: "https://missav.fans/cn/genres/%E8%A3%99%E5%AD%90%E5%8D%95%E5%A3%B0%E9%81%93" },
                        { title: "浴衣 (72部)", value: "https://missav.fans/dm1/cn/genres/%E6%B5%B4%E8%A1%A3" },
                        { title: "中长发 (69部)", value: "https://missav.fans/dm1/cn/genres/%E4%B8%AD%E9%95%BF%E5%8F%91" },
                        { title: "连裤袜的事 (67部)", value: "https://missav.fans/cn/genres/%E8%BF%9E%E8%A3%A4%E8%A2%9C%E7%9A%84%E4%BA%8B" },
                        { title: "面具 (85部)", value: "https://missav.fans/cn/genres/%E9%9D%A2%E5%85%B7" },
                        { title: "靴子 (44部)", value: "https://missav.fans/cn/genres/%E9%9D%B4%E5%AD%90" },
                        { title: "卷发 (37部)", value: "https://missav.fans/cn/genres/%E5%8D%B7%E5%8F%91" },
                        { title: "高跟鞋 (36部)", value: "https://missav.fans/cn/genres/%E9%AB%98%E8%B7%9F%E9%9E%8B" },
                        { title: "围裙 (31部)", value: "https://missav.fans/dm25/cn/genres/%E5%9B%B4%E8%A3%99" },
                        { title: "金发 (51部)", value: "https://missav.fans/cn/genres/%E9%87%91%E5%8F%91" },
                        { title: "啡发 (76部)", value: "https://missav.fans/cn/genres/%E5%95%A1%E5%8F%91" }
                    ]
                },
                {
                    name: "sort_by",
                    title: "排序",
                    type: "enumeration",
                    description: "排序方式",
                    value: "released_at",
                    enumOptions: [
                        { title: "发行日期", value: "released_at" },
                        { title: "最近更新", value: "published_at" },
                        { title: "收藏数", value: "saved" },
                        { title: "今日浏览数", value: "today_views" },
                        { title: "本周浏览数", value: "weekly_views" },
                        { title: "本月浏览数", value: "monthly_views" },
                        { title: "总浏览数", value: "views" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        },
        {
            title: "特殊题材类",
            description: "特殊题材 - 25个类型，901部影片",
            requiresWebView: false,
            functionName: "loadPage",
            cacheDuration: 3600,
            params: [
                {
                    name: "url",
                    title: "选择类型",
                    type: "enumeration",
                    description: "选择具体类型",
                    enumOptions: [
                        { title: "SF (95部)", value: "https://missav.fans/cn/genres/SF" },
                        { title: "洛丽塔 (83部)", value: "https://missav.fans/cn/genres/%E6%B4%9B%E4%B8%BD%E5%A1%94" },
                        { title: "御宅 (82部)", value: "https://missav.fans/cn/genres/%E5%BE%A1%E5%AE%85" },
                        { title: "魔法少女 (75部)", value: "https://missav.fans/cn/genres/%E9%AD%94%E6%B3%95%E5%B0%91%E5%A5%B3" },
                        { title: "游戏现实版 (39部)", value: "https://missav.fans/cn/genres/%E6%B8%B8%E6%88%8F%E7%8E%B0%E5%AE%9E%E7%89%88" },
                        { title: "3D (38部)", value: "https://missav.fans/dm24/cn/genres/3D" },
                        { title: "AI生成的作品 (37部)", value: "https://missav.fans/cn/genres/AI%E7%94%9F%E6%88%90%E7%9A%84%E4%BD%9C%E5%93%81" },
                        { title: "动漫人物 (35部)", value: "https://missav.fans/cn/genres/%E5%8A%A8%E6%BC%AB%E4%BA%BA%E7%89%A9" },
                        { title: "虚拟现实 (35部)", value: "https://missav.fans/cn/genres/%E8%99%9A%E6%8B%9F%E7%8E%B0%E5%AE%9E" },
                        { title: "动画 (14部)", value: "https://missav.fans/cn/genres/%E5%8A%A8%E7%94%BB" },
                        { title: "偶像 (13部)", value: "https://missav.fans/cn/genres/%E5%81%B6%E5%83%8F" },
                        { title: "透过偶像 (32部)", value: "https://missav.fans/cn/genres/%E9%80%8F%E8%BF%87%E5%81%B6%E5%83%8F" }
                    ]
                },
                {
                    name: "sort_by",
                    title: "排序",
                    type: "enumeration",
                    description: "排序方式",
                    value: "released_at",
                    enumOptions: [
                        { title: "发行日期", value: "released_at" },
                        { title: "最近更新", value: "published_at" },
                        { title: "收藏数", value: "saved" },
                        { title: "今日浏览数", value: "today_views" },
                        { title: "本周浏览数", value: "weekly_views" },
                        { title: "本月浏览数", value: "monthly_views" },
                        { title: "总浏览数", value: "views" }
                    ]
                },
                { name: "page", title: "页码", type: "page", description: "页码", value: "1" }
            ]
        }
    ]
};


async function searchVideos(params = {}) {
    MISSAV_SITE = missavSite((params && params.site === "custom") ? { site: params.custom_site } : params);
    const keyword = params.keyword ? params.keyword.trim() : '';
    const page = parseInt(params.page) || 1;
    const sortBy = params.sort_by;
    
    if (!keyword) {
        return [createPlaceholderItem("请输入搜索关键词")];
    }
    
    const isVideoCode = /^[A-Za-z]+-?\d+$/i.test(keyword);
    
    const encodedKeyword = encodeURIComponent(keyword);
    let url = `https://missav.fans/cn/search/${encodedKeyword}`;
    let hasParams = false;
    
    if (sortBy) {
        url += `?sort=${sortBy}`;
        hasParams = true;
    }
    
    if (page > 1) {
        url += hasParams ? `&page=${page}` : `?page=${page}`;
    }
    
    const searchResults = await fetchVideoList(url);
    
    if (isVideoCode && searchResults.length > 0) {
        const normalizedKeyword = keyword.toUpperCase().replace(/-/g, '');
        const filteredResults = searchResults.filter(video => {
            const videoCode = extractVideoCodeFromTitle(video.title) || extractVideoCodeFromDescription(video.description);
            if (videoCode) {
                const normalizedVideoCode = videoCode.toUpperCase().replace(/-/g, '');
                return normalizedVideoCode === normalizedKeyword;
            }
            return false;
        });
        
        return filteredResults;
    }
    
    return searchResults;
}

async function loadTodayHot(params = {}) {
    MISSAV_SITE = missavSite((params && params.site === "custom") ? { site: params.custom_site } : params);
    const page = parseInt(params.page) || 1;
    
    let url = "https://missav.fans/dm291/cn/today-hot?sort=today_views";
    
    if (page > 1) {
        url += `&page=${page}`;
    }
    
    return await fetchVideoList(url);
}

async function loadWeeklyHot(params = {}) {
    MISSAV_SITE = missavSite((params && params.site === "custom") ? { site: params.custom_site } : params);
    const page = parseInt(params.page) || 1;
    
    let url = "https://missav.fans/dm169/cn/weekly-hot?sort=weekly_views";
    
    if (page > 1) {
        url += `&page=${page}`;
    }
    
    return await fetchVideoList(url);
}

async function loadMonthlyHot(params = {}) {
    MISSAV_SITE = missavSite((params && params.site === "custom") ? { site: params.custom_site } : params);
    const page = parseInt(params.page) || 1;
    
    let url = "https://missav.fans/dm257/cn/monthly-hot?sort=monthly_views";
    
    if (page > 1) {
        url += `&page=${page}`;
    }
    
    return await fetchVideoList(url);
}

async function loadNewRelease(params = {}) {
    MISSAV_SITE = missavSite((params && params.site === "custom") ? { site: params.custom_site } : params);
    const page = parseInt(params.page) || 1;
    
    let url = "https://missav.fans/dm588/cn/release?sort=released_at";
    
    if (page > 1) {
        url += `&page=${page}`;
    }
    
    return await fetchVideoList(url);
}

async function loadChineseSubtitle(params = {}) {
    MISSAV_SITE = missavSite((params && params.site === "custom") ? { site: params.custom_site } : params);
    const page = parseInt(params.page) || 1;
    const sortBy = params.sort_by || "released_at";
    
    let url = "https://missav.fans/dm265/cn/chinese-subtitle";
    let hasParams = false;
    
    if (sortBy) {
        url += `?sort=${sortBy}`;
        hasParams = true;
    }
    
    if (page > 1) {
        url += hasParams ? `&page=${page}` : `?page=${page}`;
    }
    
    return await fetchVideoList(url);
}

async function loadPage(params = {}) {
    MISSAV_SITE = missavSite((params && params.site === "custom") ? { site: params.custom_site } : params);
    const baseUrl = params.url;
    const page = parseInt(params.page) || 1;
    const sortBy = params.sort_by;
    
    let url = baseUrl;
    let hasParams = false;
    
    if (sortBy) {
        url += `?sort=${sortBy}`;
        hasParams = true;
    }
    
    if (page > 1) {
        url += hasParams ? `&page=${page}` : `?page=${page}`;
    }
    
    return await fetchVideoList(url);
}

async function fetchVideoList(url) {
    var order = [MISSAV_SITE];
    for (var m = 0; m < MISSAAV_MIRRORS.length; m++) {
        if (MISSAAV_MIRRORS[m] !== MISSAV_SITE) order.push(MISSAAV_MIRRORS[m]);
    }
    var tried = [];
    for (var i = 0; i < order.length; i++) {
        var base = order[i];
        var target = rehostTo(url, base);
        var saved = MISSAV_SITE;
        MISSAV_SITE = base;
        try {
            var response = await Widget.http.get(target, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                    "Cache-Control": "no-cache",
                    "Referer": base + "/"
                },
                allow_redirects: true
            });
            var status = Number((response && (response.status || response.statusCode)) || 200);
            var body = response && (typeof response.data === "string" ? response.data : response.body) || "";
            if (status >= 400 || !body || body.length < 10000 || body.indexOf("Just a moment") >= 0) {
                tried.push(base.replace(/^https?:\/\//, "") + " HTTP " + status);
                continue;
            }
            var parsed = parseVideoList(body);
            if (parsed && parsed.length && parsed[0].type !== "placeholder") return parsed;
            tried.push(base.replace(/^https?:\/\//, "") + " 无内容");
        } catch (error) {
            tried.push(base.replace(/^https?:\/\//, "") + " 请求失败");
        } finally {
            MISSAV_SITE = saved;
        }
    }
    return [createPlaceholderItem("三个镜像都没取到内容（" + tried.join(" / ") + "）：多半是节点被 Cloudflare 拦，换节点或在参数里把站点域名切到 missav.ws")];
}

function createPlaceholderItem(message = "已被风控，请稍后重试") {
    return {
        id: "content-placeholder",
        type: "placeholder",
        title: "🚫 " + message,
        backdropPath: "https://via.placeholder.com/400x225/FF6B6B/FFFFFF?text=%E5%B7%B2%E8%A2%AB%E9%A3%8E%E6%8E%A7",
        mediaType: "placeholder",
        duration: 0,
        durationText: "⚠️ 访问受限",
        previewUrl: "",
        videoUrl: "",
        link: "",
        description: "🔒 " + message + "\n\n💡 可能的解决方案：\n• 等待一段时间后重新尝试\n• 检查网络连接\n• 更换网络环境\n• 稍后再试",
        playerType: "none"
    };
}

function parseVideoList(html) {
    const $ = Widget.html.load(html);
    const videos = [];
    
    $('a[href]').each((index, element) => {
        const $link = $(element);
        const href = $link.attr('href') || '';
        const $img = $link.find('img').first();
        
        if ($img.length && href.match(/\/cn\/[a-zA-Z0-9\-]+(-uncensored-leak)?$/)) {
            const imgSrc = $img.attr('data-src') || $img.attr('src');
            
            if (imgSrc) {
                let title = $link.attr('title') || $img.attr('alt') || '';
                
                if (!title) {
                    const $parent = $link.closest('div');
                    title = $parent.find('h1, h2, h3, .title, [class*="title"]').first().text().trim();
                }
                
                if (!title) {
                    title = $link.text().trim();
                }
                
                const videoId = extractVideoId(href);
                const fullVideoUrl = missavRehost(href.startsWith('http') ? href : `https://missav.fans${href}`);
                const horizontalCoverUrl = `https://fourhoi.mrstcdn.store/${videoId}/cover-t.jpg`;
                let videoCode = videoId.toUpperCase().replace('-CHINESE-SUBTITLE', '').replace('-UNCENSORED-LEAK', '');
                
                if (title && !title.match(/[A-Z]+-\d+/)) {
                    title = `${videoCode} ${title}`;
                } else if (!title) {
                    title = videoCode;
                }
                
                videos.push({
                    id: fullVideoUrl,
                    type: "url",
                    title: title || `${videoCode}`,
                    backdropPath: horizontalCoverUrl,
                    mediaType: "movie",
                    duration: 0,
                    durationText: "",
                    previewUrl: "",
                    videoUrl: "",
                    link: fullVideoUrl,
                    description: `番号: ${videoCode}`,
                    playerType: "system"
                });
            }
        }
    });
    
    if (videos.length === 0) {
        return [createPlaceholderItem()];
    }
    
    return videos;
}

function extractVideoId(url) {
    const matches = url.match(/\/cn\/([a-zA-Z0-9\-]+)(-uncensored-leak)?$/);
    return matches ? matches[1] : url.split('/').pop();
}

function extractVideoCodeFromTitle(title) {
    if (!title) return null;
    const match = title.match(/^([A-Za-z]+-?\d+)/i);
    return match ? match[1] : null;
}

function extractVideoCodeFromDescription(description) {
    if (!description) return null;
    const match = description.match(/番号:\s*([A-Za-z]+-?\d+)/i);
    return match ? match[1] : null;
}

function normalizePlayableM3u8(url) {
    if (!url) return "";
    let clean = url.replace(/\\+/g, "").replace(/['"]/g, "");
    // Prefer 720p media playlist (video+AAC muxed). Master playlist often plays muted in system player.
    clean = clean.replace(/\/playlist\.m3u8(\?.*)?$/i, "/720p/video.m3u8$1");
    clean = clean.replace(/\/(?:360p|480p|1080p)\/video\.m3u8/i, "/720p/video.m3u8");
    return clean;
}

function extractM3u8FromHtml(html) {
    if (!html) return "";

    const playlistMatches = html.match(/https?:\/\/(?:surrit(?:\.mrstcdn)?\.(?:com|store)|[^"'\\\s]*surrit[^"'\\\s]*)\/[a-f0-9\-]+\/[^"'\\\s]*playlist\.m3u8/gi);
    if (playlistMatches && playlistMatches.length > 0) {
        return normalizePlayableM3u8(playlistMatches[0]);
    }

    const anySurrit = html.match(/https?:\/\/[^"'\\\s]*surrit[^"'\\\s]*\/[a-f0-9\-]+\/[^"'\\\s]*\.m3u8/gi);
    if (anySurrit && anySurrit.length > 0) {
        return normalizePlayableM3u8(anySurrit[0]);
    }

    const uuidMatches = html.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g);
    if (uuidMatches && uuidMatches.length > 0) {
        return `https://surrit.mrstcdn.store/${uuidMatches[0]}/720p/video.m3u8`;
    }

    return "";
}

function buildStreamHeaders(pageLink) {
    return {
        "Referer": pageLink || "https://missav.fans/",
        "Origin": "https://missav.fans",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
        "Accept": "*/*"
    };
}

/** 女优页 -> 她的影片列表（枚举参数选定后直接出片） */
async function loadActressVideos(params = {}) {
    MISSAV_SITE = missavSite((params && params.site === "custom") ? { site: params.custom_site } : params);
    const entry = actressByName(params && params.actress) || MISSAAV_ACTRESSES[0];
    if (!entry) return [createPlaceholderItem("请选择一位女优")];
    const page = parseInt(params.page) || 1;
    let url = MISSAV_SITE + entry.href;
    if (page > 1) url += (url.indexOf("?") >= 0 ? "&" : "?") + "page=" + page;
    return await fetchVideoList(url);
}

async function loadDetail(link) {
    try {
        var hostMatch = /^https?:\/\/([^/?#]+)/i.exec(String(link || ""));
        if (hostMatch) MISSAV_SITE = "https://" + hostMatch[1].toLowerCase().replace(/^www\./, "");
        const response = await Widget.http.get(link, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Accept-Encoding": "gzip, deflate, br",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1",
                "DNT": "1",
                "Referer": "https://missav.fans/",
                "Connection": "keep-alive"
            },
            allow_redirects: true
        });

        const videoId = extractVideoId(link);
        const videoCode = videoId.toUpperCase().replace('-CHINESE-SUBTITLE', '').replace('-UNCENSORED-LEAK', '');

        if (!response || !response.data || response.data.includes('Just a moment') || response.data.length < 50000) {
            return {
                id: link,
                type: "detail",
                videoUrl: link,
                title: `${videoCode}`,
                description: `番号: ${videoCode}`,
                posterPath: "",
                backdropPath: `https://fourhoi.mrstcdn.store/${videoId}/cover-t.jpg`,
                mediaType: "movie",
                duration: 0,
                durationText: "",
                previewUrl: "",
                playerType: "system",
                link: link
            };
        }

        const $ = Widget.html.load(response.data);
        
        let title = $('meta[property="og:title"]').attr('content') || '';
        if (!title) {
            title = $('h1').first().text().trim();
        }
        if (!title) {
            title = $('title').text().replace(/\s*-\s*MissAV.*$/i, '').trim();
        }
        
        let videoUrl = extractM3u8FromHtml(response.data);

        if (!videoUrl) {
            $('script').each((index, element) => {
                const scriptContent = $(element).html() || "";
                const found = extractM3u8FromHtml(scriptContent);
                if (found) {
                    videoUrl = found;
                    return false;
                }
            });
        }
        
        const headers = buildStreamHeaders(link);
        const playUrl = videoUrl || link;
        const useAppPlayer = !!videoUrl;
        return {
            id: link,
            type: "detail",
            videoUrl: playUrl,
            title: title || `${videoCode}`,
            description: `番号: ${videoCode}`,
            posterPath: "",
            backdropPath: `https://fourhoi.mrstcdn.store/${videoId}/cover-t.jpg`,
            mediaType: "movie",
            duration: 0,
            durationText: "",
            previewUrl: "",
            playerType: useAppPlayer ? "app" : "system",
            muted: false,
            volume: 1,
            link: link,
            customHeaders: headers,
            headers: headers
        };
        
    } catch (error) {
        const videoId = extractVideoId(link);
        const videoCode = videoId.toUpperCase().replace('-CHINESE-SUBTITLE', '').replace('-UNCENSORED-LEAK', '');
        
        return {
            id: link,
            type: "detail",
            videoUrl: link,
            title: `${videoCode}`,
            description: `番号: ${videoCode}`,
            posterPath: "",
            backdropPath: `https://fourhoi.mrstcdn.store/${videoId}/cover-t.jpg`,
            mediaType: "movie",
            duration: 0,
            durationText: "",
            previewUrl: "",
            playerType: "system",
            link: link
        };
    }
}
async function search(params){ return searchVideos(params || {}); }
