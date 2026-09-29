/* FW 播放源探针
 * ===========================================================================
 * 用途：排查「播放源加载不出来」到底卡在哪一步。
 *
 * 它做两件事：
 *   1. 把 Forward 传给播放源模块的**全部字段**（键名、类型、是否有值、前 60 字符）
 *      以 FW_PROBE 前缀写入运行日志；
 *   2. 无论参数如何，都返回一条**公开测试流**。
 *
 * 判读方法：
 *   - 能看到「探针线路（公开测试流）」并能播放 → 模块被正确调用，问题在匹配逻辑
 *     （多半是 Forward 没传片名）；
 *   - 能看到日志但看不到线路 → 宿主过滤了返回结果；
 *   - 日志里连 FW_PROBE 都没有 → 模块根本没被调用，属于配置问题
 *     （未安装 / 未开启聚合搜索 / 当前片源不触发多源匹配）。
 *
 * 本模块不访问任何资源站、不提供真实资源，仅供排查使用。
 * 按设计不进入正式订阅清单，需要单独导入。
 */

var PROBE_STREAM =
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8';

WidgetMetadata = {
  id: 'hyj1817.fw.probe',
  title: 'FW 播放源探针',
  description: '排查用：记录 Forward 传给播放源模块的全部字段，并返回一条公开测试流。不提供真实资源。',
  author: 'HYJ1817',
  site: 'https://github.com/HYJ1817/fw-modules',
  icon: 'https://raw.githubusercontent.com/HYJ1817/fw-modules/refs/heads/main/icon.png',
  version: '1.0.0',
  requiredVersion: '0.0.1',
  detailCacheDuration: 0,
  globalParams: [
    {
      name: 'multiSource',
      title: '是否启用聚合搜索',
      type: 'enumeration',
      value: 'enabled',
      enumOptions: [
        { title: '启用', value: 'enabled' },
        { title: '禁用', value: 'disabled' }
      ]
    }
  ],
  modules: [
    {
      id: 'loadResource',
      title: '探针（返回公开测试流）',
      functionName: 'loadResource',
      type: 'stream',
      cacheDuration: 0,
      params: []
    }
  ]
};

function probeLog(payload) {
  try {
    console.log('FW_PROBE ' + JSON.stringify(payload));
  } catch (error) {
    /* 日志失败不影响返回 */
  }
}

function describe(value) {
  var type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  var empty = value === undefined || value === null || value === '';
  var info = { type: type, present: !empty };
  if (typeof value === 'string') info.sample = value.slice(0, 60);
  else if (typeof value === 'number' || typeof value === 'boolean') info.value = value;
  return info;
}

async function loadResource(params) {
  var input = params && typeof params === 'object' ? params : {};
  var keys = Object.keys(input);
  var fields = {};
  for (var i = 0; i < keys.length; i++) {
    fields[keys[i]] = describe(input[keys[i]]);
  }

  // 高亮最常见的「片名类」字段，便于一眼判断 Forward 有没有传片名
  var titleKeys = ['seriesName', 'title', 'name', 'videoName', 'vodName', 'seriesTitle', 'episodeName'];
  var titleFound = {};
  for (var j = 0; j < titleKeys.length; j++) {
    if (titleKeys[j] in fields) titleFound[titleKeys[j]] = fields[titleKeys[j]];
  }

  probeLog({
    event: 'stream-entry',
    at: new Date().toISOString(),
    paramCount: keys.length,
    allKeys: keys,
    titleFields: titleFound,
    hasAnyTitle: Object.keys(titleFound).length > 0,
    fields: fields,
    note: '若 hasAnyTitle 为 false，则任何依赖片名搜索的播放源都无法工作。'
  });

  return [
    {
      name: '探针线路（公开测试流）',
      description: '能看到本条说明 Forward 已调用播放源模块 · Apple 官方测试流',
      url: PROBE_STREAM,
      playerType: 'app'
    }
  ];
}
