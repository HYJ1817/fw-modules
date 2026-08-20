/**
 * HStream Playback Source for Forward
 * -----------------------------------
 * 独立播放源：根据 Forward 传入的标题、集数或 hstream: link
 * 返回 HStream 720p MP4 多 CDN 线路。
 */
WidgetMetadata = {
  id: "hyj1817.hstream.resource",
  title: "HStream 播放源",
  icon: "https://hstream.moe/favicon.ico",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "为 Forward 提供 HStream 720p MP4 多线路",
  author: "hstream",
  site: "https://hstream.moe",
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
  ],
  modules: [
    {
      id: "loadResource",
      title: "加载资源",
      functionName: "loadResource",
      type: "stream",
      cacheDuration: 0,
      params: [],
    },
  ],
};

var BASE = "https://hstream.moe";
var UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
var _cookie = null;

function normalizeSlug(value) {
  return String(value || "")
    .replace(/^hstream%3A/i, "")
    .replace(/^hstream:/i, "");
}

function comparableTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function titleCase(slug) {
  return String(slug || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, function (character) {
      return character.toUpperCase();
    });
}

function extractEpisodeLinks(html) {
  var links = [];
  var seen = {};
  var pattern = /href="(?:https:\/\/hstream\.moe)?\/hentai\/([a-z0-9][a-z0-9-]*?)-(\d+)(?:[?"#]|$)/g;
  var match;
  while ((match = pattern.exec(String(html || "")))) {
    var slug = match[1];
    var episode = parseInt(match[2], 10);
    var key = slug + "-" + episode;
    if (seen[key]) continue;
    seen[key] = true;
    links.push({ slug: slug, episode: episode, key: key });
  }
  return links;
}

function extractCookie(response) {
  if (!response) return null;
  var raw = null;
  var headers = response.headers;

  if (headers && typeof headers.get === "function") {
    raw = headers.get("set-cookie") || headers.get("Set-Cookie");
  } else if (headers && typeof headers === "object") {
    raw = headers["set-cookie"] || headers["Set-Cookie"] || headers.setCookie;
  }
  if (!raw) raw = response.setCookie || response.cookies || response.cookie;

  if (Array.isArray(raw)) {
    return raw
      .map(function (cookie) { return String(cookie).split(";")[0]; })
      .filter(Boolean)
      .join("; ");
  }
  if (typeof raw === "string") {
    return raw
      .split(/,(?=[^;,]+=)/)
      .map(function (cookie) { return cookie.split(";")[0].trim(); })
      .filter(Boolean)
      .join("; ");
  }
  return null;
}

async function getHTML(url, referer) {
  var headers = {
    "User-Agent": UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };
  if (referer) headers.Referer = referer;
  var response = await Widget.http.get(url, {
    headers: headers,
    timeout: 15000,
  });
  var html = response && response.data;
  if (typeof html !== "string" || !html.length) {
    throw new Error("HTML 获取失败: " + url);
  }
  var cookie = extractCookie(response);
  if (cookie) _cookie = cookie;
  return html;
}

function getToken(html) {
  var match =
    String(html || "").match(/name="_token"\s+value="([^"]+)"/) ||
    String(html || "").match(/<meta name="csrf-token"\s+content="([^"]+)"/);
  return match ? match[1] : null;
}

function getEpisodeId(html) {
  var match = String(html || "").match(/id="e_id"[^>]*value="(\d+)"/);
  return match ? match[1] : null;
}

async function searchSeries(seriesName) {
  var html = await getHTML(BASE + "/search?search=" + encodeURIComponent(seriesName));
  var links = extractEpisodeLinks(html);
  var series = [];
  var seen = {};
  for (var i = 0; i < links.length; i++) {
    if (seen[links[i].slug]) continue;
    seen[links[i].slug] = true;
    series.push({ slug: links[i].slug, title: titleCase(links[i].slug) });
  }
  return series;
}

