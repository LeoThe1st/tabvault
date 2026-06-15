import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { uid } from '@/lib/uid';
import { parseBookmarks } from '@/lib/parseBookmarks';
import { fetchTitleAndDesc } from '@/lib/fetchMeta';
import { parallelMap } from '@/lib/parallelMap';
import { useStore } from '@/store/store';
import { Toggle } from './Toggle';

interface Props {
  onClose: () => void;
}

export function ImportTextDialog({ onClose }: Props) {
  const importBoards = useStore((s) => s.importBoards);
  const [text, setText] = useState('');
  const [fetchMissing, setFetchMissing] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const r = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(r);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !progress) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, progress]);

  const parsed = useMemo(() => parseBookmarks(text), [text]);
  const withTitle = parsed.filter((b) => b.title).length;
  const needFetch = parsed.length - withTitle;

  const onPickFile = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const content = await file.text();
    setText((prev) => (prev ? prev + '\n' + content : content));
  };

  const onImport = async () => {
    if (!parsed.length) return;
    const items = [...parsed];

    if (fetchMissing && needFetch > 0) {
      const targets = items
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => !b.title);
      setProgress({ done: 0, total: targets.length });
      await parallelMap(
        targets,
        8,
        async ({ b, i }) => {
          const meta = await fetchTitleAndDesc(b.url);
          if (meta.title) items[i] = { ...items[i], title: meta.title };
          return null;
        },
        (done, total) => setProgress({ done, total })
      );
    }

    const name = `Imported ${new Date().toLocaleDateString('ru-RU')}`;
    importBoards([
      {
        name,
        bookmarks: items.map((b) => ({
          id: uid(),
          url: b.url,
          title: b.title || b.url,
          favIconUrl: ''
        }))
      }
    ]);
    setProgress(null);
    onClose();
  };

  return createPortal(
    <div className={'modal' + (open ? ' open' : '')}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(600px, 92vw)' }}
      >
        <h2>Импорт ссылок из текста/файла</h2>
        <p className="d-msg" style={{ marginTop: -6 }}>
          Поддерживается HTML-экспорт закладок (Chrome / Firefox / Safari) — названия
          закладок берутся напрямую из файла. Можно также вставить любой текст с URL'ами —
          они извлекаются автоматически.
        </p>

        <label>
          <span>Текст или HTML-экспорт</span>
          <textarea
            rows={8}
            placeholder="https://example.com&#10;Какой-то текст https://github.com&#10;…или вставь содержимое bookmarks.html"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: 13 }}
            disabled={!!progress}
          />
        </label>

        <input
          type="file"
          ref={fileRef}
          hidden
          accept=".html,.htm,.txt,.md,.csv,.json,text/*"
          onChange={onFile}
        />

        {/* Опция fetch */}
        <div
          className="setting-row"
          style={{ border: '1px solid var(--board-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}
        >
          <div className="setting-row-text">
            <div className="setting-row-title" style={{ fontSize: 13.5 }}>
              Дозагружать названия для URL без title
            </div>
            <div className="setting-row-desc">
              Если ссылка без названия (плейн-текст или пустой anchor) — попробовать
              получить тег title страницы сетевым запросом. Может быть медленно для большого числа ссылок.
            </div>
          </div>
          <div className="setting-row-control">
            <Toggle checked={fetchMissing} onChange={setFetchMissing} label="Fetch titles" />
          </div>
        </div>

        {/* Прогресс или счётчики */}
        {progress ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              border: '1px solid var(--board-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13
            }}
          >
            <div className="spinner" />
            <div style={{ flex: 1 }}>
              Загрузка названий: <b>{progress.done}</b> / {progress.total}
              <div
                style={{
                  marginTop: 6,
                  height: 4,
                  background: 'var(--row-hover)',
                  borderRadius: 2,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(progress.done / progress.total) * 100}%`,
                    background: 'var(--accent)',
                    transition: 'width 120ms linear'
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--fg-mute)' }}>
            <span>Найдено: <b style={{ color: 'var(--fg)' }}>{parsed.length}</b></span>
            <span>с названием: <b style={{ color: 'var(--fg)' }}>{withTitle}</b></span>
            {needFetch > 0 && (
              <span>без названия: <b style={{ color: 'var(--fg)' }}>{needFetch}</b></span>
            )}
          </div>
        )}

        <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
          <button className="btn-ghost" onClick={onPickFile} disabled={!!progress}>
            Загрузить файл
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={onClose} disabled={!!progress}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={!parsed.length || !!progress}
              onClick={() => void onImport()}
            >
              Импортировать
            </button>
          </div>
        </div>
      </div>
      {!progress && (
        <div style={{ position: 'fixed', inset: 0, zIndex: -1 }} onClick={onClose} />
      )}
    </div>,
    document.body
  );
}
