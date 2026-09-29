# 逐站播放源维护手册

适用于 `widgets/*-resource.js` 这类**依赖具体站点 HTML 结构 / 私有接口**的播放源。

> 苹果CMS 采集接口类（`maccms-source.js`）**不需要**这套流程 —— 它依赖的是公开协议，
> 站点换内容不影响接口形态。本手册针对的是那些「站点一改版就失效」的模块。

---

## 一、先分类：故障属于哪一类

不要急着改代码。**先用下表把故障归类**，每一类的验证方法和修法完全不同。

| # | 类型 | 典型现象 | 怎么验证 |
| --- | --- | --- | --- |
| 1 | 站点不可达 | 请求直接失败 | `curl -I` 站点首页 |
| 2 | DOM 选择器失效 | 请求 200，但解析出 0 条 | 浏览器看列表页 DOM |
| 3 | 请求路径 / 参数变更 | 返回 404 或空数据 | 对比模块里的 URL 与浏览器网络面板 |
| 4 | Token / 签名流程变更 | 页面能取，播放接口 403 | 对比 token 的取值方式与提交位置 |
| 5 | 静态资源哈希变更 | wasm / js 文件 404 | 看页面里**实际引用**的文件名 |
| 6 | 需要认证 / 已下线 | 要求登录，或公告取消直链 | 看站点公告与登录态 |
| 7 | 宿主侧问题 | 模块压根没被调用 | 用探针 `fw-probe.js` 看有没有 `FW_PROBE` 日志 |

**第 7 类最容易被误判成模块坏了。** 先排除它，再动代码。

---

## 二、诊断流程（5 步）

### 第 1 步：确认模块是否被调用

装 `widgets/fw-probe.js`，从失败的入口播一次，看运行日志：

| 看到什么 | 结论 |
| --- | --- |
| 有 `FW_PROBE` 日志 + 能播探针线路 | 模块调用正常 → 继续第 2 步 |
| 有 `FW_PROBE` 日志但无线路 | 宿主过滤了返回值 |
| **连 `FW_PROBE` 都没有** | 模块未被调用 → 属于第 7 类，不用改代码 |

> **注意 `fw-all.js` 的分发逻辑**：`resolvePlayback` 在 link 带 `hstream:` / `4kvm:`
> 等前缀时**只调用对应的那一个源**。从某个首页模块起播时，其他源根本不会被查询。
> 要验证某个源，请把它**单独安装**，或从无前缀的来源（如 TMDB）起播。

### 第 2 步：用 `fw-trace.js` 定位断点

`widgets/fw-trace.js` 是总模块的诊断副本，会记录每个请求的阶段、状态码、耗时与字段存在性。
用法见 `docs/fw-trace.md`。重点看：

- `http-start` 之后有没有对应的 `http-end` —— 只有 start 没有 end，说明请求没返回
- 状态码是 403 / 404 / 200
- 哪一步之后就没有下文了

### 第 3 步：列出模块依赖的站点特征

**这一步是整个流程的核心。** 把模块代码里所有「依赖站点结构」的地方逐条列出来，
然后到站点上逐条核验。常见依赖项：

| 依赖项 | 在模块里的样子 |
| --- | --- |
| 列表页 URL 与分页参数 | `/search?q=`、`/page/2` |
| 结果条目的选择器 | `/<a href="\/play\/([^"]+)"/` |
| 详情页的集数结构 | `data-episode`、`dataid` |
| CSRF token | `name="_token"`、`csrf-token` |
| 播放接口路径 | `/player/api` |
| 请求头要求 | `Referer`、`X-Requested-With` |
| 静态资源 | `*.wasm`、签名用的 js |
| 取播放地址的字段 | `stream_url`、`quality_urls` |

### 第 4 步：写一个核验脚本逐条对照

不要用眼睛看，**写脚本逐条打印**。下面这个模板已实测可用，改三处变量即可：

