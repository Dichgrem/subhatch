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
const KV_UPLOAD_TOKEN_KEY = "upload:token";
const KV_AUDIT_KEY = "audit:log";
const AUDIT_MAX = 500;
const KV_UPSTREAM_KEY = "upstream:urls";
const KV_UPSTREAM_PFX = "upstream:nodes:";

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

function timingSafeEqual(a, b) {
	const bufA = new Uint8Array(a.length / 2);
	const bufB = new Uint8Array(b.length / 2);
	for (let i = 0; i < a.length; i += 2) {
		bufA[i / 2] = parseInt(a.slice(i, i + 2), 16);
		bufB[i / 2] = parseInt(b.slice(i, i + 2), 16);
	}
	if (bufA.length !== bufB.length) return false;
	return crypto.subtle.timingSafeEqual(bufA, bufB);
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

// ── Audit log ──
async function appendAudit(store, action, ip, detail = "", level = "INFO") {
	const raw = await store.get(KV_AUDIT_KEY);
	let entries;
	try {
		entries = raw ? JSON.parse(raw) : [];
	} catch {
		entries = [];
	}
	entries.unshift({ ts: Date.now(), action, ip, detail, level });
	if (entries.length > AUDIT_MAX) entries.length = AUDIT_MAX;
	await store.set(KV_AUDIT_KEY, JSON.stringify(entries));
}

async function getAuditLog(store) {
	const raw = await store.get(KV_AUDIT_KEY);
	return raw ? JSON.parse(raw) : [];
}

async function clearAuditLog(store) {
	await store.del(KV_AUDIT_KEY);
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

async function getUploadToken(store, envToken) {
	const raw = await store.get(KV_UPLOAD_TOKEN_KEY);
	return raw || envToken || "";
}

async function setUploadToken(store, token) {
	await store.set(KV_UPLOAD_TOKEN_KEY, token);
}

// ── Upstream helpers ──
async function getUpstreamUrls(store) {
	const raw = await store.get(KV_UPSTREAM_KEY);
	return raw ? JSON.parse(raw) : [];
}

async function saveUpstreamUrls(store, entries) {
	await store.set(KV_UPSTREAM_KEY, JSON.stringify(entries));
}

async function getUpstreamNodes(store, hash) {
	const raw = await store.get(KV_UPSTREAM_PFX + hash);
	return raw ? JSON.parse(raw) : [];
}

async function saveUpstreamNodes(store, hash, nodes) {
	await store.set(KV_UPSTREAM_PFX + hash, JSON.stringify(nodes));
}

async function loadAllUpstreamNodes(store) {
	const urls = await getUpstreamUrls(store);
	const all = [];
	for (const u of urls) {
		if (!u.hash) continue;
		const nodes = await getUpstreamNodes(store, u.hash);
		all.push(...nodes);
	}
	return all;
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
		await appendAudit(env.store, "blocked", ip, "login", "WARN");
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

	if (!timingSafeEqual(inputHash, ADMIN_HASH)) {
		await recordBrute(env.store, ip);
		await appendAudit(env.store, "login-failed", ip, "", "WARN");
		return jsonResp({ error: "Incorrect password" }, 401);
	}

	await clearBrute(env.store, ip);
	await appendAudit(env.store, "login", ip);
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
	await appendAudit(env.store, "logout", clientIP(req));
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
	await appendAudit(
		env.store,
		"nodes-save",
		clientIP(req),
		`${valid.length} nodes`,
	);
	return jsonResp({ ok: true, saved: valid.length });
}

/** POST /api/upload — submit node URIs with upload token
 *  Auth: ?token=<upload_token> query param only (no session).
 *  Deduplicates exact URIs and renames duplicate fragment names. */
async function handleUpload(req, env) {
	const url = new URL(req.url);
	const t = url.searchParams.get("token") || "";
	const uploadToken = await getUploadToken(env.store, env.UPLOAD_TOKEN);
	const ip = clientIP(req);
	if (!uploadToken) return jsonResp({ error: "Upload not enabled" }, 403);
	if (t !== uploadToken) {
		const brute = await checkBrute(env.store, ip);
		if (brute.blocked) {
			await appendAudit(env.store, "blocked", ip, "upload", "WARN");
			return jsonResp({ error: "Too many requests" }, 429);
		}
		await recordBrute(env.store, ip);
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	await clearBrute(env.store, ip);

	let body;
	try {
		body = await req.json();
	} catch {
		return jsonResp({ error: "Invalid JSON" }, 400);
	}
	const incoming = (body && Array.isArray(body.nodes) ? body.nodes : []).filter(
		(n) => typeof n === "string" && isValidNode(n.trim()),
	);
	if (incoming.length === 0)
		return jsonResp({ error: "nodes must be a non-empty array" }, 400);

	const envNodes = parseEnvNodes(env.VLESS_NODES);
	const stored = await getNodes(env.store);
	const existing = new Set([...envNodes, ...stored].filter(Boolean));

	// Collect all existing fragment names for dedup
	const nameCount = new Map();
	for (const node of existing) {
		const hash = node.lastIndexOf("#");
		const name = hash !== -1 ? decodeURIComponent(node.slice(hash + 1)) : "";
		if (name) nameCount.set(name, (nameCount.get(name) || 0) + 1);
	}

	const fresh = [];
	const dupes = [];
	for (const raw of incoming) {
		const n = raw.trim();
		if (existing.has(n) || fresh.includes(n)) {
			dupes.push(n.slice(0, 50));
			continue;
		}

		const hash = n.lastIndexOf("#");
		if (hash !== -1) {
			let name;
			try {
				name = decodeURIComponent(n.slice(hash + 1));
			} catch {
				name = n.slice(hash + 1);
			}
			if (name) {
				const count = (nameCount.get(name) || 0) + 1;
				nameCount.set(name, count);
				if (count > 1) {
					// Append suffix: #Tokyo → #Tokyo-2
					const suffix = `-${count}`;
					const base = n.slice(0, hash + 1);
					existing.add(base + encodeURIComponent(name + suffix));
					fresh.push(base + encodeURIComponent(name + suffix));
					continue;
				}
			}
		}
		existing.add(n);
		fresh.push(n);
	}

	if (fresh.length === 0)
		return jsonResp({ ok: true, added: 0, dupes: dupes.length });

	const merged = [...stored.filter(isValidNode), ...fresh];
	await saveNodes(env.store, merged);
	await appendAudit(
		env.store,
		"upload",
		clientIP(req),
		`added ${fresh.length}, dupes ${dupes.length}`,
	);
	return jsonResp({ ok: true, added: fresh.length, dupes: dupes.length });
}

/** PUT /api/sub-token — rotate subscription token */
async function handleSubToken(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	const newToken = randomToken(16);
	await setSubToken(env.store, newToken);
	await appendAudit(env.store, "token-rotate", clientIP(req), "primary");
	return jsonResp({ token: newToken });
}

/** GET /sub  — public subscription endpoint, supports scoped tokens */
async function handleSub(req, env) {
	const url = new URL(req.url);
	const t = url.searchParams.get("token") || "";
	const primary = await getSubToken(env.store, env.SUB_TOKEN);
	const scoped = await getTokens(env.store);

	let allowed;
	let who = "";

	if (primary) {
		// Private mode — token required
		if (!t) return textResp("Unauthorized", 401);
		if (t === primary) {
			allowed = "all";
			who = "primary";
		} else if (scoped[t]) {
			allowed = scoped[t].nodes;
			who = scoped[t].name || t.slice(0, 8);
		} else {
			const ip = clientIP(req);
			const brute = await checkBrute(env.store, ip);
			if (brute.blocked) {
				await appendAudit(env.store, "blocked", ip, "sub", "WARN");
				return textResp("Too many requests", 429);
			}
			await recordBrute(env.store, ip);
			return textResp("Unauthorized", 401);
		}
	} else {
		// Public mode
		if (!t) {
			allowed = "all";
			who = "public";
		} else if (scoped[t]) {
			allowed = scoped[t].nodes;
			who = scoped[t].name || t.slice(0, 8);
		} else {
			const ip = clientIP(req);
			const brute = await checkBrute(env.store, ip);
			if (brute.blocked) {
				await appendAudit(env.store, "blocked", ip, "sub", "WARN");
				return textResp("Too many requests", 429);
			}
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

	const subIP = clientIP(req);
	await appendAudit(
		env.store,
		"sub",
		subIP,
		`${who}: ${selected.length} nodes`,
	);

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
	const nodes =
		body && Array.isArray(body.nodes)
			? body.nodes.filter((n) => typeof n === "string" && isValidNode(n))
			: [];
	const newToken = randomToken(24);

	const tokens = await getTokens(env.store);
	tokens[newToken] = { name, nodes };
	await saveTokens(env.store, tokens);
	await appendAudit(env.store, "token-create", clientIP(req), name || "scoped");
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
	if (nodes !== undefined) {
		if (!Array.isArray(nodes))
			return jsonResp({ error: "nodes must be an array" }, 400);
		tokens[token].nodes = nodes.filter(
			(n) => typeof n === "string" && isValidNode(n),
		);
	}
	await saveTokens(env.store, tokens);
	await appendAudit(
		env.store,
		"token-update",
		clientIP(req),
		token.slice(0, 8),
	);
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
	await appendAudit(
		env.store,
		"token-rotate",
		clientIP(req),
		config.name || old.slice(0, 8),
	);
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
	await appendAudit(env.store, "token-delete", clientIP(req), t.slice(0, 8));
	return jsonResp({ ok: true });
}

/** GET /api/upload-token — return the upload token (session auth) */
async function handleGetUploadToken(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	let t = await getUploadToken(env.store, env.UPLOAD_TOKEN);
	if (!t) {
		t = randomToken(16);
		await setUploadToken(env.store, t);
	}
	return jsonResp({ token: t });
}

/** PUT /api/upload-token — rotate the upload token (session auth) */
async function handleRotateUploadToken(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	const newToken = randomToken(16);
	await setUploadToken(env.store, newToken);
	await appendAudit(env.store, "token-rotate", clientIP(req), "upload");
	return jsonResp({ token: newToken });
}

// ── Upstream handlers ──

async function syncOneUpstream(u, store) {
	try {
		const syncUrl = new URL(u.url);
		if (syncUrl.protocol !== "https:" && syncUrl.protocol !== "http:") {
			throw new Error("disallowed scheme");
		}
		const r = await fetch(u.url);
		if (!r.ok) throw new Error(`HTTP ${r.status}`);
		let raw = await r.text();
		raw = raw.trim();
		if (!raw) throw new Error("empty response");

		// Try base64 decode
		let lines;
		try {
			const dec = atob(raw.replace(/\s/g, ""));
			if (VALID_SCHEMES.some((s) => dec.includes(s))) {
				lines = dec.split(/[\n\r|]/);
			} else {
				lines = raw.split(/[\n\r|]/);
			}
		} catch {
			lines = raw.split(/[\n\r|]/);
		}

		const nodes = lines
			.map((l) => l.trim())
			.filter((l) => VALID_SCHEMES.some((s) => l.startsWith(s)));
		if (nodes.length === 0) throw new Error("no valid nodes");
		await saveUpstreamNodes(store, u.hash, nodes);
		u.lastSync = Date.now();
		u.lastError = null;
		u.nodeCount = nodes.length;
		return { ok: true, count: nodes.length };
	} catch (e) {
		u.lastError = e.message;
		return { ok: false, error: e.message };
	}
}

async function handleGetUpstream(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token)))
		return jsonResp({ error: "Unauthorized" }, 401);
	const urls = await getUpstreamUrls(env.store);
	return jsonResp({ urls });
}

async function handleAddUpstream(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token)))
		return jsonResp({ error: "Unauthorized" }, 401);
	let body;
	try {
		body = await req.json();
	} catch {
		return jsonResp({ error: "Invalid JSON" }, 400);
	}
	const url = (body.url || "").trim();
	const name = (body.name || "").trim();
	if (!url) return jsonResp({ error: "url required" }, 400);
	const hash = (await sha256(url)).slice(0, 16);
	const urls = await getUpstreamUrls(env.store);
	if (urls.some((u) => u.hash === hash))
		return jsonResp({ error: "Duplicate URL" }, 409);

	const entry = { name, url, hash, lastSync: 0, lastError: null, nodeCount: 0 };
	await syncOneUpstream(entry, env.store);
	urls.push(entry);
	await saveUpstreamUrls(env.store, urls);
	await appendAudit(env.store, "upstream-add", clientIP(req), name || url);
	return jsonResp({ entry, ok: true });
}

