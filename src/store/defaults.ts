import { uid } from '@/lib/uid';
import type { State } from './types';
import { MAX_COLS } from './types';

export function defaultState(): State {
  const wsId = uid();
  return {
    theme: 'dark',
    privacy: false,
    openInIncognito: false,
    animations: true,
    compact: false,
    showFavicons: true,
    showDescriptions: true,
    bgImage: null,
    activeWsId: wsId,
    trash: [],
    workspaces: [
      {
        id: wsId,
        name: 'Home',
        cols: MAX_COLS,
        boards: [
          { id: uid(), name: 'Frequently used', col: 0, row: 0, bookmarks: [] },
          { id: uid(), name: 'For studying', col: 1, row: 0, bookmarks: [] },
          { id: uid(), name: 'Videos and films', col: 2, row: 0, bookmarks: [] },
          { id: uid(), name: 'Work', col: 3, row: 0, bookmarks: [] }
        ]
      }
    ]
  };
}
