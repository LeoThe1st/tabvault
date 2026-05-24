import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent
} from '@dnd-kit/core';
import type { Board, Bookmark, Workspace } from '@/store/types';
import { faviconFor } from '@/lib/favicon';
import { useStore } from '@/store/store';
import { BoardView } from './Board';
import { Cell } from './Cell';

interface Props {
  ws: Workspace;
}

interface BoardDropMark {
  boardId: string;
  before: boolean;
}
interface BmDropMark {
  bookmarkId: string;
  before: boolean;
}

type ColItem =
  | { kind: 'board'; board: Board }
  | { kind: 'cell'; col: number; row: number; near: boolean };

export function Canvas({ ws }: Props) {
  const moveBoardTo = useStore((s) => s.moveBoardTo);
  const insertBoardAt = useStore((s) => s.insertBoardAt);
  const moveBookmark = useStore((s) => s.moveBookmark);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const [dragType, setDragType] = useState<'board' | 'bookmark' | null>(null);
  const [activeBm, setActiveBm] = useState<Bookmark | null>(null);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [overCellId, setOverCellId] = useState<string | null>(null);
  const [boardMark, setBoardMark] = useState<BoardDropMark | null>(null);
  const [bmMark, setBmMark] = useState<BmDropMark | null>(null);
  const [listOverBoardId, setListOverBoardId] = useState<string | null>(null);

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as any;
    const t = data?.type as 'board' | 'bookmark' | null ?? null;
    setDragType(t);
    if (t === 'bookmark') {
      for (const b of ws.boards) {
        const bm = b.bookmarks.find((x) => x.id === data.bookmarkId);
        if (bm) { setActiveBm(bm); break; }
      }
    } else if (t === 'board') {
      const board = ws.boards.find((b) => b.id === data.boardId) ?? null;
      setActiveBoard(board);
    }
  };

  const clearMarks = () => {
    setOverCellId(null);
    setBoardMark(null);
    setBmMark(null);
    setListOverBoardId(null);
  };

  const onDragMove = (e: DragMoveEvent) => {
    const { active, over } = e;
    if (!over) {
      clearMarks();
      return;
    }
    const aData = active.data.current as any;
    const oData = over.data.current as any;
    if (!aData || !oData) return;

    if (aData.type === 'board') {
      if (oData.type === 'cell') {
        setOverCellId(String(over.id));
        setBoardMark(null);
      } else if (oData.type === 'board' && oData.boardId !== aData.boardId) {
        const overRect = over.rect;
        const activeRect = active.rect.current.translated;
        if (!overRect || !activeRect) return;
        const activeMid = activeRect.top + activeRect.height / 2;
        const overMid = overRect.top + overRect.height / 2;
        const before = activeMid < overMid;
        setBoardMark({ boardId: oData.boardId, before });
        setOverCellId(null);
      } else {
        setOverCellId(null);
        setBoardMark(null);
      }
      return;
    }

    if (aData.type === 'bookmark') {
      if (oData.type === 'bm' && oData.bookmarkId !== aData.bookmarkId) {
        const overRect = over.rect;
        const activeRect = active.rect.current.translated;
        if (!overRect || !activeRect) return;
        const activeMid = activeRect.top + activeRect.height / 2;
        const overMid = overRect.top + overRect.height / 2;
        const before = activeMid < overMid;
        setBmMark({ bookmarkId: oData.bookmarkId, before });
        setListOverBoardId(null);
      } else if (oData.type === 'list') {
        setListOverBoardId(oData.boardId);
        setBmMark(null);
      } else {
        setBmMark(null);
        setListOverBoardId(null);
      }
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const aData = active.data.current as any;
    if (over && aData) {
      const oData = over.data.current as any;
      if (aData.type === 'board' && oData) {
        if (oData.type === 'cell') {
          moveBoardTo(aData.boardId, oData.col, oData.row);
        } else if (oData.type === 'board' && oData.boardId !== aData.boardId) {
          const before = boardMark?.before ?? true;
          insertBoardAt(aData.boardId, oData.col, oData.row, before);
        }
      } else if (aData.type === 'bookmark' && oData) {
        if (oData.type === 'bm' && oData.bookmarkId !== aData.bookmarkId) {
          const before = bmMark?.before ?? true;
          moveBookmark(aData.bookmarkId, aData.fromBoardId, oData.boardId, {
            bookmarkId: oData.bookmarkId,
            before
          });
        } else if (oData.type === 'list') {
          moveBookmark(aData.bookmarkId, aData.fromBoardId, oData.boardId, null);
        }
      }
    }
    setDragType(null);
    setActiveBm(null);
    setActiveBoard(null);
    clearMarks();
  };

  const onDragCancel = () => {
    setDragType(null);
    setActiveBm(null);
    setActiveBoard(null);
    clearMarks();
  };

  /* Раскладка по колонкам — каждая колонка независима по высоте.
     Внутри колонки доски идут в порядке row, в конце — "near" cell.
     В пустых колонках row-0 cell показывается только если левее уже есть доски (как раньше). */
  const { columns, bmMarkMap } = useMemo(() => {
    const byCol: Board[][] = Array.from({ length: ws.cols }, () => []);
    for (const b of ws.boards) {
      if (b.col >= 0 && b.col < ws.cols) byCol[b.col].push(b);
    }
    for (const c of byCol) c.sort((a, b) => a.row - b.row);

    const hasRow0Left: boolean[] = Array.from({ length: ws.cols }, () => false);
    let acc = false;
    for (let c = 0; c < ws.cols; c++) {
      hasRow0Left[c] = acc;
      if (byCol[c].length > 0) acc = true;
    }

    const cols: ColItem[][] = byCol.map((boards, c) => {
      const items: ColItem[] = boards.map((b) => ({ kind: 'board', board: b }));
      if (boards.length > 0) {
        items.push({ kind: 'cell', col: c, row: boards.length, near: true });
      } else {
        items.push({ kind: 'cell', col: c, row: 0, near: hasRow0Left[c] });
      }
      return items;
    });

    // edge: совсем пустой workspace — показать одну стартовую cell в col 0
    if (ws.boards.length === 0 && cols[0]) {
      cols[0] = [{ kind: 'cell', col: 0, row: 0, near: true }];
    }

    const map: Record<string, 'before' | 'after'> = {};
    if (bmMark) map[bmMark.bookmarkId] = bmMark.before ? 'before' : 'after';

    return { columns: cols, bmMarkMap: map };
  }, [ws.boards, ws.cols, bmMark]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <main
        className={'canvas' + (dragType === 'board' ? ' dragging-board' : '')}
        style={{ ['--cols' as any]: ws.cols }}
      >
        {columns.map((items, ci) => (
          <div className="canvas-col" key={ci}>
            {items.map((it) => {
              if (it.kind === 'board') {
                return (
                  <BoardView
                    key={it.board.id}
                    board={it.board}
                    bookmarkDropMarks={bmMarkMap}
                    listDropActive={listOverBoardId === it.board.id}
                    boardDropMark={
                      boardMark?.boardId === it.board.id
                        ? boardMark.before
                          ? 'before'
                          : 'after'
                        : null
                    }
                  />
                );
              }
              const id = `cell:${it.col}:${it.row}`;
              return (
                <Cell
                  key={id}
                  wsId={ws.id}
                  col={it.col}
                  row={it.row}
                  near={it.near}
                  dragActive={dragType === 'board'}
                  dropActive={overCellId === id}
                />
              );
            })}
          </div>
        ))}
      </main>

      <DragOverlay dropAnimation={null}>
        {activeBm && <BookmarkOverlay bm={activeBm} />}
        {activeBoard && <BoardOverlay board={activeBoard} />}
      </DragOverlay>
    </DndContext>
  );
}

function BookmarkOverlay({ bm }: { bm: Bookmark }) {
  return (
    <li className="bm" style={{ listStyle: 'none', opacity: 0.9, cursor: 'grabbing', pointerEvents: 'none' }}>
      <span className="bm-link" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '9px 10px', color: 'inherit', flex: 1, minWidth: 0, fontSize: 14.5 }}>
        <img className="bm-icon" src={bm.favIconUrl || faviconFor(bm.url)} alt="" />
        <span className="bm-text">
          <span className="bm-title">{bm.title || bm.url}</span>
          {bm.description && <span className="bm-desc">{bm.description}</span>}
        </span>
      </span>
    </li>
  );
}

function BoardOverlay({ board }: { board: Board }) {
  return (
    <section className="board" style={{ opacity: 0.9, cursor: 'grabbing', pointerEvents: 'none' }}>
      <header className="board-head">
        <h3 className="board-name">{board.name}</h3>
      </header>
    </section>
  );
}
