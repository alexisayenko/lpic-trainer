import { useEffect, useRef, useState } from 'react';
import { MASTERY_BUCKETS, MASTERY_TINTS } from '../types';
import { MasteryChip } from './QuestionCardHeader';

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Canvas gradient: hue left→right, white→black top→bottom. Tap returns the exact pixel colour.
 *  When `value` is set, a crosshair marks the nearest matching spot. */
function GradientPicker({ value, onPick }: Readonly<{ value: string | null; onPick: (hex: string) => void }>) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { width, height } = canvas;
    const hue = ctx.createLinearGradient(0, 0, width, 0);
    for (let i = 0; i <= 12; i++) hue.addColorStop(i / 12, `hsl(${(i / 12) * 360} 100% 50%)`);
    ctx.fillStyle = hue;
    ctx.fillRect(0, 0, width, height);
    const light = ctx.createLinearGradient(0, 0, 0, height);
    light.addColorStop(0, 'rgba(255,255,255,1)');
    light.addColorStop(0.5, 'rgba(255,255,255,0)');
    light.addColorStop(0.5, 'rgba(0,0,0,0)');
    light.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, width, height);

    if (!value) return;
    const tr = Number.parseInt(value.slice(1, 3), 16);
    const tg = Number.parseInt(value.slice(3, 5), 16);
    const tb = Number.parseInt(value.slice(5, 7), 16);
    const px = ctx.getImageData(0, 0, width, height).data;
    let best = Infinity;
    let bx = 0;
    let by = 0;
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        const d = (px[i] - tr) ** 2 + (px[i + 1] - tg) ** 2 + (px[i + 2] - tb) ** 2;
        if (d < best) {
          best = d;
          bx = x;
          by = y;
        }
      }
    }
    ctx.beginPath();
    ctx.arc(bx, by, 6, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx, by, 8, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }, [value]);

  return (
    <canvas
      ref={ref}
      width={600}
      height={120}
      className="h-28 w-full cursor-crosshair rounded-sm"
      onPointerDown={(e) => {
        const canvas = ref.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.min(canvas.width - 1, Math.max(0, ((e.clientX - rect.left) / rect.width) * canvas.width));
        const y = Math.min(canvas.height - 1, Math.max(0, ((e.clientY - rect.top) / rect.height) * canvas.height));
        const [r, g, b] = canvas.getContext('2d')!.getImageData(x, y, 1, 1).data;
        onPick(toHex(r, g, b));
      }}
    />
  );
}

/** Dev-only palette preview: all 7 stages (unseen + 6 mastery buckets) side by side.
 *  Click a bar to open a gradient picker preselected on its current colour; tap to recolour. */
export function PalettePanel() {
  const [active, setActive] = useState<string | null>(null);
  const [baseHex, setBaseHex] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const stages = [
    { key: 'unseen', label: 'unseen', bar: 'bg-slate-500', chip: <MasteryChip score={null} /> },
    ...MASTERY_BUCKETS.map((score) => ({
      key: `m${score}`,
      label: `${score}%`,
      bar: MASTERY_TINTS[score].bar,
      chip: <MasteryChip score={score} />,
    })),
  ];

  return (
    <div className="rounded-md border border-slate-700 p-3">
      <div className="mb-2 text-xs text-slate-500">palette test panel — click a bar, then tap the gradient</div>
      <div className="grid grid-cols-7 gap-2">
        {stages.map((s) => (
          <div key={s.key} className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                if (active === s.key) {
                  setActive(null);
                  return;
                }
                const m = getComputedStyle(e.currentTarget).backgroundColor.match(/\d+/g);
                setBaseHex(m ? toHex(+m[0], +m[1], +m[2]) : null);
                setActive(s.key);
              }}
              className={`h-3 w-full rounded-xs ${overrides[s.key] ? '' : s.bar} ${
                active === s.key ? 'ring-2 ring-slate-300' : ''
              }`}
              style={overrides[s.key] ? { backgroundColor: overrides[s.key] } : undefined}
            />
            {s.chip}
            <span className="text-[10px] text-slate-400">
              {overrides[s.key] ?? s.label}
            </span>
          </div>
        ))}
      </div>
      {active && (
        <div className="mt-3">
          <GradientPicker
            value={overrides[active] ?? baseHex}
            onPick={(hex) => setOverrides((o) => ({ ...o, [active]: hex }))}
          />
        </div>
      )}
    </div>
  );
}
