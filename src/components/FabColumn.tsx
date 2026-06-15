import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '@/store/store';
import { useDialogs } from '@/dialogs/DialogHost';
import { useSelection } from '@/contexts/SelectionContext';
import { importChromeBookmarks } from '@/lib/importChrome';
import { ImportTextDialog } from './ImportTextDialog';
import { Popover } from './Popover';
import {
  BrowserIcon,
  CloseIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  GearIcon,
  IncognitoIcon,
  MenuIcon,
  SearchIcon,
  SelectIcon,
  TrashIcon
} from './icons';

interface Props {
  onSearchToggle: () => void;
  onSettingsToggle: () => void;
  trashOpen: boolean;
  onTrashToggle: () => void;
}

export function FabColumn({ onSearchToggle, onSettingsToggle, trashOpen, onTrashToggle }: Props) {
  const dialogs = useDialogs();
  const [open, setOpen] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [importAnchor, setImportAnchor] = useState<HTMLButtonElement | null>(null);
  const [importTextOpen, setImportTextOpen] = useState(false);
  const trashCount = useStore((s) => s.trash.length);
  const selection = useSelection();
  const privacy = useStore((s) => s.privacy);
  const setPrivacy = useStore((s) => s.setPrivacy);
  const openInIncognito = useStore((s) => s.openInIncognito);
  const setOpenInIncognito = useStore((s) => s.setOpenInIncognito);
  const importBoards = useStore((s) => s.importBoards);

  const onImportBrowser = async () => {
    setImportAnchor(null);
    if (typeof chrome === 'undefined' || !chrome.bookmarks) {
      await dialogs.alert({
        title: 'Импорт',
        message: 'Доступно только в установленном расширении.'
      });
      return;
    }
    const folders = await importChromeBookmarks();
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

  const onImportText = () => {
    setImportAnchor(null);
    setImportTextOpen(true);
  };

  // По клику снаружи — сворачиваем
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      // Не сворачивать когда открыт модал/попап от наших же FAB-действий
      const t = e.target as HTMLElement;
      if (t.closest('.modal') || t.closest('.board-menu') || t.closest('.search-panel') || t.closest('.menu')) return;
      setOpen(false);
    };
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const handleToggle = () => {
    setAnimating(true);
    setOpen((v) => !v);
    setTimeout(() => setAnimating(false), 280);
  };

  // Раскрывающаяся группа — между search (всегда вверху) и toggle.
  const expandedItems: Array<{
    key: string;
    title: string;
    icon: ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    active?: boolean;
    disabled?: boolean;
    extraClass?: string;
  }> = [
    {
      key: 'import',
      title: 'Импорт',
      icon: <DownloadIcon />,
      onClick: (e) => setImportAnchor(importAnchor ? null : e.currentTarget),
      active: !!importAnchor
    },
    {
      key: 'incognito',
      title: openInIncognito ? 'Incognito: открывать в инкогнито' : 'Incognito: открывать обычно',
      icon: <IncognitoIcon />,
      onClick: () => setOpenInIncognito(!openInIncognito),
      active: openInIncognito,
      extraClass: 'fab-btn--incognito'
    },
    {
      key: 'select',
      title: selection.active ? 'Выйти из режима выделения' : 'Режим выделения',
      icon: <SelectIcon />,
      onClick: () => {
        if (selection.active) selection.exit();
        else {
          selection.enter();
          setOpen(false); // сворачиваем FAB, чтобы не мешал
        }
      },
      active: selection.active
    },
    {
      key: 'trash',
      title: trashCount > 0 ? `Корзина (${trashCount})` : 'Корзина',
      icon: <TrashIcon />,
      onClick: onTrashToggle,
      active: trashOpen
    },
    {
      key: 'privacy',
      title: privacy ? 'Privacy: вкл' : 'Privacy: выкл',
      icon: privacy ? <EyeOffIcon /> : <EyeIcon />,
      onClick: () => setPrivacy(!privacy),
      active: privacy
    }
  ];
  const lastIdx = expandedItems.length - 1;

  return (
    <div ref={rootRef} className="fab fab-tr">
      {/* Search всегда виден, при раскрытии поднимается выше за счёт expand-контейнера снизу от него */}
      <button className="fab-btn" title="Поиск" onClick={onSearchToggle}>
        <SearchIcon />
      </button>

      {/* Раскрывающаяся часть в потоке — толкает search вверх когда расширяется */}
      <div
        className={'fab-expand' + (open ? ' open' : '') + (animating ? ' animating' : '')}
        style={{ ['--last' as any]: lastIdx }}
      >
        {expandedItems.map((it, i) => (
          <button
            key={it.key}
            className={
              'fab-btn' + (it.active ? ' active' : '') + (it.extraClass ? ' ' + it.extraClass : '')
            }
            title={it.title}
            disabled={it.disabled}
            style={{ ['--i' as any]: i }}
            onClick={it.onClick}
            tabIndex={open ? 0 : -1}
          >
            {it.icon}
          </button>
        ))}
      </div>

      {/* Toggle: ☰ → × */}
      <button
        className="fab-btn fab-toggle"
        title={open ? 'Свернуть' : 'Меню'}
        onClick={handleToggle}
      >
        <span className={'fab-toggle-icon' + (open ? ' x' : '')}>
          {open ? <CloseIcon /> : <MenuIcon />}
        </span>
      </button>

      {/* Settings всегда виден */}
      <button
        className="fab-btn"
        title="Настройки"
        onClick={onSettingsToggle}
      >
        <GearIcon />
      </button>

      {importAnchor && (
        <Popover anchor={importAnchor} placement="left-of" onClose={() => setImportAnchor(null)}>
          <button onClick={() => void onImportBrowser()}>
            <BrowserIcon /> Import Browser Bookmarks
          </button>
          <button onClick={onImportText}>
            <FileTextIcon /> Import Links from Text/File
          </button>
        </Popover>
      )}

      {importTextOpen && <ImportTextDialog onClose={() => setImportTextOpen(false)} />}
    </div>
  );
}
