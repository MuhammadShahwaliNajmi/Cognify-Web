"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { GradePoint } from "@/lib/portal/types";

const NAVY = "#1a2744";
const GOLD = "#D4B254";
const EASE = [0.22, 1, 0.36, 1] as const;

/** Predicted-grade trend: gold line on a faint navy grid, with an optional target line. */
export function TrendChart({
  points,
  target,
  targetLabel,
  onNavy,
}: {
  points: GradePoint[];
  target?: number;
  targetLabel?: string;
  onNavy?: boolean;
}) {
  const reduce = useReducedMotion();
  const id = useId();
  if (points.length < 2) {
    return (
      <div className={`grid min-h-[10rem] place-items-center rounded-2xl border border-dashed px-6 text-center text-sm ${onNavy ? "border-white/15 text-white/55" : "border-navy/15 text-navy"}`}>
        {points.length === 1
          ? `First result: ${points[0].pct}%. The trend line appears after your next marked piece of work.`
          : "Your trend appears here once your work has been marked."}
      </div>
    );
  }
  const W = 600;
  const H = 230;
  const pad = { l: 38, r: 18, t: 18, b: 30 };
  const vals = points.map((p) => p.pct).concat(target ?? []);
  const lo = Math.floor((Math.min(...vals) - 6) / 10) * 10;
  const hi = Math.min(100, Math.ceil((Math.max(...vals) + 4) / 10) * 10);
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, points.length - 1);
  const y = (v: number) => pad.t + ((hi - v) * (H - pad.t - pad.b)) / (hi - lo);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.pct).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`;
  const ink = onNavy ? "#FFFFFF" : NAVY;
  const last = points[points.length - 1];
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += 10) ticks.push(v);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Trend from ${points[0].pct}% to ${last.pct}%`}>
      <defs>
        <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.28" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={ink} strokeOpacity={0.08} />
          <text x={pad.l - 10} y={y(v) + 4} textAnchor="end" fontSize="11" fill={ink} fillOpacity={0.45} fontFamily="ui-monospace, monospace">
            {v}
          </text>
        </g>
      ))}
      {points.map((p, i) => (
        <text key={p.label} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={ink} fillOpacity={0.45} fontFamily="ui-monospace, monospace">
          {p.label}
        </text>
      ))}

      {target !== undefined && (
        <g>
          <line x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} stroke={ink} strokeOpacity={0.5} strokeDasharray="5 6" />
          <text x={W - pad.r} y={y(target) - 7} textAnchor="end" fontSize="11" fontWeight="600" fill={ink} fillOpacity={0.7}>
            {targetLabel}
          </text>
        </g>
      )}

      <motion.path
        d={area}
        fill={`url(#area-${id})`}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={GOLD}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
      />
      {points.map((p, i) => (
        <motion.circle
          key={i}
          cx={x(i)}
          cy={y(p.pct)}
          r={i === points.length - 1 ? 6 : 3.2}
          fill={i === points.length - 1 ? GOLD : onNavy ? "#0e1a33" : "#FFFFFF"}
          stroke={GOLD}
          strokeWidth={2}
          initial={reduce ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.25 + i * 0.09 }}
          style={{ transformOrigin: `${x(i)}px ${y(p.pct)}px` }}
        />
      ))}
    </svg>
  );
}

/** Tiny trend line for cards and table rows. */
export function Spark({ points, className }: { points: GradePoint[]; className?: string }) {
  if (points.length < 2) return null;
  const W = 120;
  const H = 36;
  const vals = points.map((p) => p.pct);
  const lo = Math.min(...vals) - 2;
  const hi = Math.max(...vals) + 2;
  const x = (i: number) => 3 + (i * (W - 6)) / Math.max(1, points.length - 1);
  const y = (v: number) => 3 + ((hi - v) * (H - 6)) / (hi - lo);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.pct).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden="true">
      <path d={d} fill="none" stroke={GOLD} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(points.length - 1)} cy={y(vals[vals.length - 1])} r={3.2} fill={GOLD} />
    </svg>
  );
}

/** Score ring: marks out of a maximum. */
export function Ring({ value, max, size = 112 }: { value: number; max: number; size?: number }) {
  const reduce = useReducedMotion();
  const r = 44;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, value / max));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke={NAVY} strokeOpacity={0.1} strokeWidth={8} />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={GOLD}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - frac) }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[1.6rem] font-semibold tracking-tight tabular-nums text-navy">{value}</span>
        <span className="mt-1 text-[11px] font-medium text-navy">out of {max}</span>
      </div>
    </div>
  );
}
