import { useDroppable } from '@dnd-kit/core';
import { useStore } from '@/store/store';
import { useDialogs } from '@/dialogs/DialogHost';
import { PlusIcon } from './icons';

interface Props {
  wsId: string;
  col: number;
  row: number;
  near: boolean;
  dragActive: boolean;
  dropActive: boolean;
}

export function Cell({ wsId, col, row, near, dragActive, dropActive }: Props) {
  const dialogs = useDialogs();
  const addBoard = useStore((s) => s.addBoard);
  const droppable = useDroppable({
    id: `cell:${col}:${row}`,
    data: { type: 'cell', col, row }
  });

  const classes = [
    'cell',
    near && 'near',
    dropActive && 'drag-over'
  ]
    .filter(Boolean)
    .join(' ');

  const onClick = async () => {
    if (dragActive) return;
    const name = await dialogs.prompt({
      title: 'New Board',
      label: 'Board Name',
      required: true
    });
    if (name) addBoard(wsId, name, col, row);
  };

  return (
    <button
      ref={droppable.setNodeRef}
      className={classes}
      data-col={col}
      data-row={row}
      onClick={onClick}
    >
      <PlusIcon width={16} height={16} />
      <span>ADD BOARD</span>
    </button>
  );
}
