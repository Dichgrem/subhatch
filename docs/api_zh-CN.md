# API 参考

## 公开接口

| 方法   | 路径        | 认证      | 说明               |
|--------|------------|-----------|--------------------|
| GET    | `/`        | —         | Web 管理界面        |
| GET    | `/sub`     | token     | Base64 订阅内容     |
| GET    | `/api/ping`| —         | 健康检查            |

## 管理接口（需会话）

大多数 `/api/*` 接口需要会话 Token。例外：`/api/login`（创建会话）、`/api/ping`（健康检查）、`/api/export/momo` 和 `/api/export/kernel`（也支持 `?token=` 查询参数认证）。

| 方法   | 路径                 | 说明                     |
|--------|----------------------|--------------------------|
| POST   | `/api/login`         | 返回会话 Token            |
| POST   | `/api/logout`        | 使会话失效                |
| GET    | `/api/nodes`         | 列出 env + 存储节点       |
| PUT    | `/api/nodes`         | 保存节点（全量替换）      |
| GET    | `/api/export/sing-box` | 导出所有节点为 sing-box JSON |
| GET    | `/api/export/momo`     | 导出 OpenWrt-momo 完整 config.json |
| GET    | `/api/export/kernel`   | 导出 HPC/桌面 sing-box 完整 config.json |
| GET    | `/api/sub-url`       | 返回主订阅地址            |
| PUT    | `/api/sub-token`     | 轮换主订阅 Token          |
| GET    | `/api/sub-tokens`    | 列出所有 Token（主+分）   |
| POST   | `/api/sub-tokens`         | 创建分 Token              |
| POST   | `/api/sub-tokens/rotate` | 轮换分 Token 的值         |
| PUT    | `/api/sub-tokens`        | 更新分 Token              |
| DELETE | `/api/sub-tokens`        | 删除分 Token              |
| GET    | `/api/audit-log`         | 列出审计日志（最多 500 条） |
| DELETE | `/api/audit-log`         | 清空审计日志

## 分 Token（Scoped Tokens）

分 Token 用于向不同人分享不同节点。每个分 Token 包含：
- `name` — 可选显示名称
- `nodes` — 该 Token 可访问的节点 URI 列表

使用分 Token 访问 `/sub?token=<分Token>` 时，只返回已分配的节点。

**主 Token**（通过 `SUB_TOKEN` 环境变量、`sub:token` KV 键或 `/api/sub-token` 轮换设置）可访问**全部**节点。

## POST /api/sub-tokens

创建新的分 Token。

```json
// 请求
{ "name": "朋友 A", "nodes": ["vless://abc@1.1.1.1:443#Tokyo"] }
// 响应
{ "token": "<48位十六进制>", "name": "朋友 A", "nodes": ["vless://abc@1.1.1.1:443#Tokyo"] }
```

## PUT /api/sub-tokens

更新分 Token 的名称和/或节点列表。

```json
// 请求
{ "token": "<48位十六进制>", "name": "新名称", "nodes": ["vless://..."] }
// 响应
{ "token": "<48位十六进制>", "name": "新名称", "nodes": ["vless://..."] }
```

## POST /api/sub-tokens/rotate

轮换分 Token — 生成新的随机 Token 值，保留名称和节点配置。

```
// 请求
{ "token": "<48位十六进制>" }
// 响应
{ "token": "<新的48位十六进制>", "name": "朋友 A", "nodes": ["vless://..."] }
```

## DELETE /api/sub-tokens

删除分 Token。Token 通过查询参数传递。

```
DELETE /api/sub-tokens?token=<48位十六进制>
→ { "ok": true }
```

## GET /sub — 订阅接口

| 参数      | 说明                                               |
|-----------|----------------------------------------------------|
| `?token=` | 主 Token → 全部节点，分 Token → 仅分配的节点      |

- 未设置 `SUB_TOKEN` → `/sub` 公开（返回全部节点，无需 token）
- 已设置 `SUB_TOKEN` → `/sub` 需要 `?token=<主Token>` 获取全部节点，或 `?token=<分Token>` 获取过滤节点
- 无效 Token 返回 `401`，计入频率限制（与登录共享：每 IP 15 分钟 10 次）
- 响应：`Content-Type: text/plain`，Base64 编码，每行一个 URI

## 频率限制

- `POST /api/login`：每 IP 15 分钟内最多 10 次错误尝试
- `GET /sub`：无效 Token 计入同一限制
- `GET /api/export/momo`、`GET /api/export/kernel`：无效 `?token=` 同样共享计数器
- 超过限制返回 `429 Too many requests`
- 仅登录成功清除计数器
- 所有频率限制共享同一计数器（按 IP）

