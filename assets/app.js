/* =========================================================================
   SHARED APP SHELL — topbar, footer, AI chat widget (definitions + Q&A)
   ========================================================================= */

const HUB = {
  basePath: (function(){
    // works whether pages live at root or in a subfolder
    const p = window.__HUB_BASE__ || "";
    return p;
  })()
};

function injectTopbar(activeKey){
  const base = HUB.basePath;
  const el = document.getElementById("hub-topbar");
  if(!el) return;
  el.innerHTML = `
    <div class="topbar-inner">
      <a class="brand" href="${base}index.html">
        <span class="brand-mark"></span>
        <div>
          <div class="brand-name">Patho Study Hub</div>
          <div class="brand-sub">weekly review · self study</div>
        </div>
      </a>
      <nav class="tabs">
        <a href="${base}index.html" class="${activeKey==='home'?'active':''}">Home</a>
        <a href="${base}glossary.html" class="${activeKey==='glossary'?'active':''}">Glossary</a>
        <a href="${base}practice-exams.html" class="${activeKey==='exams'?'active':''}">Practice Exams</a>
      </nav>
    </div>`;
}

function injectFooter(){
  const el = document.getElementById("hub-footer");
  if(!el) return;
  el.innerHTML = `
    <span>Patho Study Hub — personal review tool</span>
    <span id="footer-term-count" class="mono"></span>`;
  fetchJSON(HUB.basePath + "data/terms_all.json").then(t=>{
    const f = document.getElementById("footer-term-count");
    if(f) f.textContent = t.length + " glossary terms indexed";
  }).catch(()=>{});
}

function fetchJSON(path){
  return fetch(path).then(r=>{
    if(!r.ok) throw new Error("Failed to load "+path);
    return r.json();
  });
}

function ekgSVG(){
  return `<div class="ekg-wrap"><svg viewBox="0 0 1000 56" preserveAspectRatio="none">
    <path class="ekg-line" d="M0,28 L120,28 L145,28 L160,8 L178,48 L196,18 L214,28 L340,28 L365,28 L380,12 L398,44 L416,20 L434,28 L560,28 L585,28 L600,6 L618,50 L636,16 L654,28 L780,28 L805,28 L820,10 L838,46 L856,19 L874,28 L1000,28"/>
  </svg></div>`;
}

/* =========================================================================
   AI CHAT WIDGET
   - Local glossary search first (instant, no API key needed)
   - Falls back to live Claude API call for open-ended questions
     (requires the user's own API key, stored in this browser only)
   ========================================================================= */

const AI_KEY_STORAGE = "patho_hub_claude_key";

function getApiKey(){ return localStorage.getItem(AI_KEY_STORAGE) || ""; }
function setApiKey(k){ localStorage.setItem(AI_KEY_STORAGE, k); }

