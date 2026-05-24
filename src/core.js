/**
 * subhatch — Core Logic
 * Platform-agnostic. All handlers receive a normalized Env object.
 */

import { exportSingBox } from "./export.js";
import { buildKernelConfig } from "./kernel.js";
import { buildMomoConfig } from "./momo.js";
import { HTML_PAGE } from "./ui.html.js";

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const SESSION_TTL = 2 * 60 * 60 * 1000; // 2h
const BRUTE_WINDOW = 15 * 60 * 1000; // 15min window
const BRUTE_MAX = 10; // max attempts
const KV_NODES_KEY = "vless:nodes";
const KV_SESSION_PFX = "session:";
const KV_BRUTE_PFX = "brute:";
const KV_SUB_TOKEN_KEY = "sub:token";
const KV_TOKENS_KEY = "sub:tokens";

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function jsonResp(data, status = 200, extra = {}) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json", ...extra },
	});
}

function textResp(text, status = 200, headers = {}) {
	return new Response(text, {
		status,
		headers: { "Content-Type": "text/plain; charset=utf-8", ...headers },
	});
}

async function sha256(str) {
	const buf = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(str),
	);
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function randomToken(len = 32) {
	const arr = new Uint8Array(len);
	crypto.getRandomValues(arr);
	return Array.from(arr)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function toBase64(str) {
	// Works in both browser and Workers/Node
	if (typeof btoa !== "undefined")
		return btoa(unescape(encodeURIComponent(str)));
	return Buffer.from(str, "utf8").toString("base64");
}

function normalizePreset(p) {
	if (p === "ipv6" || p === "dual" || p === "ipv4+6") return "ipv4plus_realip";
	if (p === "ipv4" || p === "single" || p === "ipv4only")
		return "ipv4only_realip";
	return p;
}

function clientIP(req) {
	return (
		req.headers.get("CF-Connecting-IP") ||
		req.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
		req.headers.get("X-Real-IP") ||
		"unknown"
	);
}

// ─────────────────────────────────────────────
//  KV abstraction — env.store must implement:
//    get(key) -> string | null
//    set(key, value, ttlSeconds?) -> void
//    del(key) -> void
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
//  Session helpers
// ─────────────────────────────────────────────
async function createSession(store) {
	const token = randomToken();
	const data = JSON.stringify({ ts: Date.now() });
	await store.set(KV_SESSION_PFX + token, data, SESSION_TTL / 1000);
	return token;
}

async function validateSession(store, token) {
	if (!token) return false;
	const raw = await store.get(KV_SESSION_PFX + token);
	if (!raw) return false;
	try {
		const { ts } = JSON.parse(raw);
		return Date.now() - ts < SESSION_TTL;
	} catch {
		return false;
	}
}

async function destroySession(store, token) {
	if (token) await store.del(KV_SESSION_PFX + token);
}

// ─────────────────────────────────────────────
//  Brute-force guard
// ─────────────────────────────────────────────
async function checkBrute(store, ip) {
	const key = KV_BRUTE_PFX + ip;
	const raw = await store.get(key);
	if (!raw) return { blocked: false, attempts: 0 };
	const { attempts, first } = JSON.parse(raw);
	if (Date.now() - first > BRUTE_WINDOW) {
		await store.del(key);
		return { blocked: false, attempts: 0 };
	}
	return { blocked: attempts >= BRUTE_MAX, attempts };
}

async function recordBrute(store, ip) {
	const key = KV_BRUTE_PFX + ip;
	const raw = await store.get(key);
	let attempts = 1,
		first = Date.now();
	if (raw) {
		const prev = JSON.parse(raw);
		if (Date.now() - prev.first < BRUTE_WINDOW) {
			attempts = prev.attempts + 1;
			first = prev.first;
		}
	}
	await store.set(
		key,
		JSON.stringify({ attempts, first }),
		BRUTE_WINDOW / 1000,
	);
}

async function clearBrute(store, ip) {
	await store.del(KV_BRUTE_PFX + ip);
}

// ─────────────────────────────────────────────
//  Node storage
// ─────────────────────────────────────────────
async function getNodes(store) {
	const raw = await store.get(KV_NODES_KEY);
	if (!raw) return [];
	try {
		return JSON.parse(raw);
	} catch {
		return [];
	}
}

async function saveNodes(store, nodes) {
	await store.set(KV_NODES_KEY, JSON.stringify(nodes));
}

// ─────────────────────────────────────────────
//  Auth helper — extracts session token from
//  Authorization header or session cookie
// ─────────────────────────────────────────────
async function getSubToken(store, envToken) {
	const raw = await store.get(KV_SUB_TOKEN_KEY);
	return raw || envToken || "";
}

async function setSubToken(store, token) {
	await store.set(KV_SUB_TOKEN_KEY, token);
}

async function getTokens(store) {
	const raw = await store.get(KV_TOKENS_KEY);
	if (!raw) return {};
	try {
		return JSON.parse(raw);
	} catch {
		return {};
	}
}

async function saveTokens(store, tokens) {
	await store.set(KV_TOKENS_KEY, JSON.stringify(tokens));
}

function getSessionToken(req) {
	const auth = req.headers.get("Authorization") || "";
	if (auth.startsWith("Bearer ")) return auth.slice(7);
	// fallback: cookie
	const cookie = req.headers.get("Cookie") || "";
	const m = cookie.match(/session=([^;]+)/);
	return m ? m[1] : null;
}

// ─────────────────────────────────────────────
//  Route handlers
// ─────────────────────────────────────────────

/** POST /api/login */
async function handleLogin(req, env) {
	const ip = clientIP(req);
	const brute = await checkBrute(env.store, ip);
	if (brute.blocked) {
		return jsonResp(
			{ error: "Too many attempts. Try again in 15 minutes." },
			429,
		);
	}

	let body;
	try {
		body = await req.json();
	} catch {
		return jsonResp({ error: "Invalid JSON" }, 400);
	}

	const { password } = body || {};
	if (!password) return jsonResp({ error: "Password required" }, 400);

	// Accept pre-hashed hex string or raw password (backward compat)
	const ADMIN_HASH = /^[0-9a-f]{64}$/i.test(env.ADMIN_PASSWORD)
		? env.ADMIN_PASSWORD
		: await sha256(env.ADMIN_PASSWORD);
	const inputHash = await sha256(password);

	if (inputHash !== ADMIN_HASH) {
		await recordBrute(env.store, ip);
		return jsonResp({ error: "Incorrect password" }, 401);
	}

	await clearBrute(env.store, ip);
	const token = await createSession(env.store);
	return jsonResp({ token });
}

/** POST /api/logout */
async function handleLogout(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	await destroySession(env.store, token);
	return jsonResp({ ok: true });
}

/** GET /api/nodes */
async function handleGetNodes(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}

	// Env-var nodes take priority and are shown as read-only
	const envNodes = parseEnvNodes(env.VLESS_NODES);
	const storedNodes = await getNodes(env.store);
	return jsonResp({ envNodes, storedNodes });
}

