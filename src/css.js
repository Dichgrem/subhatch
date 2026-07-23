export const CSS = `<style>
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
.admin-only{display:none}
.admin-only.show{display:flex}

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
.qr-btn{
  background:none;border:none;cursor:pointer;
  color:var(--muted);font-size:1rem;padding:2px 6px;
  border-radius:4px;transition:color .15s,background .15s;
  line-height:1;
}
.qr-btn:hover{color:var(--accent);background:rgba(139,127,255,.1)}
.copy-btn{
  background:none;border:none;cursor:pointer;
  color:var(--muted);font-size:1rem;padding:2px 6px;
  border-radius:4px;transition:color .15s,background .15s;
  line-height:1;
}
.copy-btn:hover{color:var(--accent);background:rgba(139,127,255,.1)}

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
.hide-sensitive #client-url-text{position:relative}
.hide-sensitive #client-url-text::before{content:'Hidden for screenshot';position:absolute;inset:0;display:flex;align-items:center;color:var(--muted);font-style:italic;background:var(--s0);border-radius:6px}
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
`;
