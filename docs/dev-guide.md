# Development Guide

## Requirements

- Node.js >= 18
- [just](https://github.com/casey/just) — task runner
- [Biome](https://biomejs.dev/) — formatter + linter

## Quick Start

```bash
# Run locally (Node.js adapter)
ADMIN_PASSWORD=test SUB_TOKEN=test node api/node.js
# Or via just:
just run
```

## Dev Commands

| Command | What it does |
|---|---|
| `just format` | Format JS with Biome |
| `just check` | Format + lint check (no write) |
| `just fix` | Auto-fix format + lint |
| `just run` | Start Node.js adapter locally on :3000 |
| `just docker-build` | Build Docker image |
| `just clean` | Remove `data.json` |

## Code Overview

Source modules in `src/`:
- **`shared.js`** — constants, crypto helpers, auth primitives, KV storage adapters (used by all other modules)
- **`core.js`** — login/logout, node upload, export endpoints, route dispatch
- **`upstream.js`** — external subscription sync + CRUD handlers
- **`tokens.js`** — subscription token + scoped token management
- **`export.js`** — sing-box JSON outbound converter (per-node URL parsing)
- **`kernel.js`** — HPC/desktop sing-box config.json generator
- **`momo.js`** — OpenWrt-momo config.json generator
- **`ui.html.js`** — Web UI HTML template + inline JavaScript
- **`css.js`** — Web UI stylesheet

Platform adapters live in `api/`:
- `api/cloudflare.js` — Cloudflare Workers (KV binding)
- `api/node.js` — Node.js HTTP server (file-based store)

Each adapter normalizes the platform environment and passes a standard `{ ADMIN_PASSWORD, SUB_TOKEN, VLESS_NODES, store }` object to `handleRequest()`.

## Adding a New Platform

1. Create `api/<platform>.js`
2. Implement a `store` adapter with `get(key)`, `set(key, value, ttlSeconds?)`, `del(key)`
3. Normalize environment variables from the platform's native API
4. Call `handleRequest(request, env)` from `src/core.js`
5. Add platform config file if needed (e.g., `fly.toml`)
