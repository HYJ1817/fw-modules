# fw模块

个人整理的 Forward 首页模块与播放源。仓库中的模块均为独立 JavaScript 文件，可单独导入，也可以通过订阅清单一次添加。

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

## 分流规则集

仓库里所有模块用到的站点域名已经整理成规则集，随模块更新一起维护（`npm run generate:rules` 生成，
`npm run check:rules` 校验覆盖，缺域名会直接报错）：

| 客户端 | 文件 | 说明 |
| --- | --- | --- |
| Quantumult X | `rules/fw-modules.qx.list` | `host-suffix` 语法，可作为 `filter_remote` 引用 |
| Surge / Loon / Stash / Shadowrocket | `rules/fw-modules.surge.list` | `DOMAIN-SUFFIX` 语法 |
| Clash / Mihomo | `rules/fw-modules.clash.yaml` | `rule-provider`（classical），只含域名，策略在 RULE-SET 那行指定 |

```text
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/rules/fw-modules.qx.list
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/rules/fw-modules.surge.list
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/rules/fw-modules.clash.yaml
```

Quantumult X 引用示例（策略名 `PROXY` 是占位符，换成自己的策略组，比如 `Emby`）：

```text
[filter_remote]
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/rules/fw-modules.qx.list, tag=fw-modules, force-policy=Emby, enabled=true
```

Clash 引用示例：

```yaml
rule-providers:
  fw-modules:
    type: http
    behavior: classical
    url: https://raw.githubusercontent.com/HYJ1817/fw-modules/main/rules/fw-modules.clash.yaml
    path: ./rules/fw-modules.yaml
    interval: 86400
rules:
  - RULE-SET,fw-modules,PROXY
```

规则按内容分了五组（里番 / 短剧 / AV / ONE 一个 / 影视），每条后面注明了归属模块。
**ONE 一个的后端 API 与图床域名会随机轮换**，文件里列的是当前模块内的那一批，轮换后需要重新生成。

## 订阅（按内容分组）

按内容拆成四份，**互不重叠，合起来等于全部 29 个组件**。只订阅你要的类型，列表里就不会混进别的：

| 分组 | 清单 | 组件 | 包含 |
| --- | --- | --- | --- |
| 里番 | `fw-hentai.fwd` | 9 | Hentaimama / HStream / YinHentai / Hanime（各含首页 + 播放源）+ girigiri 动漫 |
| 短剧 | `fw-drama.fwd` | 3 | 黄果短剧 / 黑桃短剧 |
| AV | `fw-av.fwd` | 15 | MissAV / Jable / XChina / Avbebe / SupJav 新版 / JAVDay / 91Porn + 四合一第三方四个 |
| 影视 | `fw-movie.fwd` | 2 | 4KVM 播放源 / 苹果CMS 聚合源 |

**订阅地址（推荐 raw，5 分钟内生效）**

```text
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/fw-hentai.fwd
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/fw-drama.fwd
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/fw-av.fwd
https://raw.githubusercontent.com/HYJ1817/fw-modules/main/fw-movie.fwd
```

**CDN 备用**（jsdelivr 对 @main 的滚动缓存可能滞后数小时，清单本身可能旧；组件 URL 已锁定 commit，不受影响）：

```text
https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/fw-hentai.fwd
https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/fw-drama.fwd
https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/fw-av.fwd
https://cdn.jsdelivr.net/gh/HYJ1817/fw-modules@main/fw-movie.fwd
```

> 清单里的组件 URL 形如 cdn.jsdelivr.net/gh/HYJ1817/fw-modules@<commit-sha>/widgets/…，锁定到提交时刻的不可变版本：订阅一更新就能拿到新组件，不会再被 jsdelivr 的滚动缓存卡住（此前 @main 缓存曾把 one.js、girigiri 的旧版压了数小时）。raw 清单 5 分钟内生效，优先用它。