async function handleDeleteUpstream(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token)))
		return jsonResp({ error: "Unauthorized" }, 401);
	const idx = parseInt(new URL(req.url).searchParams.get("id"), 10);
	if (!Number.isFinite(idx))
		return jsonResp({ error: "id query param required" }, 400);
	const urls = await getUpstreamUrls(env.store);
	if (idx < 0 || idx >= urls.length)
		return jsonResp({ error: "Invalid index" }, 400);
	const removed = urls.splice(idx, 1)[0];
	if (removed.hash) await saveUpstreamNodes(env.store, removed.hash, []);
	await saveUpstreamUrls(env.store, urls);
	await appendAudit(
		env.store,
		"upstream-delete",
		clientIP(req),
		removed.name || removed.url,
	);
	return jsonResp({ ok: true });
}

async function handleSyncUpstream(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token)))
		return jsonResp({ error: "Unauthorized" }, 401);
	const idx = parseInt(new URL(req.url).searchParams.get("id"), 10);
	const urls = await getUpstreamUrls(env.store);
	if (Number.isFinite(idx)) {
		if (idx < 0 || idx >= urls.length)
			return jsonResp({ error: "Invalid index" }, 400);
		const r = await syncOneUpstream(urls[idx], env.store);
		await saveUpstreamUrls(env.store, urls);
		await appendAudit(
			env.store,
			"upstream-sync",
			clientIP(req),
			r.ok ? `ok:${r.count}` : `err:${r.error}`,
		);
		return jsonResp(r);
	}
	const results = [];
	for (const u of urls) {
		const r = await syncOneUpstream(u, env.store);
		results.push({ name: u.name, ...r });
	}
	await saveUpstreamUrls(env.store, urls);
	await appendAudit(
		env.store,
		"upstream-sync",
		clientIP(req),
		`all:${results.length}`,
		results.some((r) => !r.ok) ? "ERROR" : "INFO",
	);
	return jsonResp({ results });
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
	await appendAudit(
		env.store,
		"export-json",
		clientIP(req),
		`${result.outbounds.length} outbounds`,
	);
	return jsonResp({
		ok: true,
		count: result.outbounds.length,
		outbounds: result.outbounds,
		errors: result.errors,
	});
}

