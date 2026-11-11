import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/** Width of the chart container in CSS pixels, so SVG text stays at its true size. */
function useWidth(fallback = 640) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

// ---------- tooltip ----------

export function useTooltip() {
  const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);
  const show = (e: React.MouseEvent | React.FocusEvent, content: ReactNode) => {
    const r = "clientX" in e ? { x: e.clientX, y: e.clientY } : boxCenter(e.currentTarget as Element);
    setTip({ x: r.x, y: r.y, content });
  };
  const hide = () => setTip(null);
  const node = tip ? (
    <div
      className="tooltip"
      role="status"
      style={{ left: Math.min(tip.x + 14, window.innerWidth - 300), top: tip.y + 16 }}
    >
      {tip.content}
    </div>
  ) : null;
  return { show, hide, node };
}

function boxCenter(el: Element) {
  const b = el.getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
}

function niceTicks(lo: number, hi: number, n = 4): number[] {
  const span = hi - lo || 1;
  const step0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const start = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

const fmt = (v: number, d: number) => v.toLocaleString("en-AU", { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------- strip plot ----------

export interface StripPoint {
  id: string;
  v: number;
  detail?: string;
}

export interface StripGroup {
  label: string;
  color: string;
  points: StripPoint[];
}

/** One row of dots per group, with each group's mean as an ink tick. Optional threshold line. */
export function StripPlot({
  groups,
  digits = 1,
  unit = "",
  threshold,
  domain,
  height = 34,
  labelWidth = 0,
  onPick,
}: {
  groups: StripGroup[];
  digits?: number;
  unit?: string;
  threshold?: number;
  domain?: [number, number];
  height?: number;
  labelWidth?: number;
  onPick?: (id: string) => void;
}) {
  const tip = useTooltip();
  const { ref, w: W } = useWidth();
  const narrow = W < 520;
  const lw = labelWidth ? (narrow ? Math.min(labelWidth, 128) : labelWidth) : 0;
  const padL = lw + 18;
  const padR = 18;
  const rowH = height;
  const H = groups.length * rowH + 30;
  const all = groups.flatMap((g) => g.points.map((p) => p.v));
  const [lo, hi] = useMemo(() => {
    if (domain) return domain;
    const mn = Math.min(...all, threshold ?? Infinity);
    const mx = Math.max(...all, threshold ?? -Infinity);
    const pad = (mx - mn) * 0.06 || 1;
    return [mn - pad, mx + pad];
  }, [all.join(","), threshold, domain]);
  const x = (v: number) => padL + ((v - lo) / (hi - lo)) * (W - padL - padR);
  const ticks = niceTicks(lo, hi, 6);

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block", maxWidth: "100%" }} role="img" aria-label={groups.map((g) => g.label).join(" vs ")}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={0} y2={H - 24} stroke="#e4e9ec" />
            <text x={x(t)} y={H - 8} fontSize={12} fill="#6b7a87" textAnchor="middle">
              {fmt(t, Math.max(0, digits - 1))}
            </text>
          </g>
        ))}
        {groups.map((g, gi) => {
          const y0 = gi * rowH + rowH / 2;
          const m = g.points.reduce((a, p) => a + p.v, 0) / Math.max(1, g.points.length);
          return (
            <g key={g.label}>
              {lw > 0 &&
                (narrow ? (
                  <text x={0} y={y0 - 2} fontSize={11.5} fill="#475867">
                    {g.label.split(", ").map((part, k) => (
                      <tspan key={k} x={0} dy={k === 0 ? 0 : 13}>
                        {part}
                      </tspan>
                    ))}
                  </text>
                ) : (
                  <text x={0} y={y0 + 4} fontSize={12.5} fill="#475867">
                    {g.label}
                  </text>
                ))}
              {g.points.map((p, i) => {
                const jitter = ((i * 37) % 11) / 10 - 0.5;
                return (
                  <circle
                    key={p.id}
                    cx={x(p.v)}
                    cy={y0 + jitter * (rowH * 0.5)}
                    r={5}
                    fill={g.color}
                    fillOpacity={0.72}
                    stroke="#fff"
                    strokeWidth={1.5}
                    tabIndex={0}
                    style={{ cursor: onPick ? "pointer" : "default", outline: "none" }}
                    onMouseMove={(e) =>
                      tip.show(
                        e,
                        <>
                          <strong>{g.label}</strong>
                          <br />
                          {p.id}: {fmt(p.v, digits)} {unit}
                          {p.detail && (
                            <>
                              <br />
                              <span style={{ opacity: 0.8 }}>{p.detail}</span>
                            </>
                          )}
                        </>,
                      )
                    }
                    onFocus={(e) => tip.show(e, `${g.label} · ${p.id}: ${fmt(p.v, digits)} ${unit}`)}
                    onMouseLeave={tip.hide}
                    onBlur={tip.hide}
                    onClick={() => onPick?.(p.id)}
                    onKeyDown={(e) => e.key === "Enter" && onPick?.(p.id)}
                  />
                );
              })}
              <line x1={x(m)} x2={x(m)} y1={y0 - rowH * 0.42} y2={y0 + rowH * 0.42} stroke="#1c2b3a" strokeWidth={2.5} strokeLinecap="round" />
            </g>
          );
        })}
        {threshold !== undefined && (
          <g>
            <line x1={x(threshold)} x2={x(threshold)} y1={0} y2={H - 24} stroke="#1c2b3a" strokeDasharray="4 3" strokeWidth={1.5} />
          </g>
        )}
      </svg>
      {tip.node}
    </div>
  );
}

