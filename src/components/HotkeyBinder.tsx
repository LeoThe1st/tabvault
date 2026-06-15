import { useEffect, useRef, useState } from 'react';
import { eventToCombo, isValidCombo } from '@/lib/hotkeys';
import { CloseIcon } from './icons';

interface Props {
  value: string | null;
  onChange: (combo: string | null) => void;
  /** Список других уже занятых биндингов — чтобы предупредить о коллизии. */
  takenBy?: (combo: string) => string | null;
}

export function HotkeyBinder({ value, onChange, takenBy }: Props) {
  const [recording, setRecording] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const rootRef = useRef<HTMLButtonElement>(null);

  // Слушаем нажатия только пока recording=true
  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setRecording(false);
        setDraft(null);
        setWarn(null);
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        onChange(null);
        setRecording(false);
        setDraft(null);
        setWarn(null);
        return;
      }
      const combo = eventToCombo(e);
      if (!combo) return;
      setDraft(combo);
      if (!isValidCombo(combo)) {
        setWarn('Нужно сочетание с модификатором (Ctrl/Alt/Shift/Meta) либо F-клавиша');
        return;
      }
      const collision = takenBy?.(combo);
      if (collision) {
        setWarn(`Занято: "${collision}". Сохраню, прежний хоткей сбросится.`);
      } else {
        setWarn(null);
      }
      onChange(combo);
      setRecording(false);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [recording, onChange, takenBy]);

  const onClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setWarn(null);
    setDraft(null);
  };

  const label = recording
    ? draft ?? 'Нажми сочетание клавиш…'
    : value ?? '— не задано —';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        ref={rootRef}
        className={'hotkey-binder' + (recording ? ' recording' : '')}
        onClick={() => {
          setRecording((v) => !v);
          setDraft(null);
          setWarn(null);
        }}
        title={recording ? 'Esc — отменить, Backspace — очистить' : 'Кликни и нажми комбинацию'}
      >
        {label}
      </button>
      {value && !recording && (
        <button className="hotkey-clear" onClick={onClear} title="Очистить">
          <CloseIcon width={12} height={12} />
        </button>
      )}
      {warn && <span className="hotkey-warn">{warn}</span>}
    </div>
  );
}
