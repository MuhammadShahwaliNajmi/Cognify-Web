"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Play } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { SpotlightGrid } from "@/components/ui/spotlight-grid";
import { LiquidButton } from "@/components/ui/liquid-button";
import { cn, spring } from "@/lib/utils";

/* ---- chart geometry ---- */
const XS = [40, 75, 110, 145, 180, 215, 250, 285];
const toPath = (ys: number[], xs: number[] = XS) =>
  ys.map((y, i) => `${i === 0 ? "M" : "L"}${xs[i]},${y}`).join(" ");

type Line = { ys: number[]; xs?: number[]; gold?: boolean; dashed?: boolean };
type Model = {
  cmd: string;
  domain: string;
  label: string;
  code: string[];
  lines: Line[];
  node: { x: number; y: number };
  scatter?: number[][];
  result: string;
};

const MODELS: Model[] = [
  {
    cmd: "demand",
    domain: "Microeconomics",
    label: "Micro · demand & elasticity",
    code: [
      "import cognify.econ as ec",
      'mkt = ec.market("good_x")',
      "d = ec.demand(mkt).estimate()",
      "print(d.ped, d.type)",
    ],
    lines: [{ ys: [62, 80, 98, 114, 128, 140, 150, 158], gold: true }],
    scatter: [
      [60, 70], [92, 86], [118, 104], [150, 112],
      [176, 132], [208, 138], [238, 152], [272, 156],
    ],
    node: { x: 285, y: 158 },
    result: "PED ≈ −1.4 · elastic",
  },
  {
    cmd: "inflation",
    domain: "Macroeconomics",
    label: "Macro · CPI & inflation",
    code: [
      "import cognify.macro as cg",
      'cpi = cg.load("cpi_series")',
      "m = cg.Inflation(cpi, target=2.0)",
      "fit = m.solve()",
    ],
    lines: [
      { ys: [140, 118, 92, 72, 78, 98, 118, 128], gold: true },
      { ys: [146, 146, 146, 146, 146, 146, 146, 146], dashed: true },
    ],
    node: { x: 285, y: 128 },
    result: "πₜ 6.8% → 3.4% → target 2.0%",
  },
  {
    cmd: "break-even",
    domain: "Business",
    label: "Business · break-even",
    code: [
      "import cognify.biz as bz",
      "rev  = bz.Revenue(price=18.0)",
      "cost = bz.Cost(fixed=9000, var=6.5)",
      "be = bz.break_even(rev, cost)",
    ],
    lines: [
      { ys: [176, 154, 132, 110, 88, 66, 44, 30], gold: true },
      { ys: [120, 116, 112, 108, 104, 100, 96, 92] },
    ],
    node: { x: 149, y: 107 },
    result: "break-even Q = 1,240 units",
  },
];

