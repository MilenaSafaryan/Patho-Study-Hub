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
   AI CHAT WIDGET — paid access model
   - Local glossary search always works free, no payment needed.
   - Open-ended AI Q&A + Teach Back grading require a one-time unlock
     (Stripe Checkout), verified server-side by a Netlify Function that
     also holds the Claude API key — nothing secret ever touches the browser.
   - Voice input (mic) and voice output (spoken replies) use the browser's
     built-in Web Speech API — free, no backend involved.
   ========================================================================= */

const AI_FEATURES_ENABLED = true;
const ACCESS_STORAGE = "patho_hub_paid_session";

function getAccessSession(){ return localStorage.getItem(ACCESS_STORAGE) || ""; }
function setAccessSession(id){ localStorage.setItem(ACCESS_STORAGE, id); }
function hasAccess(){ return !!getAccessSession(); }

// Pick up a successful Stripe redirect (?unlocked=1&session_id=...)
(function captureUnlockRedirect(){
  const params = new URLSearchParams(window.location.search);
  if(params.get("unlocked") === "1" && params.get("session_id")){
    setAccessSession(params.get("session_id"));
    params.delete("unlocked");
    params.delete("session_id");
    const newUrl = window.location.pathname + (params.toString() ? "?"+params.toString() : "");
    window.history.replaceState({}, "", newUrl);
  }
})();

async function startUnlockCheckout(){
  try{
    const res = await fetch("/api/create-checkout", { method: "POST" });
    const data = await res.json();
    if(data.url){ window.location.href = data.url; }
    else { alert("Couldn't start checkout: " + (data.error || "unknown error")); }
  }catch(err){
    alert("Couldn't reach the payment server. (" + err.message + ")");
  }
}

async function callAI(messages, maxTokens){
  const sessionId = getAccessSession();
  const res = await fetch("/api/ai-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, messages, maxTokens })
  });
  const data = await res.json();
  if(!res.ok){ throw new Error(data.error || ("HTTP " + res.status)); }
  return data.text;
}

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
      <button class="ai-chat-settings-btn" id="ai-voice-toggle-btn" title="Toggle spoken replies">&#128266;</button>
    </div>
    <div class="ai-chat-body" id="ai-chat-body">
      <div class="ai-msg system">Ask about any term from your chapters. Glossary lookups are free — open-ended questions need the one-time AI unlock below.</div>
    </div>
    <div id="ai-unlock-row" style="padding:12px 16px;border-top:1px solid var(--line);${hasAccess() ? "display:none;" : ""}">
      <button class="btn" id="ai-unlock-btn" style="width:100%;justify-content:center;">Unlock AI chat &amp; voice — one-time fee</button>
    </div>
    <div class="ai-chat-input-row">
      <button id="ai-mic-btn" title="Speak your question" style="background:var(--paper-alt);color:var(--ink);border-radius:50%;width:38px;height:38px;flex:none;padding:0;">&#127908;</button>
      <input type="text" id="ai-chat-input" placeholder="e.g. what is iatrogenic?" />
      <button id="ai-chat-send">Ask</button>
    </div>`;
  document.body.appendChild(panel);

  toggle.addEventListener("click", ()=> panel.classList.toggle("open"));
  document.getElementById("ai-unlock-btn").addEventListener("click", startUnlockCheckout);

  const input = document.getElementById("ai-chat-input");
  const send = document.getElementById("ai-chat-send");
  send.addEventListener("click", handleChatSend);
  input.addEventListener("keydown", e=>{ if(e.key==="Enter") handleChatSend(); });

  setupVoice();
}

/* ---------------- voice: mic input + spoken replies ---------------- */
let __voiceOutputOn = true;

function setupVoice(){
  const voiceBtn = document.getElementById("ai-voice-toggle-btn");
  voiceBtn.addEventListener("click", ()=>{
    __voiceOutputOn = !__voiceOutputOn;
    voiceBtn.style.opacity = __voiceOutputOn ? "1" : "0.45";
    if(!__voiceOutputOn && "speechSynthesis" in window) window.speechSynthesis.cancel();
  });

  const micBtn = document.getElementById("ai-mic-btn");
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){
    micBtn.style.display = "none";
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let listening = false;
  micBtn.addEventListener("click", ()=>{
    if(listening) return;
    listening = true;
    micBtn.style.background = "var(--coral)";
    micBtn.style.color = "#fff";
    recognition.start();
  });
  recognition.addEventListener("result", (e)=>{
    const transcript = e.results[0][0].transcript;
    document.getElementById("ai-chat-input").value = transcript;
    handleChatSend();
  });
  recognition.addEventListener("end", ()=>{
    listening = false;
    micBtn.style.background = "var(--paper-alt)";
    micBtn.style.color = "var(--ink)";
  });
  recognition.addEventListener("error", ()=>{
    listening = false;
    micBtn.style.background = "var(--paper-alt)";
    micBtn.style.color = "var(--ink)";
  });
}

function speak(text){
  if(!__voiceOutputOn || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.02;
  window.speechSynthesis.speak(utter);
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
    const text = `${exact.term} (Ch. ${exact.chapter}): ${exact.def}`;
    addChatMsg("bot", text); speak(text);
    return;
  }
  if(partial.length){
    const text = partial.map(t=>`${t.term} (Ch. ${t.chapter}): ${t.def}`).join("\n\n");
    addChatMsg("bot", text); speak(partial[0].def);
    return;
  }

  if(!hasAccess()){
    addChatMsg("system", "No glossary match found. Unlock AI chat above to ask open-ended questions.");
    document.getElementById("ai-unlock-row").style.display = "block";
    return;
  }

  const thinking = addChatMsg("bot", "Thinking…");
  try{
    const reply = await callAI([
      { role: "user", content: `You are a friendly pathophysiology study assistant for a nursing/pre-clinical student. Answer concisely (3-6 sentences max) and at a study-guide level of detail. Question: ${q}` }
    ], 500);
    thinking.textContent = reply;
    speak(reply);
  }catch(err){
    thinking.textContent = "Couldn't get a response. (" + err.message + ")";
  }
}

if(AI_FEATURES_ENABLED){
  document.addEventListener("DOMContentLoaded", buildChatWidget);
}
