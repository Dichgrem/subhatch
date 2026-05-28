# 部署指南

## Cloudflare Workers

```bash
# 1. 克隆项目
git clone https://github.com/Dichgrem/subhatch.git
cd subhatch

# 2. 安装 wrangler
npm install -g wrangler
wrangler login

# 3. 创建 KV 命名空间
wrangler kv namespace create VLESS_KV
# → 将 wrangler.toml.example 复制为 wrangler.toml 并填入 id

# 4. 部署（创建 Worker；设置 secret 前会返回 500）
wrangler deploy api/cloudflare.js

# 5. 设置密钥
wrangler secret put ADMIN_PASSWORD
wrangler secret put SUB_TOKEN        # 可选，但强烈建议

# 6. （可选）固定节点
# 在 wrangler.toml 的 [vars] 中：
# VLESS_NODES = "vless://...#MyNode1|vmess://...#MyNode2"

# 7. 重新部署使密钥生效
wrangler deploy api/cloudflare.js
```

访问 `https://your-worker.workers.dev` → 登录 → 管理节点。

---

## Node.js / Docker

**直接运行 Node.js：**
```bash
ADMIN_PASSWORD=changeme SUB_TOKEN=mytoken node api/node.js
# 监听 :3000 端口
```

**Docker（推荐，使用预构建镜像）：**
```bash
docker pull brantcoat/subhatch:latest

docker run -d \
  -p 3000:3000 \
  -v subhatch-data:/data \
  -e ADMIN_PASSWORD=your_strong_password \
  -e SUB_TOKEN=your_random_token \
  --name subhatch \
  brantcoat/subhatch:latest
```

**Docker（自行构建）：**
```bash
docker build -t subhatch .

docker run -d \
  -p 3000:3000 \
  -v subhatch-data:/data \
  -e ADMIN_PASSWORD=your_strong_password \
  -e SUB_TOKEN=your_random_token \
  --name subhatch \
  subhatch
```

**Docker Compose：**
```yaml
services:
  subhatch:
    image: brantcoat/subhatch:latest
    ports:
      - "3000:3000"
    volumes:
      - subhatch-data:/data
    environment:
      - ADMIN_PASSWORD=your_strong_password
      - SUB_TOKEN=your_random_token
      - VLESS_NODES=vless://...#node1|vmess://...#node2
    restart: unless-stopped

volumes:
  subhatch-data:
```

---

## 环境变量

| 变量            | 必填   | 说明                                         |
|-----------------|--------|----------------------------------------------|
| `ADMIN_PASSWORD`| ✅ 是  | Web 管理界面登录密码                           |
| `SUB_TOKEN`     | 否     | 访问 `/sub` 所需的密钥，强烈建议配置             |
| `VLESS_NODES`   | 否     | 固定节点（`\|` 或换行分隔），在 UI 中只读        |
| `PORT`          | 否     | 仅 Node.js。默认：`3000`                       |
| `DATA_FILE`     | 否     | 仅 Node.js。JSON 存储文件路径。默认：`./data.json` |
