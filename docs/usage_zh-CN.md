# 使用指南

## 登录

首次打开 Web 界面会看到管理员登录页面。输入 `ADMIN_PASSWORD` 环境变量设置的密码登录。登录后获得一个 2 小时有效期的会话 Token，存储在浏览器 localStorage 中。

密码错误超过 10 次后，该 IP 将被限流 15 分钟。

---

## 界面布局

登录后页面分四栏：

### 栏一：Subscription URL

包含：
- **订阅地址**：供客户端（husi / NekoBox / Clash Meta 等）订阅节点
- **Momo 配置**：导出 OpenWrt-momo 完整 config.json，可选 4 种预设
- **Kernel 配置**：导出 Linux 桌面 sing-box 完整 config.json
- **节点上传地址**：通过 API 推送节点（需要 `UPLOAD_TOKEN`）

### 栏二：Access Tokens

**主 Token**（`SUB_TOKEN` 环境变量或 `sub:token` KV 键）：访问全部节点。

**分 Token**：可限制只访问指定节点子集。适合给不同用户分享不同节点。

操作：创建、改名、分配节点、轮换（生成新 Token）、删除。

### 栏三：Upstream Sources

导入外部订阅 URL，将其节点合并到 Momo / Kernel 导出中（分 Token 不可见）。支持多个来源，独立管理。

自动尝试 base64 解码，失败后按纯文本解析。每次同步全量替换，失败时保留上次缓存。

添加的外部来源可在 Momo / Kernel 配置导出中通过 `?refresh=1` 触发同步。

### 栏四：Nodes

节点管理。支持：
- **单个添加**：输入 URI 后按 Enter 或点 `+ Add`
- **批量导入**：粘贴多行 URI 或 base64 订阅内容
- **导出 JSON**：下载所有节点为 sing-box outbounds JSON
- **删除**：节点右侧的 ✕ 按钮

每次增删自动保存，状态显示为 `Saving...` → `Saved`。

**支持协议：** vless:// vmess:// trojan:// ss:// hysteria2:// hy2:// tuic:// anytls:// naive://

---

## 配置导出

### OpenWrt-momo 配置

```
GET /api/export/momo?token=<sub_token>&preset=ipv4only_realip
```

返回完整 sing-box config.json，可直接用作 momo 的订阅 URL。支持 4 种预设：

| 预设 | 说明 |
|------|------|
| `ipv4only_realip` | IPv4 + 真实 DNS（默认） |
| `ipv4only_fakeip` | IPv4 + FakeIP |
| `ipv4plus_realip` | IPv4+6 + 真实 DNS |
| `ipv4plus_fakeip` | IPv4+6 + FakeIP |

### Sing-box Kernel 配置

```
GET /api/export/kernel?token=<sub_token>&preset=ipv4only_realip
```

与 Momo 结构类似，区别：
- 无 redirect-in / tproxy-in（不使用 iptables）
- 有 `mixed` 入站（HTTP/SOCKS 代理）
- TUN 开启 `auto_route`
- 默认端口 9191（Momo 为 9095）

两种导出默认同步上游来源。加 `?refresh=0` 跳过同步。同步结果记入审计日志，标记为 `upstream-sync`。

---

## 节点上传 API

```bash
POST /api/upload?token=<upload_token>
Content-Type: application/json

{"nodes": ["vless://...", "vmess://..."]}
```

通过独立 Token（`UPLOAD_TOKEN` 环境变量）鉴权，与会话和订阅 Token 分离。仅能上传，不能查看或下载节点。

去重规则：精确 URI 去重；同 `#名称` 自动追加 `-2`、`-3` 后缀。

---

## 审计日志

记录所有管理操作，每条包含：时间戳、操作类型、IP、详情。

记录的操作：

| 操作 | 触发时机 |
|------|----------|
| `login` / `login-failed` | 登录成功或失败 |
| `blocked` | 触发频率限制 |
| `logout` | 登出 |
| `sub` | 节点订阅被访问 |
| `nodes-save` | 节点更新 |
| `token-*` | 分 Token 操作 |
| `export-*` | 配置导出 |
| `upload` | 节点上传 |
| `upstream-*` | 上游来源操作 |

最多保留 500 条。可在 Web UI 中查看和清除。

---

## 卡片切换

顶栏按钮控制可见性：

| 按钮 | 切换内容 |
|------|----------|
| Sub / Tokens / Nodes | 隐藏/显示对应整张卡片 |
| Momo / Kernel | 显示/隐藏订阅卡中的配置区 |
| Upload | 显示/隐藏节点上传区 |
| Upstream | 显示/隐藏上游来源管理 |
| Log | 显示/隐藏审计日志 |
| Hide | 隐藏敏感信息（截图用） |

按下的按钮高亮（紫色边框 + 文字）。

---

## 查看/配置 /api/upstream

### 添加来源

点 `+ Add`，输入外部订阅 URL（base64 或纯文本）。首次添加自动同步。

### 同步

点来源旁的 `Sync` 同步单个，或点 `Sync All` 同步全部。失败时保留上次缓存。

### 删除

来源旁的 ✕ 按钮，删除来源及其缓存节点。

### 自动刷新

### 跳过导出同步

加 `?refresh=0` 到 `/api/export/momo` 或 `/api/export/kernel`，拉取配置时跳过上游同步。