// ---------- horizontal bar list ----------

export function BarList({
  rows,
  max,
  digits = 0,
  suffix = "",
}: {
  rows: { label: string; value: number; color: string; note?: string }[];
  max?: number;
  digits?: number;
  suffix?: string;
}) {
  const m = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <div role="table" style={{ display: "grid", gap: 8 }}>
      {rows.map((r) => (
        <div key={r.label} role="row" className="bar-row">
          <span role="cell" className="bar-label">
            {r.label}
          </span>
          <span role="cell" className="bar-track">
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${(100 * r.value) / m}%`,
                background: r.color,
                borderRadius: r.value >= m ? 4 : "4px 4px 4px 4px",
                minWidth: r.value > 0 ? 3 : 0,
              }}
            />
          </span>
          <span role="cell" className="bar-value">
            {fmt(r.value, digits)}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------- heatmap (sequential, single hue) ----------

const RAMP = ["#0b4f4a", "#0f6d66", "#178c84", "#3aa79e", "#71c2ba", "#a8dbd5", "#d8efec", "#f3faf9"];

export function Heatmap({
  labels,
  groups,
  matrix,
  highlight,
  onPick,
}: {
  labels: string[];
  groups: string[];
  matrix: number[][];
  highlight?: number;
  onPick?: (i: number) => void;
}) {
  const tip = useTooltip();
  const n = labels.length;
  const cell = Math.max(5, Math.min(9, 560 / n));
  const pad = 120;
  const size = pad + n * cell;
  const vals = matrix.flatMap((r, i) => r.filter((_, j) => j !== i));
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const color = (v: number) => RAMP[Math.min(RAMP.length - 1, Math.floor(((v - lo) / (hi - lo + 1e-9)) * RAMP.length))];
  // group boundaries
  const bounds: { name: string; start: number; end: number }[] = [];
  groups.forEach((g, i) => {
    const last = bounds[bounds.length - 1];
    if (last && last.name === g) last.end = i;
    else bounds.push({ name: g, start: i, end: i });
  });
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${size + 4} ${size + 4}`} width="100%" style={{ maxWidth: 680 }} role="img" aria-label="Burrows' Delta distance matrix">
        {bounds.map((b) => (
          <g key={b.name}>
            <text x={pad - 8} y={pad + ((b.start + b.end + 1) / 2) * cell + 4} fontSize={12} textAnchor="end" fill="#475867">
              {b.name}
            </text>
            <text
              x={pad + ((b.start + b.end + 1) / 2) * cell}
              y={pad - 8}
              fontSize={12}
              textAnchor="start"
              fill="#475867"
              transform={`rotate(-45 ${pad + ((b.start + b.end + 1) / 2) * cell} ${pad - 8})`}
            >
              {b.name}
            </text>
          </g>
        ))}
        {matrix.map((row, i) =>
          row.map((v, j) => (
            <rect
              key={`${i}-${j}`}
              x={pad + j * cell}
              y={pad + i * cell}
              width={cell - 0.6}
              height={cell - 0.6}
              fill={i === j ? "#ffffff" : color(v)}
              onMouseMove={(e) => tip.show(e, <>{labels[i]}<br />{labels[j]}<br />Delta {v.toFixed(3)}</>)}
              onMouseLeave={tip.hide}
              onClick={() => onPick?.(i)}
              style={{ cursor: onPick ? "pointer" : "default" }}
            />
          )),
        )}
        {highlight !== undefined && (
          <g fill="none" stroke="#1c2b3a" strokeWidth={1.5} pointerEvents="none">
            <rect x={pad - 1} y={pad + highlight * cell - 1} width={n * cell + 1.4} height={cell + 1.4} />
            <rect x={pad + highlight * cell - 1} y={pad - 1} width={cell + 1.4} height={n * cell + 1.4} />
          </g>
        )}
        {bounds.slice(1).map((b) => (
          <g key={`b-${b.name}`}>
            <line x1={pad} x2={pad + n * cell} y1={pad + b.start * cell - 0.3} y2={pad + b.start * cell - 0.3} stroke="#fff" strokeWidth={2} />
            <line y1={pad} y2={pad + n * cell} x1={pad + b.start * cell - 0.3} x2={pad + b.start * cell - 0.3} stroke="#fff" strokeWidth={2} />
          </g>
        ))}
      </svg>
      <div className="legend small" style={{ marginTop: 6 }}>
        <span>Closer in style</span>
        <span style={{ display: "inline-flex", gap: 0 }}>
          {RAMP.map((c) => (
            <span key={c} style={{ width: 22, height: 10, background: c, display: "inline-block" }} />
          ))}
        </span>
        <span>Further apart</span>
      </div>
      {tip.node}
    </div>
  );
}
