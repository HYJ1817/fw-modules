const DEFAULT_SITE = "https://supjav.blog";
const BACKUP_SITE = "https://supjav.com";
const DEFAULT_EMBED_API = "https://lk1.supremejav.com/supjav.php";
const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

let listSnapshot = null;
let siteProfileSnapshot = null;

WeBox.define({
  api: "1.1",
  id: "blog.supjav.webox",
  name: "SupJAV",
  version: "1.0.2",
  requires: ["html", "crypto"],
  cache: { list: 180, detail: 60, filters: 3600 },

  settings: {
    fields: [
      {
        key: "mode",
        label: "站点域名",
        type: "select",
        default: "blog",
        options: [
          { label: "默认站点 (supjav.blog)", value: "blog" },
          { label: "主站镜像 (supjav.com)", value: "com" },
          { label: "手动输入地址", value: "custom" }
        ]
      },
      {
        key: "site",
        label: "自定义站点地址",
        type: "url",
        required: true,
        placeholder: "https://supjav.blog",
        showWhen: { key: "mode", equals: "custom" }
      },
      {
        key: "lang",
        label: "站点语言目录",
        type: "select",
        default: "zh",
        options: [
          { label: "中文 (/zh)", value: "zh" },
          { label: "英文 (/)", value: "en" },
          { label: "日文 (/ja)", value: "ja" }
        ]
      },
      {
        key: "cookie",
        label: "访问 Cookie（可选，用于通过站点防火墙验证）",
        type: "secret",
        maxLength: 8192,
        placeholder: "填入浏览器访问站点后的 cf_clearance 等 Cookie"
      },
      {
        key: "timeout",
        label: "请求超时秒数",
        type: "number",
        default: 18,
        min: 5,
        max: 45,
        step: 1
      }
    ]
  },

  async filters(ctx) {
    const profile = await getSiteProfile(ctx);
    return [{ key: "category", label: "分类栏目", type: "select", default: "latest",
      options: profile.routes.map(route => ({ label: route.title, value: route.value })) }];
  },

  async list(ctx, req) {
    const page = parsePageCursor(ctx, req.cursor);
    const profile = await getSiteProfile(ctx, req.refresh);
    const selected = String(req.filters?.category || "latest");
    const route = profile.routes.find(route => route.value === selected);
    if (!route) ctx.fail("UNSUPPORTED", "当前站点没有这个分类，请重新读取分类并选择已有栏目");
    const ttlMs = ctx.cache.seconds(180) * 1000;
    // Cookie/configuration changes must not reuse another session's listing.
    const cacheKey = JSON.stringify([ctx.settings, route.url, page]);
    if (!req.refresh && ttlMs > 0 && listSnapshot?.key === cacheKey &&
        listSnapshot.generation === ctx.cache.generation && Date.now() - listSnapshot.savedAt < ttlMs) {
      return listSnapshot.value;
    }
    const query = {};
    let url = route.url;
    if (profile.paging === "query") { if (page > 1) query.page = String(page); }
    else if (page > 1) url = ctx.url.resolve(urlPath(ctx, url).replace(/\/$/, "") + `/page/${page}/`, profile.origin);
    const initialHome = profile.home;
    profile.home = null;
    const res = page === 1 && route.value === "latest" && initialHome && Date.now() - profile.homeAt < 180000
      ? initialHome : await fetchPage(ctx, url, query);
    const parsed = parseSupjavCards(ctx, res.data, profile.origin, res.url, page);
    assertListingRoute(ctx, res, route.url, page);
    assertListingShape(ctx, res.data, parsed);
    const result = { items: parsed.items, nextCursor: parsed.hasNext && parsed.items.length ? String(page + 1) : null };
    if (ttlMs > 0) listSnapshot = { key: cacheKey, generation: ctx.cache.generation, savedAt: Date.now(), value: result };
    return result;
  },

  async search(ctx, req) {
    const keyword = String(req.query || "").trim();
    if (!keyword) return { items: [], nextCursor: null };
    if (keyword.length > 200) ctx.fail("CONFIG_REQUIRED", "搜索词长度不能超过 200 个字符");
    const page = parsePageCursor(ctx, req.cursor);
    const profile = await getSiteProfile(ctx, req.refresh);
    if (!profile.search) ctx.fail("UNSUPPORTED", "当前站点没有声明可用的搜索入口");
    const query = { [profile.search.key]: keyword };
    let url = profile.search.url;
    if (profile.paging === "query") { if (page > 1) query.page = String(page); }
    else if (page > 1) url = ctx.url.resolve(urlPath(ctx, url).replace(/\/$/, "") + `/page/${page}/`, profile.origin);
    const res = await fetchPage(ctx, url, query);
    const parsed = parseSupjavCards(ctx, res.data, profile.origin, res.url, page);
    assertListingRoute(ctx, res, profile.search.url, page);
    assertListingShape(ctx, res.data, parsed);
    return { items: parsed.items, nextCursor: parsed.hasNext && parsed.items.length ? String(page + 1) : null };
  },

  async detail(ctx, req) {
    const contentId = validateContentId(ctx, req.id);
    const baseSite = resolveBaseSite(ctx);
    const detailUrl = ctx.url.resolve(contentId, baseSite);

    const res = await fetchPage(ctx, detailUrl);
    ctx.signal.throwIfAborted();

    const html = res.data;
    const $ = ctx.html.load(html);

    const title = extractDetailTitle($);
    const poster = extractDetailPoster(ctx, $, res.url || detailUrl);
    const summary = extractDetailSummary($);
    const groups = extractDetailGroups(ctx, $, html, contentId, res.url || detailUrl);

    // 遵循 WeBox 规范：movie 每个分组最多 1 集；若任一分组有多集（如 CD1/CD2）则设为 series
    const hasMultiEpisodes = groups.some(
      g => Array.isArray(g.episodes) && g.episodes.length > 1
    );
    const kind = hasMultiEpisodes ? "series" : "movie";

    const result = {
      id: req.id,
      kind,
      groups
    };
    if (title) result.title = title.slice(0, 240);
    if (poster) result.poster = poster;
    if (summary) result.summary = summary.slice(0, 65536);

    return result;
  },

  async play(ctx, req) {
    validateContentId(ctx, req.contentId);
    const groupId = String(req.groupId || "").trim();
    const episodeId = String(req.episodeId || "").trim();
    if (!groupId || !episodeId) {
      ctx.fail("NOT_FOUND", "选集参数无效，请重新打开详情");
    }

    const baseSite = resolveBaseSite(ctx);
    const detailUrl = ctx.url.resolve(req.contentId, baseSite);

    if (episodeId.startsWith("server-slot:")) {
      const slot = parseServerSlot(ctx, episodeId);
      const res = await fetchPage(ctx, detailUrl);
      const $ = ctx.html.load(res.data);
      const servers = collectServerTokens($);
      const token = servers.get(slot.server)?.[slot.index];
      if (!token) ctx.fail("NOT_FOUND", "该线路已变化，请重新读取详情");
      const api = detectSupjavEmbedApi(res.data);
      const sources = await resolveSupjavDataLink(ctx,
        `datalink:${encodeURIComponent(token)}:${encodeURIComponent(api)}`, res.url || detailUrl, groupId);
      if (!sources.length) ctx.fail("NOT_FOUND", "当前线路没有提供可识别的播放地址");
      return { sources };
    }

    // 情况 1：episodeId 本身已是媒体直链
    if (looksLikeDirectMedia(episodeId)) {
      return {
        sources: [buildMediaSource("direct-1", "直连线路", episodeId, detailUrl)]
      };
    }

    // 情况 2：Supjav data-link 动态令牌格式 (datalink:{token}:{embedApiUrl})
    if (episodeId.startsWith("datalink:")) {
      const sources = await resolveSupjavDataLink(
        ctx,
        episodeId,
        detailUrl,
        groupId
      );
      if (sources.length === 0) {
        ctx.fail(
          "NOT_FOUND",
          "该服务器线路未能解析出有效视频源，请尝试切换其他线路（如 TV / ST / VOE）"
        );
      }
      return { sources };
    }

    // 情况 3：常规播放路径或外部嵌入页地址
    let targetUrl = ctx.url.resolve(episodeId, baseSite);
    if (req.refresh && groupId.startsWith("iframe-")) {
      const fresh = await fetchPage(ctx, detailUrl);
      const group = extractDetailGroups(ctx, ctx.html.load(fresh.data), fresh.data, req.contentId, fresh.url || detailUrl)
        .find(group => group.id === groupId);
      if (!group?.episodes?.length) ctx.fail("NOT_FOUND", "播放器线路已变化，请重新读取详情");
      targetUrl = ctx.url.resolve(group.episodes[0].id, baseSite);
    }
    const res = await fetchPage(ctx, targetUrl, null, { Referer: detailUrl });
    ctx.signal.throwIfAborted();

    const sources = await extractSourcesFromPage(
      ctx,
      res.data,
      res.url || targetUrl,
      detailUrl,
      groupId
    );

    if (sources.length === 0) {
      ctx.fail(
        "NOT_FOUND",
        "未能从当前线路提取到可播放的视频流，请尝试切换其他服务器线路"
      );
    }

    return { sources };
  }
});

