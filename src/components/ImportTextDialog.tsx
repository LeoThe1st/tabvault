import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { uid } from '@/lib/uid';
import { parseUrls } from '@/lib/parseUrls';
import { useStore } from '@/store/store';

interface Props {
  onClose: () => void;
}

export function ImportTextDialog({ onClose }: Props) {
  const importBoards = useStore((s) => s.importBoards);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const r = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(r);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const urls = useMemo(() => parseUrls(text), [text]);

  const onPickFile = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const content = await file.text();
    setText((prev) => (prev ? prev + '\n' + content : content));
  };

  const onImport = () => {
    if (!urls.length) return;
    const name = `Imported ${new Date().toLocaleDateString('ru-RU')}`;
    importBoards([
      {
        name,
        bookmarks: urls.map((url) => ({
          id: uid(),
          url,
          title: url,
          favIconUrl: ''
        }))
      }
    ]);
    onClose();
  };

  return createPortal(
    <div className={'modal' + (open ? ' open' : '')}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 92vw)' }}>
        <h2>Импорт ссылок из текста/файла</h2>
        <p className="d-msg" style={{ marginTop: -6 }}>
          Вставь текст с URL'ами или подгрузи файл (.txt, .md, .html — любой текст).
          Все <code>http(s)://</code> ссылки будут вытащены автоматически.
        </p>
        <label>
          <span>Текст</span>
          <textarea
            rows={10}
            placeholder="https://example.com&#10;Какой-то текст https://github.com и ещё https://news.ycombinator.com"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: 13 }}
          />
        </label>
        <input type="file" ref={fileRef} hidden accept=".txt,.md,.html,.htm,.csv,.json,text/*" onChange={onFile} />
        <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
          <button className="btn-ghost" onClick={onPickFile}>Загрузить файл</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--fg-mute)', fontSize: 13 }}>
              Найдено: <b style={{ color: 'var(--fg)' }}>{urls.length}</b>
            </span>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={!urls.length} onClick={onImport}>
              Импортировать
            </button>
          </div>
        </div>
      </div>
      <div style={{ position: 'fixed', inset: 0, zIndex: -1 }} onClick={onClose} />
    </div>,
    document.body
  );
}
