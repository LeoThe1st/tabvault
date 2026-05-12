const STORAGE_KEY = 'state';
const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

const storage = {
  async get() {
    if (isExtension) {
      const { [STORAGE_KEY]: s } = await chrome.storage.local.get(STORAGE_KEY);
      return s;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  async set(s) {
    if (isExtension) return chrome.storage.local.set({ [STORAGE_KEY]: s });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }
};

const uid = () =>
  (crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2);

const MAX_COLS = 4;

function defaultState() {
  const wsId = uid();
  return {
    theme: 'dark',
    privacy: false,
    activeWsId: wsId,
    workspaces: [{
      id: wsId,
      name: 'Home',
      cols: MAX_COLS,
      boards: [
        { id: uid(), name: 'Frequently used',  col: 0, row: 0, bookmarks: [] },
        { id: uid(), name: 'For studying',     col: 1, row: 0, bookmarks: [] },
        { id: uid(), name: 'Videos and films', col: 2, row: 0, bookmarks: [] },
        { id: uid(), name: 'Work',             col: 3, row: 0, bookmarks: [] }
      ]
    }]
  };
}

function migrateWorkspace(ws) {
  // forward-migrate: columns[] → boards[] with col/row
  if (Array.isArray(ws.columns) && !Array.isArray(ws.boards)) {
    ws.boards = [];
    ws.columns.forEach((col, ci) => {
      (col.boards || []).forEach((b, ri) => {
        ws.boards.push({
          id: b.id || uid(),
          name: b.name,
          col: Math.min(ci, MAX_COLS - 1),
          row: ri,
          bookmarks: b.bookmarks || []
        });
      });
    });
    delete ws.columns;
  }
  if (!Array.isArray(ws.boards)) ws.boards = [];
  ws.cols = MAX_COLS;
  // clamp any out-of-range coords
  for (const b of ws.boards) {
    b.col = Math.max(0, Math.min(MAX_COLS - 1, b.col | 0));
    b.row = Math.max(0, b.row | 0);
  }
}

let state;
let drag = null; // { type: 'board'|'bm', id, fromCol?, fromBoard? }

async function load() {
  state = (await storage.get()) || defaultState();
  if (!state.workspaces?.length) state = defaultState();
  if (!state.workspaces.find(w => w.id === state.activeWsId)) {
    state.activeWsId = state.workspaces[0].id;
  }
  for (const w of state.workspaces) {
    migrateWorkspace(w);
    for (let c = 0; c < w.cols; c++) compactColumn(w, c);
  }
}
async function save() { await storage.set(state); }

const activeWs = () => state.workspaces.find(w => w.id === state.activeWsId);

function findBoard(boardId) {
  for (const w of state.workspaces)
    for (const b of w.boards)
      if (b.id === boardId) return { ws: w, board: b };
  return null;
}

function faviconFor(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch { return ''; }
}

/* ===== Render ===== */
function render() {
  document.body.dataset.theme = state.theme;
  document.body.classList.toggle('privacy', state.privacy);
  renderTabs();
  renderCanvas();
  renderMenu();
}

function renderTabs() {
  const nav = document.getElementById('wsTabs');
  nav.innerHTML = '';
  for (const w of state.workspaces) {
    const btn = document.createElement('button');
    btn.className = 'ws-tab' + (w.id === state.activeWsId ? ' active' : '');
    btn.innerHTML = `<span class="ws-name"></span><span class="ws-chev" role="button" tabindex="0" title="Меню страницы"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>`;
    btn.querySelector('.ws-name').textContent = w.name;
    btn.addEventListener('click', e => {
      if (e.target.closest('.ws-chev')) return;
      state.activeWsId = w.id;
      save(); render();
    });
    btn.querySelector('.ws-chev').addEventListener('click', e => {
      e.stopPropagation();
      openWorkspaceMenu(btn, w);
    });
    nav.appendChild(btn);
  }
}

function openWorkspaceMenu(tabBtn, ws) {
  document.querySelectorAll('.board-menu').forEach(m => m.remove());
  document.querySelectorAll('.ws-tab.menu-open').forEach(t => t.classList.remove('menu-open'));
  tabBtn.classList.add('menu-open');

  const menu = document.createElement('div');
  menu.className = 'board-menu';
  const canDelete = state.workspaces.length > 1;
  menu.innerHTML = `
    <button data-act="rename">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      Rename
    </button>
    <button data-act="share">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      Share Page
    </button>
    <div class="sep"></div>
    <button data-act="delete" class="danger" ${canDelete ? '' : 'disabled style="opacity:0.4;cursor:not-allowed"'}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
      Delete
    </button>`;
  document.body.appendChild(menu);
  const rect = tabBtn.getBoundingClientRect();
  const w = menu.offsetWidth;
  menu.style.top = (rect.bottom + 6) + 'px';
  menu.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, rect.left)) + 'px';

  const close = () => {
    menu.remove();
    tabBtn.classList.remove('menu-open');
    document.removeEventListener('mousedown', onDoc);
  };
  const onDoc = e => { if (!menu.contains(e.target) && !tabBtn.contains(e.target)) close(); };
  setTimeout(() => document.addEventListener('mousedown', onDoc), 0);

  menu.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn || btn.disabled) return;
    const act = btn.dataset.act;
    close();
    if (act === 'rename') {
      const name = await showPrompt({ title: 'Rename Page', label: 'Page Name', required: true, value: ws.name });
      if (name) { ws.name = name; save(); render(); }
    } else if (act === 'share') {
      const data = JSON.stringify({ name: ws.name, cols: ws.cols, boards: ws.boards }, null, 2);
      try { await navigator.clipboard.writeText(data); await showAlert({ title: 'Share Page', message: 'JSON страницы скопирован в буфер обмена.' }); }
      catch { await showAlert({ title: 'Share Page', message: data }); }
    } else if (act === 'delete') {
      const ok = await showConfirm({ title: 'Delete Page', message: `Удалить страницу "${ws.name}" со всеми досками?`, confirmLabel: 'Delete', danger: true });
      if (!ok) return;
      state.workspaces = state.workspaces.filter(x => x.id !== ws.id);
      if (state.activeWsId === ws.id) state.activeWsId = state.workspaces[0].id;
      save(); render();
    }
  });
}

