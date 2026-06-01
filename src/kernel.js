/**
 * subhatch — HPC / Linux desktop sing-box config generator
 * Builds a complete config.json for the sing-box kernel on desktop/Linux.
 * Drop into /etc/sing-box/config.json or point sing-box run -c at it.
 */

import { exportSingBox, int } from "./export.js";

const PRESETS = {
	ipv4only_realip: {
		listen: "0.0.0.0",
		dnsStrategy: "ipv4_only",
		tunAddress: "172.19.0.1/30",
		tunAddress6: "",
		fakeip: false,
		fakeipRange: "198.18.0.0/15",
	},
	ipv4only_fakeip: {
		listen: "0.0.0.0",
		dnsStrategy: "ipv4_only",
		tunAddress: "172.19.0.1/30",
		tunAddress6: "",
		fakeip: true,
		fakeipRange: "198.18.0.0/15",
	},
	ipv4plus_realip: {
		listen: "::",
		dnsStrategy: "prefer_ipv4",
		tunAddress: "172.19.0.1/30",
		tunAddress6: "fdfe:dcba:9876::1/126",
		fakeip: false,
		fakeipRange: "198.18.0.0/15",
		fakeip6Range: "fc00::/18",
	},
	ipv4plus_fakeip: {
		listen: "::",
		dnsStrategy: "prefer_ipv4",
		tunAddress: "172.19.0.1/30",
		tunAddress6: "fdfe:dcba:9876::1/126",
		fakeip: true,
		fakeipRange: "198.18.0.0/15",
		fakeip6Range: "fc00::/18",
	},
};

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
 * @param {string} [options.tunName="stun"]
 */
export function buildKernelConfig(nodeUrls, options = {}) {
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
		tunName: options.tunName || "stun",
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

	const inbounds = [
		{ tag: "dns-in", type: "direct", listen: s.listen, listen_port: s.dnsPort },
		{
			tag: "tun-in",
			type: "tun",
			interface_name: s.tunName,
			address: tunAddresses,
			mtu: 9000,
			auto_route: true,
			auto_redirect: true,
			strict_route: false,
		},
		{
			type: "mixed",
			listen: s.listen,
			listen_port: s.mixedPort,
		},
	];

	// ── Route ──
	const route = {
		rules: [
			{ inbound: `tun-in`, port: 53, action: "hijack-dns" },
			{ inbound: "dns-in", action: "hijack-dns" },
			{ ip_is_private: true, outbound: "direct" },
			{ rule_set: "geosite-cn", outbound: "direct" },
			{ rule_set: "geoip-cn", outbound: "direct" },
			{ action: "sniff", sniffer: ["http", "tls", "quic", "dns"] },
		],
		rule_set: [
			{
				tag: "geosite-cn",
				type: "remote",
				format: "binary",
				url: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/cn.srs",
				download_detour: "direct",
			},
			{
				tag: "geoip-cn",
				type: "remote",
				format: "binary",
				url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/geoip@release/srs/cn.srs",
				download_detour: "direct",
			},
		],
		final: s.selectorTag,
		auto_detect_interface: true,
		default_domain_resolver: "public",
	};

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
		independent_cache: true,
		reverse_mapping: false,
	};

	// ── Log ──
	const log = {
		disabled: false,
		level: "info",
		timestamp: true,
	};

	// ── Experimental ──
	const clashListen = s.listen === "::" ? "[::]" : s.listen;

	const experimental = {
		cache_file: {
			enabled: true,
			path: "/var/lib/sing-box/cache.db",
			store_fakeip: useFakeip,
		},
		clash_api: {
			external_controller: `${clashListen}:${int(options.clashPort, 9191)}`,
			external_ui: "/var/lib/sing-box/ui",
			external_ui_download_url:
				"https://codeload.github.com/Zephyruso/zashboard/zip/refs/heads/gh-pages",
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
		experimental,
		_meta: {
			nodeCount: outbounds.length,
			errors: errors.length > 0 ? errors : undefined,
		},
	};
}
