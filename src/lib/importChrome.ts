import { uid } from './uid';
import type { Bookmark } from '@/store/types';

export interface ImportFolder {
  name: string;
  bookmarks: Bookmark[];
}

export async function importChromeBookmarks(): Promise<ImportFolder[]> {
  if (typeof chrome === 'undefined' || !chrome.bookmarks) return [];
  const tree = await chrome.bookmarks.getTree();
  const folders: ImportFolder[] = [];
  const walk = (node: chrome.bookmarks.BookmarkTreeNode) => {
    if (!node.children) return;
    const bms: Bookmark[] = node.children
      .filter((c) => c.url)
      .map((c) => ({
        id: uid(),
        title: c.title || c.url || '',
        url: c.url!,
        favIconUrl: ''
      }));
    if (bms.length) folders.push({ name: node.title || 'Импорт', bookmarks: bms });
    node.children.forEach(walk);
  };
  tree.forEach(walk);
  return folders;
}
