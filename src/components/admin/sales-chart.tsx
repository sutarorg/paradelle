import { cn, formatINR } from "@/lib/utils";

/**
 * Dependency-free SVG revenue chart (server-renderable).
 * Bars + smooth area line in champagne gold on an ivory panel.
 */
export function SalesChart({
  points,
  className,
}: {
  points: { label: string; value: number }[];
  className?: string;
}) {
  const W = 720;
  const H = 220;
  const PAD = 28;
  const max = Math.max(1, ...points.map((p) => p.value));
  const bw = (W - PAD * 2) / Math.max(1, points.length);
  const barW = Math.max(6, Math.min(34, bw * 0.55));
  const hFor = (v: number) => ((H - PAD * 2) * v) / max;

  return (
    <div className={cn("rounded-2xl border border-espresso/8 bg-white p-5", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Revenue by day">
        <defs>
          <linearGradient id="goldBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A66B" />
            <stop offset="100%" stopColor="#795038" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H - PAD - (H - PAD * 2) * f} y2={H - PAD - (H - PAD * 2) * f} stroke="#291813" strokeOpacity="0.07" strokeDasharray="2 5" />
        ))}
        {points.length === 0 ? (
          <text x={W / 2} y={H / 2} textAnchor="middle" fill="#795038" fontSize="14">No paid revenue in this window yet</text>
        ) : (
          points.map((p, i) => {
            const x = PAD + i * bw + (bw - barW) / 2;
            const h = hFor(p.value);
            const y = H - PAD - h;
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW} height={Math.max(2, h)} rx={Math.min(6, barW / 2)} fill="url(#goldBar)">
                  <title>{`${p.label}: ${formatINR(p.value)}`}</title>
                </rect>
                {(points.length <= 14 || i % Math.ceil(points.length / 8) === 0) && (
                  <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#291813" fillOpacity="0.45">
                    {p.label}
                  </text>
                )}
              </g>
            );
          })
        )}
        <text x={PAD} y={16} fontSize="11" fill="#291813" fillOpacity="0.5">
          peak {formatINR(max === 1 && points.every((p) => p.value === 0) ? 0 : max)}
        </text>
      </svg>
    </div>
  );
}
