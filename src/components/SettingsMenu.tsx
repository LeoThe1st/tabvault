import { useEffect, useRef } from 'react';
import { useStore } from '@/store/store';
import { useDialogs } from '@/dialogs/DialogHost';

interface Props {
  onClose: () => void;
  anchor: HTMLElement | null;
}

export function SettingsMenu({ onClose, anchor }: Props) {
  const dialogs = useDialogs();
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
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
      <button onClick={() => void onReset()}>Сбросить всё</button>
    </div>
  );
}
