<p align="right">
  <a href="README.md">English</a> |
  <a href="README_zh-CN.md">简体中文</a>
</p>

# Subhatch

轻量级、自托管的代理节点订阅管理器。

支持 **VLESS · VMess · Trojan · Shadowsocks · Hysteria2 · TUIC · AnyTLS · Naive**。

<p align="center">
  <img src="https://github.com/Dichgrem/subhatch/blob/main/example.png" width="700">
</p>

---

## 特性

- **多平台** — Cloudflare Workers、Node.js / Docker
- **Web 管理界面** — 可视化添加、删除、批量导入节点，支持亮色/暗色主题切换
- **安全管理** — 会话 Token、暴力破解限流（15 分钟内最多 10 次）
- **Token 鉴权订阅** — 订阅地址可设置密钥访问
- **环境变量注入节点** — 无需通过 UI 即可添加固定节点
- **批量导入** — 支持粘贴原始 URI 或 base64 编码的订阅内容
- **二维码** — 在 UI 中直接扫码获取订阅地址
- **Sing-box 导出** — 一键下载所有节点为 sing-box 出站 JSON 配置
- **零依赖** — 纯 ES Modules，无需 npm install
- **预哈希密码** — 支持 SHA-256 十六进制字符串，无需明文存储
- **CSRF 安全** — 会话存储在 localStorage 中作为 Bearer Token，不使用 Cookie

---

## 快速开始

### Cloudflare Workers（推荐，免费）

```bash
# 1. 克隆项目
git clone https://github.com/Dichgrem/subhatch.git
cd subhatch

# 2. 安装 wrangler
npm install -g wrangler
wrangler login

# 3. 创建 KV 命名空间
wrangler kv namespace create VLESS_KV

将 wrangler.toml.example 复制为 wrangler.toml 并填入 id

# 4. 部署
wrangler deploy api/cloudflare.js
# 注意Cloudflare需要绑定邮箱并开启worker

# 5. 设置密钥
wrangler secret put ADMIN_PASSWORD
wrangler secret put SUB_TOKEN        # 可选，但强烈建议

# 6. 重新部署使密钥生效
wrangler deploy api/cloudflare.js
```

### Node.js / Docker

**直接运行 Node.js：**
```bash
ADMIN_PASSWORD=changeme SUB_TOKEN=mytoken node api/node.js
# 监听 :3000 端口
```

**Docker：**
```bash
docker build -t subhatch .
docker run -d -p 3000:3000 -v subhatch-data:/data \
  -e ADMIN_PASSWORD=your_strong_password \
  -e SUB_TOKEN=your_random_token \
  --name subhatch subhatch
```

**Docker Compose：** `docker compose up -d`

---

## 文档

| 文档 | EN | 中文 |
|---|---|---|
| 使用指南 | [usage.md](docs/usage.md) | [usage_zh-CN.md](docs/usage_zh-CN.md) |
| 部署指南 | [deploy.md](docs/deploy.md) | [deploy_zh-CN.md](docs/deploy_zh-CN.md) |
| API 参考 | [api.md](docs/api.md) | [api_zh-CN.md](docs/api_zh-CN.md) |
| 开发指南 | [dev-guide.md](docs/dev-guide.md) | [dev-guide_zh-CN.md](docs/dev-guide_zh-CN.md) |
| 测试 | [testing.md](docs/testing.md) | [testing_zh-CN.md](docs/testing_zh-CN.md) |
| 项目结构 | [structure.md](docs/structure.md) | [structure_zh-CN.md](docs/structure_zh-CN.md) |
