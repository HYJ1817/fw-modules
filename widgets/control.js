WidgetMetadata = {
  id: "hyj1817.control.minimal",
  title: "Forward 最小校验模块",
  description: "不访问任何网站，仅用于定位模块来源校验问题",
  author: "HYJ1817",
  site: "https://github.com/HYJ1817/fw-modules",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  detailCacheDuration: 60,
  modules: [
    {
      title: "空列表测试",
      requiresWebView: false,
      functionName: "loadControl",
      cacheDuration: 60,
      params: [],
    },
  ],
};

async function loadControl() {
  return [];
}
