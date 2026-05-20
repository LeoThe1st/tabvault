import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { createPortal } from 'react-dom';

interface PromptOpts {
  title: string;
  label: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  primaryLabel?: string;
}

interface ConfirmOpts {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface AlertOpts {
  title: string;
  message?: string;
}

interface BookmarkEditOpts {
  url: string;
  title: string;
  description: string;
}

export interface BookmarkEditResult {
  title: string;
  description: string;
}

interface DialogApi {
  prompt: (opts: PromptOpts) => Promise<string | null>;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  alert: (opts: AlertOpts) => Promise<void>;
  editBookmark: (opts: BookmarkEditOpts) => Promise<BookmarkEditResult | null>;
}

const Ctx = createContext<DialogApi | null>(null);

export function useDialogs(): DialogApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('DialogHost missing');
  return v;
}

type DialogNode = (close: () => void) => ReactNode;

export function DialogHost({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Array<{ id: number; render: DialogNode }>>([]);
  const idRef = useRef(0);

  const push = useCallback((render: DialogNode) => {
    const id = ++idRef.current;
    setStack((s) => [...s, { id, render }]);
    return () => setStack((s) => s.filter((x) => x.id !== id));
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      prompt: (opts) =>
        new Promise((resolve) => {
          const remove = push((close) => (
            <PromptDialog
              opts={opts}
              onDone={(v) => {
                close();
                resolve(v);
              }}
            />
          ));
          void remove;
        }),
      confirm: (opts) =>
        new Promise((resolve) => {
          push((close) => (
            <ConfirmDialog
              opts={opts}
              onDone={(v) => {
                close();
                resolve(v);
              }}
            />
          ));
        }),
      alert: (opts) =>
        new Promise((resolve) => {
          push((close) => (
            <AlertDialog
              opts={opts}
              onDone={() => {
                close();
                resolve();
              }}
            />
          ));
        }),
      editBookmark: (opts) =>
        new Promise((resolve) => {
          push((close) => (
            <BookmarkEditDialog
              opts={opts}
              onDone={(v) => {
                close();
                resolve(v);
              }}
            />
          ));
        })
    }),
    [push]
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {stack.map(({ id, render }) =>
        createPortal(
          <ModalShell key={id}>{render(() => setStack((s) => s.filter((x) => x.id !== id)))}</ModalShell>,
          document.body
        )
      )}
    </Ctx.Provider>
  );
}

function ModalShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(r);
  }, []);
  return <div className={'modal' + (open ? ' open' : '')}>{children}</div>;
}

/* ===== Dialogs ===== */

function PromptDialog({
  opts,
  onDone
}: {
  opts: PromptOpts;
  onDone: (v: string | null) => void;
}) {
  const [value, setValue] = useState(opts.value || '');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);
  }, []);

  const submit = () => {
    const v = value.trim();
    if (opts.required && !v) {
      inputRef.current?.focus();
      return;
    }
    onDone(v || null);
  };

  return (
    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
      <h2>{opts.title}</h2>
      <label>
        <span>
          {opts.label}
          {opts.required && <span className="d-req">*</span>}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={opts.placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onDone(null);
          }}
        />
      </label>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={() => onDone(null)}>
          Cancel
        </button>
        <button className="btn-primary" onClick={submit}>
          {opts.primaryLabel || 'Save'}
        </button>
      </div>
      <Backdrop onClose={() => onDone(null)} />
    </div>
  );
}

function ConfirmDialog({
  opts,
  onDone
}: {
  opts: ConfirmOpts;
  onDone: (v: boolean) => void;
}) {
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setTimeout(() => okRef.current?.focus(), 30);
  }, []);
  return (
    <div
      className="modal-card"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onDone(false);
        if (e.key === 'Enter') onDone(true);
      }}
    >
      <h2>{opts.title}</h2>
      {opts.message && <p className="d-msg">{opts.message}</p>}
      <div className="modal-actions">
        <button className="btn-ghost" onClick={() => onDone(false)}>
          Cancel
        </button>
        <button
          ref={okRef}
          className={opts.danger ? 'btn-danger-solid' : 'btn-primary'}
          onClick={() => onDone(true)}
        >
          {opts.confirmLabel || 'OK'}
        </button>
      </div>
      <Backdrop onClose={() => onDone(false)} />
    </div>
  );
}

function AlertDialog({ opts, onDone }: { opts: AlertOpts; onDone: () => void }) {
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setTimeout(() => okRef.current?.focus(), 30);
  }, []);
  return (
    <div
      className="modal-card"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter') onDone();
      }}
    >
      <h2>{opts.title}</h2>
      {opts.message && <p className="d-msg">{opts.message}</p>}
      <div className="modal-actions">
        <button ref={okRef} className="btn-primary" onClick={onDone}>
          OK
        </button>
      </div>
      <Backdrop onClose={onDone} />
    </div>
  );
}

function BookmarkEditDialog({
  opts,
  onDone
}: {
  opts: BookmarkEditOpts;
  onDone: (v: BookmarkEditResult | null) => void;
}) {
  const [title, setTitle] = useState(opts.title || '');
  const [desc, setDesc] = useState(opts.description || '');
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setTimeout(() => {
      titleRef.current?.focus();
      titleRef.current?.select();
    }, 30);
  }, []);

  const submit = () =>
    onDone({ title: title.trim() || opts.url, description: desc.trim() });

  return (
    <div
      className="modal-card"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onDone(null);
      }}
    >
      <h2>Edit Link</h2>
      <label>
        <span>URL</span>
        <input type="url" readOnly value={opts.url} />
      </label>
      <label>
        <span>Title</span>
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
      </label>
      <label>
        <span>Description</span>
        <textarea
          maxLength={2000}
          rows={3}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </label>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={() => onDone(null)}>
          Cancel
        </button>
        <button className="btn-primary" onClick={submit}>
          Save
        </button>
      </div>
      <Backdrop onClose={() => onDone(null)} />
    </div>
  );
}

/** Невидимая подложка — клик мимо карточки = закрыть. Лежит ПОД карточкой по z-order. */
function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: -1 }}
      onClick={onClose}
      aria-hidden
    />
  );
}
