/* =========================================================================
   QUIZ ENGINE — builds multiple-choice questions from a chapter's
   extracted glossary terms (definition shown, pick the matching term).
   ========================================================================= */

function progressRing(pct, color, size){
  size = size || 46;
  const r = (size/2) - 4;
  const c = 2*Math.PI*r;
  const offset = c - (pct/100)*c;
  return `<svg class="progress-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="4"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="4"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
      transform="rotate(-90 ${size/2} ${size/2})"/>
    <text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle" font-family="IBM Plex Mono, monospace" font-size="${size*0.28}" fill="var(--ink)">${Math.round(pct)}%</text>
  </svg>`;
}

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function buildQuizPool(terms, count){
  const usable = terms.filter(t=>t.def && t.def.length>0);
  const chosen = shuffle(usable).slice(0, count || usable.length);
  return chosen.map(t=>{
    const distractorPool = usable.filter(o=>o.term!==t.term);
    const distractors = shuffle(distractorPool).slice(0,3).map(o=>o.term);
    const options = shuffle([t.term, ...distractors]);
    return {
      prompt: t.def,
      options,
      correctIndex: options.indexOf(t.term),
      term: t.term
    };
  });
}

function initQuiz(containerId, terms, accentColor, weekNum){
  const card = document.getElementById(containerId);
  const state = { pool: [], index: 0, correct: 0, answered: false };

  function start(n){
    state.pool = buildQuizPool(terms, n);
    state.index = 0;
    state.correct = 0;
    state.answered = false;
    render();
    updateMonitor();
  }

  function updateMonitor(){
    const qEl = document.getElementById("quiz-mon-question");
    const cEl = document.getElementById("quiz-mon-correct");
    const aEl = document.getElementById("quiz-mon-accuracy");
    const ringEl = document.getElementById("quiz-progress-ring");
    if(qEl) qEl.textContent = state.pool.length ? `${Math.min(state.index+1,state.pool.length)}/${state.pool.length}` : "0/0";
    if(cEl) cEl.textContent = state.correct;
    const pct = state.index>0 ? Math.round((state.correct/state.index)*100) : 0;
    if(aEl) aEl.textContent = state.index>0 ? pct+"%" : "—";
    if(ringEl) ringEl.innerHTML = progressRing(pct, accentColor || "var(--teal)", 52);
  }

  function render(){
    const { pool, index } = state;
    if(pool.length===0){
      card.innerHTML = `<div class="quiz-done"><h3>No terms yet</h3><p style="color:var(--ink-soft);font-size:0.9rem;">This chapter doesn't have glossary terms loaded.</p></div>`;
      return;
    }
    if(index >= pool.length){
      const pct = Math.round((state.correct/pool.length)*100);
      card.innerHTML = `
        <div class="quiz-done">
          <div class="quiz-tag">Set complete</div>
          <h3>Nice work.</h3>
          <div class="score-big">${state.correct}/${pool.length}</div>
          <div class="mono" style="color:var(--ink-soft);">${pct}% accuracy</div>
          <button class="btn-restart" id="btn-quiz-restart">Run again</button>
        </div>`;
      document.getElementById("btn-quiz-restart").addEventListener("click", ()=>start(pool.length));
      return;
    }
    const q = pool[index];
    const pct = Math.round((index/pool.length)*100);
    const letters = ["A","B","C","D","E","F"];
    card.innerHTML = `
      <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
      <div style="display:flex;align-items:center;gap:10px;">
        ${weekNum ? `<div class="chapter-icon-badge" style="width:32px;height:32px;border-radius:8px;">${(typeof WEEK_ICONS!=='undefined' ? weekIcon(weekNum, 18, accentColor) : '')}</div>` : ""}
        <div class="quiz-tag">Which term matches this definition?</div>
      </div>
      <div class="quiz-question">${q.prompt}</div>
      <div class="quiz-options" id="quiz-options">
        ${q.options.map((opt,i)=>`<button class="quiz-option" data-i="${i}"><span class="letter">${letters[i]}</span><span>${opt}</span></button>`).join("")}
      </div>
      <div class="quiz-feedback" id="quiz-feedback"></div>
      <div class="quiz-actions"><button class="btn-next" id="btn-quiz-next" disabled>Next question</button></div>`;

    document.querySelectorAll(".quiz-option").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        if(state.answered) return;
        state.answered = true;
        const chosen = parseInt(btn.dataset.i);
        document.querySelectorAll(".quiz-option").forEach(b=>b.disabled=true);
        if(chosen===q.correctIndex){
          btn.classList.add("correct");
          state.correct++;
        } else {
          btn.classList.add("incorrect");
          document.querySelector(`.quiz-option[data-i="${q.correctIndex}"]`).classList.add("correct");
        }
        const fb = document.getElementById("quiz-feedback");
        fb.className = "quiz-feedback show " + (chosen===q.correctIndex ? "correct-fb":"incorrect-fb");
        fb.textContent = (chosen===q.correctIndex ? "Correct — " : "Not quite — ") + q.term + " is the term for this definition.";
        document.getElementById("btn-quiz-next").disabled = false;
        updateMonitor();
      });
    });
    document.getElementById("btn-quiz-next").addEventListener("click", ()=>{
      state.index++;
      state.answered = false;
      render();
      updateMonitor();
    });
  }

  start(terms.length);
  return { restart: start };
}
