/**
 * subhatch test helpers — zero deps (node:test + node:child_process)
 *
 * Usage:
 *   import { startServer, api, cleanup } from "../lib/helpers.js";
 *   const { baseUrl } = await startServer();
 *   const { status, data } = await api("/api/login", { method:"POST", body:{password:"admin"} });
 *   cleanup();
 */

import { spawn } from "node:child_process";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

// ── Server lifecycle ──

let _server = null;
let _dataFile = null;

export async function startServer(opts = {}) {
	const {
		adminPass = "admin",
		subToken = "test",
		uploadToken = "upload123",
		port = 0, // 0 = random
	} = opts;

	_dataFile = join(tmpdir(), `subhatch-test-${randomBytes(4).toString("hex")}.json`);

	return new Promise((resolve, reject) => {
		const env = {
			...process.env,
			ADMIN_PASSWORD: adminPass,
			SUB_TOKEN: subToken,
			UPLOAD_TOKEN: uploadToken,
			PORT: String(port),
			DATA_FILE: _dataFile,
		};

		const child = spawn("node", ["api/node.js"], {
			env,
			stdio: ["ignore", "pipe", "pipe"],
		});

		let settled = false;
		const timeout = setTimeout(() => {
			if (!settled) {
				settled = true;
				child.kill();
				reject(new Error("Server start timeout"));
			}
		}, 10000);

		let output = "";
		child.stdout.on("data", (d) => { output += d.toString(); });
		child.stderr.on("data", (d) => { output += d.toString(); });

		const check = () => {
			const m = output.match(/Listening on http:\/\/0\.0\.0\.0:(\d+)/);
			if (m) {
				clearTimeout(timeout);
				settled = true;
				const actualPort = Number(m[1]);
				_server = child;
				resolve({
					baseUrl: `http://127.0.0.1:${actualPort}`,
					port: actualPort,
				});
			} else {
				setTimeout(check, 50);
			}
		};
		setTimeout(check, 200);

		child.on("error", (err) => {
			if (!settled) { settled = true; clearTimeout(timeout); reject(err); }
		});
		child.on("exit", (code) => {
			if (!settled) {
				settled = true;
				clearTimeout(timeout);
				reject(new Error(`Server exited with code ${code} before ready`));
			}
		});
	});
}

export async function cleanup() {
	if (_server) {
		_server.kill("SIGTERM");
		_server = null;
		// Wait a tick for port release
		await new Promise((r) => setTimeout(r, 200));
	}
	if (_dataFile) {
		try { await unlink(_dataFile); } catch {}
		_dataFile = null;
	}
}

// ── API helper ──

let _session = null;

export function setSession(token) {
	_session = token;
}

export async function api(path, opts = {}) {
	const { method = "GET", token, body, baseUrl } = opts;
	const url = `${baseUrl}${path}`;
	const headers = { "Content-Type": "application/json" };
	const authToken = token ?? _session;
	if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

	const fetchOpts = { method, headers };
	if (body !== undefined) fetchOpts.body = JSON.stringify(body);

	const r = await fetch(url, fetchOpts);
	let data;
	const ct = r.headers.get("content-type") || "";
	if (ct.includes("application/json")) {
		try { data = await r.json(); } catch { data = await r.text(); }
	} else {
		data = await r.text();
	}
	return { status: r.status, data };
}
