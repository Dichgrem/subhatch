/**
 * Cloudflare Worker entry point
 *
 * wrangler.toml bindings required:
 *   [[kv_namespaces]]
 *   binding = "VLESS_KV"
 *   id = "<your-kv-namespace-id>"
 *
 * Environment variables (set in dashboard or wrangler.toml):
 *   ADMIN_PASSWORD  — required
 *   SUB_TOKEN       — optional, enables token-gated subscription
 *   VLESS_NODES     — optional, pipe or newline separated node URIs
 */

import { handleRequest } from "../src/core.js";

/**
 * Cloudflare KV store adapter
 * Wraps the Workers KV API into the generic store interface.
 */
function makeKVStore(kv) {
	return {
		async get(key) {
			return kv.get(key); // returns string | null
		},
		async set(key, value, ttlSeconds) {
			const opts = ttlSeconds
				? { expirationTtl: Math.ceil(ttlSeconds) }
				: undefined;
			return kv.put(key, value, opts);
		},
		async del(key) {
			return kv.delete(key);
		},
	};
}

export default {
	async fetch(request, env) {
		if (!env.VLESS_KV) {
			return new Response(
				'KV namespace "VLESS_KV" is not bound. Check your wrangler.toml.',
				{ status: 500 },
			);
		}
		if (!env.ADMIN_PASSWORD) {
			return new Response("Environment variable ADMIN_PASSWORD is not set.", {
				status: 500,
			});
		}

		const normalizedEnv = {
			ADMIN_PASSWORD: env.ADMIN_PASSWORD,
			SUB_TOKEN: env.SUB_TOKEN || "",
			UPLOAD_TOKEN: env.UPLOAD_TOKEN || "",
			VLESS_NODES: env.VLESS_NODES || "",
			store: makeKVStore(env.VLESS_KV),
		};

		return handleRequest(request, normalizedEnv);
	},
};
