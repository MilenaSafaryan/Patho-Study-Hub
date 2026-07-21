/* =========================================================================
   TEACH BACK MODE — user explains a chapter concept in their own words,
   Claude grades it against the chapter's actual key terms for accuracy.
   Costs 1 credit per grading, using the same prepaid balance as the
   AI chat widget (see app.js).
   ========================================================================= */

function initTeachBack(containerId, chapterTitle, terms){
  const box = document.getElementById(containerId);
  const termList = terms.slice(0, 14).map(t=>t.term);

  box.innerHTML = `
    <div class="teachback-card">
      <div class="quiz-tag">Teach it back</div>
      <div class="teachback-prompt">In your own words, explain the key concepts of <em>${chapterTitle}</em> — as if you were teaching a classmate who missed lecture.</div>
      <textarea id="teachback-input" placeholder="Start typing your explanation here..."></textarea>

      <div class="teachback-actions">
        <span class="teachback-hint" id="teachback-hint">Grading this uses 1 AI credit — <span id="teachback-balance-inline" class="mono"></span> left.</span>
        <button class="btn" id="teachback-submit">Grade my explanation</button>
      </div>
      <div id="teachback-buy-row" style="margin-top:12px;">
        <button class="btn btn-outline" id="teachback-buy-btn">Buy AI credits</button>
        <div style="font-size:0.68rem;color:var(--ink-soft);margin-top:7px;line-height:1.5;">$5.00 one-time · 200 credits · no auto-renewal · processed by Stripe</div>
      </div>

      <div class="teachback-response" id="teachback-response"></div>
      <div class="teachback-terms">
        <div class="teachback-hint" style="margin-bottom:8px;">Try to touch on these terms:</div>
        ${termList.map(t=>`<span class="term-chip">${t}</span>`).join("")}
      </div>
    </div>`;

  const refreshBalance = ()=>{
    const el = document.getElementById("teachback-balance-inline");
    if(el) el.textContent = getCachedBalance() + " credit" + (getCachedBalance()===1 ? "" : "s");
  };
  refreshBalance();

  document.getElementById("teachback-buy-btn").addEventListener("click", openPaymentDisclosure);

  document.getElementById("teachback-submit").addEventListener("click", async ()=>{
    const input = document.getElementById("teachback-input").value.trim();
    const respEl = document.getElementById("teachback-response");
    if(!input){
      respEl.className = "teachback-response show";
      respEl.textContent = "Write an explanation first — even a rough one works.";
      return;
    }
    if(!hasCredits()){
      respEl.className = "teachback-response show";
      respEl.textContent = "You're out of AI credits. Buy a pack above, then grade again.";
      return;
    }
    respEl.className = "teachback-response show";
    respEl.textContent = "Grading…";
    const btn = document.getElementById("teachback-submit");
    btn.disabled = true;

    const glossaryContext = terms.map(t=>`- ${t.term}: ${t.def}`).join("\n");
    const prompt = `You are grading a nursing student's "teach-back" explanation of a pathophysiology chapter, as a supportive but precise study coach.

Chapter: ${chapterTitle}

Reference glossary for this chapter (ground truth):
${glossaryContext}

Student's explanation:
"""
${input}
"""

Give feedback in this structure, concise and encouraging:
1. What they got right (1-3 bullet points)
2. Any inaccuracies or missing key concepts (be specific, reference the correct term/definition)
3. One or two terms from the glossary they didn't mention but should know
Keep the whole response under 200 words.`;

    try{
      const reply = await callAI([{ role:"user", content: prompt }], 600);
      respEl.textContent = reply;
      if(typeof speak === "function") speak(reply);
    }catch(err){
      respEl.textContent = "Couldn't get feedback. (" + err.message + ")";
    }
    refreshBalance();
    btn.disabled = false;
  });
}
