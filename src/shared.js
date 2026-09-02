/**
 * subhatch — Shared helpers and constants
 * Platform-agnostic. Used by core.js, upstream.js, tokens.js.
 */

// ── Constants ──
export const SESSION_TTL = 2 * 60 * 60 * 1000; // 2h
export const BRUTE_WINDOW = 15 * 60 * 1000; // 15min window
export const BRUTE_MAX = 10; // max attempts
export const KV_NODES_KEY = "vless:nodes";
export const KV_SESSION_PFX = "session:";
export const KV_BRUTE_PFX = "brute:";
export const KV_SUB_TOKEN_KEY = "sub:token";
export const KV_TOKENS_KEY = "sub:tokens";
export const KV_UPLOAD_TOKEN_KEY = "upload:token";
export const KV_AUDIT_KEY = "audit:log";
export const AUDIT_MAX = 500;
export const KV_UPSTREAM_KEY = "upstream:urls";
export const KV_UPSTREAM_PFX = "upstream:nodes:";
export const KV_PASSWORD_KEY = "admin:pwhash";
export const PBKDF2_ITER = 100000;

// ── Node validation ──
export const VALID_SCHEMES = [
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

export function isValidNode(str) {
	return VALID_SCHEMES.some((s) => str.startsWith(s));
}

export function parseEnvNodes(raw) {
	if (!raw) return [];
	return raw
		.split(/[\n|]/)
		.map((s) => s.trim())
		.filter(isValidNode);
}

// ── Helpers ──
export function jsonResp(data, status = 200, extra = {}) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json", ...extra },
	});
}

export function textResp(text, status = 200, headers = {}) {
	return new Response(text, {
		status,
		headers: { "Content-Type": "text/plain; charset=utf-8", ...headers },
	});
}

export function int(val, fallback) {
	if (val == null) return fallback;
	const n = parseInt(val, 10);
	return Number.isFinite(n) ? n : fallback;
}

export async function sha256(str) {
	const buf = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(str),
	);
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

// ── PBKDF2 password hashing ──
export async function pbkdf2Hash(password, salt, iterations = PBKDF2_ITER) {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const saltBytes = new Uint8Array(salt.length / 2);
	for (let i = 0; i < salt.length; i += 2)
		saltBytes[i / 2] = parseInt(salt.slice(i, i + 2), 16);
	const bits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations },
		key,
		256,
	);
	return Array.from(new Uint8Array(bits))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export async function pbkdf2Verify(
	password,
	{ hash, salt, iter = PBKDF2_ITER },
) {
	const computed = await pbkdf2Hash(password, salt, iter);
	return timingSafeEqual(computed, hash);
}

export async function getPasswordConfig(store) {
	const raw = await store.get(KV_PASSWORD_KEY);
	return raw ? JSON.parse(raw) : null;
}

export async function setPasswordConfig(store, config) {
	await store.set(KV_PASSWORD_KEY, JSON.stringify(config));
}

