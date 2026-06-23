/**
 * API tests — /api/upload, /api/upload-token
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

describe("POST /api/upload", () => {
	it("rejects without token", async () => {
		const { status, data } = await api("/api/upload", {
			method: "POST", body: { nodes: ["vless://test@1.1.1.1:443#Up"] }, baseUrl,
		});
		assert.equal(status, 401);
		assert(data.error);
	});

	it("accepts valid nodes with correct token", async () => {
		const { status, data } = await api("/api/upload?token=upload123", {
			method: "POST",
			body: { nodes: ["vless://upload-test@9.9.9.9:443#UploadTest"] },
			baseUrl,
		});
		assert.equal(status, 200);
		assert(data.ok);
		assert.equal(data.added, 1);
	});

	it("skips duplicates", async () => {
		await api("/api/upload?token=upload123", {
			method: "POST",
			body: { nodes: ["vless://dup@8.8.8.8:443#Dup"] },
			baseUrl,
		});
		const { data } = await api("/api/upload?token=upload123", {
			method: "POST",
			body: { nodes: ["vless://dup@8.8.8.8:443#Dup"] },
			baseUrl,
		});
		assert.equal(data.added, 0);
		assert.equal(data.dupes, 1);
	});
});

describe("GET /api/upload-token", () => {
	it("requires session auth", async () => {
		const { status } = await api("/api/upload-token", { baseUrl });
		assert.equal(status, 401);
	});

	it("returns upload token", async () => {
		const { status, data } = await api("/api/upload-token", { token, baseUrl });
		assert.equal(status, 200);
		assert(data.token);
	});
});

describe("PUT /api/upload-token", () => {
	it("rotates upload token", async () => {
		const { status, data } = await api("/api/upload-token", {
			method: "PUT", token, baseUrl,
		});
		assert.equal(status, 200);
		assert(data.token);
		assert.equal(data.token.length, 32);
	});
});
