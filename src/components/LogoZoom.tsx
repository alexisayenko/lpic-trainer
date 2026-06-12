import { useEffect, useRef } from 'react';

/** Full-screen image lightbox. Closes on click or Escape; manages focus for accessibility. */
export function LogoZoom({ src, alt, onClose }: Readonly<{ src: string; alt: string; onClose: () => void }>) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
    >
      <button
        ref={ref}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="cursor-zoom-out focus:outline-none"
      >
        <img src={src} alt={alt} className="max-h-[85vh] max-w-full rounded-lg object-contain" />
      </button>
    </div>
  );
}
