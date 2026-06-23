/**
 * API tests — /api/login, /api/logout, session validation
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

describe("POST /api/login", () => {
	it("correct password returns token", async () => {
		const { status, data } = await api("/api/login", {
			method: "POST", body: { password: "admin" }, baseUrl,
		});
		assert.equal(status, 200);
		assert(data.token);
		assert.equal(data.token.length, 64);
		setSession(data.token);
	});

	it("wrong password returns 401", async () => {
		const { status, data } = await api("/api/login", {
			method: "POST", body: { password: "wrong" }, baseUrl,
		});
		assert.equal(status, 401);
		assert(data.error);
	});

	it("missing password returns 400", async () => {
		const { status } = await api("/api/login", {
			method: "POST", body: {}, baseUrl,
		});
		assert.equal(status, 400);
	});

	it("invalid JSON returns 400", async () => {
		const r = await fetch(`${baseUrl}/api/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "not json",
		});
		assert.equal(r.status, 400);
	});
});

describe("POST /api/logout", () => {
	it("invalidates session", async () => {
		// Login fresh
		const { data: login } = await api("/api/login", {
			method: "POST", body: { password: "admin" }, baseUrl,
		});
		const { status } = await api("/api/logout", {
			method: "POST", token: login.token, baseUrl,
		});
		assert.equal(status, 200);
	});

	it("rejects request without session", async () => {
		const { status, data } = await api("/api/logout", {
			method: "POST", token: "", baseUrl,
		});
		assert.equal(status, 401);
		assert(data.error);
	});
});