> **全量清单与四合一子集已下线。** `fw-modules.fwd`、`fw-modules-cdn.fwd`、`fw-modules.json`、
> `forward-widgets.fwd`、`fw-rex-4.fwd`、`fw-avbebe-xchina.fwd` 都不再生成 —— 它们的内容已经全部
> 并入上面四份分组。原来订阅全量的，删掉那条来源、改成订阅需要的分组即可。
>
> 分组清单由 `npm run generate:index` 生成：组间出现同一个组件、或有文件没归入任何分组，都会直接报错。

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
| Jable | 首页 | `widgets/jable.js` | nibiru 版：185 个分类入口、搜索、详情；ijk 播放修复无声，站点可切 jable.tv / fs1.app |
| Jable 播放源 | 资源 | `widgets/jable-resource.js` | 解析详情页 `hlsUrl`，片源不校验 UA |
| 黄果短剧 | 首页 | `widgets/huangguo.js` | 首页推荐、最近上新、排行榜、分类、专题、搜索与分集 |
| 黄果短剧 播放源 | 资源 | `widgets/huangguo-resource.js` | 默认线路与 HEVC 线路，播放前校验 CDN 鉴权头 |
| girigiri 动漫 | 首页 + 资源 | `widgets/girigiri.js` | 动漫站首页、日番、搜索、详情与分集（WeBox 插件移植） |
| 黑桃短剧 | 首页 + 资源 | `widgets/heitao.js` | 苹果CMS 短剧站：首页、栏目、题材、搜索、详情与分集（WeBox 插件移植） |
| JAVDay | 首页（内联播放） | `widgets/javday.js` | 10 个栏目 + 搜索，详情直接给 m3u8（上游原生模块，已补元信息与搜索地址） |
| 91Porn | 首页（内联播放） | `widgets/porn91.js` | 6 个分类列表 + 详情取 mp4（上游打包产物，已补 type 与状态码兼容） |
| SupJav 新版 | 首页 + 资源 | `widgets/supjav-webox.js` | WeBox 插件移植：多镜像、语言目录、embed 接口探测、packer 解包、广告过滤 |

> **分类是按实测可播放比例挑的**：Avbebe 里 aiovg 播放器的源（`cdn2020.com`，实测无条件 451）
> 与 turbonewvid（域名已失效）对应的分类不收录，硬加只会得到点进去播不了的条目。
> XChina 的分类、精选（`xs-*`）与中文字幕标签全部来自站点自身导航与详情页内链，逐个验证过可打开。
>
> **播放线路按播放器 UA 挑过**：`xchina.co` 对 okhttp / Java / curl 等 UA 的 `master.m3u8`、
> 变体与密钥全链路 403（表现是播放页一直转圈），只有浏览器、ExoPlayer、Dalvik、VLC 等 UA 能过；
> 因此 XChina 优先返回同源托管、不校验 UA 的通用线路，`52cute.com`（Avbebe）则必须带
> `Referer: https://avbebe.com/`，两个播放源模块都已经按这个要求带好了请求头。

> 三者对 `avbebe:` / `xchina:` / `jable:` 链接都做了短路处理，不会触发别的源的聚合兜底。

### 当前版本

升级后对不上号，多半是缓存；先核对这个表，再决定是清缓存还是等 CDN 刷新。

| 文件 | 版本 | 文件 | 版本 |
| --- | --- | --- | --- |
| `maccms-source.js` | 1.0.0 | `4kvm-resource.js` | 1.0.1 |
| `girigiri.js` | 1.0.1 | `supjav-webox.js` | 1.0.2 |
| `heitao.js` | 1.0.0 | `javday.js` | 1.2.0 |
| `porn91.js` | 0.9.6 | | |
| `getav.js` | 0.5.0 | `one.js` | 2.2.0 |
| `perverzija.js` | 1.2.0 | `supjav.js` | 1.3.0 |
| `hstream.js` | 2.1.1 | `hstream-resource.js` | 1.0.0 |
| `yinhentai.js` | 1.1.0 | `yinhentai-resource.js` | 1.2.0 |
| `hanime.js` | 1.1.0 | `hanime-resource.js` | 1.1.0 |
| `hentaimama.js` | 1.2.0 | `hentaimama-resource.js` | 1.3.1 |
| `missav.js` | 1.3.1 | `missav-resource.js` | 1.2.1 |
| `4kvm-resource.js` | 1.0.1 | `xchina.js` | 1.0.3 |
| `avbebe.js` | 1.0.1 | `xchina-resource.js` | 1.0.2 |
| `avbebe-resource.js` | 1.0.1 | `jable-resource.js` | 1.0.0 |
| `jable.js` | 1.3.0 | `huangguo.js` | 1.0.4 |
| `huangguo-resource.js` | 1.0.1 | `jable.js` | 1.0.0 |

