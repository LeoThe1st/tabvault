import { useRef, useState } from 'react';
import { useStore } from '@/store/store';
import { useDialogs } from '@/dialogs/DialogHost';
import type { Workspace } from '@/store/types';
import { Popover } from './Popover';
import { ChevronIcon, EditIcon, ShareIcon, TrashIcon } from './icons';

export function Topbar() {
  const dialogs = useDialogs();
  const workspaces = useStore((s) => s.workspaces);
  const activeWsId = useStore((s) => s.activeWsId);
  const setActiveWs = useStore((s) => s.setActiveWs);
  const addWorkspace = useStore((s) => s.addWorkspace);

  const onAdd = async () => {
    const name = await dialogs.prompt({
      title: 'New Page',
      label: 'Page Name',
      required: true
    });
    if (name) addWorkspace(name);
  };

  return (
    <header className="topbar">
      <nav className="ws-tabs">
        {workspaces.map((w) => (
          <WsTab
            key={w.id}
            ws={w}
            active={w.id === activeWsId}
            onActivate={() => setActiveWs(w.id)}
          />
        ))}
      </nav>
      <button className="ws-add" title="Новое рабочее пространство" onClick={onAdd}>
        +
      </button>
    </header>
  );
}

interface WsTabProps {
  ws: Workspace;
  active: boolean;
  onActivate: () => void;
}

function WsTab({ ws, active, onActivate }: WsTabProps) {
  const dialogs = useDialogs();
  const renameWorkspace = useStore((s) => s.renameWorkspace);
  const deleteWorkspace = useStore((s) => s.deleteWorkspace);
  const canDelete = useStore((s) => s.workspaces.length > 1);

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const tabRef = useRef<HTMLButtonElement>(null);

  const onRename = async () => {
    setMenuAnchor(null);
    const name = await dialogs.prompt({
      title: 'Rename Page',
      label: 'Page Name',
      required: true,
      value: ws.name
    });
    if (name) renameWorkspace(ws.id, name);
  };

  const onShare = async () => {
    setMenuAnchor(null);
    const data = JSON.stringify(
      { name: ws.name, cols: ws.cols, boards: ws.boards },
      null,
      2
    );
    try {
      await navigator.clipboard.writeText(data);
      await dialogs.alert({
        title: 'Share Page',
        message: 'JSON страницы скопирован в буфер обмена.'
      });
    } catch {
      await dialogs.alert({ title: 'Share Page', message: data });
    }
  };

  const onDelete = async () => {
    setMenuAnchor(null);
    if (!canDelete) return;
    const ok = await dialogs.confirm({
      title: 'Delete Page',
      message: `Удалить страницу "${ws.name}" со всеми досками?`,
      confirmLabel: 'Delete',
      danger: true
    });
    if (ok) deleteWorkspace(ws.id);
  };

  return (
    <button
      ref={tabRef}
      className={'ws-tab' + (active ? ' active' : '') + (menuAnchor ? ' menu-open' : '')}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.ws-chev')) return;
        onActivate();
      }}
    >
      <span className="ws-name">{ws.name}</span>
      <span
        className="ws-chev"
        role="button"
        tabIndex={0}
        title="Меню страницы"
        onClick={(e) => {
          e.stopPropagation();
          setMenuAnchor(menuAnchor ? null : (e.currentTarget as HTMLElement));
        }}
      >
        <ChevronIcon />
      </span>
      {menuAnchor && (
        <Popover
          anchor={tabRef.current}
          placement="below-left"
          onClose={() => setMenuAnchor(null)}
        >
          <button onClick={() => void onRename()}>
            <EditIcon /> Rename
          </button>
          <button onClick={() => void onShare()}>
            <ShareIcon /> Share Page
          </button>
          <div className="sep" />
          <button
            className="danger"
            disabled={!canDelete}
            onClick={() => void onDelete()}
          >
            <TrashIcon /> Delete
          </button>
        </Popover>
      )}
    </button>
  );
}
