# Project Structure

```
subhatch/
├── src/
│   ├── core.js           # Platform-agnostic business logic (router + auth + node/upload/export handlers)
│   ├── shared.js         # Constants, crypto helpers, auth, storage primitives
│   ├── upstream.js       # External subscription sync + CRUD
│   ├── tokens.js         # Subscription token + scoped token management
│   ├── export.js         # Sing-box JSON outbound converter
│   ├── kernel.js          # HPC/desktop sing-box config.json generator
│   ├── momo.js           # OpenWrt-momo config.json generator
│   ├── ui.html.js        # Web UI HTML template + JavaScript
│   └── css.js            # Web UI stylesheet
├── api/
│   ├── cloudflare.js     # Cloudflare Workers entry
│   └── node.js           # Node.js HTTP server
├── test/                 # Automated tests (node:test, zero deps)
│   ├── lib/              # Test helpers (server lifecycle + API)
│   ├── unit/             # Unit tests (shared.js, export.js)
│   ├── api/              # HTTP endpoint tests
│   └── integration/      # End-to-end flow
├── docs/                 # Documentation
├── wrangler.toml.example # Cloudflare Workers config template
├── Dockerfile
├── docker-compose.yml
├── justfile              # Dev commands
└── package.json
```
