import { useCallback } from 'react';
import { useStore } from '@/store/store';
import { useDialogs } from '@/dialogs/DialogHost';
import { HOTKEY_META, type HotkeyAction } from '@/store/types';
import { HotkeyBinder } from './HotkeyBinder';

const ACTION_ORDER: HotkeyAction[] = [
  'search',
  'settings',
  'trash',
  'togglePrivacy',
  'toggleIncognito',
  'toggleSelection',
  'newBoard',
  'nextWs',
  'prevWs'
];

export function HotkeysTab() {
  const dialogs = useDialogs();
  const hotkeys = useStore((s) => s.hotkeys);
  const setHotkey = useStore((s) => s.setHotkey);
  const resetHotkeys = useStore((s) => s.resetHotkeys);

  const takenBy = useCallback(
    (combo: string): string | null => {
      for (const [action, binding] of Object.entries(hotkeys)) {
        if (binding === combo) return HOTKEY_META[action as HotkeyAction].title;
      }
      return null;
    },
    [hotkeys]
  );

  const onChange = (action: HotkeyAction) => (combo: string | null) => {
    if (combo) {
      // Если новая комбинация уже занята другим действием — сбрасываем там
      for (const [other, binding] of Object.entries(hotkeys)) {
        if (other !== action && binding === combo) {
          setHotkey(other as HotkeyAction, null);
        }
      }
    }
    setHotkey(action, combo);
  };

  const onReset = async () => {
    const ok = await dialogs.confirm({
      title: 'Сбросить хоткеи',
      message: 'Все привязки вернутся к значениям по умолчанию.',
      confirmLabel: 'Reset'
    });
    if (ok) resetHotkeys();
  };

  return (
    <>
      <h1 className="settings-h1">Hotkeys</h1>

      <p
        className="d-msg"
        style={{ marginTop: 12, marginBottom: 12, fontSize: 13 }}
      >
        Назначь свои сочетания клавиш. Нажми на кнопку справа от действия и набери комбинацию.
        <br />
        <b>Esc</b> — отменить запись, <b>Backspace</b> — очистить. Хоткеи не срабатывают пока фокус
        в поле ввода. Некоторые сочетания может перехватывать Chrome — если не работает, выбери другое.
      </p>

      <div className="settings-section">
        <div className="settings-section-body">
          {ACTION_ORDER.map((action) => {
            const meta = HOTKEY_META[action];
            return (
              <div className="setting-row" key={action}>
                <div className="setting-row-text">
                  <div className="setting-row-title">{meta.title}</div>
                  <div className="setting-row-desc">{meta.desc}</div>
                </div>
                <div className="setting-row-control">
                  <HotkeyBinder
                    value={hotkeys[action]}
                    onChange={onChange(action)}
                    takenBy={takenBy}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-ghost" onClick={() => void onReset()}>
          Reset to defaults
        </button>
      </div>
    </>
  );
}
