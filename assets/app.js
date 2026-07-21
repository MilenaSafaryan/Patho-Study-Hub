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
    <span>Patho Study Hub — personal review tool · <a href="${HUB.basePath}disclosures.html" style="text-decoration:underline;">About &amp; disclosures</a> · <a href="${HUB.basePath}references.html" style="text-decoration:underline;">References</a></span>
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

function celebrate(accentColor){
  const layer = document.createElement("div");
  layer.id = "confetti-layer";
  document.body.appendChild(layer);
  const colors = [accentColor || "#2E7D5B", "#C05A3F", "#C97A2E", "#3D8B5F", "#332A20"];
  const pieces = 46;
  for(let i=0;i<pieces;i++){
    const el = document.createElement("div");
    el.className = "confetti-piece";
    const size = 5 + Math.random()*6;
    el.style.left = Math.random()*100 + "vw";
    el.style.width = size+"px";
    el.style.height = (size*0.4 + Math.random()*4)+"px";
    el.style.background = colors[Math.floor(Math.random()*colors.length)];
    el.style.setProperty("--spin", (Math.random()>0.5?1:-1)*(180+Math.random()*540)+"deg");
    el.style.animationDuration = (1.8 + Math.random()*1.6)+"s";
    el.style.animationDelay = (Math.random()*0.4)+"s";
    layer.appendChild(el);
  }
  setTimeout(()=> layer.remove(), 3600);
}

/* =========================================================================
   AI CHAT WIDGET — prepaid credits model
   - Local glossary search always works free, no payment needed.
   - Open-ended AI Q&A + Teach Back grading cost 1 credit per use.
     Credits are bought in packs via Stripe Checkout and tracked server-side
     against a Stripe Customer id (see netlify/functions) — nothing secret
     ever touches the browser, and nobody can be charged more than they paid.
   - Voice input (mic) and voice output (spoken replies) use the browser's
     built-in Web Speech API — free, no backend involved.
   ========================================================================= */

const AI_FEATURES_ENABLED = true;
const CUSTOMER_STORAGE = "patho_hub_customer_id";
const BALANCE_STORAGE = "patho_hub_balance_cache";

function getCustomerId(){ return localStorage.getItem(CUSTOMER_STORAGE) || ""; }
function setCustomerId(id){ localStorage.setItem(CUSTOMER_STORAGE, id); }
function getCachedBalance(){ return parseInt(localStorage.getItem(BALANCE_STORAGE) || "0", 10) || 0; }
function setCachedBalance(n){ localStorage.setItem(BALANCE_STORAGE, String(n)); updateBalanceDisplay(); }
function hasCredits(){ return getCachedBalance() > 0; }

function updateBalanceDisplay(){
  const el = document.getElementById("ai-balance-display");
  if(el) el.textContent = getCachedBalance() + " credit" + (getCachedBalance()===1 ? "" : "s");
}

// Pick up a successful Stripe redirect (?purchase=1&session_id=...) and credit the balance
(function captureCheckoutRedirect(){
  const params = new URLSearchParams(window.location.search);
  if(params.get("purchase") === "1" && params.get("session_id")){
    const sessionId = params.get("session_id");
    params.delete("purchase");
    params.delete("session_id");
    const newUrl = window.location.pathname + (params.toString() ? "?"+params.toString() : "");
    window.history.replaceState({}, "", newUrl);

    fetch("/api/confirm-purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    }).then(r => r.json()).then(data => {
      if(data.customerId){
        setCustomerId(data.customerId);
        setCachedBalance(data.balance);
      }
    }).catch(()=>{});
  }
})();

async function startBuyCredits(){
  try{
    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: getCustomerId() || null })
    });
    const data = await res.json();
    if(data.url){ window.location.href = data.url; }
    else { alert("Couldn't start checkout: " + (data.error || "unknown error")); }
  }catch(err){
    alert("Couldn't reach the payment server. (" + err.message + ")");
  }
}

