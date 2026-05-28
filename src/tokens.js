/**
 * subhatch — Token management (subscription, scoped tokens)
 */

import {
	appendAudit,
	checkBrute,
	clientIP,
	getNodes,
	getSessionToken,
	getSubToken,
	isValidNode,
	jsonResp,
	KV_TOKENS_KEY,
	parseEnvNodes,
	randomToken,
	recordBrute,
	setSubToken,
	textResp,
	toBase64,
	validateSession,
} from "./shared.js";

// ── Scoped token storage ──
export async function getTokens(store) {
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

// ── Handlers ──
export async function handleSubToken(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	const newToken = randomToken(16);
	await setSubToken(env.store, newToken);
	await appendAudit(env.store, "token-rotate", clientIP(req), "primary");
	return jsonResp({ token: newToken });
}

export async function handleSub(req, env) {
	const url = new URL(req.url);
	const t = url.searchParams.get("token") || "";
	const primary = await getSubToken(env.store, env.SUB_TOKEN);
	const scoped = await getTokens(env.store);

	let allowed;
	let who = "";

	if (primary) {
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

export async function handleSubUrl(req, env) {
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

export async function handleGetTokens(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	const primary = await getSubToken(env.store, env.SUB_TOKEN);
	const tokens = await getTokens(env.store);
	return jsonResp({ primary, tokens });
}

export async function handleCreateToken(req, env) {
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

export async function handleUpdateToken(req, env) {
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

export async function handleRotateToken(req, env) {
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

export async function handleDeleteToken(req, env) {
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
