# 使用指南

## 登录

首次打开 Web 界面看到管理员登录页面。输入 `ADMIN_PASSWORD` 环境变量设置的密码登录。登录成功后获得 2 小时有效期的会话 Token，存储在浏览器 localStorage 中。关闭浏览器后再次打开会自动恢复会话。

同 IP 密码错误超过 10 次后限流 15 分钟，返回 429。

顶栏右侧显示 **Logout** 按钮，结束当前会话。

---

## 界面总览

登录后页面从上到下依次为：

| 区域 | 默认可见 | 说明 |
|------|----------|------|
| Stats 栏 | 是 | 标题右侧：绿点 + Nodes / Env / Stored 计数 |
| 顶栏按钮组 | 是 | 控制各卡片和区域的显示/隐藏 |
| Subscription URL | 是（按 Sub 切换） | 订阅地址 + 配置导出 + 节点上传 |
| OpenWrt-momo | 否（按 Momo 展开） | Momo 完整 config.json 配置区 |
| sing-box Kernel | 否（按 Kernel 展开） | HPC/桌面 Kernel config.json 配置区 |
| Node Upload | 否（按 Upload 展开） | 节点推送 API 地址 |
| Upstream Sources | 否（按 Upstream 展开） | 外部订阅来源管理 |
| Access Tokens | 是（按 Tokens 切换） | 主 Token + 分 Token 管理 |
| Nodes | 是（按 Nodes 切换） | 节点增删改查 |
| Audit Log | 否（按 Log 展开） | 操作审计记录 |

顶栏按钮高亮（紫色边框 + 文字）代表已展开，再次点击收回。Sub / Tokens / Nodes 三个卡片默认高亮可见，可按按钮隐藏。

---

## Subscription URL

登录后第一张卡片，显示主订阅地址。

### 订阅链接

格式：`https://你的域名/sub?token=<32位随机hex>`

操作按钮：

- 🎲 **轮换** — 生成新 Token，旧 Token 立即失效。所有客户端需更新订阅地址
- ⎘ **复制** — 复制订阅地址到剪贴板
- ▦ **二维码** — 弹出二维码，手机扫码导入

将链接填入客户端（husi、sing-box、NekoBox、Clash Meta 等）的订阅地址栏即可获取节点。

### Hide 截图模式

顶栏 **Hide** 按钮将节点名称、订阅链接、配置链接等敏感信息替换为 `•••••••` 或 `Hidden for screenshot` 遮罩，方便截图分享时不暴露隐私。

---

## OpenWrt-momo

点顶栏 **Momo** 按钮展开。用于生成 OpenWrt 路由器上 luci-app-momo 的完整 sing-box config.json。

### 预设选择

下拉菜单 4 个选项：

| 预设 | IPv6 | DNS | TUN 接口 |
|------|------|-----|----------|
| `IPv4 + RealIP` | 无 | 真实 DNS | `momo` |
| `IPv4 + FakeIP` | 无 | FakeIP（198.18.0.0/15） | `momo` |
| `IPv4+6 + RealIP` | 有 | 真实 DNS | `momo` |
| `IPv4+6 + FakeIP` | 有 | FakeIP + v6 range | `momo` |

### 使用方法

1. 选择预设
2. 点 ⎘ 复制链接
3. 粘贴到 momo 的「订阅」或「文件」配置中

momo 每次请求该地址时会自动同步上游来源（存在上游来源时），可加 `?refresh=0` 跳过。

链接格式：

```
https://你的域名/api/export/momo?token=<sub_token>&preset=ipv4only_realip
```

### 生成的配置包含

- `log`：日志（info 级别，带时间戳）
- `dns`：真实 DNS（local UDP → 阿里 DoH → Google DoH）；FakeIP 预设时追加 FakeIP 服务器和 A/AAAA 重写
- `ntp`：时间同步（time.apple.com）
- `inbounds`：dns-in（1053）、redirect-in（7890）、tproxy-in（7891）、tun-in（momo 接口）
- `outbounds`：所有节点 + GLOBAL selector + direct
- `route`：嗅探 → 劫持 DNS → 私有 IP 直连 → geosite-cn → geoip-cn → selector
- `experimental`：cache_file + clash_api（zashboard 面板，端口 9095）

