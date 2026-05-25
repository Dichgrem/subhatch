# Usage Guide

## Login

On first open you'll see the admin login page. Enter the password set by the `ADMIN_PASSWORD` environment variable. After successful login, a 2-hour session token is stored in localStorage.

More than 10 wrong attempts from the same IP triggers a 15-minute rate limit.

---

## Page Layout

After login the page shows four main sections, each togglable via the topbar buttons.

### Section 1: Subscription URL

Contains:
- **Subscription URL** — import into clients (husi, NekoBox, Clash Meta, etc.)
- **Momo config** — full sing-box config.json for OpenWrt-momo (4 presets)
- **Kernel config** — full sing-box config.json for Linux desktop (4 presets)
- **Node Upload URL** — push nodes via API (`UPLOAD_TOKEN` required)

### Section 2: Access Tokens

**Primary token** (`SUB_TOKEN` env var or `sub:token` KV key): access to all nodes.

**Scoped tokens**: restrict access to a subset of nodes. Share different sets with different people.

Operations: create, rename, assign nodes, rotate (generate new value), delete.

### Section 3: Upstream Sources

Import external subscription URLs. Their nodes are merged into Momo/Kernel exports, but scoped tokens can't see them. Multiple independent sources supported.

Each source can be synced individually or all at once. Sync replaces nodes entirely; failed syncs keep the previous cache.

### Section 4: Nodes

Node management. Supports:
- **Single add**: enter a URI and press Enter or click `+ Add`
- **Bulk import**: paste multiple URIs or base64 subscription content
- **Export JSON**: download all nodes as sing-box outbounds JSON
- **Delete**: ✕ button on each node

Every mutation auto-saves. Status indicator shows `Saving...` → `Saved`.

**Supported schemes:** vless:// vmess:// trojan:// ss:// hysteria2:// hy2:// tuic:// anytls:// naive://

---

## Config Export

### OpenWrt-momo

```
GET /api/export/momo?token=<sub_token>&preset=ipv4only_realip
```

Returns a complete sing-box config.json, usable directly as momo's subscription URL. Four presets:

| Preset | Description |
|--------|-------------|
| `ipv4only_realip` | IPv4 + real DNS (default) |
| `ipv4only_fakeip` | IPv4 + FakeIP |
| `ipv4plus_realip` | Dual-stack + real DNS |
| `ipv4plus_fakeip` | Dual-stack + FakeIP |

### Sing-box Kernel

```
GET /api/export/kernel?token=<sub_token>&preset=ipv4only_realip
```

Similar to Momo but:
- No redirect-in / tproxy-in (no iptables)
- Has `mixed` inbound (HTTP/SOCKS proxy)
- TUN inbound with `auto_route`
- Default port 9191 (vs Momo's 9095)

Both exports sync upstream sources by default before serving the config. Add `?refresh=0` to skip the sync. Sync results are logged in the audit log as `upstream-sync`.

---

## Node Upload API

```bash
POST /api/upload?token=<upload_token>
Content-Type: application/json

{"nodes": ["vless://...", "vmess://..."]}
```

Authenticated via `UPLOAD_TOKEN` (separate from session and sub tokens). Can only upload — cannot view or download nodes.

Dedup: exact URI dedup; same `#name` gets `-2` / `-3` suffixes.

---

## Audit Log

Records all administrative actions. Each entry: timestamp, action type, IP, detail.

Recorded actions:

| Action | Trigger |
|--------|---------|
| `login` / `login-failed` | Login success or failure |
| `blocked` | Rate limit triggered |
| `logout` | Session ended |
| `sub` | Subscription accessed |
| `nodes-save` | Nodes updated |
| `token-*` | Scoped token CRUD |
| `export-*` | Config exported |
| `upload` | Node upload |
| `upstream-*` | Upstream source management |

Max 500 entries. Viewable and clearable from the Web UI.

---

## Card Visibility Toggles

Topbar buttons control which sections are visible:

| Button | Toggles |
|--------|---------|
| Sub / Tokens / Nodes | Show/hide entire card |
| Momo / Kernel | Show/hide export area in subscription card |
| Upload | Show/hide node upload area |
| Upstream | Show/hide upstream source management |
| Log | Show/hide audit log |
| Hide | Mask sensitive content (for screenshots) |

Toggled-on buttons are highlighted with accent border + color.

---

## Managing Upstream Sources

### Adding

Click `+ Add`, enter the external subscription URL (base64 or plain text). Initial sync runs automatically.

### Syncing

Click `Sync` on a source to refresh, or `Sync All` for all sources. Failed syncs keep the last working cache.

### Deleting

Click ✕ to remove a source and its cached nodes.

### Auto-refresh on export

### Skip sync on export

Add `?refresh=0` to `/api/export/momo` or `/api/export/kernel` to skip upstream sync when pulling the config.
