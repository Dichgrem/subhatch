/**
 * subhatch — Sing-box JSON Export
 * Converts proxy node URLs to sing-box outbound JSON config.
 */

// ── Base64 helpers (workers + node compat) ──
function b64decode(str) {
	// Normalize base64url
	str = str.replace(/-/g, "+").replace(/_/g, "/");
	while (str.length % 4) str += "=";
	if (typeof atob !== "undefined") return atob(str);
	return Buffer.from(str, "base64").toString("binary");
}

function b64utf8(str) {
	const raw = b64decode(str);
	try {
		if (typeof TextDecoder !== "undefined") {
			const arr = new Uint8Array(raw.length);
			for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
			return new TextDecoder("utf-8", { fatal: true }).decode(arr);
		}
		return decodeURIComponent(escape(raw));
	} catch {
		return raw;
	}
}

// ── Helpers ──
const ALLOWED_SCHEMES = [
	"vless://",
	"vmess://",
	"trojan://",
	"ss://",
	"hysteria2://",
	"hy2://",
	"tuic://",
	"anytls://",
	"naive://",
];

function fragName(raw) {
	const i = raw.lastIndexOf("#");
	if (i === -1) return "";
	try {
		return decodeURIComponent(raw.slice(i + 1));
	} catch {
		return raw.slice(i + 1);
	}
}

function stripBrackets(host) {
	if (host.startsWith("[") && host.endsWith("]")) return host.slice(1, -1);
	return host;
}

function defaultTag(host, port) {
	return `${host || "?"}:${port || "?"}`;
}

// ── Transport builder ──
function buildTransport(type, host, path, svc) {
	const t = { type };
	if (type === "ws") {
		if (path) t.path = path;
		if (host) t.headers = { Host: host };
	} else if (type === "grpc") {
		if (svc) t.service_name = svc;
	} else if (type === "httpupgrade") {
		if (path) t.path = path;
		if (host) t.host = host;
	}
	return t;
}

// ── TLS builder ──
function buildTLS(params) {
	const sec = params.get("security") || "";
	const sni = params.get("sni") || "";
	const fp = params.get("fp") || "";
	const alpnRaw = params.get("alpn") || "";
	if (!sec && !sni && !fp && !alpnRaw) return null;

	const tls = { enabled: true };
	if (sni) tls.server_name = sni;
	if (fp) tls.utls = { enabled: true, fingerprint: fp };
	if (alpnRaw) tls.alpn = alpnRaw.split(",");

	if (sec === "reality") {
		const pbk = params.get("pbk") || "";
		const sid = params.get("sid") || "";
		tls.reality = { enabled: true };
		if (pbk) tls.reality.public_key = pbk;
		if (sid) tls.reality.short_id = sid;
	}
	return tls;
}

// ───────────────────────────────
//  Protocol parsers
// ───────────────────────────────

function parseVless(u) {
	const uuid = u.username;
	if (!uuid) return null;
	const name = fragName(u.href);
	const p = u.searchParams;

	const out = {
		type: "vless",
		tag: name || defaultTag(u.hostname, u.port),
		server: stripBrackets(u.hostname),
		server_port: parseInt(u.port, 10) || 443,
		uuid,
	};

	const flow = p.get("flow") || "";
	if (flow) out.flow = flow;

	const tls = buildTLS(p);
	if (tls) out.tls = tls;

	const ty = p.get("type") || "tcp";
	if (ty !== "tcp")
		out.transport = buildTransport(
			ty,
			p.get("host") || "",
			p.get("path") || "",
			p.get("serviceName") || "",
		);

	return out;
}

