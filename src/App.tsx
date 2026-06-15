import { useEffect, useMemo, useState } from 'react';
import { useStore, attachExternalSync } from '@/store/store';
import { DialogHost, useDialogs } from '@/dialogs/DialogHost';
import { SelectionProvider, useSelection } from '@/contexts/SelectionContext';
import { useHotkeys } from '@/hooks/useHotkeys';
import { Topbar } from '@/components/Topbar';
import { Canvas } from '@/components/Canvas';
import { SettingsModal } from '@/components/SettingsModal';
import { SearchPanel } from '@/components/SearchPanel';
import { BackgroundPicker } from '@/components/BackgroundPicker';
import { FabColumn } from '@/components/FabColumn';
import { SelectionBar } from '@/components/SelectionBar';
import { TrashDialog } from '@/components/TrashDialog';
import { Wallpaper } from '@/components/Wallpaper';

export function App() {
  return (
    <DialogHost>
      <SelectionProvider>
        <Root />
      </SelectionProvider>
    </DialogHost>
  );
}

function BodySelectingClass() {
  const { active } = useSelection();
  useEffect(() => {
    document.body.classList.toggle('selecting', active);
  }, [active]);
  return null;
}

function Root() {
  const dialogs = useDialogs();
  const selection = useSelection();
  const theme = useStore((s) => s.theme);
  const privacy = useStore((s) => s.privacy);
  const animations = useStore((s) => s.animations);
  const compact = useStore((s) => s.compact);
  const showFavicons = useStore((s) => s.showFavicons);
  const showDescriptions = useStore((s) => s.showDescriptions);
  const bgImage = useStore((s) => s.bgImage);
  const workspaces = useStore((s) => s.workspaces);
  const activeWsId = useStore((s) => s.activeWsId);
  const setPrivacy = useStore((s) => s.setPrivacy);
  const openInIncognito = useStore((s) => s.openInIncognito);
  const setOpenInIncognito = useStore((s) => s.setOpenInIncognito);
  const setActiveWs = useStore((s) => s.setActiveWs);
  const addBoard = useStore((s) => s.addBoard);

  const activeWs = useMemo(
    () => workspaces.find((w) => w.id === activeWsId) ?? workspaces[0],
    [workspaces, activeWsId]
  );

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.body.classList.toggle('privacy', privacy);
  }, [privacy]);

  useEffect(() => {
    document.body.classList.toggle('no-anims', !animations);
  }, [animations]);

  useEffect(() => {
    document.body.classList.toggle('compact', compact);
  }, [compact]);

  useEffect(() => {
    document.body.classList.toggle('hide-favicons', !showFavicons);
  }, [showFavicons]);

  useEffect(() => {
    document.body.classList.toggle('hide-descriptions', !showDescriptions);
  }, [showDescriptions]);

  useEffect(() => {
    document.body.classList.toggle('has-bg', !!bgImage);
  }, [bgImage]);

  useEffect(() => attachExternalSync(), []);

  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useHotkeys({
    search: () => setSearchOpen((v) => !v),
    settings: () => setSettingsOpen((v) => !v),
    trash: () => setTrashOpen((v) => !v),
    togglePrivacy: () => setPrivacy(!privacy),
    toggleIncognito: () => setOpenInIncognito(!openInIncognito),
    toggleSelection: () => {
      if (selection.active) selection.exit();
      else selection.enter();
    },
    newBoard: async () => {
      if (!activeWs) return;
      const name = await dialogs.prompt({
        title: 'New Board',
        label: 'Board Name',
        required: true
      });
      if (!name) return;
      // первая свободная ячейка в сетке
      const occ = new Set(activeWs.boards.map((b) => `${b.col}-${b.row}`));
      let placed = false;
      for (let r = 0; r < 100 && !placed; r++) {
        for (let c = 0; c < activeWs.cols && !placed; c++) {
          if (!occ.has(`${c}-${r}`)) {
            addBoard(activeWs.id, name, c, r);
            placed = true;
          }
        }
      }
    },
    nextWs: () => {
      const i = workspaces.findIndex((w) => w.id === activeWsId);
      if (i === -1) return;
      const next = workspaces[(i + 1) % workspaces.length];
      setActiveWs(next.id);
    },
    prevWs: () => {
      const i = workspaces.findIndex((w) => w.id === activeWsId);
      if (i === -1) return;
      const prev = workspaces[(i - 1 + workspaces.length) % workspaces.length];
      setActiveWs(prev.id);
    }
  });

  if (!activeWs) return null;

  return (
    <>
      <Wallpaper />
      <Topbar />
      <Canvas ws={activeWs} />

      <FabColumn
        onSearchToggle={() => setSearchOpen((v) => !v)}
        onSettingsToggle={() => setSettingsOpen((v) => !v)}
        trashOpen={trashOpen}
        onTrashToggle={() => setTrashOpen((v) => !v)}
      />

      <BackgroundPicker />

      <SelectionBar />
      <BodySelectingClass />

      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {trashOpen && <TrashDialog onClose={() => setTrashOpen(false)} />}
    </>
  );
}
