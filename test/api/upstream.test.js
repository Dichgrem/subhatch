/**
 * API tests — /api/upstream CRUD + sync
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

describe("GET /api/upstream", () => {
	it("requires auth", async () => {
		const { status } = await api("/api/upstream", { baseUrl });
		assert.equal(status, 401);
	});

	it("returns empty array initially", async () => {
		const { status, data } = await api("/api/upstream", { token, baseUrl });
		assert.equal(status, 200);
		assert.deepEqual(data.urls, []);
	});
});

describe("POST /api/upstream", () => {
	it("adds upstream source", async () => {
		const { status, data } = await api("/api/upstream", {
			method: "POST",
			token,
			body: { name: "Test Source", url: "https://example.com/sub" },
			baseUrl,
		});
		assert.equal(status, 200);
		assert(data.ok);
		assert(data.entry.name === "Test Source");
	});

	it("rejects duplicate URL", async () => {
		const { status } = await api("/api/upstream", {
			method: "POST",
			token,
			body: { url: "https://example.com/sub" },
			baseUrl,
		});
		assert.equal(status, 409);
	});

	it("blocks sync for private IP host", async () => {
		const { status, data } = await api("/api/upstream", {
			method: "POST",
			token,
			body: { url: "http://127.0.0.1:8080/sub" },
			baseUrl,
		});
		// entry is added but sync fails due to SSRF guard
		assert.equal(status, 200);
		assert(data.entry.lastError?.includes("private host"));
	});
});

describe("POST /api/upstream/sync", () => {
	it("syncs all", async () => {
		const { status } = await api("/api/upstream/sync", {
			method: "POST", token, baseUrl,
		});
		assert.equal(status, 200);
	});
});

describe("DELETE /api/upstream", () => {
	it("removes upstream by index", async () => {
		// First, ensure we have at least one
		const { data: list } = await api("/api/upstream", { token, baseUrl });
		if (list.urls.length === 0) {
			await api("/api/upstream", {
				method: "POST",
				token,
				body: { url: "https://another.example.com/sub" },
				baseUrl,
			});
		}
		const { status } = await api("/api/upstream?id=0", {
			method: "DELETE", token, baseUrl,
		});
		assert.equal(status, 200);
	});
});
