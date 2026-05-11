export const HTML_PAGE = /* html */ `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sub Manager</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,600;1,400&family=Syne:wght@700;800&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --bg:#07070d;
  --s0:#0d0d17;
  --s1:#12121f;
  --border:#1c1c2e;
  --accent:#8b7fff;
  --accent2:#ff7eb3;
  --green:#4ade80;
  --red:#f87171;
  --amber:#fbbf24;
  --text:#ddd8f5;
  --muted:#4a4868;
  --mono:'JetBrains Mono',monospace;
  --sans:'Syne',sans-serif;
  --r:10px;
}

body{
  background:var(--bg);
  color:var(--text);
  font-family:var(--mono);
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
}

/* subtle grid background */
body::after{
  content:'';
  position:fixed;inset:0;
  background-image:
    linear-gradient(rgba(139,127,255,.03) 1px,transparent 1px),
    linear-gradient(90deg,rgba(139,127,255,.03) 1px,transparent 1px);
  background-size:40px 40px;
  pointer-events:none;
  z-index:0;
}

.wrap{width:100%;max-width:700px;position:relative;z-index:1}

/* update banner */
.update-banner{
  display:none;align-items:center;gap:10px;
  background:linear-gradient(135deg,rgba(139,127,255,.15),rgba(255,126,179,.1));
  border:1px solid rgba(139,127,255,.3);
  border-radius:8px;padding:10px 14px;margin-bottom:14px;
  font-size:.72rem;color:var(--accent);
}
.update-banner a{color:var(--accent2);margin-left:auto}

/* ── header ── */
header{margin-bottom:36px}
header h1{
  font-family:var(--sans);
  font-size:clamp(1.7rem,5vw,2.4rem);
  font-weight:800;
  letter-spacing:-.05em;
  background:linear-gradient(120deg,var(--accent) 0%,var(--accent2) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  line-height:1;
  margin-bottom:6px;
}
header p{font-size:.75rem;color:var(--muted);letter-spacing:.1em}

/* ── views ── */
.view{display:none}
.view.active{display:block}

/* ── card ── */
.card{
  background:var(--s1);
  border:1px solid var(--border);
  border-radius:var(--r);
  padding:24px;
  margin-bottom:14px;
}
.card-label{
  font-size:.65rem;
  letter-spacing:.2em;
  text-transform:uppercase;
  color:var(--muted);
  margin-bottom:14px;
}

/* ── form controls ── */
input,textarea{
  display:block;width:100%;
  background:var(--s0);
  border:1px solid var(--border);
  border-radius:8px;
  color:var(--text);
  font-family:var(--mono);
  font-size:.82rem;
  padding:11px 14px;
  outline:none;
  transition:border-color .15s,box-shadow .15s;
  -webkit-appearance:none;
}
input:focus,textarea:focus{
  border-color:var(--accent);
  box-shadow:0 0 0 3px rgba(139,127,255,.12);
}
textarea{
  min-height:220px;
  resize:vertical;
  line-height:1.75;
  font-size:.78rem;
}
.field-hint{font-size:.7rem;color:var(--muted);margin-top:6px;line-height:1.5}

/* ── buttons ── */
.btn{
  display:inline-flex;align-items:center;gap:7px;
  font-family:var(--mono);font-size:.78rem;font-weight:600;
  padding:10px 20px;border-radius:8px;border:none;
  cursor:pointer;user-select:none;
  transition:opacity .15s,transform .1s,box-shadow .15s;
  letter-spacing:.04em;
  position:relative;overflow:hidden;
}
.btn:active{transform:scale(.97)}
.btn-primary{
  background:linear-gradient(135deg,var(--accent),#6b5ce7);
  color:#fff;
  box-shadow:0 2px 16px rgba(139,127,255,.25);
}
.btn-primary:hover{opacity:.88;box-shadow:0 4px 24px rgba(139,127,255,.35)}
.btn-ghost{
  background:transparent;
  border:1px solid var(--border);
  color:var(--muted);
}
.btn-ghost:hover{border-color:var(--accent);color:var(--text)}
.btn-sm{padding:7px 14px;font-size:.72rem}
.btn-icon{padding:7px 10px}
.btn[disabled]{opacity:.4;pointer-events:none}

/* spinner inside button */
.btn .spin{
  width:12px;height:12px;
  border:2px solid rgba(255,255,255,.3);
  border-top-color:#fff;
  border-radius:50%;
  animation:spin .6s linear infinite;
  display:none;
}
.btn.loading .spin{display:block}
.btn.loading .label{opacity:.5}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── sub URL display ── */
.sub-url-wrap{
  display:flex;align-items:center;gap:10px;
  background:var(--s0);
  border:1px solid var(--border);
  border-radius:8px;
  padding:10px 14px;
  margin-top:12px;
}
.sub-url-wrap code{
  flex:1;font-size:.76rem;color:var(--accent);
  word-break:break-all;line-height:1.5;
}

/* ── node rows ── */
#node-list{display:flex;flex-direction:column;gap:8px;margin-top:16px}
.node-row{
  display:flex;align-items:center;gap:10px;
  background:var(--s0);
  border:1px solid var(--border);
  border-radius:8px;
  padding:9px 12px;
  cursor:pointer;
  animation:fadeUp .2s ease;
}
@keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.node-row.env-row{border-color:rgba(139,127,255,.2)}
.node-scheme{
  font-size:.65rem;padding:2px 7px;
  border-radius:4px;white-space:nowrap;
  background:rgba(139,127,255,.15);color:var(--accent);
}
.node-row.env-row .node-scheme{background:rgba(251,191,36,.12);color:var(--amber)}
.node-name{font-size:.72rem;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.node-src{font-size:.62rem;color:var(--muted)}
.del-btn{
  background:none;border:none;cursor:pointer;
  color:var(--muted);font-size:1rem;padding:2px 6px;
  border-radius:4px;transition:color .15s,background .15s;
  line-height:1;
}
.del-btn:hover{color:var(--red);background:rgba(248,113,113,.1)}

/* ── add node area ── */
.add-area{margin-top:16px;display:flex;gap:8px}
.add-area input{flex:1}

/* ── stats bar ── */
.stats{
  display:flex;gap:16px;
  font-size:.7rem;color:var(--muted);
  padding:10px 0 2px;
}
.stats strong{color:var(--text)}

/* ── badge ── */
.badge{
  display:inline-block;
  font-size:.62rem;padding:2px 8px;
  border-radius:4px;
  background:rgba(74,222,128,.12);color:var(--green);
}
.badge.warn{background:rgba(251,191,36,.12);color:var(--amber)}

/* ── divider ── */
hr{border:none;border-top:1px solid var(--border);margin:18px 0}

/* ── toast ── */
#toast{
  position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(10px);
  background:var(--s1);border:1px solid var(--border);
  border-radius:8px;padding:10px 20px;
  font-size:.78rem;white-space:nowrap;
  opacity:0;pointer-events:none;
  transition:opacity .25s,transform .25s;
  z-index:999;
}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
#toast.ok{border-color:rgba(74,222,128,.4);color:var(--green)}
#toast.err{border-color:rgba(248,113,113,.4);color:var(--red)}

/* ── error message ── */
.err-msg{
  font-size:.75rem;color:var(--red);
  margin-top:8px;min-height:1.2em;
  transition:opacity .2s;
}

/* ── top bar ── */
.topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
.topbar-right{display:flex;align-items:center;gap:10px}
.user-dot{width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block}

@media(max-width:480px){
  .add-area{flex-direction:column}
  .stats{flex-wrap:wrap;gap:10px}
}

/* ── hide sensitive ── */
.hide-sensitive .node-name{position:relative;overflow:hidden;text-indent:100%;white-space:nowrap}
.hide-sensitive .node-name::after{content:'•••••••';position:absolute;left:0;top:50%;transform:translateY(-50%);font-size:.72rem;color:var(--muted);letter-spacing:4px;text-indent:0}
.hide-sensitive #sub-url-text{position:relative}
.hide-sensitive #sub-url-text::before{content:'Hidden for screenshot';position:absolute;inset:0;display:flex;align-items:center;color:var(--muted);font-style:italic;background:var(--s0);border-radius:6px}
.hide-sensitive #momo-url-text{position:relative}
.hide-sensitive #momo-url-text::before{content:'Hidden for screenshot';position:absolute;inset:0;display:flex;align-items:center;color:var(--muted);font-style:italic;background:var(--s0);border-radius:6px}

/* ── token manager ── */
.token-list{display:flex;flex-direction:column;gap:6px;margin-top:12px}
.token-row{
  display:flex;align-items:center;gap:10px;
  background:var(--s0);border:1px solid var(--border);
  border-radius:8px;padding:10px 14px;
  justify-content:space-between;flex-wrap:wrap;
}
.token-info{display:flex;align-items:center;gap:8px;flex:1;min-width:0;overflow:hidden}
.token-name-label{font-size:.74rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.token-name-label:hover{color:var(--accent)}
.token-val{
  font-size:.68rem;color:var(--accent);background:rgba(139,127,255,.08);
  padding:2px 8px;border-radius:4px;cursor:pointer;white-space:nowrap;user-select:all;
}
.token-acts{display:flex;align-items:center;gap:4px;flex-shrink:0}

/* token node selector modal */
.token-node-check{
  display:flex;align-items:center;gap:8px;
  padding:8px 10px;margin:2px 0;
  background:var(--s0);border:1px solid var(--border);
  border-radius:6px;cursor:pointer;font-size:.72rem;
}
.token-node-check:hover{border-color:var(--accent)}
.token-node-check:has(input:checked){border-color:var(--accent);background:rgba(139,127,255,.06)}
.token-node-check input[type=checkbox]{position:absolute;opacity:0;width:0;height:0;overflow:hidden}
.token-node-check input[type=checkbox]:focus:not(:focus-visible){outline:none}
.token-node-check input[type=checkbox]:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Sub Manager <span style="font-size:.55rem;color:var(--muted);font-weight:400;letter-spacing:0" id="ver-tag"></span></h1>
    <p>VLESS · VMess · Trojan · Hysteria2 · TUIC · SS</p>
  </header>

  <!-- ── Login ── -->
  <div class="view active" id="v-login">
    <div class="card">
      <div class="card-label">Administrator Login</div>
      <input type="password" id="pwd-input" placeholder="Enter admin password" autocomplete="current-password">
      <div class="err-msg" id="login-err"></div>
      <div style="margin-top:14px;display:flex;gap:10px;align-items:center">
        <button class="btn btn-primary" id="login-btn" onclick="doLogin()">
          <span class="spin"></span><span class="label">Login</span>
        </button>
        <span style="font-size:.7rem;color:var(--muted)">Rate limited · 10 attempts / 15 min</span>
      </div>
    </div>
  </div>

  <!-- ── Main ── -->
  <div class="view" id="v-main">
    <div class="update-banner" id="update-banner">
      <span id="update-msg"></span>
      <a href="https://github.com/Dichgrem/subhatch/releases/latest" target="_blank">Download &rarr;</a>
    </div>
    <div class="topbar">
      <div class="stats" id="stats-bar">
        <span>Nodes: <strong id="stat-total">0</strong></span>
        <span>Env: <strong id="stat-env">0</strong></span>
        <span>Stored: <strong id="stat-stored">0</strong></span>
      </div>
      <div class="topbar-right">
        <span class="user-dot"></span>
        <button class="btn btn-ghost btn-sm" id="momo-btn" onclick="toggleMomo()" title="Show Momo URL">Momo</button>
        <button class="btn btn-ghost btn-sm" id="hide-btn" onclick="toggleHide()">Hide</button>
        <button class="btn btn-ghost btn-sm" onclick="doLogout()">Logout</button>
      </div>
    </div>

    <!-- Sub URL -->
    <div class="card">
      <div class="card-label">Subscription URL</div>
      <div class="sub-url-wrap">
        <code id="sub-url-text">Loading…</code>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="rotateToken()" title="Regenerate token">🎲</button>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="copySubUrl()" title="Copy">⎘</button>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="openQR()" title="QR Code">▦</button>
      </div>
      <div class="field-hint">
        Import this URL into husi / sing-box / NekoBox / Clash Meta etc.<br>
        Token is embedded in the URL — keep it private.
      </div>
      <div id="momo-section" style="display:none;margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
        <div class="card-label" style="font-size:11px;margin-bottom:6px">OpenWrt-momo</div>
        <div class="sub-url-wrap">
          <code id="momo-url-text" style="font-size:11px">Loading…</code>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="copyMomoUrl()" title="Copy Momo URL">⎘</button>
        </div>
        <div class="field-hint">Paste into momo Subscription URL — returns full config.json.</div>
      </div>
    </div>

    <!-- Token Manager -->
    <div class="card">
      <div class="card-label">Access Tokens</div>
      <div class="field-hint" style="margin-bottom:6px">
        Create multiple tokens — each with its own node set. Share different nodes with different people.
      </div>
      <div id="token-list" class="token-list"></div>
      <div style="margin-top:12px">
        <button class="btn btn-ghost btn-sm" onclick="createToken()">+ Create Token</button>
      </div>
    </div>

    <!-- Node manager -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-label" style="margin-bottom:0">Nodes</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="showBulkModal()">Bulk Import</button>
          <button class="btn btn-ghost btn-sm" onclick="exportSingBox()">Export JSON</button>
          <button class="btn btn-primary btn-sm" id="save-btn" onclick="saveNodes()">
            <span class="spin"></span><span class="label">Save</span>
          </button>
        </div>
      </div>

      <!-- Add single node -->
      <div class="add-area" style="margin-top:16px">
        <input type="text" id="add-input" placeholder="vless://  vmess://  trojan://  hy2://  ..." 
               onkeydown="if(event.key==='Enter')addNode()">
        <button class="btn btn-ghost" onclick="addNode()">+ Add</button>
      </div>
      <div class="err-msg" id="add-err"></div>

      <!-- Node list -->
      <div id="node-list"></div>
      <div id="empty-hint" style="text-align:center;color:var(--muted);font-size:.78rem;padding:28px 0;display:none">
        No nodes yet. Add one above or use Bulk Import.
      </div>
    </div>
  </div>

  <!-- ── Bulk import modal ── -->
  <div id="modal-bg" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100;align-items:center;justify-content:center;padding:20px">
    <div class="card" style="width:100%;max-width:640px;margin:0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div class="card-label" style="margin:0">Bulk Import</div>
        <button class="btn btn-ghost btn-sm" onclick="hideBulkModal()">✕ Close</button>
      </div>
      <textarea id="bulk-input" placeholder="Paste nodes here, one per line&#10;vless://...&#10;vmess://...&#10;trojan://...&#10;&#10;Or paste base64-encoded subscription content"></textarea>
      <div class="field-hint">Supports: vless:// vmess:// trojan:// ss:// hysteria2:// hy2:// tuic:// — one per line, or base64-encoded</div>
      <div style="margin-top:14px;display:flex;gap:10px">
        <button class="btn btn-primary" onclick="doBulkImport()">Import</button>
        <button class="btn btn-ghost" onclick="hideBulkModal()">Cancel</button>
      </div>
    </div>
  </div>

  <!-- ── QR modal ── -->
  <div id="qr-bg" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:100;align-items:center;justify-content:center">
    <div class="card" style="text-align:center;margin:0">
      <div class="card-label">Scan to Import</div>
      <div id="qr-container" style="background:#fff;border-radius:8px;padding:12px;display:inline-block;margin-bottom:12px"></div>
      <br>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('qr-bg').style.display='none'">Close</button>
    </div>
  </div>

  <!-- ── Token node selector modal ── -->
  <div id="token-modal-bg" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:101;align-items:center;justify-content:center;padding:20px">
    <div class="card" style="width:100%;max-width:640px;margin:0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div class="card-label" style="margin:0">Assign Nodes</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="selectAllTokenNodes()">All</button>
          <button class="btn btn-ghost btn-sm" onclick="deselectAllTokenNodes()">None</button>
          <button class="btn btn-ghost btn-sm" onclick="closeTokenModal()">✕ Close</button>
        </div>
      </div>
      <div id="token-node-selector" style="max-height:50vh;overflow-y:auto"></div>
      <div style="margin-top:14px;display:flex;gap:10px">
        <button class="btn btn-primary" onclick="saveTokenNodes()">Save</button>
        <button class="btn btn-ghost" onclick="closeTokenModal()">Cancel</button>
      </div>
    </div>
  </div>
</div>

<div id="toast"></div>

<script>
// ── State ──
const VERSION = "2.0.0";
let SESSION = localStorage.getItem('sub_session') || null;
let storedNodes = [];   // nodes from KV (editable)
let envNodes    = [];   // nodes from env vars (read-only)
let subUrl      = '';
let tokens      = {};
let editingToken = null;

const SCHEMES = ['vless://','vmess://','trojan://','ss://','ssr://','hysteria2://','hy2://','tuic://','anytls://','naive://'];

// ── Boot ──
;(async () => {
  if (SESSION) {
    const ok = await verifySession();
    if (ok) { showMain(); await loadAll(); return; }
    SESSION = null; localStorage.removeItem('sub_session');
  }
  show('v-login');
  document.getElementById('pwd-input').focus();
})();

// ── Views ──
function show(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── API ──
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (SESSION) opts.headers['Authorization'] = 'Bearer ' + SESSION;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(path, opts);
  const data = await r.json();
  return { ok: r.ok, status: r.status, data };
}

async function verifySession() {
  try {
    const { ok } = await api('GET', '/api/nodes');
    return ok;
  } catch { return false; }
}

// ── Login ──
async function doLogin() {
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-err');
  const pwd = document.getElementById('pwd-input').value;
  err.textContent = '';
  if (!pwd) { err.textContent = 'Enter password'; return; }

  btn.classList.add('loading'); btn.disabled = true;
  try {
    const { ok, data } = await api('POST', '/api/login', { password: pwd });
    if (!ok) { err.textContent = data.error || 'Login failed'; return; }
    SESSION = data.token;
    localStorage.setItem('sub_session', SESSION);
    document.getElementById('pwd-input').value = '';
    showMain();
    await loadAll();
  } catch(e) {
    err.textContent = 'Network error';
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

document.getElementById('pwd-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

// ── Logout ──
async function doLogout() {
  await api('POST', '/api/logout');
  SESSION = null; localStorage.removeItem('sub_session');
  storedNodes = []; envNodes = []; subUrl = '';
  renderNodes();
  show('v-login');
  document.getElementById('pwd-input').focus();
}

// ── Load data ──
async function loadAll() {
  await Promise.all([loadNodes(), loadSubUrl(), loadTokens()]);
}

async function loadNodes() {
  const { ok, data } = await api('GET', '/api/nodes');
  if (!ok) { toast('Failed to load nodes', 'err'); return; }
  envNodes    = data.envNodes    || [];
  storedNodes = data.storedNodes || [];
  renderNodes();
}

async function loadSubUrl() {
  const { ok, data } = await api('GET', '/api/sub-url');
  if (!ok) return;
  subUrl = data.url;
  document.getElementById('sub-url-text').textContent = subUrl;
  setMomoUrl();
}

async function loadTokens() {
  const { ok, data } = await api('GET', '/api/sub-tokens');
  if (!ok) return;
  tokens = data.tokens || {};
  renderTokens();
}

function showMain() { show('v-main'); checkUpdate(); }

// ── Render nodes ──
function renderNodes() {
  const list = document.getElementById('node-list');
  const empty = document.getElementById('empty-hint');
  list.innerHTML = '';

  const all = [...envNodes.map(n => ({n, env:true})), ...storedNodes.map(n => ({n, env:false}))];

  if (all.length === 0) { empty.style.display = 'block'; } 
  else { empty.style.display = 'none'; }

  all.sort((a, b) => {
    const sa = SCHEMES.find(s => a.n.startsWith(s)) || "";
    const sb = SCHEMES.find(s => b.n.startsWith(s)) || "";
    return sa.localeCompare(sb) || a.n.localeCompare(b.n);
  });

  all.forEach(({n, env}, idx) => {
    const row = document.createElement('div');
    row.className = 'node-row' + (env ? ' env-row' : '');

    const scheme = SCHEMES.find(s => n.startsWith(s)) || '';
    const schemeLabel = scheme.replace('://', '');

    let name = n;
    try {
      // Extract fragment/# as name
      const hash = n.lastIndexOf('#');
      if (hash !== -1) name = decodeURIComponent(n.slice(hash + 1));
      else {
        const u = new URL(n);
        name = u.hostname + ':' + u.port;
      }
    } catch {}

    row.innerHTML = \`
      <span class="node-scheme">\${schemeLabel}</span>
      <span class="node-name" title="\${escHtml(n)}">\${escHtml(name)}</span>
      <span class="node-src">\${env ? '⚙ env' : '✎ stored'}</span>
      \${env ? '' : \`<button class="del-btn" onclick="delNode(\${storedNodes.indexOf(n)})" title="Remove">✕</button>\`}
    \`;
    list.appendChild(row);
    row.addEventListener("click", (e) => {
      if (e.target.closest(".del-btn")) return;
      navigator.clipboard.writeText(n);
      toast("Copied to clipboard", "ok");
    });
  });

  // Stats
  document.getElementById('stat-total').textContent = all.length;
  document.getElementById('stat-env').textContent = envNodes.length;
  document.getElementById('stat-stored').textContent = storedNodes.length;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Render tokens ──
function renderTokens() {
  const list = document.getElementById('token-list');
  const entries = Object.entries(tokens);
  if (entries.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.75rem;padding:12px 0">No access tokens yet.</div>';
    return;
  }
  list.innerHTML = entries.map(([token, config]) => {
    const name = config.name || 'Unnamed';
    const nodes = config.nodes || [];
    const tokenUrl = subUrl ? \`\${new URL(subUrl).origin}/sub?token=\${encodeURIComponent(token)}\` : '';
    return \`
      <div class="token-row">
        <div class="token-info">
          <span class="token-name-label" onclick="editTokenName('\${token}')" title="Click to rename">\${escHtml(name)}</span>
          <code class="token-val" onclick="copyText('\${token}');toast('Token copied','ok')" title="Click to copy">\${token.substring(0,16)}…</code>
          <span class="badge">\${nodes.length} nodes</span>
        </div>
        <div class="token-acts">
          <button class="btn btn-ghost btn-sm btn-icon" onclick="copyText('\${tokenUrl}');toast('URL copied','ok')" title="Copy URL">⎘</button>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="showTokenQR('\${token}')" title="QR Code">▦</button>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="rotateScopedToken('\${token}')" title="Rotate">🎲</button>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="editTokenNodes('\${token}')" title="Edit Nodes">✎</button>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteToken('\${token}')" title="Delete">✕</button>
        </div>
      </div>
    \`;
  }).join('');
}

// ── Add node ──
function addNode() {
  const input = document.getElementById('add-input');
  const err = document.getElementById('add-err');
  const val = input.value.trim();
  err.textContent = '';

  if (!val) { err.textContent = 'Enter a node URI'; return; }
  if (!SCHEMES.some(s => val.startsWith(s))) {
    err.textContent = 'Unrecognized scheme. Must start with vless://, vmess://, trojan://, etc.';
    return;
  }
  if (storedNodes.includes(val) || envNodes.includes(val)) {
    err.textContent = 'Duplicate node'; return;
  }
  storedNodes.push(val);
  input.value = '';
  renderNodes();
}

// ── Delete node ──
function delNode(idx) {
  storedNodes.splice(idx, 1);
  renderNodes();
}

// ── Save nodes ──
async function saveNodes() {
  const btn = document.getElementById('save-btn');
  btn.classList.add('loading'); btn.disabled = true;
  try {
    const { ok, data } = await api('PUT', '/api/nodes', { nodes: storedNodes });
    if (!ok) { toast(data.error || 'Save failed', 'err'); return; }
    toast(\`Saved \${data.saved} node(s)\`, 'ok');
  } catch { toast('Network error', 'err'); }
  finally { btn.classList.remove('loading'); btn.disabled = false; }
}

// ── Bulk import ──
function showBulkModal() {
  document.getElementById('modal-bg').style.display = 'flex';
  document.getElementById('bulk-input').focus();
}
function hideBulkModal() {
  document.getElementById('modal-bg').style.display = 'none';
  document.getElementById('bulk-input').value = '';
}

function doBulkImport() {
  let raw = document.getElementById('bulk-input').value.trim();
  if (!raw) return;

  // Try base64 decode
  try {
    const decoded = atob(raw.replace(/\\s/g,''));
    if (SCHEMES.some(s => decoded.includes(s))) raw = decoded;
  } catch {}

  const lines = raw.split(/[\\n\\r|]/).map(l => l.trim()).filter(Boolean);
  const valid = lines.filter(l => SCHEMES.some(s => l.startsWith(s)));
  const dupes = valid.filter(n => storedNodes.includes(n) || envNodes.includes(n));
  const fresh = valid.filter(n => !storedNodes.includes(n) && !envNodes.includes(n));

  fresh.forEach(n => storedNodes.push(n));
  renderNodes();
  hideBulkModal();
  toast(\`Imported \${fresh.length} node(s)\${dupes.length ? \`, skipped \${dupes.length} dupes\` : ''}\`, 'ok');
}

// ── Copy sub URL ──
async function copySubUrl() {
  if (!subUrl) return;
  try {
    await navigator.clipboard.writeText(subUrl);
    toast('Copied!', 'ok');
  } catch {
    prompt('Copy this URL:', subUrl);
  }
}

// ── Token CRUD ──
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch { prompt('Copy:', text); }
}

async function createToken() {
  const name = prompt('Token name (optional):', '');
  if (name === null) return;
  const { ok, data } = await api('POST', '/api/sub-tokens', { name: name || '' });
  if (!ok) { toast('Failed to create token', 'err'); return; }
  tokens[data.token] = { name: data.name, nodes: data.nodes };
  renderTokens();
  editTokenNodes(data.token);
  toast('Token created', 'ok');
}

async function deleteToken(token) {
  if (!confirm(\`Delete token "\${token.substring(0,8)}…"?\`)) return;
  const { ok } = await api('DELETE', \`/api/sub-tokens?token=\${encodeURIComponent(token)}\`);
  if (!ok) { toast('Failed to delete token', 'err'); return; }
  delete tokens[token];
  renderTokens();
  toast('Token deleted', 'ok');
}

async function rotateScopedToken(oldToken) {
  if (!confirm(\`Rotate token "\${oldToken.substring(0, 8)}…"?\`)) return;
  const { ok, data } = await api('POST', '/api/sub-tokens/rotate', { token: oldToken });
  if (!ok) { toast('Failed to rotate token', 'err'); return; }
  delete tokens[oldToken];
  tokens[data.token] = { name: data.name, nodes: data.nodes };
  renderTokens();
  toast('Token rotated', 'ok');
}

async function editTokenName(token) {
  const current = tokens[token]?.name || '';
  const name = prompt('Token name:', current);
  if (name === null) return;
  const { ok } = await api('PUT', '/api/sub-tokens', { token, name });
  if (!ok) { toast('Failed to update name', 'err'); return; }
  tokens[token].name = name;
  renderTokens();
  toast('Name updated', 'ok');
}

function editTokenNodes(token) {
  editingToken = token;
  const assigned = tokens[token]?.nodes || [];
  const container = document.getElementById('token-node-selector');
  const all = [...envNodes, ...storedNodes];

  container.innerHTML = '';
  if (all.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:24px">No nodes available. Add nodes first.</div>';
  } else {
    all.forEach((n) => {
      const scheme = SCHEMES.find(s => n.startsWith(s)) || '';
      const schemeLabel = scheme.replace('://', '');
      let label = n;
      try {
        const hash = n.lastIndexOf('#');
        if (hash !== -1) label = decodeURIComponent(n.slice(hash + 1));
        else { const u = new URL(n); label = u.hostname + ':' + u.port; }
      } catch {}

      const labelEl = document.createElement('label');
      labelEl.className = 'token-node-check';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('value', n);
      input.checked = assigned.includes(n);

      const schemeSpan = document.createElement('span');
      schemeSpan.className = 'node-scheme';
      schemeSpan.textContent = schemeLabel;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'node-name';
      nameSpan.textContent = label;

      labelEl.appendChild(input);
      labelEl.appendChild(schemeSpan);
      labelEl.appendChild(nameSpan);
      container.appendChild(labelEl);
    });
  }
  document.getElementById('token-modal-bg').style.display = 'flex';
}

function selectAllTokenNodes() {
  document.querySelectorAll('#token-node-selector input[type=checkbox]').forEach(cb => { cb.checked = true; });
}
function deselectAllTokenNodes() {
  document.querySelectorAll('#token-node-selector input[type=checkbox]').forEach(cb => { cb.checked = false; });
}
function closeTokenModal() {
  document.getElementById('token-modal-bg').style.display = 'none';
  editingToken = null;
}

async function saveTokenNodes() {
  const checked = [...document.querySelectorAll('#token-node-selector input[type=checkbox]:checked')]
    .map(cb => cb.value);
  const { ok } = await api('PUT', '/api/sub-tokens', { token: editingToken, nodes: checked });
  if (!ok) { toast('Failed to save', 'err'); return; }
  tokens[editingToken].nodes = checked;
  renderTokens();
  closeTokenModal();
  toast('Token updated', 'ok');
}

// ── Rotate sub token ──
async function rotateToken() {
  const { ok, data } = await api("PUT", "/api/sub-token");
  if (!ok) { toast("Failed to rotate token", "err"); return; }
  const base = new URL(subUrl).origin;
  subUrl = \`\${base}/sub?token=\${encodeURIComponent(data.token)}\`;
  document.getElementById("sub-url-text").textContent = subUrl;
  setMomoUrl();
  toast("Token rotated", "ok");
}

// ── Export Sing-box JSON ──
async function exportSingBox() {
  const { ok, data } = await api("GET", "/api/export/sing-box");
  if (!ok) { toast("Export failed", "err"); return; }

  const blob = new Blob([JSON.stringify({ outbounds: data.outbounds }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sing-box-outbounds.json";
  a.click();
  URL.revokeObjectURL(a.href);

  const msg = \`Exported \${data.count} outbound(s)\`;
  if (data.errors && data.errors.length) toast(msg + \` · \${data.errors.length} parse error(s)\`, "err");
  else toast(msg, "ok");
}

// ── Momo URL ──
async function copyMomoUrl() {
  if (!subUrl) return;
  const momoUrl = subUrl.replace("/sub?", "/api/export/momo?");
  try {
    await navigator.clipboard.writeText(momoUrl);
    toast("Momo URL copied", "ok");
  } catch {
    prompt("Copy this URL:", momoUrl);
  }
}

function setMomoUrl() {
  if (!subUrl) { document.getElementById("momo-url-text").textContent = "—"; return; }
  document.getElementById("momo-url-text").textContent = subUrl.replace("/sub?", "/api/export/momo?");
}

// ── QR Code ──
async function loadQrLib() {
  if (window.QRCode) return;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.integrity = 'sha384-3zSEDfvllQohrq0PHL1fOXJuC/jSOO34H46t6UQfobFOmxE5BpjjaIJY5F2/bMnU';
    s.crossOrigin = 'anonymous';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

async function showQR(url) {
  if (!url) return;
  await loadQrLib();
  const container = document.getElementById('qr-container');
  container.innerHTML = '';
  new QRCode(container, {
    text: url,
    width: 200, height: 200,
    colorDark: '#1a1a2e', colorLight: '#ffffff',
  });
  document.getElementById('qr-bg').style.display = 'flex';
}

async function openQR() {
  await showQR(subUrl);
}

async function showTokenQR(token) {
  const origin = new URL(subUrl).origin;
  await showQR(\`\${origin}/sub?token=\${encodeURIComponent(token)}\`);
}

// ── Hide sensitive ──
function toggleHide() {
  const btn = document.getElementById('hide-btn');
  document.body.classList.toggle('hide-sensitive');
  btn.textContent = document.body.classList.contains('hide-sensitive') ? 'Show' : 'Hide';
}

function toggleMomo() {
  const el = document.getElementById('momo-section');
  const btn = document.getElementById('momo-btn');
  const show = el.style.display === 'none';
  el.style.display = show ? '' : 'none';
  btn.textContent = show ? 'Momo ✓' : 'Momo';
}

// ── Version check ──
document.getElementById('ver-tag').textContent = 'v' + VERSION;

async function checkUpdate() {
  try {
    const r = await fetch('https://api.github.com/repos/Dichgrem/subhatch/releases/latest');
    if (!r.ok) return;
    const release = await r.json();
    const latest = (release.tag_name || '').replace(/^v/, '');
    if (!latest) return;
    const parts = VERSION.split('.');
    const latestParts = latest.split('.');
    for (let i = 0; i < 3; i++) {
      const a = parseInt(parts[i]) || 0;
      const b = parseInt(latestParts[i]) || 0;
      if (b > a) {
        document.getElementById('update-msg').textContent = \`New version available: v\${latest}\`;
        document.getElementById('update-banner').style.display = 'flex';
        return;
      }
      if (a > b) return;
    }
  } catch {}
}

// ── Toast ──
let toastTimer;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = '', 2800);
}

// ── Close modals on bg click ──
document.getElementById('modal-bg').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-bg')) hideBulkModal();
});
document.getElementById('qr-bg').addEventListener('click', e => {
  if (e.target === document.getElementById('qr-bg')) document.getElementById('qr-bg').style.display='none';
});
document.getElementById('token-modal-bg').addEventListener('click', e => {
  if (e.target === document.getElementById('token-modal-bg')) closeTokenModal();
});
</script>
</body>
</html>`;