/** Resolve auth for export endpoints — session or sub-token.
 *  Returns { selected, queryToken } on success, or a Response on failure.
 *  ?refresh=1 triggers upstream sync before returning. */
async function resolveExportAuth(req, env, logAction) {
	const url = new URL(req.url);
	const queryToken = url.searchParams.get("token") || "";

	const envNodes = parseEnvNodes(env.VLESS_NODES);
	const stored = await getNodes(env.store);
	const upstreamNodes = await loadAllUpstreamNodes(env.store);
	const all = [...envNodes, ...stored].filter(Boolean);
	const allWithUpstream = [...all, ...upstreamNodes];

	// Sync upstream by default; ?refresh=0 disables
	const shouldRefresh = url.searchParams.get("refresh") !== "0";
	const urls = await getUpstreamUrls(env.store);
	if (shouldRefresh && urls.length > 0) {
		const results = [];
		for (const u of urls) {
			const r = await syncOneUpstream(u, env.store);
			results.push(r);
		}
		await saveUpstreamUrls(env.store, urls);
		const fresh = await loadAllUpstreamNodes(env.store);
		allWithUpstream.length = 0;
		allWithUpstream.push(...all, ...fresh);
		const total = fresh.length;
		const failed = results.filter((r) => !r.ok).length;
		const detail =
			failed > 0
				? `${total} nodes, ${failed}/${results.length} sources failed`
				: `${total} nodes`;
		await appendAudit(
			env.store,
			"upstream-sync",
			clientIP(req),
			detail,
			failed > 0 ? "ERROR" : "INFO",
		);
	}

	let selected;

	const sessionToken = getSessionToken(req);
	if (await validateSession(env.store, sessionToken)) {
		selected = allWithUpstream;
	} else if (queryToken) {
		const primary = await getSubToken(env.store, env.SUB_TOKEN);
		const scoped = await getTokens(env.store);

		if (primary && queryToken === primary) {
			selected = allWithUpstream;
		} else if (scoped[queryToken]) {
			selected = all.filter((n) => scoped[queryToken].nodes.includes(n));
		} else {
			const ip = clientIP(req);
			const brute = await checkBrute(env.store, ip);
			if (brute.blocked) {
				await appendAudit(env.store, "blocked", ip, logAction, "WARN");
				return { _err: jsonResp({ error: "Too many requests" }, 429) };
			}
			await recordBrute(env.store, ip);
			return { _err: jsonResp({ error: "Unauthorized" }, 401) };
		}
	} else {
		return { _err: jsonResp({ error: "Unauthorized" }, 401) };
	}

	if (queryToken) await clearBrute(env.store, clientIP(req));
	return { selected, queryToken };
}

