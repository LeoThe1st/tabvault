import { uid } from './uid';
import { browser, isExtension } from './browser';
import type { Bookmark } from '@/store/types';

export interface ImportFolder {
  name: string;
  bookmarks: Bookmark[];
}

/** Импортирует закладки текущего браузера через WebExtension bookmarks API.
 *  Работает в Chrome/Edge/Firefox/Brave/Opera. */
export async function importChromeBookmarks(): Promise<ImportFolder[]> {
  if (!isExtension || !browser.bookmarks) return [];
  const tree = await browser.bookmarks.getTree();
  const folders: ImportFolder[] = [];

  interface TreeNode {
    title?: string;
    url?: string;
    children?: TreeNode[];
  }

  const walk = (node: TreeNode) => {
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
  tree.forEach(walk as (n: unknown) => void);
  return folders;
}
