/* =========================================================================
   PRACTICE EXAM ENGINE — real multiple choice, pulled directly from the
   compiled Check-Your-Understanding exam set (4 options, one correct).
   Separate from the auto-generated chapter quizzes.
   ========================================================================= */

function initExam(containerId, questions, accentColor){
  const card = document.getElementById(containerId);
  const state = { pool: [], index: 0, correct: 0, answered: false };

  function start(){
    state.pool = shuffle(questions);
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
      card.innerHTML = `<div class="quiz-done"><h3>No questions yet</h3></div>`;
      return;
    }
    if(index >= pool.length){
      const pct = Math.round((state.correct/pool.length)*100);
      card.innerHTML = `
        <div class="quiz-done">
          <div class="quiz-tag">Exam set complete</div>
          <h3>Nice work.</h3>
          <div class="score-big">${state.correct}/${pool.length}</div>
          <div class="mono" style="color:var(--ink-soft);">${pct}% accuracy</div>
          <button class="btn-restart" id="btn-exam-restart">Run again</button>
        </div>`;
      document.getElementById("btn-exam-restart").addEventListener("click", start);
      if(typeof celebrate === "function" && pct >= 60) celebrate(accentColor);
      return;
    }

    const q = pool[index];
    const pct = Math.round((index/pool.length)*100);
    const letters = ["A","B","C","D","E","F"];

    card.innerHTML = `
      <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
      <div class="quiz-tag">Practice exam question</div>
      <div class="quiz-question">${q.q}</div>
      <div class="quiz-options" id="exam-options">
        ${q.options.map((opt,i)=>`<button class="quiz-option" data-i="${i}"><span class="letter">${letters[i]}</span><span>${opt}</span></button>`).join("")}
      </div>
      <div class="quiz-feedback" id="exam-feedback"></div>
      <div class="quiz-actions"><button class="btn-next" id="btn-exam-next" disabled>Next question</button></div>`;

    document.querySelectorAll("#exam-options .quiz-option").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        if(state.answered) return;
        state.answered = true;
        const chosen = parseInt(btn.dataset.i);
        document.querySelectorAll("#exam-options .quiz-option").forEach(b=>b.disabled=true);

        const fb = document.getElementById("exam-feedback");
        if(chosen===q.correct){
          btn.classList.add("correct");
          state.correct++;
          fb.className = "quiz-feedback show correct-fb";
          fb.innerHTML = `<strong>Correct.</strong> ${q.options[q.correct]}`;
        } else {
          btn.classList.add("incorrect");
          document.querySelector(`#exam-options .quiz-option[data-i="${q.correct}"]`).classList.add("correct");
          fb.className = "quiz-feedback show incorrect-fb";
          fb.innerHTML = `<strong>Not quite.</strong> The correct answer is ${letters[q.correct]}: ${q.options[q.correct]}`;
        }
        document.getElementById("btn-exam-next").disabled = false;
        updateMonitor();
      });
    });

    document.getElementById("btn-exam-next").addEventListener("click", ()=>{
      state.index++;
      state.answered = false;
      render();
      updateMonitor();
    });
  }

  start();
  return { restart: start };
}
