# 项目结构

```
subhatch/
├── src/
│   ├── core.js           # 平台无关业务逻辑（路由 + 认证 + 节点/上传/导出处理）
│   ├── shared.js         # 常量、加密、认证、存储基础函数
│   ├── upstream.js       # 外部订阅同步 + CRUD
│   ├── tokens.js         # 订阅令牌 + 作用域令牌管理
│   ├── export.js         # Sing-box JSON 出站转换器
│   ├── kernel.js          # HPC/桌面 sing-box config.json 生成器
│   ├── momo.js           # OpenWrt-momo config.json 生成器
│   ├── ui.html.js        # Web UI HTML 模板 + JavaScript
│   └── css.js            # Web UI 样式表
├── api/
│   ├── cloudflare.js     # Cloudflare Workers 入口
│   └── node.js           # Node.js HTTP 服务器
├── test/                 # 自动化测试（node:test，零依赖）
│   ├── lib/              # 测试工具（服务器生命周期 + API）
│   ├── unit/             # 单元测试（shared.js, export.js）
│   ├── api/              # HTTP 端点测试
│   └── integration/      # 端到端流程
├── docs/                 # 文档
├── wrangler.toml.example # Cloudflare Workers 配置模板
├── Dockerfile
├── docker-compose.yml
├── justfile              # 开发命令
└── package.json
```
