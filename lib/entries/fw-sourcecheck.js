/* FW 源站自检 · 入口层
 * 本文件不单独使用，由 scripts/build-maccms.js 与 lib/maccms.js 拼接后
 * 生成 widgets/fw-sourcecheck.js。修改请改这里，不要改生成物。
 *
 * 设计原则：只读、不返回播放线路、不写任何缓存。
 * 结果同时以列表项返回（可在界面上直接看）并以 FW_SOURCECHECK 前缀写入运行日志。
 */

var SOURCECHECK_SITES = '金鹰资源,https://jyzyapi.com/api.php/provide/vod/';
var SOURCECHECK_MAX_PAGES = 5;

WidgetMetadata = {
  id: 'hyj1817.fw.sourcecheck',
  title: 'FW 源站自检',
  description: '对苹果CMS源站逐项体检：连通性、响应形态、分页、片名命中率、线路可用性。不提供播放线路。',
  author: 'HYJ1817',
  site: 'https://github.com/HYJ1817/fw-modules',
  icon: 'https://raw.githubusercontent.com/HYJ1817/fw-modules/refs/heads/main/icon.png',
  version: '1.0.0',
  requiredVersion: '0.0.1',
  detailCacheDuration: 0,
  modules: [
    {
      id: 'checkAll',
      title: '1. 全量自检（所有源站）',
      functionName: 'checkAll',
      requiresWebView: false,
      cacheDuration: 0,
      params: [
        { name: 'sites', title: '资源站列表', type: 'input', value: '', description: '每行一条：名称,接口地址。留空使用内置站点。' },
        { name: 'probe', title: '测试片名', type: 'input', value: '斗破苍穹', description: '用这个片名去各站搜索，检查命中率。' },
        {
          name: 'deep',
          title: '深度检测（翻页）',
          type: 'enumeration',
          value: 'on',
          enumOptions: [
            { title: '开启', value: 'on' },
            { title: '关闭（只测第 1 页）', value: 'off' }
          ]
        }
      ]
    },
    {
      id: 'loadResource',
      title: '诊断监听（不提供播放线路）',
      functionName: 'loadResource',
      type: 'stream',
      cacheDuration: 0,
      params: []
    }
  ]
};

// ---------------------------------------------------------------------------
// 单项探测
// ---------------------------------------------------------------------------

async function sourcecheckFetch(site, keyword, page) {
  var url = Maccms.buildUrl(site.value, { ac: 'detail', wd: keyword, pg: page });
  var response = await Widget.http.get(url, {
    headers: { 'User-Agent': Maccms.DEFAULT_UA, Accept: 'application/json,text/plain,*/*' },
    timeout: 10000
  });
  return { response: response, body: Maccms.unwrap(response) };
}

async function probeSite(site, probe, deep) {
  var result = {
    site: site.title,
    url: site.value,
    ok: false,
    ms: 0,
    checks: {},
    notes: []
  };

  var started = Date.now();
  var firstPage;
  try {
    firstPage = await sourcecheckFetch(site, probe, 1);
  } catch (error) {
    result.ms = Date.now() - started;
    result.checks.reachable = false;
    result.summary = '网络不可达';
    result.notes.push(String((error && error.message) || error));
    return result;
  }
  result.ms = Date.now() - started;
  result.checks.reachable = true;

  // 响应形态：苹果CMS 的响应头恒为 text/html，宿主多半返回原始字符串
  result.checks.rawDataType = typeof (firstPage.response && firstPage.response.data);
  result.checks.needsJsonParse = result.checks.rawDataType === 'string';

  if (!firstPage.body) {
    result.checks.jsonParsed = false;
    result.summary = '响应无法解析为 JSON';
    return result;
  }
  result.checks.jsonParsed = true;

  if (!Array.isArray(firstPage.body.list)) {
    result.checks.hasList = false;
    result.summary = '不是苹果CMS格式（缺少 list）';
    return result;
  }
  result.checks.hasList = true;
  result.checks.page1Count = firstPage.body.list.length;
  result.checks.pagecount = parseInt(firstPage.body.pagecount, 10) || 1;
  result.checks.total = parseInt(firstPage.body.total, 10) || 0;

  var parsed = Maccms.parseSeason(probe);
  var wanted = {
    raw: probe,
    base: parsed.base || probe,
    season: parsed.season,
    strictSeason: false
  };

  // 翻页搜索：这一步同时验证 pg 参数是否生效
  var collected = [];
  var pagesFetched = 0;
  var maxPages = deep ? SOURCECHECK_MAX_PAGES : 1;
  for (var page = 1; page <= maxPages; page++) {
    var payload;
    try {
      payload = page === 1 ? firstPage : await sourcecheckFetch(site, wanted.base, page);
    } catch (error) {
      result.notes.push('第 ' + page + ' 页失败：' + String((error && error.message) || error));
      break;
    }
    if (!payload.body || !Array.isArray(payload.body.list) || !payload.body.list.length) break;

    pagesFetched++;
    collected = collected.concat(payload.body.list);

    var exact = false;
    for (var i = 0; i < payload.body.list.length; i++) {
      if (Maccms.scoreTitle(payload.body.list[i].vod_name, wanted) >= 300) {
        exact = true;
        break;
      }
    }
    if (exact) break;
    if (page >= (parseInt(payload.body.pagecount, 10) || 1)) break;
  }
  result.checks.pagesFetched = pagesFetched;
  result.checks.paginationWorks = pagesFetched > 1;

  var best = Maccms.pickBest(collected, wanted);
  if (!best) {
    result.checks.matchQuality = 'none';
    result.summary = '在 ' + pagesFetched + ' 页内未匹配到「' + probe + '」';
    return result;
  }

  result.checks.matchQuality = best.quality;
  result.checks.matchScore = best.score;
  result.checks.matchedTitle = best.item.vod_name;

  var lines = Maccms.collectLines(best.item);
  result.checks.lines = lines.length;
  var direct = 0;
  for (var j = 0; j < lines.length; j++) {
    if (Maccms.isDirectStream(lines[j].url)) direct++;
  }
  result.checks.directLines = direct;
  result.checks.parseLines = lines.length - direct;
  result.checks.hasPlayUrl = !!String(best.item.vod_play_url || '');

  result.ok = result.checks.matchQuality !== 'none' && direct > 0;
  result.summary =
    '命中「' +
    best.item.vod_name +
    '」(' +
    (best.quality === 'exact' ? '全名一致' : best.quality === 'base' ? '主名一致' : '模糊') +
    ') · 直链 ' +
    direct +
    ' / 解析型 ' +
    (lines.length - direct);

  if (direct === 0 && lines.length > 0) {
    result.notes.push('该条目只有解析型线路，未配置解析接口时不会返回任何资源。');
  }
  if (best.quality === 'fuzzy') {
    result.notes.push('仅为模糊匹配，可能对应到不同剧集，请人工核对。');
  }
  return result;
}