### 最近变更

- **新增 `porn91.js` 0.9.6**：91Porn（上游 baranwang/forward-widget 的打包产物）。规范化两处：
  模块补 `type: "video"`、元信息补 icon/author；**上游用 `resp.statusCode` 判断成功，而 Forward 的响应只有
  `status`，会永远抛错**，改成两者都认。实测：列表 24 条、详情返回 `la.btc620.com` 的 mp4 且 200。

- **`jable.js` 换成 nibiru 版 1.3.0**：分类入口从 12 个恢复到 185 个（含女优、衣着、剧情、地点等系列），
  详情带 `playerType: "ijk"` 修无声问题，并补了防盗链头。规范化处理：模块补 `id`/`type`、补 `icon`、
  加「站点域名」参数（jable.tv / fs1.app / 自定义，请求 URL 与 Referer 一起改写）、解析不再写死 `jable.tv`
  （切到 fs1.app 后页面链接就是 fs1.app，原来会被过滤成空列表）、列表失败返回提示条目而不是抛异常。

- **新增 `javday.js` 1.2.0**：JAVDay（`javday.app`）上游是 Forward 原生模块，直接收进仓库并补齐规范：
  10 个栏目各配一个固定入口函数（不再依赖宿主的 `type:"constant"` 参数）、模块补 `id`/`type`、补 `icon`、
  搜索从模块改成元信息。另外站点对 `/search/?wd=` 查询串形式回 403，构建时改成路径形式 `/search/<关键词>/`。
  实测：最新 28 条、人气 28 条、无码流出 24 条、玩偶姐姐 24 条、搜索 20 条、详情返回 `javday.homes` 的 m3u8。

- **新增 `heitao.js` 1.0.0**：黑桃短剧（`heitaodj.com`，苹果CMS）的 WeBox 插件移植，并入「短剧」分组。
  站点用 `/index.php/vod/...` 标准路径，播放页给 `player_aaaa` 配置；上游带年龄门 Cookie 处理与导航发现，
  所以按桥接方式移植（`lib/vendor/` 放原文，`lib/entries/` 放桥接，`npm run build:heitao` 拼接）。
  实测：首页 93 条、栏目 30 条、搜索 4 条、详情 1 集、master m3u8 200。分流域名 `heitaodj.com` 与
  `djqiepian.app` 已并入规则集。

- **新增分流规则集** `rules/fw-modules.{qx.list,surge.list,clash.yaml}`：覆盖仓库 26 个模块用到的
  52 个域名，按内容分五组；`npm run generate:rules` 生成、`npm run check:rules` 校验（缺域名直接报错，
  已挂进 `verify:fast`）。

- **`missav.js` 1.3.1**：列表取数加多镜像回退。当前站点被 CF 拦时，依次换 `missav.ws` → `missav.live` →
  `missav.fans` 再试一次，全失败时明确写出每个镜像的失败原因（HTTP 状态 / 无内容 / 请求失败），
  不再只丢一句「已被风控」。实测宿主确实会遇到「选好女优却只有一条风控提示」。