function ModelChart({ model, runKey }: { model: Model; runKey: number }) {
  const reduce = useReducedMotion();
  const draw = reduce
    ? { duration: 0 }
    : { duration: 0.85, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <svg viewBox="0 0 320 200" className="mx-auto h-full max-h-[210px] w-full max-w-[400px]">
      <g stroke="rgba(255,255,255,0.06)" strokeWidth={1}>
        {[60, 100, 140].map((y) => (
          <line key={y} x1={40} y1={y} x2={300} y2={y} />
        ))}
      </g>
      <g stroke="rgba(255,255,255,0.2)" strokeWidth={1.1}>
        <line x1={40} y1={176} x2={300} y2={176} />
        <line x1={40} y1={24} x2={40} y2={176} />
      </g>

      <g key={`${model.cmd}-${runKey}`}>
        {model.lines.map((ln, i) => (
          <motion.path
            key={i}
            d={toPath(ln.ys, ln.xs)}
            fill="none"
            stroke={ln.gold ? "#D4B254" : "rgba(255,255,255,0.8)"}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={ln.dashed ? "5 6" : undefined}
            initial={reduce ? false : { pathLength: 0 }}
            animate={reduce ? {} : { pathLength: 1 }}
            transition={{ ...draw, delay: i * 0.12 }}
          />
        ))}

        {model.scatter?.map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r={3}
            fill="rgba(255,255,255,0.9)"
            initial={reduce ? false : { scale: 0, opacity: 0 }}
            animate={reduce ? {} : { scale: 1, opacity: 0.9 }}
            transition={{ ...spring.snappy, delay: 0.2 + i * 0.04 }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          />
        ))}

        <motion.circle
          cx={model.node.x}
          cy={model.node.y}
          r={5}
          fill="#D4B254"
          initial={reduce ? false : { scale: 0 }}
          animate={reduce ? {} : { scale: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 13, delay: 0.7 }}
          style={{ transformOrigin: `${model.node.x}px ${model.node.y}px` }}
        />
        {!reduce && (
          <motion.circle
            cx={model.node.x}
            cy={model.node.y}
            r={5}
            fill="none"
            stroke="#D4B254"
            strokeWidth={1.5}
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 2.6, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.9 }}
            style={{ transformOrigin: `${model.node.x}px ${model.node.y}px` }}
          />
        )}
      </g>
    </svg>
  );
}

type Kind = "cmd" | "code" | "sys" | "ok";
type LogLine = { text: string; kind: Kind };
type Item = LogLine | { reveal: number };

