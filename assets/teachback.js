/* =========================================================================
   TEACH BACK MODE — user explains a chapter concept in their own words,
   Claude grades it against the chapter's actual key terms for accuracy.
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
        <span class="teachback-hint">Graded against this chapter's key terms using your Claude API key.</span>
        <button class="btn" id="teachback-submit">Grade my explanation</button>
      </div>
      <div class="teachback-response" id="teachback-response"></div>
      <div class="teachback-terms">
        <div class="teachback-hint" style="margin-bottom:8px;">Try to touch on these terms:</div>
        ${termList.map(t=>`<span class="term-chip">${t}</span>`).join("")}
      </div>
    </div>`;

  document.getElementById("teachback-submit").addEventListener("click", async ()=>{
    const input = document.getElementById("teachback-input").value.trim();
    const respEl = document.getElementById("teachback-response");
    if(!input){
      respEl.className = "teachback-response show";
      respEl.textContent = "Write an explanation first — even a rough one works.";
      return;
    }
    const key = getApiKey();
    if(!key){
      respEl.className = "teachback-response show";
      respEl.textContent = "Add your Claude API key (chat bubble in the corner → gear icon) to enable grading.";
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
      const reply = await callClaude(key, [{ role:"user", content: prompt }], 600);
      respEl.textContent = reply;
    }catch(err){
      respEl.textContent = "Couldn't reach the API — check your key. (" + err.message + ")";
    }
    btn.disabled = false;
  });
}
