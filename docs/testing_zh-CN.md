# 测试

119 项自动化测试，使用 Node.js 内置的 `node:test` + `node:assert`。零依赖。

## 快速开始

```bash
# 完整测试（单元 + API + 集成）
just test
# 或：node --test --test-concurrency=1 "test/**/*.test.js"

# 仅单元测试（无需服务器，快速）
just test-unit
# 或：node --test "test/unit/*.test.js"
```

## 结构

```
test/
├── lib/
│   └── helpers.js            # 服务器生命周期 + API 封装
├── unit/
│   ├── shared.test.js        # 加密、IP 过滤、解析（43 项）
│   └── export.test.js        # 协议解析器（14 项）
├── api/
│   ├── auth.test.js          # POST /api/login, /api/logout
│   ├── nodes.test.js         # GET/PUT /api/nodes
│   ├── sub.test.js           # /sub, 作用域令牌 CRUD
│   ├── export.test.js        # /api/export/sing-box, /momo, /kernel
│   ├── upload.test.js        # POST /api/upload, /api/upload-token
│   ├── upstream.test.js      # 上游 CRUD + sync + SSRF 防护
│   └── audit.test.js         # 审计日志读取/清空
└── integration/
    └── full.test.js          # 12 步端到端流程
```

## 工作原理

- 每个 API/集成测试文件自动启动一个 Node.js 服务器（`api/node.js`），使用随机端口和 `/tmp` 下的临时 `data.json`。测试文件完成后服务器被终止，临时文件被删除。
- `test/lib/helpers.js` 提供 `startServer()`、`cleanup()` 和 `api()` — 轻量的 fetch 封装，自动处理会话 Token。
- `--test-concurrency=1` 确保串行执行（每个测试文件有自己的服务器实例，无端口冲突）。
- 单元测试（`test/unit/`）不需要服务器 — 直接导入 `src/` 模块，毫秒级完成。

## 编写新测试

```js
// 单元测试 — 无需服务器
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { myFunction } from "../../src/shared.js";

describe("myFunction", () => {
  it("正常情况", () => {
    assert.equal(myFunction("input"), "expected");
  });
});

// API 测试 — 自动启动服务器
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, cleanup, api } from "../lib/helpers.js";

let baseUrl, token;

before(async () => {
  ({ baseUrl } = await startServer());
  const { data } = await api("/api/login", {
    method: "POST", body: { password: "admin" }, baseUrl,
  });
  token = data.token;
});

after(async () => { await cleanup(); });

describe("GET /api/example", () => {
  it("需要认证", async () => {
    const { status } = await api("/api/example", { baseUrl });
    assert.equal(status, 401);
  });
});
```

## 测试覆盖

| 区域 | 数量 |
|---|---|
| 通用工具（加密、IP 过滤、解析） | 43 |
| 协议解析器（8 种协议） | 14 |
| 认证（登录、登出、会话） | 6 |
| 节点 CRUD | 6 |
| 订阅 + 作用域令牌 | 10 |
| 导出端点（3 种格式） | 7 |
| 上传 API | 6 |
| 上游 CRUD + SSRF 防护 | 7 |
| 审计日志 | 4 |
| 端到端流程 | 12 |
| **总计** | **119** |