function renderCanvas() {
  const canvas = document.getElementById('canvas');

  // FLIP — snapshot positions before clearing
  const before = {};
  for (const el of canvas.querySelectorAll('.board[data-id]')) {
    before[el.dataset.id] = el.getBoundingClientRect();
  }

  canvas.innerHTML = '';
  const ws = activeWs();
  canvas.style.setProperty('--cols', ws.cols);

  const occupied = new Set();
  let maxRow = -1;
  for (const b of ws.boards) {
    occupied.add(`${b.col}-${b.row}`);
    if (b.row > maxRow) maxRow = b.row;
  }

  // boards positioned in the grid
  for (const board of ws.boards) {
    const node = renderBoard(board);
    node.style.gridColumnStart = String(board.col + 1);
    node.style.gridRowStart = String(board.row + 1);
    canvas.appendChild(node);
  }

  // empty-canvas edge case — single starter cell
  if (ws.boards.length === 0) {
    canvas.appendChild(makeCell(0, 0, true));
    return;
  }

  // Visible (ghost) placeholders are limited to:
  //   1) bottom of each column with boards — extends a column downward
  //   2) row-0 cells immediately to the right of any row-0 board — fills gaps and grows rightward
  const lastRowInCol = Array.from({ length: ws.cols }, () => -1);
  const row0Set = new Set();
  for (const b of ws.boards) {
    if (b.row > lastRowInCol[b.col]) lastRowInCol[b.col] = b.row;
    if (b.row === 0) row0Set.add(b.col);
  }
  const nearKeys = new Set();
  for (let c = 0; c < ws.cols; c++) {
    if (lastRowInCol[c] >= 0) nearKeys.add(`${c}-${lastRowInCol[c] + 1}`);
  }
  for (let c = 1; c < ws.cols; c++) {
    if (!row0Set.has(c) && row0Set.has(c - 1)) nearKeys.add(`${c}-0`);
  }

  const totalRows = Math.max(1, maxRow + 2);
  for (let c = 0; c < ws.cols; c++) {
    for (let r = 0; r < totalRows; r++) {
      const key = `${c}-${r}`;
      if (occupied.has(key)) continue;
      canvas.appendChild(makeCell(c, r, nearKeys.has(key)));
    }
  }

  // FLIP — animate boards from their old positions to the new ones
  requestAnimationFrame(() => {
    for (const el of canvas.querySelectorAll('.board[data-id]')) {
      const id = el.dataset.id;
      const prev = before[id];
      if (!prev) continue;
      const cur = el.getBoundingClientRect();
      const dx = prev.left - cur.left;
      const dy = prev.top - cur.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform 320ms cubic-bezier(.2,.7,.2,1)';
        el.style.transform = '';
        el.addEventListener('transitionend', () => {
          el.style.transition = '';
          el.style.transform = '';
        }, { once: true });
      });
    }
  });
}

