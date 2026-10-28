/**
 * subhatch — Android (SFA) sing-box config generator
 * Builds a complete config.json for sing-box for Android (SFA).
 * The TUN device is provided by Android VpnService, so no interface_name is
 * set and per-app proxy is controlled via include_package / exclude_package.
 */

import { exportSingBox } from "./export.js";
import { int } from "./shared.js";

const PRESETS = {
	ipv4only_realip: {
		listen: "127.0.0.1",
		dnsStrategy: "ipv4_only",
		tunAddress: "172.19.0.1/30",
		tunAddress6: "",
		fakeip: false,
		fakeipRange: "198.18.0.0/15",
	},
	ipv4only_fakeip: {
		listen: "127.0.0.1",
		dnsStrategy: "ipv4_only",
		tunAddress: "172.19.0.1/30",
		tunAddress6: "",
		fakeip: true,
		fakeipRange: "198.18.0.0/15",
	},
	ipv4plus_realip: {
		listen: "127.0.0.1",
		dnsStrategy: "prefer_ipv4",
		tunAddress: "172.19.0.1/30",
		tunAddress6: "fdfe:dcba:9876::1/126",
		fakeip: false,
		fakeipRange: "198.18.0.0/15",
		fakeip6Range: "2001:2::0/64",
	},
	ipv4plus_fakeip: {
		listen: "127.0.0.1",
		dnsStrategy: "prefer_ipv4",
		tunAddress: "172.19.0.1/30",
		tunAddress6: "fdfe:dcba:9876::1/126",
		fakeip: true,
		fakeipRange: "198.18.0.0/15",
		fakeip6Range: "2001:2::0/64",
	},
};

/** Split a comma-separated package list into a trimmed array. */
function parsePackages(val) {
	if (!val) return [];
	if (Array.isArray(val))
		return val.map((v) => String(v).trim()).filter(Boolean);
	return String(val)
		.split(",")
		.map((v) => v.trim())
		.filter(Boolean);
}

/**
 * @param {string[]} nodeUrls — raw proxy node URIs
 * @param {object} options
 * @param {string} [options.preset="ipv4only_realip"]  — "ipv4only_realip" | "ipv4only_fakeip" | "ipv4plus_realip" | "ipv4plus_fakeip"
 * @param {string} [options.selectorTag="GLOBAL"]
 * @param {number} [options.dnsPort=1053]
 * @param {number} [options.mixedPort=7890]
 * @param {string} [options.tunAddress]   — override TUN v4 addr
 * @param {string} [options.tunAddress6]  — override TUN v6 addr
 * @param {string} [options.dnsStrategy]  — override DNS strategy
 * @param {string} [options.listen]       — override listen IP for inbounds
 * @param {string} [options.fakeip]       — set "false" or "0" for real-DNS mode (no FakeIP)
 * @param {number} [options.clashPort=9191]
 * @param {string} [options.clashSecret]
 * @param {string} [options.includePackage] — comma-separated Android package names to proxy
 * @param {string} [options.excludePackage] — comma-separated Android package names to bypass
 * @param {string} [options.overrideAndroidVpn] — "1"/"true" to accept another VPN as upstream
 */
