# API Reference

## Public endpoints

| Method | Path       | Auth       | Description                         |
|--------|------------|------------|-------------------------------------|
| GET    | `/`        | —          | Web UI                              |
| GET    | `/sub`     | token      | Base64 subscription content         |

## Admin endpoints (session required)

Most `/api/*` endpoints require a valid session token. Exceptions: `/api/login` (creates session), `/api/export/momo` and `/api/export/kernel` (also accept sub-token via `?token=`).

| Method | Path                | Description                          |
|--------|---------------------|--------------------------------------|
| POST   | `/api/login`        | Returns session token                |
| POST   | `/api/logout`       | Invalidates session                  |
| GET    | `/api/nodes`        | List env + stored nodes              |
| PUT    | `/api/nodes`        | Save stored nodes (replaces all)     |
| GET    | `/api/export/sing-box` | Export all nodes as sing-box JSON  |
| GET    | `/api/export/momo`     | Export full config.json for OpenWrt-momo |
| GET    | `/api/export/kernel`   | Export full config.json for HPC/desktop sing-box |
| GET    | `/api/sub-url`      | Returns the primary subscription URL |
| PUT    | `/api/sub-token`    | Rotate the primary subscription token|
| GET    | `/api/sub-tokens`   | List all tokens (primary + scoped)   |
| POST   | `/api/sub-tokens`         | Create a scoped token               |
| POST   | `/api/sub-tokens/rotate` | Rotate a scoped token's value      |
| PUT    | `/api/sub-tokens`        | Update a scoped token              |
| DELETE | `/api/sub-tokens`        | Delete a scoped token              |
| GET    | `/api/audit-log`         | List audit log entries (500 max)   |
| DELETE | `/api/audit-log`         | Clear all audit log entries
| GET    | `/api/upload-token`      | View current upload token          |
| PUT    | `/api/upload-token`      | Rotate upload token                |
| GET    | `/api/upstream`          | List upstream subscription sources |
| POST   | `/api/upstream`          | Add upstream subscription source   |
| DELETE | `/api/upstream`          | Remove upstream source (`?id=`)    |
| POST   | `/api/upstream/sync`     | Sync upstream source(s)            |

## Scoped tokens

Scoped tokens allow sharing specific nodes with different people. Each scoped token has:
- `name` — optional display name
- `nodes` — array of node URIs this token can access

When a scoped token is used with `/sub?token=<scoped>`, only the assigned nodes are returned.

The **primary** token (set via `SUB_TOKEN` env var, `sub:token` KV key, or rotated via `/api/sub-token`) grants access to **all** nodes.

## Upload endpoint (token auth)

`POST /api/upload` pushes node URIs into the stored node pool. It uses its own token (`UPLOAD_TOKEN` env var), independent from session or sub-token auth.

**Auth:** `?token=<upload_token>` query param. If `UPLOAD_TOKEN` is not configured, returns `403 Upload not enabled`.

**Request:** `{ "nodes": ["vless://...", "vmess://..."] }`

**Response:** `{ "ok": true, "added": 5, "dupes": 2 }`

**Behavior:**
- Only valid scheme URIs are accepted (same as `isValidNode`)
- Exact duplicates (already in store) are skipped and counted as `dupes`
- Nodes with the same `#fragment` name get a `-2` / `-3` suffix appended
- Uploads are recorded in the audit log as `upload`
- Invalid tokens are rate-limited (shares the global 10/15min counter)

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
- `GET /api/export/momo`, `GET /api/export/kernel`: invalid `?token=` also shares the same counter
- `POST /api/upload`: invalid `?token=` shares the same counter; valid upload clears it
- After 10 failures, returns `429 Too many requests`
- Only login or valid upload/export access clears the counter
- All rate-limits share the same global counter per IP

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
If you use scoped tokens, replace `<your_sub_token>` with a scoped token to filter nodes. Add `&preset=ipv4plus_realip` for dual-stack with real DNS, or `&preset=ipv4plus_fakeip` for dual-stack with FakeIP.

### Query parameters

