/**
 * subhatch — Upstream subscription management
 */

import {
	appendAudit,
	clientIP,
	getSessionToken,
	isPrivateHost,
	jsonResp,
	KV_UPSTREAM_KEY,
	KV_UPSTREAM_PFX,
	sha256,
	VALID_SCHEMES,
	validateSession,
} from "./shared.js";

// ── Upstream storage ──
export async function getUpstreamUrls(store) {
	const raw = await store.get(KV_UPSTREAM_KEY);
	return raw ? JSON.parse(raw) : [];
}

export async function saveUpstreamUrls(store, entries) {
	await store.set(KV_UPSTREAM_KEY, JSON.stringify(entries));
}

async function getUpstreamNodes(store, hash) {
	const raw = await store.get(KV_UPSTREAM_PFX + hash);
	return raw ? JSON.parse(raw) : [];
}

async function saveUpstreamNodes(store, hash, nodes) {
	await store.set(KV_UPSTREAM_PFX + hash, JSON.stringify(nodes));
}

export async function loadAllUpstreamNodes(store) {
	const urls = await getUpstreamUrls(store);
	const all = [];
	for (const u of urls) {
		if (!u.hash) continue;
		const nodes = await getUpstreamNodes(store, u.hash);
		all.push(...nodes);
	}
	return all;
}

// ── Sync ──
export async function syncOneUpstream(u, store) {
	try {
		const syncUrl = new URL(u.url);
		if (syncUrl.protocol !== "https:" && syncUrl.protocol !== "http:") {
			throw new Error("disallowed scheme");
		}
		if (isPrivateHost(syncUrl.hostname))
			throw new Error("private host not allowed");
		const r = await fetch(u.url, { signal: AbortSignal.timeout(10_000) });
		if (!r.ok) throw new Error(`HTTP ${r.status}`);
		let raw = await r.text();
		raw = raw.trim();
		if (!raw) throw new Error("empty response");

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
		u.lastError =
			e.name === "TimeoutError" || e.name === "AbortError"
				? "timeout after 10s"
				: e.message;
		return { ok: false, error: u.lastError };
	}
}

// ── Handlers ──
export async function handleGetUpstream(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token)))
		return jsonResp({ error: "Unauthorized" }, 401);
	const urls = await getUpstreamUrls(env.store);
	return jsonResp({ urls });
}

export async function handleAddUpstream(req, env) {
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

export async function handleDeleteUpstream(req, env) {
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

export async function handleSyncUpstream(req, env) {
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
