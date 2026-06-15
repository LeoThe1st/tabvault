import { useEffect, useRef } from 'react';
import { useStore } from '@/store/store';
import type { HotkeyAction } from '@/store/types';
import { eventToCombo, isEditingElement } from '@/lib/hotkeys';

export type HotkeyHandlers = Partial<Record<HotkeyAction, () => void>>;

/** Глобальный слушатель keydown — матчит против пользовательских биндингов и вызывает handler. */
export function useHotkeys(handlers: HotkeyHandlers): void {
  const hotkeys = useStore((s) => s.hotkeys);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditingElement(e.target)) return;
      const combo = eventToCombo(e);
      if (!combo) return;
      for (const [action, binding] of Object.entries(hotkeys)) {
        if (binding && binding === combo) {
          const fn = handlersRef.current[action as HotkeyAction];
          if (fn) {
            e.preventDefault();
            fn();
            return;
          }
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hotkeys]);
}
