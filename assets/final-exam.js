/* =========================================================================
   FINAL EXAM PREP — a cumulative, configurable practice run built on top
   of the same per-week practice exam questions, pooled together. Lets you
   pick which weeks to include and how many questions, runs a light
   countdown for exam-condition pressure, and breaks the results down by
   week at the end so you know exactly where to focus next.
   ========================================================================= */

const FinalExam = (function(){
  let allExams = {};
  let weeksData = {};
  let state = null;
  let timerInterval = null;

  function init(examData, chData){
    allExams = examData;
    weeksData = chData.weeks;
    renderConfig();
  }

  function renderConfig(){
    const el = document.getElementById("final-exam-root");
    const weekList = Object.values(weeksData).sort((a,b)=>a.num-b.num).filter(w => allExams[w.num]);

    el.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-tag">Set up your run</div>
        <div class="quiz-question" style="font-size:1.1rem;">Pick which weeks to include and how many questions.</div>

        <div class="fe-week-picker">
          ${weekList.map(wk => `
            <label class="fe-week-chip" style="--wk-color:${wk.color}">
              <input type="checkbox" class="fe-week-check" value="${wk.num}" checked>
              <span>Week ${wk.num} — ${wk.title} <span class="mono" style="opacity:.65;">(${allExams[wk.num].questions.length})</span></span>
            </label>`).join("")}
        </div>

        <div class="fe-config-row">
          <div>
            <label class="fe-label">Question count</label>
            <select id="fe-count-select" class="fe-select">
              <option value="25">25 questions</option>
              <option value="50" selected>50 questions</option>
              <option value="100">100 questions</option>
              <option value="all">All selected</option>
            </select>
          </div>
          <div>
            <label class="fe-label">Timer</label>
            <select id="fe-timer-select" class="fe-select">
              <option value="0">No timer</option>
              <option value="45" selected>45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
            </select>
          </div>
        </div>

        <div class="quiz-actions" style="margin-top:22px;">
          <button class="btn" id="fe-start-btn" style="width:100%;justify-content:center;">Start final exam prep</button>
        </div>
      </div>`;

    document.getElementById("fe-start-btn").addEventListener("click", startRun);
  }

  function startRun(){
    const checkedWeeks = Array.from(document.querySelectorAll(".fe-week-check:checked")).map(c=>parseInt(c.value));
    if(checkedWeeks.length===0){ alert("Pick at least one week."); return; }

    let pool = [];
    checkedWeeks.forEach(wk=>{
      (allExams[wk].questions || []).forEach(q => pool.push(Object.assign({}, q, { week: wk })));
    });
    pool = shuffle(pool);

    const countVal = document.getElementById("fe-count-select").value;
    if(countVal !== "all"){
      pool = pool.slice(0, parseInt(countVal));
    }

    const timerMin = parseInt(document.getElementById("fe-timer-select").value);

    state = {
      pool, index: 0, correct: 0, answered: false,
      weekStats: {}, // week -> {correct, total}
      timerEndsAt: timerMin > 0 ? Date.now() + timerMin*60000 : null,
      timeUp: false
    };
    checkedWeeks.forEach(wk => state.weekStats[wk] = { correct: 0, total: 0 });

    if(timerInterval) clearInterval(timerInterval);
    if(state.timerEndsAt){
      timerInterval = setInterval(updateTimer, 1000);
      updateTimer();
    }

    render();
  }

  function updateTimer(){
    const el = document.getElementById("fe-timer-display");
    if(!el || !state || !state.timerEndsAt) return;
    const remaining = state.timerEndsAt - Date.now();
    if(remaining <= 0){
      el.textContent = "Time's up";
      el.style.color = "var(--coral)";
      if(!state.timeUp){
        state.timeUp = true;
        const note = document.getElementById("fe-timeup-note");
        if(note) note.style.display = "block";
      }
      clearInterval(timerInterval);
      return;
    }
    const mins = Math.floor(remaining/60000);
    const secs = Math.floor((remaining%60000)/1000);
    el.textContent = `${mins}:${secs.toString().padStart(2,"0")}`;
  }

  function render(){
    const el = document.getElementById("final-exam-root");
    const { pool, index } = state;

    if(index >= pool.length){
      if(timerInterval) clearInterval(timerInterval);
      renderResults();
      return;
    }

    const q = pool[index];
    const pct = Math.round((index/pool.length)*100);
    const letters = ["A","B","C","D","E","F"];
    const wk = weeksData[q.week];

    el.innerHTML = `
      <div class="quiz-head" style="margin-bottom:10px;">
        <div class="quiz-monitor">
          <div><div class="m-label">Question</div><div class="m-value">${index+1}/${pool.length}</div></div>
          <div><div class="m-label">Score</div><div class="m-value">${state.correct}</div></div>
          ${state.timerEndsAt ? `<div><div class="m-label">Time left</div><div class="m-value" id="fe-timer-display" style="color:var(--accent);">--:--</div></div>` : ""}
        </div>
      </div>
      <div id="fe-timeup-note" class="quiz-feedback show incorrect-fb" style="display:${state.timeUp?'block':'none'};margin-bottom:14px;">Time's up — finish at your own pace, or check your score now with what you've answered.</div>
      <div class="quiz-card">
        <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
        <div class="quiz-tag" style="color:${wk ? wk.color : 'var(--teal)'}">Week ${q.week} · ${wk ? wk.title : ""}</div>
        <div class="quiz-question">${q.q}</div>
        <div class="quiz-options" id="fe-options">
          ${q.options.map((opt,i)=>`<button class="quiz-option" data-i="${i}"><span class="letter">${letters[i]}</span><span>${opt}</span></button>`).join("")}
        </div>
        <div class="quiz-feedback" id="fe-feedback"></div>
        <div class="quiz-actions"><button class="btn-next" id="fe-next-btn" disabled>Next question</button></div>
      </div>`;

    if(state.timerEndsAt) updateTimer();

    document.querySelectorAll("#fe-options .quiz-option").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        if(state.answered) return;
        state.answered = true;
        const chosen = parseInt(btn.dataset.i);
        document.querySelectorAll("#fe-options .quiz-option").forEach(b=>b.disabled=true);

        state.weekStats[q.week].total++;
        const fb = document.getElementById("fe-feedback");
        if(chosen===q.correct){
          btn.classList.add("correct");
          state.correct++;
          state.weekStats[q.week].correct++;
          fb.className = "quiz-feedback show correct-fb";
          fb.innerHTML = `<strong>Correct.</strong> ${q.options[q.correct]}`;
        } else {
          btn.classList.add("incorrect");
          document.querySelector(`#fe-options .quiz-option[data-i="${q.correct}"]`).classList.add("correct");
          fb.className = "quiz-feedback show incorrect-fb";
          fb.innerHTML = `<strong>Not quite.</strong> Correct answer: ${letters[q.correct]}: ${q.options[q.correct]}`;
        }
        document.getElementById("fe-next-btn").disabled = false;
      });
    });

    document.getElementById("fe-next-btn").addEventListener("click", ()=>{
      state.index++;
      state.answered = false;
      render();
    });
  }

  function renderResults(){
    const el = document.getElementById("final-exam-root");
    const { pool, correct, weekStats } = state;
    const pct = Math.round((correct/pool.length)*100);

    const weekRows = Object.keys(weekStats).map(Number).sort((a,b)=>a-b).map(wk=>{
      const s = weekStats[wk];
      if(s.total===0) return "";
      const wPct = Math.round((s.correct/s.total)*100);
      const info = weeksData[wk];
      return `
        <div class="fe-week-row">
          <div class="fe-week-row-label" style="color:${info.color}">Week ${wk} — ${info.title}</div>
          <div class="fe-week-row-bar-track"><div class="fe-week-row-bar" style="width:${wPct}%;background:${info.color}"></div></div>
          <div class="fe-week-row-pct mono">${s.correct}/${s.total} · ${wPct}%</div>
        </div>`;
    }).join("");

    const weakest = Object.keys(weekStats).map(Number)
      .filter(wk => weekStats[wk].total > 0)
      .sort((a,b) => (weekStats[a].correct/weekStats[a].total) - (weekStats[b].correct/weekStats[b].total))[0];

    el.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-done">
          <div class="quiz-tag">Final exam prep complete</div>
          <h3>Here's how it broke down.</h3>
          <div class="score-big">${correct}/${pool.length}</div>
          <div class="mono" style="color:var(--ink-soft);">${pct}% overall</div>
        </div>
        <div class="fe-week-breakdown">
          ${weekRows}
        </div>
        ${weakest !== undefined ? `<div class="callout" style="margin-top:18px;"><b>Focus tip:</b> your weakest area was Week ${weakest} — ${weeksData[weakest].title}. Worth another pass on that chapter's quiz or flashcards.</div>` : ""}
        <div class="quiz-actions" style="margin-top:20px;">
          <button class="btn" id="fe-restart-btn" style="width:100%;justify-content:center;">Set up another run</button>
        </div>
      </div>`;

    document.getElementById("fe-restart-btn").addEventListener("click", renderConfig);
    if(typeof celebrate === "function" && pct >= 60) celebrate();
  }

  return { init };
})();
