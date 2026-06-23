/**
 * API tests — /api/nodes CRUD
 */
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

after(async () => {
	await cleanup();
});

describe("GET /api/nodes", () => {
	it("requires auth", async () => {
		const { status } = await api("/api/nodes", { baseUrl });
		assert.equal(status, 401);
	});

	it("returns envNodes + storedNodes", async () => {
		const { status, data } = await api("/api/nodes", { token, baseUrl });
		assert.equal(status, 200);
		assert(Array.isArray(data.envNodes));
		assert(Array.isArray(data.storedNodes));
	});
});

describe("PUT /api/nodes", () => {
	it("saves nodes and returns count", async () => {
		const nodes = [
			"vless://test-a@1.2.3.4:443?encryption=none#TestA",
			"vless://test-b@5.6.7.8:443?encryption=none#TestB",
		];
		const { status, data } = await api("/api/nodes", {
			method: "PUT", token, body: { nodes }, baseUrl,
		});
		assert.equal(status, 200);
		assert(data.ok);
		assert.equal(data.saved, 2);
	});

	it("rejects non-array nodes", async () => {
		const { status } = await api("/api/nodes", {
			method: "PUT", token, body: { nodes: "not-an-array" }, baseUrl,
		});
		assert.equal(status, 400);
	});

	it("persists after save", async () => {
		const nodes = ["vless://persist@1.1.1.1:443#Persist"];
		await api("/api/nodes", { method: "PUT", token, body: { nodes }, baseUrl });
		const { data } = await api("/api/nodes", { token, baseUrl });
		assert.equal(data.storedNodes.length, 1);
		assert(data.storedNodes[0].includes("Persist"));
	});
});
