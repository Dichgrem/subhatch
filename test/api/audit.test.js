/**
 * API tests — /api/audit-log
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

describe("GET /api/audit-log", () => {
	it("requires auth", async () => {
		const { status } = await api("/api/audit-log", { baseUrl });
		assert.equal(status, 401);
	});

	it("returns log array with login entry", async () => {
		const { status, data } = await api("/api/audit-log", { token, baseUrl });
		assert.equal(status, 200);
		assert(Array.isArray(data.log));
		// Should contain the login entry
		const loginEntry = data.log.find(e => e.action === "login");
		assert(loginEntry);
		assert(loginEntry.level === "INFO");
	});
});

describe("DELETE /api/audit-log", () => {
	it("clears audit log", async () => {
		const { status } = await api("/api/audit-log", {
			method: "DELETE", token, baseUrl,
		});
		assert.equal(status, 200);
	});

	it("log is empty after clear", async () => {
		const { data } = await api("/api/audit-log", { token, baseUrl });
		assert.deepEqual(data.log, []);
	});
});
