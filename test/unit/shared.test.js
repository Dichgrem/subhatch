/**
 * Unit tests — src/shared.js
 * Pure functions, no server needed.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Dynamic import because shared.js uses top-level ESM
const shared = await import("../../src/shared.js");

describe("sha256", () => {
	it("produces 64-char hex digest", async () => {
		const h = await shared.sha256("hello");
		assert.equal(h.length, 64);
		assert(/^[0-9a-f]{64}$/.test(h));
	});

	it("same input → same output", async () => {
		const a = await shared.sha256("admin");
		const b = await shared.sha256("admin");
		assert.equal(a, b);
	});

	it("different input → different output", async () => {
		const a = await shared.sha256("admin");
		const b = await shared.sha256("Admin");
		assert.notEqual(a, b);
	});
});

describe("timingSafeEqual", () => {
	it("equal hashes match", () => {
		const a = "a".repeat(64);
		assert(shared.timingSafeEqual(a, a));
	});

	it("different hashes mismatch", () => {
		const a = "a".repeat(64);
		const b = "b".repeat(64);
		assert(!shared.timingSafeEqual(a, b));
	});

	it("different lengths → false", () => {
		assert(!shared.timingSafeEqual("aa", "a"));
	});
});

describe("randomToken", () => {
	it("default 32 bytes → 64 hex chars", () => {
		const t = shared.randomToken();
		assert.equal(t.length, 64);
	});

	it("custom length works", () => {
		const t = shared.randomToken(16);
		assert.equal(t.length, 32);
	});

	it("two calls produce different values", () => {
		assert.notEqual(shared.randomToken(), shared.randomToken());
	});
});

describe("isValidNode", () => {
	it("valid schemes", () => {
		assert(shared.isValidNode("vless://uuid@1.2.3.4:443#Node"));
		assert(shared.isValidNode("vmess://base64stuff"));
		assert(shared.isValidNode("trojan://pass@1.1.1.1:443"));
		assert(shared.isValidNode("ss://base64@2.2.2.2:8388"));
		assert(shared.isValidNode("hysteria2://pw@3.3.3.3:2333"));
		assert(shared.isValidNode("hy2://pw@3.3.3.3:2333"));
		assert(shared.isValidNode("tuic://uuid@4.4.4.4:8443"));
		assert(shared.isValidNode("anytls://pw@5.5.5.5:443"));
	});

	it("invalid input", () => {
		assert(!shared.isValidNode(""));
		assert(!shared.isValidNode("http://example.com"));
		assert(!shared.isValidNode("not-a-node"));
	});
});

describe("isPrivateHost", () => {
	const cases = [
		["127.0.0.1", true],
		["0.0.0.0", true],
		["10.0.0.1", true],
		["10.255.255.255", true],
		["169.254.169.254", true],
		["172.16.0.1", true],
		["172.31.255.255", true],
		["192.168.1.1", true],
		["192.168.0.1", true],
		["224.0.0.1", true],
		["239.255.255.255", true],
		["240.0.0.1", true],
		["255.255.255.0", true],
		["172.32.0.1", false],
		["8.8.8.8", false],
		["1.1.1.1", false],
		["example.com", false],
		["my-docker-service", false],
		["[::1]", true],
		["::1", true],
		["fe80::1", true],
		["fc00::1", true],
		["fd00::1", true],
		["2001:db8::1", false],
	];

	for (const [host, expect] of cases) {
		it(`${expect ? "blocks" : "allows"} ${host}`, () => {
			assert.equal(shared.isPrivateHost(host), expect);
		});
	}
});

describe("parseEnvNodes", () => {
	it("empty → []", () => {
		assert.deepEqual(shared.parseEnvNodes(""), []);
	});

	it("pipe separated", () => {
		const nodes = shared.parseEnvNodes("vless://a@1.1.1.1:443#A|vless://b@2.2.2.2:443#B");
		assert.equal(nodes.length, 2);
		assert(nodes[0].startsWith("vless://"));
	});

	it("newline separated", () => {
		const nodes = shared.parseEnvNodes("vless://a@1.1.1.1:443\nvless://b@2.2.2.2:443");
		assert.equal(nodes.length, 2);
	});

	it("filters invalid", () => {
		const nodes = shared.parseEnvNodes("vless://a@1.1.1.1:443|invalid|vless://b@2.2.2.2:443");
		assert.equal(nodes.length, 2);
	});
});

describe("jsonResp", () => {
	it("returns Response with correct Content-Type", () => {
		const r = shared.jsonResp({ ok: true });
		assert.equal(r.status, 200);
		assert.equal(r.headers.get("Content-Type"), "application/json");
	});
});

describe("normalizePreset", () => {
	it("ipv6/dual/ipv4+6 → ipv4plus_realip", () => {
		assert.equal(shared.normalizePreset("ipv6"), "ipv4plus_realip");
		assert.equal(shared.normalizePreset("dual"), "ipv4plus_realip");
		assert.equal(shared.normalizePreset("ipv4+6"), "ipv4plus_realip");
	});

	it("ipv4/single/ipv4only → ipv4only_realip", () => {
		assert.equal(shared.normalizePreset("ipv4"), "ipv4only_realip");
		assert.equal(shared.normalizePreset("single"), "ipv4only_realip");
		assert.equal(shared.normalizePreset("ipv4only"), "ipv4only_realip");
	});

	it("unknown preset passed through", () => {
		assert.equal(shared.normalizePreset("custom"), "custom");
	});
});