function parseVmess(raw) {
	let jsonStr;
	try {
		jsonStr = b64decode(raw.slice(8));
		// VMess base64 is usually UTF-8 JSON; try decoding
		if (!jsonStr.startsWith("{")) jsonStr = b64utf8(raw.slice(8));
	} catch {
		return null;
	}

	let cfg;
	try {
		cfg = JSON.parse(jsonStr);
	} catch {
		return null;
	}

	const host = cfg.add || "";
	const uuid = cfg.id || "";
	if (!host || !uuid) return null;

	const port = parseInt(cfg.port, 10) || 443;
	const name = cfg.ps || "";

	const out = {
		type: "vmess",
		tag: name || `${host}:${port}`,
		server: host,
		server_port: port,
		uuid,
		security: cfg.scy || "auto",
		alter_id: parseInt(cfg.aid, 10) || 0,
		global_padding: false,
		authenticated_length: true,
	};

	const net = cfg.net || "tcp";
	if (net !== "tcp")
		out.transport = buildTransport(net, cfg.host || "", cfg.path || "", "");

	const tlsMode = cfg.tls || "";
	if (tlsMode === "tls" || tlsMode === "reality") {
		const tls = { enabled: true };
		if (cfg.sni) tls.server_name = cfg.sni;
		else if (cfg.host && cfg.host !== host) tls.server_name = cfg.host;
		if (cfg.fp) tls.utls = { enabled: true, fingerprint: cfg.fp };
		if (cfg.alpn) tls.alpn = cfg.alpn.split(",");
		if (tlsMode === "reality") {
			tls.reality = { enabled: true };
			if (cfg.pbk) tls.reality.public_key = cfg.pbk;
			if (cfg.sid) tls.reality.short_id = cfg.sid;
		}
		out.tls = tls;
	}

	return out;
}

function parseTrojan(u) {
	const pw = u.username;
	if (!pw) return null;
	const name = fragName(u.href);
	const p = u.searchParams;

	const sni = p.get("sni") || "";
	const fp = p.get("fp") || "";
	const alpnRaw = p.get("alpn") || "";

	const out = {
		type: "trojan",
		tag: name || defaultTag(u.hostname, u.port),
		server: stripBrackets(u.hostname),
		server_port: parseInt(u.port, 10) || 443,
		password: pw,
	};

	const tls = { enabled: true };
	if (sni) tls.server_name = sni;
	if (fp) tls.utls = { enabled: true, fingerprint: fp };
	if (alpnRaw) tls.alpn = alpnRaw.split(",");
	if (p.get("allowInsecure") === "1") tls.insecure = true;
	out.tls = tls;

	const ty = p.get("type") || "tcp";
	if (ty !== "tcp")
		out.transport = buildTransport(
			ty,
			p.get("host") || "",
			p.get("path") || "",
			p.get("serviceName") || "",
		);

	if (p.get("multiplex") === "true") out.multiplex = { enabled: true };

	return out;
}

function parseSS(raw) {
	let s = raw.slice(5);
	const name = fragName(s);
	if (name) s = s.slice(0, s.lastIndexOf("#"));

	const at = s.indexOf("@");
	let method,
		password,
		host = "";
	let port = "";

	if (at !== -1) {
		// SIP002: base64(method:password)@host:port
		let ui;
		try {
			ui = b64utf8(s.slice(0, at));
		} catch {
			ui = s.slice(0, at);
		}
		const colon = ui.indexOf(":");
		if (colon !== -1) {
			method = ui.slice(0, colon);
			password = ui.slice(colon + 1);
		} else {
			method = "aes-256-gcm";
			password = ui;
		}

		const server = s.slice(at + 1);
		if (server.startsWith("[")) {
			const close = server.indexOf("]");
			host = server.slice(0, close + 1);
			const rest = server.slice(close + 1);
			if (rest.startsWith(":")) port = rest.slice(1);
		} else {
			const col = server.lastIndexOf(":");
			if (col !== -1) {
				host = server.slice(0, col);
				port = server.slice(col + 1);
			} else {
				host = server;
			}
		}
	} else {
		// Old format: base64(method:password@host:port)
		let decoded;
		try {
			decoded = b64decode(s.replace(/\s/g, ""));
		} catch {
			return null;
		}
		const a = decoded.lastIndexOf("@");
		if (a !== -1) {
			const creds = decoded.slice(0, a);
			const svr = decoded.slice(a + 1);
			const c1 = creds.indexOf(":");
			const c2 = svr.lastIndexOf(":");
			if (c1 === -1 || c2 === -1) return null;
			method = creds.slice(0, c1);
			password = creds.slice(c1 + 1);
			host = svr.slice(0, c2);
			port = svr.slice(c2 + 1);
		} else {
			const c = decoded.indexOf(":");
			if (c === -1) return null;
			method = decoded.slice(0, c);
			password = decoded.slice(c + 1);
		}
	}

	if (!method || !password) return null;

	const portNum = parseInt(port, 10) || 8388;
	return {
		type: "shadowsocks",
		tag: name || (host ? `${host}:${portNum}` : defaultTag(host, portNum)),
		server: stripBrackets(host),
		server_port: portNum,
		method: method.toLowerCase(),
		password,
	};
}

