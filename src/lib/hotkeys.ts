const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta', 'OS', 'AltGraph']);

/** Превращает KeyboardEvent в нормализованную строку, например "Ctrl+Shift+K".
 *  Возвращает null, если нажат только модификатор (не финальная клавиша). */
export function eventToCombo(e: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(e.key)) return null;

  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Meta');

  let main = e.key;
  // Layout-independent для букв и цифр
  if (/^Key[A-Z]$/.test(e.code)) main = e.code.slice(3);
  else if (/^Digit\d$/.test(e.code)) main = e.code.slice(5);
  else if (/^F\d{1,2}$/.test(e.code)) main = e.code;
  else {
    const map: Record<string, string> = {
      ' ': 'Space',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'Escape': 'Esc'
    };
    main = map[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key);
  }
  if (!main || MODIFIER_KEYS.has(main)) return null;

  parts.push(main);
  return parts.join('+');
}

/** Валидная комбинация — либо с модификатором, либо функциональная клавиша. */
export function isValidCombo(combo: string | null): boolean {
  if (!combo) return false;
  const parts = combo.split('+');
  const main = parts[parts.length - 1];
  if (!main) return false;
  if (MODIFIER_KEYS.has(main) || ['Ctrl', 'Alt', 'Shift', 'Meta'].includes(main)) return false;
  return parts.length > 1 || /^F\d{1,2}$/.test(main);
}

/** True если фокус сейчас в редактируемом поле — хоткеи должны быть выключены. */
export function isEditingElement(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}
