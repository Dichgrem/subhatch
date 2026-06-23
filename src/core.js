/**
 * subhatch — Core Logic
 * Platform-agnostic. All handlers receive a normalized Env object.
 * Handlers for upstream and tokens live in upstream.js and tokens.js.
 */

import { exportSingBox } from "./export.js";
import { buildKernelConfig } from "./kernel.js";
import { buildMomoConfig } from "./momo.js";
import {
	appendAudit,
	checkBrute,
	clearAuditLog,
	clearBrute,
	clientIP,
	createSession,
	destroySession,
	getAuditLog,
	getNodes,
	getPasswordConfig,
	getSessionToken,
	getSubToken,
	getUploadToken,
	isValidNode,
	jsonResp,
	normalizePreset,
	PBKDF2_ITER,
	parseEnvNodes,
	pbkdf2Hash,
	pbkdf2Verify,
	randomToken,
	recordBrute,
	saveNodes,
	setPasswordConfig,
	setUploadToken,
	sha256,
	timingSafeEqual,
	validateSession,
} from "./shared.js";
import {
	getTokens,
	handleCreateToken,
	handleDeleteToken,
	handleGetTokens,
	handleRotateToken,
	handleSub,
	handleSubToken,
	handleSubUrl,
	handleUpdateToken,
} from "./tokens.js";
import { HTML_PAGE } from "./ui.html.js";
import {
	getUpstreamUrls,
	handleAddUpstream,
	handleDeleteUpstream,
	handleGetUpstream,
	handleSyncUpstream,
	loadAllUpstreamNodes,
	saveUpstreamUrls,
	syncOneUpstream,
} from "./upstream.js";

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

	// ── PBKDF2 path (preferred) ──
	const pwCfg = await getPasswordConfig(env.store);
	if (pwCfg && pwCfg.algo === "pbkdf2") {
		if (await pbkdf2Verify(password, pwCfg)) {
			await clearBrute(env.store, ip);
			await appendAudit(env.store, "login", ip);
			const token = await createSession(env.store);
			return jsonResp({ token });
		}
		// PBKDF2 failed — fall through to SHA-256 in case ADMIN_PASSWORD was changed
	}

	// ── SHA-256 path (legacy / fallback) ──
	const ADMIN_HASH = /^[0-9a-f]{64}$/i.test(env.ADMIN_PASSWORD)
		? env.ADMIN_PASSWORD
		: await sha256(env.ADMIN_PASSWORD);
	const inputHash = await sha256(password);

	if (!timingSafeEqual(inputHash, ADMIN_HASH)) {
		await recordBrute(env.store, ip);
		await appendAudit(env.store, "login-failed", ip, "", "WARN");
		return jsonResp({ error: "Incorrect password" }, 401);
	}

	// ── Auto-upgrade to PBKDF2 on successful legacy login ──
	const salt = randomToken(16);
	const upgradedHash = await pbkdf2Hash(password, salt, PBKDF2_ITER);
	await setPasswordConfig(env.store, {
		algo: "pbkdf2",
		hash: upgradedHash,
		salt,
		iter: PBKDF2_ITER,
	});

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

	await saveNodes(env.store, nodes);
	await appendAudit(
		env.store,
		"save-nodes",
		clientIP(req),
		`${nodes.length} nodes`,
	);
	return jsonResp({ ok: true, saved: nodes.length });
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
	if (incoming.length === 0) return jsonResp({ error: "No valid nodes" }, 400);

	const stored = await getNodes(env.store);
	const existing = new Set(stored);
	const dupes = [];
	const fresh = [];

	for (let n of incoming) {
		n = n.trim();
		if (existing.has(n)) {
			dupes.push(n);
			continue;
		}
		const hashIdx = n.lastIndexOf("#");
		if (hashIdx !== -1) {
			let name = n.slice(hashIdx + 1);
			try {
				name = decodeURIComponent(name);
			} catch {
				const e = name;
				name = e;
			}
			const prefix = n.slice(0, hashIdx + 1);
			let i = 2;
			while (existing.has(n)) {
				n = `${prefix}${i}-${name}`;
				i++;
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

/** GET /api/export/kernel — export complete config.json for sing-box HPC client */
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
		"tunName",
		"fakeip",
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

// ── Main router ──
export async function handleRequest(req, env) {
	const url = new URL(req.url);
	const method = req.method.toUpperCase();
	const path = url.pathname.replace(/\/$/, "") || "/";

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

	if (method === "GET") return serveUI();

	return jsonResp({ error: "Not found" }, 404);
}

// ── Audit log handlers ──
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

// ── UI ──
function serveUI() {
	return new Response(HTML_PAGE, {
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}