---

## sing-box Kernel (HPC)

点顶栏 **Kernel** 按钮展开。用于 Linux 桌面 / HPC 上的 sing-box 内核（`/etc/sing-box/config.json`）。

同样 4 种预设，与 Momo 的区别：

| 特性 | Momo | Kernel |
|------|------|--------|
| redirect-in | 有 | 无 |
| tproxy-in | 有 | 无 |
| mixed 入站 | 无 | 有（7890，HTTP/SOCKS） |
| TUN auto_route | 否 | 是 |
| TUN 接口名 | `momo` | `stun` |
| TUN IPv4 | 172.31.0.1/30 | 172.19.0.1/30 |
| NTP | 有 | 无 |
| auto_detect_interface | 否 | 是 |
| Clash API 端口 | 9095 | 9191 |

链接格式：

```
https://你的域名/api/export/kernel?token=<sub_token>&preset=ipv4only_realip
```

---

## Node Upload

点顶栏 **Upload** 按钮展开。显示通过 API 推送节点的地址和 Token。

### 获取 Token

上传功能由 `UPLOAD_TOKEN` 环境变量控制。未设置时显示"—（UPLOAD_TOKEN not set）"，上传 API 返回 403。

已设置时显示完整 URL，包含 Token：

```
POST https://你的域名/api/upload?token=<upload_token>
```

- 🎲 **轮换** — 生成新上传 Token，旧 Token 立即失效
- ⎘ **复制** — 复制上传地址

### 上传格式

```bash
curl -X POST "https://你的域名/api/upload?token=<upload_token>" \
  -H "Content-Type: application/json" \
  -d '{"nodes":["vless://uuid@server:port?params#Name"]}'
```

返回：`{"ok": true, "added": 3, "dupes": 1}`

### 上传规则

- 仅接受合法 scheme 的节点 URI
- 已在存储中的节点视为重复，计入 `dupes`
- 相同 `#名称` 自动追加 `-2`、`-3` 后缀
- 每次上传写入审计日志，标为 `upload`
- Token 独立于会话和订阅，仅能上传不能查看

---

## Upstream Sources

点顶栏 **Upstream** 按钮展开。将外部订阅 URL 作为上游来源导入。

### 为什么要用

你有另一个机场订阅链接，想在 subhatch 的 Momo / Kernel 导出中也包含那些节点。添加为上游来源后，每次导出配置时会自动拉取上游节点并合并到 `GLOBAL` selector 中。

上游节点对分 Token 不可见，只有主 Token（momo / kernel 导出）能看到。

### 添加来源

点击 **+ Add**：

1. 输入订阅 URL（如 `https://airport.com/sub?token=xxx`）
2. 输入名称（可选，不填会从 URL 中提取）
3. 首次添加时自动同步一次

支持 base64 和纯文本格式。

### 管理来源

每个来源显示：名称、URL、上次同步时间、节点数 / 错误信息。

| 按钮 | 作用 |
|------|------|
| **Sync** | 同步单个来源。成功：更新节点缓存；失败：保留上次缓存 |
| **Sync All** | 同步全部来源 |
| ✕ | 删除来源及其缓存节点 |

### 同步行为

- 每次同步**全量替换**，不是追加
- 失败时保留上一次成功的缓存
- 同步结果写入审计日志（`upstream-sync`），级别：成功 → INFO，失败 → ERROR
- Momo / Kernel 导出**默认自动同步**上游（加 `?refresh=0` 跳过）

---

## Access Tokens

管理订阅访问 Token。一张卡片显示所有 Token。

### 主 Token

主 Token 由 `SUB_TOKEN` 环境变量初始化，可在 UI 中多次轮换。拥有主 Token 即可访问所有节点（env + stored + upstream）。轮换后旧 Token 立即失效。