/* ======================== 站点配置与网络请求工具 ======================== */

function resolveBaseSite(ctx) {
  const mode = ctx.settings?.mode || "blog";
  if (mode === "custom") {
    const custom = String(ctx.settings?.site || "").trim();
    if (!custom || !/^https?:\/\//i.test(custom)) {
      ctx.fail("CONFIG_REQUIRED", "请填写有效的自定义站点地址", {
        fields: ["site"]
      });
    }
    return custom.replace(/\/+$/, "");
  }
  if (mode === "com") return BACKUP_SITE;
  return DEFAULT_SITE;
}

function getTimeoutMs(ctx) {
  const sec = Number(ctx.settings?.timeout || 18);
  const clamped = Number.isFinite(sec) ? Math.min(Math.max(sec, 5), 45) : 18;
  return clamped * 1000;
}

async function fetchPage(ctx, url, query, extraHeaders) {
  ctx.signal.throwIfAborted();
  const baseSite = resolveBaseSite(ctx);
  const baseOrigin = ctx.url.origin(baseSite);
  const targetOrigin = ctx.url.origin(url);

  const headers = Object.assign(
    {
      "User-Agent": DEFAULT_UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: baseOrigin + "/"
    },
    extraHeaders || {}
  );

  const userCookie = String(ctx.settings?.cookie || "").trim();
  if (userCookie && targetOrigin === baseOrigin) {
    headers["Cookie"] = userCookie.replace(/[\r\n]+/g, "; ");
  }

  const options = {
    headers,
    responseType: "text",
    timeoutMs: getTimeoutMs(ctx)
  };
  if (query && Object.keys(query).length > 0) {
    options.query = query;
  }

  let response;
  try {
    response = await ctx.http.get(url, options);
  } catch (err) {
    ctx.signal.throwIfAborted();
    ctx.fail(/timeout|timed out/i.test(String(err?.message)) ? "TIMEOUT" : "NETWORK",
      "网络请求失败，请检查网络连接或切换站点域名");
  }

  const text = String(response.data || "");
  // Challenge pages can also use HTTP 200; never cache them as an empty directory.
  if (/Just a moment|cf-browser-verification|_cf_chl_opt|cf-chl-|challenge-platform/i.test(text)) {
    ctx.fail("AUTH_REQUIRED", "站点要求访问验证，请使用正常授权会话或稍后重试", { fields: ["cookie"], httpStatus: response.status });
  }
  if (response.status === 429) {
    ctx.fail("RATE_LIMITED", "请求过于频繁，请稍后重试", {
      retryAfterSeconds: Math.min(3600, Math.max(1, Number(response.headers?.["retry-after"]) || 15)), httpStatus: 429
    });
  }
  if (response.status === 404) {
    ctx.fail("NOT_FOUND", "请求的页面不存在");
  }
  if (response.status === 403 || response.status === 503) {
    const body = String(response.data || "");
    if (
      body.includes("Just a moment...") ||
      body.includes("cf-browser-verification") ||
      body.includes("_cf_chl_opt")
    ) {
      ctx.fail(
        "AUTH_REQUIRED",
        "站点触发 Cloudflare 验证，请在源设置中填入浏览器 Cookie 或切换站点域名",
        { fields: ["cookie"] }
      );
    }
    ctx.fail("NETWORK", `站点拒绝访问 (HTTP ${response.status})`);
  }
  if (response.status < 200 || response.status >= 300) {
    ctx.fail("NETWORK", `请求失败 (HTTP ${response.status})`);
  }

  if (!text.trim()) {
    ctx.fail("INVALID_RESPONSE", "站点返回空白内容");
  }
  return {
    status: response.status,
    headers: response.headers || {},
    url: response.url || url,
    data: text
  };
}