function makeCell(col, row, near) {
  const el = document.createElement('button');
  el.className = 'cell' + (near ? ' near' : '');
  el.dataset.col = col;
  el.dataset.row = row;
  el.style.gridColumnStart = String(col + 1);
  el.style.gridRowStart = String(row + 1);
  el.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg><span>ADD BOARD</span>`;
  el.addEventListener('click', async () => {
    const name = await showPrompt({ title: 'New Board', label: 'Board Name', required: true });
    if (!name) return;
    activeWs().boards.push({ id: uid(), name, col, row, bookmarks: [] });
    save(); render();
  });
  el.addEventListener('dragover', e => {
    if (drag?.type !== 'board') return;
    e.preventDefault();
    clearBoardDropMarks();
    el.classList.add('drag-over');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', e => {
    if (drag?.type !== 'board') return;
    e.preventDefault();
    el.classList.remove('drag-over');
    moveBoardTo(drag.id, col, row);
  });
  return el;
}

function renderBoard(board) {
  const node = document.getElementById('boardTpl').content.firstElementChild.cloneNode(true);
  node.dataset.id = board.id;
  node.querySelector('.board-name').textContent = board.name;

  node.querySelector('.board-act-add').addEventListener('click', e => {
    e.stopPropagation();
    openInlineAdd(node, board);
  });
  node.querySelector('.board-act-menu').addEventListener('click', e => {
    e.stopPropagation();
    openBoardMenu(e.currentTarget, node, board);
  });

  const list = node.querySelector('.board-list');
  for (const bm of board.bookmarks) {
    list.appendChild(renderBookmark(bm, board));
  }

  // Board-on-board drop: insert before/after this board within its column
  node.addEventListener('dragover', e => {
    if (drag?.type !== 'board' || drag.id === board.id) return;
    e.preventDefault();
    e.stopPropagation();
    clearBoardDropMarks();
    const r = node.getBoundingClientRect();
    const before = (e.clientY - r.top) < r.height / 2;
    node.classList.add(before ? 'drop-before' : 'drop-after');
  });
  node.addEventListener('dragleave', () => {
    node.classList.remove('drop-before', 'drop-after');
  });
  node.addEventListener('drop', e => {
    if (drag?.type !== 'board' || drag.id === board.id) return;
    e.preventDefault();
    e.stopPropagation();
    const r = node.getBoundingClientRect();
    const before = (e.clientY - r.top) < r.height / 2;
    node.classList.remove('drop-before', 'drop-after');
    insertBoardAt(drag.id, board.col, board.row, before);
  });

  // Bookmark drop target on the list
  list.addEventListener('dragover', e => {
    if (drag?.type !== 'bm') return;
    e.preventDefault();
    clearBmDropMarks();
    const items = [...list.querySelectorAll('.bm')];
    if (!items.length) { list.classList.add('bm-drag-over'); return; }
    list.classList.remove('bm-drag-over');
    const target = findInsertTarget(items, e.clientY);
    if (target.node) target.node.classList.add(target.before ? 'drop-before' : 'drop-after');
  });
  list.addEventListener('dragleave', () => list.classList.remove('bm-drag-over'));
  list.addEventListener('drop', e => {
    if (drag?.type !== 'bm') return;
    e.preventDefault();
    list.classList.remove('bm-drag-over');
    const items = [...list.querySelectorAll('.bm')];
    const target = items.length ? findInsertTarget(items, e.clientY) : null;
    clearBmDropMarks();
    moveBookmark(drag.id, drag.fromBoard, board.id, target);
  });

  // Board drag — armed when mousedown on the header (title area)
  const head = node.querySelector('.board-head');
  const disarm = () => {
    node.draggable = false;
    node.classList.remove('draggable-on');
  };
  head.addEventListener('mousedown', e => {
    if (e.target.closest('.board-actions')) return;
    node.draggable = true;
    node.classList.add('draggable-on');
  });
  document.addEventListener('mouseup', () => {
    if (!node.classList.contains('dragging')) disarm();
  });

  node.addEventListener('dragstart', e => {
    if (!node.draggable) { e.preventDefault(); return; }
    drag = { type: 'board', id: board.id };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', board.id);
    node.classList.add('dragging');
    document.getElementById('canvas').classList.add('dragging-board');
  });
  node.addEventListener('dragend', () => {
    node.classList.remove('dragging');
    disarm();
    drag = null;
    clearBoardDropMarks();
    document.getElementById('canvas').classList.remove('dragging-board');
  });

  return node;
}

function renderBookmark(bm, parentBoard) {
  const node = document.getElementById('bmTpl').content.firstElementChild.cloneNode(true);
  node.dataset.id = bm.id;
  const link = node.querySelector('.bm-link');
  link.href = bm.url;
  const icon = node.querySelector('.bm-icon');
  icon.src = bm.favIconUrl || faviconFor(bm.url);
  icon.onerror = () => { icon.style.visibility = 'hidden'; };
  node.querySelector('.bm-title').textContent = bm.title || bm.url;
  const descEl = node.querySelector('.bm-desc');
  if (descEl) descEl.textContent = bm.description || '';
  if (bm.description) link.title = bm.description;

  link.addEventListener('click', e => {
    e.preventDefault();
    window.open(bm.url, '_self');
  });

  node.querySelector('.bm-menu').addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    openBookmarkMenu(e.currentTarget, node, bm, parentBoard);
  });

  node.addEventListener('dragstart', e => {
    e.stopPropagation(); // don't trigger board drag
    drag = { type: 'bm', id: bm.id, fromBoard: parentBoard.id };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bm.id);
    node.classList.add('dragging');
  });
  node.addEventListener('dragend', () => {
    node.classList.remove('dragging');
    drag = null;
    clearBmDropMarks();
  });

  return node;
}

/* ===== DnD helpers ===== */
function findInsertTarget(nodes, clientY) {
  for (const n of nodes) {
    const r = n.getBoundingClientRect();
    const mid = r.top + r.height / 2;
    if (clientY < mid) return { node: n, before: true };
  }
  return { node: nodes[nodes.length - 1], before: false };
}
function clearBoardDropMarks() {
  document.querySelectorAll('.cell.drag-over').forEach(n => n.classList.remove('drag-over'));
}
function clearBmDropMarks() {
  document.querySelectorAll('.bm.drop-before, .bm.drop-after')
    .forEach(n => n.classList.remove('drop-before', 'drop-after'));
  document.querySelectorAll('.board-list.bm-drag-over').forEach(n => n.classList.remove('bm-drag-over'));
}

function compactColumn(ws, col) {
  ws.boards
    .filter(b => b.col === col)
    .sort((a, b) => a.row - b.row)
    .forEach((b, i) => { b.row = i; });
}

function moveBoardTo(boardId, col, row) {
  const found = findBoard(boardId);
  if (!found) return;
  const oldCol = found.board.col;
  found.board.col = col;
  found.board.row = row;
  compactColumn(found.ws, col);
  if (oldCol !== col) compactColumn(found.ws, oldCol);
  save(); render();
}

function insertBoardAt(boardId, targetCol, targetRow, before) {
  const found = findBoard(boardId);
  if (!found) return;
  const oldCol = found.board.col;
  found.board.col = targetCol;
  // fractional row guarantees correct ordering after compaction
  found.board.row = before ? targetRow - 0.5 : targetRow + 0.5;
  compactColumn(found.ws, targetCol);
  if (oldCol !== targetCol) compactColumn(found.ws, oldCol);
  save(); render();
}

function moveBookmark(bmId, fromBoardId, toBoardId, target) {
  const src = findBoard(fromBoardId)?.board;
  const dst = findBoard(toBoardId)?.board;
  if (!src || !dst) return;
  const i = src.bookmarks.findIndex(b => b.id === bmId);
  if (i === -1) return;
  const bm = src.bookmarks.splice(i, 1)[0];
  if (!target || !target.node) { dst.bookmarks.push(bm); }
  else {
    const targetId = target.node.dataset.id;
    let idx = dst.bookmarks.findIndex(b => b.id === targetId);
    if (idx === -1) dst.bookmarks.push(bm);
    else dst.bookmarks.splice(target.before ? idx : idx + 1, 0, bm);
  }
  save(); render();
}

/* ===== Custom dialogs ===== */
function buildDialog(html) {
  const overlay = document.createElement('div');
  overlay.className = 'modal';
  overlay.innerHTML = `<div class="modal-card">${html}</div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  return overlay;
}
function closeDialog(overlay) {
  overlay.classList.remove('open');
  setTimeout(() => overlay.remove(), 180);
}

