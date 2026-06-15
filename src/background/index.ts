import { uid } from '@/lib/uid';
import { browser } from '@/lib/browser';
import { defaultState } from '@/store/defaults';
import { ensureInbox } from '@/store/store';
import { migrateState } from '@/store/migrate';
import type { State } from '@/store/types';
import { STORAGE_KEY } from '@/store/types';

interface PersistedSnapshot {
  state: State;
  version: number;
}

async function readState(): Promise<{ snap: PersistedSnapshot; legacy: boolean }> {
  const obj = await browser.storage.local.get(STORAGE_KEY);
  const v = obj[STORAGE_KEY];
  if (!v) {
    return { snap: { state: defaultState(), version: 1 }, legacy: false };
  }
  if (typeof v === 'object' && 'workspaces' in v && !('state' in v)) {
    return { snap: { state: v as State, version: 1 }, legacy: true };
  }
  return { snap: v as PersistedSnapshot, legacy: false };
}

async function writeState(snap: PersistedSnapshot): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: snap });
}

async function saveTab(tab: { url?: string; title?: string; favIconUrl?: string }): Promise<void> {
  if (!tab.url) return;
  const { snap } = await readState();
  const state = migrateState(snap.state);
  const ws =
    state.workspaces.find((w) => w.id === state.activeWsId) || state.workspaces[0];
  const inbox = ensureInbox(ws);
  inbox.bookmarks.unshift({
    id: uid(),
    title: tab.title || tab.url,
    url: tab.url,
    favIconUrl: tab.favIconUrl || ''
  });
  await writeState({ state, version: snap.version || 1 });
}

browser.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-current-tab') return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) return;
  await saveTab(tab);
});

browser.action.onClicked.addListener(() => {
  browser.tabs.create({ url: 'src/newtab/index.html' });
});