export function randomToken(len = 32) {
	const arr = new Uint8Array(len);
	crypto.getRandomValues(arr);
	return Array.from(arr)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export function timingSafeEqual(a, b) {
	const bufA = new Uint8Array(a.length / 2);
	const bufB = new Uint8Array(b.length / 2);
	for (let i = 0; i < a.length; i += 2) {
		bufA[i / 2] = parseInt(a.slice(i, i + 2), 16);
		bufB[i / 2] = parseInt(b.slice(i, i + 2), 16);
	}
	if (bufA.length !== bufB.length) return false;
	let diff = 0;
	for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
	return diff === 0;
}

export function toBase64(str) {
	if (typeof btoa !== "undefined")
		return btoa(unescape(encodeURIComponent(str)));
	return Buffer.from(str, "utf8").toString("base64");
}

export function normalizePreset(p) {
	if (p === "ipv6" || p === "dual" || p === "ipv4+6") return "ipv4plus_realip";
	if (p === "ipv4" || p === "single" || p === "ipv4only")
		return "ipv4only_realip";
	return p;
}

export function clientIP(req) {
	return (
		req.headers.get("CF-Connecting-IP") ||
		req.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
		req.headers.get("X-Real-IP") ||
		"unknown"
	);
}

// ── SSRF guard ──
// Matches literal IPs in private / reserved / loopback ranges.
// Hostnames (not IP literals) pass through — DNS resolution is not
// available on all platforms (Workers), so they are left to fetch().
const PRIVATE_IPV4 = [
	/^0\./, // 0.0.0.0/8
	/^10\./, // 10.0.0.0/8
	/^127\./, // 127.0.0.0/8
	/^169\.254\./, // 169.254.0.0/16
	/^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
	/^192\.168\./, // 192.168.0.0/16
	/^22[4-9]\.|^2[3-9]\d\./, // 224.0.0.0/4 (multicast)
	/^24\d\.|^25[0-5]\.(?!25[0-5]\.255\.255\b)/, // 240.0.0.0/4 (reserved)
];
const PRIVATE_IPV6 = [
	/^::1$/, // loopback
	/^fe[89ab]/i, // fe80::/10 link-local
	/^f[c-d]/i, // fc00::/7 unique local
];

export function isPrivateHost(hostname) {
	if (!hostname) return false;
	const h = hostname.replace(/^\[|\]$/g, ""); // strip brackets from IPv6
	if (!h) return false;

	// IPv6 detection — after bracket strip, contains ":"
	if (h.includes(":")) return PRIVATE_IPV6.some((re) => re.test(h));

	// IPv4 detection
	if (/^\d+\.\d+\.\d+\.\d+$/.test(h))
		return PRIVATE_IPV4.some((re) => re.test(h));

	// Plain hostname — not an IP literal
	return false;
}

// ── Audit log ──
export async function appendAudit(
	store,
	action,
	ip,
	detail = "",
	level = "INFO",
) {
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

export async function getAuditLog(store) {
	const raw = await store.get(KV_AUDIT_KEY);
	return raw ? JSON.parse(raw) : [];
}

export async function clearAuditLog(store) {
	await store.del(KV_AUDIT_KEY);
}

// ── Session helpers ──
export async function createSession(store) {
	const token = randomToken();
	const data = JSON.stringify({ ts: Date.now() });
	await store.set(KV_SESSION_PFX + token, data, SESSION_TTL / 1000);
	return token;
}

export async function validateSession(store, token) {
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

export async function destroySession(store, token) {
	if (token) await store.del(KV_SESSION_PFX + token);
}

// ── Brute-force guard ──
export async function checkBrute(store, ip) {
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

export async function recordBrute(store, ip) {
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

export async function clearBrute(store, ip) {
	await store.del(KV_BRUTE_PFX + ip);
}

// ── Node storage ──
export async function getNodes(store) {
	const raw = await store.get(KV_NODES_KEY);
	if (!raw) return [];
	try {
		return JSON.parse(raw);
	} catch {
		return [];
	}
}

export async function saveNodes(store, nodes) {
	await store.set(KV_NODES_KEY, JSON.stringify(nodes));
}

// ── Sub token ──
export async function getSubToken(store, envToken) {
	const raw = await store.get(KV_SUB_TOKEN_KEY);
	return raw || envToken || "";
}

export async function setSubToken(store, token) {
	await store.set(KV_SUB_TOKEN_KEY, token);
}

// ── Upload token ──
export async function getUploadToken(store, envToken) {
	const raw = await store.get(KV_UPLOAD_TOKEN_KEY);
	return raw || envToken || "";
}

export async function setUploadToken(store, token) {
	await store.set(KV_UPLOAD_TOKEN_KEY, token);
}

// ── Auth helper ──
export function getSessionToken(req) {
	const auth = req.headers.get("Authorization") || "";
	if (auth.startsWith("Bearer ")) return auth.slice(7);
	const cookie = req.headers.get("Cookie") || "";
	const m = cookie.match(/session=([^;]+)/);
	return m ? m[1] : null;
}