function showPrompt({ title, label, value = '', placeholder = '', required = false, primaryLabel = 'Save' }) {
  return new Promise(resolve => {
    const overlay = buildDialog(`
      <h2>${escapeHtml(title)}</h2>
      <label><span>${escapeHtml(label)}${required ? '<span class="d-req">*</span>' : ''}</span>
        <input type="text" class="d-inp" placeholder="${escapeHtml(placeholder)}">
      </label>
      <div class="modal-actions">
        <button class="btn-ghost d-cancel">Cancel</button>
        <button class="btn-primary d-save">${escapeHtml(primaryLabel)}</button>
      </div>`);
    const inp = overlay.querySelector('.d-inp');
    inp.value = value;
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
    const done = (v) => { closeDialog(overlay); resolve(v); };
    overlay.querySelector('.d-cancel').onclick = () => done(null);
    overlay.querySelector('.d-save').onclick = () => {
      const v = inp.value.trim();
      if (required && !v) { inp.focus(); return; }
      done(v || null);
    };
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') overlay.querySelector('.d-save').click();
      if (e.key === 'Escape') done(null);
    });
    overlay.addEventListener('click', e => { if (e.target === overlay) done(null); });
  });
}

function showConfirm({ title, message, confirmLabel = 'OK', danger = false }) {
  return new Promise(resolve => {
    const overlay = buildDialog(`
      <h2>${escapeHtml(title)}</h2>
      ${message ? `<p class="d-msg">${escapeHtml(message)}</p>` : ''}
      <div class="modal-actions">
        <button class="btn-ghost d-cancel">Cancel</button>
        <button class="${danger ? 'btn-danger-solid' : 'btn-primary'} d-ok">${escapeHtml(confirmLabel)}</button>
      </div>`);
    const done = (v) => { closeDialog(overlay); resolve(v); };
    overlay.querySelector('.d-cancel').onclick = () => done(false);
    overlay.querySelector('.d-ok').onclick = () => done(true);
    overlay.addEventListener('click', e => { if (e.target === overlay) done(false); });
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') done(false);
      if (e.key === 'Enter') done(true);
    });
    setTimeout(() => overlay.querySelector('.d-ok').focus(), 30);
  });
}

