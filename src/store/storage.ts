import type { PersistStorage, StorageValue } from 'zustand/middleware';
import { browser, isExtension } from '@/lib/browser';
import type { State } from './types';
import { STORAGE_KEY } from './types';

interface RawSnapshot {
  state: State;
  version: number;
}

async function readRaw(): Promise<RawSnapshot | null> {
  if (isExtension) {
    const obj = await browser.storage.local.get(STORAGE_KEY);
    const v = obj[STORAGE_KEY];
    if (!v) return null;
    if (typeof v === 'object' && 'workspaces' in v && !('state' in v)) {
      return { state: v as State, version: 0 };
    }
    return v as RawSnapshot;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const v = JSON.parse(raw);
  if (v && typeof v === 'object' && 'workspaces' in v && !('state' in v)) {
    return { state: v as State, version: 0 };
  }
  return v as RawSnapshot;
}

async function writeRaw(snap: RawSnapshot): Promise<void> {
  if (isExtension) {
    await browser.storage.local.set({ [STORAGE_KEY]: snap });
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
}

async function removeRaw(): Promise<void> {
  if (isExtension) {
    await browser.storage.local.remove(STORAGE_KEY);
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

export const chromeStorage: PersistStorage<State> = {
  async getItem(_name: string): Promise<StorageValue<State> | null> {
    const snap = await readRaw();
    if (!snap) return null;
    return { state: snap.state, version: snap.version };
  },
  async setItem(_name: string, value: StorageValue<State>): Promise<void> {
    await writeRaw({ state: value.state, version: value.version ?? 0 });
  },
  async removeItem(_name: string): Promise<void> {
    await removeRaw();
  }
};

export function subscribeExternalChanges(onChange: (next: State) => void): () => void {
  if (!isExtension || !browser.storage.onChanged) return () => {};
  const listener = (
    changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
    area: string
  ) => {
    if (area !== 'local') return;
    const c = changes[STORAGE_KEY];
    if (!c) return;
    const v = c.newValue;
    if (!v) return;
    const next = (v && typeof v === 'object' && 'state' in v
      ? (v as { state: State }).state
      : v) as State;
    onChange(next);
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