/** GET /api/export/momo — export complete config.json for OpenWrt-momo */
async function handleExportMomo(req, env) {
	const { selected, queryToken, _err } = await resolveExportAuth(
		req,
		env,
		"export-momo",
	);
	if (_err) return _err;

	const url = new URL(req.url);
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
	if (queryToken)
		await appendAudit(
			env.store,
			"export-momo",
			clientIP(req),
			`${_meta.nodeCount} nodes`,
		);
	return new Response(JSON.stringify(config, null, 2), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

/** GET /api/export/kernel — export complete config.json for sing-box HPC client
 *  Auth: session token (Bearer header) or sub-token (?token= query param) */
async function handleExportKernel(req, env) {
	const { selected, queryToken, _err } = await resolveExportAuth(
		req,
		env,
		"export-kernel",
	);
	if (_err) return _err;

	const url = new URL(req.url);
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
	if (queryToken)
		await appendAudit(
			env.store,
			"export-kernel",
			clientIP(req),
			`${_meta.nodeCount} nodes`,
		);
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
	if (path === "/api/upload" && method === "POST")
		return handleUpload(req, env);
	if (path === "/api/upload-token" && method === "GET")
		return handleGetUploadToken(req, env);
	if (path === "/api/upload-token" && method === "PUT")
		return handleRotateUploadToken(req, env);
	if (path === "/api/upstream" && method === "GET")
		return handleGetUpstream(req, env);
	if (path === "/api/upstream" && method === "POST")
		return handleAddUpstream(req, env);
	if (path === "/api/upstream" && method === "DELETE")
		return handleDeleteUpstream(req, env);
	if (path === "/api/upstream/sync" && method === "POST")
		return handleSyncUpstream(req, env);
	if (path === "/api/audit-log" && method === "GET")
		return handleGetAuditLog(req, env);
	if (path === "/api/audit-log" && method === "DELETE")
		return handleClearAuditLog(req, env);

	// Serve UI for all other GET paths
	if (method === "GET") return serveUI();

	return jsonResp({ error: "Not found" }, 404);
}

// ─────────────────────────────────────────────
//  Audit log
// ─────────────────────────────────────────────
async function handleGetAuditLog(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	const log = await getAuditLog(env.store);
	return jsonResp({ log });
}

async function handleClearAuditLog(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	await clearAuditLog(env.store);
	return jsonResp({ ok: true });
}

// ─────────────────────────────────────────────
//  UI
// ─────────────────────────────────────────────
function serveUI() {
	return new Response(HTML_PAGE, {
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}