function showAlert({ title, message }) {
  return new Promise(resolve => {
    const overlay = buildDialog(`
      <h2>${escapeHtml(title)}</h2>
      ${message ? `<p class="d-msg">${escapeHtml(message)}</p>` : ''}
      <div class="modal-actions">
        <button class="btn-primary d-ok">OK</button>
      </div>`);
    const done = () => { closeDialog(overlay); resolve(); };
    overlay.querySelector('.d-ok').onclick = done;
    overlay.addEventListener('click', e => { if (e.target === overlay) done(); });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Enter') done(); });
    setTimeout(() => overlay.querySelector('.d-ok').focus(), 30);
  });
}

/* ===== Inline add-link flow ===== */
function closeInlineAdd(boardNode) {
  boardNode.querySelectorAll('.board-form, .fetching').forEach(n => n.remove());
  boardNode.classList.remove('form-open');
}

function openInlineAdd(boardNode, board) {
  closeInlineAdd(boardNode);
  boardNode.classList.add('form-open');
  renderAddStage1(boardNode, board);
}

function renderAddStage1(boardNode, board) {
  const form = document.createElement('div');
  form.className = 'board-form';
  form.innerHTML = `
    <input type="url" class="url-inp" placeholder="https://example.com" autocomplete="off">
    <div class="row">
      <button class="btn-primary save-btn">Add Link</button>
      <button class="btn-danger cancel-btn">Cancel</button>
    </div>`;
  boardNode.appendChild(form);
  const inp = form.querySelector('.url-inp');
  const save1 = form.querySelector('.save-btn');
  const cancel = form.querySelector('.cancel-btn');
  inp.focus();

  const submit = async () => {
    let url = inp.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    form.remove();
    const fetching = document.createElement('div');
    fetching.className = 'fetching';
    fetching.innerHTML = `<div class="spinner"></div><span>Fetching title…</span>`;
    boardNode.appendChild(fetching);
    const meta = await fetchTitleAndDesc(url);
    fetching.remove();
    renderAddStage3(boardNode, board, url, meta.title, meta.desc);
  };
  save1.addEventListener('click', submit);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    if (e.key === 'Escape') closeInlineAdd(boardNode);
  });
  cancel.addEventListener('click', () => closeInlineAdd(boardNode));
}

