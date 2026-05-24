import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/lib/uid';
import { chromeStorage, subscribeExternalChanges } from './storage';
import { defaultState } from './defaults';
import { compactColumn, migrateState } from './migrate';
import type { Bookmark, Board, State, Theme, TrashEntry, Workspace } from './types';
import { INBOX_NAME, MAX_COLS, STORAGE_KEY } from './types';

interface Actions {
  setActiveWs: (id: string) => void;
  addWorkspace: (name: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  deleteWorkspace: (id: string) => void;

  addBoard: (wsId: string, name: string, col: number, row: number) => void;
  renameBoard: (boardId: string, name: string) => void;
  deleteBoard: (boardId: string) => void;
  moveBoardTo: (boardId: string, col: number, row: number) => void;
  insertBoardAt: (boardId: string, targetCol: number, targetRow: number, before: boolean) => void;
  importBoards: (folders: Array<{ name: string; bookmarks: Bookmark[] }>) => void;

  addBookmark: (boardId: string, bm: Bookmark) => void;
  updateBookmark: (bmId: string, patch: Partial<Bookmark>) => void;
  deleteBookmark: (bmId: string) => void;
  moveBookmark: (
    bmId: string,
    fromBoardId: string,
    toBoardId: string,
    target: { bookmarkId: string; before: boolean } | null
  ) => void;

  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setPrivacy: (p: boolean) => void;
  setOpenInIncognito: (v: boolean) => void;
  setBgImage: (img: string | null) => void;
  reset: () => void;
  replaceState: (s: State) => void;

  restoreFromTrash: (entryId: string) => void;
  purgeFromTrash: (entryId: string) => void;
  emptyTrash: () => void;

  bulkDeleteBookmarks: (ids: string[]) => void;
  bulkMoveBookmarks: (ids: string[], toBoardId: string) => void;
}

type Store = State & Actions;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function findBoardIn(s: State, boardId: string): { ws: Workspace; board: Board } | null {
  for (const w of s.workspaces) {
    for (const b of w.boards) if (b.id === boardId) return { ws: w, board: b };
  }
  return null;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...defaultState(),

      setActiveWs: (id) => set({ activeWsId: id }),

      addWorkspace: (name) => {
        const ws: Workspace = {
          id: uid(),
          name,
          cols: MAX_COLS,
          boards: []
        };
        set({ workspaces: [...get().workspaces, ws], activeWsId: ws.id });
      },

      renameWorkspace: (id, name) => {
        set({
          workspaces: get().workspaces.map((w) => (w.id === id ? { ...w, name } : w))
        });
      },

      deleteWorkspace: (id) => {
        const s = get();
        if (s.workspaces.length <= 1) return;
        const left = s.workspaces.filter((w) => w.id !== id);
        set({
          workspaces: left,
          activeWsId: s.activeWsId === id ? left[0].id : s.activeWsId
        });
      },

      addBoard: (wsId, name, col, row) => {
        const next = clone(get());
        const ws = next.workspaces.find((w) => w.id === wsId);
        if (!ws) return;
        ws.boards.push({ id: uid(), name, col, row, bookmarks: [] });
        compactColumn(ws, col);
        set({ workspaces: next.workspaces });
      },

      renameBoard: (boardId, name) => {
        const next = clone(get());
        const found = findBoardIn(next, boardId);
        if (!found) return;
        found.board.name = name;
        set({ workspaces: next.workspaces });
      },

      deleteBoard: (boardId) => {
        const next = clone(get());
        const found = findBoardIn(next, boardId);
        if (!found) return;
        const col = found.board.col;
        const entry: TrashEntry = {
          id: uid(),
          deletedAt: Date.now(),
          kind: 'board',
          wsId: found.ws.id,
          data: clone(found.board)
        };
        found.ws.boards = found.ws.boards.filter((b) => b.id !== boardId);
        compactColumn(found.ws, col);
        set({ workspaces: next.workspaces, trash: [entry, ...next.trash] });
      },

      moveBoardTo: (boardId, col, row) => {
        const next = clone(get());
        const found = findBoardIn(next, boardId);
        if (!found) return;
        const oldCol = found.board.col;
        found.board.col = col;
        found.board.row = row;
        compactColumn(found.ws, col);
        if (oldCol !== col) compactColumn(found.ws, oldCol);
        set({ workspaces: next.workspaces });
      },

      insertBoardAt: (boardId, targetCol, targetRow, before) => {
        const next = clone(get());
        const found = findBoardIn(next, boardId);
        if (!found) return;
        const oldCol = found.board.col;
        found.board.col = targetCol;
        found.board.row = before ? targetRow - 0.5 : targetRow + 0.5;
        compactColumn(found.ws, targetCol);
        if (oldCol !== targetCol) compactColumn(found.ws, oldCol);
        set({ workspaces: next.workspaces });
      },

      importBoards: (folders) => {
        const next = clone(get());
        const ws = next.workspaces.find((w) => w.id === next.activeWsId);
        if (!ws) return;
        const occ = new Set(ws.boards.map((b) => `${b.col}-${b.row}`));
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
        set({ workspaces: next.workspaces });
      },

      addBookmark: (boardId, bm) => {
        const next = clone(get());
        const found = findBoardIn(next, boardId);
        if (!found) return;
        found.board.bookmarks.push(bm);
        set({ workspaces: next.workspaces });
      },

      updateBookmark: (bmId, patch) => {
        const next = clone(get());
        for (const w of next.workspaces) {
          for (const b of w.boards) {
            const idx = b.bookmarks.findIndex((x) => x.id === bmId);
            if (idx !== -1) {
              b.bookmarks[idx] = { ...b.bookmarks[idx], ...patch };
              set({ workspaces: next.workspaces });
              return;
            }
          }
        }
      },

      deleteBookmark: (bmId) => {
        const next = clone(get());
        for (const w of next.workspaces) {
          for (const b of w.boards) {
            const idx = b.bookmarks.findIndex((x) => x.id === bmId);
            if (idx !== -1) {
              const [removed] = b.bookmarks.splice(idx, 1);
              const entry: TrashEntry = {
                id: uid(),
                deletedAt: Date.now(),
                kind: 'bookmark',
                wsId: w.id,
                boardId: b.id,
                boardName: b.name,
                data: removed
              };
              set({ workspaces: next.workspaces, trash: [entry, ...next.trash] });
              return;
            }
          }
        }
      },

      moveBookmark: (bmId, fromBoardId, toBoardId, target) => {
        const next = clone(get());
        const src = findBoardIn(next, fromBoardId)?.board;
        const dst = findBoardIn(next, toBoardId)?.board;
        if (!src || !dst) return;
        const i = src.bookmarks.findIndex((b) => b.id === bmId);
        if (i === -1) return;
        const [bm] = src.bookmarks.splice(i, 1);
        if (!target) {
          dst.bookmarks.push(bm);
        } else {
          const idx = dst.bookmarks.findIndex((b) => b.id === target.bookmarkId);
          if (idx === -1) dst.bookmarks.push(bm);
          else dst.bookmarks.splice(target.before ? idx : idx + 1, 0, bm);
        }
        set({ workspaces: next.workspaces });
      },

      setTheme: (t) => set({ theme: t }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setPrivacy: (p) => set({ privacy: p }),
      setOpenInIncognito: (v) => set({ openInIncognito: v }),
      setBgImage: (img) => set({ bgImage: img }),
      reset: () => set({ ...defaultState() }),
      replaceState: (s) => set({ ...s }),

      restoreFromTrash: (entryId) => {
        const next = clone(get());
        const idx = next.trash.findIndex((e) => e.id === entryId);
        if (idx === -1) return;
        const entry = next.trash[idx];
        const ws = next.workspaces.find((w) => w.id === entry.wsId) ?? next.workspaces[0];
        if (!ws) return;

        if (entry.kind === 'bookmark') {
          // целевая доска: оригинальная, если жива, иначе Inbox (создаём при отсутствии)
          let board = ws.boards.find((b) => b.id === entry.boardId);
          if (!board) {
            board = ws.boards.find((b) => b.name === INBOX_NAME);
          }
          if (!board) {
            const occ = new Set(ws.boards.map((b) => `${b.col}-${b.row}`));
            let col = 0;
            let row = 0;
            outer: for (let r = 0; r < 100; r++) {
              for (let c = 0; c < ws.cols; c++) {
                if (!occ.has(`${c}-${r}`)) {
                  col = c;
                  row = r;
                  break outer;
                }
              }
            }
            board = { id: uid(), name: INBOX_NAME, col, row, bookmarks: [] };
            ws.boards.push(board);
          }
          board.bookmarks.unshift(entry.data);
        } else {
          // restore board в свою колонку, в конец
          const restored = clone(entry.data);
          const col = Math.max(0, Math.min(ws.cols - 1, restored.col));
          const lastRow = ws.boards
            .filter((b) => b.col === col)
            .reduce((m, b) => Math.max(m, b.row), -1);
          restored.col = col;
          restored.row = lastRow + 1;
          ws.boards.push(restored);
          compactColumn(ws, col);
        }

        next.trash.splice(idx, 1);
        set({ workspaces: next.workspaces, trash: next.trash });
      },

      purgeFromTrash: (entryId) => {
        set({ trash: get().trash.filter((e) => e.id !== entryId) });
      },

      emptyTrash: () => {
        set({ trash: [] });
      },

      bulkDeleteBookmarks: (ids) => {
        if (!ids.length) return;
        const next = clone(get());
        const idSet = new Set(ids);
        const now = Date.now();
        const newEntries: TrashEntry[] = [];
        for (const w of next.workspaces) {
          for (const b of w.boards) {
            const kept: Bookmark[] = [];
            for (const bm of b.bookmarks) {
              if (idSet.has(bm.id)) {
                newEntries.push({
                  id: uid(),
                  deletedAt: now,
                  kind: 'bookmark',
                  wsId: w.id,
                  boardId: b.id,
                  boardName: b.name,
                  data: bm
                });
              } else {
                kept.push(bm);
              }
            }
            b.bookmarks = kept;
          }
        }
        if (!newEntries.length) return;
        set({ workspaces: next.workspaces, trash: [...newEntries, ...next.trash] });
      },

      bulkMoveBookmarks: (ids, toBoardId) => {
        if (!ids.length) return;
        const next = clone(get());
        const idSet = new Set(ids);
        const dst = findBoardIn(next, toBoardId)?.board;
        if (!dst) return;
        // собираем в порядке исходного расположения
        const moved: Bookmark[] = [];
        for (const w of next.workspaces) {
          for (const b of w.boards) {
            const kept: Bookmark[] = [];
            for (const bm of b.bookmarks) {
              if (idSet.has(bm.id) && b.id !== toBoardId) moved.push(bm);
              else kept.push(bm);
            }
            if (b.id !== toBoardId) b.bookmarks = kept;
          }
        }
        // в destination — те которые там уже были (могут быть в idSet) переставляем в конец
        const dstKeep: Bookmark[] = [];
        const dstMove: Bookmark[] = [];
        for (const bm of dst.bookmarks) {
          if (idSet.has(bm.id)) dstMove.push(bm);
          else dstKeep.push(bm);
        }
        dst.bookmarks = [...dstKeep, ...dstMove, ...moved];
        set({ workspaces: next.workspaces });
      }
    }),
    {
      name: STORAGE_KEY,
      storage: chromeStorage,
      version: 1,
      partialize: (s): State => ({
        theme: s.theme,
        privacy: s.privacy,
        openInIncognito: s.openInIncognito,
        bgImage: s.bgImage,
        activeWsId: s.activeWsId,
        workspaces: s.workspaces,
        trash: s.trash
      }),
      migrate: (persisted) => {
        if (!persisted) return defaultState();
        return migrateState(persisted as State);
      },
      onRehydrateStorage: () => (s) => {
        if (s) migrateState(s);
      }
    }
  )
);

/** Inbox helper — нужен и UI, и background-worker (но bg использует chrome.storage напрямую). */
export function ensureInbox(ws: Workspace): Board {
  let inbox = ws.boards.find((b) => b.name === INBOX_NAME);
  if (inbox) return inbox;
  const occ = new Set(ws.boards.map((b) => `${b.col}-${b.row}`));
  for (let r = 0; r < 100; r++) {
    for (let c = 0; c < ws.cols; c++) {
      if (!occ.has(`${c}-${r}`)) {
        inbox = { id: uid(), name: INBOX_NAME, col: c, row: r, bookmarks: [] };
        ws.boards.push(inbox);
        return inbox;
      }
    }
  }
  inbox = { id: uid(), name: INBOX_NAME, col: 0, row: 0, bookmarks: [] };
  ws.boards.push(inbox);
  return inbox;
}

/** Подписка на изменения storage из background-worker'а. */
export function attachExternalSync(): () => void {
  return subscribeExternalChanges((next) => {
    useStore.getState().replaceState(migrateState(next));
  });
}
