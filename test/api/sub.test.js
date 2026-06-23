/**
 * API tests — /sub, /api/sub-url, /api/sub-token, /api/sub-tokens CRUD
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

describe("GET /sub", () => {
	it("returns base64 content with token", async () => {
		const r = await fetch(`${baseUrl}/sub?token=test`);
		assert.equal(r.status, 200);
		const body = await r.text();
		// Base64 should decode
		const dec = Buffer.from(body, "base64").toString("utf8");
		assert(typeof dec === "string");
	});

	it("401 for invalid token", async () => {
		const r = await fetch(`${baseUrl}/sub?token=wrongtoken`);
		assert.equal(r.status, 401);
	});
});

describe("GET /api/sub-url", () => {
	it("returns subscription URL", async () => {
		const { status, data } = await api("/api/sub-url", { token, baseUrl });
		assert.equal(status, 200);
		assert(data.url.includes("/sub?token="));
	});
});

describe("PUT /api/sub-token", () => {
	it("rotates primary token", async () => {
		const { status, data } = await api("/api/sub-token", {
			method: "PUT", token, baseUrl,
		});
		assert.equal(status, 200);
		assert(data.token);
		assert.equal(data.token.length, 32); // 16 bytes
	});

	it("new token works, old token fails", async () => {
		const { data: rot } = await api("/api/sub-token", {
			method: "PUT", token, baseUrl,
		});
		const rNew = await fetch(`${baseUrl}/sub?token=${rot.token}`);
		assert.equal(rNew.status, 200);
		const rOld = await fetch(`${baseUrl}/sub?token=test`);
		assert.equal(rOld.status, 401);
	});
});

describe("Scoped tokens CRUD", () => {
	let scoped;

	it("POST /api/sub-tokens — create", async () => {
		const { status, data } = await api("/api/sub-tokens", {
			method: "POST",
			token,
			body: { name: "Test Scope", nodes: [] },
			baseUrl,
		});
		assert.equal(status, 200);
		assert(data.token);
		assert.equal(data.name, "Test Scope");
		scoped = data.token;
	});

	it("GET /api/sub-tokens — list includes created", async () => {
		const { status, data } = await api("/api/sub-tokens", { token, baseUrl });
		assert.equal(status, 200);
		assert(data.tokens[scoped]);
	});

	it("PUT /api/sub-tokens — update name", async () => {
		const { status, data } = await api("/api/sub-tokens", {
			method: "PUT",
			token,
			body: { token: scoped, name: "Renamed" },
			baseUrl,
		});
		assert.equal(status, 200);
		assert.equal(data.name, "Renamed");
	});

	it("POST /api/sub-tokens/rotate — rotate scoped", async () => {
		const { status, data } = await api("/api/sub-tokens/rotate", {
			method: "POST",
			token,
			body: { token: scoped },
			baseUrl,
		});
		assert.equal(status, 200);
		assert(data.token !== scoped);
		scoped = data.token; // use new token
	});

	it("DELETE /api/sub-tokens — delete", async () => {
		const { status } = await api(`/api/sub-tokens?token=${scoped}`, {
			method: "DELETE", token, baseUrl,
		});
		assert.equal(status, 200);
	});

	it("deleted token not found", async () => {
		const { status } = await api(`/api/sub-tokens?token=${scoped}`, {
			method: "DELETE", token, baseUrl,
		});
		assert.equal(status, 404);
	});
});
