# Testing

115 automated tests using Node.js built-in `node:test` + `node:assert`. Zero dependencies.

## Quick Start

```bash
# Full suite (unit + API + integration)
just test
# or: node --test --test-concurrency=1 "test/**/*.test.js"

# Unit tests only (no server needed, fast)
just test-unit
# or: node --test "test/unit/*.test.js"
```

## Structure

```
test/
├── lib/
│   └── helpers.js            # Server lifecycle + API helper
├── unit/
│   ├── shared.test.js        # Crypto, IP filters, parsing (43 tests)
│   └── export.test.js        # Protocol parsers (14 tests)
├── api/
│   ├── auth.test.js          # POST /api/login, /api/logout
│   ├── nodes.test.js         # GET/PUT /api/nodes
│   ├── sub.test.js           # /sub, scoped tokens CRUD
│   ├── export.test.js        # /api/export/sing-box, /momo, /kernel
│   ├── upload.test.js        # POST /api/upload, /api/upload-token
│   ├── upstream.test.js      # Upstream CRUD + sync + SSRF guard
│   └── audit.test.js         # Audit log read/clear
└── integration/
    └── full.test.js          # 12-step end-to-end flow
```

## How it works

- Each API/integration test file auto-spawns a Node.js server (`api/node.js`) on a random port with a temporary `data.json` in `/tmp`. The server is killed and the temp file deleted after the test file finishes.
- `test/lib/helpers.js` provides `startServer()`, `cleanup()`, and `api()` — a thin fetch wrapper that handles session tokens.
- `--test-concurrency=1` ensures serial execution (each test file gets its own server instance, no port conflicts).
- Unit tests (`test/unit/`) don't need a server — they import `src/` modules directly and run in a few milliseconds.

## Writing new tests

```js
// Unit test — no server needed
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { myFunction } from "../../src/shared.js";

describe("myFunction", () => {
  it("works", () => {
    assert.equal(myFunction("input"), "expected");
  });
});

// API test — server auto-started
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
  it("requires auth", async () => {
    const { status } = await api("/api/example", { baseUrl });
    assert.equal(status, 401);
  });
});
```

## Test coverage

| Area | Tests |
|---|---|
| Shared helpers (crypto, IP filters, parsing) | 43 |
| Protocol parsers (8 protocols) | 14 |
| Auth (login, logout, session) | 6 |
| Nodes CRUD | 6 |
| Subscriptions + scoped tokens | 10 |
| Export endpoints (3 formats) | 7 |
| Upload API | 6 |
| Upstream CRUD + SSRF guard | 7 |
| Audit log | 4 |
| End-to-end flow | 12 |
| **Total** | **115** |
