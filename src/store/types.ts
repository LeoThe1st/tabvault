export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description?: string;
  favIconUrl?: string;
}

export interface Board {
  id: string;
  name: string;
  col: number;
  row: number;
  bookmarks: Bookmark[];
}

export interface Workspace {
  id: string;
  name: string;
  cols: number;
  boards: Board[];
  /** Legacy: ранее workspaces хранили columns[]; миграция переносит в boards[]. */
  columns?: LegacyColumn[];
}

export interface LegacyColumn {
  id?: string;
  boards?: Array<{
    id?: string;
    name: string;
    bookmarks?: Bookmark[];
  }>;
}

export type Theme = 'dark' | 'light';

export interface TrashedBookmark {
  id: string;
  deletedAt: number;
  kind: 'bookmark';
  wsId: string;
  boardId: string;
  boardName: string; // для отображения "откуда удалено"
  data: Bookmark;
}

export interface TrashedBoard {
  id: string;
  deletedAt: number;
  kind: 'board';
  wsId: string;
  data: Board;
}

export type TrashEntry = TrashedBookmark | TrashedBoard;

export interface State {
  theme: Theme;
  privacy: boolean;
  bgImage: string | null;
  activeWsId: string;
  workspaces: Workspace[];
  trash: TrashEntry[];
}

export const MAX_COLS = 4;
export const INBOX_NAME = 'Inbox';
export const STORAGE_KEY = 'state';
export const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
