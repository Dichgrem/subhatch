# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [5.3.0] - 2026-09-01

### Changed
- Migrate generated configs to sing-box 1.14.0:
  - rule-set download channel `download_detour` → `http_client` (add top-level `http_clients` + `route.default_http_client`)
  - unify `default_domain_resolver` to string form (momo presets)

## [5.2.1] - 2026-06-23

### Fixed
- **SECURITY** Stored XSS via upstream error messages — upstream.lastError now HTML-escaped in UI
- **SECURITY** Stored XSS via audit log IP/detail/action fields — all now HTML-escaped; level restricted to whitelist
- **SECURITY** Weak password hashing — replaced plain SHA-256 with PBKDF2-SHA256 (100k iterations, random salt), auto-upgrade on login
- **SECURITY** Blind SSRF — upstream sync blocks literal IPs in private/reserved/loopback ranges before fetch
- Removed permissive `Access-Control-Allow-Origin: *` OPTIONS handler (cross-origin never functional, UI is same-origin)

## [5.2.0] - 2026-05-28

### Added
- Modular architecture: core.js split into shared.js, upstream.js, tokens.js
- CSS extracted from ui.html.js into css.js for independent styling
- Timing-safe password hash comparison (XOR constant-time)
- X-Forwarded-Proto header validation for reverse proxy deployments
- Upload token auto-generated on first access (no manual env var needed)
- Upload section split into URL and token rows with labels for clarity
- QR code button per node row for individual node scanning
- Copy button per node row besides QR
- Responsive audit log — columns shrink, level hidden on mobile

### Changed
- Bulk Import modal removed; addNode() accepts multi-line/base64 input inline
- Add input changed to textarea supporting newlines for batch paste
- Node rows no longer show stored/env source labels
- Upload endpoint now auto-generates token rather than requiring UPLOAD_TOKEN env
- Scoped token nodes validated through isValidNode filter
- Upstream URL scheme restricted to http/https (SSRF prevention)
- Query parsing uses URLSearchParams instead of manual string splitting
- Node.js adapter: loadDB gains read-lock to prevent concurrent-access races
- int() helper deduplicated into export.js (shared by kernel.js, momo.js)

### Fixed
- Audit log corrupt entries no longer crash the request (try-catch on JSON.parse)
- Audit log panel not hidden on logout (moved inside v-main view)
- Upstream source URLs overlapping buttons on narrow screens
- Log section now properly reset on logout via resetPanels()
- ssr:// nodes explicitly reported as unsupported by sing-box export

## [5.1.0] - 2026-05-28

### Added
- Light/dark mode toggle with localStorage persistence and CSS variable theming
- GitHub link button in topbar for quick source access

### Changed
- Token manager merged into Sub card as default-visible section; stand-alone toggle removed
- Theme toggle button placed next to Hide in topbar
- Mobile responsive: topbar buttons wrap and shrink at narrow viewports
- Protocol text truncates on narrow screens instead of multi-line wrapping
- Upstream source entries use tighter spacing with URL truncation for narrow layouts

### Fixed
- Log section and other toggled panels now reset on logout (no longer persist)
- Upstream source URLs no longer overlap sync/delete buttons on narrow screens

## [5.0.0] - 2026-05-26

### Added
- Upstream subscription import: add external subscription URLs as upstream sources, merged into Momo/Kernel selector (`/api/upstream` CRUD + sync)
- Upstream sync auto-triggers on Momo/Kernel export by default (skip with `?refresh=0`)
- Node upload API (`POST /api/upload`) with `UPLOAD_TOKEN` auth, dedup, and name suffix
- Audit log: records all admin operations with ERROR/WARN/INFO levels, color-coded in UI
- Card visibility toggles (Sub / Tokens / Nodes) in topbar
- Upload token management (`GET/PUT /api/upload-token`) with rotation and UI display

### Changed
- Topbar buttons use highlight style (`.btn-toggled`) instead of `✓` text suffix
- Stats bar moved to header, next to subtitle; green dot moved to header
- Logout button moved to header title line
- Upstream Sources and Audit Log hidden by Hide toggle
- Upstream sync changed from opt-in (`?refresh=1`) to default; `?refresh=0` disables
- DNS: switched from AliDNS (`223.5.5.5`, `dns.alidns.com`) to Tencent DNSPod (`119.29.29.29`, `doh.pub`)
- UI grid background opacity increased for better low-brightness visibility
- Scoped token subscriptions show token identity in audit detail

### Fixed
- Upload endpoint missing brute-force rate limiting
- Duplicate preset normalization extracted to shared function
- `/api/logout` now validates session before destroying token
- Brute-force counter now cleared on successful upload/export (was only login)
- Sub audit detail now identifies which token was used (primary/scoped name/public)
- Tag dedup in export prevents sing-box rejecting config with duplicate outbound tags

## [4.6.0] - 2026-05-25

