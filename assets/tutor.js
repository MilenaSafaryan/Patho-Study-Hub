/* =========================================================================
   AI TUTOR — a conversational teaching mode, per chapter. Explains the
   chapter's concepts simply, then asks comprehension questions and reacts
   to the student's answers before moving on. Uses the same prepaid credit
   balance as the AI chat widget (1 credit per exchange).
   ========================================================================= */

function initTutor(containerId, chapterTitle, outline, terms, accentColor){
  const box = document.getElementById(containerId);
  const history = []; // {role, content} sent to the API each turn
  let started = false;

  const termSummary = terms.slice(0, 25).map(t => `${t.term}: ${t.def}`).join("\n");
  const outlineSummary = outline.slice(0, 20).join(", ");

  const SYSTEM_INSTRUCTIONS = `You are a warm, encouraging pathophysiology tutor walking a nursing student through one chapter, one small concept at a time.

Chapter: "${chapterTitle}"
Topics covered in this chapter, in order: ${outlineSummary}
Key terms for reference:
${termSummary}

Rules for how you behave:
- Explain ONE concept at a time, in plain, simple language (a few sentences max) — no walls of text.
- After explaining a concept, ALWAYS end your turn with exactly one comprehension question checking whether the student understood it.
- When the student answers, briefly say whether they're right, gently correct any misunderstanding, then move to the NEXT concept and repeat: explain simply, ask a question.
- Keep every message short — this is a back-and-forth conversation, not a lecture.
- Work through the chapter's topics roughly in order across the conversation.
- Stay encouraging and conversational, like a patient study partner, not a textbook.`;

  function renderIntro(){
    box.innerHTML = `
      <div class="tutor-card">
        <div class="quiz-tag">AI Tutor</div>
        <div class="teachback-prompt">I'll walk you through <em>${chapterTitle}</em> one idea at a time — explaining it simply, then asking a quick question to check it landed, before moving to the next concept.</div>
        <div class="teachback-hint" style="margin:10px 0 16px;">Costs 1 AI credit per exchange, same balance as the chat bubble.</div>
        <button class="btn" id="tutor-start-btn" style="width:100%;justify-content:center;">Start the lesson</button>
      </div>`;
    document.getElementById("tutor-start-btn").addEventListener("click", startLesson);
  }

  function renderChat(){
    box.innerHTML = `
      <div class="tutor-card">
        <div class="tutor-head">
          <div class="quiz-tag">AI Tutor — ${chapterTitle}</div>
          <span id="tutor-balance" class="mono" style="font-size:0.72rem;color:var(--ink-soft);"></span>
        </div>
        <div class="tutor-messages" id="tutor-messages"></div>
        <div id="tutor-buy-row" style="display:none;margin-top:10px;">
          <button class="btn btn-outline" id="tutor-buy-btn" style="width:100%;justify-content:center;">Buy AI credits</button>
        </div>
        <div class="tutor-input-row">
          <input type="text" id="tutor-input" placeholder="Type your answer or thought here..." />
          <button id="tutor-send-btn">Send</button>
        </div>
      </div>`;

    document.getElementById("tutor-send-btn").addEventListener("click", sendTurn);
    document.getElementById("tutor-input").addEventListener("keydown", e=>{ if(e.key==="Enter") sendTurn(); });
    document.getElementById("tutor-buy-btn").addEventListener("click", openPaymentDisclosure);
    refreshBalance();
  }

  function refreshBalance(){
    const el = document.getElementById("tutor-balance");
    if(el) el.textContent = getCachedBalance() + " credit" + (getCachedBalance()===1 ? "" : "s") + " left";
  }

  function addMsg(role, text){
    const wrap = document.getElementById("tutor-messages");
    const div = document.createElement("div");
    div.className = "ai-msg " + role;
    div.textContent = text;
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
    return div;
  }

  async function startLesson(){
    renderChat();
    started = true;
    const thinking = addMsg("bot", "Getting started…");
    history.push({ role: "user", content: SYSTEM_INSTRUCTIONS + "\n\nBegin the lesson now with the first concept." });
    try{
      const reply = await callAI(history, 400);
      history.push({ role: "assistant", content: reply });
      thinking.textContent = reply;
    }catch(err){
      thinking.textContent = handleTutorError(err);
    }
    refreshBalance();
  }

  async function sendTurn(){
    const input = document.getElementById("tutor-input");
    const q = input.value.trim();
    if(!q) return;
    input.value = "";
    addMsg("user", q);
    history.push({ role: "user", content: q });

    const thinking = addMsg("bot", "…");
    try{
      const reply = await callAI(history, 400);
      history.push({ role: "assistant", content: reply });
      thinking.textContent = reply;
    }catch(err){
      thinking.textContent = handleTutorError(err);
      history.pop(); // don't keep a failed turn in context
    }
    refreshBalance();
  }

  function handleTutorError(err){
    if(String(err.message).includes("credit") || String(err.message).includes("402")){
      document.getElementById("tutor-buy-row").style.display = "block";
      return "You're out of AI credits. Buy a pack below to keep the lesson going.";
    }
    return "Couldn't get a response. (" + err.message + ")";
  }

  renderIntro();
}
