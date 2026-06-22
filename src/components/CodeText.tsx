import type { ReactNode } from 'react';

const CODE_CLASS = 'rounded bg-slate-950/60 px-1 py-0.5 font-mono text-[14px] text-white';

/** Inline code span, styled for the dark theme. */
export function Code({ children }: Readonly<{ children: ReactNode }>) {
  return <code className={CODE_CLASS}>{children}</code>;
}

/** Render quiz text, turning `backtick`-delimited spans into inline code. */
export function CodeText({ text }: Readonly<{ text: string }>) {
  if (!text.includes('`')) return <>{text}</>;
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.length > 1 && part.startsWith('`') && part.endsWith('`') ? (
          <Code key={i}>{part.slice(1, -1)}</Code>
        ) : (
          part
        ),
      )}
    </>
  );
}
