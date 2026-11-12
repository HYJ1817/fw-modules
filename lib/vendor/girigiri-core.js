(function () {
  'use strict';
  const DEFAULT_SITE = 'https://anime.girigirilove.icu';
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
  const clean = (v, max) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max || 1024);
  const origin = ctx => ctx.url.origin(ctx.settings.site || DEFAULT_SITE);
  function local(ctx, relative, base) {
    try {
      const u = ctx.url.resolve(String(relative || '').trim(), base || origin(ctx) + '/');
      return ctx.url.origin(u) === origin(ctx) ? u.split('#')[0] : '';
    } catch (_) { return ''; }
  }
  function remote(ctx, relative, base) {
    try {
      if (!relative || /^(?:data|javascript|magnet|thunder):/i.test(relative)) return '';
      const u = ctx.url.resolve(String(relative).trim(), base);
      return /^https?:\/\//i.test(u) ? u : '';
    } catch (_) { return ''; }
  }
  function headers(ctx) {
    const h = { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8', Referer: origin(ctx) + '/' };
    const cookie = String(ctx.settings.cookie || '').trim();
    if (/[\r\n]/.test(cookie)) ctx.fail('CONFIG_REQUIRED', '网站 Cookie 不能包含换行', { fields: ['cookie'] });
    if (cookie) h.Cookie = cookie;
    return h;
  }
  async function document(ctx, address) {
    ctx.signal.throwIfAborted();
    const u = local(ctx, address);
    if (!u) ctx.fail('INVALID_RESPONSE', '站点链接不在配置的域名内');
    let r;
    try { r = await ctx.http.get(u, { responseType: 'text', timeoutMs: 18000, headers: headers(ctx) }); }
    catch (e) {
      ctx.signal.throwIfAborted();
      if (/WBX_ERROR:/.test(String(e && e.message))) throw e;
      ctx.fail('NETWORK', '动漫站请求失败，请检查网络后重试');
    }
    ctx.signal.throwIfAborted();
    if (r.status === 429) ctx.fail('RATE_LIMITED', '网站请求过于频繁，请稍后重试');
    if (r.status === 401 || r.status === 403) ctx.fail('AUTH_REQUIRED', '网站要求验证或当前会话无访问权限');
    if (r.status === 404 || r.status === 410) ctx.fail('NOT_FOUND', '页面不存在或已下架');
    if (r.status < 200 || r.status >= 300) ctx.fail('NETWORK', '网站返回错误状态，请稍后重试');
    const finalUrl = local(ctx, r.url || u);
    if (!finalUrl) ctx.fail('INVALID_RESPONSE', '网站跳转到了其他域名，请核对服务地址');
    if (typeof r.data !== 'string' || !r.data.trim()) ctx.fail('INVALID_RESPONSE', '网站返回了空页面');
    const $ = ctx.html.load(r.data);
    if (/<title[^>]*>\s*(?:Just a moment|Attention Required)/i.test(r.data) || (!$('.public-list-box,.anthology-list-play').length && /系统提示[\s\S]{0,100}提交验证|系統提示[\s\S]{0,100}提交驗證/.test($('body').text()))) ctx.fail('AUTH_REQUIRED', '网站要求提交验证，脚本不能自动完成；请使用该站合法有效的会话后重试');
    return { $, body: r.data, url: finalUrl };
  }
  function numeric(ctx, value, what) {
    const s = String(value || '');
    if (!/^[1-9]\d{0,11}$/.test(s)) ctx.fail('NOT_FOUND', what + '标识无效，请重新打开详情');
    return s;
  }
  function itemId(ctx, href, base) {
    const u = local(ctx, href, base);
    if (!u) return '';
    const m = /^\/GV([1-9]\d{0,11})\/$/.exec(u.slice(origin(ctx).length).split('?')[0]);
    return m ? m[1] : '';
  }
  function picture(ctx, img, base) {
    return remote(ctx, img.attr('data-src') || img.attr('data-original') || img.attr('src'), base);
  }
  function items(ctx, d) {
    const out = [], seen = new Set(), $ = d.$;
    $('.public-list-box').each((i, e) => {
      ctx.signal.throwIfAborted();
      const box = $(e), a = box.find('a.time-title[href]').first().length ? box.find('a.time-title[href]').first() : box.find('a.public-list-exp[href]').first();
      const id = itemId(ctx, a.attr('href'), d.url);
      const title = clean(a.attr('title') || a.text() || box.find('img').first().attr('alt'), 240);
      if (!id || !title || seen.has(id)) return;
      const item = { id, title, kind: 'series' };
      const poster = picture(ctx, box.find('img').first(), d.url);
      if (poster) item.poster = poster;
      const subtitle = clean(box.find('.public-list-prb').first().text());
      if (subtitle) item.subtitle = subtitle;
      seen.add(id); out.push(item);
    });
    if (out.length > 1000) ctx.fail('INVALID_RESPONSE', '网站单页条目过多');
    return out;
  }
  function allowedPath(path, category, query) {
    if (query) return /^\/search\/[^/?#]+\/(?:\?[^#]*)?$/.test(path);
    return category === 'home' ? path === '/' : /^\/show\/2(?:-[^/?#]*)?\/$/.test(path);
  }
  function scope(category, query) { return category + '\n' + (query || ''); }
  function firstOrCursor(ctx, req, category, query) {
    if (req.cursor == null) return { url: origin(ctx) + (query ? '/search/' + encodeURIComponent(query) + '-------------/' : category === 'home' ? '/' : '/show/2-----------/'), step: 1 };
    let c;
    try { c = JSON.parse(req.cursor); } catch (_) { ctx.fail('INVALID_RESPONSE', '分页状态无效，请刷新列表'); }
    if (!c || c.v !== 1 || c.site !== origin(ctx) || c.scope !== scope(category, query) || !Number.isInteger(c.step) || c.step < 2 || c.step > 100000 || typeof c.path !== 'string' || !allowedPath(c.path, category, query)) ctx.fail('INVALID_RESPONSE', '分页状态与当前查询不符，请刷新列表');
    const url = local(ctx, c.path);
    if (!url) ctx.fail('INVALID_RESPONSE', '分页链接无效');
    return { url, step: c.step };
  }
  function nextCursor(ctx, d, category, query, step) {
    let next = '';
    d.$('.pages a[href],a[rel="next"]').each((i, e) => {
      if (next) return;
      const a = d.$(e), label = clean(a.attr('title') || a.text(), 80);
      if (a.attr('rel') !== 'next' && !/^(?:下一页|下一頁|下页|下頁|next)$/i.test(label)) return;
      const u = local(ctx, a.attr('href'), d.url);
      if (!u || u === d.url) return;
      const path = u.slice(origin(ctx).length);
      if (allowedPath(path, category, query)) next = path;
    });
    if (!next) return null;
    const c = JSON.stringify({ v: 1, site: origin(ctx), scope: scope(category, query), path: next, step: step + 1 });
    if (c.length > 2048) ctx.fail('INVALID_RESPONSE', '分页链接过长，请缩短搜索词');
    return c;
  }
  function page(ctx, d, category, query, step) {
    const result = items(ctx, d);
    if (!result.length && !/没有找到|沒有找到|暂无相关|暫無相關|暂无数据|暂无内容|暫無內容/.test(d.$('body').text())) ctx.fail('INVALID_RESPONSE', '未找到目录节点，网站结构可能已变化');
    return { items: result, nextCursor: nextCursor(ctx, d, category, query, step) };
  }
  function episodeLink(ctx, href, base) {
    const u = local(ctx, href, base);
    if (!u) return null;
    const m = /^\/playGV([1-9]\d{0,11})-([1-9]\d{0,11})-([1-9]\d{0,11})\/$/.exec(u.slice(origin(ctx).length));
    return m ? { contentId: m[1], groupId: m[2], episodeId: m[3] } : null;
  }
  function groups(ctx, d, id) {
    const out = [], byId = new Map(), tabs = [], $ = d.$;
    $('.anthology-tab .swiper-slide').each((i, e) => { const a = $(e).clone(); a.find('i,.badge').remove(); tabs.push(clean(a.text(), 240)); });
    $('.anthology-list-box').each((index, e) => {
      $(e).find('.anthology-list-play a[href]').each((i, link) => {
        ctx.signal.throwIfAborted();
        const a = $(link), ref = episodeLink(ctx, a.attr('href'), d.url);
        if (!ref || ref.contentId !== id) return;
        let g = byId.get(ref.groupId);
        if (!g) { g = { id: ref.groupId, name: tabs[index] || '线路 ' + ref.groupId, episodes: [] }; byId.set(ref.groupId, g); out.push(g); }
        if (g.episodes.some(x => x.id === ref.episodeId)) return;
        const name = clean(a.text(), 240);
        if (name) g.episodes.push({ id: ref.episodeId, name });
      });
    });
    return out.filter(g => g.episodes.length);
  }
  function assignedObject(code) {
    const m = /\b(?:var|let|const)\s+player_aaaa\s*=\s*/.exec(code);
    if (!m) return null;
    const start = m.index + m[0].length;
    if (code[start] !== '{') return null;
    let depth = 0, quoted = false, escaped = false;
    for (let i = start; i < code.length; i++) {
      const c = code[i];
      if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue; }
      if (c === '"') { quoted = true; continue; }
      if (c === '{') depth++;
      else if (c === '}' && --depth === 0) { try { return JSON.parse(code.slice(start, i + 1)); } catch (_) { return null; } }
    }
    return null;
  }
  function decodeUrl(ctx, p, base) {
    if (typeof p.url !== 'string' || !p.url) ctx.fail('INVALID_RESPONSE', '播放器未提供媒体地址');
    let value = p.url;
    const flag = String(p.encrypt == null ? 0 : p.encrypt);
    if (!['0', '1', '2'].includes(flag)) ctx.fail('UNSUPPORTED', '网站使用了尚未支持的播放地址格式');
    try {
      if (flag === '2') {
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 === 1) throw Error('invalid base64');
        const raw = atob(value), bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        value = new TextDecoder().decode(bytes);
      }
      if (flag === '1' || flag === '2') value = value.replace(/%u([\da-f]{4})|%([\da-f]{2})/gi, (m, u, b) => String.fromCharCode(parseInt(u || b, 16)));
    } catch (_) { ctx.fail('INVALID_RESPONSE', '播放地址编码无效'); }
    const url = remote(ctx, value, base);
    if (!url) ctx.fail('UNSUPPORTED', '该线路没有标准 HTTP(S) 媒体地址');
    const path = url.split(/[?#]/)[0];
    const mime = /\.m3u8$/i.test(path) ? 'application/vnd.apple.mpegurl' : /\.mp4$/i.test(path) ? 'video/mp4' : /\.mpd$/i.test(path) ? 'application/dash+xml' : '';
    if (!mime) ctx.fail('UNSUPPORTED', '该线路需要额外网页解析，不能当作视频直链');
    return { url, mime };
  }
  WeBox.define({
    api: '1.1', id: 'dev.webox.native.girigirilove', name: 'girigiri 动漫', version: '1.0.0', requires: ['html'],
    settings: { fields: [
      { key: 'site', label: '网站地址', type: 'url', default: DEFAULT_SITE, required: true },
      { key: 'cookie', label: '网站 Cookie（可选）', type: 'secret', maxLength: 8192, help: '仅用于当前网站的合法会话；不会自动完成验证码，也不发送给媒体 CDN。' }
    ] },
    cache: { list: 120, detail: 60, filters: 3600 },
    async filters() { return [{ key: 'category', label: '栏目', type: 'select', default: 'home', options: [{ label: '首页', value: 'home' }, { label: '日番', value: 'japan' }] }]; },
    async list(ctx, req) {
      const category = req.filters && req.filters.category || 'home';
      if (!['home', 'japan'].includes(category)) ctx.fail('INVALID_RESPONSE', '栏目无效');
      const c = firstOrCursor(ctx, req, category, '');
      return page(ctx, await document(ctx, c.url), category, '', c.step);
    },
    async search(ctx, req) {
      const query = String(req.query || '').trim();
      if (!query) return { items: [], nextCursor: null };
      if (query.length > 200) ctx.fail('INVALID_RESPONSE', '搜索词过长');
      const c = firstOrCursor(ctx, req, 'search', query);
      return page(ctx, await document(ctx, c.url), 'search', query, c.step);
    },
    async detail(ctx, req) {
      const id = numeric(ctx, req.id, '内容'), d = await document(ctx, origin(ctx) + '/GV' + id + '/');
      const result = { id, kind: 'series', groups: groups(ctx, d, id) };
      const title = clean(d.$('.slide-info-title').first().text(), 240);
      if (title) result.title = title;
      if (!title && !result.groups.length) ctx.fail('INVALID_RESPONSE', '未找到详情内容，网站结构可能已变化');
      const poster = picture(ctx, d.$('.detail-pic img').first(), d.url);
      if (poster) result.poster = poster;
      const summary = clean(d.$('#height_limit').first().text(), 65536);
      if (summary) result.summary = summary;
      return result;
    },
    async play(ctx, req) {
      const id = numeric(ctx, req.contentId, '内容'), sid = numeric(ctx, req.groupId, '线路'), nid = numeric(ctx, req.episodeId, '选集');
      // 仅凭稳定身份即可在新运行时解析，不依赖详情或旧播放快照。
      const address = origin(ctx) + '/playGV' + id + '-' + sid + '-' + nid + '/';
      const d = await document(ctx, address);
      let p = null;
      d.$('script:not([src])').each((i, e) => { if (!p) p = assignedObject(d.$(e).html() || ''); });
      if (!p) ctx.fail('INVALID_RESPONSE', '未找到有效播放器数据，网站结构可能已变化');
      if (String(p.id) !== id || String(p.sid) !== sid || String(p.nid) !== nid) ctx.fail('NOT_FOUND', '网站返回了其他选集，请重新打开详情');
      if (Number(p.trysee) > 0 || Number(p.points) > 0) ctx.fail('AUTH_REQUIRED', '该线路为受限或预览资源，请在网站确认访问权限');
      const r = decodeUrl(ctx, p, d.url);
      return { sources: [{ id: 'line-' + sid, name: '线路 ' + sid, url: r.url, mime: r.mime, headers: { 'User-Agent': UA, Referer: origin(ctx) + '/' }, downloadable: true }] };
    }
  });
})();
