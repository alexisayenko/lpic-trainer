import { masterySegments } from '../lib/mastery';

/** Stacked soft-outlined mastery bar with question counts inside segments wide enough to fit them. */
export function MasteryBar({ total, buckets }: Readonly<{ total: number; buckets: Map<number, number> | undefined }>) {
  return (
    <div className="flex h-4 gap-0.5 text-[10px] leading-none">
      {masterySegments(total, buckets).filter((seg) => seg.n > 0).map((seg) => {
        const pct = total ? (seg.n / total) * 100 : 0;
        return (
          <div
            key={seg.key}
            className={`${seg.cls} ${seg.txt} flex items-center justify-center overflow-hidden rounded-sm`}
            title={seg.title}
            style={{ width: `${pct}%` }}
          >
            {pct >= String(seg.n).length * 2 && seg.n}
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
          className={`${seg.cls} rounded-sm`}
          title={seg.title}
          style={{ width: `${total ? (seg.n / total) * 100 : 0}%` }}
        />
      ))}
    </div>
  );
}
