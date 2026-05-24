import { useEffect } from 'react';
import { useSelection } from '@/contexts/SelectionContext';
import { useStore } from '@/store/store';
import { useDialogs } from '@/dialogs/DialogHost';

export function SelectionBar() {
  const dialogs = useDialogs();
  const { active, count, selectedIds, exit } = useSelection();
  const bulkDelete = useStore((s) => s.bulkDeleteBookmarks);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exit();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, exit]);

  if (!active) return null;

  const onDelete = async () => {
    if (!count) return;
    const ok = await dialogs.confirm({
      title: 'Удалить выделенные',
      message: `Переместить ${count} закладок в корзину?`,
      confirmLabel: 'Delete',
      danger: true
    });
    if (!ok) return;
    bulkDelete([...selectedIds]);
    exit();
  };

  return (
    <div className="selection-bar">
      <span className="sb-hint">
        Клик по закладке = выделить · Drag для переноса
      </span>
      <span className="sb-count">
        <b>{count}</b> выделено
      </span>
      <button className="btn-danger-solid" disabled={!count} onClick={() => void onDelete()}>
        Delete
      </button>
      <button className="btn-ghost" onClick={exit}>
        Cancel
      </button>
      <button className="btn-primary" onClick={exit}>
        Done
      </button>
    </div>
  );
}