### Added
- `?refresh=0` parameter on Momo/Kernel export to skip upstream sync

### Fixed
- Upstream sync on export now logs audit entry (was running silently)
- Default sync skips when no upstream URLs configured (not based on cached node count)

## [4.5.0] - 2026-05-25

### Added
- Audit logging: records login, logout, sub access, node saves, token operations, config exports
- `GET /api/audit-log` and `DELETE /api/audit-log` endpoints (session auth)
- Audit Log card in Web UI with timestamp, action, IP, detail display

### Fixed
- `/api/logout` requires session validation before destroying token
- Rate limiting on `/sub` now covers all cases (was missing in public mode without scoped tokens)
- Brute-force counter cleared on successful Momo/Kernel export

### Security
- Audit log detail field escaped with `escHtml()` to prevent XSS
- All brute-force blocked events now audit-logged

## [4.0.0] - 2026-05-24

### Added
- 4-preset system: `ipv4only_realip`, `ipv4only_fakeip`, `ipv4plus_realip`, `ipv4plus_fakeip`
- Preset selector dropdown in Momo and Kernel UI sections
- Kernel config preset URL auto-updates on selection change
- Node upload area hidden by default, togglable via Upload button

### Changed
- Default preset: `ipv4only_realip` (was `ipv4only` with FakeIP enabled)
- `fakeip` query parameter now overrides preset default (was standalone enable/disable)
- Preset aliases unified via `normalizePreset()` helper

### Fixed
- SS parser empty tag fallback produces `defaultTag()` instead of empty string
- RealIP presets include `fakeipRange` for safe URL override

## [3.7.0] - 2026-05-23

### Added
- Kernel config export (`GET /api/export/kernel`): sing-box HPC/desktop config with TUN+mixed inbound
- Kernel toggle and URL section in Web UI
- Tag deduplication in `exportSingBox()`: duplicate outbound names get `-2`/`-3` suffix
- Reserved tag collision protection (node named "direct" or "GLOBAL" auto-renamed)
- `GET /api/export/sing-box` now audit-logged

### Changed
- Kernel DNS geosite-cn rule uses `local` server (matches reference template)
- Kernel `reverse_mapping` fixed to `false` (matches reference template)
- Removed redundant catch-all route rule in kernel config (use `final` only)

### Fixed
- `buildKernelConfig` produces valid config when node names collide with reserved tags
- `showMain` and other functions accidentally deleted by edit conflict restored
- `api()` function now returns structured error instead of throwing on network failure

## [3.5.0] - 2026-05-22

### Added
- Auto-save: node add/delete/bulk-import triggers save immediately, no manual Save button
- Inline save status indicator (`Saving...` → `Saved` / `Save error`)

### Changed
- Save button removed; replaced with status text in node card header
- Export JSON button moved to right-column alignment with `+ Add` button

## [3.0.0] - 2026-05-22

### Added
- Momo config export (`GET /api/export/momo`): complete sing-box config.json for OpenWrt-momo
- 4 inbounds: dns-in, redirect-in, tproxy-in, tun-in (momo device)
- Dual-stack support with `ipv4only` and `ipv4+6` presets
- FakeIP toggle via `?fakeip=false` for real DNS mode
- Momo button in topbar; Momo URL section in UI with copy and auto-update on token rotation
- Version check against GitHub releases API

### Changed
- Clash API listen address uses `[::]` for dual-stack to avoid `:::port` malformed address

## [2.0.0] - 2026-05-21

### Added
- Scoped tokens: create multiple subscription tokens, each with its own node set
- Token CRUD endpoints (`GET/POST/PUT/DELETE /api/sub-tokens`, `POST /api/sub-tokens/rotate`)
- Token manager UI with create, rename, assign nodes, rotate, delete
- Token QR codes for scoped tokens
- Sub-token rotation with dice button in Web UI
- Anytls and Naive protocol support
- Hide/Show toggle for sensitive info in Web UI (screenshot mode)
- Node click-to-copy to clipboard
- Node list sorted by protocol type then name

### Fixed
- Token encoding in subscription URLs to prevent parsing errors

## [1.0.0] - 2026-05-20

### Added
- Multi-platform support: Cloudflare Workers, Node.js, Docker
- Web UI with login, node management, bulk import
- Base64 subscription endpoint (`GET /sub`) with token-gated access
- Env-var node injection (`VLESS_NODES`)
- Sing-box JSON export with VLESS, VMess, Trojan, SS, Hysteria2, TUIC protocol support
- Session-based auth with bearer tokens (no cookies, CSRF-safe)
- Brute-force rate limiting (10 attempts / 15 min per IP)
- Pre-hashed SHA-256 password support
- QR code for subscription URL
- Bulk import with base64 decode

### Security
- IP detection chain: CF-Connecting-IP → X-Forwarded-For → X-Real-IP → socket remoteAddress
- Node.js adapter: 1 MB body limit, serialized file writes
