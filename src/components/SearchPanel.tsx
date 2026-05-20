import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/store/store';
import { faviconFor } from '@/lib/favicon';

interface Props {
  onClose: () => void;
}

export function SearchPanel({ onClose }: Props) {
  const workspaces = useStore((s) => s.workspaces);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hits = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return [];
    const out: Array<{
      bm: { id: string; url: string; title: string };
      ws: string;
      board: string;
    }> = [];
    for (const w of workspaces) {
      for (const b of w.boards) {
        for (const bm of b.bookmarks) {
          if ((bm.title + ' ' + bm.url).toLowerCase().includes(ql)) {
            out.push({ bm, ws: w.name, board: b.name });
            if (out.length >= 50) return out;
          }
        }
      }
    }
    return out;
  }, [q, workspaces]);

  return (
    <div className="search-panel">
      <input
        ref={inputRef}
        type="text"
        placeholder="Поиск по закладкам..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="search-results">
        {hits.map((h) => (
          <a key={h.bm.id} href={h.bm.url}>
            <img className="bm-icon" src={faviconFor(h.bm.url)} alt="" />
            <span className="bm-title">{h.bm.title}</span>
            <span className="meta">
              {h.ws} / {h.board}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