## GET /api/export/sing-box

将所有已配置的节点导出为 sing-box 兼容的出站 JSON 数组。需要管理员会话。

**响应：**
```json
{
  "ok": true,
  "count": 3,
  "outbounds": [
    {
      "type": "vless",
      "tag": "Tokyo-01",
      "server": "1.2.3.4",
      "server_port": 443,
      "uuid": "...",
      "flow": "xtls-rprx-vision",
      "tls": {
        "enabled": true,
        "server_name": "s0.awsstatic.com",
        "utls": { "enabled": true, "fingerprint": "firefox" },
        "reality": {
          "enabled": true,
          "public_key": "...",
          "short_id": "..."
        }
      }
    }
  ],
  "errors": []
}
```

支持的 URL 协议（从节点 URI 自动检测）：

| 协议         | sing-box `type`  | 说明 |
|-------------|------------------|------|
| `vless://`  | `vless`          | Reality/TLS、ws/grpc/h2/tcp 传输 |
| `vmess://`  | `vmess`          | Base64 JSON 解码、ws/grpc/h2 传输 |
| `trojan://` | `trojan`         | ws/grpc 传输、multiplex |
| `ss://`     | `shadowsocks`    | SIP002 + 旧格式 |
| `hysteria2://` / `hy2://` | `hysteria2` | TLS 跳过验证开关 |
| `tuic://`   | `tuic`           | ALPN、congestion_control |
| `anytls://` | `anytls`         | Reality + utls 指纹 |
| `naive://`  | `naive`          | HTTP/3 代理 |

返回的 JSON 可直接合并到 sing-box 客户端配置：

```json
{
  "outbounds": [ <粘贴 outbounds 数组> ]
}
```

## GET /api/export/momo

