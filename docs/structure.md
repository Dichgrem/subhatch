# Project Structure

```
subhatch/
├── src/
│   ├── core.js           # Platform-agnostic business logic
│   ├── export.js         # Sing-box JSON export converter
│   └── ui.html.js        # Web UI HTML template
├── api/
│   ├── cloudflare.js     # Cloudflare Workers entry
│   └── node.js           # Node.js HTTP server
├── docs/                 # Documentation
├── wrangler.toml.example # Cloudflare Workers config template
├── Dockerfile
├── docker-compose.yml
├── justfile              # Dev commands
└── package.json
```
