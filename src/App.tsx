import { useEffect, useMemo, useState } from 'react';
import { useStore, attachExternalSync } from '@/store/store';
import { DialogHost } from '@/dialogs/DialogHost';
import { SelectionProvider, useSelection } from '@/contexts/SelectionContext';
import { Topbar } from '@/components/Topbar';
import { Canvas } from '@/components/Canvas';
import { SettingsModal } from '@/components/SettingsModal';
import { SearchPanel } from '@/components/SearchPanel';
import { BackgroundPicker } from '@/components/BackgroundPicker';
import { FabColumn } from '@/components/FabColumn';
import { SelectionBar } from '@/components/SelectionBar';

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
  const theme = useStore((s) => s.theme);
  const privacy = useStore((s) => s.privacy);
  const animations = useStore((s) => s.animations);
  const compact = useStore((s) => s.compact);
  const showFavicons = useStore((s) => s.showFavicons);
  const showDescriptions = useStore((s) => s.showDescriptions);
  const bgImage = useStore((s) => s.bgImage);
  const workspaces = useStore((s) => s.workspaces);
  const activeWsId = useStore((s) => s.activeWsId);

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
    if (bgImage) {
      document.body.style.backgroundImage = `url("${bgImage.replace(/"/g, '\\"')}")`;
      document.body.classList.add('has-bg');
    } else {
      document.body.style.backgroundImage = '';
      document.body.classList.remove('has-bg');
    }
  }, [bgImage]);

  useEffect(() => attachExternalSync(), []);

  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!activeWs) return null;

  return (
    <>
      <Topbar />
      <Canvas ws={activeWs} />

      <FabColumn
        onSearchToggle={() => setSearchOpen((v) => !v)}
        onSettingsToggle={() => setSettingsOpen((v) => !v)}
      />

      <BackgroundPicker />

      <SelectionBar />
      <BodySelectingClass />

      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
