import { useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Bookmark as Bm, Board } from '@/store/types';
import { faviconFor } from '@/lib/favicon';
import { openUrl } from '@/lib/openUrl';
import { useStore } from '@/store/store';
import { useDialogs } from '@/dialogs/DialogHost';
import { useSelection } from '@/contexts/SelectionContext';
import { Popover } from './Popover';
import { DotsIcon, EditIcon, TrashIcon } from './icons';

interface Props {
  bm: Bm;
  board: Board;
  dropMark: 'before' | 'after' | null;
}

export function BookmarkItem({ bm, board, dropMark }: Props) {
  const dialogs = useDialogs();
  const updateBookmark = useStore((s) => s.updateBookmark);
  const deleteBookmark = useStore((s) => s.deleteBookmark);
  const openInIncognito = useStore((s) => s.openInIncognito);
  const selection = useSelection();
  const isSelected = selection.isSelected(bm.id);

  const draggable = useDraggable({
    id: 'bm:' + bm.id,
    data: {
      type: 'bookmark',
      bookmarkId: bm.id,
      fromBoardId: board.id,
      selected: isSelected,
      selectionActive: selection.active
    }
  });
  const droppable = useDroppable({
    id: 'bm-drop:' + bm.id,
    data: { type: 'bm', bookmarkId: bm.id, boardId: board.id }
  });

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [iconBroken, setIconBroken] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (selection.active) {
      selection.toggle(bm.id);
      return;
    }
    const r = await openUrl(bm.url, { incognito: openInIncognito });
    if (!r.ok && r.reason === 'no-permission') {
      await dialogs.alert({
        title: 'Incognito недоступен',
        message:
          'Чтобы открывать ссылки в инкогнито, разреши расширению работать в incognito:\n' +
          'chrome://extensions → TabVault → Details → "Allow in Incognito".'
      });
    }
  };

  const onEdit = async () => {
    setMenuAnchor(null);
    const r = await dialogs.editBookmark({
      url: bm.url,
      title: bm.title || '',
      description: bm.description || ''
    });
    if (r) updateBookmark(bm.id, { title: r.title, description: r.description });
  };

  const onDelete = async () => {
    setMenuAnchor(null);
    const ok = await dialogs.confirm({
      title: 'Delete Link',
      message: `Удалить закладку "${bm.title || bm.url}"?`,
      confirmLabel: 'Delete',
      danger: true
    });
    if (ok) deleteBookmark(bm.id);
  };

  const classes = [
    'bm',
    draggable.isDragging && 'dragging',
    menuAnchor && 'menu-open',
    dropMark === 'before' && 'drop-before',
    dropMark === 'after' && 'drop-after',
    isSelected && 'selected'
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li
      ref={(n) => {
        draggable.setNodeRef(n);
        droppable.setNodeRef(n);
      }}
      className={classes}
      data-id={bm.id}
      style={{
        transform: draggable.transform
          ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`
          : undefined
      }}
      {...draggable.listeners}
      {...draggable.attributes}
    >
      <a
        className="bm-link"
        href={bm.url}
        onClick={onClick}
        title={bm.description}
        draggable={false}
      >
        {!iconBroken && (
          <img
            className="bm-icon"
            src={bm.favIconUrl || faviconFor(bm.url)}
            alt=""
            onError={() => setIconBroken(true)}
          />
        )}
        {iconBroken && <span className="bm-icon" />}
        <span className="bm-text">
          <span className="bm-title">{bm.title || bm.url}</span>
          {bm.description && <span className="bm-desc">{bm.description}</span>}
        </span>
      </a>
      <button
        ref={menuBtnRef}
        className="bm-menu"
        title="Меню"
        aria-label="menu"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setMenuAnchor(menuAnchor ? null : e.currentTarget);
        }}
      >
        <DotsIcon />
      </button>
      {menuAnchor && (
        <Popover anchor={menuAnchor} onClose={() => setMenuAnchor(null)}>
          <button onClick={onEdit}>
            <EditIcon /> Edit
          </button>
          <div className="sep" />
          <button className="danger" onClick={onDelete}>
            <TrashIcon /> Delete
          </button>
        </Popover>
      )}
    </li>
  );
}
