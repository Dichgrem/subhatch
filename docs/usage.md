# Usage Guide

## Login

On first open you'll see the admin login page. Enter the password set by the `ADMIN_PASSWORD` environment variable. Successful login grants a 2-hour session token stored in localStorage. Closing and reopening the browser will auto-restore the session.

More than 10 wrong attempts from the same IP triggers a 15-minute rate limit, returning 429.

The **Logout** button in the topbar ends the current session.

---

## Layout Overview

After login, the page has the following sections, top to bottom:

| Section | Visible by default | Description |
|---------|-------------------|-------------|
| Stats bar | Yes | Next to title: green dot + Nodes / Env / Stored counts |
| Topbar buttons | Yes | Toggle visibility of cards and subsections |
| Subscription URL | Yes (toggle with Sub) | Subscription link + config export + node upload |
| OpenWrt-momo | No (expand with Momo) | Full momo config.json export |
| sing-box Kernel | No (expand with Kernel) | Full kernel config.json export |
| Node Upload | No (expand with Upload) | Node push API URL |
| Upstream Sources | No (expand with Upstream) | External subscription import |
| Access Tokens | Yes (toggle with Tokens) | Primary + scoped token management |
| Nodes | Yes (toggle with Nodes) | Node CRUD |
| Audit Log | No (expand with Log) | Operation audit trail |

Toggled-on buttons are highlighted (accent border + color). Sub, Tokens, and Nodes cards default to visible; click their buttons to hide.

---

## Subscription URL

The first card after login, showing the main subscription URL.

### Subscription Link

Format: `https://your-domain.com/sub?token=<32-char-hex>`

Operations:

- 🎲 **Rotate** — generate a new token; old one invalidates immediately. All clients must update
- ⎘ **Copy** — copy subscription URL to clipboard
- ▦ **QR Code** — show QR code for phone scanning

Paste this URL into your client's subscription field (husi, sing-box, NekoBox, Clash Meta, etc.).

### Hide Mode

The topbar **Hide** button masks sensitive content: node names become `•••••••`, subscription/config URLs show `Hidden for screenshot`. Useful for sharing screenshots without exposing private data.

---

## OpenWrt-momo

Click the **Momo** button in the topbar to expand. Generates a complete sing-box config.json for luci-app-momo on OpenWrt routers.

### Preset Selection

Dropdown with 4 options:

| Preset | IPv6 | DNS | TUN Interface |
|--------|------|-----|---------------|
| `IPv4 + RealIP` | No | Real DNS | `momo` |
| `IPv4 + FakeIP` | No | FakeIP (198.18.0.0/15) | `momo` |
| `IPv4+6 + RealIP` | Yes | Real DNS | `momo` |
| `IPv4+6 + FakeIP` | Yes | FakeIP + v6 range | `momo` |

### Usage

1. Select a preset
2. Press ⎘ to copy the URL
3. Paste into momo's "Subscription" or "File" profile

Momo auto-syncs upstream sources on each request (when upstream sources exist), deduplicated by a 60s minimum interval. Add `?refresh=0` to skip. Failed sources are served from cache with an `X-Upstream-Warning` header.

URL format:

```
https://your-domain.com/api/export/momo?token=<sub_token>&preset=ipv4only_realip
```

### Generated Config Includes

- `log`: info level with timestamps
- `dns`: real DNS (local UDP → ali DoH → Google DoH); FakeIP presets add FakeIP server + A/AAAA rewrite
- `ntp`: time sync (time.apple.com)
- `inbounds`: dns-in (1053), redirect-in (7890), tproxy-in (7891), tun-in (momo device)
- `outbounds`: all nodes + GLOBAL selector + direct
- `route`: sniff → hijack-dns → private-ip → geosite-cn → geoip-cn → selector
- `experimental`: cache_file + clash_api (Yacd-meta dashboard, port 9095)

---

## sing-box Kernel (HPC)

Click the **Kernel** button to expand. Generates config for the sing-box kernel on Linux desktop / HPC (`/etc/sing-box/config.json`).

Same 4 presets as Momo. Key differences:

| Feature | Momo | Kernel |
|---------|------|--------|
| redirect-in | Yes | No |
| tproxy-in | Yes | No |
| mixed inbound | No | Yes (7890, HTTP/SOCKS) |
| TUN auto_route | No | Yes |
| TUN interface | `momo` | `stun` |
| TUN IPv4 | 172.31.0.1/30 | 172.19.0.1/30 |
| NTP | Yes | No |
| auto_detect_interface | No | Yes |
| Clash API port | 9095 | 9191 |

URL format:

```
https://your-domain.com/api/export/kernel?token=<sub_token>&preset=ipv4only_realip
```

---

## Node Upload

Click the **Upload** button to expand. Shows the API endpoint and token for pushing nodes.

### Getting the Token

Controlled by the `UPLOAD_TOKEN` environment variable. Unset → shows "— (UPLOAD_TOKEN not set)" and the upload API returns 403.

When set, displays the full URL with token:

```
POST https://your-domain.com/api/upload?token=<upload_token>
```

- 🎲 **Rotate** — generate new upload token; old one invalidates
- ⎘ **Copy** — copy upload URL

### Upload Format

```bash
curl -X POST "https://your-domain.com/api/upload?token=<upload_token>" \
  -H "Content-Type: application/json" \
  -d '{"nodes":["vless://uuid@server:port?params#Name"]}'
```

Returns: `{"ok": true, "added": 3, "dupes": 1}`

