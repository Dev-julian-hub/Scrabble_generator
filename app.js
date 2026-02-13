const GRID_SIZE = 25;
const wordsInput = document.getElementById('wordsInput');
const wordInput = document.getElementById('wordInput');
const chipsEl = document.getElementById('wordChips');
const gridEl = document.getElementById('grid');
const statsEl = document.getElementById('stats');
const suggEl = document.getElementById('suggestions');

let wordsState = [];

const DICT = [
  'FAMILY','LOVE','HOME','HAPPY','SMILE','DREAM','PEACE','CHILL','CREATE','EXPLORE','ADVENTURE','RELAX',
  'TINO','MAMA','PAPA','DAD','MOM','HERZ','GLUECK','FREUDE','REISE','SONNE','NATUR','KREATIV',
  'PLA','PRINT','DRUCK','DESIGN','MAKER','POWER','TEAM','WEEKEND','PARTY','COFFEE','MUSIC','MOVIE',
  'GAMING','TOOLS','HOUSE','GARDEN','KITCHEN','OFFICE','IDEA','SMART','FOCUS','BALANCE','ENERGY'
];

function sanitizeWord(w){ return w.trim().toUpperCase().replace(/[^A-ZÄÖÜ]/g,''); }
function sanitizeWords(raw) { return [...new Set(raw.split(/\n|,|;/).map(sanitizeWord).filter(w=>w.length>1))]; }

function syncTextareaFromState(){ wordsInput.value = wordsState.join('\n'); }
function syncStateFromTextarea(){ wordsState = sanitizeWords(wordsInput.value); renderChips(); }

function renderChips(){
  chipsEl.innerHTML='';
  wordsState.forEach((w,idx)=>{
    const chip=document.createElement('span');
    chip.className='chip';
    chip.textContent=w;
    const x=document.createElement('button');
    x.textContent='×';
    x.onclick=()=>{ wordsState.splice(idx,1); syncTextareaFromState(); renderChips(); runBuild(); };
    chip.appendChild(x);
    chipsEl.appendChild(chip);
  });
}

function addWord(){
  const w=sanitizeWord(wordInput.value);
  if(!w || w.length<2) return;
  if(!wordsState.includes(w)) wordsState.push(w);
  wordInput.value='';
  syncTextareaFromState();
  renderChips();
  runBuild();
}

function emptyGrid() { return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('')); }

function canPlace(grid, word, r, c, dir) {
  if (dir === 'H' && c + word.length > GRID_SIZE) return false;
  if (dir === 'V' && r + word.length > GRID_SIZE) return false;
  if (r < 0 || c < 0) return false;
  for (let i = 0; i < word.length; i++) {
    const rr = dir === 'H' ? r : r + i;
    const cc = dir === 'H' ? c + i : c;
    const existing = grid[rr][cc];
    if (existing && existing !== word[i]) return false;
  }
  return true;
}

function place(grid, word, r, c, dir) {
  for (let i = 0; i < word.length; i++) {
    const rr = dir === 'H' ? r : r + i;
    const cc = dir === 'H' ? c + i : c;
    grid[rr][cc] = word[i];
  }
}

function allPlacedCells(grid) {
  const cells = [];
  for (let r = 0; r < GRID_SIZE; r++) for (let c = 0; c < GRID_SIZE; c++) if (grid[r][c]) cells.push({ r, c, ch: grid[r][c] });
  return cells;
}

function buildLayout(words) {
  const grid = emptyGrid();
  if (!words.length) return grid;

  const first = words[0];
  const r0 = Math.floor(GRID_SIZE / 2);
  const c0 = Math.max(0, Math.floor((GRID_SIZE - first.length) / 2));
  place(grid, first, r0, c0, 'H');

  let fallbackRow = 1;
  for (let wi = 1; wi < words.length; wi++) {
    const w = words[wi];
    let placed = false;

    const cells = allPlacedCells(grid);
    for (const cell of cells) {
      for (let i = 0; i < w.length; i++) {
        if (w[i] !== cell.ch) continue;
        let r = cell.r - i, c = cell.c;
        if (canPlace(grid, w, r, c, 'V')) { place(grid, w, r, c, 'V'); placed = true; break; }
        r = cell.r; c = cell.c - i;
        if (canPlace(grid, w, r, c, 'H')) { place(grid, w, r, c, 'H'); placed = true; break; }
      }
      if (placed) break;
    }

    if (!placed) {
      while (fallbackRow < GRID_SIZE - 1 && !canPlace(grid, w, fallbackRow, 1, 'H')) fallbackRow++;
      if (fallbackRow < GRID_SIZE - 1) place(grid, w, fallbackRow, 1, 'H');
      fallbackRow += 2;
    }
  }

  return grid;
}

function renderGrid(grid) {
  gridEl.innerHTML = '';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const ch = grid[r][c];
      const d = document.createElement('div');
      d.className = 'cell ' + (ch ? 'filled' : 'empty');
      d.textContent = ch;
      gridEl.appendChild(d);
    }
  }
}

function tileStats(words) {
  const counts = {};
  for (const w of words) for (const ch of w) counts[ch] = (counts[ch] || 0) + 1;
  const sorted = Object.entries(counts).sort((a,b) => a[0].localeCompare(b[0]));
  const total = sorted.reduce((s, [,n]) => s+n, 0);
  return { total, sorted };
}

function suggest(words) {
  const used = new Set(words.join('').split(''));
  const existing = new Set(words);
  const scored = DICT.filter(w => !existing.has(w)).map(w => {
      const uniq = new Set(w.split('')); let overlap = 0; uniq.forEach(ch => { if (used.has(ch)) overlap++; });
      return { w, overlap, len: w.length };
    })
    .filter(x => x.overlap > 0)
    .sort((a,b) => b.overlap - a.overlap || b.len - a.len)
    .slice(0, 12);

  suggEl.innerHTML = '';
  scored.forEach(s => {
    const li = document.createElement('li');
    li.textContent = `${s.w} (Match: ${s.overlap})`;
    li.onclick = () => { if(!wordsState.includes(s.w)){ wordsState.push(s.w); syncTextareaFromState(); renderChips(); runBuild(); } };
    li.style.cursor='pointer';
    suggEl.appendChild(li);
  });
}

function runBuild() {
  syncStateFromTextarea();
  const grid = buildLayout(wordsState);
  renderGrid(grid);
  const st = tileStats(wordsState);
  statsEl.textContent = `Wörter: ${wordsState.length}\nTiles gesamt: ${st.total}\nVerteilung: ${st.sorted.map(([k,v]) => `${k}:${v}`).join('  ')}`;
}

document.getElementById('buildBtn').addEventListener('click', runBuild);
document.getElementById('suggestBtn').addEventListener('click', () => suggest(wordsState));
document.getElementById('addWordBtn').addEventListener('click', addWord);
document.getElementById('clearBtn').addEventListener('click', () => { wordsState=[]; syncTextareaFromState(); renderChips(); runBuild(); });
wordInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); addWord(); } });
wordsInput.addEventListener('input', runBuild);

wordsState = ['EXPLORE','CREATE','ADVENTURE','RELAX','HAPPY'];
syncTextareaFromState();
renderChips();
runBuild();
