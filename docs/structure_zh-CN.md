# 项目结构

```
subhatch/
├── src/
│   ├── core.js           # 平台无关业务逻辑
│   ├── export.js         # Sing-box JSON 导出转换器
│   └── ui.html.js        # Web UI HTML 模板
├── api/
│   ├── cloudflare.js     # Cloudflare Workers 入口
│   └── node.js           # Node.js HTTP 服务器
├── docs/                 # 文档
├── wrangler.toml.example # Cloudflare Workers 配置模板
├── Dockerfile
├── docker-compose.yml
├── justfile              # 开发命令
└── package.json
```
