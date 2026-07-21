/* =========================================================================
   CHAPTER ROADMAP — renders each chapter's real section outline as a
   connected flow diagram, so the sequence of concepts is visible at a
   glance before diving into the full study guide.
   ========================================================================= */

function renderChapterMap(containerId, outline, color){
  const el = document.getElementById(containerId);
  if(!el) return;
  if(!outline || outline.length===0){ el.style.display="none"; return; }

  const perRow = window.innerWidth < 700 ? 2 : 4;
  const rows = [];
  for(let i=0;i<outline.length;i+=perRow) rows.push(outline.slice(i,i+perRow));

  const nodeHtml = (label, idx) => `
    <div class="map-node">
      <div class="map-node-num">${String(idx+1).padStart(2,'0')}</div>
      <div class="map-node-label">${label}</div>
    </div>`;

  let idx = 0;
  const rowsHtml = rows.map((row, rIdx) => {
    const nodes = row.map(label => nodeHtml(label, idx++)).join(`<div class="map-arrow">&#8594;</div>`);
    const reversed = rIdx % 2 === 1;
    return `<div class="map-row${reversed ? ' reversed':''}">${nodes}</div>`;
  }).join(`<div class="map-drop">&#8595;</div>`);

  el.style.setProperty("--map-color", color);
  el.innerHTML = `<div class="map-title">Chapter map</div><div class="map-flow">${rowsHtml}</div>`;
}
