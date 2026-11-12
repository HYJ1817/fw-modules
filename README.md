# fw模块

个人整理的 Forward 首页模块与播放源。仓库中的模块均为独立 JavaScript 文件，可单独导入，也可以通过订阅清单一次添加。

## 单链接总模块（推荐）

Forward 右上角选择链接导入，只需添加（当前 `1.0.6`，约 237 KB）：

```text
https://raw.githubusercontent.com/HYJ1817/fw-modules/refs/heads/main/widgets/fw-all.js
```

备用地址：

```text
https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/widgets/fw-all.js
```

该 JS 同时包含 Hentaimama、HStream、YinHentai、MissAV、Hanime 首页模块，以及 Hentaimama、HStream、YinHentai、Hanime、4KVM、MissAV 六个站点专用播放源，不依赖 `.fwd` 集合来源。

> **它不含 Avbebe、XChina 与苹果CMS 聚合源。** 原因见下一节，这三类需要单独导入。
>
> **改动内联源码或路由时必须 bump `scripts/build-fw-all.js` 里的 `version`**：
> 客户端只按 `version` 判断是否刷新 `fw-all.js`，版本不变就永远用旧代码。

> **单个模块文件有体积上限。** 上限为 240 KB（`MAX_BYTES`），超限会被截断并以
> 「模块无效或解析失败」拒绝。当前 236 KB 已接近上限，因此**苹果CMS 聚合源与两站模块
> 只能单独安装**（内联实测涨到 254 KB，刷新直接失败）。

## 排查：线路列表为空

播放源依赖片名去搜索资源站。而 Forward 传给 `loadResource` 的字段里**不一定包含片名**
（官方文档列出的是 `tmdbId / imdbId / id / type / season / episode / link / videoUrl`），
此时任何依赖片名搜索的播放源都会返回空。

用探针模块可以一次性区分三种情况：

```text
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/widgets/fw-probe.js
```

导入后，它会记录 Forward 传入的**全部字段**（键名、类型、是否有值），
并返回一条公开测试流。判读：

| 现象 | 结论 |
| --- | --- |
| 能看到「探针线路（公开测试流）」 | 模块被正确调用，问题在匹配逻辑（多半是没传片名） |
| 有 `FW_PROBE` 日志但看不到线路 | 宿主过滤了返回结果 |
| 连 `FW_PROBE` 日志都没有 | 模块未被调用：检查是否安装、是否开启聚合搜索、当前片源是否触发多源匹配 |

`maccms-source.js` 也会输出 `FW_MACCMS` 日志，包含收到的片名、每站的候选数与匹配质量，
返回空时会明确写出原因（`no-title` / `no-match`）。

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

## 只要 Avbebe + XChina（两站子集订阅）

不想装全量模块时，用这一个链接只添加 Avbebe 与 XChina 的 4 个组件
（两站的首页模块 + 播放源）：

```text
https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/fw-avbebe-xchina.fwd
```

Raw 备用地址（同一份内容）：

```text
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/fw-avbebe-xchina.fwd
```

该清单由 `npm run generate:index` 与四份主清单一起生成，只取
`avbebe.js` / `avbebe-resource.js` / `xchina.js` / `xchina-resource.js`，
缺件会直接报错；`npm run check:manifests` 也会校验它的 URL 与版本同步。

> 子集与全量清单的组件 id 相同，**不要同时订阅两者**，否则会出现重复模块。

## 第三方 Rex 模块（四合一子集）

GetAV / ONE一个 / Perverzija Tube / SupJav 四个第三方模块（作者 Tiamo、YG），**原样收录**、
保留上游逻辑，只放在独立清单里分发，不进主清单（避免与全量清单出现重复模块）：

```text
https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/fw-rex-4.fwd
```

Raw 备用（同一份内容）：

```text
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/fw-rex-4.fwd
```

