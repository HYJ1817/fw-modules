# fw模块

个人整理的 Forward 首页模块与播放源。仓库中的模块均为独立 JavaScript 文件，可单独导入，也可以通过订阅清单一次添加。

## 订阅地址

在 Forward 中添加以下远程清单：

```text
https://raw.githubusercontent.com/HYJ1817/fw%E6%A8%A1%E5%9D%97/main/forward-widgets.fwd
```

如果 GitHub Raw 连接不稳定，可尝试 jsDelivr：

```text
https://cdn.jsdelivr.net/gh/HYJ1817/fw%E6%A8%A1%E5%9D%97@main/forward-widgets.fwd
```

## 模块列表

| 模块 | 类型 | 文件 | 说明 |
| --- | --- | --- | --- |
| HStream | 首页 | `widgets/hstream.js` | 首页、分类、搜索、详情和分集 |
| HStream 播放源 | 资源 | `widgets/hstream-resource.js` | 与 HStream 首页配合，也支持聚合匹配 |
| YinHentai | 首页 | `widgets/yinhentai.js` | 首页、中文分类、搜索、详情和分集 |
| YinHentai 播放源 | 资源 | `widgets/yinhentai-resource.js` | HLS/MP4 播放线路 |
| Hanime | 首页 | `widgets/hanime.js` | 首页、中文分类、搜索、详情和分集 |
| Hanime 播放源 | 资源 | `widgets/hanime-resource.js` | 需要配置已认证的自建解析地址 |
| 4KVM 播放源 | 资源 | `widgets/4kvm-resource.js` | 自动匹配电影、电视剧和动漫，返回未锁定线路 |

## 使用说明

- HStream 与 YinHentai 建议同时安装对应的首页模块和播放源。
- 4KVM 只有播放源，不提供独立首页；请保持“聚合搜索”为“启用”。
- Hanime 已取消公开播放直链。播放源需要在全局参数中填写已配置账号的自建解析服务地址。
- 模块升级后如未立即生效，请在 Forward 中清理模块缓存并确认版本号已经更新。
- 本仓库不提供、存储或分发媒体文件，只提供网页数据适配脚本。

## 单独导入

单文件 Raw 地址格式：

```text
https://raw.githubusercontent.com/HYJ1817/fw%E6%A8%A1%E5%9D%97/main/widgets/文件名.js
```

例如 4KVM 播放源：

```text
https://raw.githubusercontent.com/HYJ1817/fw%E6%A8%A1%E5%9D%97/main/widgets/4kvm-resource.js
```

## 维护

修改模块后需要同步提升该文件的 `WidgetMetadata.version`，然后重新生成订阅清单：

```bash
npm run generate:index
npm test
```

真实站点验证属于可选测试：

```bash
npm run test:4kvm:live
npm run test:hstream:home:live
npm run test:hstream:resource:live
```

站点结构随时可能变化；若模块失效，请先检查网页接口和播放器签名流程是否更新。