function parsePageCursor(ctx, cursor) {
  if (cursor === null) return 1;
  if (typeof cursor !== "string" || !/^[1-9][0-9]*$/.test(cursor)) {
    ctx.fail("INVALID_RESPONSE", "分页游标无效");
  }
  const page = Number(cursor);
  if (!Number.isSafeInteger(page) || page < 1 || page > 50000) {
    ctx.fail("INVALID_RESPONSE", "分页游标超出范围");
  }
  return page;
}

function validateContentId(ctx, id) {
  const clean = String(id || "").trim();
  if (!clean || clean.length > 1024) {
    ctx.fail("NOT_FOUND", "内容标识无效");
  }
  return clean;
}

/* ======================== 列表路由构建与卡片解析 ======================== */

function urlPath(ctx, raw) {
  const abs = ctx.url.resolve(raw, resolveBaseSite(ctx));
  return abs.slice(ctx.url.origin(abs).length).split(/[?#]/)[0] || "/";
}

function queryValue(raw, key) {
  const query = String(raw).split("?")[1]?.split("#")[0] || "";
  for (const part of query.split("&")) {
    const at = part.indexOf("=");
    try {
      if (decodeURIComponent(at < 0 ? part : part.slice(0, at)) === key)
        return decodeURIComponent((at < 0 ? "" : part.slice(at + 1)).replace(/\+/g, " "));
    } catch (_) {}
  }
  return "";
}

async function getSiteProfile(ctx, refresh = false) {
  const key = JSON.stringify(ctx.settings);
  const ttl = ctx.cache.seconds(3600) * 1000;
  if (!refresh && ttl > 0 && siteProfileSnapshot?.key === key &&
      siteProfileSnapshot.generation === ctx.cache.generation && Date.now() - siteProfileSnapshot.savedAt < ttl) {
    return siteProfileSnapshot.value;
  }
  const base = resolveBaseSite(ctx), lang = String(ctx.settings?.lang || "zh");
  const homeUrl = ctx.url.resolve(lang === "en" ? "/" : `/${lang}/`, base);
  const home = await fetchPage(ctx, homeUrl);
  const $ = ctx.html.load(home.data), origin = ctx.url.origin(home.url);
  const canonical = normalizeHttpUrl(ctx, $("link[rel='canonical']").attr("href"), home.url);
  const landing = canonical && ctx.url.origin(canonical) === origin && !isSupjavContentPath(urlPath(ctx, canonical))
    ? canonical : home.url.split(/[?#]/)[0];
  const routes = [{ value: "latest", title: "最新发布", url: landing }];
  const aliases = [
    ["category/chinese-subtitles", "中文字幕", ["chinese", "category/chinese-subtitles"]],
    ["category/censored-jav", "有码 JAV", ["censored", "category/censored-jav"]],
    ["category/uncensored-jav", "无码 JAV", ["uncensored", "category/uncensored-jav"]],
    ["category/reducing-mosaic", "流出无码", ["uncensored-leaked", "category/reducing-mosaic"]],
    ["category/amateur", "素人精选", ["amateur", "category/amateur"]],
    ["category/fc2", "FC2 专区", ["fc2", "category/fc2"]],
    ["category/english-subtitles", "英文字幕", ["english-subtitles", "category/english-subtitles"]],
    ["popular", "热门榜单", ["popular"]]
  ];
  const links = [];
  $("header a[href], nav a[href], .menu a[href]").each((_, el) => {
    const url = normalizeHttpUrl(ctx, $(el).attr("href"), home.url);
    if (url && ctx.url.origin(url) === origin) links.push(url);
  });
  for (const [value, title, paths] of aliases) {
    const route = links.find(url => paths.includes(urlPath(ctx, url).replace(/^\/(?:zh\/|ja\/|en\/)?|\/$/g, "")));
    if (route) routes.push({ value, title, url: route });
  }
  let search = null;
  $("form").each((_, el) => {
    if (search) return;
    const form = $(el), method = String(form.attr("method") || "get").toLowerCase();
    const field = form.find("input[name='keyword'], input[name='s'], input[type='search'][name]").first();
    const url = normalizeHttpUrl(ctx, form.attr("action") || home.url, home.url);
    if (method === "get" && field.length && url && ctx.url.origin(url) === origin)
      search = { url, key: field.attr("name") };
  });
  const queryPaging = $(".pagination a[href], .page-numbers a[href]").toArray()
    .some(el => queryValue($(el).attr("href"), "page"));
  const profile = { origin, routes, search, paging: queryPaging || $(".box-item").length ? "query" : "path", home, homeAt: Date.now() };
  const parsed = parseSupjavCards(ctx, home.data, origin, home.url, 1);
  assertListingShape(ctx, home.data, parsed);
  siteProfileSnapshot = { key, generation: ctx.cache.generation, savedAt: Date.now(), value: profile };
  return profile;
}

function assertListingShape(ctx, html, parsed) {
  const $ = ctx.html.load(html);
  if (!parsed.items.length && $(".box-item").length)
    ctx.fail("INVALID_RESPONSE", "页面包含内容卡片，但详情链接格式未被识别，请更新脚本");
  if (!parsed.items.length && !$(".box-item, .box-list, .posts, article, .post, .video-item, .no-results, .not-found").length &&
      !/no (?:videos|results)|nothing found|没有找到|暂无内容|找不到/i.test($("body").text())) {
    ctx.fail("INVALID_RESPONSE", "页面结构与内容目录不匹配，不能将它当成空列表");
  }
}

function assertListingRoute(ctx, res, expected, page) {
  const $ = ctx.html.load(res.data);
  const canonical = normalizeHttpUrl(ctx, $("link[rel='canonical']").attr("href"), res.url);
  const comparablePath = url => urlPath(ctx, url).replace(/\/+/g, "/").replace(/\/page\/\d+\/?$/, "").replace(/\/$/, "");
  const expectedPath = comparablePath(expected);
  if (canonical && comparablePath(canonical) !== expectedPath)
    ctx.fail("INVALID_RESPONSE", "站点返回了其他栏目页面，请重新读取分类");
  const active = cleanSingleLine($(".pagination .active, .pagination .current, .page-numbers.current").first().text());
  if (/^\d+$/.test(active) && Number(active) !== page)
    ctx.fail("INVALID_RESPONSE", "站点没有返回请求的分页，已停止重复加载");
}

function parseSupjavCards(ctx, html, baseSite, pageUrl = baseSite, page = 1) {
  const $ = ctx.html.load(html);
  const entriesById = new Map();

  // 同时兼容 Supjav 经典结构 (.posts .post) 与通用 WordPress 卡片结构 (article, .video-item)
  $(".box-item a[href], .post a[href], article a[href], .video-block a[href], .video-item a[href], .post-item a[href]").each((_, el) => {
    const a = $(el);
    const rawHref = String(a.attr("href") || "").trim();
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) {
      return;
    }

    const normId = normalizeContentPath(ctx, rawHref, pageUrl);
    if (!isSupjavContentPath(normId)) return;

    let entry = entriesById.get(normId);
    if (!entry) {
      entry = { id: normId, links: [], containers: [] };
      entriesById.set(normId, entry);
    }
    entry.links.push(a);

    const card = a.closest(
      ".box-item, .post, article, .video-block, .video-item, .post-item"
    );
    if (card.length) {
      entry.containers.push(card);
    }
  });

  const items = [];
  for (const entry of entriesById.values()) {
    const card = buildCardFromEntry(ctx, $, entry, pageUrl);
    if (card) {
      items.push(card);
    }
  }

  let hasNext = false;
  $(".pagination a[href], .page-numbers a[href], a.next, a.nextpostslink, link[rel='next']").each((_, el) => {
    const link = $(el), raw = link.attr("href"), abs = normalizeHttpUrl(ctx, raw, pageUrl);
    if (!abs || ctx.url.origin(abs) !== ctx.url.origin(pageUrl)) return;
    const queryPage = Number(queryValue(abs, "page"));
    const pathPage = Number(urlPath(ctx, abs).match(/\/page\/(\d+)\/?$/)?.[1]);
    const target = queryPage || pathPage;
    if (target > page || !target && /next/i.test([link.attr("rel"), link.attr("class"), link.text()].join(" ")))
      hasNext = true;
  });

  return { items, hasNext };
}

function isSupjavContentPath(path) {
  if (!path) return false;
  // 排除分类、标签、分页、管理后台路径
  if (
    /^\/(?:zh\/|ja\/|en\/)?(?:category|tag|page|popular|wp-admin|wp-json|feed|author|search|chinese|censored|uncensored|uncensored-leaked|amateur|fc2|english-subtitles)(?:\/|$)/i.test(
      path
    )
  ) {
    return false;
  }
  // Some actual category pages declare video.php?slug=... instead of /video/slug.
  if (/^\/(?:zh\/|ja\/|en\/)?video\.php\?slug=[^&#]+$/i.test(path)) return true;
  // 1. 经典 Supjav 详情页: /123456.html 或 /zh/123456.html
  if (/^\/(?:zh\/|ja\/|en\/)?\d+\.html$/i.test(path)) return true;
  // 2. WordPress 视频详情页: /video/xxx 或 /archives/xxx 或 /{code-slug}/
  if (/^\/(?:zh\/|ja\/|en\/)?(?:video|videos|archives|jav)\/[^/?#]+\/?$/i.test(path)) return true;
  if (/^\/(?:zh\/|ja\/)?[a-zA-Z0-9]+-[a-zA-Z0-9-]+\/?$/i.test(path)) return true;
  return false;
}

function buildCardFromEntry(ctx, $, entry, baseSite) {
  let title = "";
  let poster = "";

  const searchNodes = [...entry.links, ...entry.containers];

  for (const node of searchNodes) {
    if (!title) {
      const tAttr = cleanSingleLine(node.attr("title"));
      if (isValidCardTitle(tAttr)) title = tAttr;
    }

    const imgs = node.is("img") ? node : node.find("img");
    imgs.each((_, imgEl) => {
      const img = $(imgEl);
      if (!title) {
        const alt = cleanSingleLine(img.attr("alt"));
        if (isValidCardTitle(alt)) title = alt;
      }
      if (!poster) {
        const rawSrc =
          img.attr("data-original") ||
          img.attr("data-src") ||
          img.attr("data-lazy-src") ||
          img.attr("src") ||
          "";
        poster = normalizeHttpUrl(ctx, rawSrc, baseSite);
      }
    });
  }

  if (!title) {
    for (const node of searchNodes) {
      const hText = cleanSingleLine(
        node.find("h2, h3, h4, .title, .entry-title").first().text()
      );
      if (isValidCardTitle(hText)) {
        title = hText;
        break;
      }
    }
  }

  if (!title) {
    for (const a of entry.links) {
      const t = cleanSingleLine(a.text());
      if (isValidCardTitle(t)) {
        title = t;
        break;
      }
    }
  }

  if (!title) return null;

  // 提取番号、日期或浏览量作为副标题
  const subParts = [];
  const codeMatch = title.match(
    /\b([0-9]{0,3}[A-Z]{2,6}-\d{2,5}|FC2-PPV-\d+)\b/i
  );
  if (codeMatch) {
    subParts.push(codeMatch[1].toUpperCase());
  }

  for (const c of entry.containers) {
    const metaText = cleanSingleLine(
      c.find(".meta, .date, .views, .post-meta").first().text() || c.text()
    );
    const dateMatch = metaText.match(/\b(20\d{2}[-/]\d{2}[-/]\d{2})\b/);
    if (dateMatch && !subParts.includes(dateMatch[1])) {
      subParts.push(dateMatch[1]);
      break;
    }
  }

  const item = {
    id: entry.id.slice(0, 1024),
    title: title.slice(0, 240),
    kind: "movie"
  };
  if (poster) item.poster = poster;
  if (subParts.length > 0) {
    item.subtitle = subParts.join(" · ").slice(0, 1024);
  }
  return item;
}

function isValidCardTitle(str) {
  const s = cleanSingleLine(str);
  if (!s || s.length < 4) return false;
  if (/^(popular|latest|more|read more|watch|jav|hd|4k|\d+)$/i.test(s)) {
    return false;
  }
  return true;
}

/* ======================== 详情与多线路/多碟选集提取 ======================== */

function extractDetailTitle($) {
  const raw =
    cleanSingleLine($(".post-meta h1, h1.entry-title, h1").first().text()) ||
    cleanSingleLine($("meta[property='og:title']").attr("content")) ||
    cleanSingleLine($("title").first().text());

  if (!raw) return "";
  return raw
    .replace(/\s*[-|]\s*Supjav.*$/i, "")
    .replace(/\s*[-|]\s*免费在线观看.*$/i, "")
    .trim();
}

function extractDetailPoster(ctx, $, baseSite) {
  const candidates = [
    $("meta[property='og:image']").attr("content"),
    $(".post-meta img, .video-meta img, .wp-post-image").first().attr("data-original"),
    $(".post-meta img, .video-meta img, .wp-post-image").first().attr("src")
  ];
  for (const c of candidates) {
    const u = normalizeHttpUrl(ctx, c, baseSite);
    if (u) return u;
  }
  return "";
}

function extractDetailSummary($) {
  const lines = [];
  $(".post-meta p, .post-meta li, .cats p, .video-info p").each((_, el) => {
    const t = cleanSingleLine($(el).text());
    if (t && t.length > 2 && t.length < 300 && !lines.includes(t)) {
      lines.push(t);
    }
  });

  if (lines.length === 0) {
    const desc =
      cleanSingleLine($("meta[property='og:description']").attr("content")) ||
      cleanSingleLine($("meta[name='description']").attr("content"));
    if (desc) lines.push(desc);
  }
  return lines.join("\n");
}

function collectServerTokens($) {
  const servers = new Map();
  $(".btn-server a[data-link], .server-list a[data-link], a[data-link]").each((idx, el) => {
    const a = $(el), token = String(a.attr("data-link") || "").trim();
    if (!token) return;
    const name = cleanSingleLine(a.text()) || `线路 ${idx + 1}`;
    if (!servers.has(name)) servers.set(name, []);
    if (!servers.get(name).includes(token)) servers.get(name).push(token);
  });
  return servers;
}

function parseServerSlot(ctx, episodeId) {
  const match = episodeId.match(/^server-slot:([^:]+):(\d+)$/);
  if (!match) ctx.fail("NOT_FOUND", "线路身份无效，请重新读取详情");
  return { server: decodeURIComponent(match[1]), index: Number(match[2]) };
}

function extractDetailGroups(ctx, $, html, contentId, baseSite) {
  const groups = [];

  // 1. 解析 Supjav 经典的 .btn-server a[data-link] 线路列表
  const serverMap = collectServerTokens($);

  if (serverMap.size > 0) {
    for (const [serverName, tokens] of serverMap.entries()) {
      const episodes = tokens.map((token, tIdx) => ({
        id: `server-slot:${encodeURIComponent(serverName)}:${tIdx}`,
        name: tokens.length > 1 ? `CD ${tIdx + 1}` : "正片"
      }));
      groups.push({
        id: `server:${encodeURIComponent(serverName)}`,
        name: `线路 ${serverName}`,
        episodes
      });
    }
    return groups;
  }

  // 2. 解析页面直接内嵌的 <iframe> 播放器线路
  const seenIframes = new Set();
  $("iframe").each((idx, el) => {
    const node = $(el);
    const rawSrc =
      node.attr("src") ||
      node.attr("data-src") ||
      node.attr("data-lazy-src") ||
      "";
    const absUrl = normalizeHttpUrl(ctx, rawSrc, baseSite);
    if (!absUrl || isAdOrTrackerUrl(absUrl) || seenIframes.has(absUrl)) return;
    seenIframes.add(absUrl);

    groups.push({
      id: `iframe-${groups.length + 1}`,
      name: `播放器线路 ${groups.length + 1}`,
      episodes: [{ id: absUrl, name: "正片" }]
    });
  });

  // 3. 兜底：若页面通过脚本动态加载播放器，提供默认正片入口
  if (groups.length === 0) {
    groups.push({
      id: "main",
      name: "默认线路",
      episodes: [{ id: contentId, name: "正片" }]
    });
  }

  return groups;
}

function detectSupjavEmbedApi(html) {
  const m = html.match(
    /https?:\/\/[a-zA-Z0-9.-]+\/supjav\.php/i
  );
  return m ? m[0] : DEFAULT_EMBED_API;
}

/* ======================== 播放源解析与 data-link 反序解码 ======================== */

async function resolveSupjavDataLink(ctx, episodeId, detailUrl, groupId) {
  // 格式: datalink:{token}:{encodedEmbedApiUrl}
  const parts = episodeId.split(":");
  const token = parts[1] ? decodeURIComponent(parts[1]) : "";
  const embedApi = parts[2]
    ? decodeURIComponent(parts[2])
    : DEFAULT_EMBED_API;
  if (!token) return [];

  // Supjav 核心规则：将 data-link 反转后作为 ?c= 参数请求 supjav.php
  const reversedCode = token.split("").reverse().join("");
  const requestUrl = `${embedApi}${embedApi.includes("?") ? "&" : "?"}c=${encodeURIComponent(reversedCode)}`;

  const res = await fetchPage(ctx, requestUrl, null, {
    Referer: detailUrl
  });
  ctx.signal.throwIfAborted();

  return extractSourcesFromPage(
    ctx,
    res.data,
    res.url || requestUrl,
    detailUrl,
    groupId
  );
}

async function extractSourcesFromPage(
  ctx,
  html,
  currentUrl,
  refererUrl,
  groupId
) {
  const sources = [];
  const seenUrls = new Set();
  const iframeQueue = [];

  const addSource = (rawUrl, label, refOverride, mimeHint) => {
    const ref = refOverride || currentUrl;
    const resolved = normalizeMediaUrl(ctx, rawUrl, ref);
    if (!resolved || seenUrls.has(resolved) || isAdOrTrackerUrl(resolved)) return;
    if (/\.(js|css|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|json|xml|vtt|srt)(?:[?#]|$)/i.test(resolved)) return;
    seenUrls.add(resolved);
    const idx = sources.length + 1;
    sources.push(buildMediaSource(`${groupId}-${idx}`, label || `播放线路 ${idx}`, resolved, ref, mimeHint));
  };
  scanHtmlForStreams(ctx, html, currentUrl, addSource, iframeQueue, 0);
  if (sources.length) return sources;
  const visited = new Set([currentUrl]);
  let error = null, requested = 0;
  while (iframeQueue.length && requested < 10) {
    const next = iframeQueue.shift();
    if (visited.has(next.url) || next.depth > 2) continue;
    visited.add(next.url);requested++;
    ctx.signal.throwIfAborted();
    try {
      const res = await fetchPage(ctx, next.url, null, { Referer: next.referer });
      scanHtmlForStreams(ctx, res.data, res.url || next.url, addSource, iframeQueue, next.depth);
      if (sources.length) return sources;
    } catch (err) {
      ctx.signal.throwIfAborted();
      const priority = code => ({ CANCELLED: 5, AUTH_REQUIRED: 4, RATE_LIMITED: 3, TIMEOUT: 2, NETWORK: 1 }[code] || 0);
      if (!error || priority(errorCode(err)) > priority(errorCode(error))) error = err;
    }
  }
  if (error) throw error;
  return sources;
}

function errorCode(err) {
  try { return JSON.parse(String(err?.message || err).split("WBX_ERROR:")[1]).code; } catch (_) { return ""; }
}

// Decode confirmed JSON assignments only. Never eval downloaded player or protection scripts.
function playerConfigObjects(html) {
  const results = [];
  const names = /(?:window\s*\.\s*)?PLAYER_CONFIG\s*=\s*/g;
  let match;
  while ((match = names.exec(html)) && results.length < 8) {
    let start = names.lastIndex;
    if (html[start] !== "{") continue;
    let depth = 0, quoted = false, escape = false;
    for (let i = start; i < html.length && i - start < 262144; i++) {
      const ch = html[i];
      if (quoted) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') quoted = false;
      } else if (ch === '"') quoted = true;
      else if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) {
        try { results.push(JSON.parse(html.slice(start, i + 1))); } catch (_) {}
        names.lastIndex = i + 1;break;
      }
    }
  }
  return results;
}

function scanHtmlForStreams(ctx, html, pageUrl, addSource, iframeQueue, depth = 0) {
  const $ = ctx.html.load(html);
  for (const config of playerConfigObjects(html)) {
    if (typeof config.m3u8 === "string" && config.m3u8.trim())
      addSource(config.m3u8, "HLS 播放器", pageUrl, "application/vnd.apple.mpegurl");
    if (typeof config.alternate720 === "string" && config.alternate720.trim())
      addSource(config.alternate720, "HLS 备用线路", pageUrl, "application/vnd.apple.mpegurl");
  }

  // 1. 原生 <video> / <source> 及 TurboVIPlay 的 #video_player[data-hash]
  $("video[src], video source[src], [data-hash], [data-video], [data-m3u8]").each(
    (_, el) => {
      const node = $(el);
      const candidates = [
        node.attr("src"),
        node.attr("data-hash"),
        node.attr("data-video"),
        node.attr("data-m3u8")
      ];
      for (const c of candidates) {
        const type = node.attr("type") || "";
        const hint = /(?:mpegurl|m3u8)/i.test(type) || c === node.attr("data-m3u8")
          ? "application/vnd.apple.mpegurl" : /^(?:video|audio)\//.test(type) ? type : "";
        if (c && !c.startsWith("blob:") && (looksLikeDirectMedia(c) || hint)) addSource(c, "直连源", pageUrl, hint);
      }
    }
  );

  // 2. 收集子 iframe
  $("iframe").each((_, el) => {
    const node = $(el);
    const rawSrc =
      node.attr("src") ||
      node.attr("data-src") ||
      node.attr("data-lazy-src") ||
      "";
    const abs = normalizeHttpUrl(ctx, rawSrc, pageUrl);
    if (abs && !isAdOrTrackerUrl(abs) && !iframeQueue.some(next => next.url === abs))
      iframeQueue.push({ url: abs, referer: pageUrl, depth: depth + 1 });
  });

  // 3. 解包 eval(function(p,a,c,k,e,d)...) 混淆脚本
  let combined = html;
  const unpacked = unpackAllPackedScripts(html);
  if (unpacked.length > 0) {
    combined += "\n" + unpacked.join("\n");
  }

  const unescaped = combined
    .replace(/\\u002[fF]/g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003[dD]/g, "=")
    .replace(/\\u003[fF]/g, "?")
    .replace(/\\\//g, "/")
    .replace(/&amp;/gi, "&");

  // 4. 扫描完整 http(s):// 或 // 协议相对的 m3u8 / mp4 / master.txt 地址
  const absMediaRegex =
    /(?:https?:)?\/\/[a-zA-Z0-9._~:/?#[\]@!$&()*+,;=%-]+\.(?:m3u8|mp4)(?:\?[a-zA-Z0-9._~:/?#[\]@!$&()*+,;=%-]*)?/gi;
  let m;
  while ((m = absMediaRegex.exec(unescaped)) !== null) {
    addSource(m[0], "HLS/MP4 线路", pageUrl);
  }

  // 5. 匹配 TurboVIPlay / JWPlayer / Plyr 的 urlPlay / file / hls 变量赋值
  const fieldRegex =
    /(?:urlPlay|video_url|hlsUrl|["']?(?:file|source|hls|mp4)["']?)\s*[:=]\s*["']((?:https?:)?\/\/[^"'\s<>]+)["']/gi;
  let fm;
  while ((fm = fieldRegex.exec(unescaped)) !== null) {
    if (looksLikeDirectMedia(fm[1])) {
      addSource(fm[1], "播放器线路", pageUrl);
    }
  }

  // 6. 适配 Streamtape (ST 线路) 动态拼接逻辑
  const stMatch = unescaped.match(
    /get_video\?id=([a-zA-Z0-9_-]+)&expires=([0-9]+)&ip=([a-zA-Z0-9._-]+)&token=([a-zA-Z0-9_-]+)/i
  );
  if (stMatch) {
    const stUrl = `https://streamtape.com/get_video?id=${stMatch[1]}&expires=${stMatch[2]}&ip=${stMatch[3]}&token=${stMatch[4]}&stream=1`;
    addSource(stUrl, "ST (Streamtape)", pageUrl);
  }

  // 7. 适配 VOE / Base64 载荷 (atob("..."))
  const atobRegex = /atob\(\s*["']([A-Za-z0-9+/=]{20,})["']\s*\)/g;
  let bm;
  while ((bm = atobRegex.exec(unescaped)) !== null) {
    try {
      const decoded = ctx.crypto.base64Decode(bm[1]).trim();
      if (looksLikeDirectMedia(decoded)) {
        addSource(decoded, "VOE/解密线路", pageUrl);
      } else {
        let sub;
        while ((sub = absMediaRegex.exec(decoded)) !== null) {
          addSource(sub[0], "VOE/解密线路", pageUrl);
        }
      }
    } catch (_) {}
  }
}

function unpackAllPackedScripts(html) {
  const results = [];
  const packedRegex =
    /eval\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)\s*\{[\s\S]*?\}\s*\(\s*(['"])([\s\S]*?)\1\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"])([\s\S]*?)\5\.split\(\s*['"]\|['"]\s*\)/g;

  let match;
  while (results.length < 16 && (match = packedRegex.exec(html)) !== null) {
    try {
      const unpacked = unpackPackerBlock(
        match[2],
        Number(match[3]),
        Number(match[4]),
        match[6].split("|")
      );
      if (unpacked) results.push(unpacked);
    } catch (_) {}
  }
  return results;
}

function unpackPackerBlock(p, a, c, k) {
  if (typeof p !== "string" || p.length > 262144 || !Number.isInteger(a) || a < 2 || a > 62 ||
      !Number.isInteger(c) || c < 1 || c > 10000 || !Array.isArray(k) || k.length > 10000) return "";
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const encodeBase = num => {
    if (num < a) return chars[num];
    return encodeBase(Math.floor(num / a)) + encodeBase(num % a);
  };

  const dict = new Map();
  let idx = c;
  while (idx--) {
    const key = encodeBase(idx);
    dict.set(key, k[idx] || key);
  }
  return p.replace(/\b\w+\b/g, word => (dict.has(word) ? dict.get(word) : word));
}

/* ======================== 通用 URL 与格式工具 ======================== */

function looksLikeDirectMedia(url) {
  const s = String(url || "").trim();
  if (!s) return false;
  if (/\.(m3u8|mp4|mkv|flv|webm)(\?.*)?$/i.test(s)) return true;
  if (/\/get_video\?id=.*&token=/i.test(s)) return true;
  if (/\/(hls|m3u8|master\.txt)\b/i.test(s) && !/\.html?(\?|$)/i.test(s)) {
    return true;
  }
  return false;
}

function isAdOrTrackerUrl(url) {
  return /(doubleclick|googlesyndication|google-analytics|adsco\.re|exoclick|juicyads|trafficjunky|popads|popcash|magsrv|realsrv|syndication|histats|cnzz|baidu)/i.test(
    url
  );
}

function normalizeContentPath(ctx, rawHref, baseSite) {
  const trimmed = String(rawHref || "").trim();
  if (!trimmed) return "";
  try {
    const abs = ctx.url.resolve(trimmed, baseSite);
    const origin = ctx.url.origin(baseSite);
    if (ctx.url.origin(abs) === origin) {
      const path = abs.slice(origin.length).split(/[?#]/)[0] || "/";
      const slug = queryValue(abs, "slug");
      if (/^\/(?:zh\/|ja\/|en\/)?video\.php$/i.test(path) && slug)
        return "/video.php?slug=" + encodeURIComponent(slug);
      // One modern card may link both /video/x and a relative /zh/video/x to the same content.
      return path.replace(/^\/(?:zh|ja|en)\/(video|videos|archives|jav)\//i, "/$1/");
    }
    return abs;
  } catch (_) {
    return "";
  }
}

function normalizeHttpUrl(ctx, rawUrl, baseSite) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed || /^(data:|javascript:|about:blank|#)/i.test(trimmed)) return "";
  try {
    const abs = ctx.url.resolve(trimmed, baseSite);
    if (/^https?:\/\//i.test(abs)) return abs;
  } catch (_) {}
  return "";
}

function normalizeMediaUrl(ctx, rawUrl, refererUrl) {
  let cleaned = String(rawUrl || "")
    .replace(/\\u002[fF]/g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/gi, "&")
    .trim();
  if (!cleaned) return "";

  // Decode an entirely URL-encoded wrapper once, not percent escapes inside a real signed URL.
  if (/^(?:https?%3a%2f%2f|%2f%2f)/i.test(cleaned)) {
    try {
      cleaned = decodeURIComponent(cleaned);
    } catch (_) {}
  }

  try {
    const abs = ctx.url.resolve(cleaned, refererUrl);
    if (/^https?:\/\//i.test(abs)) return abs;
  } catch (_) {}
  return "";
}

function buildMediaSource(id, name, mediaUrl, refererUrl, mimeHint = "") {
  const isHls =
    /\.m3u8(\?|$)/i.test(mediaUrl) ||
    /\/(hls|master\.txt)\b/i.test(mediaUrl);
  const mime = mimeHint || (isHls ? "application/vnd.apple.mpegurl" :
    /\.mp4(?:[?#]|$)/i.test(mediaUrl) ? "video/mp4" :
    /\.webm(?:[?#]|$)/i.test(mediaUrl) ? "video/webm" :
    /\.mkv(?:[?#]|$)/i.test(mediaUrl) ? "video/x-matroska" :
    /\.flv(?:[?#]|$)/i.test(mediaUrl) ? "video/x-flv" : "");
  const origin = refererUrl
    ? refererUrl.replace(/^(https?:\/\/[^/]+).*$/, "$1")
    : DEFAULT_SITE;

  return {
    id,
    name,
    url: mediaUrl,
    mime,
    headers: {
      "User-Agent": DEFAULT_UA,
      Referer: refererUrl || origin + "/",
      Origin: origin,
      // Native players do not add the Fetch metadata sent by the web player.
      "Sec-Fetch-Mode": "cors"
    },
    downloadable: true
  };
}

function cleanSingleLine(str) {
  return String(str || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