```bash
#!/usr/bin/env bash
# 逐条核验模块依赖的站点特征
# 用法：改 SITE / KEYWORD，然后 bash check.sh
set -u
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"
SITE="https://www.4kvm.net"      # ← 改这里
KEYWORD="狂飙"                    # ← 改这里
Q=$(printf '%s' "$KEYWORD" | od -An -tx1 | tr ' ' '%' | tr -d '\n')

echo "=== 1. 站点可达性 ==="
curl -s -m 20 -o /dev/null -w "  首页 HTTP=%{http_code}\n" -H "User-Agent: $UA" "$SITE/"

# 阶段一：搜索页
curl -s -m 20 -o /tmp/search.html -H "User-Agent: $UA" "$SITE/search?q=$Q"
echo "=== 2. 搜索页特征 ==="
check() {  # check <文件> <说明> <正则>
  local n; n=$(grep -oE "$3" "$1" 2>/dev/null | head -3 | tr '\n' ' ')
  if [ -n "$n" ]; then printf "  ✅ %-24s %s\n" "$2" "$n"; else printf "  ❌ %-24s 未找到\n" "$2"; fi
}
check /tmp/search.html "结果条目链接" '/play/[A-Za-z0-9_-]+'
check /tmp/search.html "结果标题"     '<title>[^<]*</title>'

# 阶段二：详情页（用上一步抓到的第一个条目）
DETAIL=$(grep -oE '/play/[A-Za-z0-9_-]+' /tmp/search.html | head -1)
if [ -z "$DETAIL" ]; then
  echo "=== 3. 详情页特征 ==="
  echo "  ⚠️  搜索页没抓到条目链接，无法继续 —— 先修搜索环节"
  exit 0
fi
curl -s -m 20 -o /tmp/detail.html -H "User-Agent: $UA" "$SITE$DETAIL"
echo "=== 3. 详情页特征（$DETAIL）==="
check /tmp/detail.html "CSRF token"     'name="_token"[^>]*'
check /tmp/detail.html "静态资源哈希"   '[A-Za-z0-9_/.-]*\.wasm'
check /tmp/detail.html "集数属性"       'data-episode="[^"]*"'
check /tmp/detail.html "条目 id 属性"   'dataid="[^"]*"'
check /tmp/detail.html "播放器配置键"   'userlink\s*:'
```

**凡是 ❌ 的那一行，就是你要改的地方。** 注意区分「搜索页特征」和「详情页特征」——
它们在不同的页面上，别在搜索页里找一个详情页才有的东西。

实测输出示例（4kvm，站点不使用 CSRF，所以那一行是 ❌ —— **这是正常的**，
说明它不在模块的依赖清单里，不用修）：

```text
=== 1. 站点可达性 ===
  首页 HTTP=200
=== 2. 搜索页特征 ===
  ✅ 结果条目链接       /play/ch0jxgly2 /play/ch1okt4ie
  ✅ 结果标题           <title>搜索：狂飙 - 4k影视</title>
=== 3. 详情页特征（/play/ch0jxgly2）===
  ❌ CSRF token         未找到          ← 该站不用 CSRF，正常
  ✅ 静态资源哈希       /static/wasm/nbmovie_wasm_bg.d5d51939.wasm
  ✅ 集数属性           data-episode="1" data-episode="2"
  ✅ 条目 id 属性       dataid="8755" dataid="8756"
  ✅ 播放器配置键       userlink:
```

**判读要点**：❌ 不等于「坏了」。要拿它和**模块代码实际依赖的东西**对照 ——
模块没用 CSRF 的站点，这一行本来就该是 ❌。
**只有「模块依赖但站点上找不到了」才是故障。**


### 第 5 步：改代码 + 加实网测试

改完必须加一个实网测试，照抄 `tests/hstream-resource.live.test.js` 的结构：

```js
// tests/<模块名>-live.test.js
// 断言：能搜到、能拿到播放地址、地址是直链
assert.ok(resources.length > 0, "应至少返回一条线路");
assert.ok(/\.m3u8|\.mp4/.test(resources[0].url), "应是可直接播放的地址");
```

**没有实网测试的逐站适配，下次站点改版你还是只能靠用户反馈才知道坏了。**

---

## 三、五类常见故障的修法

### 2. DOM 选择器失效

最常见。站点改版换了 class / 结构，模块里的正则或选择器匹配不到。

**修法**：打开浏览器开发者工具，找到目标元素，抄它**当前**的属性。
**不要用易变的 class 名**，优先用 `data-*` 属性和稳定的 id。

