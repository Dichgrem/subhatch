/**
 * Unit tests — src/export.js
 * Parser logic, no server needed.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { exportSingBox } = await import("../../src/export.js");

describe("exportSingBox", () => {
	it("empty → empty outbounds", () => {
		const r = exportSingBox([]);
		assert.deepEqual(r.outbounds, []);
		assert.deepEqual(r.errors, []);
	});

	it("parses vless://", () => {
		const r = exportSingBox(["vless://uuid123@1.2.3.4:443?encryption=none&flow=xtls-rprx-vision#Tokyo"]);
		assert.equal(r.outbounds.length, 1);
		assert.equal(r.outbounds[0].type, "vless");
		assert.equal(r.outbounds[0].tag, "Tokyo");
		assert.equal(r.outbounds[0].server, "1.2.3.4");
		assert.equal(r.outbounds[0].server_port, 443);
		assert.equal(r.outbounds[0].uuid, "uuid123");
	});

	it("parses vless with ws transport", () => {
		const r = exportSingBox(["vless://uuid@1.2.3.4:443?type=ws&host=cdn.example.com&path=/ws#WS-Node"]);
		assert.equal(r.outbounds.length, 1);
		assert.equal(r.outbounds[0].transport.type, "ws");
		assert.equal(r.outbounds[0].transport.headers.Host, "cdn.example.com");
		assert.equal(r.outbounds[0].transport.path, "/ws");
	});

	it("parses vmess://", () => {
		// Minimal vmess base64: {"v":"2","ps":"VMess-Node","add":"10.0.0.1","port":"443","id":"uuid","aid":"0","scy":"auto"}
		const b64 = Buffer.from(JSON.stringify({ v: "2", ps: "VMess-Node", add: "10.0.0.1", port: "443", id: "uuid-vmess", aid: "0", scy: "auto" })).toString("base64");
		const r = exportSingBox([`vmess://${b64}`]);
		assert.equal(r.outbounds.length, 1);
		assert.equal(r.outbounds[0].type, "vmess");
		assert.equal(r.outbounds[0].tag, "VMess-Node");
		assert.equal(r.outbounds[0].server, "10.0.0.1");
	});

	it("parses trojan://", () => {
		const r = exportSingBox(["trojan://password@1.1.1.1:443?sni=example.com#Trojan-Node"]);
		assert.equal(r.outbounds.length, 1);
		assert.equal(r.outbounds[0].type, "trojan");
		assert.equal(r.outbounds[0].password, "password");
		assert.equal(r.outbounds[0].tls.server_name, "example.com");
	});

	it("parses shadowsocks SIP002", () => {
		const b64 = Buffer.from("chacha20-ietf-poly1305:password").toString("base64");
		const r = exportSingBox([`ss://${b64}@2.2.2.2:8388#SS-Node`]);
		assert.equal(r.outbounds.length, 1);
		assert.equal(r.outbounds[0].type, "shadowsocks");
		assert.equal(r.outbounds[0].method, "chacha20-ietf-poly1305");
		assert.equal(r.outbounds[0].password, "password");
	});

	it("parses hysteria2://", () => {
		const r = exportSingBox(["hysteria2://password@3.3.3.3:2333?sni=cn.bing.com#HY2"]);
		assert.equal(r.outbounds.length, 1);
		assert.equal(r.outbounds[0].type, "hysteria2");
		assert.equal(r.outbounds[0].password, "password");
		assert.equal(r.outbounds[0].tls.server_name, "cn.bing.com");
	});

	it("parses hy2:// alias", () => {
		const r = exportSingBox(["hy2://pw@3.3.3.3:2333"]);
		assert.equal(r.outbounds.length, 1);
		assert.equal(r.outbounds[0].type, "hysteria2");
	});

	it("parses tuic://", () => {
		const r = exportSingBox(["tuic://uuid:pass@4.4.4.4:8443?sni=example.com#TUIC"]);
		assert.equal(r.outbounds.length, 1);
		assert.equal(r.outbounds[0].type, "tuic");
		assert.equal(r.outbounds[0].uuid, "uuid");
	});

	it("parses anytls://", () => {
		const r = exportSingBox(["anytls://password@5.5.5.5:443#AT"]);
		assert.equal(r.outbounds.length, 1);
		assert.equal(r.outbounds[0].type, "anytls");
	});

	it("parses naive://", () => {
		const r = exportSingBox(["naive://user:pass@6.6.6.6:443?sni=naive.test#Naive"]);
		assert.equal(r.outbounds.length, 1);
		assert.equal(r.outbounds[0].type, "naive");
		assert.equal(r.outbounds[0].username, "user");
		assert.equal(r.outbounds[0].password, "pass");
	});

	it("deduplicates tags", () => {
		const r = exportSingBox([
			"vless://a@1.1.1.1:443#Dup",
			"vless://b@2.2.2.2:443#Dup",
		]);
		assert.equal(r.outbounds.length, 2);
		assert.equal(r.outbounds[0].tag, "Dup");
		assert.equal(r.outbounds[1].tag, "Dup-2");
	});

	it("skips unknown schemes with error", () => {
		const r = exportSingBox(["http://example.com"]);
		assert.equal(r.outbounds.length, 0);
		assert(r.errors.length > 0 || (r.skipped && r.skipped.length > 0));
	});

	it("reports ssr:// as unsupported", () => {
		const r = exportSingBox(["ssr://base64stuff"]);
		assert.equal(r.outbounds.length, 0);
		assert(r.errors.some(e => e.includes("SSR")), "should report SSR unsupported");
	});
});
