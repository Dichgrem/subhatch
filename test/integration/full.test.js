/**
 * Integration test — full end-to-end flow
 * Spawns server once, runs the complete lifecycle.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, cleanup, api, setSession } from "../lib/helpers.js";

let baseUrl;

before(async () => {
	({ baseUrl } = await startServer());
});

after(async () => {
	await cleanup();
});

describe("full e2e flow", () => {
	let sessionToken;

	it("1. login", async () => {
		const { status, data } = await api("/api/login", {
			method: "POST", body: { password: "admin" }, baseUrl,
		});
		assert.equal(status, 200);
		assert(data.token);
		sessionToken = data.token;
		setSession(sessionToken);
	});

	it("2. save nodes", async () => {
		const { status, data } = await api("/api/nodes", {
			method: "PUT",
			body: {
				nodes: [
					"vless://test-1@1.1.1.1:443?encryption=none#E2E-Node1",
					"vless://test-2@2.2.2.2:443?encryption=none#E2E-Node2",
				],
			},
			baseUrl,
		});
		assert.equal(status, 200);
		assert.equal(data.saved, 2);
	});

	it("3. list nodes", async () => {
		const { status, data } = await api("/api/nodes", { baseUrl });
		assert.equal(status, 200);
		assert.equal(data.storedNodes.length, 2);
	});

	it("4. get sub URL", async () => {
		const { status, data } = await api("/api/sub-url", { baseUrl });
		assert.equal(status, 200);
		assert(data.url.includes("/sub?token="));
	});

	it("5. get subscription content", async () => {
		const r = await fetch(`${baseUrl}/sub?token=test`);
		assert.equal(r.status, 200);
		const body = await r.text();
		const dec = Buffer.from(body, "base64").toString("utf8");
		assert(dec.includes("E2E-Node1"));
		assert(dec.includes("E2E-Node2"));
	});

	it("6. create scoped token", async () => {
		const { status, data } = await api("/api/sub-tokens", {
			method: "POST",
			body: {
				name: "E2E Scope",
				nodes: ["vless://test-1@1.1.1.1:443?encryption=none#E2E-Node1"],
			},
			baseUrl,
		});
		assert.equal(status, 200);
		assert(data.token);
	});

	it("7. export sing-box JSON", async () => {
		const { status, data } = await api("/api/export/sing-box", { baseUrl });
		assert.equal(status, 200);
		assert(data.count >= 2);
	});

	it("8. export momo config", async () => {
		const { status, data } = await api("/api/export/momo", { baseUrl });
		assert.equal(status, 200);
		assert(data.inbounds.length > 0);
	});

	it("9. export kernel config", async () => {
		const { status, data } = await api("/api/export/kernel", { baseUrl });
		assert.equal(status, 200);
		assert(data.experimental);
	});

	it("10. audit log has entries", async () => {
		const { status, data } = await api("/api/audit-log", { baseUrl });
		assert.equal(status, 200);
		assert(data.log.length > 0);
	});

	it("11. logout", async () => {
		const { status } = await api("/api/logout", {
			method: "POST", baseUrl,
		});
		assert.equal(status, 200);
	});

	it("12. session invalid after logout", async () => {
		const { status, data } = await api("/api/nodes", { baseUrl });
		assert.equal(status, 401);
		assert(data.error);
	});
});