- **`missav.js` 1.3.0**：女优模块改成**枚举式**「女优影片」——排行前 50 名做成枚举参数，
  选谁看谁的影片（默认第一位）。之前两版（头像墙 / 无封面列表）都受宿主条目渲染形态限制，
  枚举是宿主验证过的形态，不占首页版面、也不会出现灰块。
- **`missav.js` 1.2.1**（已被 1.3.0 取代）：女优排行改列表式。之前给条目带了头像，宿主按竖版影片卡渲染，一屏只能塞三张脸；
  现在不给封面，宿主按无海报条目排成紧凑列表；点进去仍是该女优的影片列表，每部片一集。
- **`missav.js` 1.2.0**：新增「女优排行 TOP50」模块。排行名次、女优链接与头像直接内置
  （2026-11 从 `/actresses/ranking` 抓的前 50 名），点进去是一个人一页的影片列表，每部片作为一集，
  播放走同一条 missav 播放源；不依赖排行页实时抓取，也不受 CF 挑战影响。
  `npm run test:missav-actress` 覆盖榜单结构与女优页解析。

- **`missav.js` 1.1.0 / `missav-resource.js` 1.2.1**：站点可切。MissAV 换域名是常态
  （`missav.fans` / `missav.ws` / `missav.live` 共用同一套 `/dm{id}/cn/...` 路径，实测 ws 会把 dm265
  重定向到 dm278），现在首页模块有「站点域名」参数，选 ws 时请求 URL 与 Referer/Origin 一起改写；
  播放源则跟随链接自身的域名。`npm run test:missav-site` 覆盖切换与自定义地址。

- **`missav-resource.js` 1.2.0**：起播优化。原来把页面里扫到的所有 m3u8/mp4 原样丢给播放器（含广告域、
  重复项、死链），播放器往往先撞上一条慢线路才回落。现在：剔除广告/占位域、去重、HLS 与媒体域优先；
  并发探测前 6 条（3.5 秒上限，m3u8 还要求真以 `#EXTM3U` 开头），只留下能播的、按耗时排序、
  线路名带 ms；master 只有一路变体时直接下发变体；结果缓存 10 分钟。测速可用全局参数关掉。

- **`huangguo.js` 1.0.4**：专题按标题也能匹配。实测宿主会把枚举的**标题**（「百合女同」）而不是值
  （`baihe-nvtong`）传给模块，站点对标题直接回「专题不存在或已下架」。现在标题、去「专辑」尾、
  slug 三种写法都能对上；实测 8 种输入全通。

- **`huangguo.js` 1.0.3**：专题全量内置（`/api/topics` 实测 11 个：精品高分 / 家庭伦理 / 灵异诡事 /
  校园青春 / 末世重生 / 百合 / 乡村 / 古风 / 仙侠 / 男同 / 欧美），不再手填 slug；专题接口的影片列表
  在 `videos.{items,pagination}` 里（之前直接把外层传给解析器，永远返回空）；slug 放行站点自带的
  长破折号（`xiaoyuan—qingcun`）；业务层偶发失败也重试（实测两轮 11/11 全通，漫剧 30 条）。

- **`huangguo.js` 1.0.2**：分类修复。站点把「AI 换脸」「AI 魔改」两个栏目下线了（接口回 410），
  从枚举里移除并给死栏目明确提示；分类参数现在同时认 value 和标题（短剧 / 漫剧 / AI换脸）；
  公开接口偶发 5xx / 超时自动重试一次（实测 502 重试后恢复 30 条）。

- **组件 URL 锁定 commit sha**：jsdelivr 对 `@main` 的滚动缓存会把旧组件压住数小时
  （one.js、girigiri 都中过招，`purge` 也不一定生效）。清单里的组件地址改为
  `cdn.jsdelivr.net/gh/HYJ1817/fw-modules@<commit-sha>/widgets/…`，不可变内容永远新鲜；
  订阅地址本身改推 raw（缓存 5 分钟）。`check:manifests` 的域名校验不受影响。