// ---------------------------------------------------------------------------
// 结果呈现
// ---------------------------------------------------------------------------

function statusTag(result) {
  if (!result.checks.reachable) return '[失败]';
  if (!result.checks.jsonParsed || !result.checks.hasList) return '[失败]';
  if (result.checks.matchQuality === 'none') return '[警告]';
  if (result.checks.directLines === 0) return '[警告]';
  if (result.checks.matchQuality === 'fuzzy') return '[警告]';
  return '[正常]';
}

function toListItem(result) {
  var parts = [];
  if (result.checks.reachable) {
    parts.push(result.ms + 'ms');
    if (result.checks.hasList) {
      parts.push(result.checks.page1Count + '条/页');
      parts.push('共' + result.checks.pagecount + '页');
      parts.push('总计' + result.checks.total);
      if (result.checks.pagesFetched > 1) parts.push('实翻' + result.checks.pagesFetched + '页');
    }
  }
  if (result.summary) parts.push(result.summary);
  if (result.checks.needsJsonParse) parts.push('响应为字符串');

  return {
    id: 'sourcecheck:' + result.site,
    title: statusTag(result) + ' ' + result.site,
    description: parts.join(' · '),
    detail: result.notes.length ? result.notes.join(' / ') : undefined
  };
}

function summaryItem(report) {
  var healthy = 0;
  for (var i = 0; i < report.sites.length; i++) {
    if (report.sites[i].ok) healthy++;
  }
  return {
    id: 'sourcecheck:summary',
    title: '自检完成：' + healthy + ' / ' + report.sites.length + ' 站可用',
    description:
      '探测片名「' +
      report.probe +
      '」· 深度检测' +
      (report.deep ? '开' : '关') +
      ' · 完整报告见运行日志 FW_SOURCECHECK'
  };
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

async function checkAll(params) {
  params = params || {};
  var sites = Maccms.parseSites(params.sites, SOURCECHECK_SITES);
  var probe = Maccms.clean(params.probe) || '斗破苍穹';
  var deep = String(params.deep || 'on').toLowerCase() !== 'off';

  var report = {
    event: 'sourcecheck',
    version: WidgetMetadata.version,
    at: new Date().toISOString(),
    probe: probe,
    deep: deep,
    sites: []
  };

  if (!sites.length) {
    report.note = '没有可用的源站配置';
    console.log('FW_SOURCECHECK ' + JSON.stringify(report));
    return [{ id: 'sourcecheck:empty', title: '[失败] 没有可用的源站配置', description: '请检查资源站列表参数格式：每行「名称,接口地址」' }];
  }

  var items = [];
  for (var i = 0; i < sites.length; i++) {
    var result = await probeSite(sites[i], probe, deep);
    report.sites.push(result);
    items.push(toListItem(result));
  }

  items.unshift(summaryItem(report));
  console.log('FW_SOURCECHECK ' + JSON.stringify(report));
  return items;
}

/** 诊断监听：只记录 Forward 实际传入的字段，不返回任何线路。 */
async function loadResource(params) {
  var input = params && typeof params === 'object' ? params : {};
  var names = ['id', 'link', 'url', 'videoUrl', 'title', 'seriesName', 'type', 'season', 'episode', 'tmdbId', 'imdbId', 'multiSource'];
  var present = {};
  for (var i = 0; i < names.length; i++) {
    var value = input[names[i]];
    present[names[i]] = {
      present: value !== undefined && value !== null && value !== '',
      type: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
    };
  }
  console.log(
    'FW_SOURCECHECK ' +
      JSON.stringify({
        event: 'stream-entry',
        at: new Date().toISOString(),
        builtinTest: !!input.id && String(input.id).indexOf('forward-test-media') === 0,
        fields: present
      })
  );
  return [];
}
