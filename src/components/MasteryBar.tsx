import { useEffect, useRef, useState } from 'react';
import { masterySegments } from '../lib/mastery';

/** Track an element's content-box width in px (0 until first measurement). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

// At the 10px bar font a digit is ~6px wide; keep a little side padding so it isn't flush to the edge.
const fitsCount = (segPx: number, n: number) => segPx >= String(n).length * 6 + 4;

/** Stacked soft-outlined mastery bar with question counts inside segments wide enough to fit them. */
export function MasteryBar({ total, buckets }: Readonly<{ total: number; buckets: Map<number, number> | undefined }>) {
  const [ref, barWidth] = useWidth<HTMLDivElement>();
  return (
    <div ref={ref} className="flex h-4 gap-0.5 text-[10px] leading-none">
      {masterySegments(total, buckets).filter((seg) => seg.n > 0).map((seg) => {
        const pct = total ? (seg.n / total) * 100 : 0;
        return (
          <div
            key={seg.key}
            className={`${seg.cls} ${seg.txt} flex items-center justify-center overflow-hidden rounded-xs`}
            title={seg.title}
            style={{ width: `${pct}%` }}
          >
            {fitsCount((pct / 100) * barWidth, seg.n) && seg.n}
          </div>
        );
      })}
    </div>
  );
}

/** Thin counter-less variant used by the per-tool rows. */
export function MiniMasteryBar({ total, buckets }: Readonly<{ total: number; buckets: Map<number, number> | undefined }>) {
  return (
    <div className="flex h-px flex-1 gap-0.5">
      {masterySegments(total, buckets).filter((seg) => seg.n > 0).map((seg) => (
        <div
          key={seg.key}
          className={`${seg.cls} rounded-xs`}
          title={seg.title}
          style={{ width: `${total ? (seg.n / total) * 100 : 0}%` }}
        />
      ))}
    </div>
  );
}
