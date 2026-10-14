/**
 * API tests — /api/export/sing-box, /api/export/momo, /api/export/kernel
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
	// Add a test node
	await api("/api/nodes", {
		method: "PUT",
		token,
		body: { nodes: ["vless://test@1.2.3.4:443?encryption=none#ExportNode"] },
		baseUrl,
	});
});

after(async () => {
	await cleanup();
});

describe("GET /api/export/sing-box", () => {
	it("requires auth", async () => {
		const { status } = await api("/api/export/sing-box", { baseUrl });
		assert.equal(status, 401);
	});

	it("returns outbounds array", async () => {
		const { status, data } = await api("/api/export/sing-box", { token, baseUrl });
		assert.equal(status, 200);
		assert(data.ok);
		assert(Array.isArray(data.outbounds));
		assert(data.count > 0);
	});
});

describe("GET /api/export/momo", () => {
	it("returns complete config.json", async () => {
		const { status, data } = await api("/api/export/momo", { token, baseUrl });
		assert.equal(status, 200);
		assert(Array.isArray(data.inbounds));
		assert(Array.isArray(data.outbounds));
		assert(data.dns);
		assert(data.ntp);
		assert(data.route);
	});

	it("accepts sub-token via ?token=", async () => {
		const { status, data } = await api("/api/export/momo?token=test", { baseUrl });
		assert.equal(status, 200);
		assert(Array.isArray(data.outbounds));
	});

	it("preset query param works", async () => {
		const { status, data } = await api("/api/export/momo?preset=ipv4plus_fakeip", { token, baseUrl });
		assert.equal(status, 200);
		// FakeIP preset should include fakeip DNS server
		const tags = data.dns.servers.map(s => s.tag);
		assert(tags.includes("fakeip"));
	});
});

describe("GET /api/export/kernel", () => {
	it("returns complete config.json", async () => {
		const { status, data } = await api("/api/export/kernel", { token, baseUrl });
		assert.equal(status, 200);
		assert(Array.isArray(data.inbounds));
		assert(data.experimental?.clash_api);
	});

	it("refresh=0 skips upstream sync", async () => {
		const { status } = await api("/api/export/kernel?refresh=0", { token, baseUrl });
		assert.equal(status, 200);
	});
});

describe("GET /api/export/windows", () => {
	it("returns complete config.json", async () => {
		const { status, data } = await api("/api/export/windows", { token, baseUrl });
		assert.equal(status, 200);
		assert(Array.isArray(data.inbounds));
		assert(data.experimental?.clash_api);
	});

	it("TUN inbound uses strict_route and auto_route", async () => {
		const { status, data } = await api("/api/export/windows", { token, baseUrl });
		assert.equal(status, 200);
		const tun = data.inbounds.find((i) => i.type === "tun");
		assert(tun);
		assert.equal(tun.auto_route, true);
		assert.equal(tun.strict_route, true);
	});

	it("mixed inbound sets system proxy", async () => {
		const { status, data } = await api("/api/export/windows", { token, baseUrl });
		assert.equal(status, 200);
		const mixed = data.inbounds.find((i) => i.type === "mixed");
		assert(mixed);
		assert.equal(mixed.set_system_proxy, true);
	});
});

describe("GET /api/export/android", () => {
	it("returns complete config.json", async () => {
		const { status, data } = await api("/api/export/android", { token, baseUrl });
		assert.equal(status, 200);
		assert(Array.isArray(data.inbounds));
		assert(Array.isArray(data.outbounds));
		assert(data.experimental?.clash_api);
	});

	it("TUN uses auto_route/strict_route without interface_name", async () => {
		const { status, data } = await api("/api/export/android", { token, baseUrl });
		assert.equal(status, 200);
		const tun = data.inbounds.find((i) => i.type === "tun");
		assert(tun);
		assert.equal(tun.auto_route, true);
		assert.equal(tun.strict_route, true);
		assert.equal(tun.interface_name, undefined);
		assert.equal(tun.auto_redirect, undefined);
	});

	it("mixed inbound does not set system proxy", async () => {
		const { status, data } = await api("/api/export/android", { token, baseUrl });
		assert.equal(status, 200);
		const mixed = data.inbounds.find((i) => i.type === "mixed");
		assert(mixed);
		assert.equal(mixed.set_system_proxy, undefined);
	});

	it("sniff rule comes before domain rules", async () => {
		const { status, data } = await api("/api/export/android", { token, baseUrl });
		assert.equal(status, 200);
		assert.equal(data.route.rules[0].action, "sniff");
	});

	it("include_package and override_android_vpn query params work", async () => {
		const { status, data } = await api(
			"/api/export/android?includePackage=com.android.chrome,com.termux&overrideAndroidVpn=1",
			{ token, baseUrl },
		);
		assert.equal(status, 200);
		const tun = data.inbounds.find((i) => i.type === "tun");
		assert.deepEqual(tun.include_package, ["com.android.chrome", "com.termux"]);
		assert.equal(data.route.override_android_vpn, true);
	});
});
