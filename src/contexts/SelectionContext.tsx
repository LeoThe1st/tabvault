import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';

interface SelectionApi {
  active: boolean;
  selectedIds: Set<string>;
  count: number;
  enter: () => void;
  exit: () => void;
  toggle: (id: string) => void;
  isSelected: (id: string) => boolean;
  clear: () => void;
}

const Ctx = createContext<SelectionApi | null>(null);

export function useSelection(): SelectionApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('SelectionProvider missing');
  return v;
}

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [selectedIds, setSelected] = useState<Set<string>>(new Set());

  const enter = useCallback(() => {
    setActive(true);
    setSelected(new Set());
  }, []);
  const exit = useCallback(() => {
    setActive(false);
    setSelected(new Set());
  }, []);
  const clear = useCallback(() => setSelected(new Set()), []);
  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const api = useMemo<SelectionApi>(
    () => ({
      active,
      selectedIds,
      count: selectedIds.size,
      enter,
      exit,
      toggle,
      isSelected,
      clear
    }),
    [active, selectedIds, enter, exit, toggle, isSelected, clear]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
