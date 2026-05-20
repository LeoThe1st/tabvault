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

export interface State {
  theme: Theme;
  privacy: boolean;
  bgImage: string | null;
  activeWsId: string;
  workspaces: Workspace[];
}

export const MAX_COLS = 4;
export const INBOX_NAME = 'Inbox';
export const STORAGE_KEY = 'state';
