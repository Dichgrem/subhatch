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
- **Web 管理界面** — 登录管理、节点增删、批量粘贴，支持亮色/暗色主题与移动端自适应
- **安全管理** — 会话 Token、暴力破解限流（15 分钟内最多 10 次）
- **Token 鉴权订阅** — 订阅地址可设置密钥访问，支持多 Token 分别绑定不同节点
- **多节点输入** — 粘贴单条或批量 URI（换行/竖线分隔），自动识别 base64 编码的订阅内容
- **节点二维码与复制** — 每个节点独立生成二维码和复制按钮
- **上游订阅导入** — 合并外部订阅链接到导出配置
- **配置导出** — sing-box 出站 JSON（桌面与 HPC 版本）
- **节点上传接口** — `POST /api/upload`，自动生成上传令牌
- **Momo 导出** — OpenWrt-momo 完整配置，支持 4 种预设
- **审计日志** — 管理操作彩色记录，包含 IP 地址
- **截图隐身模式** — 一键隐藏敏感信息
- **版本更新检查** — 自动检测 GitHub 新版本
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

# 7.更新部署
cd subhatch
git pull
wrangler deploy api/cloudflare.js
```

### Node.js / Docker

**直接运行 Node.js：**
```bash
ADMIN_PASSWORD=changeme SUB_TOKEN=mytoken node api/node.js
# 监听 :3000 端口
```

**Docker（推荐，使用预构建镜像）：**
```bash
docker pull brantcoat/subhatch:latest
docker run -d -p 3000:3000 -v subhatch-data:/data \
  -e ADMIN_PASSWORD=your_strong_password \
  -e SUB_TOKEN=your_random_token \
  --name subhatch brantcoat/subhatch:latest
```

**Docker（自行构建）：**
```bash
docker build -t subhatch .
docker run -d -p 3000:3000 -v subhatch-data:/data \
  -e ADMIN_PASSWORD=your_strong_password \
  -e SUB_TOKEN=your_random_token \
  --name subhatch subhatch
```

**Docker Compose：** 下载 [`docker-compose.yml`](docker-compose.yml) 然后 `docker compose up -d`

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