function renderAddStage3(boardNode, board, url, title, desc) {
  const form = document.createElement('div');
  form.className = 'board-form';
  form.innerHTML = `
    <input type="url" class="url-inp" readonly>
    <input type="text" class="title-inp" autocomplete="off">
    <textarea class="desc-inp" placeholder="Optional description (shown below title)" maxlength="2000"></textarea>
    <div class="counter"><span class="cnt">0</span>/2000</div>
    <div class="row">
      <button class="btn-primary save-btn">Add Link</button>
      <button class="btn-danger cancel-btn">Cancel</button>
    </div>`;
  boardNode.appendChild(form);
  form.querySelector('.url-inp').value = url;
  const titleEl = form.querySelector('.title-inp');
  const descEl = form.querySelector('.desc-inp');
  const cntEl = form.querySelector('.cnt');
  titleEl.value = title || url;
  descEl.value = desc || '';
  cntEl.textContent = descEl.value.length;
  setTimeout(() => { titleEl.focus(); titleEl.select(); }, 0);

  descEl.addEventListener('input', () => { cntEl.textContent = descEl.value.length; });

  const submit = () => {
    board.bookmarks.push({
      id: uid(),
      url,
      title: titleEl.value.trim() || url,
      description: descEl.value.trim(),
      favIconUrl: ''
    });
    closeInlineAdd(boardNode);
    save(); render();
  };
  form.querySelector('.save-btn').addEventListener('click', submit);
  form.querySelector('.cancel-btn').addEventListener('click', () => closeInlineAdd(boardNode));
  form.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeInlineAdd(boardNode);
    if (e.key === 'Enter' && e.target === titleEl) { e.preventDefault(); submit(); }
  });
}

async function fetchTitleAndDesc(url) {
  let host = url;
  try { host = new URL(url).hostname; } catch {}
  try {
    const r = await fetch(url, { redirect: 'follow', credentials: 'omit' });
    if (!r.ok) throw new Error('bad response');
    const html = await r.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const t = (doc.querySelector('title')?.textContent || '').trim();
    const d = (doc.querySelector('meta[name="description"]')?.getAttribute('content')
            || doc.querySelector('meta[property="og:description"]')?.getAttribute('content')
            || '').trim();
    return { title: t || host, desc: d };
  } catch {
    return { title: host, desc: '' };
  }
}

/* ===== Board menu ===== */
function openBoardMenu(triggerBtn, boardNode, board) {
  document.querySelectorAll('.board-menu').forEach(m => m.remove());
  document.querySelectorAll('.board.menu-open').forEach(b => b.classList.remove('menu-open'));
  boardNode.classList.add('menu-open');

  const menu = document.createElement('div');
  menu.className = 'board-menu';
  menu.innerHTML = `
    <button data-act="open-all">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6"/></svg>
      Open All Links
    </button>
    <button data-act="fetch-all">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>
      Fetch All Titles
    </button>
    <button data-act="edit">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      Edit Board
    </button>
    <button data-act="share">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      Share Board
    </button>
    <div class="sep"></div>
    <button data-act="delete" class="danger">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
      Delete Board
    </button>`;
  document.body.appendChild(menu);

  const rect = triggerBtn.getBoundingClientRect();
  const w = menu.offsetWidth;
  menu.style.top = (rect.bottom + 6) + 'px';
  menu.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, rect.right - w)) + 'px';

  const close = () => {
    menu.remove();
    boardNode.classList.remove('menu-open');
    document.removeEventListener('mousedown', onDoc);
  };
  const onDoc = (e) => { if (!menu.contains(e.target) && !triggerBtn.contains(e.target)) close(); };
  setTimeout(() => document.addEventListener('mousedown', onDoc), 0);

  menu.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    const act = btn?.dataset.act;
    if (!act) return;
    close();
    if (act === 'open-all') openAllLinks(board);
    else if (act === 'fetch-all') await fetchAllTitles(board);
    else if (act === 'edit') {
      const name = await showPrompt({ title: 'Edit Board', label: 'Board Name', required: true, value: board.name });
      if (name) { board.name = name; save(); render(); }
    }
    else if (act === 'share') await shareBoard(board);
    else if (act === 'delete') {
      const ok = await showConfirm({ title: 'Delete Board', message: `Удалить доску "${board.name}" со всеми закладками?`, confirmLabel: 'Delete', danger: true });
      if (ok) {
        const ws = activeWs();
        ws.boards = ws.boards.filter(b => b.id !== board.id);
        save(); render();
      }
    }
  });
}

function openAllLinks(board) {
  for (const bm of board.bookmarks) {
    if (isExtension && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: bm.url, active: false });
    } else {
      window.open(bm.url, '_blank');
    }
  }
}