| Param          | Default              | Description                                |
|---------------|----------------------|--------------------------------------------|
| `preset`      | `ipv4only_realip`    | Preset (see below) |
| `selectorTag` | `GLOBAL`             | Selector outbound tag name                 |
| `redirectPort`| 7890                 | Redirect inbound port                      |
| `tproxyPort`  | 7891                 | TPROXY inbound port                        |
| `dnsPort`     | 1053                 | DNS inbound port                           |
| `tunAddress`  | `172.31.0.1/30`      | TUN interface IPv4 address                 |
| `tunAddress6` | —                    | TUN interface IPv6 address (auto for dual-stack) |
| `dnsStrategy` | preset-dependent     | DNS strategy (`ipv4_only` / `prefer_ipv4`) |
| `listen`      | preset-dependent     | Inbound listen address (`0.0.0.0` / `::`)  |
| `fakeip`      | preset-dependent     | Override: `true`/`1` force FakeIP, `false`/`0` force real DNS |
| `clashPort`   | 9095                 | Clash API listen port                     |
| `clashSecret` | `""`                 | Clash API secret

### Presets

| Preset              | listen  | dnsStrategy    | FakeIP | TUN v6        |
|---------------------|---------|----------------|--------|---------------|
| `ipv4only_realip`   | `0.0.0.0` | `ipv4_only` | no     | no            |
| `ipv4only_fakeip`   | `0.0.0.0` | `ipv4_only` | yes    | no            |
| `ipv4plus_realip`   | `::`    | `prefer_ipv4`  | no     | yes           |
| `ipv4plus_fakeip`   | `::`    | `prefer_ipv4`  | yes    | yes           |

Aliases (for backward compatibility): `ipv4only` / `ipv4` / `single` → `ipv4only_realip`; `ipv4+6` / `dual` / `ipv6` → `ipv4plus_realip`.

### Response

The response is a raw sing-box config.json — no wrapper, ready for momo to use directly.

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

The response includes:
- `log`: logging config (disabled: false, level: info, timestamp: true)
- `dns`: local UDP → ali DoH → Google DoH; FakeIP server + A/AAAA rules only if preset enables it (or `?fakeip=true` overrides)
- `ntp`: time sync (time.apple.com:123, 30m interval)
- `inbounds`: `dns-in` (direct:1053), `redirect-in` (redirect:7890), `tproxy-in` (tproxy:7891), `tun-in` (tun, momo device)
- `outbounds`: all converted nodes + a `selector` outbound containing all node tags + `direct` for bypass
- `route`: sniff → hijack-dns → private-ip → geosite-cn → geoip-cn → final to selector
- `experimental`: cache_file (fakeip persistence) + clash_api (Yacd-meta dashboard on port 9095)

---

## GET /api/export/kernel

Returns a complete sing-box `config.json` for the sing-box kernel on Linux desktop / HPC. Drop into `/etc/sing-box/config.json` or point `sing-box run -c` at it.

**Auth:** Same two modes as `/api/export/momo` (session token or sub-token).

**Kernel subscription URL:**
```
https://your-domain.com/api/export/kernel?token=<your_sub_token>
```

### Query parameters

| Param          | Default              | Description                                |
|---------------|----------------------|--------------------------------------------|
| `preset`      | `ipv4only_realip`    | Preset (see below) |
| `selectorTag` | `GLOBAL`             | Selector outbound tag name                 |
| `dnsPort`     | 1053                 | DNS inbound port                           |
| `mixedPort`   | 7890                 | HTTP/SOCKS mixed inbound port              |
| `tunAddress`  | `172.19.0.1/30`      | TUN interface IPv4 address                 |
| `tunAddress6` | —                    | TUN interface IPv6 address (auto for dual-stack) |
| `dnsStrategy` | preset-dependent     | DNS strategy (`ipv4_only` / `prefer_ipv4`) |
| `listen`      | preset-dependent     | Inbound listen address (`0.0.0.0` / `::`)  |
| `fakeip`      | preset-dependent     | Override: `true`/`1` force FakeIP, `false`/`0` force real DNS |
| `clashPort`   | 9191                 | Clash API listen port                     |
| `clashSecret` | `""`                 | Clash API secret                          |
| `tunName`     | `stun`               | TUN interface name

### Presets

Same 4 presets as momo: `ipv4only_realip`, `ipv4only_fakeip`, `ipv4plus_realip`, `ipv4plus_fakeip`.

### Response

```json
{
  "log": { "disabled": false, "level": "info", "timestamp": true },
  "dns": { ... },
  "inbounds": [ ... ],
  "outbounds": [ ... ],
  "route": { ... },
  "experimental": { ... }
}
```