| 模块 | 版本 | 说明 |
| --- | --- | --- |
| GetAV | 0.5.0 | 最新/热门/新片/字幕/无码/4K 列表、番号搜索、按画质分线路（RSC 取数，AVIF 封面走 wsrv 转 JPEG） |
| ONE一个 | 2.2.0 | 接口式模块（游客 token 自动获取、AES/MD5 签名），含最新/热门/分区/连载/演员 |
| Perverzija Tube | 1.2.0 | 列表/片商/标签/演员作品 + XtremeStream HLS 多画质线路 |
| SupJav | 1.3.0 | 列表/分类/演员作品 + upload18/helvid 签名 HLS，标题自动机翻中文 |

注意：

- 这 4 个文件**不在** `fw-modules.fwd`、`fw-all.js` 里，也不套用本仓库的 `multiSource` 规范；
- 上游更新时直接整份替换 `widgets/{getav,one,perverzija,supjav}.js`，
  `npm run generate:index` 会自动把新版本号写进 `fw-rex-4.fwd`；
- GetAV 首页取数依赖 `RSC: 1` 请求头，被 Cloudflare 拦时的表现是「网络请求失败」；
- 清单里的组件 id 是上游命名（`user.*`），与本仓库其它模块不冲突。

## 里番 / 动漫模块（单独导入地址）

首页模块与播放源成对安装，缺一个就没线路：

| 站点 | 首页模块 | 播放源 |
| --- | --- | --- |
| YinHentai（里番/无修，中文分类） | `yinhentai.js` | `yinhentai-resource.js` |
| Hentaimama（动漫 HLS） | `hentaimama.js` | `hentaimama-resource.js` |
| Hanime（hanime.tv，**需填自建解析地址**） | `hanime.js` | `hanime-resource.js` |
| HStream | `hstream.js` | `hstream-resource.js` |

地址把文件名拼到下面任一个前缀后面：

```text
https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/widgets/
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/widgets/
```

例如 YinHentai 两个文件：

```text
https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/widgets/yinhentai.js
https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/widgets/yinhentai-resource.js
```

> Hanime 已取消公开播放直链，播放源必须在全局参数里填**已配置账号的自建解析服务地址**，
> 否则列表能看、播放没线路。


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
| MissAV | 首页 | `widgets/missav.js` | 首页、分类、搜索、详情 |
| MissAV 播放源 | 资源 | `widgets/missav-resource.js` | HLS/MP4 播放线路 |
| Hentaimama | 首页 | `widgets/hentaimama.js` | 首页、分类、搜索、详情和分集 |
| Hentaimama 播放源 | 资源 | `widgets/hentaimama-resource.js` | 动漫站 HLS 播放线路 |
| Avbebe | 首页 | `widgets/avbebe.js` | WordPress REST 列表、8 个可播放分类、搜索与详情 |
| Avbebe 播放源 | 资源 | `widgets/avbebe-resource.js` | 解析文章内嵌 HLS 直链（需 Referer） |
| XChina | 首页 | `widgets/xchina.js` | 影片列表、20 个分类/精选入口、搜索与详情 |
| XChina 播放源 | 资源 | `widgets/xchina-resource.js` | 由影片 hash 构造 HLS 直链（不校验 UA 的通用线路优先，主站与镜像备选） |
| Jable | 首页 | `widgets/jable.js` | 最近更新、热门、新作、12 个分类、搜索与详情 |
| Jable 播放源 | 资源 | `widgets/jable-resource.js` | 解析详情页 `hlsUrl`，片源不校验 UA |
| 黄果短剧 | 首页 | `widgets/huangguo.js` | 首页推荐、最近上新、排行榜、分类、专题、搜索与分集 |
| 黄果短剧 播放源 | 资源 | `widgets/huangguo-resource.js` | 默认线路与 HEVC 线路，播放前校验 CDN 鉴权头 |

> **分类是按实测可播放比例挑的**：Avbebe 里 aiovg 播放器的源（`cdn2020.com`，实测无条件 451）
> 与 turbonewvid（域名已失效）对应的分类不收录，硬加只会得到点进去播不了的条目。
> XChina 的分类、精选（`xs-*`）与中文字幕标签全部来自站点自身导航与详情页内链，逐个验证过可打开。
>
> **播放线路按播放器 UA 挑过**：`xchina.co` 对 okhttp / Java / curl 等 UA 的 `master.m3u8`、
> 变体与密钥全链路 403（表现是播放页一直转圈），只有浏览器、ExoPlayer、Dalvik、VLC 等 UA 能过；
> 因此 XChina 优先返回同源托管、不校验 UA 的通用线路，`52cute.com`（Avbebe）则必须带
> `Referer: https://avbebe.com/`，两个播放源模块都已经按这个要求带好了请求头。