async function fetchAllTitles(board) {
  for (const bm of board.bookmarks) {
    const { title, desc } = await fetchTitleAndDesc(bm.url);
    if (title) bm.title = title;
    if (desc && !bm.description) bm.description = desc;
    await save();
    render();
  }
}

function openBookmarkMenu(triggerBtn, bmNode, bm, parentBoard) {
  document.querySelectorAll('.board-menu').forEach(m => m.remove());
  document.querySelectorAll('.bm.menu-open').forEach(n => n.classList.remove('menu-open'));
  bmNode.classList.add('menu-open');

  const menu = document.createElement('div');
  menu.className = 'board-menu';
  menu.innerHTML = `
    <button data-act="edit">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      Edit
    </button>
    <div class="sep"></div>
    <button data-act="delete" class="danger">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
      Delete
    </button>`;
  document.body.appendChild(menu);
  const rect = triggerBtn.getBoundingClientRect();
  const w = menu.offsetWidth;
  menu.style.top = (rect.bottom + 6) + 'px';
  menu.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, rect.right - w)) + 'px';

  const close = () => {
    menu.remove();
    bmNode.classList.remove('menu-open');
    document.removeEventListener('mousedown', onDoc);
  };
  const onDoc = e => { if (!menu.contains(e.target) && !triggerBtn.contains(e.target)) close(); };
  setTimeout(() => document.addEventListener('mousedown', onDoc), 0);

  menu.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    const act = btn?.dataset.act;
    if (!act) return;
    close();
    if (act === 'edit') {
      openBookmarkEditModal(bm);
    } else if (act === 'delete') {
      const ok = await showConfirm({
        title: 'Delete Link',
        message: `Удалить закладку "${bm.title || bm.url}"?`,
        confirmLabel: 'Delete',
        danger: true
      });
      if (!ok) return;
      parentBoard.bookmarks = parentBoard.bookmarks.filter(b => b.id !== bm.id);
      save(); render();
    }
  });
}

function openBookmarkEditModal(bm) {
  const overlay = buildDialog(`
    <h2>Edit Link</h2>
    <label><span>URL</span><input type="url" class="d-url" readonly></label>
    <label><span>Title</span><input type="text" class="d-title" autocomplete="off"></label>
    <label><span>Description</span><textarea class="d-desc" maxlength="2000" rows="3"></textarea></label>
    <div class="modal-actions">
      <button class="btn-ghost d-cancel">Cancel</button>
      <button class="btn-primary d-save">Save</button>
    </div>`);
  overlay.querySelector('.d-url').value = bm.url;
  const titleEl = overlay.querySelector('.d-title');
  titleEl.value = bm.title || '';
  const descEl = overlay.querySelector('.d-desc');
  descEl.value = bm.description || '';
  setTimeout(() => { titleEl.focus(); titleEl.select(); }, 30);

  const close = (commit) => {
    if (commit) {
      bm.title = titleEl.value.trim() || bm.url;
      bm.description = descEl.value.trim();
      save(); render();
    }
    closeDialog(overlay);
  };
  overlay.querySelector('.d-cancel').onclick = () => close(false);
  overlay.querySelector('.d-save').onclick = () => close(true);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') close(false);
    if (e.key === 'Enter' && e.target === titleEl) { e.preventDefault(); close(true); }
  });
}

async function shareBoard(board) {
  const data = JSON.stringify({
    name: board.name,
    bookmarks: board.bookmarks.map(b => ({
      url: b.url, title: b.title, description: b.description || ''
    }))
  }, null, 2);
  try {
    await navigator.clipboard.writeText(data);
    await showAlert({ title: 'Share Board', message: 'JSON доски скопирован в буфер обмена.' });
  } catch {
    await showAlert({ title: 'Share Board', message: data });
  }
}

/* ===== Modals ===== */

/* ===== Menu actions ===== */
function renderMenu() {
  document.getElementById('themeLbl').textContent = state.theme === 'dark' ? 'тёмная' : 'светлая';
  document.getElementById('privacyLbl').textContent = state.privacy ? 'вкл' : 'выкл';
}