The response includes:
- `log`: logging config (disabled: false, level: info, timestamp: true)
- `dns`: local UDP → ali DoH → Google DoH; FakeIP server + A/AAAA rules if preset enables it
- `inbounds`: `dns-in` (direct:1053), `tun-in` (tun, stun device, auto_route), `mixed` (HTTP/SOCKS proxy)
- `outbounds`: all converted nodes + a `selector` outbound containing all node tags + `direct` for bypass
- `route`: hijack-dns → private-ip → geosite-cn → geoip-cn → sniff → final to selector; auto_detect_interface
- `experimental`: cache_file + clash_api (Yacd-meta dashboard on port 9191)

---

## Audit log

### GET /api/audit-log

Returns recent audit entries (newest first, max 500).

**Auth:** Session token required.

**Response:**
```json
{
  "log": [
    {
      "ts": 1700000000000,
      "action": "login",
      "level": "INFO",
      "ip": "1.2.3.4",
      "detail": ""
    }
  ]
}
```

### Recorded actions

| Action | Level | Detail | Trigger |
|--------|-------|--------|---------|
| `login` | INFO | — | Successful admin login |
| `login-failed` | WARN | — | Wrong password |
| `blocked` | WARN | endpoint name | Rate-limited (429) |
| `logout` | INFO | — | Session logout |
| `sub` | INFO | `N nodes` | Subscription accessed |
| `nodes-save` | INFO | `N nodes` | Nodes updated via UI |
| `token-create` | INFO | token name | Scoped token created |
| `token-update` | INFO | token prefix | Scoped token modified |
| `token-rotate` | INFO | token name / prefix | Token rotated |
| `token-delete` | INFO | token prefix | Scoped token deleted |
| `export-momo` | INFO | `N nodes` | Momo config exported |
| `export-kernel` | INFO | `N nodes` | Kernel config exported |
| `export-json` | INFO | `N outbounds` | Sing-box JSON exported |
| `upload` | INFO | added/dupes | Node uploaded via API |
| `upstream-add` | INFO | name/URL | Upstream source added |
| `upstream-sync` | INFO / ERROR | `N nodes` | Upstream sync completed (ERROR if any source failed) |
| `upstream-delete` | INFO | name/URL | Upstream source deleted |

### DELETE /api/audit-log

Clears all audit entries. Session auth required.

### Storage

Audit log is stored under the `audit:log` KV key as a JSON array. Entries are capped at 500 — oldest entries are dropped when the limit is exceeded. No TTL — entries persist until manually cleared or evicted by the cap.

---

## Upstream subscriptions

Imports external subscription URLs into subhatch for use in momo/kernel exports. Upstream nodes are merged into the `GLOBAL` selector alongside stored nodes, but are NOT visible to scoped tokens (primary token only).

### GET /api/upstream

List all upstream sources with sync status. Session auth.

**Response:**
```json
{
  "urls": [
    { "name": "Airport A", "url": "https://...", "hash": "a1b2", "lastSync": 1700000000000, "lastError": null, "nodeCount": 12 }
  ]
}
```

### POST /api/upstream

Add a new upstream source. Performs an initial sync on creation. Session auth.

**Request:** `{ "url": "https://...", "name": "My Source" }` (`name` optional)

**Response:** `{ "ok": true, "entry": { ... } }` (entry contains sync result)

### DELETE /api/upstream

Remove an upstream source and its cached nodes. Session auth.

**Query:** `?id=<index>` — index as returned in the urls array

**Response:** `{ "ok": true }`

### POST /api/upstream/sync

Pull and refresh node cache for one or all upstream sources. Session auth.

**Query:** `?id=<index>` to sync one, or omit to sync all

**Response (single):** `{ "ok": true, "count": 12 }`  
**Response (all):** `{ "results": [{ "name": "...", "ok": true, "count": 12 }, ...] }`

**Behavior:**
- Fetches the URL, tries base64 decode first, falls back to plain text
- Filters to valid node URIs only (`vless://`, `vmess://`, etc.)
- Full replacement each sync (not append)
- Failed syncs retain the last-known-good cache

### Refresh on export

Upstream sources are synced on `/api/export/momo` and `/api/export/kernel` requests (freshness-first design), with a **60s minimum interval** between syncs of the same source to avoid duplicate concurrent fetches. Add `?refresh=0` to skip the sync entirely.

If any source fails to sync, the response includes an `X-Upstream-Warning` header (e.g. `1/2 upstream sources failed to sync, serving cached nodes`) and previously cached nodes are served instead.

### Storage

Source list stored under `upstream:urls` KV key. Per-source node cache under `upstream:nodes:<hash>`.