function buildChatWidget(){
  const toggle = document.createElement("button");
  toggle.id = "ai-chat-toggle";
  toggle.title = "Ask about a term";
  toggle.innerHTML = "&#128172;";
  document.body.appendChild(toggle);

  const panel = document.createElement("div");
  panel.id = "ai-chat-panel";
  panel.innerHTML = `
    <div class="ai-chat-head">
      <div class="ai-chat-head-title"><span class="dot"></span>Definitions &amp; Q&amp;A</div>
      <button class="ai-chat-settings-btn" id="ai-chat-settings-btn" title="API key settings">&#9881;</button>
    </div>
    <div class="ai-chat-body" id="ai-chat-body">
      <div class="ai-msg system">Ask about any term from your chapters. I'll check the glossary first, then use AI for anything deeper.</div>
    </div>
    <div class="ai-chat-input-row">
      <input type="text" id="ai-chat-input" placeholder="e.g. what is iatrogenic?" />
      <button id="ai-chat-send">Ask</button>
    </div>`;
  document.body.appendChild(panel);

  const modal = document.createElement("div");
  modal.className = "ai-settings-modal";
  modal.id = "ai-settings-modal";
  modal.innerHTML = `
    <div class="ai-settings-box">
      <h3>Claude API key</h3>
      <p>Local glossary lookups always work with no key. For open-ended questions and Teach Back grading, this site calls the Claude API directly from your browser using your own key.</p>
      <input type="password" id="ai-key-input" placeholder="sk-ant-..." />
      <div class="ai-warn">This key is stored only in your browser's local storage and sent directly to Anthropic's API — never to any other server. Don't share this site's URL with your key saved on a public/shared computer.</div>
      <div class="ai-settings-actions">
        <button class="btn btn-outline" id="ai-key-cancel">Close</button>
        <button class="btn" id="ai-key-save">Save key</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  toggle.addEventListener("click", ()=> panel.classList.toggle("open"));
  document.getElementById("ai-chat-settings-btn").addEventListener("click", ()=>{
    document.getElementById("ai-key-input").value = getApiKey();
    modal.classList.add("open");
  });
  document.getElementById("ai-key-cancel").addEventListener("click", ()=> modal.classList.remove("open"));
  document.getElementById("ai-key-save").addEventListener("click", ()=>{
    setApiKey(document.getElementById("ai-key-input").value.trim());
    modal.classList.remove("open");
    addChatMsg("system", "API key saved to this browser.");
  });

  const input = document.getElementById("ai-chat-input");
  const send = document.getElementById("ai-chat-send");
  send.addEventListener("click", handleChatSend);
  input.addEventListener("keydown", e=>{ if(e.key==="Enter") handleChatSend(); });
}

function addChatMsg(role, text){
  const body = document.getElementById("ai-chat-body");
  const div = document.createElement("div");
  div.className = "ai-msg " + role;
  div.textContent = text;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
  return div;
}

let __glossaryCache = null;
async function loadGlossary(){
  if(__glossaryCache) return __glossaryCache;
  __glossaryCache = await fetchJSON(HUB.basePath + "data/terms_all.json");
  return __glossaryCache;
}

async function handleChatSend(){
  const input = document.getElementById("ai-chat-input");
  const q = input.value.trim();
  if(!q) return;
  input.value = "";
  addChatMsg("user", q);

  const glossary = await loadGlossary().catch(()=>[]);
  const ql = q.toLowerCase().replace(/^(what is|what's|define|definition of)\s+/,"").replace(/\?$/,"").trim();
  const exact = glossary.find(t=>t.term.toLowerCase()===ql);
  const partial = !exact ? glossary.filter(t=>t.term.toLowerCase().includes(ql) || ql.includes(t.term.toLowerCase())).slice(0,3) : [];

  if(exact){
    addChatMsg("bot", `${exact.term} (Ch. ${exact.chapter}): ${exact.def}`);
    return;
  }
  if(partial.length){
    const text = partial.map(t=>`${t.term} (Ch. ${t.chapter}): ${t.def}`).join("\n\n");
    addChatMsg("bot", text);
    return;
  }

  // fall back to live API
  const key = getApiKey();
  if(!key){
    addChatMsg("system", "No glossary match found. Add your Claude API key (gear icon) to ask open-ended questions.");
    return;
  }
  const thinking = addChatMsg("bot", "Thinking…");
  try{
    const contextTerms = glossary.slice(0, 0); // context kept minimal; glossary already searched above
    const reply = await callClaude(key, [
      { role: "user", content: `You are a friendly pathophysiology study assistant for a nursing/pre-clinical student. Answer concisely (3-6 sentences max) and at a study-guide level of detail. Question: ${q}` }
    ], 500);
    thinking.textContent = reply;
  }catch(err){
    thinking.textContent = "Couldn't reach the API — check that your key is correct. (" + err.message + ")";
  }
}

async function callClaude(key, messages, maxTokens){
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens || 500,
      messages
    })
  });
  if(!res.ok){
    const errText = await res.text();
    throw new Error("API error " + res.status + ": " + errText.slice(0,180));
  }
  const data = await res.json();
  return (data.content || []).map(b=>b.text||"").join("\n").trim() || "(no response)";
}

document.addEventListener("DOMContentLoaded", buildChatWidget);
