import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Anchor = HTMLElement | null;
type Placement = 'below-left' | 'below-right' | 'right-of';

interface Props {
  anchor: Anchor;
  placement?: Placement;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Popover({
  anchor,
  placement = 'below-right',
  onClose,
  children,
  className = 'board-menu'
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const r = anchor.getBoundingClientRect();
    const el = ref.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let top = r.bottom + 6;
    let left = r.left;
    if (placement === 'below-right') left = r.right - w;
    if (placement === 'right-of') {
      left = r.right + 8;
      top = r.top - h + r.height;
    }
    left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
    top = Math.max(8, Math.min(window.innerHeight - h - 8, top));
    el.style.top = top + 'px';
    el.style.left = left + 'px';
  }, [anchor, placement]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && anchor && !anchor.contains(t)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div ref={ref} className={className}>
      {children}
    </div>,
    document.body
  );
}
