/* =========================================================================
   TEACH BACK MODE — free, no AI credits used.
   Walks through the chapter's key terms one at a time: explain it in your
   own words, get checked against that term's real definition, then either
   try again or move on to the next topic. Sequential, like a quiz, but
   for open recall instead of multiple choice.
   ========================================================================= */

function initTeachBack(containerId, chapterTitle, terms){
  const box = document.getElementById(containerId);
  const state = { pool: [], index: 0, correct: 0, checked: false };

  function start(){
    state.pool = shuffle(terms.filter(t => t.term && t.def && t.term.length > 2));
    state.index = 0;
    state.correct = 0;
    state.checked = false;
    state.counted = new Set();
    render();
  }

  function keywordsFrom(def){
    return def.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 4 && !STOPWORDS.has(w));
  }

  const STOPWORDS = new Set(["which","where","there","these","those","their","because","occurs","results","typically","often","usually","associated","characterized","condition","causes","caused","without","within","through","during","involves","involving","leads","leading","among"]);

  function render(){
    const { pool, index } = state;
    if(pool.length===0){
      box.innerHTML = `<div class="quiz-done"><h3>No terms yet</h3></div>`;
      return;
    }
    if(index >= pool.length){
      const pct = Math.round((state.correct/pool.length)*100);
      box.innerHTML = `
        <div class="teachback-card">
          <div class="quiz-done">
            <div class="quiz-tag">Teach back complete</div>
            <h3>Ran through all ${pool.length} topics.</h3>
            <div class="score-big">${state.correct}/${pool.length}</div>
            <div class="mono" style="color:var(--ink-soft);">${pct}% explained well</div>
            <button class="btn-restart" id="tb-restart">Shuffle &amp; run again</button>
          </div>
        </div>`;
      document.getElementById("tb-restart").addEventListener("click", start);
      if(typeof celebrate === "function" && pct >= 60) celebrate();
      return;
    }

    const t = pool[index];
    const pct = Math.round((index/pool.length)*100);

    box.innerHTML = `
      <div class="teachback-card">
        <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
        <div class="quiz-tag">Topic ${index+1} of ${pool.length} · ${chapterTitle}</div>
        <div class="teachback-prompt">Explain, in your own words: <em>${t.term}</em></div>
        <textarea id="teachback-input" placeholder="What is it, and why does it matter?"></textarea>
        <div class="teachback-actions">
          <span class="teachback-hint">Free — checked against this term's real definition.</span>
          <button class="btn" id="teachback-check">Check my answer</button>
        </div>
        <div class="teachback-response" id="teachback-response"></div>
        <div class="teachback-nav" id="teachback-nav" style="display:none;margin-top:16px;display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn-outline btn" id="tb-retry">Try again</button>
          <button class="btn" id="tb-next">Next topic &rarr;</button>
        </div>
      </div>`;

    document.getElementById("teachback-check").addEventListener("click", ()=>{
      const input = document.getElementById("teachback-input").value.trim();
      const respEl = document.getElementById("teachback-response");
      if(!input){
        respEl.className = "teachback-response show";
        respEl.textContent = "Write something first — even a rough attempt works.";
        return;
      }

      const lowerInput = input.toLowerCase();
      const keyWords = keywordsFrom(t.def);
      const hitWords = keyWords.filter(w => lowerInput.includes(w));
      const pctHit = keyWords.length ? hitWords.length / keyWords.length : 0;
      const mentionsTerm = lowerInput.includes(t.term.toLowerCase().split(" ")[0]);
      const passed = pctHit >= 0.25 || (mentionsTerm && input.length > 40);

      respEl.className = "teachback-response show";
      respEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:0.85rem;padding:4px 12px;border-radius:999px;background:${passed ? 'rgba(61,139,95,0.15)' : 'rgba(192,90,63,0.15)'};color:${passed ? 'var(--success)' : 'var(--coral)'};">
            ${passed ? "✓ Good explanation" : "✗ Not quite there"}
          </span>
        </div>
        <div style="font-size:0.85rem;"><strong>Actual definition:</strong> ${t.def}</div>`;

      if(!state.counted.has(state.index)){
        state.counted.add(state.index);
        if(passed) state.correct++;
      }
      document.getElementById("teachback-nav").style.display = "flex";
      document.getElementById("teachback-check").disabled = true;
    });

    document.getElementById("tb-retry").addEventListener("click", ()=>{
      state.checked = false;
      render();
    });
    document.getElementById("tb-next").addEventListener("click", ()=>{
      state.index++;
      state.checked = false;
      render();
    });
  }

  start();
  return { restart: start };
}