export function Terminal() {
  const reduce = useReducedMotion();
  const [committed, setCommitted] = useState<LogLine[]>([]);
  const [cur, setCur] = useState<LogLine | null>(null);
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState(0);

  const cancelled = useRef(false);
  const timers = useRef<number[]>([]);
  const viewerRef = useRef<HTMLDivElement>(null);
  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };
  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  const run = (idx: number) => {
    cancelled.current = true;
    clearTimers();
    cancelled.current = false;

    const m = MODELS[idx];
    setSelected(idx);
    setRunning(true);
    setCommitted([]);
    setCur(null);

    const items: Item[] = [
      { text: `run --model ${m.cmd}`, kind: "cmd" },
      { text: "compiling model…", kind: "sys" },
      ...m.code.map((c) => ({ text: c, kind: "code" as Kind })),
      { text: "executing…", kind: "sys" },
      { reveal: idx },
      { text: m.result, kind: "ok" },
      { text: "done.", kind: "sys" },
    ];

    const runItems = (i: number) => {
      if (cancelled.current) return;
      if (i >= items.length) {
        setRunning(false);
        return;
      }
      const it = items[i];

      if ("reveal" in it) {
        setViewerIdx(it.reveal);
        setRunKey((k) => k + 1);
        // code has finished running — bring the viewer into frame as it animates (mobile)
        if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
          viewerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        schedule(() => runItems(i + 1), reduce ? 0 : 380);
        return;
      }

      if (it.kind === "code" && !reduce) {
        let j = 0;
        const tick = () => {
          if (cancelled.current) return;
          j += 1;
          setCur({ text: it.text.slice(0, j), kind: it.kind });
          if (j >= it.text.length) {
            setCommitted((prev) => [...prev, it]);
            setCur(null);
            schedule(() => runItems(i + 1), 70);
            return;
          }
          schedule(tick, 11);
        };
        setCur({ text: "", kind: it.kind });
        schedule(tick, 11);
      } else {
        setCommitted((prev) => [...prev, it]);
        schedule(() => runItems(i + 1), reduce ? 0 : it.kind === "cmd" ? 150 : 120);
      }
    };

    runItems(0);
  };

  // cleanup timers on unmount (no auto-run — viewer stays empty until Run)
  useEffect(() => {
    return () => {
      cancelled.current = true;
      clearTimers();
    };
  }, []);

  const viewer = viewerIdx === null ? null : MODELS[viewerIdx];
  const kindClass: Record<Kind, string> = {
    cmd: "text-gold",
    code: "text-white/85",
    sys: "text-white/40",
    ok: "text-white font-medium",
  };
  const prefix = (l: LogLine) =>
    l.kind === "sys" || l.kind === "ok" ? `> ${l.text}` : l.text;

  return (
    <SpotlightGrid masked>
      <section id="lab" className="relative flex w-full flex-col justify-center px-6 py-14 md:min-h-screen md:px-10 md:py-16">
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <Reveal>
            <h2 className="max-w-2xl text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-tightest text-navy">
              The Empirical Edge
              <br />
              <span className="text-gold">Visual Learning</span>
            </h2>
          </Reveal>
          <div id="terminal" className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            {/* ---- The Terminal (drives everything) ---- */}
            <Reveal>
              <div className="glass-navy-solid flex h-[472px] flex-col rounded-[24px] p-5 md:p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="font-mono text-[12px] text-white/55">
                    The Cognify Terminal
                  </span>
                  <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-gold">
                    <span className={cn("h-1.5 w-1.5 rounded-full bg-gold", running && "animate-pulse-node")} />
                    {running ? "Running" : "Ready"}
                  </span>
                </div>

                <div className="thin-scroll mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto font-mono text-[13px] leading-relaxed">
                  {committed.length === 0 && !cur && (
                    <p className="text-white/40">
                      Awaiting Model, Choose A Domain And Run
                      <span className="blink text-gold">▍</span>
                    </p>
                  )}
                  {committed.map((l, i) => (
                    <p key={i} className={kindClass[l.kind]}>
                      {prefix(l)}
                    </p>
                  ))}
                  {cur && (
                    <p className={kindClass[cur.kind]}>
                      {prefix(cur)}
                      <span className="blink text-gold">▍</span>
                    </p>
                  )}
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
                    Choose a model
                  </p>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {MODELS.map((m, i) => (
                      <button
                        key={m.cmd}
                        onClick={() => setSelected(i)}
                        className={cn(
                          "rounded-full border px-4 py-1.5 text-[13px] font-medium tracking-tight transition-all duration-300 focus-gold",
                          selected === i
                            ? "border-gold bg-gold text-navy-deep shadow-[0_8px_20px_-8px_rgba(212, 178, 84,0.6)]"
                            : "border-white/15 text-white/70 hover:border-gold hover:bg-gold hover:text-navy-deep"
                        )}
                      >
                        {m.domain}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    <LiquidButton onClick={() => run(selected)} className="px-6 py-3 text-[14px]">
                      <Play size={15} className="fill-white" />
                      Run model
                    </LiquidButton>
                    <span className="font-mono text-[12px] text-white/40">
                      Active · {MODELS[selected].domain}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* ---- The Model Viewer (empty until first run) ---- */}
            <Reveal delay={0.08}>
              <div ref={viewerRef} className="glass-navy-solid flex h-[472px] flex-col rounded-[24px] p-5 md:p-6 scroll-mt-20">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
                    Model Viewer
                  </span>
                  {viewer ? (
                    <span className="rounded-full bg-gold px-3 py-1 text-[11px] font-semibold text-navy-deep">
                      {viewer.domain}
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-medium text-white/50">
                      Idle
                    </span>
                  )}
                </div>

                {viewer ? (
                  <>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={viewerIdx}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25 }}
                        className="mt-4 text-xl font-semibold tracking-tight text-white"
                      >
                        {viewer.label}
                      </motion.p>
                    </AnimatePresence>

                    <div className="relative mt-3 flex min-h-0 flex-1 items-center justify-center">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`${viewerIdx}-${runKey}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="w-full"
                        >
                          <ModelChart model={viewer} runKey={runKey} />
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                      <span className="text-sm text-white/55">Solved output</span>
                      <span className="font-mono text-sm text-gold">{viewer.result}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </SpotlightGrid>
  );
}