### 3. 请求路径 / 参数变更

接口地址、查询参数名变了。

**修法**：浏览器网络面板里看真实请求，照抄路径与参数名。
注意区分 **GET 参数** 与 **POST body**。

### 4. Token / 签名流程变更

站点加了 CSRF 或签名。特征是：列表页能取到，但播放接口 403。

**修法**：
1. 先请求页面，从 HTML 里提取 token（`name="_token"` 或 `<meta name="csrf-token">`）
2. 提交时带上：`X-CSRF-TOKEN` 头，或 body 里的 `_token`
3. **带上 Cookie** —— 很多站点把 session 绑在 Cookie 上，只发 token 不够
4. 失败时**重新取一次 token 再重试**（会话可能过期）

### 5. 静态资源哈希变更

模块里硬编码了 `xxx.d5d51939.wasm` 这类带哈希的文件名。站点重新构建前端后哈希就变了。

**修法（短期）**：去页面里找到当前哈希，改掉硬编码值。
**修法（长期）**：不要硬编码 —— 从页面里动态提取：

```js
var wasm = (html.match(/data-bg=["']([^"']+\.wasm)["']/i) || [])[1] || DEFAULT_WASM;
```

**这类模块本质上不可长期维护。** 站点每次发版都要跟一次。

### 6. 需要认证 / 已下线

站点要求登录，或官方公告取消了公开直链（例如 Hanime）。

**这类没有代码层面的解法。** 要么按站点要求提供凭据 / 自建服务，要么放弃该源。

---

## 四、改完之后的发布流程

```bash
# 1. 提升版本号（必做，否则客户端不会拉新）
#    改 widgets/<模块>.js 里的 WidgetMetadata.version

# 2. 构建 + 校验
npm run verify:fast

# 3. 实网验证
npm run test:<模块>:live

# 4. 提交推送
git add -A && git commit && git push

# 5. 清 CDN 缓存（必做，jsDelivr 对 @main 有缓存）
curl "https://purge.jsdelivr.net/gh/HYJ1817/fw-modules@main/widgets/<模块>.js"
```

**注意 GitHub Pages 推送后有约 1 分钟构建延迟**，期间会继续服务旧文件。
raw 与 jsDelivr 立即生效。

---

## 五、验收标准

一个播放源算「修好了」，必须同时满足：

- [ ] 实网测试通过，且断言了**地址是直链**（不是需要二次解析的网页）
- [ ] `npm run verify:fast` 退出码 0
- [ ] 清单版本号已同步（`npm run check:manifests` 无错误）
- [ ] CDN 缓存已清
- [ ] **在真机上实际播过一集** —— 本地测试通过不等于设备上能播

最后一条最重要。本地跑通只证明逻辑对，真机才能验证网络、宿主行为、播放器兼容性。

---

## 六、环境上的坑（省时间用）

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| `fetch failed` 但 curl 能通 | Node 的 `fetch` **不读代理环境变量** | 用 Node 24 加 `--use-env-proxy` |
| `git clone` 报 502 | 环境变量里的代理不放行 github.com | 用 `-c http.proxy=http://127.0.0.1:7890` |
| `execFileSync` 报 EBUSY | 沙箱禁止创建子进程 | 改用进程内调用 |
| 构建后 `git status` 有生成物 | 行尾 CRLF/LF 差异 | 仓库已用 `.gitattributes` 统一为 LF |

---

## 七、判断该不该继续维护

逐站抓取的模块，维护成本是**持续的**：

- 站点每次前端改版都可能失效，且**静默失效**（不报错，只是返回空）
- 无法统一测试，只能逐站做真实站点验证
- 需要认证的源还要额外维护凭据或自建服务

**决策标准**：

| 情况 | 建议 |
| --- | --- |
| 内容只在特定站点有，且你愿意持续跟版 | 维护它 |
| 内容是通用影视 | 用苹果CMS 采集接口覆盖，成本低一个数量级 |
| 站点已取消公开直链 | 除非愿意自建服务，否则放弃 |

**扩充采集接口的边际成本接近零**：在「资源站列表」里加一行就多一个源，
而且站点换内容不影响接口形态。把精力放这里比逐个修站点抓取划算得多。