async function importChromeBookmarks() {
  if (!isExtension || !chrome.bookmarks) {
    await showAlert({ title: 'Импорт', message: 'Импорт доступен только в установленном расширении.' });
    return;
  }
  const tree = await chrome.bookmarks.getTree();
  const folders = [];
  function walk(node) {
    if (!node.children) return;
    const bms = node.children.filter(c => c.url).map(c => ({
      id: uid(),
      title: c.title || c.url,
      url: c.url,
      favIconUrl: ''
    }));
    if (bms.length) folders.push({ name: node.title || 'Импорт', bookmarks: bms });
    node.children.forEach(walk);
  }
  tree.forEach(walk);
  if (!folders.length) { await showAlert({ title: 'Импорт', message: 'Закладки не найдены.' }); return; }
  const ws = activeWs();
  // place new boards at the next-empty row of each column, round-robin
  const occ = new Set(ws.boards.map(b => `${b.col}-${b.row}`));
  const nextRow = Array.from({ length: ws.cols }, (_, c) => {
    let r = 0;
    while (occ.has(`${c}-${r}`)) r++;
    return r;
  });
  folders.forEach((f, i) => {
    const col = i % ws.cols;
    const row = nextRow[col]++;
    ws.boards.push({ id: uid(), name: f.name, col, row, bookmarks: f.bookmarks });
  });
  await save(); render();
  await showAlert({ title: 'Импорт', message: `Импортировано: ${folders.length} досок` });
}

/* ===== Search ===== */
function runSearch(q) {
  const out = document.getElementById('searchResults');
  out.innerHTML = '';
  const ql = q.trim().toLowerCase();
  if (!ql) return;
  const hits = [];
  for (const w of state.workspaces)
    for (const c of w.columns)
      for (const b of c.boards)
        for (const bm of b.bookmarks)
          if ((bm.title + ' ' + bm.url).toLowerCase().includes(ql))
            hits.push({ bm, ws: w, board: b });
  for (const h of hits.slice(0, 50)) {
    const a = document.createElement('a');
    a.className = 'bm';
    a.style.display = 'flex';
    a.style.padding = '6px 8px';
    a.style.textDecoration = 'none';
    a.style.color = 'inherit';
    a.href = h.bm.url;
    a.innerHTML = `<img class="bm-icon" src="${faviconFor(h.bm.url)}" style="margin-right:10px">
      <span class="bm-title">${escapeHtml(h.bm.title)}</span>
      <span style="margin-left:auto;color:var(--fg-mute);font-size:12px">${escapeHtml(h.ws.name)} / ${escapeHtml(h.board.name)}</span>`;
    out.appendChild(a);
  }
}
function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ===== Init ===== */
async function init() {
  await load();
  render();

  document.getElementById('wsAddBtn').addEventListener('click', async () => {
    const name = await showPrompt({ title: 'New Page', label: 'Page Name', required: true });
    if (!name) return;
    const w = {
      id: uid(), name,
      columns: [{ id: uid(), boards: [] }, { id: uid(), boards: [] }, { id: uid(), boards: [] }, { id: uid(), boards: [] }]
    };
    state.workspaces.push(w);
    state.activeWsId = w.id;
    save(); render();
  });

  document.getElementById('settingsBtn').addEventListener('click', () => {
    const m = document.getElementById('settingsMenu');
    m.hidden = !m.hidden;
  });
  document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('settingsMenu').hidden = !document.getElementById('settingsMenu').hidden;
  });
  document.getElementById('searchBtn').addEventListener('click', () => {
    const p = document.getElementById('searchPanel');
    p.hidden = !p.hidden;
    if (!p.hidden) document.getElementById('searchInput').focus();
  });
  document.getElementById('searchInput').addEventListener('input', e => runSearch(e.target.value));

  document.getElementById('settingsMenu').addEventListener('click', async (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    if (act === 'theme') { state.theme = state.theme === 'dark' ? 'light' : 'dark'; }
    else if (act === 'privacy') { state.privacy = !state.privacy; }
    else if (act === 'import') { await importChromeBookmarks(); return; }
    else if (act === 'reset') {
      const ok = await showConfirm({ title: 'Reset', message: 'Сбросить всё? Все доски и закладки будут удалены.', confirmLabel: 'Reset', danger: true });
      if (!ok) return;
      state = defaultState();
    }
    save(); render();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.getElementById('settingsMenu').hidden = true;
      document.getElementById('searchPanel').hidden = true;
    }
  });

  // Click outside settings menu closes it
  document.addEventListener('click', (e) => {
    const m = document.getElementById('settingsMenu');
    if (m.hidden) return;
    if (!m.contains(e.target) && !e.target.closest('#settingsBtn') && !e.target.closest('#menuBtn')) {
      m.hidden = true;
    }
  });

  if (isExtension && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[STORAGE_KEY]) {
        state = changes[STORAGE_KEY].newValue;
        render();
      }
    });
  }
}

init();