async function resolveEpisodeSlug(params) {
  params = params || {};
  var candidates = [params.link, params.id];
  var raw = "";
  for (var i = 0; i < candidates.length; i++) {
    var candidate = String(candidates[i] || "");
    if (/^hstream(?::|%3A)/i.test(candidate)) {
      raw = normalizeSlug(candidate);
      break;
    }
  }
  if (raw && /-\d+$/.test(raw)) return raw;

  var episode = parseInt(params.episode, 10) || 1;
  if (raw) return raw + "-" + episode;

  var seriesName = String(params.seriesName || "").trim();
  if (!seriesName) return "";
  var wanted = comparableTitle(seriesName);
  var matches = await searchSeries(seriesName);
  for (var j = 0; j < matches.length; j++) {
    if (comparableTitle(matches[j].title) === wanted) {
      return matches[j].slug + "-" + episode;
    }
  }
  return "";
}

async function fetchEpisodeInfo(episodeSlug) {
  _cookie = null;
  var html = await getHTML(BASE + "/hentai/" + episodeSlug);
  var episodeId = getEpisodeId(html);
  var token = getToken(html);
  if (!episodeId) throw new Error("未找到 episode id: " + episodeSlug);
  if (!token) throw new Error("未找到 CSRF token: " + episodeSlug);
  return { eid: episodeId, token: token };
}

function responseData(response) {
  var data = response && response.data;
  if (typeof data === "string") {
    try { return JSON.parse(data); } catch (error) { return null; }
  }
  return data || null;
}

async function postOnce(episodeSlug, episodeInfo) {
  var headers = {
    "User-Agent": UA,
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "X-CSRF-TOKEN": episodeInfo.token,
    Referer: BASE + "/hentai/" + episodeSlug,
  };
  if (_cookie) headers.Cookie = _cookie;
  return Widget.http.post(
    BASE + "/player/api",
    { episode_id: Number(episodeInfo.eid) },
    { headers: headers, timeout: 15000 }
  );
}

async function postPlayerApi(episodeSlug, episodeInfo) {
  var response = await postOnce(episodeSlug, episodeInfo);
  var data = responseData(response);
  if (data && data.stream_url) return data;

  console.log("HStream player/api 会话失效，刷新后重试");
  var refreshed = await fetchEpisodeInfo(episodeSlug);
  var retried = responseData(await postOnce(episodeSlug, refreshed));
  if (!retried || !retried.stream_url) {
    throw new Error("player/api 未返回 stream_url");
  }
  return retried;
}

async function playerApi(episodeSlug) {
  var episodeInfo = await fetchEpisodeInfo(episodeSlug);
  return postPlayerApi(episodeSlug, episodeInfo);
}

async function loadResource(params) {
  params = params || {};
  if (params.multiSource === "disabled") return [];

  try {
    var episodeSlug = await resolveEpisodeSlug(params);
    if (!episodeSlug) return [];
    var data = await playerApi(episodeSlug);
    var resources = [];
    var seen = {};

    function add(domain, suffix) {
      if (!domain || seen[domain]) return;
      seen[domain] = true;
      var host = String(domain).replace(/^https?:\/\//, "").split(".")[0];
      resources.push({
        name: "HStream 720p · " + host + (suffix ? " · " + suffix : ""),
        description: "720p MP4 · English subtitles",
        url: domain + "/" + data.stream_url + "/x264.720p.mp4",
        customHeaders: {
          "User-Agent": UA,
          Referer: BASE + "/hentai/" + episodeSlug,
        },
        playerType: "app",
      });
    }

    var normalDomains = data.stream_domains || [];
    for (var i = 0; i < normalDomains.length; i++) {
      add(normalDomains[i], i === 0 ? "" : "备用");
    }
    var asiaDomains = data.asia_stream_domains || [];
    for (var j = 0; j < asiaDomains.length; j++) add(asiaDomains[j], "亚洲");
    return resources;
  } catch (error) {
    console.log("HStream resource failed: " + (error && error.message));
    return [];
  }
}