export function buildAndroidConfig(nodeUrls, options = {}) {
	const presetName = PRESETS[options.preset]
		? options.preset
		: "ipv4only_realip";
	const def = PRESETS[presetName];

	const s = {
		selectorTag: options.selectorTag || "GLOBAL",
		dnsPort: int(options.dnsPort, 1053),
		mixedPort: int(options.mixedPort, 7890),
		tunAddress: options.tunAddress || def.tunAddress,
		tunAddress6: options.tunAddress6 ?? def.tunAddress6,
		listen: options.listen || def.listen,
		dnsStrategy: options.dnsStrategy || def.dnsStrategy,
	};

	// ── Outbounds ──
	const { outbounds, errors } = exportSingBox(nodeUrls);

	// Ensure no tag collides with reserved names (selector + direct)
	const reserved = new Set(["direct", s.selectorTag]);
	for (const o of outbounds) {
		if (!reserved.has(o.tag)) continue;
		let n = 2;
		while (reserved.has(`${o.tag}-${n}`)) n++;
		reserved.add(`${o.tag}-${n}`);
		o.tag = `${o.tag}-${n}`;
	}

	const nodeTags = outbounds.map((o) => o.tag);
	const selector = {
		tag: s.selectorTag,
		type: "selector",
		outbounds: [...nodeTags, "direct"],
	};

	const outboundsFinal = [
		...outbounds,
		selector,
		{ tag: "direct", type: "direct" },
	];

	// ── Inbounds ──
	const tunAddresses = [s.tunAddress];
	if (s.tunAddress6) tunAddresses.push(s.tunAddress6);

	// SFA owns the TUN interface, so interface_name is omitted.
	const tunInbound = {
		tag: "tun-in",
		type: "tun",
		address: tunAddresses,
		mtu: 9000,
		auto_route: true,
		strict_route: true,
	};

	const includePackage = parsePackages(options.includePackage);
	const excludePackage = parsePackages(options.excludePackage);
	if (includePackage.length) tunInbound.include_package = includePackage;
	if (excludePackage.length) tunInbound.exclude_package = excludePackage;

	const inbounds = [
		{ tag: "dns-in", type: "direct", listen: s.listen, listen_port: s.dnsPort },
		tunInbound,
		{
			type: "mixed",
			listen: s.listen,
			listen_port: s.mixedPort,
		},
	];

	// ── Route ──
	// sniff must run before domain rules, otherwise geosite-cn can never match.
	const route = {
		rules: [
			{ action: "sniff", sniffer: ["http", "tls", "quic", "dns"] },
			{ inbound: "tun-in", port: 53, action: "hijack-dns" },
			{ inbound: "dns-in", action: "hijack-dns" },
			{ ip_is_private: true, outbound: "direct" },
			{ rule_set: "geosite-cn", outbound: "direct" },
			{ rule_set: "geoip-cn", outbound: "direct" },
		],
		rule_set: [
			{
				tag: "geosite-cn",
				type: "remote",
				format: "binary",
				url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/cn.srs",
				http_client: "rule-set-direct",
			},
			{
				tag: "geoip-cn",
				type: "remote",
				format: "binary",
				url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/geoip@release/srs/cn.srs",
				http_client: "rule-set-direct",
			},
		],
		final: s.selectorTag,
		default_http_client: "rule-set-direct",
		auto_detect_interface: true,
		default_domain_resolver: "public",
	};

	if (
		options.overrideAndroidVpn === "1" ||
		options.overrideAndroidVpn === "true" ||
		options.overrideAndroidVpn === true
	) {
		route.override_android_vpn = true;
	}

	const useFakeip =
		options.fakeip === "false" || options.fakeip === "0"
			? false
			: options.fakeip === "true" || options.fakeip === "1"
				? true
				: def.fakeip;

	// ── DNS ──
	const dnsServers = [
		{ tag: "local", type: "udp", server: "223.5.5.5" },
		{
			tag: "public",
			type: "https",
			server: "dns.alidns.com",
			domain_resolver: "local",
		},
		{
			tag: "foreign",
			type: "https",
			server: "8.8.8.8",
			detour: s.selectorTag,
		},
	];

	const dnsRules = [{ rule_set: "geosite-cn", server: "local" }];

	if (useFakeip) {
		const fakeipServer = {
			tag: "fakeip",
			type: "fakeip",
			inet4_range: def.fakeipRange,
		};
		if (def.fakeip6Range) fakeipServer.inet6_range = def.fakeip6Range;
		dnsServers.push(fakeipServer);
		dnsRules.push({
			query_type: ["A", "AAAA"],
			server: "fakeip",
			rewrite_ttl: 1,
		});
	}

	const dns = {
		servers: dnsServers,
		rules: dnsRules,
		final: "foreign",
		strategy: s.dnsStrategy,
		reverse_mapping: false,
	};

	// ── Log ──
	const log = {
		disabled: false,
		level: "info",
		timestamp: true,
	};

	// ── Experimental ──
	const experimental = {
		cache_file: {
			enabled: true,
			path: "cache.db",
			store_fakeip: useFakeip,
		},
		clash_api: {
			external_controller: `127.0.0.1:${int(options.clashPort, 9191)}`,
			external_ui: "ui",
			external_ui_download_url:
				"https://codeload.github.com/MetaCubeX/Yacd-meta/zip/refs/heads/gh-pages",
			external_ui_download_detour: "direct",
			secret: options.clashSecret || "",
			default_mode: "rule",
		},
	};

	return {
		log,
		dns,
		inbounds,
		outbounds: outboundsFinal,
		route,
		http_clients: [{ tag: "rule-set-direct" }],
		experimental,
		_meta: {
			nodeCount: outbounds.length,
			errors: errors.length > 0 ? errors : undefined,
		},
	};
}
