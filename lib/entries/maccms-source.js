/* 苹果CMS 聚合播放源 · 入口层
 * 本文件不单独使用，由 scripts/build-maccms.js 与 lib/maccms.js 拼接后
 * 生成 widgets/maccms-source.js。修改请改这里，不要改生成物。
 */

var DEFAULT_SITES = '金鹰资源,https://jyzyapi.com/api.php/provide/vod/';

WidgetMetadata = {
  id: 'hyj1817.maccms.resource',
  title: '苹果CMS 聚合源',
  icon: 'https://jyzyapi.com/favicon.ico',
  version: '1.0.0',
  requiredVersion: '0.0.1',
  description: '苹果CMS/MacCMS 通用聚合播放源：多站可配、自动翻页、片名归一化匹配、解析型线路可选',
  author: 'HYJ1817',
  site: 'https://github.com/HYJ1817/fw-modules',
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
    },
    {
      name: 'sites',
      title: '资源站列表',
      type: 'input',
      description: '每行一条：名称,接口地址。留空使用内置站点。'
    },
    {
      // 用 enumeration 而非 count：仓库中已有可用先例的都是字符串值，
      // 避免引入「数字型默认值」这一没有先例的写法。
      name: 'maxPages',
      title: '每站最多搜索页数',
      type: 'enumeration',
      value: '5',
      enumOptions: [
        { title: '3 页（快）', value: '3' },
        { title: '5 页（推荐）', value: '5' },
        { title: '8 页（全）', value: '8' }
      ]
    },
    {
      name: 'strictSeason',
      title: '严格季匹配',
      type: 'enumeration',
      value: 'off',
      enumOptions: [
        { title: '关闭（推荐）', value: 'off' },
        { title: '开启', value: 'on' }
      ]
    },
    {
      name: 'parseApi',
      title: '解析接口（可选）',
      type: 'input',
      description: '填写后解析型线路会经该接口转换；支持 {url} 占位符。留空则只返回直链。'
    }
  ],
  modules: [
    {
      id: 'loadResource',
      title: '加载资源',
      functionName: 'loadResource',
      type: 'stream',
      cacheDuration: 0,
      params: []
    }
  ]
};

async function loadResource(params) {
  return Maccms.loadResources(params || {}, {
    defaultSites: DEFAULT_SITES,
    keyPrefix: 'hyj1817_maccms',
    onError: function (site, error) {
      console.log('FW maccms: ' + site.title + ' 请求失败 - ' + ((error && error.message) || error));
    }
  });
}
