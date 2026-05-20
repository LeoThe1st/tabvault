import { useState } from 'react';
import { fetchTitleAndDesc } from '@/lib/fetchMeta';
import { normalizeUrl } from '@/lib/normalizeUrl';
import { uid } from '@/lib/uid';
import { useStore } from '@/store/store';
import type { Board } from '@/store/types';

type Stage =
  | { kind: 'url' }
  | { kind: 'loading'; url: string }
  | { kind: 'meta'; url: string; title: string; desc: string };

interface Props {
  board: Board;
  onClose: () => void;
}

export function BoardForm({ board, onClose }: Props) {
  const addBookmark = useStore((s) => s.addBookmark);
  const [stage, setStage] = useState<Stage>({ kind: 'url' });
  const [urlValue, setUrlValue] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const startFetch = async () => {
    const url = normalizeUrl(urlValue);
    if (!url) return;
    setStage({ kind: 'loading', url });
    const meta = await fetchTitleAndDesc(url);
    setTitle(meta.title || url);
    setDesc(meta.desc || '');
    setStage({ kind: 'meta', url, title: meta.title || url, desc: meta.desc || '' });
  };

  if (stage.kind === 'loading') {
    return (
      <div className="fetching">
        <div className="spinner" />
        <span>Fetching title…</span>
      </div>
    );
  }

  if (stage.kind === 'meta') {
    const submit = () => {
      addBookmark(board.id, {
        id: uid(),
        url: stage.url,
        title: title.trim() || stage.url,
        description: desc.trim(),
        favIconUrl: ''
      });
      onClose();
    };
    return (
      <div
        className="board-form"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <input type="url" value={stage.url} readOnly />
        <input
          type="text"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
        <textarea
          maxLength={2000}
          placeholder="Optional description (shown below title)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div className="counter">
          <span>{desc.length}</span>/2000
        </div>
        <div className="row">
          <button className="btn-primary" onClick={submit}>
            Add Link
          </button>
          <button className="btn-danger" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="board-form"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <input
        type="url"
        placeholder="https://example.com"
        autoFocus
        value={urlValue}
        onChange={(e) => setUrlValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void startFetch();
          }
        }}
      />
      <div className="row">
        <button className="btn-primary" onClick={() => void startFetch()}>
          Add Link
        </button>
        <button className="btn-danger" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