- **`girigiri.js` 1.0.1**：补 `atob` / `TextDecoder` 兜底。Forward 的 widget 运行时没有保证提供这两个，
  上游插件解码 `encrypt=2` 的播放地址时两者都用，缺了就报「播放地址编码无效」。修完后实测：
  首页 92 条、详情 9 集、线路解析出 `akua.girigirilove.com` 的 m3u8 且 200。

- **新增 `girigiri.js` 1.0.0**：动漫站 `anime.girigirilove.icu` 的 WeBox 插件移植，放进「里番」分组。
  站点是普通 HTML + `player_aaaa` 脚本，没有加密通道或媒体改写，所以只需要桥接层；
  播放地址的 `encrypt=1/2`（%u 转义 / base64）也一并沿用。分页按游标向后走，最多缓存 10 页。

- **下线全量清单与四合一子集**：`fw-modules.fwd` / `fw-modules-cdn.fwd` / `fw-modules.json` /
  `forward-widgets.fwd` / `fw-rex-4.fwd` / `fw-avbebe-xchina.fwd` 全部删除，只保留里番 / 短剧 / AV / 影视
  四份分组清单。四合一那四个模块已并进 AV 分组，`generate-index` 现在只产分组，
  `check:manifests` 与 `npm test` 改为校验「四组互不重叠 + 覆盖全部组件 + 版本同步」。

- **新增四份分组订阅**（`fw-hentai` / `fw-drama` / `fw-av` / `fw-movie`）：按内容拆分，互不重叠，
  合起来正好等于「主清单 21 个 + 四合一 4 个」。生成器对组间重叠与缺件都直接报错。

- **`supjav-webox.js` 1.0.2**：起播与拖动。master 只有一路变体时直接下发变体地址（本站实际只有 480p 一路），
  省掉播放器启动时的一次往返；站点偶发超时自动重试一次。实测母带 → 变体 → 分片链路：master 1.6s、变体 1.1s、
  中段分片（模拟拖动）2.8s，其中绝大部分是往返时延而非带宽。

- **`supjav-webox.js` 1.0.1**：起播优化。详情与播放解析各自加了内存缓存（详情 30 分钟、线路 10 分钟），
  打开详情后用零延时预取首集线路，点多线路时并发测首字节并按快慢排序。实测同一部片：线路解析 5.2s → 6ms，
  详情 1.8s → 1ms。预取可在全局参数里关掉。

- **新增 `supjav-webox.js` 1.0.0**：把 WeBox 的 SupJav 插件（`blog.supjav.webox` 1.0.2）移植成 Forward 模块。
  不重写上游逻辑，只补一层运行时桥接（`ctx.*` → `Widget.*`），上游原文逐字放在 `lib/vendor/`，
  由 `npm run build:supjav-webox` 拼接。比现有的 `user.supjav` 多了多镜像、语言目录、
  embed 接口自动探测、packer 解包与广告过滤，实测最新 / 分类 / 搜索 / 详情 / master.m3u8 全通。

- **`fw-rex-4.fwd` 改名「FW 四合一（第三方）」**：四合一子集一直「添加失败：模块信息校验失败」，真因不是模块字段，
  而是清单标题里的独立单词 `Rex` 触发了客户端的违规字样过滤（只查清单 JSON 的 title / 条目的 title、
  description、author，不查 `.js`）。同时给四个模块补了 `type` 与 `icon`/`site` 字段，纯为对齐本仓库风格。
  `check:manifests` 现在会直接拦下含独立 `Rex` 的写法，避免再踩。

- **`huangguo.js` / `huangguo-resource.js` 1.0.1**：站点 2026-11-12 可达后补做了真机链路验证，修了三个只有跑真站才会暴露的问题：
  首页模块原来返回 `{items, nextCursor}`，而 Forward 的首页模块要求**直接返回数组**，界面只会显示「没有内容」；
  播放请求体里的 `body` 要用**标准 base64**（`e30=`），去掉 padding 会被站点判 400；
  分类枚举改成站点真实栏目（`ai-duanju` / `ai-manju` / `ai-huanlian` / `ai-mogai`），
  `ai-huanlian`、`ai-mogai` 目前站点回 410「内容已下线」。另外封面默认改为**不加载**：
  站点封面是 AES-128-CBC 密文（`decryptKey` / `decryptIV` 由 `crypto-image-protocol.js` 下发），
  Forward 没有解码器，拉回来也只是占位，一页还白拉数 MB。

