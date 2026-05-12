const STORAGE_KEY = 'state';
const INBOX_NAME = 'Inbox';
const MAX_COLS = 4;

const uid = () => crypto.randomUUID();

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-current-tab') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;
  await saveBookmark({
    title: tab.title || tab.url,
    url: tab.url,
    favIconUrl: tab.favIconUrl || ''
  });
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'newtab.html' });
});

async function saveBookmark(bm) {
  const { [STORAGE_KEY]: state } = await chrome.storage.local.get(STORAGE_KEY);
  const s = state || defaultState();
  const ws = s.workspaces.find(w => w.id === s.activeWsId) || s.workspaces[0];
  migrateWorkspace(ws);

  let inbox = ws.boards.find(b => b.name === INBOX_NAME);
  if (!inbox) {
    const occ = new Set(ws.boards.map(b => `${b.col}-${b.row}`));
    let placed = false;
    outer:
    for (let r = 0; r < 100 && !placed; r++) {
      for (let c = 0; c < ws.cols; c++) {
        if (!occ.has(`${c}-${r}`)) {
          inbox = { id: uid(), name: INBOX_NAME, col: c, row: r, bookmarks: [] };
          ws.boards.push(inbox);
          placed = true;
          break outer;
        }
      }
    }
    if (!inbox) {
      inbox = { id: uid(), name: INBOX_NAME, col: 0, row: 0, bookmarks: [] };
      ws.boards.push(inbox);
    }
  }
  inbox.bookmarks.unshift({
    id: uid(),
    title: bm.title,
    url: bm.url,
    favIconUrl: bm.favIconUrl
  });
  await chrome.storage.local.set({ [STORAGE_KEY]: s });
}

function migrateWorkspace(ws) {
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
}

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
      boards: [{ id: uid(), name: INBOX_NAME, col: 0, row: 0, bookmarks: [] }]
    }]
  };
}