> **Avbebe / XChina / Jable 不在 `fw-all.js` 里**：总模块受单文件体积上限约束（`MAX_BYTES = 240 KB`），
> 且三者对 `avbebe:` / `xchina:` / `jable:` 链接已做短路处理，不会触发内置源的 6 源并发兜底。

### 当前版本

升级后对不上号，多半是缓存；先核对这个表，再决定是清缓存还是等 CDN 刷新。

| 文件 | 版本 | 文件 | 版本 |
| --- | --- | --- | --- |
| `fw-all.js` | 1.0.6 | `maccms-source.js` | 1.0.0 |
| `hstream.js` | 2.1.1 | `hstream-resource.js` | 1.0.0 |
| `yinhentai.js` | 1.1.0 | `yinhentai-resource.js` | 1.2.0 |
| `hanime.js` | 1.1.0 | `hanime-resource.js` | 1.1.0 |
| `hentaimama.js` | 1.2.0 | `hentaimama-resource.js` | 1.3.1 |
| `missav.js` | 1.0.4 | `missav-resource.js` | 1.1.0 |
| `4kvm-resource.js` | 1.0.1 | `xchina.js` | 1.0.3 |
| `avbebe.js` | 1.0.1 | `xchina-resource.js` | 1.0.2 |
| `avbebe-resource.js` | 1.0.1 | `jable-resource.js` | 1.0.0 |
| `jable.js` | 1.0.0 | `huangguo.js` | 1.0.0 |
| `huangguo-resource.js` | 1.0.0 | | |

### 最近变更

- **新增 `huangguo.js` / `huangguo-resource.js` 1.0.0**：黄果短剧。该站的搜索与播放接口是自研加密通道
  （ECDH P-256 握手 + HMAC-SHA256 派生 + AES-256-GCM 双向加密），Forward 运行时没有 WebCrypto，
  因此加密层以纯 JS 手写并逐项对 `node:crypto` 校验。**不在 `fw-all.js` 里**，原因见下节。

- **新增 `jable.js` / `jable-resource.js` 1.0.0**：主域名 `jable.tv` 被 Cloudflare 5 秒 JS 挑战挡住
  所有非浏览器客户端（列表页连 curl 都要带全套浏览器头才过得去），因此取页统一走官方备用域名
  `fs1.app`；片源在 `mushroomtrack.com`，实测 okhttp / 浏览器 / ExoPlayer UA、无 Referer
  都能取到播放列表、AES-128 密钥与分片。`fw-all.js` 同步到 1.0.6（`jable:` 链接短路 + 域名路由）。

- **`xchina.js` 1.0.3 / `xchina-resource.js` 1.0.2**：`xchina.co` 对播放器 UA（okhttp / Java / curl）
  的 master、变体、密钥全链路 403，导致播放页一直转圈。改为优先下发同一套内容但**不校验 UA**
  的通用线路，另列主站与镜像两条备用；测试用 okhttp UA + 无自定义头端到端验证。
- **`xchina.js` 1.0.2**：取页失败时依次换 `tw/en/kr` 镜像域名重试，并把失败域名与状态码写进占位提示
  （原来一律显示「网络请求失败」，无法区分 403 与网络问题）。
- **`avbebe.js` 1.0.1 / `xchina.js` 1.0.1 / 两个播放源 1.0.1**：入参先 `decodeURIComponent` 再匹配，
  兼容 `videoUrl`、`archives` 链接、`/hls/<hash>/` 形态；取不到 id 时按片名站内搜索兜底；
  分类补到 Avbebe 8 个可播放分类、XChina 20 个入口。
- **新增两站子集清单 `fw-avbebe-xchina.fwd`**：只装 Avbebe + XChina 的 4 个组件。
- **`fw-all.js` 1.0.5**：命中已知站点链接时单源直查（MissAV / Hentaimama 路由修正），起播更快。


