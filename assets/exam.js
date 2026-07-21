/* =========================================================================
   PRACTICE EXAM ENGINE — sequential Q&A with reveal-answer + self-rating.
   Separate from the auto-generated chapter quizzes: pulled directly from
   the compiled Check-Your-Understanding exam set, one question at a time,
   no multiple choice — matches the actual exam format.
   ========================================================================= */

function initExam(containerId, questions, accentColor){
  const card = document.getElementById(containerId);
  const state = { pool: [], index: 0, gotIt: 0, revealed: false };

  function start(){
    state.pool = shuffle(questions);
    state.index = 0;
    state.gotIt = 0;
    state.revealed = false;
    render();
    updateMonitor();
  }

  function updateMonitor(){
    const qEl = document.getElementById("quiz-mon-question");
    const cEl = document.getElementById("quiz-mon-correct");
    const aEl = document.getElementById("quiz-mon-accuracy");
    const ringEl = document.getElementById("quiz-progress-ring");
    if(qEl) qEl.textContent = state.pool.length ? `${Math.min(state.index+1,state.pool.length)}/${state.pool.length}` : "0/0";
    if(cEl) cEl.textContent = state.gotIt;
    const pct = state.index>0 ? Math.round((state.gotIt/state.index)*100) : 0;
    if(aEl) aEl.textContent = state.index>0 ? pct+"%" : "—";
    if(ringEl) ringEl.innerHTML = progressRing(pct, accentColor || "var(--teal)", 52);
  }

  function render(){
    const { pool, index } = state;
    if(pool.length===0){
      card.innerHTML = `<div class="quiz-done"><h3>No questions yet</h3></div>`;
      return;
    }
    if(index >= pool.length){
      const pct = Math.round((state.gotIt/pool.length)*100);
      card.innerHTML = `
        <div class="quiz-done">
          <div class="quiz-tag">Exam set complete</div>
          <h3>Nice work.</h3>
          <div class="score-big">${state.gotIt}/${pool.length}</div>
          <div class="mono" style="color:var(--ink-soft);">${pct}% self-rated correct</div>
          <button class="btn-restart" id="btn-exam-restart">Run again</button>
        </div>`;
      document.getElementById("btn-exam-restart").addEventListener("click", start);
      return;
    }
    const q = pool[index];
    const pct = Math.round((index/pool.length)*100);
    card.innerHTML = `
      <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
      <div class="quiz-tag">Practice exam question</div>
      <div class="quiz-question">${q.q}</div>
      <div class="quiz-feedback" id="exam-answer" style="margin-top:20px;"></div>
      <div class="quiz-actions" id="exam-actions" style="justify-content:space-between;">
        <button class="btn-outline btn" id="btn-reveal">Reveal answer</button>
      </div>`;

    document.getElementById("btn-reveal").addEventListener("click", ()=>{
      const ansEl = document.getElementById("exam-answer");
      ansEl.className = "quiz-feedback show correct-fb";
      ansEl.innerHTML = `<strong>Answer:</strong> ${q.a}`;
      document.getElementById("exam-actions").innerHTML = `
        <button class="btn-outline btn" id="btn-review">I need to review this</button>
        <button class="btn" id="btn-gotit">I got it right</button>`;
      document.getElementById("btn-gotit").addEventListener("click", ()=>{
        state.gotIt++;
        state.index++;
        render();
        updateMonitor();
      });
      document.getElementById("btn-review").addEventListener("click", ()=>{
        state.index++;
        render();
        updateMonitor();
      });
    });
  }

  start();
  return { restart: start };
}
