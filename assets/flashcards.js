/* =========================================================================
   FLASHCARDS — Anki-style spaced repetition. Rate how well you knew each
   card (Again / Hard / Good / Easy), and it schedules when that card comes
   back using a simplified SM-2 algorithm. Progress is saved per chapter in
   this browser, so due cards persist across visits.
   ========================================================================= */

function initFlashcards(containerId, terms, accentColor, chapterNum){
  const box = document.getElementById(containerId);
  const storageKey = `patho_hub_srs_ch${chapterNum || "x"}`;
  const usableTerms = terms.filter(t => t.term && t.def && t.def.length > 0);

  const state = { queue: [], index: 0, srs: {}, studyAnyway: false, reviewedCount: 0 };

  function loadSRS(){
    try{
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveSRS(){
    localStorage.setItem(storageKey, JSON.stringify(state.srs));
  }
  function cardState(term){
    if(!state.srs[term]) state.srs[term] = { interval: 0, ease: 2.5, reps: 0, due: 0 };
    return state.srs[term];
  }

  function buildQueue(ignoreDue){
    const now = Date.now();
    let due = usableTerms.filter(t => ignoreDue || cardState(t.term).due <= now);
    state.queue = shuffle(due);
    state.index = 0;
    state.reviewedCount = 0;
  }

  function rate(term, rating){
    const cs = cardState(term);
    if(rating === "again"){
      cs.reps = 0;
      cs.interval = 0; // due again in this same session shortly
      cs.ease = Math.max(1.3, cs.ease - 0.2);
      cs.due = Date.now() + 2*60000; // 2 minutes — comes back later in this session
    } else if(rating === "hard"){
      cs.interval = Math.max(1, Math.round((cs.interval || 1) * 1.2));
      cs.ease = Math.max(1.3, cs.ease - 0.15);
      cs.reps++;
      cs.due = Date.now() + cs.interval*86400000;
    } else if(rating === "good"){
      if(cs.reps === 0) cs.interval = 1;
      else if(cs.reps === 1) cs.interval = 3;
      else cs.interval = Math.round(cs.interval * cs.ease);
      cs.reps++;
      cs.due = Date.now() + cs.interval*86400000;
    } else if(rating === "easy"){
      cs.interval = Math.round((cs.interval || 1) * cs.ease * 1.3) + 1;
      cs.ease = cs.ease + 0.15;
      cs.reps++;
      cs.due = Date.now() + cs.interval*86400000;
    }
    saveSRS();
  }

  function start(){
    state.srs = loadSRS();
    state.studyAnyway = false;
    buildQueue(false);
    render();
  }

  function studyAnywayNow(){
    state.studyAnyway = true;
    buildQueue(true);
    render();
  }

  function fmtInterval(days){
    if(days < 1) return "a few minutes";
    if(days === 1) return "1 day";
    if(days < 30) return `${days} days`;
    return `${Math.round(days/30)} mo`;
  }

  function render(){
    const { queue, index } = state;

    if(queue.length === 0){
      const totalDue = usableTerms.filter(t => cardState(t.term).due <= Date.now()).length;
      box.innerHTML = `
        <div class="quiz-done">
          <div class="quiz-tag">All caught up</div>
          <h3>Nothing due right now.</h3>
          <p style="color:var(--ink-soft);font-size:0.9rem;max-width:380px;margin:8px auto 0;">Your spaced-repetition schedule says these cards don't need review yet — that's a good sign. Come back later, or study the deck anyway.</p>
          <button class="btn-restart" id="fc-study-anyway">Study the deck anyway</button>
        </div>`;
      document.getElementById("fc-study-anyway").addEventListener("click", studyAnywayNow);
      return;
    }

    if(index >= queue.length){
      box.innerHTML = `
        <div class="quiz-done">
          <div class="quiz-tag">Session complete</div>
          <h3>Reviewed ${state.reviewedCount} card${state.reviewedCount===1?"":"s"}.</h3>
          <p style="color:var(--ink-soft);font-size:0.9rem;">Cards you rated "Again" will come right back in this session's queue; everything else is scheduled for a future review based on how well you knew it.</p>
          <button class="btn-restart" id="fc-restart">Check queue again</button>
        </div>`;
      document.getElementById("fc-restart").addEventListener("click", ()=>{ buildQueue(state.studyAnyway); render(); });
      if(typeof celebrate === "function") celebrate(accentColor);
      return;
    }

    const card = queue[index];
    const pct = Math.round((index/queue.length)*100);

    box.innerHTML = `
      <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
      <div class="flashcard-count mono">Card ${index+1} of ${queue.length}${state.studyAnyway ? " · study mode" : " · due today"}</div>
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
    let flipped = false;

    function showRatingButtons(){
      const previews = {
        again: fmtInterval(2/1440),
        hard: fmtInterval(Math.max(1, Math.round((cardState(card.term).interval||1)*1.2))),
        good: fmtInterval(cardState(card.term).reps===0 ? 1 : cardState(card.term).reps===1 ? 3 : Math.round((cardState(card.term).interval||1)*cardState(card.term).ease)),
        easy: fmtInterval(Math.round((cardState(card.term).interval||1)*cardState(card.term).ease*1.3)+1),
      };
      actions.innerHTML = `
        <button class="sr-btn sr-again" data-r="again"><span>Again</span><small>${previews.again}</small></button>
        <button class="sr-btn sr-hard" data-r="hard"><span>Hard</span><small>${previews.hard}</small></button>
        <button class="sr-btn sr-good" data-r="good"><span>Good</span><small>${previews.good}</small></button>
        <button class="sr-btn sr-easy" data-r="easy"><span>Easy</span><small>${previews.easy}</small></button>`;
      actions.querySelectorAll(".sr-btn").forEach(btn=>{
        btn.addEventListener("click", (e)=>{
          e.stopPropagation();
          rate(card.term, btn.dataset.r);
          state.reviewedCount++;
          if(btn.dataset.r === "again"){
            state.queue.push(card); // comes back later in this same session
          }
          state.index++;
          render();
        });
      });
    }

    stage.addEventListener("click", ()=>{
      flipped = !flipped;
      cardEl.classList.toggle("flipped", flipped);
      if(flipped) showRatingButtons();
      else actions.innerHTML = "";
    });
  }

  start();
  return { restart: start };
}