## 黄果短剧（需要单独安装）

站点 `huangguoai.com` 的搜索与播放接口不是公开 REST，而是一条自研加密通道：

1. 客户端每次会话临时生成 ECDH P-256 密钥对，`POST /api/{scope}/request` 发 `hello` 完成握手；
2. 用共享点做 HKDF 风格派生（`HMAC-SHA256`）拆出 `req` / `res` 两把密钥；
3. 请求与响应均 AES-256-GCM，12 字节 IV 里编码序列号，AAD 绑定 `info + 方向 + seq + 时间戳`，
   服务端回包的 `kid` / `sid` / `seq` / `ts` 必须逐项对上；会话过期自动重握一次。

Forward 的 widget 运行时**没有 WebCrypto**，所以 `lib/huangguo.js` 里 SHA-256、HMAC、AES-256-CTR、
GHASH（含 GF(2^128) 乘法）、P-256 点运算全部是纯 JS 实现，`tests/huangguo.test.js` 用 `node:crypto`
当服务端跑了一遍完整握手 + 加密调用（`npm run test:huangguo`）。要改这个源，请改 `lib/` 再
`npm run build:huangguo`。

**它不在 `fw-all.js` 里**：总模块已 242 KB，逼近 `MAX_BYTES = 240 KB` 的保守上限，再塞两个 36 KB
的文件会让客户端直接报「模块无效或解析失败」。

已知限制，按重要性排：

- **封面可能是密文**。站点详情页封面走同一套加密协议，由原生解码器解密；Forward 没有等价能力，
  拿到的原图 URL 会显示成占位。列表不受影响，若在意可在全局参数里把封面关掉。
- **播放头是静态的**。WeBox 那套能在播放期按请求逐个判断同源/跨域再补 `Referer`、`Origin` 和
  CDN 鉴权头（`authKey` / `authValue` / `x-cdn-app`）；Forward 只能给播放器一份固定头。
  因此 `huangguo-resource.js` 在返回线路前先用鉴权头探一次 master（`probing` 默认开），
  通过才带鉴权头下发，未通过则标注「未校验」并退回不带凭据的公开头，避免把凭据发给第三方 CDN。
- **没有 live 测试**。主站 `huangguoai.com` 在部分网络环境下连不上（CloudFront 前置，TLS 握手被拒），
  备用站 `huangguoai.ai` 只是「官方最新地址入口」页，不是同一套接口。所以 `tests/huangguo.test.js`
  只能覆盖加密层、解析与传输（用 mock 服务端），站点结构变化仍需在真机上验证。
- **栏目是半枚举的**。分类目录是运行时接口，`WidgetMetadata` 里只能静态声明；已知短剧 / 漫剧两个
  历史栏目（`ai-duanju` / `ai-manju`，站点目录仍挂着但接口返回 410）已做别名，其余栏目请在
  「自定义栏目 route」里手填，专题在「专题标识」里填 slug。

## 苹果CMS 聚合源（需要单独安装）

面向**苹果CMS / MacCMS V10 采集接口**（形如 `https://域名/api.php/provide/vod/`）的通用播放源。
这类接口是公开协议约定，站点换内容不影响接口形态，因此比逐站 HTML 抓取稳定得多。

**它不在 `fw-all.js` 里**（原因见上一节），需要单独导入一个 24 KB 的文件：

```text
https://hyj1817.github.io/fw-modules/widgets/maccms-source.js
```

备选地址（任选其一，哪个通就用哪个）：

```text
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/widgets/maccms-source.js
https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/widgets/maccms-source.js
```

> 三个地址内容完全相同。`raw.githubusercontent.com` 在部分网络下不稳定，
> 若导入或刷新失败，优先试 `hyj1817.github.io` 那个。

