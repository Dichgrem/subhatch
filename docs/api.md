# API Reference

## Public endpoints

| Method | Path       | Auth       | Description                         |
|--------|------------|------------|-------------------------------------|
| GET    | `/`        | —          | Web UI                              |
| GET    | `/sub`     | token      | Base64 subscription content         |
| GET    | `/api/ping`| —          | Health check                        |

## Admin endpoints (session required)

All `/api/*` endpoints except `/api/ping` require a valid session token in the `Authorization: Bearer <token>` header.

| Method | Path                | Description                          |
|--------|---------------------|--------------------------------------|
| POST   | `/api/login`        | Returns session token                |
| POST   | `/api/logout`       | Invalidates session                  |
| GET    | `/api/nodes`        | List env + stored nodes              |
| PUT    | `/api/nodes`        | Save stored nodes (replaces all)     |
| GET    | `/api/export/sing-box` | Export all nodes as sing-box JSON  |
| GET    | `/api/export/momo`     | Export full config.json for OpenWrt-momo |
| GET    | `/api/sub-url`      | Returns the primary subscription URL |
| PUT    | `/api/sub-token`    | Rotate the primary subscription token|
| GET    | `/api/sub-tokens`   | List all tokens (primary + scoped)   |
| POST   | `/api/sub-tokens`         | Create a scoped token               |
| POST   | `/api/sub-tokens/rotate` | Rotate a scoped token's value      |
| PUT    | `/api/sub-tokens`        | Update a scoped token              |
| DELETE | `/api/sub-tokens`        | Delete a scoped token              |

## Scoped tokens

Scoped tokens allow sharing specific nodes with different people. Each scoped token has:
- `name` — optional display name
- `nodes` — array of node URIs this token can access

When a scoped token is used with `/sub?token=<scoped>`, only the assigned nodes are returned.

The **primary** token (set via `SUB_TOKEN` env var, `sub:token` KV key, or rotated via `/api/sub-token`) grants access to **all** nodes.

## POST /api/sub-tokens

Create a new scoped token.

```json
// Request
{ "name": "Friend A", "nodes": ["vless://abc@1.1.1.1:443#Tokyo"] }
// Response
{ "token": "<48-char-hex>", "name": "Friend A", "nodes": ["vless://abc@1.1.1.1:443#Tokyo"] }
```

## PUT /api/sub-tokens

Update a scoped token's name and/or node list.

```json
// Request
{ "token": "<48-char-hex>", "name": "New Name", "nodes": ["vless://..."] }
// Response
{ "token": "<48-char-hex>", "name": "New Name", "nodes": ["vless://..."] }
```

## POST /api/sub-tokens/rotate

Rotate a scoped token — generates a new random token value while preserving name and node assignments.

```json
// Request
{ "token": "<48-char-hex>" }
// Response
{ "token": "<new-48-char-hex>", "name": "Friend A", "nodes": ["vless://..."] }
```

## DELETE /api/sub-tokens

Delete a scoped token. Token passed as query parameter.

```
DELETE /api/sub-tokens?token=<48-char-hex>
→ { "ok": true }
```

## GET /sub — Subscription endpoint

| Parameter | Description                              |
|-----------|------------------------------------------|
| `?token=` | Primary token → all nodes, scoped token → assigned nodes |

- No `SUB_TOKEN` set → `/sub` is public (all nodes, no token needed)
- `SUB_TOKEN` set → `/sub` requires `?token=<primary>` for all nodes, or `?token=<scoped>` for filtered
- Invalid tokens return `401` and are rate-limited (shared with login brute-force: 10 attempts / 15 min per IP)
- Response: `Content-Type: text/plain`, Base64-encoded, one URI per line

## Rate limiting

- `POST /api/login`: 10 wrong attempts / 15 min per IP
- `GET /sub`: invalid tokens count toward the same 10-attempt / 15 min per IP limit
- After 10 failures, returns `429 Too many requests`
- Successful login or valid sub access clears the counter

## GET /api/export/sing-box