function parseHy2(u) {
	const pw = u.username;
	if (!pw) return null;
	const name = fragName(u.href);
	const p = u.searchParams;
	const sni = p.get("sni") || "";

	const tls = { enabled: true };
	if (sni) tls.server_name = sni;
	if (p.get("insecure") === "1") tls.insecure = true;

	return {
		type: "hysteria2",
		tag: name || defaultTag(u.hostname, u.port),
		server: stripBrackets(u.hostname),
		server_port: parseInt(u.port, 10) || 443,
		password: pw,
		tls,
	};
}

function parseTuic(u) {
	const uuid = u.username;
	const pw = u.password || uuid;
	if (!uuid) return null;

	const name = fragName(u.href);
	const p = u.searchParams;
	const sni = p.get("sni") || "";
	const alpnRaw = p.get("alpn") || "h3";

	const tls = { enabled: true };
	if (sni) tls.server_name = sni;
	if (alpnRaw) tls.alpn = alpnRaw.split(",");
	if (p.get("allow_insecure") === "1") tls.insecure = true;

	return {
		type: "tuic",
		tag: name || defaultTag(u.hostname, u.port),
		server: stripBrackets(u.hostname),
		server_port: parseInt(u.port, 10) || 443,
		uuid,
		password: pw,
		congestion_control: p.get("congestion_control") || "bbr",
		tls,
	};
}

function parseAnytls(u) {
	const pw = u.username;
	if (!pw) return null;
	const name = fragName(u.href);
	const tls = buildTLS(u.searchParams) || { enabled: true };

	return {
		type: "anytls",
		tag: name || defaultTag(u.hostname, u.port),
		server: stripBrackets(u.hostname),
		server_port: parseInt(u.port, 10) || 443,
		password: pw,
		tls,
	};
}

function parseNaive(u) {
	const username = u.username;
	const password = u.password || "";
	if (!username) return null;

	const name = fragName(u.href);
	const p = u.searchParams;
	const sni = p.get("sni") || u.hostname;

	return {
		type: "naive",
		tag: name || defaultTag(u.hostname, u.port),
		server: stripBrackets(u.hostname),
		server_port: parseInt(u.port, 10) || 443,
		username,
		password,
		tls: {
			enabled: true,
			server_name: sni,
			insecure: p.get("insecure") === "1" || p.get("allowInsecure") === "1",
		},
	};
}

// ───────────────────────────────
//  Main export
// ───────────────────────────────
export function exportSingBox(nodes) {
	const outbounds = [];
	const errors = [];
	const skipped = [];

	for (const raw of nodes) {
		if (!raw || typeof raw !== "string") continue;
		const s = raw.trim();
		if (!s) continue;

		let scheme = "";
		for (const sc of ALLOWED_SCHEMES) {
			if (s.startsWith(sc)) {
				scheme = sc.replace("://", "");
				break;
			}
		}
		if (!scheme) {
			skipped.push(s.slice(0, 50));
			continue;
		}

		try {
			let obj = null;

			if (scheme === "vmess") {
				obj = parseVmess(s);
			} else if (scheme === "ss") {
				obj = parseSS(s);
			} else {
				let u;
				try {
					u = new URL(s);
				} catch {
					errors.push(`Invalid URL (${scheme}): ${s.slice(0, 50)}`);
					continue;
				}
				switch (scheme) {
					case "vless":
						obj = parseVless(u);
						break;
					case "trojan":
						obj = parseTrojan(u);
						break;
					case "hysteria2":
					case "hy2":
						obj = parseHy2(u);
						break;
					case "tuic":
						obj = parseTuic(u);
						break;
					case "anytls":
						obj = parseAnytls(u);
						break;
					case "naive":
						obj = parseNaive(u);
						break;
				}
			}

			if (obj) outbounds.push(obj);
			else errors.push(`Parse failed (${scheme}): ${s.slice(0, 50)}`);
		} catch (e) {
			errors.push(`Error (${scheme}): ${e.message}`);
		}
	}

	// Deduplicate tags: sing-box requires unique outbound tags
	const seen = new Set();
	for (const o of outbounds) {
		if (!seen.has(o.tag)) {
			seen.add(o.tag);
			continue;
		}
		let n = 2;
		while (seen.has(`${o.tag}-${n}`)) n++;
		o.tag = `${o.tag}-${n}`;
		seen.add(o.tag);
	}

	return { outbounds, errors, skipped };
}