### Upload Rules

- Only valid-scheme URIs are accepted
- Existing nodes are skipped and counted as dupes
- Same `#name` gets `-2`, `-3` suffixes
- Each upload is recorded in the audit log as `upload`
- Token is independent from session and subscription; upload-only, cannot view nodes

---

## Upstream Sources

Click the **Upstream** button to expand. Import external subscription URLs as upstream sources.

### Why Use This

You have nodes from another subscription provider and want them included in subhatch's Momo / Kernel exports. Add their subscription URL as an upstream source — each export will automatically pull and merge those nodes into the `GLOBAL` selector.

Upstream nodes are invisible to scoped tokens — only the primary token (momo/kernel exports) sees them.

### Adding a Source

Click **+ Add**:

1. Enter the subscription URL (e.g. `https://provider.com/sub?token=xxx`)
2. Enter a name (optional; falls back to URL hostname)
3. Initial sync runs automatically on creation

Supports both base64 and plain text formats.

### Managing Sources

Each source shows: name, URL, last sync time, node count / error message.

| Button | Action |
|--------|--------|
| **Sync** | Sync a single source. Success: update cache. Failure: keep last-good cache |
| **Sync All** | Sync all sources at once |
| ✕ | Delete source and its cached nodes |

### Sync Behavior

- Each sync **replaces entirely**, not appends
- Failed syncs retain the previous cache
- Sync results written to audit log (`upstream-sync`): success → INFO, failure → ERROR
- Momo / Kernel exports **auto-sync upstream by default** (60s min interval per source; add `?refresh=0` to skip)

---

## Access Tokens

Manage subscription access tokens. One card showing all tokens.

### Primary Token

Initialized from the `SUB_TOKEN` environment variable. Can be rotated in the UI. Access to all nodes (env + stored + upstream). Rotation invalidates the old token immediately.

### Scoped Tokens

Scoped tokens restrict access to a specific subset of nodes. Share different node sets with different people.

Operations:

- **+ Create Token** — create a new scoped token, opens node assignment immediately
- **Assign nodes** — check/uncheck nodes; the token can only access those checked
- **Rename** — click the token name to edit
- ⎘ **Copy** — copy the token's subscription URL
- ▦ **QR Code** — show QR code for this token
- 🎲 **Rotate** — generate new key; old one invalidates
- ✎ **Edit nodes** — reassign which nodes this token can access
- ✕ **Delete** — remove the token

### Token Node Pool

Scoped tokens can only access stored nodes + env nodes. Upstream source nodes are excluded from scoped token filtering.

---

## Nodes

Node management card. All node operations happen here.

### Adding a Node

Paste a node URI (`vless://...`) into the input, press Enter or click **+ Add**. Auto-saves; status bar shows `Saving...` → `Saved`.

### Bulk Import

Click **Bulk Import** to open the import modal. Supports:

- Multi-line paste, one URI per line
- Pipe `|` or newline-separated
- Base64-encoded subscription content (auto-detected and decoded)

Click Import; duplicates are skipped automatically.

### Export JSON

Click **Export JSON** to download all nodes as a sing-box outbounds JSON file. Invalid URIs are recorded as errors but don't block the export of valid ones.

### Node List

Each row displays:

- **Scheme badge** (vless, vmess, trojan, etc.)
- **Node name** (extracted from `#` fragment, or hostname:port)
- **Source label**: ⚙ env (injected via environment variable) / ✎ stored (added manually)
- ✕ **Delete button** (stored nodes only; env nodes can't be deleted)

Click a node row to copy its full URI to clipboard.

The list is sorted by scheme type, then by name. Stats in the header update automatically.

### Supported Schemes

`vless://` `vmess://` `trojan://` `ss://` `ssr://` `hysteria2://` `hy2://` `tuic://` `anytls://` `naive://`

---

## Audit Log

Click the **Log** button to expand. Records all administrative actions.

### Log Format

Each entry contains:

| Field | Description |
|-------|-------------|
| Timestamp | To-second precision |
| Level | INFO / WARN / ERROR (color-coded) |
| Action | Operation type |
| IP | Source IP address |
| Detail | Extra info (node count, token name, etc.) |

### Log Levels

| Level | Color | Meaning |
|-------|-------|---------|
| ERROR | Red | Upstream sync failure |
| WARN | Amber | Wrong password, rate-limit triggered |
| INFO | Muted | All normal operations |

### Recorded Actions

| Action | Level | Trigger |
|--------|-------|---------|
| `login` | INFO | Successful login |
| `login-failed` | WARN | Wrong password |
| `blocked` | WARN | Rate limit triggered (429) |
| `logout` | INFO | Session ended |
| `sub` | INFO | Subscription accessed |
| `nodes-save` | INFO | Nodes updated |
| `token-create` | INFO | Scoped token created |
| `token-update` | INFO | Scoped token modified |
| `token-rotate` | INFO | Token rotated |
| `token-delete` | INFO | Scoped token deleted |
| `export-momo` | INFO | Momo config exported |
| `export-kernel` | INFO | Kernel config exported |
| `export-json` | INFO | Sing-box JSON exported |
| `upload` | INFO | Node uploaded via API |
| `upstream-add` | INFO | Upstream source added |
| `upstream-sync` | INFO/ERROR | Upstream sync (ERROR if any source failed) |
| `upstream-delete` | INFO | Upstream source deleted |

Max 500 entries retained. Operations:

- ↻ — Refresh log
- ✕ Clear — Clear all entries
