import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '@/store/store';
import {
  CloseIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  GearIcon,
  IncognitoIcon,
  MenuIcon,
  SearchIcon,
  SelectIcon,
  TrashIcon
} from './icons';

interface Props {
  onSearchToggle: () => void;
  onSettingsToggle: (anchor: HTMLButtonElement) => void;
}

export function FabColumn({ onSearchToggle, onSettingsToggle }: Props) {
  const [open, setOpen] = useState(false);
  const [animating, setAnimating] = useState(false);
  const privacy = useStore((s) => s.privacy);
  const setPrivacy = useStore((s) => s.setPrivacy);

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
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
  }> = [
    { key: 'import', title: 'Импорт', icon: <DownloadIcon />, disabled: true },
    { key: 'incognito', title: 'Открывать в Incognito', icon: <IncognitoIcon />, disabled: true },
    { key: 'select', title: 'Режим выделения', icon: <SelectIcon />, disabled: true },
    { key: 'trash', title: 'Корзина', icon: <TrashIcon />, disabled: true },
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
            className={'fab-btn' + (it.active ? ' active' : '')}
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
        onClick={(e) => onSettingsToggle(e.currentTarget)}
      >
        <GearIcon />
      </button>
    </div>
  );
}
