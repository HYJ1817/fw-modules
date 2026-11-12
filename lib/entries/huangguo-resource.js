/* 黄果短剧 · 播放源入口层
 * 本文件不单独使用，由 scripts/build-huangguo.js 与 lib/huangguo.js 拼接后
 * 生成 widgets/huangguo-resource.js。修改请改这里，不要改生成物。
 */

WidgetMetadata = {
  id: "hyj1817.huangguo.resource",
  title: "黄果短剧 播放源",
  icon: "https://huangguoai.com/apple-touch-icon.png",
  version: "1.0.0",
  requiredVersion: "0.0.2",
  description: "黄果短剧 HLS/MP4 播放线路；默认线路与 HEVC 线路，播放前校验 CDN 鉴权头",
  author: "HYJ1817",
  site: "https://huangguoai.com",
  globalParams: [
    {
      name: "multiSource",
      title: "是否启用聚合搜索",
      type: "enumeration",
      value: "enabled",
      enumOptions: [
        { title: "启用", value: "enabled" },
        { title: "禁用", value: "disabled" },
      ],
    },
    {
      name: "mode",
      title: "站点线路",
      type: "enumeration",
      value: "main",
      enumOptions: [
        { title: "主站 huangguoai.com", value: "main" },
        { title: "备用站 huangguoai.ai", value: "ai" },
        { title: "自定义地址", value: "custom" },
      ],
    },
    {
      name: "site",
      title: "自定义站点地址",
      type: "input",
      description: "线路选「自定义地址」时生效，形如 https://huangguoai.com",
    },
    {
      name: "cookie",
      title: "访问 Cookie（可选）",
      type: "input",
      description: "只填写自己的登录 Cookie；不填则按匿名访客访问",
    },
    {
      name: "probing",
      title: "播放前校验线路",
      type: "enumeration",
      value: "on",
      enumOptions: [
        { title: "开启（推荐，坏线路直接剔除）", value: "on" },
        { title: "关闭（更快，但可能返回死链）", value: "off" },
      ],
    },
  ],
  modules: [
    {
      id: "loadResource",
      title: "加载资源",
      description: "黄果短剧 HLS/MP4 播放线路",
      functionName: "loadResource",
      type: "stream",
      cacheDuration: 0,
      params: [],
    },
  ],
};

function hgNormalizeTitle(value) {
  return hgText(value, 200).toLowerCase()
    .replace(/[：:·・—_\-–（）()\[\]【】《》\s]/g, "")
    .replace(/第0*(\d+)季/g, "第$1季");
}

async function hgFindIdByTitle(ctx, title) {
  var wanted = hgNormalizeTitle(title);
  if (!wanted) return "";
  var value = await hgEncrypted(ctx, "dynamic", {
    method: "GET",
    path: hgQuery("/api/search", { q: title, type: "video", page: 1, size: 30 }),
    body: "",
    content_type: "",
  });
  var rows = hgItems(value), best = "", bestScore = 0;
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i] || {};
    var id = String(row.id || row.video_id || "");
    if (!/^[1-9]\d{0,18}$/.test(id)) continue;
    var current = hgNormalizeTitle(row.title || row.name);
    if (!current) continue;
    var score = 0;
    if (current === wanted) score = 100;
    else if (current.indexOf(wanted) >= 0 || wanted.indexOf(current) >= 0) score = 60;
    else if (current.replace(/第\d+季/g, "") === wanted.replace(/第\d+季/g, "")) score = 80;
    if (score > bestScore) { best = id; bestScore = score; }
  }
  return bestScore >= 60 ? best : "";
}

async function hgResolveStreams(ctx, params, probing) {
  var parsed = hgParseLink(params.link || params.url || params.id);
  var id = parsed && parsed.id ? parsed.id : "";
  var ep = (parsed && parsed.ep) || parseInt(params.episode, 10) || 1;
  if (!id) {
    var title = hgText(params.seriesName || params.title || params.name, 200);
    if (!title) return [];
    id = await hgFindIdByTitle(ctx, title);
    if (!id) return [];
  }
  var streams = await hgPlayback(ctx, id, ep);
  var output = [];
  for (var i = 0; i < streams.length; i++) {
    var stream = streams[i];
    var name = "黄果短剧 · " + stream.name + (stream.mime === "application/vnd.apple.mpegurl" ? " · HLS" : stream.mime === "video/mp4" ? " · MP4" : "");
    var headers = hgHeadersFor(stream, false);
    var verified = false;
    if (probing) {
      if (hgWantsAuth(stream)) {
        var withAuth = hgHeadersFor(stream, true);
        if (await hgProbe(stream.url, withAuth)) { headers = withAuth; verified = true; }
        else if (await hgProbe(stream.url, headers)) verified = true;
      } else if (await hgProbe(stream.url, headers)) {
        verified = true;
      }
      if (!verified) {
        // 两条判据都不成立：多为 CDN 拦截探测请求。保留线路但标注未校验。
        hgLog("线路未通过校验，仍返回：" + stream.name);
      }
    }
    output.push({
      name: name + (probing && !verified ? "（未校验）" : ""),
      description: stream.mime === "application/vnd.apple.mpegurl" ? "HLS" : "视频",
      url: stream.url,
      customHeaders: headers,
      playerType: "app",
    });
  }
  return output;
}

async function loadResource(params) {
  params = params || {};
  if (params.multiSource === "disabled") return [];
  var ctx = hgCtx(params);
  var probing = String(params.probing || "on") !== "off";
  try {
    return await hgResolveStreams(ctx, params, probing);
  } catch (error) {
    hgLog("解析失败 - " + error.message);
    return [];
  }
}