/** PUT /api/nodes */
async function handleSaveNodes(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}

	let body;
	try {
		body = await req.json();
	} catch {
		return jsonResp({ error: "Invalid JSON" }, 400);
	}

	const { nodes } = body || {};
	if (!Array.isArray(nodes))
		return jsonResp({ error: "nodes must be an array" }, 400);

	// Validate each entry
	const valid = nodes.filter(
		(n) => typeof n === "string" && isValidNode(n.trim()),
	);
	await saveNodes(
		env.store,
		valid.map((n) => n.trim()),
	);
	return jsonResp({ ok: true, saved: valid.length });
}

/** PUT /api/sub-token — rotate subscription token */
async function handleSubToken(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	const newToken = randomToken(16);
	await setSubToken(env.store, newToken);
	return jsonResp({ token: newToken });
}

/** GET /sub  — public subscription endpoint, supports scoped tokens */
async function handleSub(req, env) {
	const url = new URL(req.url);
	const t = url.searchParams.get("token") || "";
	const primary = await getSubToken(env.store, env.SUB_TOKEN);
	const scoped = await getTokens(env.store);

	let allowed;

	if (primary) {
		// Private mode — token required
		if (!t) return textResp("Unauthorized", 401);
		if (t === primary) {
			allowed = "all";
		} else if (scoped[t]) {
			allowed = scoped[t].nodes;
		} else {
			const ip = clientIP(req);
			const brute = await checkBrute(env.store, ip);
			if (brute.blocked) return textResp("Too many requests", 429);
			await recordBrute(env.store, ip);
			return textResp("Unauthorized", 401);
		}
	} else {
		// Public mode
		if (!t) {
			allowed = "all";
		} else if (scoped[t]) {
			allowed = scoped[t].nodes;
		} else {
			const ip = clientIP(req);
			const brute = await checkBrute(env.store, ip);
			if (brute.blocked) return textResp("Too many requests", 429);
			await recordBrute(env.store, ip);
			return textResp("Unauthorized", 401);
		}
	}

	const envNodes = parseEnvNodes(env.VLESS_NODES);
	const stored = await getNodes(env.store);
	const all = [...envNodes, ...stored].filter(Boolean);

	let selected;
	if (allowed === "all") selected = all;
	else selected = all.filter((n) => allowed.includes(n));

	if (selected.length === 0) {
		return textResp("", 200, {
			"Content-Type": "text/plain",
			"Profile-Update-Interval": "24",
		});
	}

	const content = toBase64(selected.join("\n"));
	return textResp(content, 200, {
		"Content-Type": "text/plain; charset=utf-8",
		"Profile-Update-Interval": "24",
		"Cache-Control": "no-store",
	});
}