Exports all configured nodes as a sing-box-compatible outbounds JSON array. Requires admin session.

**Response:**
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

Supported URL schemes (auto-detected from node URI):

| Scheme       | sing-box `type` | Notes |
|-------------|-----------------|-------|
| `vless://`  | `vless`         | Reality/TLS, ws/grpc/h2/tcp transport |
| `vmess://`  | `vmess`         | Base64 JSON decoding, ws/grpc/h2 transport |
| `trojan://` | `trojan`        | ws/grpc transport, multiplex |
| `ss://`     | `shadowsocks`   | SIP002 + legacy format |
| `hysteria2://` / `hy2://` | `hysteria2` | TLS insecure toggle |
| `tuic://`   | `tuic`          | ALPN, congestion_control |
| `anytls://` | `anytls`        | Reality with utls fingerprint |
| `naive://`  | `naive`         | HTTP/3 proxy |

The returned JSON can be directly merged into a sing-box client config:

```json
{
  "outbounds": [ <paste the outbounds array here> ]
}
```

## GET /api/export/momo

Returns a complete sing-box `config.json` compatible with [luci-app-momo](https://github.com/CHN-beta/OpenWrt-momo) on OpenWrt. The config can be used directly as a subscription URL in momo's "Subscription" profile mode, or downloaded and placed in the "File" profile.

**Auth:** Two modes supported:
1. Session token (`Authorization: Bearer <token>`) — for Web UI download
2. Sub-token (`?token=<sub_token>`) — for momo's curl subscription (also supports scoped tokens)

**Momo subscription URL:**
```
https://your-domain.com/api/export/momo?token=<your_sub_token>
```
If you use scoped tokens, replace `<your_sub_token>` with a scoped token to filter nodes. Add `&preset=ipv4%2b6` for dual-stack.

### Query parameters

| Param          | Default          | Description                                |
|---------------|------------------|--------------------------------------------|
| `preset`      | `ipv4only`       | `ipv4only` / `ipv4+6` / `dual` / `ipv4` / `ipv6` / `single` |
| `selectorTag` | `GLOBAL`         | Selector outbound tag name                 |
| `redirectPort`| 7890             | Redirect inbound port                      |
| `tproxyPort`  | 7891             | TPROXY inbound port                        |
| `dnsPort`     | 1053             | DNS inbound port                           |
| `tunAddress`  | `172.31.0.1/30`  | TUN interface IPv4 address                 |
| `tunAddress6` | —                | TUN interface IPv6 address (auto for `ipv4+6`) |
| `dnsStrategy` | `ipv4_only`      | DNS strategy (`prefer_ipv4` for dual-stack) |
| `listen`      | `0.0.0.0`        | Inbound listen address (`::` for dual-stack) |

### Presets

| Preset          | listen | dnsStrategy    | FakeIP v6      |
|-----------------|--------|----------------|----------------|
| `ipv4only`      | `0.0.0.0` | `ipv4_only` | no             |
| `ipv4+6` / `dual` / `ipv6` | `::` | `prefer_ipv4` | yes |
| `ipv4` / `single` | `0.0.0.0` | `ipv4_only` | no |

### Response

```json
{
  "ok": true,
  "count": 2,
  "errors": [],
  "config": {
    "inbounds": [ ... ],
    "outbounds": [ ... ],
    "route": { ... },
    "dns": { ... }
  }
}
```

The response includes:
- `log`: logging config (disabled: false, level: info, timestamp: true)
- `dns`: FakeIP setup (local UDP → ali DoH → Google DoH via proxy)
- `ntp`: time sync (time.apple.com:123, 30m interval)
- `inbounds`: `dns-in` (direct:1053), `redirect-in` (redirect:7890), `tproxy-in` (tproxy:7891), `tun-in` (tun, momo device)
- `outbounds`: all converted nodes + a `selector` outbound containing all node tags + `direct` for bypass
- `route`: sniff → hijack-dns → private-ip → geosite-cn → geoip-cn → final to selector
- `experimental`: cache_file (fakeip persistence) + clash_api (zashboard dashboard on port 9095)