function ensurePaymentDisclosureModal(){
  if(document.getElementById("ai-payment-disclosure-modal")) return;
  const modal = document.createElement("div");
  modal.className = "ai-settings-modal";
  modal.id = "ai-payment-disclosure-modal";
  modal.innerHTML = `
    <div class="ai-settings-box">
      <h3>Buy AI credit pack</h3>
      <p><strong>$5.00, one-time payment</strong> — not a subscription, nothing auto-renews.</p>
      <p>You get <strong>200 credits</strong>. Each AI chat question or Teach Back grading uses 1 credit. Credits don't expire and carry over if you buy more later.</p>
      <p>Payment is processed securely by <strong>Stripe</strong> — this site never sees or stores your card details.</p>
      <p>This is an independent student-run study tool, not a registered business. Purchases are <strong>non-refundable</strong> once credits are added to your balance, since usage can't be undone. If something goes wrong with a charge, reach out to the site owner directly to sort it out.</p>
      <p style="margin-top:6px;"><a href="${HUB.basePath}disclosures.html" target="_blank" style="text-decoration:underline;">Full disclosures &amp; data info</a></p>
      <div class="ai-settings-actions">
        <button class="btn btn-outline" id="ai-disclosure-cancel">Cancel</button>
        <button class="btn" id="ai-disclosure-continue">Continue to payment</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("ai-disclosure-cancel").addEventListener("click", ()=> modal.classList.remove("open"));
  document.getElementById("ai-disclosure-continue").addEventListener("click", ()=>{
    modal.classList.remove("open");
    startBuyCredits();
  });
}

function openPaymentDisclosure(){
  ensurePaymentDisclosureModal();
  document.getElementById("ai-payment-disclosure-modal").classList.add("open");
}

async function callAI(messages, maxTokens){
  const customerId = getCustomerId();
  const res = await fetch("/api/ai-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId, messages, maxTokens })
  });
  const data = await res.json();
  if(typeof data.balance === "number") setCachedBalance(data.balance);
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
      <div style="display:flex;align-items:center;gap:10px;">
        <span id="ai-balance-display" class="mono" style="font-size:0.7rem;color:var(--paper);opacity:0.8;"></span>
        <button class="ai-chat-settings-btn" id="ai-voice-toggle-btn" title="Toggle spoken replies">&#128266;</button>
      </div>
    </div>
    <div class="ai-chat-body" id="ai-chat-body">
      <div class="ai-msg system">Ask about any term from your chapters. Glossary lookups are free — open-ended questions use 1 credit each. AI answers can be wrong, so double-check anything important against your course materials. <a href="${HUB.basePath}disclosures.html" style="color:inherit;">More info</a></div>
    </div>
    <div id="ai-buy-row" style="padding:12px 16px;border-top:1px solid var(--line);">
      <button class="btn" id="ai-buy-btn" style="width:100%;justify-content:center;">Buy AI credits</button>
      <div style="font-size:0.68rem;color:var(--ink-soft);text-align:center;margin-top:7px;line-height:1.5;">$5.00 one-time · 200 credits · no auto-renewal · processed by Stripe</div>
    </div>
    <div class="ai-chat-input-row">
      <button id="ai-mic-btn" title="Speak your question" style="background:var(--paper-alt);color:var(--ink);border-radius:50%;width:38px;height:38px;flex:none;padding:0;">&#127908;</button>
      <input type="text" id="ai-chat-input" placeholder="e.g. what is iatrogenic?" />
      <button id="ai-chat-send">Ask</button>
    </div>`;
  document.body.appendChild(panel);

  toggle.addEventListener("click", ()=> panel.classList.toggle("open"));
  document.getElementById("ai-buy-btn").addEventListener("click", openPaymentDisclosure);
  updateBalanceDisplay();

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

  if(!hasCredits()){
    addChatMsg("system", "No glossary match found, and you're out of credits for open-ended questions. Buy a pack above to keep going.");
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
