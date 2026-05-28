# Deployment

## Cloudflare Workers

```bash
# Clone and enter the project
git clone https://github.com/Dichgrem/subhatch.git
cd subhatch

# Install wrangler
npm install -g wrangler
wrangler login

# Create KV namespace
wrangler kv namespace create VLESS_KV
# → copy wrangler.toml.example to wrangler.toml and paste your id

# Deploy (creates the Worker; will 500 until secrets are set)
wrangler deploy api/cloudflare.js

# Set secrets
wrangler secret put ADMIN_PASSWORD
wrangler secret put SUB_TOKEN        # optional but recommended

# (Optional) static nodes via env var
# In wrangler.toml [vars]:
# VLESS_NODES = "vless://...#MyNode1|vmess://...#MyNode2"

# Redeploy to apply secrets
wrangler deploy api/cloudflare.js
```

Visit `https://your-worker.workers.dev` → login → manage nodes.

---

## Node.js / Docker

**Direct Node.js:**
```bash
ADMIN_PASSWORD=changeme SUB_TOKEN=mytoken node api/node.js
# Listens on :3000
```

**Docker (pre-built image, recommended):**
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

**Docker (build from source):**
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

**Docker Compose:**
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

## Environment Variables

| Variable        | Required | Description                                                |
|-----------------|----------|------------------------------------------------------------|
| `ADMIN_PASSWORD`| ✅ Yes   | Password for the Web UI admin login                        |
| `SUB_TOKEN`     | No       | Secret token required to access `/sub`. Highly recommended |
| `VLESS_NODES`   | No       | Static nodes (pipe `\|` or newline separated). Read-only in UI |
| `PORT`          | No       | Node.js only. Default: `3000`                              |
| `DATA_FILE`     | No       | Node.js only. Path to JSON store. Default: `./data.json`   |
