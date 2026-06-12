import type { ReactNode } from 'react';

/** Small selectable filter/preset chip with the shared on/off styling. */
export function ToggleChip({
  on,
  onClick,
  disabled,
  className = '',
  children,
}: Readonly<{
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-md border text-xs transition-colors disabled:opacity-40 ${
        on
          ? 'border-sky-500 bg-sky-900/40 text-sky-100'
          : 'border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800 disabled:hover:bg-slate-800/60'
      } ${className}`}
    >
      {children}
    </button>
  );
}
