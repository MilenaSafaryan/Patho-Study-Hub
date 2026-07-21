/* =========================================================================
   FLASHCARDS — flip through a chapter's glossary terms one at a time.
   Term on the front, definition on the back; mark yourself right/wrong
   to track a light progress score. No AI cost — pure glossary data.
   ========================================================================= */

function initFlashcards(containerId, terms, accentColor){
  const box = document.getElementById(containerId);
  const state = { pool: [], index: 0, known: 0, flipped: false };

  function start(){
    state.pool = shuffle(terms.filter(t=>t.def && t.def.length>0));
    state.index = 0;
    state.known = 0;
    state.flipped = false;
    render();
  }

  function render(){
    const { pool, index } = state;
    if(pool.length===0){
      box.innerHTML = `<div class="quiz-done"><h3>No terms yet</h3></div>`;
      return;
    }
    if(index >= pool.length){
      const pct = Math.round((state.known/pool.length)*100);
      box.innerHTML = `
        <div class="quiz-done">
          <div class="quiz-tag">Deck complete</div>
          <h3>Nice work.</h3>
          <div class="score-big">${state.known}/${pool.length}</div>
          <div class="mono" style="color:var(--ink-soft);">${pct}% known</div>
          <button class="btn-restart" id="fc-restart">Shuffle &amp; run again</button>
        </div>`;
      document.getElementById("fc-restart").addEventListener("click", start);
      if(typeof celebrate === "function" && pct >= 60) celebrate(accentColor);
      return;
    }

    const card = pool[index];
    const pct = Math.round((index/pool.length)*100);

    box.innerHTML = `
      <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
      <div class="flashcard-count mono">Card ${index+1} of ${pool.length} &nbsp;·&nbsp; ${state.known} known so far</div>
      <div class="flashcard-stage" id="fc-stage">
        <div class="flashcard" id="fc-card">
          <div class="flashcard-face flashcard-front">
            <span class="flashcard-hint">TERM</span>
            <div class="flashcard-text">${card.term}</div>
            <span class="flashcard-tap">Tap to flip</span>
          </div>
          <div class="flashcard-face flashcard-back">
            <span class="flashcard-hint">DEFINITION</span>
            <div class="flashcard-text flashcard-def">${card.def}</div>
          </div>
        </div>
      </div>
      <div class="flashcard-actions" id="fc-actions"></div>`;

    const stage = document.getElementById("fc-stage");
    const cardEl = document.getElementById("fc-card");
    const actions = document.getElementById("fc-actions");

    function showRating(){
      actions.innerHTML = `
        <button class="btn-outline btn" id="fc-again">Still learning</button>
        <button class="btn" id="fc-known">I knew it</button>`;
      document.getElementById("fc-known").addEventListener("click", ()=>{
        state.known++; state.index++; state.flipped=false; render();
      });
      document.getElementById("fc-again").addEventListener("click", ()=>{
        state.index++; state.flipped=false; render();
      });
    }

    stage.addEventListener("click", ()=>{
      state.flipped = !state.flipped;
      cardEl.classList.toggle("flipped", state.flipped);
      if(state.flipped) showRating();
      else actions.innerHTML = "";
    });
  }

  start();
  return { restart: start };
}