### 分 Token（Scoped Tokens）

分 Token 用于给不同人分享不同节点。每个分 Token 可限定只能访问指定的节点子集。

操作：

- **+ Create Token** — 创建新分 Token，输入名称后立即弹出节点分配界面
- **节点分配** — 勾选节点，确认后该 Token 只能访问选中的节点
- **改名** — 点 Token 名称直接编辑
- ⎘ **复制** — 复制该 Token 的订阅 URL
- ▦ **二维码** — 弹出该 Token 的订阅二维码
- 🎲 **轮换** — 生成新密钥，旧 Token 失效
- ✎ **编辑节点** — 重新分配节点
- ✕ **删除** — 删除 Token

### Token 的节点池

分 Token 只能访问 stored nodes + env nodes。上游来源节点不参与分 Token 过滤。

---

## Nodes

节点管理卡片。所有节点操作在这里完成。

### 添加节点

在输入框粘贴节点 URI（`vless://...`），按 Enter 或点 **+ Add**。自动保存，状态栏显示 `Saving...` → `Saved`。

### 批量导入

点 **Bulk Import** 打开弹窗。支持：

- 多行粘贴，每行一个 URI
- 管道符 `|` 或换行分隔
- base64 编码的订阅内容（自动检测解码）

点 Import 导入，重复节点自动跳过。

### 导出 JSON

点 **Export JSON** 下载所有节点为 sing-box outbounds JSON 文件。节点中非法 URI 会在导出时记录错误但不影响其他节点。

### 节点列表

每行显示：

- **协议标签**（vless/vmess/trojan 等）
- **节点名称**（从 URI 的 `#` 提取，或 hostname:port）
- **来源标记**：⚙ env（环境变量注入） / ✎ stored（手动添加）
- ✕ **删除按钮**（仅 stored 节点可删除）

点击节点行可复制完整 URI 到剪贴板。

节点列表按协议类型排序，再按名称排序。顶栏统计自动更新。

### 支持的协议

`vless://` `vmess://` `trojan://` `ss://` `ssr://` `hysteria2://` `hy2://` `tuic://` `anytls://` `naive://`

---

## Audit Log

点顶栏 **Log** 按钮展开。记录所有管理操作。

### 日志格式

每条记录包含：

| 字段 | 说明 |
|------|------|
| 时间戳 | 精确到秒 |
| 级别 | INFO / WARN / ERROR（颜色标记） |
| 操作 | 动作类型 |
| IP | 请求来源 IP |
| 详情 | 补充信息（节点数、Token 名称等） |

### 日志级别

| 级别 | 颜色 | 含义 |
|------|------|------|
| ERROR | 红色 | 上游同步失败 |
| WARN | 琥珀色 | 密码错误、触发频率限制 |
| INFO | 暗色 | 所有正常操作 |

### 记录的操作

| 操作 | 级别 | 触发时机 |
|------|------|----------|
| `login` | INFO | 登录成功 |
| `login-failed` | WARN | 密码错误 |
| `blocked` | WARN | 触发频率限制（429） |
| `logout` | INFO | 登出 |
| `sub` | INFO | 订阅被访问 |
| `nodes-save` | INFO | 节点更新 |
| `token-create` | INFO | 创建分 Token |
| `token-update` | INFO | 修改分 Token |
| `token-rotate` | INFO | 轮换 Token |
| `token-delete` | INFO | 删除分 Token |
| `export-momo` | INFO | 导出 Momo 配置 |
| `export-kernel` | INFO | 导出 Kernel 配置 |
| `export-json` | INFO | 导出 sing-box JSON |
| `upload` | INFO | 通过 API 上传节点 |
| `upstream-add` | INFO | 添加上游来源 |
| `upstream-sync` | INFO/ERROR | 上游同步（失败时为 ERROR） |
| `upstream-delete` | INFO | 删除上游来源 |

最多保留 500 条。操作按钮：

- ↻ — 刷新日志
- ✕ Clear — 清空全部日志
