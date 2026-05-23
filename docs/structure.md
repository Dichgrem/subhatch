# Project Structure

```
subhatch/
├── src/
│   ├── core.js           # Platform-agnostic business logic
│   ├── export.js         # Sing-box JSON outbound converter
│   ├── kernel.js          # HPC/desktop sing-box config.json generator
│   ├── momo.js           # OpenWrt-momo config.json generator
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
