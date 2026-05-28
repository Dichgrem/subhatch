<p align="right">
  <a href="README.md">English</a> |
  <a href="README_zh-CN.md">简体中文</a>
</p>

# Subhatch

A lightweight, self-hosted subscription manager for proxy nodes.

Supports **VLESS · VMess · Trojan · Shadowsocks · Hysteria2 · TUIC · AnyTLS · Naive**.

<p align="center">
  <img src="https://github.com/Dichgrem/subhatch/blob/main/example.png" width="700">
</p>

---

## Features

- **Multi-platform** — Cloudflare Workers, Node.js / Docker
- **Web UI** — login, node CRUD, bulk paste, light/dark mode, mobile responsive
- **Secure admin** — session tokens, brute-force rate limiting (10 attempts / 15 min)
- **Token-gated subscription** — subscription URL with secret token, scoped tokens per node set
- **Multi-node input** — paste one or many URIs (newline/pipe-separated) or base64 subscription
- **Node QR & copy** — individual QR code and copy button per node row
- **Upstream import** — subscribe to external URLs, merge into export
- **Config export** — sing-box outbound JSON ([desktop](docs/usage_zh-CN.md#sing-box-kernel) and [HPC](docs/usage_zh-CN.md#sing-box-kernel) variants)
- **Node upload API** — `POST /api/upload` with auto-generated token
- **Momo export** — OpenWrt-momo full config with 4 presets
- **Audit log** — color-coded admin operation history with IP
- **Hidden info mode** — hide sensitive text for screenshots
- **Version update check** — GitHub release notification in UI
- **Zero dependencies** — plain ES Modules, no npm install needed
- **Pre-hashed passwords** — supports SHA-256 hex strings for zero-plaintext deployment
- **CSRF-safe** — sessions in localStorage as Bearer tokens, not cookies

---

## Quick Start

### Cloudflare Workers (recommended, free)

```bash
# 1. Clone and enter the project
git clone https://github.com/Dichgrem/subhatch.git
cd subhatch

# 2. Install wrangler
npm install -g wrangler
wrangler login

# 3. Create KV namespace
wrangler kv namespace create VLESS_KV

copy wrangler.toml.example to wrangler.toml and paste your id

# 4. Deploy
wrangler deploy api/cloudflare.js
# Note that Cloudflare requires you to link your email and enable workers.

# 5. Set secrets
wrangler secret put ADMIN_PASSWORD
wrangler secret put SUB_TOKEN        # optional but recommended

# 6. Redeploy to apply secrets
wrangler deploy api/cloudflare.js

# 7. Update deploy
cd subhatch
git pull
wrangler deploy api/cloudflare.js
```

### Node.js / Docker

**Direct Node.js:**
```bash
ADMIN_PASSWORD=changeme SUB_TOKEN=mytoken node api/node.js
# Listens on :3000
```

**Docker:**
```bash
docker build -t subhatch .
docker run -d -p 3000:3000 -v subhatch-data:/data \
  -e ADMIN_PASSWORD=your_strong_password \
  -e SUB_TOKEN=your_random_token \
  --name subhatch subhatch
```

**Docker Compose:** `docker compose up -d`

---

## Documentation

| Doc | EN | 中文 |
|---|---|---|
| Usage Guide | [usage.md](docs/usage.md) | [usage_zh-CN.md](docs/usage_zh-CN.md) |
| Deployment | [deploy.md](docs/deploy.md) | [deploy_zh-CN.md](docs/deploy_zh-CN.md) |
| API Reference | [api.md](docs/api.md) | [api_zh-CN.md](docs/api_zh-CN.md) |
| Development Guide | [dev-guide.md](docs/dev-guide.md) | [dev-guide_zh-CN.md](docs/dev-guide_zh-CN.md) |
| Testing | [testing.md](docs/testing.md) | [testing_zh-CN.md](docs/testing_zh-CN.md) |
| Structure | [structure.md](docs/structure.md) | [structure_zh-CN.md](docs/structure_zh-CN.md) |
