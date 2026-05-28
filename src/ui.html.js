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

html.light {
  --bg:#f4f4f8;
  --s0:#ffffff;
  --s1:#fafafa;
  --border:#dcdce4;
  --text:#2d3436;
  --muted:#747c84;
}
html.light body::after{
  background-image:
    linear-gradient(rgba(0,0,0,.04) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,0,0,.04) 1px,transparent 1px);
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
    linear-gradient(rgba(139,127,255,.06) 1px,transparent 1px),
    linear-gradient(90deg,rgba(139,127,255,.06) 1px,transparent 1px);
  background-size:30px 30px;
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
.btn-toggled,.btn-toggled:hover{border-color:var(--accent);color:var(--accent)}
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

/* ── save status ── */
.save-status{font-size:.65rem;opacity:0;transition:opacity .2s}
.save-status.saving{opacity:1;color:var(--amber)}
.save-status.ok{opacity:1;color:var(--green)}
.save-status.err{opacity:1;color:var(--red)}

/* ── audit level colors ── */
.audit-ERROR{color:var(--red)}
.audit-WARN{color:var(--amber)}
.audit-INFO{color:var(--muted)}
.audit-group{margin-left:auto}

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
  padding:0;
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
.topbar{display:flex;align-items:center;margin-bottom:24px}
.topbar-right{display:flex;align-items:center;gap:8px}
.user-dot{width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block}

@media(max-width:480px){
  .add-area{flex-direction:column}
  .stats{flex-wrap:wrap;gap:10px}
  .topbar-right{flex-wrap:wrap;gap:4px}
  .topbar-right .btn-sm{padding:5px 10px;font-size:.66rem}
  .audit-lv{display:none!important}
  .audit-ts{min-width:78px!important;font-size:.6rem!important}
  .audit-act{min-width:58px!important;font-size:.65rem!important}
  .audit-detail{max-width:120px!important;flex-shrink:1!important}
  .audit-ip{min-width:96px!important;font-size:.6rem!important}
  .audit-group{margin-left:0!important;gap:6px!important}
  .audit-row{gap:6px!important}
}