返回完整的 sing-box `config.json`，兼容 OpenWrt 上的 [luci-app-momo](https://github.com/CHN-beta/OpenWrt-momo)。可直接用作 momo 的「订阅」或「文件」模式配置 URL。

**认证：** 支持两种方式：
1. 会话 Token（`Authorization: Bearer <token>`）—— Web UI 下载
2. 订阅 Token（`?token=<sub_token>`）—— momo 的 curl 订阅（也支持分 Token 过滤节点）

**Momo 订阅链接格式：**
```
https://your-domain.com/api/export/momo?token=<你的订阅token>
```
如果使用了分 Token，把 `<你的订阅token>` 换成分 Token 即可过滤节点。追加 `&preset=ipv4%2b6` 可启用双栈。

### 查询参数

| 参数          | 默认值           | 说明                                 |
|--------------|------------------|--------------------------------------|
| `preset`     | `ipv4only_realip` | 预设（见下表）                          |
| `selectorTag`| `GLOBAL`         | 选择器出站标签名                       |
| `redirectPort`| 7890            | Redirect 入站端口                      |
| `tproxyPort` | 7891             | TPROXY 入站端口                       |
| `dnsPort`    | 1053             | DNS 入站端口                          |
| `tunAddress` | `172.31.0.1/30`  | TUN 接口 IPv4 地址                    |
| `tunAddress6`| —                | TUN 接口 IPv6 地址（`ipv4+6` 预设自动） |
| `dnsStrategy`| 由预设决定          | DNS 策略（`ipv4_only` / `prefer_ipv4`） |
| `listen`     | 由预设决定          | 入站监听地址（`0.0.0.0` / `::`）       |
| `fakeip`     | 由预设决定          | 覆盖：`true`/`1` 强制 FakeIP，`false`/`0` 强制真实 DNS |
| `clashPort`  | 9095              | Clash API 监听端口                     |
| `clashSecret`| `""`              | Clash API 密钥

### 预设

| 预设              | listen  | dnsStrategy    | FakeIP | TUN v6        |
|-------------------|---------|----------------|--------|---------------|
| `ipv4only_realip` | `0.0.0.0` | `ipv4_only` | 否     | 否            |
| `ipv4only_fakeip` | `0.0.0.0` | `ipv4_only` | 是     | 否            |
| `ipv4plus_realip` | `::`    | `prefer_ipv4`  | 否     | 是            |
| `ipv4plus_fakeip` | `::`    | `prefer_ipv4`  | 是     | 是            |

别名（向后兼容）：`ipv4only` / `ipv4` / `single` → `ipv4only_realip`；`ipv4+6` / `dual` / `ipv6` → `ipv4plus_realip`。

### 响应结构

返回的是原始 sing-box config.json，无包装，momo 可直接使用。

```json
{
  "log": { "disabled": false, "level": "info", "timestamp": true },
  "dns": { ... },
  "ntp": { ... },
  "inbounds": [ ... ],
  "outbounds": [ ... ],
  "route": { ... },
  "experimental": { ... }
}
```

配置包含：
- `log`：日志配置（disabled: false, level: info, timestamp: true）
- `dns`：按预设启用/禁用 FakeIP（本地 UDP → 阿里 DoH → Google DoH；FakeIP 预设额外添加 FakeIP 服务器和 A/AAAA 重写）
- `ntp`：时间同步（time.apple.com:123，每 30 分钟）
- `inbounds`：DNS 入站 + Redirect + TPROXY + TUN 入站
- `outbounds`：所有转换后的节点 + 一个 `selector`（含所有节点 + `direct`）
- `route`：嗅探 → 劫持 DNS → 私有 IP 直连 → geosite-cn → geoip-cn → 最终走选择器
- `experimental`：缓存文件（FakeIP 持久化）+ Clash API（基于 zashboard 面板，端口 9095）

---

## GET /api/export/kernel

返回完整的 sing-box `config.json`，适用于 Linux 桌面 / HPC 上的 sing-box 内核。放到 `/etc/sing-box/config.json` 或作为 `sing-box run -c` 的目标文件。

**认证：** 与 `/api/export/momo` 相同（会话 Token 或订阅 Token）。

**Kernel 订阅链接格式：**
```
https://your-domain.com/api/export/kernel?token=<你的订阅token>
```

### 查询参数

| 参数          | 默认值               | 说明                                 |
|--------------|----------------------|--------------------------------------|
| `preset`     | `ipv4only_realip`    | 预设（同 momo 四种预设）              |
| `selectorTag`| `GLOBAL`             | 选择器出站标签名                       |
| `dnsPort`    | 1053                 | DNS 入站端口                          |
| `mixedPort`  | 7890                 | HTTP/SOCKS 混合入站端口               |
| `tunAddress` | `172.19.0.1/30`      | TUN 接口 IPv4 地址                    |
| `tunAddress6`| —                    | TUN 接口 IPv6 地址（双栈预设自动）     |
| `dnsStrategy`| 由预设决定            | DNS 策略                              |
| `listen`     | 由预设决定            | 入站监听地址                           |
| `fakeip`     | 由预设决定            | 覆盖：`true`/`1` 强制 FakeIP，`false`/`0` 强制真实 DNS |
| `clashPort`  | 9191                 | Clash API 监听端口                   |
| `clashSecret`| `""`                 | Clash API 密钥                       |
| `tunName`    | `stun`               | TUN 接口名称

### 预设

同 momo：`ipv4only_realip`、`ipv4only_fakeip`、`ipv4plus_realip`、`ipv4plus_fakeip`。

### 响应

与 momo 结构相同，差异如下：
- `dns`：加 `?fakeip=true` 可覆盖预设启用 FakeIP
- `inbounds`：无 redirect-in / tproxy-in；有 `mixed`（HTTP/SOCKS 代理）；TUN 开启 auto_route
- `route`：启用 `auto_detect_interface`；无 NTP
- `experimental`：Clash API 端口 9191；缓存路径 `/var/lib/sing-box/cache.db`

---

## 审计日志

### GET /api/audit-log

返回最近的审计记录（最新在前，最多 500 条）。

**认证：** 需要会话 Token。

**响应：**
```json
{
  "log": [
    {
      "ts": 1700000000000,
      "action": "login",
      "ip": "1.2.3.4",
      "detail": ""
    }
  ]
}
```

### 记录的操作

| 操作 | 详情 | 触发时机 |
|------|------|----------|
| `login` | — | 登录成功 |
| `login-failed` | — | 密码错误 |
| `blocked` | 端点名 | 触发频率限制 (429) |
| `logout` | — | 登出 |
| `sub` | `N nodes` | 订阅被访问 |
| `nodes-save` | `N nodes` | 通过 UI 更新节点 |
| `token-create` | Token 名称 | 创建分 Token |
| `token-update` | Token 前缀 | 修改分 Token |
| `token-rotate` | Token 名称/前缀 | 轮换 Token |
| `token-delete` | Token 前缀 | 删除分 Token |
| `export-momo` | `N nodes` | 导出 Momo 配置 |
| `export-kernel` | `N nodes` | 导出 Kernel 配置 |
| `export-json` | `N outbounds` | 导出 sing-box JSON |

### DELETE /api/audit-log

清空所有审计记录。需要会话认证。

### 存储

审计日志存储在 `audit:log` KV 键下，为 JSON 数组。最多 500 条，超过时最旧的被移除。无 TTL，记录持久保存直至手动清除或被上限自动淘汰。
