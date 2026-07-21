/* =========================================================================
   TEACH BACK MODE — free, no AI credits used.
   Checks which of the chapter's key terms your explanation actually
   covers, then gives a clear correct/needs-work verdict plus a list of
   what you hit and what you missed.
   ========================================================================= */

function initTeachBack(containerId, chapterTitle, terms){
  const box = document.getElementById(containerId);
  const usableTerms = terms.filter(t => t.term && t.term.length > 2);

  box.innerHTML = `
    <div class="teachback-card">
      <div class="quiz-tag">Teach it back</div>
      <div class="teachback-prompt">In your own words, explain the key concepts of <em>${chapterTitle}</em> — as if you were teaching a classmate who missed lecture.</div>
      <textarea id="teachback-input" placeholder="Start typing your explanation here..."></textarea>

      <div class="teachback-actions">
        <span class="teachback-hint">Free — checks your explanation against this chapter's key terms.</span>
        <button class="btn" id="teachback-submit">Check my explanation</button>
      </div>

      <div class="teachback-response" id="teachback-response"></div>
      <div class="teachback-terms">
        <div class="teachback-hint" style="margin-bottom:8px;">Try to touch on these terms:</div>
        <div id="teachback-term-chips">${usableTerms.slice(0, 14).map(t=>`<span class="term-chip" data-term="${t.term.toLowerCase()}">${t.term}</span>`).join("")}</div>
      </div>
    </div>`;

  document.getElementById("teachback-submit").addEventListener("click", ()=>{
    const input = document.getElementById("teachback-input").value.trim();
    const respEl = document.getElementById("teachback-response");

    if(!input){
      respEl.className = "teachback-response show";
      respEl.textContent = "Write an explanation first — even a rough one works.";
      return;
    }

    const lowerInput = input.toLowerCase();
    const checkPool = usableTerms.slice(0, 14);
    const hit = [];
    const missed = [];
    checkPool.forEach(t=>{
      if(lowerInput.includes(t.term.toLowerCase())) hit.push(t.term);
      else missed.push(t.term);
    });

    const pct = checkPool.length ? Math.round((hit.length/checkPool.length)*100) : 0;
    const passed = pct >= 50;

    respEl.className = "teachback-response show";
    respEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:0.85rem;padding:4px 12px;border-radius:999px;background:${passed ? 'rgba(61,139,95,0.15)' : 'rgba(192,90,63,0.15)'};color:${passed ? 'var(--success)' : 'var(--coral)'};">
          ${passed ? "✓ Looks correct" : "✗ Needs more work"}
        </span>
        <span class="mono" style="font-size:0.78rem;color:var(--ink-soft);">${hit.length}/${checkPool.length} key terms covered</span>
      </div>
      ${hit.length ? `<div style="font-size:0.85rem;margin-bottom:6px;"><strong>Covered:</strong> ${hit.join(", ")}</div>` : ""}
      ${missed.length ? `<div style="font-size:0.85rem;color:var(--ink-soft);"><strong>Missing:</strong> ${missed.join(", ")}</div>` : ""}
    `;

    // highlight term chips
    document.querySelectorAll("#teachback-term-chips .term-chip").forEach(chip=>{
      const t = chip.dataset.term;
      chip.style.background = lowerInput.includes(t) ? "rgba(61,139,95,0.15)" : "";
      chip.style.borderColor = lowerInput.includes(t) ? "var(--success)" : "";
    });

    if(passed && typeof celebrate === "function") celebrate();
  });
}
