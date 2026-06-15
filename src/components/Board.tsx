import { useEffect, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Board as B } from '@/store/types';
import { useStore } from '@/store/store';
import { useDialogs } from '@/dialogs/DialogHost';
import { fetchTitleAndDesc } from '@/lib/fetchMeta';
import { browser, isExtension } from '@/lib/browser';
import { BookmarkItem } from './Bookmark';
import { BoardForm } from './BoardForm';
import { Popover } from './Popover';
import {
  DotsIcon,
  EditIcon,
  ExternalIcon,
  LinkIcon,
  RefreshIcon,
  ShareIcon,
  TrashIcon
} from './icons';

interface Props {
  board: B;
  /** позиционирование в grid — col/row начинаются с 1 */
  bookmarkDropMarks: Record<string, 'before' | 'after'>;
  listDropActive: boolean;
  boardDropMark: 'before' | 'after' | null;
}

export function BoardView({
  board,
  bookmarkDropMarks,
  listDropActive,
  boardDropMark
}: Props) {
  const dialogs = useDialogs();
  const updateBookmark = useStore((s) => s.updateBookmark);
  const deleteBoard = useStore((s) => s.deleteBoard);
  const renameBoard = useStore((s) => s.renameBoard);

  const [formOpen, setFormOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const draggable = useDraggable({
    id: 'board:' + board.id,
    data: { type: 'board', boardId: board.id, col: board.col, row: board.row }
  });

  // droppable для drop board-on-board (insertBoardAt)
  const boardDroppable = useDroppable({
    id: 'board-drop:' + board.id,
    data: { type: 'board', boardId: board.id, col: board.col, row: board.row }
  });

  // droppable для bookmark-list (drop bookmark в эту доску, append если не на bm)
  const listDroppable = useDroppable({
    id: 'list:' + board.id,
    data: { type: 'list', boardId: board.id }
  });

  // Мерж draggable + boardDroppable refs на root .board
  const setRootRef = (n: HTMLDivElement | null) => {
    draggable.setNodeRef(n);
    boardDroppable.setNodeRef(n);
  };

  // Auto-clear form-open on dragstart
  useEffect(() => {
    if (draggable.isDragging) setFormOpen(false);
  }, [draggable.isDragging]);

  const classes = [
    'board',
    draggable.isDragging && 'dragging',
    menuAnchor && 'menu-open',
    formOpen && 'form-open',
    boardDropMark === 'before' && 'drop-before',
    boardDropMark === 'after' && 'drop-after'
  ]
    .filter(Boolean)
    .join(' ');

  const onMenuFetchAll = async () => {
    setMenuAnchor(null);
    for (const bm of board.bookmarks) {
      const { title, desc } = await fetchTitleAndDesc(bm.url);
      const patch: Partial<typeof bm> = {};
      if (title) patch.title = title;
      if (desc && !bm.description) patch.description = desc;
      if (Object.keys(patch).length) updateBookmark(bm.id, patch);
    }
  };

  const onMenuOpenAll = () => {
    setMenuAnchor(null);
    for (const bm of board.bookmarks) {
      if (isExtension && browser.tabs?.create) {
        void browser.tabs.create({ url: bm.url, active: false });
      } else {
        window.open(bm.url, '_blank');
      }
    }
  };

  const onMenuEdit = async () => {
    setMenuAnchor(null);
    const name = await dialogs.prompt({
      title: 'Edit Board',
      label: 'Board Name',
      required: true,
      value: board.name
    });
    if (name) renameBoard(board.id, name);
  };

  const onMenuShare = async () => {
    setMenuAnchor(null);
    const data = JSON.stringify(
      {
        name: board.name,
        bookmarks: board.bookmarks.map((b) => ({
          url: b.url,
          title: b.title,
          description: b.description || ''
        }))
      },
      null,
      2
    );
    try {
      await navigator.clipboard.writeText(data);
      await dialogs.alert({
        title: 'Share Board',
        message: 'JSON доски скопирован в буфер обмена.'
      });
    } catch {
      await dialogs.alert({ title: 'Share Board', message: data });
    }
  };

  const onMenuDelete = async () => {
    setMenuAnchor(null);
    const ok = await dialogs.confirm({
      title: 'Delete Board',
      message: `Удалить доску "${board.name}" со всеми закладками?`,
      confirmLabel: 'Delete',
      danger: true
    });
    if (ok) deleteBoard(board.id);
  };

  const menuBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <section
      ref={setRootRef}
      className={classes}
      data-id={board.id}
      style={{
        transform: draggable.transform
          ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`
          : undefined,
        zIndex: draggable.isDragging ? 50 : undefined
      }}
    >
      <header className="board-head" {...draggable.listeners} {...draggable.attributes}>
        <h3 className="board-name">{board.name}</h3>
        <div className="board-actions" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className="board-act"
            title="Добавить ссылку"
            aria-label="add link"
            onClick={() => setFormOpen((v) => !v)}
          >
            <LinkIcon />
          </button>
          <button
            ref={menuBtnRef}
            className="board-act"
            title="Меню"
            aria-label="menu"
            onClick={(e) => setMenuAnchor(menuAnchor ? null : e.currentTarget)}
          >
            <DotsIcon />
          </button>
        </div>
      </header>

      <ul
        ref={listDroppable.setNodeRef}
        className={'board-list' + (listDropActive ? ' bm-drag-over' : '')}
      >
        {board.bookmarks.map((bm) => (
          <BookmarkItem
            key={bm.id}
            bm={bm}
            board={board}
            dropMark={bookmarkDropMarks[bm.id] || null}
          />
        ))}
      </ul>

      {formOpen && <BoardForm board={board} onClose={() => setFormOpen(false)} />}

      {menuAnchor && (
        <Popover anchor={menuAnchor} onClose={() => setMenuAnchor(null)}>
          <button onClick={onMenuOpenAll}>
            <ExternalIcon /> Open All Links
          </button>
          <button onClick={() => void onMenuFetchAll()}>
            <RefreshIcon /> Fetch All Titles
          </button>
          <button onClick={() => void onMenuEdit()}>
            <EditIcon /> Edit Board
          </button>
          <button onClick={() => void onMenuShare()}>
            <ShareIcon /> Share Board
          </button>
          <div className="sep" />
          <button className="danger" onClick={() => void onMenuDelete()}>
            <TrashIcon /> Delete Board
          </button>
        </Popover>
      )}
    </section>
  );
}