/** GET /api/sub-url  — returns the subscription URL for display */
async function handleSubUrl(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	const subToken = await getSubToken(env.store, env.SUB_TOKEN);
	const base = new URL(req.url).origin;
	const subPath = subToken
		? `/sub?token=${encodeURIComponent(subToken)}`
		: "/sub";
	return jsonResp({ url: base + subPath });
}

/** GET /api/sub-tokens — list primary + scoped tokens */
async function handleGetTokens(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	const primary = await getSubToken(env.store, env.SUB_TOKEN);
	const tokens = await getTokens(env.store);
	return jsonResp({ primary, tokens });
}

/** POST /api/sub-tokens — create scoped token */
async function handleCreateToken(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	let body;
	try {
		body = await req.json();
	} catch {
		return jsonResp({ error: "Invalid JSON" }, 400);
	}
	const name = body?.name || "";
	const nodes = body && Array.isArray(body.nodes) ? body.nodes : [];
	const newToken = randomToken(24);

	const tokens = await getTokens(env.store);
	tokens[newToken] = { name, nodes };
	await saveTokens(env.store, tokens);

	return jsonResp({ token: newToken, name, nodes });
}

/** PUT /api/sub-tokens — update scoped token (name, nodes) */
async function handleUpdateToken(req, env) {
	const session = getSessionToken(req);
	if (!(await validateSession(env.store, session))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	let body;
	try {
		body = await req.json();
	} catch {
		return jsonResp({ error: "Invalid JSON" }, 400);
	}

	const { token, name, nodes } = body || {};
	if (!token) return jsonResp({ error: "token required" }, 400);

	const tokens = await getTokens(env.store);
	if (!tokens[token]) return jsonResp({ error: "Token not found" }, 404);

	if (name !== undefined) tokens[token].name = name;
	if (nodes !== undefined) tokens[token].nodes = nodes;
	await saveTokens(env.store, tokens);

	return jsonResp({
		token,
		name: tokens[token].name,
		nodes: tokens[token].nodes,
	});
}

/** POST /api/sub-tokens/rotate — rotate a scoped token */
async function handleRotateToken(req, env) {
	const session = getSessionToken(req);
	if (!(await validateSession(env.store, session))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	let body;
	try {
		body = await req.json();
	} catch {
		return jsonResp({ error: "Invalid JSON" }, 400);
	}

	const old = body?.token;
	if (!old) return jsonResp({ error: "token required" }, 400);

	const tokens = await getTokens(env.store);
	if (!tokens[old]) return jsonResp({ error: "Token not found" }, 404);

	const config = tokens[old];
	const fresh = randomToken(24);
	tokens[fresh] = config;
	delete tokens[old];
	await saveTokens(env.store, tokens);

	return jsonResp({ token: fresh, name: config.name, nodes: config.nodes });
}

/** DELETE /api/sub-tokens — delete scoped token */
async function handleDeleteToken(req, env) {
	const session = getSessionToken(req);
	if (!(await validateSession(env.store, session))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	const url = new URL(req.url);
	const t = url.searchParams.get("token");
	if (!t) return jsonResp({ error: "token query param required" }, 400);

	const tokens = await getTokens(env.store);
	if (!tokens[t]) return jsonResp({ error: "Token not found" }, 404);

	delete tokens[t];
	await saveTokens(env.store, tokens);

	return jsonResp({ ok: true });
}

/** GET /api/ping */
function handlePing() {
	return jsonResp({ ok: true, ts: Date.now() });
}

/** GET /api/export/sing-box — export all nodes as sing-box JSON */
async function handleExportSingBox(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}

	const envNodes = parseEnvNodes(env.VLESS_NODES);
	const stored = await getNodes(env.store);
	const all = [...envNodes, ...stored].filter(Boolean);

	const result = exportSingBox(all);
	return jsonResp({
		ok: true,
		count: result.outbounds.length,
		outbounds: result.outbounds,
		errors: result.errors,
	});
}

/** GET /api/export/momo — export complete config.json for OpenWrt-momo
 *  Auth: session token (Bearer header) or sub-token (?token= query param) */
async function handleExportMomo(req, env) {
	const url = new URL(req.url);
	const queryToken = url.searchParams.get("token") || "";

	const envNodes = parseEnvNodes(env.VLESS_NODES);
	const stored = await getNodes(env.store);
	const all = [...envNodes, ...stored].filter(Boolean);

	let selected;

	// 1) Session auth (UI download)
	const sessionToken = getSessionToken(req);
	if (await validateSession(env.store, sessionToken)) {
		selected = all;
	} else if (queryToken) {
		// 2) Sub-token auth (momo curl)
		const primary = await getSubToken(env.store, env.SUB_TOKEN);
		const scoped = await getTokens(env.store);

		if (primary && queryToken === primary) {
			selected = all;
		} else if (scoped[queryToken]) {
			selected = all.filter((n) => scoped[queryToken].nodes.includes(n));
		} else {
			const ip = clientIP(req);
			const brute = await checkBrute(env.store, ip);
			if (brute.blocked) return jsonResp({ error: "Too many requests" }, 429);
			await recordBrute(env.store, ip);
			return jsonResp({ error: "Unauthorized" }, 401);
		}
	} else {
		return jsonResp({ error: "Unauthorized" }, 401);
	}

	if (queryToken) await clearBrute(env.store, clientIP(req));

	const options = {};
	for (const key of [
		"preset",
		"selectorTag",
		"redirectPort",
		"tproxyPort",
		"dnsPort",
		"tunAddress",
		"tunAddress6",
		"dnsStrategy",
		"listen",
		"clashPort",
		"clashSecret",
		"fakeip",
	]) {
		const val = url.searchParams.get(key);
		if (val != null) options[key] = val;
	}

	options.preset = normalizePreset(options.preset);

	const result = buildMomoConfig(selected, options);
	const { _meta, ...config } = result;
	return new Response(JSON.stringify(config, null, 2), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

/** GET /api/export/kernel — export complete config.json for sing-box HPC client
 *  Auth: session token (Bearer header) or sub-token (?token= query param) */
async function handleExportKernel(req, env) {
	const url = new URL(req.url);
	const queryToken = url.searchParams.get("token") || "";

	const envNodes = parseEnvNodes(env.VLESS_NODES);
	const stored = await getNodes(env.store);
	const all = [...envNodes, ...stored].filter(Boolean);

	let selected;

	const sessionToken = getSessionToken(req);
	if (await validateSession(env.store, sessionToken)) {
		selected = all;
	} else if (queryToken) {
		const primary = await getSubToken(env.store, env.SUB_TOKEN);
		const scoped = await getTokens(env.store);

		if (primary && queryToken === primary) {
			selected = all;
		} else if (scoped[queryToken]) {
			selected = all.filter((n) => scoped[queryToken].nodes.includes(n));
		} else {
			const ip = clientIP(req);
			const brute = await checkBrute(env.store, ip);
			if (brute.blocked) return jsonResp({ error: "Too many requests" }, 429);
			await recordBrute(env.store, ip);
			return jsonResp({ error: "Unauthorized" }, 401);
		}
	} else {
		return jsonResp({ error: "Unauthorized" }, 401);
	}

	if (queryToken) await clearBrute(env.store, clientIP(req));

	const options = {};
	for (const key of [
		"preset",
		"selectorTag",
		"dnsPort",
		"mixedPort",
		"tunAddress",
		"tunAddress6",
		"dnsStrategy",
		"listen",
		"clashPort",
		"clashSecret",
		"fakeip",
		"tunName",
	]) {
		const val = url.searchParams.get(key);
		if (val != null) options[key] = val;
	}

	options.preset = normalizePreset(options.preset);

	const result = buildKernelConfig(selected, options);
	const { _meta, ...config } = result;
	return new Response(JSON.stringify(config, null, 2), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

// ─────────────────────────────────────────────
//  Node validation
// ─────────────────────────────────────────────
const VALID_SCHEMES = [
	"vless://",
	"vmess://",
	"trojan://",
	"ss://",
	"ssr://",
	"hysteria2://",
	"hy2://",
	"tuic://",
	"anytls://",
	"naive://",
];

function isValidNode(str) {
	return VALID_SCHEMES.some((s) => str.startsWith(s));
}

function parseEnvNodes(raw) {
	if (!raw) return [];
	// Support newline or pipe separated
	return raw
		.split(/[\n|]/)
		.map((s) => s.trim())
		.filter(isValidNode);
}

// ─────────────────────────────────────────────
//  Main router
// ─────────────────────────────────────────────
export async function handleRequest(req, env) {
	const url = new URL(req.url);
	const method = req.method.toUpperCase();
	const path = url.pathname.replace(/\/$/, "") || "/";

	// CORS preflight
	if (method === "OPTIONS") {
		return new Response(null, {
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
		});
	}

	if (path === "/sub" && method === "GET") return handleSub(req, env);
	if (path === "/api/ping" && method === "GET") return handlePing();
	if (path === "/api/login" && method === "POST") return handleLogin(req, env);
	if (path === "/api/logout" && method === "POST")
		return handleLogout(req, env);
	if (path === "/api/nodes" && method === "GET")
		return handleGetNodes(req, env);
	if (path === "/api/nodes" && method === "PUT")
		return handleSaveNodes(req, env);
	if (path === "/api/export/sing-box" && method === "GET")
		return handleExportSingBox(req, env);
	if (path === "/api/export/momo" && method === "GET")
		return handleExportMomo(req, env);
	if (path === "/api/export/kernel" && method === "GET")
		return handleExportKernel(req, env);
	if (path === "/api/sub-url" && method === "GET")
		return handleSubUrl(req, env);
	if (path === "/api/sub-token" && method === "PUT")
		return handleSubToken(req, env);
	if (path === "/api/sub-tokens" && method === "GET")
		return handleGetTokens(req, env);
	if (path === "/api/sub-tokens" && method === "POST")
		return handleCreateToken(req, env);
	if (path === "/api/sub-tokens" && method === "PUT")
		return handleUpdateToken(req, env);
	if (path === "/api/sub-tokens/rotate" && method === "POST")
		return handleRotateToken(req, env);
	if (path === "/api/sub-tokens" && method === "DELETE")
		return handleDeleteToken(req, env);

	// Serve UI for all other GET paths
	if (method === "GET") return serveUI();

	return jsonResp({ error: "Not found" }, 404);
}

// ─────────────────────────────────────────────
//  UI
// ─────────────────────────────────────────────
function serveUI() {
	return new Response(HTML_PAGE, {
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}
