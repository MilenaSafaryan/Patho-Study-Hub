/* =========================================================================
   ICON SET — original, minimal stroke icons for each week's theme.
   All use currentColor so they inherit the week's accent color via CSS.
   ========================================================================= */

const WEEK_ICONS = {
  1: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="20" cy="20" r="12"/>
        <circle cx="20" cy="20" r="4.5"/>
        <path d="M29 29 L39 39"/>
      </svg>`, // magnifying glass over a cell — foundational concepts
  2: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M24 6 L38 12 V22 C38 32 32 39 24 42 C16 39 10 32 10 22 V12 Z"/>
        <path d="M24 16 C21 20 19 22 19 25 C19 27.8 21.2 30 24 30 C26.8 30 29 27.8 29 25 C29 22 27 20 24 16Z"/>
      </svg>`, // shield with a blood drop — immune & hematologic
  3: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M24 40 C10 30 6 22 6 15 C6 9.5 10.5 6 15 6 C19 6 22 8.5 24 12 C26 8.5 29 6 33 6 C37.5 6 42 9.5 42 15 C42 22 38 30 24 40Z"/>
        <path d="M8 22 H16 L19 15 L23 29 L27 20 L30 22 H40"/>
      </svg>`, // heart with a pulse trace — cardiac & BP
  4: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M24 6 V26"/>
        <path d="M24 14 C18 14 12 18 10 26 C8.5 32 10 40 14 41 C18 42 19 34 19 28 C19 24 21 20 24 20"/>
        <path d="M24 14 C30 14 36 18 38 26 C39.5 32 38 40 34 41 C30 42 29 34 29 28 C29 24 27 20 24 20"/>
      </svg>`, // paired lungs — pulmonary
  5: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="10" y="8" width="28" height="34" rx="2.5"/>
        <path d="M18 6 H30 V10 H18 Z" fill="currentColor" stroke="none"/>
        <path d="M16 20 L21 25 L32 15"/>
        <path d="M16 32 H32"/>
      </svg>`, // clipboard with a check — midterm review
  6: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 C14 10 12 14 12 19 C12 27 17 29 17 35 C17 39.5 20.5 42 25 42 C30 42 34 38.5 34 33 C34 27 29 25 29 19 C29 15 31 12 33 9"/>
        <circle cx="33" cy="9" r="3"/>
      </svg>`, // stomach/organ curve with an endocrine gland dot — GI/hepatobiliary/endocrine
  7: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 8 C13 8 9 13 9 18 C9 21 10.5 22.5 10.5 25 C10.5 28 8 29 8 32.5 C8 37 12 40 17 40 C19 40 20 38.5 20 37"/>
        <path d="M28 8 C35 8 39 13 39 18 C39 21 37.5 22.5 37.5 25 C37.5 28 40 29 40 32.5 C40 37 36 40 31 40 C29 40 28 38.5 28 37"/>
        <path d="M24 8 V40"/>
        <path d="M20 16 H28 M19 24 H29 M20 32 H28"/>
      </svg>`, // brain with a central nerve line — neuro/pain/musculoskeletal
};

function weekIcon(weekNum, size, color){
  const svg = WEEK_ICONS[weekNum] || WEEK_ICONS[1];
  return `<span class="week-icon" style="display:inline-flex;width:${size||28}px;height:${size||28}px;color:${color||'currentColor'};flex:none;">${svg}</span>`;
}
