import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/store/store';
import { useDialogs } from '@/dialogs/DialogHost';
import { faviconFor } from '@/lib/favicon';
import type { TrashEntry } from '@/store/types';
import { FolderIcon, RestoreIcon, TrashIcon } from './icons';

interface Props {
  onClose: () => void;
}

function timeAgo(ts: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return 'только что';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return `${d} дн назад`;
}

export function TrashDialog({ onClose }: Props) {
  const dialogs = useDialogs();
  const trash = useStore((s) => s.trash);
  const restore = useStore((s) => s.restoreFromTrash);
  const purge = useStore((s) => s.purgeFromTrash);
  const emptyTrash = useStore((s) => s.emptyTrash);

  const [open, setOpen] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(r);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onPurge = async (e: TrashEntry) => {
    const ok = await dialogs.confirm({
      title: 'Удалить навсегда',
      message:
        e.kind === 'board'
          ? `Удалить доску "${e.data.name}" навсегда?`
          : `Удалить закладку "${e.data.title || e.data.url}" навсегда?`,
      confirmLabel: 'Delete',
      danger: true
    });
    if (ok) purge(e.id);
  };

  const onEmpty = async () => {
    const ok = await dialogs.confirm({
      title: 'Очистить корзину',
      message: `Удалить навсегда ${trash.length} элементов?`,
      confirmLabel: 'Empty',
      danger: true
    });
    if (ok) emptyTrash();
  };

  return createPortal(
    <div className={'modal' + (open ? ' open' : '')}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(560px, 92vw)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrashIcon /> Корзина
          </h2>
          <span style={{ color: 'var(--fg-mute)', fontSize: 12 }}>
            Элементы удаляются навсегда через 30 дней
          </span>
        </div>

        {trash.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--fg-mute)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}
          >
            <TrashIcon width={42} height={42} style={{ opacity: 0.35 }} />
            <div>Корзина пуста</div>
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              maxHeight: 380,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}
          >
            {trash.map((e) => (
              <li
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--row-hover)'
                }}
              >
                {e.kind === 'bookmark' ? (
                  <img
                    src={e.data.favIconUrl || faviconFor(e.data.url)}
                    alt=""
                    style={{ width: 18, height: 18, flexShrink: 0 }}
                  />
                ) : (
                  <FolderIcon style={{ flexShrink: 0, opacity: 0.7 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: 14
                    }}
                  >
                    {e.kind === 'bookmark' ? e.data.title || e.data.url : e.data.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-mute)' }}>
                    {e.kind === 'bookmark'
                      ? `закладка из "${e.boardName}" • ${timeAgo(e.deletedAt)}`
                      : `доска (${e.data.bookmarks.length} закл.) • ${timeAgo(e.deletedAt)}`}
                  </div>
                </div>
                <button
                  className="board-act"
                  title="Восстановить"
                  onClick={() => restore(e.id)}
                >
                  <RestoreIcon />
                </button>
                <button
                  className="board-act"
                  title="Удалить навсегда"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => void onPurge(e)}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
          {trash.length > 0 ? (
            <button className="btn-danger-solid" onClick={() => void onEmpty()}>
              Empty Trash
            </button>
          ) : (
            <span />
          )}
          <button className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div style={{ position: 'fixed', inset: 0, zIndex: -1 }} onClick={onClose} />
    </div>,
    document.body
  );
}
