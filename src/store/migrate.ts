import { uid } from '@/lib/uid';
import type { State, Workspace } from './types';
import { MAX_COLS, TRASH_TTL_MS } from './types';

export function migrateWorkspace(ws: Workspace): void {
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
  for (const b of ws.boards) {
    b.col = Math.max(0, Math.min(MAX_COLS - 1, b.col | 0));
    b.row = Math.max(0, b.row | 0);
  }
}

export function compactColumn(ws: Workspace, col: number): void {
  ws.boards
    .filter((b) => b.col === col)
    .sort((a, b) => a.row - b.row)
    .forEach((b, i) => {
      b.row = i;
    });
}

export function migrateState(s: State): State {
  if (!s.workspaces?.length) return s;
  if (!s.workspaces.find((w) => w.id === s.activeWsId)) {
    s.activeWsId = s.workspaces[0].id;
  }
  for (const w of s.workspaces) {
    migrateWorkspace(w);
    for (let c = 0; c < w.cols; c++) compactColumn(w, c);
  }
  if (!Array.isArray(s.trash)) s.trash = [];
  // авто-чистка корзины старше 30 дней
  const cutoff = Date.now() - TRASH_TTL_MS;
  s.trash = s.trash.filter((e) => e.deletedAt > cutoff);
  return s;
}
