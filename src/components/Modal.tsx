import { useEffect, useRef, type ReactNode } from 'react';

/** Centred dialog with a title bar. Closes on backdrop click, the × button, or Escape. */
export function Modal({
  title,
  onClose,
  children,
}: Readonly<{ title: string; onClose: () => void; children: ReactNode }>) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      className="fixed inset-0 z-50 flex cursor-default items-center justify-center bg-black/80 p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg border border-slate-700 bg-slate-800 text-left shadow-xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-700 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-xl leading-none text-slate-400 hover:text-slate-200"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 text-sm leading-relaxed text-slate-300">
          {children}
        </div>
      </div>
    </button>
  );
}