- **新增 `huangguo.js` / `huangguo-resource.js` 1.0.0**：黄果短剧。该站的搜索与播放接口是自研加密通道
  （ECDH P-256 握手 + HMAC-SHA256 派生 + AES-256-GCM 双向加密），Forward 运行时没有 WebCrypto，
  因此加密层以纯 JS 手写并逐项对 `node:crypto` 校验。它只在「短剧」分组里。

- **新增 `huangguo.js` / `huangguo-resource.js` 1.0.0**：黄果短剧。该站的搜索与播放接口是自研加密通道
  （ECDH P-256 握手 + HMAC-SHA256 派生 + AES-256-GCM 双向加密），Forward 运行时没有 WebCrypto，
  因此加密层以纯 JS 手写并逐项对 `node:crypto` 校验。它只在「短剧」分组里。

- **新增 `jable.js` / `jable-resource.js` 1.0.0**：主域名 `jable.tv` 被 Cloudflare 5 秒 JS 挑战挡住
  所有非浏览器客户端（列表页连 curl 都要带全套浏览器头才过得去），因此取页统一走官方备用域名
  `fs1.app`；片源在 `mushroomtrack.com`，实测 okhttp / 浏览器 / ExoPlayer UA、无 Referer
  都能取到播放列表、AES-128 密钥与分片。当时的 `fw-all.js` 同步到 1.0.6（`jable:` 链接短路 + 域名路由），该文件现已下线。

- **`xchina.js` 1.0.3 / `xchina-resource.js` 1.0.2**：`xchina.co` 对播放器 UA（okhttp / Java / curl）
  的 master、变体、密钥全链路 403，导致播放页一直转圈。改为优先下发同一套内容但**不校验 UA**
  的通用线路，另列主站与镜像两条备用；测试用 okhttp UA + 无自定义头端到端验证。
- **`xchina.js` 1.0.2**：取页失败时依次换 `tw/en/kr` 镜像域名重试，并把失败域名与状态码写进占位提示
  （原来一律显示「网络请求失败」，无法区分 403 与网络问题）。
- **`avbebe.js` 1.0.1 / `xchina.js` 1.0.1 / 两个播放源 1.0.1**：入参先 `decodeURIComponent` 再匹配，
  兼容 `videoUrl`、`archives` 链接、`/hls/<hash>/` 形态；取不到 id 时按片名站内搜索兜底；
  分类补到 Avbebe 8 个可播放分类、XChina 20 个入口。
- **新增两站子集清单 `fw-avbebe-xchina.fwd`**：只装 Avbebe + XChina 的 4 个组件。
- **`fw-all.js` 1.0.5**（已下线）：命中已知站点链接时单源直查（MissAV / Hentaimama 路由修正），起播更快。


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

`fw-all.js` 时代它进不了总模块（体积上限 240 KB）；总模块下线后，它只出现在「短剧」分组里。

已知限制，按重要性排：

- **封面是密文**。站点封面由 `crypto-image-protocol.js` 下发的 AES-128-CBC 密钥解密（key `f5d9…3670`，
  IV `97b6…fbe1`，无 padding），Forward 没有解码器，原图 URL 拉回来是几十万字节的乱码。
  因此封面默认关闭（也省流量，一页 30 条原本要白拉约 5 MB）。真要封面只能做「客户端解密 + data URI」，
  那是另一件事，且列表体积会爆。