/* ── hide sensitive ── */
.hide-sensitive .node-name{position:relative;overflow:hidden;text-indent:100%;white-space:nowrap}
.hide-sensitive .node-name::after{content:'•••••••';position:absolute;left:0;top:50%;transform:translateY(-50%);font-size:.72rem;color:var(--muted);letter-spacing:4px;text-indent:0}
.hide-sensitive #sub-url-text{position:relative}
.hide-sensitive #sub-url-text::before{content:'Hidden for screenshot';position:absolute;inset:0;display:flex;align-items:center;color:var(--muted);font-style:italic;background:var(--s0);border-radius:6px}
.hide-sensitive #momo-url-text{position:relative}
.hide-sensitive #momo-url-text::before{content:'Hidden for screenshot';position:absolute;inset:0;display:flex;align-items:center;color:var(--muted);font-style:italic;background:var(--s0);border-radius:6px}
.hide-sensitive #kernel-url-text{position:relative}
.hide-sensitive #kernel-url-text::before{content:'Hidden for screenshot';position:absolute;inset:0;display:flex;align-items:center;color:var(--muted);font-style:italic;background:var(--s0);border-radius:6px}
.hide-sensitive #upload-ep-text{position:relative}
.hide-sensitive #upload-ep-text::before{content:'Hidden for screenshot';position:absolute;inset:0;display:flex;align-items:center;color:var(--muted);font-style:italic;background:var(--s0);border-radius:6px}
.hide-sensitive #upload-token-text{position:relative}
.hide-sensitive #upload-token-text::before{content:'Hidden for screenshot';position:absolute;inset:0;display:flex;align-items:center;color:var(--muted);font-style:italic;background:var(--s0);border-radius:6px}
.hide-sensitive #upstream-list{position:relative}
.hide-sensitive #upstream-list::before{content:'Hidden for screenshot';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted);font-style:italic;background:var(--s0);border-radius:6px;z-index:1}
.hide-sensitive #audit-list{position:relative}
.hide-sensitive #audit-list::before{content:'Hidden for screenshot';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted);font-style:italic;background:var(--s0);border-radius:6px;z-index:1}

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
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h1 style="margin-bottom:2px">Sub Manager <span style="font-size:.55rem;color:var(--muted);font-weight:400;letter-spacing:0" id="ver-tag"></span></h1>
      <button class="btn btn-ghost btn-sm" onclick="doLogout()">Logout</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr auto;align-items:baseline">
      <p style="margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0">VLESS · VMess · Trojan · Hysteria2 · TUIC · SS</p>
      <div style="display:flex;align-items:center;gap:12px;font-size:.75rem">
        <span class="user-dot"></span>
        <div class="stats" id="stats-bar">
          <span>Nodes: <strong id="stat-total">0</strong></span>
          <span>Env: <strong id="stat-env">0</strong></span>
          <span>Stored: <strong id="stat-stored">0</strong></span>
        </div>
      </div>
    </div>
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
      <div class="topbar-right">
        <button class="btn btn-ghost btn-sm btn-toggled" id="sub-card-btn" onclick="toggleCard('sub-card',this)">Sub</button>
        <button class="btn btn-ghost btn-sm" id="upload-btn" onclick="toggleUpload()" title="Show Node Upload">Upload</button>
        <button class="btn btn-ghost btn-sm" id="momo-btn" onclick="toggleMomo()" title="Show Momo URL">Momo</button>
        <button class="btn btn-ghost btn-sm" id="kernel-btn" onclick="toggleKernel()" title="Show Kernel URL">Kernel</button>
        <button class="btn btn-ghost btn-sm" id="upstream-btn" onclick="toggleUpstream()" title="Show Upstream Sources">Upstream</button>
        <button class="btn btn-ghost btn-sm btn-toggled" id="node-card-btn" onclick="toggleCard('node-card',this)">Nodes</button>
        <button class="btn btn-ghost btn-sm" id="log-btn" onclick="toggleLog()" title="Show Audit Log">Log</button>
        <button class="btn btn-ghost btn-sm" id="hide-btn" onclick="toggleHide()">Hide</button>
        <a class="btn btn-ghost btn-sm btn-icon" href="https://github.com/Dichgrem/subhatch" target="_blank" rel="noopener" title="GitHub" style="text-decoration:none">GitHub</a>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="toggleTheme()" id="theme-btn" title="Toggle light/dark mode">☀</button>
      </div>
    </div>

    <!-- Sub URL -->
    <div class="card" id="sub-card">
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
      <div id="token-section" style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
        <div class="card-label" style="font-size:11px;margin-bottom:6px">Access Tokens</div>
        <div class="field-hint" style="margin-bottom:6px">
          Create multiple tokens — each with its own node set. Share different nodes with different people.
        </div>
        <div id="token-list" class="token-list"></div>
        <div style="margin-top:12px">
          <button class="btn btn-ghost btn-sm" onclick="createToken()">+ Create Token</button>
        </div>
      </div>
      <div id="upload-section" style="display:none;margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
        <div class="card-label" style="font-size:11px;margin-bottom:6px">Node Upload</div>
        <div class="sub-url-wrap">
          <span style="font-size:.65rem;color:var(--muted);flex-shrink:0">URL</span>
          <code id="upload-ep-text" style="font-size:11px">—</code>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="copyUploadEp()" title="Copy URL">⎘</button>
        </div>
        <div class="sub-url-wrap" style="margin-top:6px">
          <span style="font-size:.65rem;color:var(--muted);flex-shrink:0">Token</span>
          <code id="upload-token-text" style="font-size:11px">—</code>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="rotateUploadToken()" title="Rotate">🎲</button>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="copyUploadToken()" title="Copy Token">⎘</button>
        </div>
        <div class="field-hint">
          <code>POST</code> the endpoint with <code>{"nodes":["vless://..."]}</code> and <code>?token=&lt;TOKEN&gt;</code> to push nodes.
        </div>
      </div>
      <div id="momo-section" style="display:none;margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
        <div class="card-label" style="font-size:11px;margin-bottom:6px">OpenWrt-momo</div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <select id="momo-preset" onchange="setMomoUrl()" style="font-size:11px;background:var(--s1);color:var(--text);border:1px solid var(--border);border-radius:4px;padding:2px 4px">
            <option value="ipv4only_realip">IPv4 + RealIP</option>
            <option value="ipv4only_fakeip">IPv4 + FakeIP</option>
            <option value="ipv4plus_realip">IPv4+6 + RealIP</option>
            <option value="ipv4plus_fakeip">IPv4+6 + FakeIP</option>
          </select>
        </div>
        <div class="sub-url-wrap">
          <code id="momo-url-text" style="font-size:11px">Loading…</code>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="copyMomoUrl()" title="Copy Momo URL">⎘</button>
        </div>
        <div class="field-hint">Paste into momo Subscription URL — returns full config.json.</div>
      </div>
      <div id="kernel-section" style="display:none;margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
        <div class="card-label" style="font-size:11px;margin-bottom:6px">sing-box Kernel (HPC)</div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <select id="kernel-preset" onchange="setKernelUrl()" style="font-size:11px;background:var(--s1);color:var(--text);border:1px solid var(--border);border-radius:4px;padding:2px 4px">
            <option value="ipv4only_realip">IPv4 + RealIP</option>
            <option value="ipv4only_fakeip">IPv4 + FakeIP</option>
            <option value="ipv4plus_realip">IPv4+6 + RealIP</option>
            <option value="ipv4plus_fakeip">IPv4+6 + FakeIP</option>
          </select>
        </div>
        <div class="sub-url-wrap">
          <code id="kernel-url-text" style="font-size:11px">Loading…</code>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="copyKernelUrl()" title="Copy Kernel URL">⎘</button>
        </div>
        <div class="field-hint">Point sing-box at this URL — returns full config.json for Linux desktop / HPC.</div>
      </div>
    </div>

    <!-- Upstream sources -->
    <div class="card" id="upstream-section" style="display:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-label" style="margin-bottom:0">Upstream Sources</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" id="upstream-sync-all" onclick="syncAllUpstream()">Sync All</button>
          <button class="btn btn-ghost btn-sm" onclick="showAddUpstream()">+ Add</button>
        </div>
      </div>
      <div id="upstream-list" style="margin-top:12px">
        <div style="text-align:center;color:var(--muted);padding:20px 0">No upstream sources. Click + Add.</div>
      </div>
    </div>

    <!-- Node manager -->
    <div class="card" id="node-card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-label" style="margin-bottom:0">Nodes</div>
        <div style="display:flex;gap:8px;align-items:center">
          <span id="save-status"></span>
          <button class="btn btn-ghost btn-sm" onclick="showBulkModal()">Bulk Import</button>
          <button class="btn btn-ghost btn-sm" onclick="exportSingBox()">Export JSON</button>
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

    <!-- Audit log -->
    <div class="card" id="log-section" style="display:none;margin-top:16px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-label" style="margin-bottom:0">Audit Log</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="loadAuditLog()" title="Refresh">↻</button>
          <button class="btn btn-ghost btn-sm" onclick="clearAuditLog()" title="Clear">✕ Clear</button>
        </div>
      </div>
      <div id="audit-list" style="margin-top:12px;max-height:400px;overflow-x:hidden;overflow-y:auto;font-size:.7rem;color:var(--text);scrollbar-gutter:stable;padding-right:4px">
        <div style="text-align:center;color:var(--muted);padding:20px 0">Loading…</div>
      </div>
    </div>
  </div>