全局参数：

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| 是否启用聚合搜索 | 启用 | 仅当显式选择「禁用」时才返回空 |
| 资源站列表 | 内置金鹰资源 | 每行一条：`名称,接口地址`；也可填 JSON 数组 |
| 每站最多搜索页数 | 5 页 | 精确片名常常不在第 1 页，接口每页固定 20 条 |
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
- 模块升级后如未立即生效，请在 Forward 中清理模块缓存并确认版本号已经更新（对照「当前版本」表）。
- 走 jsDelivr 的地址有 CDN 缓存：升级后仍拿到旧文件时，打开
  `https://purge.jsdelivr.net/gh/HYJ1817/fw-modules@main/widgets/文件名.js`
  手动清一次，或改用 `raw.githubusercontent.com` 地址。
- 站点有风控时会出现「403 / 一直转圈」两类表现：前者是取页被拦，后者多为播放地址被拦，
  两者都已在下文对应模块里做过针对性处理，改代码前先按「维护」一节的流程确认现象。
- Jable 的取页依赖官方备用域名（当前 `fs1.app`）：站点页脚的「備用網址」仓库会更新域名，
  失效时把 `widgets/jable.js` 与 `widgets/jable-resource.js` 里的 `HOSTS` 换成新域名即可，
  片源域名（`*.mushroomtrack.com`）不用改。
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

黄果短剧需要首页 + 播放源两个文件（同样是 Raw 地址替换文件名）：

```text
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/widgets/huangguo.js
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/widgets/huangguo-resource.js
```

## 维护

> **逐站播放源（`*-resource.js`）失效时，看 [`docs/fw-widget-maintenance.md`](docs/fw-widget-maintenance.md)。**
> 里面有故障分类表、5 步诊断流程、已实测的核验脚本模板、五类常见故障的修法，
> 以及发布流程与验收标准。
>
> 苹果CMS 采集接口类（`maccms-source.js`）不需要那套流程 —— 它依赖公开协议，
> 站点换内容不影响接口形态。

### 目录约定

```
lib/maccms.js                 苹果CMS 适配层（源码，不直接分发）
lib/entries/*.js              入口层（WidgetMetadata + 导出函数）
lib/huangguo.js               黄果短剧适配层（加密会话、解析、播放线路）
scripts/build-maccms.js       把适配层内联进入口层 → widgets/
scripts/build-huangguo.js    同上，黄果短剧入口层 → widgets/huangguo{,-resource}.js
scripts/build-fw-all.js       聚合总模块（改内联源码或路由时记得 bump 其中的 version）
scripts/generate-index.js     生成订阅清单（三份主清单 + 两站子集 + fw-modules.json）
scripts/check-manifests.js    一致性校验
widgets/                      分发物（含生成物，勿手改）
```

`widgets/maccms-source.js`、`widgets/fw-sourcecheck.js`、`widgets/huangguo.js`、`widgets/huangguo-resource.js` 是**生成物**，
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
npm run test:hentaimama:live
npm run test:missav:live
npm run test:yinhentai:live
npm run test:avbebe:home:live
npm run test:avbebe:resource:live
npm run test:xchina:home:live
npm run test:xchina:resource:live
npm run test:jable:home:live
npm run test:jable:resource:live
```

> XChina 有 CF 限流：突发请求会被拦成 403 `Just a moment...`，
> 对应测试在请求之间加了约 900ms 间隔，连跑两个 xchina 测试前建议稍等片刻。
>
> XChina 两个测试的传输层走 `curl.exe`：Cloudflare 会把 Node 自带的 HTTP 客户端
> 拦成 403，用 curl 才能区分「代码问题」与「客户端指纹问题」。
> `test:xchina:resource:live` 还会用 `okhttp` UA、不带任何自定义头跑一遍
> master → 变体 → 密钥，确认播放器侧也能取到片子（之前播放页一直转圈就是这个原因）。
>
> Jable 两个测试同样走 `curl.exe`：`fs1.app` 会按客户端指纹把 Node 的请求拦成 403，
> 但 curl 与 Python 的普通 HTTP/1.1 客户端都能正常取页。`test:jable:resource:live`
> 也用 `okhttp` UA 验证了播放列表 → AES 密钥 → 分片整条链。

站点结构随时可能变化；若模块失效，请先运行 `npm run test:maccms:live` 与源站自检模块，
区分「代码问题」与「站点问题」，再动手改。
