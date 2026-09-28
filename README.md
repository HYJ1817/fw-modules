# fw模块

个人整理的 Forward 首页模块与播放源。仓库中的模块均为独立 JavaScript 文件，可单独导入，也可以通过订阅清单一次添加。

## 单链接总模块（推荐）

Forward 右上角选择链接导入，只需添加：

```text
https://raw.githubusercontent.com/HYJ1817/fw-modules/refs/heads/main/widgets/fw-all.js
```

该 JS 同时包含 HStream、YinHentai、Hanime 首页模块和 HStream、YinHentai、Hanime、4KVM 播放源，不依赖 `.fwd` 集合来源。

## 订阅地址

在 Forward 中优先添加以下 GitHub Pages JSON 清单：

```text
https://hyj1817.github.io/fw-modules/fw-modules.json
```

CDN 备用地址：

```text
https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/fw-modules-cdn.fwd
```

Raw 备用地址：

```text
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/fw-modules.fwd
```

## 模块列表

| 模块 | 类型 | 文件 | 说明 |
| --- | --- | --- | --- |
| **苹果CMS 聚合源** | **资源** | `widgets/maccms-source.js` | **多站可配的通用采集接口播放源，见下节** |
| HStream | 首页 | `widgets/hstream.js` | 首页、分类、搜索、详情和分集 |
| HStream 播放源 | 资源 | `widgets/hstream-resource.js` | 与 HStream 首页配合，也支持聚合匹配 |
| YinHentai | 首页 | `widgets/yinhentai.js` | 首页、中文分类、搜索、详情和分集 |
| YinHentai 播放源 | 资源 | `widgets/yinhentai-resource.js` | HLS/MP4 播放线路 |
| Hanime | 首页 | `widgets/hanime.js` | 首页、中文分类、搜索、详情和分集 |
| Hanime 播放源 | 资源 | `widgets/hanime-resource.js` | 需要配置已认证的自建解析地址 |
| 4KVM 播放源 | 资源 | `widgets/4kvm-resource.js` | 自动匹配电影、电视剧和动漫，返回未锁定线路 |

## 苹果CMS 聚合源

面向**苹果CMS / MacCMS V10 采集接口**（形如 `https://域名/api.php/provide/vod/`）的通用播放源。
这类接口是公开协议约定，站点换内容不影响接口形态，因此比逐站 HTML 抓取稳定得多。

单个文件即可导入：

```text
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/widgets/maccms-source.js
```

全局参数：

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| 是否启用聚合搜索 | 启用 | 仅当显式选择「禁用」时才返回空 |
| 资源站列表 | 内置金鹰资源 | 每行一条：`名称,接口地址`；也可填 JSON 数组 |
| 每站最多搜索页数 | 5 | 精确片名常常不在第 1 页，接口每页固定 20 条 |
| 严格季匹配 | 关闭 | 开启后季号不一致的条目会被拒绝 |
| 解析接口 | 空 | 填写后解析型线路会经该接口转换，支持 `{url}` 占位符 |

新增源站只需在「资源站列表」里加一行，不需要改代码。

## 源站自检

对已配置的源站逐项体检：连通性、响应形态、分页、片名命中率、线路可用性。
结果以列表项返回，同时写入 `FW_SOURCECHECK` 运行日志。**不返回任何播放线路，不写缓存。**

```text
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/widgets/fw-sourcecheck.js
```

该模块按设计不进入正式订阅清单，需要单独导入。

## 使用说明

- HStream 与 YinHentai 建议同时安装对应的首页模块和播放源。
- 4KVM 只有播放源，不提供独立首页；请保持“聚合搜索”为“启用”。
- Hanime 已取消公开播放直链。播放源需要在全局参数中填写已配置账号的自建解析服务地址。
- 模块升级后如未立即生效，请在 Forward 中清理模块缓存并确认版本号已经更新。
- 本仓库不提供、存储或分发媒体文件，只提供网页数据适配脚本。

## 单独导入

单文件 Raw 地址格式：

```text
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/widgets/文件名.js
```

例如 4KVM 播放源：

```text
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/widgets/4kvm-resource.js
```

## 维护

### 目录约定

```
lib/maccms.js                 苹果CMS 适配层（源码，不直接分发）
lib/entries/*.js              入口层（WidgetMetadata + 导出函数）
scripts/build-maccms.js       把适配层内联进入口层 → widgets/
scripts/build-fw-all.js       聚合总模块
scripts/generate-index.js     生成四份订阅清单
scripts/check-manifests.js    一致性校验
widgets/                      分发物（含生成物，勿手改）
```

`widgets/maccms-source.js` 与 `widgets/fw-sourcecheck.js` 是**生成物**，
文件头带 `Do not edit directly` 标记。要改逻辑请改 `lib/`，然后重新构建。

### 标准流程

```bash
npm run build:maccms      # 内联适配层，生成单文件组件
npm run generate:index    # 重新生成四份订阅清单
npm run verify:fast       # 构建 + 单元测试 + 清单一致性校验
```

完整校验（含聚合总模块）：

```bash
npm run verify
```

### 为什么需要 check:manifests

早期版本的 `generate-index.js` 维护了一份**硬编码的文件列表**，比实际清单少 4 条。
跑一次 `npm run generate:index` 就会把这 4 条从清单里删掉，且不会有任何报错 ——
`fw-modules-cdn.fwd` 长期只有 7 条而主清单有 11 条，就是这么来的。

现在生成器会自动发现 `widgets/*.js`，并且：

- 保留清单中已存在的额外字段（如 `type: "url"`），不会因重新生成而丢失；
- 条目数比现有清单少时**直接报错退出**，除非显式加 `--allow-shrink`。

`npm run check:manifests` 会校验：

1. 各清单内部 id 唯一、字段齐全、URL 域名与清单定位一致
2. 三份主清单的组件集合、版本、标题完全一致
3. 清单条目 ↔ `widgets/` 文件双向覆盖
4. 清单声明的 `version` 等于文件内 `WidgetMetadata.version`
5. 播放源模块的 `id` / `type` / `multiSource` 声明规范
6. 已知反模式（如 `!== "enabled"` 严格判等、缺少字符串兜底）

### 真实站点验证（可选）

```bash
npm run test:maccms:live
npm run test:4kvm:live
npm run test:hstream:home:live
npm run test:hstream:resource:live
```

站点结构随时可能变化；若模块失效，请先运行 `npm run test:maccms:live` 与源站自检模块，
区分「代码问题」与「站点问题」，再动手改。