<div id="toast"></div>

<script>
// ── State ──
const VERSION = "5.1.0";
let SESSION = localStorage.getItem('sub_session') || null;
let storedNodes = [];   // nodes from KV (editable)
let envNodes    = [];   // nodes from env vars (read-only)
let subUrl      = '';
let tokens      = {};
let editingToken = null;

const SCHEMES = ['vless://','vmess://','trojan://','ss://','ssr://','hysteria2://','hy2://','tuic://','anytls://','naive://'];

// ── Boot ──
;(async () => {
  initTheme();
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
  try {
    const r = await fetch(path, opts);
    const data = await r.json();
    return { ok: r.ok, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Network error' } };
  }
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
  resetPanels();
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
  setKernelUrl();
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
  saveNodes();
}

// ── Delete node ──
function delNode(idx) {
  storedNodes.splice(idx, 1);
  renderNodes();
  saveNodes();
}

// ── Save nodes ──
async function saveNodes() {
  const s = document.getElementById('save-status');
  s.textContent = 'Saving...';
  s.className = 'save-status saving';
  try {
    const { ok, data } = await api('PUT', '/api/nodes', { nodes: storedNodes });
    if (!ok) {
      s.textContent = 'Save error';
      s.className = 'save-status err';
      toast(data.error || 'Save failed', 'err');
      return;
    }
    s.textContent = 'Saved';
    s.className = 'save-status ok';
    setTimeout(() => { s.textContent = ''; s.className = 'save-status'; }, 2000);
  } catch {
    s.textContent = 'Save error';
    s.className = 'save-status err';
    toast('Network error', 'err');
  }
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
  saveNodes();
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
  setKernelUrl();
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
  const preset = document.getElementById("momo-preset").value;
  const momoUrl = subUrl.replace("/sub?", "/api/export/momo?") + "&preset=" + preset;
  try {
    await navigator.clipboard.writeText(momoUrl);
    toast("Momo URL copied", "ok");
  } catch {
    prompt("Copy this URL:", momoUrl);
  }
}

function setMomoUrl() {
  if (!subUrl) { document.getElementById("momo-url-text").textContent = "—"; return; }
  const preset = document.getElementById("momo-preset").value;
  document.getElementById("momo-url-text").textContent = subUrl.replace("/sub?", "/api/export/momo?") + "&preset=" + preset;
}

// ── Kernel URL ──
async function copyKernelUrl() {
  if (!subUrl) return;
  const preset = document.getElementById("kernel-preset").value;
  const kernelUrl = subUrl.replace("/sub?", "/api/export/kernel?") + "&preset=" + preset;
  try {
    await navigator.clipboard.writeText(kernelUrl);
    toast("Kernel URL copied", "ok");
  } catch {
    prompt("Copy this URL:", kernelUrl);
  }
}

function setKernelUrl() {
  if (!subUrl) { document.getElementById("kernel-url-text").textContent = "—"; return; }
  const preset = document.getElementById("kernel-preset").value;
  document.getElementById("kernel-url-text").textContent = subUrl.replace("/sub?", "/api/export/kernel?") + "&preset=" + preset;
}

// ── Upload URL ──
let uploadEp = '';
let uploadToken = '';

async function loadUploadUrl() {
  if (!subUrl) return;
  const { ok, data } = await api('GET', '/api/upload-token');
  if (!ok || !data.token) {
    uploadEp = ''; uploadToken = '';
    document.getElementById('upload-ep-text').textContent = '—';
    document.getElementById('upload-token-text').textContent = '—';
    return;
  }
  const origin = new URL(subUrl).origin;
  uploadEp = origin + '/api/upload';
  uploadToken = data.token;
  document.getElementById('upload-ep-text').textContent = uploadEp;
  document.getElementById('upload-token-text').textContent = uploadToken;
}

async function copyUploadEp() {
  if (!uploadEp) return;
  try { await navigator.clipboard.writeText(uploadEp); toast('URL copied', 'ok'); }
  catch { prompt('Copy:', uploadEp); }
}

async function copyUploadToken() {
  if (!uploadToken) return;
  try { await navigator.clipboard.writeText(uploadToken); toast('Token copied', 'ok'); }
  catch { prompt('Copy:', uploadToken); }
}

async function rotateUploadToken() {
  if (!subUrl || !confirm('Rotate upload token?')) return;
  const { ok, data } = await api('PUT', '/api/upload-token');
  if (!ok) { toast('Failed to rotate', 'err'); return; }
  uploadToken = data.token;
  document.getElementById('upload-token-text').textContent = uploadToken;
  toast('Upload token rotated', 'ok');
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

// ── Card toggles ──
function toggleCard(id, btn) {
  const el = document.getElementById(id);
  const show = el.style.display === 'none';
  el.style.display = show ? '' : 'none';
  btn.classList.toggle('btn-toggled', show);
}

function resetPanels() {
  document.querySelectorAll('#log-section, #upstream-section, #momo-section, #kernel-section, #upload-section').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#log-btn, #upstream-btn, #momo-btn, #kernel-btn, #upload-btn, #hide-btn').forEach(btn => btn.classList.remove('btn-toggled'));
  document.body.classList.remove('hide-sensitive');
}

// ── Hide sensitive ──
function toggleHide() {
  document.body.classList.toggle('hide-sensitive');
  document.getElementById('hide-btn').classList.toggle('btn-toggled', document.body.classList.contains('hide-sensitive'));
}

function toggleMomo() {
  const el = document.getElementById('momo-section');
  const btn = document.getElementById('momo-btn');
  const show = el.style.display === 'none';
  el.style.display = show ? '' : 'none';
  btn.classList.toggle('btn-toggled', show);
  if (show) setMomoUrl();
}

function toggleKernel() {
  const el = document.getElementById('kernel-section');
  const btn = document.getElementById('kernel-btn');
  const show = el.style.display === 'none';
  el.style.display = show ? '' : 'none';
  btn.classList.toggle('btn-toggled', show);
  if (show) setKernelUrl();
}

function toggleLog() {
  const el = document.getElementById('log-section');
  const btn = document.getElementById('log-btn');
  const show = el.style.display === 'none';
  el.style.display = show ? '' : 'none';
  btn.classList.toggle('btn-toggled', show);
  if (show) loadAuditLog();
}

function toggleUpload() {
  const el = document.getElementById('upload-section');
  const btn = document.getElementById('upload-btn');
  const show = el.style.display === 'none';
  el.style.display = show ? '' : 'none';
  btn.classList.toggle('btn-toggled', show);
  if (show) loadUploadUrl();
}

// ── Upstream sources ──
function toggleUpstream() {
  const el = document.getElementById('upstream-section');
  const btn = document.getElementById('upstream-btn');
  const show = el.style.display === 'none';
  el.style.display = show ? '' : 'none';
  btn.classList.toggle('btn-toggled', show);
  if (show) loadUpstream();
}

async function loadUpstream() {
  const { ok, data } = await api('GET', '/api/upstream');
  if (!ok) return;
  renderUpstream(data.urls || []);
}

function renderUpstream(urls) {
  const list = document.getElementById('upstream-list');
  if (urls.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px 0">No upstream sources. Click + Add.</div>';
    return;
  }
  list.innerHTML = urls.map((u, i) => {
    const age = u.lastSync ? fmtTime(u.lastSync) : 'never';
    const status = u.lastError
      ? \`<span style="color:var(--red)">\${u.lastError}</span>\`
      : \`<span style="color:var(--green)">\${u.nodeCount || 0} nodes</span>\`;
    const name = u.name || u.url.split('/').slice(0, 3).join('/');
    return \`<div style="display:flex;align-items:center;gap:6px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1;min-width:0">
        <div style="font-size:.74rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${escHtml(name)}</div>
        <div style="font-size:.65rem;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${escHtml(u.url)}</div>
        <div style="font-size:.62rem;color:var(--muted);margin-top:2px">\${age} · \${status}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="syncUpstream(\${i})" style="flex-shrink:0">Sync</button>
      <button class="del-btn" onclick="deleteUpstream(\${i})" title="Remove" style="flex-shrink:0">✕</button>
    </div>\`;
  }).join('');
}

function showAddUpstream() {
  const url = prompt('Subscription URL:');
  if (!url) return;
  const name = prompt('Name (optional):', '') || '';
  addUpstream(url.trim(), name.trim());
}

async function addUpstream(url, name) {
  const { ok, data } = await api('POST', '/api/upstream', { url, name });
  if (!ok) { toast(data.error || 'Failed', 'err'); return; }
  toast('Added · ' + (data.entry.nodeCount || 0) + ' nodes', 'ok');
  loadUpstream();
}

async function syncUpstream(idx) {
  const { ok, data } = await api('POST', '/api/upstream/sync?id=' + idx);
  if (!ok) { toast('Sync failed', 'err'); return; }
  toast('Synced · ' + (data.count || 0) + ' nodes', 'ok');
  loadUpstream();
}

async function syncAllUpstream() {
  const btn = document.getElementById('upstream-sync-all');
  btn.classList.add('loading'); btn.disabled = true;
  await api('POST', '/api/upstream/sync');
  btn.classList.remove('loading'); btn.disabled = false;
  toast('Sync done', 'ok');
  loadUpstream();
}

async function deleteUpstream(idx) {
  if (!confirm('Delete this upstream source?')) return;
  const { ok } = await api('DELETE', '/api/upstream?id=' + idx);
  if (!ok) { toast('Failed to delete', 'err'); return; }
  toast('Deleted', 'ok');
  loadUpstream();
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

// ── Audit log ──
function fmtTime(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  const parts = [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
  ].join('-');
  const time = [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':');
  return parts + ' ' + time;
}

async function loadAuditLog() {
  const list = document.getElementById('audit-list');
  const { ok, data } = await api('GET', '/api/audit-log');
  if (!ok) { list.innerHTML = '<div style="text-align:center;color:var(--red);padding:10px">Failed to load</div>'; return; }
  const log = data.log || [];
  if (log.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px 0">No entries yet.</div>';
    return;
  }
  list.innerHTML = log.map(e => {
    const ts = fmtTime(e.ts);
    const lv = e.level || 'INFO';
    return \`<div class="audit-row" style="display:flex;gap:10px;padding:4px 0;border-bottom:1px solid var(--border);align-items:baseline">
      <span class="audit-ts" style="color:var(--muted);min-width:110px;font-variant-numeric:tabular-nums">\${ts}</span>
      <span class="audit-lv audit-\${lv}" style="min-width:40px;font-size:.65rem">\${lv}</span>
      <span class="audit-act" style="color:var(--amber);min-width:80px">\${e.action}</span>
      <span class="audit-group" style="display:flex;gap:10px;align-items:baseline">
        <span class="audit-detail" style="color:var(--muted);max-width:200px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${e.detail || ''}</span>
        <span class="audit-ip" style="font-family:monospace;min-width:110px;flex-shrink:0">\${e.ip}</span>
      </span>
    </div>\`;
  }).join('');
}

async function clearAuditLog() {
  if (!confirm('Clear all audit logs?')) return;
  const { ok } = await api('DELETE', '/api/audit-log');
  if (!ok) { toast('Failed to clear', 'err'); return; }
  document.getElementById('audit-list').innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px 0">Cleared.</div>';
  toast('Audit log cleared', 'ok');
}

// ── Theme toggle ──
function initTheme() {
  if (localStorage.getItem('sub_theme') === 'light') {
    document.documentElement.classList.add('light');
    document.getElementById('theme-btn').textContent = '☾';
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const btn = document.getElementById('theme-btn');
  if (html.classList.contains('light')) {
    html.classList.remove('light');
    localStorage.setItem('sub_theme', 'dark');
    btn.textContent = '☀';
  } else {
    html.classList.add('light');
    localStorage.setItem('sub_theme', 'light');
    btn.textContent = '☾';
  }
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
