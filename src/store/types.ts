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

export type HotkeyAction =
  | 'search'
  | 'settings'
  | 'trash'
  | 'togglePrivacy'
  | 'toggleIncognito'
  | 'toggleSelection'
  | 'newBoard'
  | 'nextWs'
  | 'prevWs';

export type Hotkeys = Record<HotkeyAction, string | null>;

export const DEFAULT_HOTKEYS: Hotkeys = {
  search: 'Alt+K',
  settings: 'Alt+,',
  trash: null,
  togglePrivacy: 'Alt+Shift+P',
  toggleIncognito: null,
  toggleSelection: 'Alt+M',
  newBoard: 'Alt+N',
  nextWs: 'Alt+]',
  prevWs: 'Alt+['
};

export const HOTKEY_META: Record<HotkeyAction, { title: string; desc: string }> = {
  search: { title: 'Поиск', desc: 'Открыть/закрыть панель поиска' },
  settings: { title: 'Настройки', desc: 'Открыть это окно' },
  trash: { title: 'Корзина', desc: 'Открыть диалог удалённого' },
  togglePrivacy: { title: 'Privacy blur', desc: 'Включить/выключить размытие досок' },
  toggleIncognito: { title: 'Open in Incognito', desc: 'Переключить режим открытия в инкогнито' },
  toggleSelection: { title: 'Selection mode', desc: 'Войти/выйти из multi-select' },
  newBoard: { title: 'New board', desc: 'Создать доску в активной странице' },
  nextWs: { title: 'Next page', desc: 'Следующий workspace' },
  prevWs: { title: 'Previous page', desc: 'Предыдущий workspace' }
};

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
  openInIncognito: boolean;
  animations: boolean;
  compact: boolean;
  showFavicons: boolean;
  showDescriptions: boolean;
  bgImage: string | null;
  hotkeys: Hotkeys;
  activeWsId: string;
  workspaces: Workspace[];
  trash: TrashEntry[];
}

export const MAX_COLS = 4;
export const INBOX_NAME = 'Inbox';
export const STORAGE_KEY = 'state';
export const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
