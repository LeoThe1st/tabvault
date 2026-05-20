import { useEffect, useRef } from 'react';
import { useStore } from '@/store/store';
import { useDialogs } from '@/dialogs/DialogHost';
import { uid } from '@/lib/uid';

interface Props {
  onClose: () => void;
  anchor: HTMLElement | null;
}

export function SettingsMenu({ onClose, anchor }: Props) {
  const dialogs = useDialogs();
  const theme = useStore((s) => s.theme);
  const privacy = useStore((s) => s.privacy);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const setPrivacy = useStore((s) => s.setPrivacy);
  const importBoards = useStore((s) => s.importBoards);
  const reset = useStore((s) => s.reset);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (anchor?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchor, onClose]);

  const onImport = async () => {
    if (typeof chrome === 'undefined' || !chrome.bookmarks) {
      await dialogs.alert({
        title: 'Импорт',
        message: 'Импорт доступен только в установленном расширении.'
      });
      return;
    }
    const tree = await chrome.bookmarks.getTree();
    const folders: Array<{
      name: string;
      bookmarks: Array<{
        id: string;
        title: string;
        url: string;
        favIconUrl: string;
      }>;
    }> = [];
    const walk = (node: chrome.bookmarks.BookmarkTreeNode) => {
      if (!node.children) return;
      const bms = node.children
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
    if (!folders.length) {
      await dialogs.alert({ title: 'Импорт', message: 'Закладки не найдены.' });
      return;
    }
    importBoards(folders);
    await dialogs.alert({
      title: 'Импорт',
      message: `Импортировано: ${folders.length} досок`
    });
  };

  const onReset = async () => {
    const ok = await dialogs.confirm({
      title: 'Reset',
      message: 'Сбросить всё? Все доски и закладки будут удалены.',
      confirmLabel: 'Reset',
      danger: true
    });
    if (ok) reset();
  };

  return (
    <div ref={ref} className="menu">
      <button onClick={toggleTheme}>
        Тема: <span>{theme === 'dark' ? 'тёмная' : 'светлая'}</span>
      </button>
      <button onClick={() => setPrivacy(!privacy)}>
        Приватный режим: <span>{privacy ? 'вкл' : 'выкл'}</span>
      </button>
      <button onClick={() => void onImport()}>Импортировать закладки Chrome</button>
      <button onClick={() => void onReset()}>Сбросить всё</button>
    </div>
  );
}