- **播放头是静态的**。WeBox 那套能在播放期按请求逐个判断同源/跨域再补 `Referer`、`Origin` 和
  CDN 鉴权头（`authKey` / `authValue` / `x-cdn-app`）；Forward 只能给播放器一份固定头。
  因此 `huangguo-resource.js` 在返回线路前先用鉴权头探一次 master（`probing` 默认开），
  通过才带鉴权头下发，未通过则标注「未校验」并退回不带凭据的公开头，避免把凭据发给第三方 CDN。
- **live 状态**：2026-11-12 对 `huangguoai.com` 实测通过 —— 首页推荐 / 最近上新 / 排行榜 / 分类 / 加密搜索
  均返回 30 条，详情页 21 集，`playback` 握手解密成功并返回默认 + HEVC 两条线路，master.m3u8 与
  `crypt.key` 均 200。`npm run test:huangguo` 仍用 mock 服务端跑加密层，不依赖网络；真站回归请手动跑
  `node tests/huangguo-live.js`（该文件不在 `verify` 里，需要外网）。
- **栏目是半枚举的**。分类目录是运行时接口，`WidgetMetadata` 里只能静态声明；已知短剧 / 漫剧两个
  历史栏目（`ai-duanju` / `ai-manju`，站点目录仍挂着但接口返回 410）已做别名，其余栏目请在
  「自定义栏目 route」里手填，专题在「专题标识」里填 slug。

## 苹果CMS 聚合源（需要单独安装）

面向**苹果CMS / MacCMS V10 采集接口**（形如 `https://域名/api.php/provide/vod/`）的通用播放源。
这类接口是公开协议约定，站点换内容不影响接口形态，因此比逐站 HTML 抓取稳定得多。

它在「影视」分组里；也可以单独导入这一个 24 KB 的文件：

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
lib/vendor/*.js               第三方上游原文（逐字保留，不直接分发）
scripts/build-maccms.js       把适配层内联进入口层 → widgets/
scripts/build-huangguo.js    同上，黄果短剧入口层 → widgets/huangguo{,-resource}.js
scripts/build-supjav-webox.js 桥接层 + 上游 WeBox 原文 → widgets/supjav-webox.js
scripts/build-girigiri.js    同上，girigiri 动漫 → widgets/girigiri.js
scripts/build-heitao.js      同上，黑桃短剧 → widgets/heitao.js
scripts/generate-index.js     生成四份分组订阅清单（里番 / 短剧 / AV / 影视）
scripts/check-manifests.js    一致性校验
widgets/                      分发物（含生成物，勿手改）
```

`widgets/maccms-source.js`、`widgets/fw-sourcecheck.js`、`widgets/huangguo.js`、`widgets/huangguo-resource.js`、`widgets/supjav-webox.js`、`widgets/girigiri.js`、`widgets/heitao.js` 是**生成物**，
文件头带 `Do not edit directly` 标记。要改逻辑请改 `lib/`，然后重新构建。

### 标准流程

```bash
npm run build:maccms      # 内联适配层，生成单文件组件
npm run generate:index    # 重新生成四份订阅清单
npm run verify:fast       # 构建 + 单元测试 + 清单一致性校验
```
> **组件 URL 锁定了 commit sha**，锁的是「生成那一刻的 HEAD」。所以改完 widget 的正确顺序是：
> 提交代码 → `npm run generate:index` → 把清单变更再提交一次（或 amend）。
> 漏了第二步，清单会指向不含新代码的旧提交，用户拿到的就是旧组件 —— 这个坑已经踩过一次
> （清单指向 8493c76，那里面的 huangguo.js 还是 1.0.1）。

完整校验（含单测）：

```bash
npm run verify
```

### 为什么需要 check:manifests

早期版本的 `generate-index.js` 维护了一份**硬编码的文件列表**，比实际清单少 4 条。
跑一次 `npm run generate:index` 就会把这 4 条从清单里删掉，且不会有任何报错 ——
早期三份主清单长期条数不一致，就是这么来的；现在只保留分组清单，组间重叠与漏收都会报错。

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
npm run test:huangguo:live
npm run test:supjav-webox:live     # 需要 npm i（jsdom + jquery）
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
