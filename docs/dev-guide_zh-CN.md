# 开发指南

## 环境要求

- Node.js >= 18
- [just](https://github.com/casey/just) — 任务运行器
- [Biome](https://biomejs.dev/) — 格式化 + 代码检查

## 快速启动

```bash
# 本地运行（Node.js 适配器）
ADMIN_PASSWORD=test SUB_TOKEN=test node api/node.js
# 或通过 just：
just run
```

## 开发命令

| 命令 | 说明 |
|---|---|
| `just format` | 用 Biome 格式化 JS |
| `just check` | 格式化 + 代码检查（不写入） |
| `just fix` | 自动修复格式和 lint |
| `just run` | 本地启动 Node.js 适配器（:3000） |
| `just docker-build` | 构建 Docker 镜像 |
| `just clean` | 删除 `data.json` |

## 代码概述

`src/` 下的模块：
- **`shared.js`** — 常量、加密工具、认证基础函数、KV 存储适配器（被所有其他模块引用）
- **`core.js`** — 登录/登出、节点上传、配置导出、路由分发
- **`upstream.js`** — 外部订阅同步 + CRUD 处理
- **`tokens.js`** — 订阅令牌 + 作用域令牌管理
- **`export.js`** — Sing-box JSON 出站转换器（逐节点 URL 解析）
- **`kernel.js`** — HPC/桌面 sing-box config.json 生成器
- **`momo.js`** — OpenWrt-momo config.json 生成器
- **`ui.html.js`** — Web UI HTML 模板 + 内联 JavaScript
- **`css.js`** — Web UI 样式表

平台适配器位于 `api/`：
- `api/cloudflare.js` — Cloudflare Workers（KV 绑定）
- `api/node.js` — Node.js HTTP 服务器（文件存储）

每个适配器规范化平台环境，将 `{ ADMIN_PASSWORD, SUB_TOKEN, VLESS_NODES, store }` 传递给 `handleRequest()`。

## 添加新平台

1. 创建 `api/<platform>.js`
2. 实现 `store` 适配器：`get(key)`、`set(key, value, ttlSeconds?)`、`del(key)`
3. 从平台原生 API 规范化环境变量
4. 调用 `src/core.js` 的 `handleRequest(request, env)`
5. 如需添加平台配置文件（如 `fly.toml`）
