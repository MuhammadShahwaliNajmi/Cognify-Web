"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { DataStreamCanvas } from "@/components/ui/data-stream-canvas";
import { spring } from "@/lib/utils";

/* ---------- launch choreography ---------- */
const colV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 90, damping: 18, mass: 0.9 } },
};

/* ---------- headline word reveal (descenders preserved) ---------- */
const lineContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
};
const wordV: Variants = {
  hidden: { y: "115%", opacity: 0 },
  show: {
    y: "0%",
    opacity: 1,
    transition: { type: "spring", stiffness: 115, damping: 18, mass: 0.8 },
  },
};

function Line({ words, gold = false }: { words: string[]; gold?: boolean }) {
  return (
    <span className="block overflow-hidden pb-[0.14em]">
      {words.map((w, i) => (
        <motion.span
          key={i}
          variants={wordV}
          className={`inline-block ${gold ? "text-gold" : "text-navy"}`}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </span>
  );
}

/* ---------- live ticking value ---------- */
function useLive(base: number, spread: number, ms = 1500) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(base);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setV(base + (Math.random() - 0.5) * spread), ms);
    return () => clearInterval(id);
  }, [base, spread, ms, reduce]);
  return v;
}

/* ---------- supply & demand equilibrium diagram ----------
   The demand curve sweeps right & back; the equilibrium point is derived
   exactly from the shift (eq = 219 + s/2 , 140 − 0.2177·s), so the point and
   its guides always sit precisely on the S × D intersection.                */
const SUPPLY = "M72 204 L366 76"; // upward sloping
const DEMAND = "M72 76 L366 204"; // downward sloping (base position)
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

const S_PEAK = 34; // peak rightward demand shift (px)
const S_KEY = [0, S_PEAK, S_PEAK, 0]; // breathe out … hold … back
const EQX = S_KEY.map((s) => 219 + s / 2); // equilibrium x at each keyframe
const EQY = S_KEY.map((s) => 140 - 0.21769 * s); // equilibrium y at each keyframe
const EQDX = S_KEY.map((s) => s / 2); // eq-point translate (relative to base)
const EQDY = S_KEY.map((s) => -0.21769 * s);

function HeroChart() {
  const reduce = useReducedMotion();
  const draw = (delay: number) =>
    reduce ? { duration: 0 } : { duration: 1.3, ease: [0.22, 1, 0.36, 1] as const, delay };
  // one shared loop → demand curve, equilibrium point, guides & ticks stay locked together
  const loop = {
    duration: 6.5,
    repeat: Infinity,
    ease: "easeInOut" as const,
    times: [0, 0.42, 0.58, 1],
    delay: 2.4,
  };
  const flow = (delay: number) => ({ duration: 1.3, repeat: Infinity, ease: "linear" as const, delay });

  return (
    <svg viewBox="0 0 460 270" className="h-full w-full overflow-visible">
      <defs>
        <marker id="axArrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0 0 L7 3.5 L0 7 Z" fill="rgba(255,255,255,0.42)" />
        </marker>
        <marker id="shiftArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0 0 L7 3.5 L0 7 Z" fill="#C9A94B" />
        </marker>
        <radialGradient id="eqGlow">
          <stop offset="0%" stopColor="#C9A94B" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#C9A94B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="scanGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C9A94B" stopOpacity="0" />
          <stop offset="100%" stopColor="#C9A94B" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* grid */}
      <g stroke="rgba(255,255,255,0.06)" strokeWidth={1}>
        {[96, 132, 168].map((y) => (
          <line key={y} x1={46} y1={y} x2={400} y2={y} />
        ))}
        {[130, 214, 298].map((x) => (
          <line key={x} x1={x} y1={60} x2={x} y2={214} />
        ))}
      </g>

      {/* axes with arrowheads */}
      <g stroke="rgba(255,255,255,0.32)" strokeWidth={1.3}>
        <line x1={46} y1={214} x2={408} y2={214} markerEnd="url(#axArrow)" />
        <line x1={46} y1={214} x2={46} y2={52} markerEnd="url(#axArrow)" />
      </g>
      <text x={30} y={62} fill="rgba(255,255,255,0.5)" fontSize={11} fontFamily={MONO}>
        P
      </text>
      <text x={400} y={232} fill="rgba(255,255,255,0.5)" fontSize={11} fontFamily={MONO}>
        Q
      </text>

      {/* supply curve (white) + flowing data dashes */}
      <text x={370} y={74} fill="rgba(255,255,255,0.8)" fontSize={13} fontWeight={600} fontFamily={MONO}>
        S
      </text>
      <motion.path
        d={SUPPLY}
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth={2.6}
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={reduce ? {} : { pathLength: 1 }}
        transition={draw(0.5)}
      />
      {!reduce && (
        <motion.path
          d={SUPPLY}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={0.5}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeDasharray="2 15"
          initial={{ strokeDashoffset: 0, opacity: 0 }}
          animate={{ strokeDashoffset: [0, -34], opacity: 1 }}
          transition={{ strokeDashoffset: flow(1.9), opacity: { duration: 0.6, delay: 1.9 } }}
        />
      )}

      {/* ghost of the original demand position (so the shift is visible) */}
      <path d={DEMAND} fill="none" stroke="#C9A94B" strokeOpacity={0.16} strokeWidth={2} strokeDasharray="5 6" />

      {/* live demand curve (gold) — shifts right & back to model the market */}
      <motion.g initial={{ x: 0 }} animate={reduce ? {} : { x: S_KEY }} transition={reduce ? {} : loop}>
        <text x={370} y={210} fill="#C9A94B" fontSize={13} fontWeight={600} fontFamily={MONO}>
          D
        </text>
        <motion.path
          d={DEMAND}
          fill="none"
          stroke="#C9A94B"
          strokeWidth={3}
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={reduce ? {} : { pathLength: 1 }}
          transition={draw(0.7)}
        />
        {!reduce && (
          <motion.path
            d={DEMAND}
            fill="none"
            stroke="#C9A94B"
            strokeOpacity={0.6}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="2 15"
            initial={{ strokeDashoffset: 0, opacity: 0 }}
            animate={{ strokeDashoffset: [0, 34], opacity: 1 }}
            transition={{ strokeDashoffset: flow(2), opacity: { duration: 0.6, delay: 2 } }}
          />
        )}
      </motion.g>

      {/* one-shot gold scan that sweeps across the chart on first load */}
      {!reduce && (
        <motion.rect
          y={56}
          width={50}
          height={158}
          fill="url(#scanGrad)"
          initial={{ x: 46, opacity: 0 }}
          animate={{ x: [46, 392], opacity: [0, 0.6, 0] }}
          transition={{ duration: 1.7, ease: "easeInOut", delay: 0.45 }}
        />
      )}

      {/* shift-direction arrow (fades in while demand is shifted) */}
      {!reduce && (
        <motion.line
          x1={205}
          y1={168}
          x2={240}
          y2={168}
          stroke="#C9A94B"
          strokeWidth={1.6}
          markerEnd="url(#shiftArrow)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.85, 0.85, 0] }}
          transition={loop}
        />
      )}

      {/* equilibrium guide lines (track the intersection exactly) */}
      <motion.line
        x1={46}
        x2={EQX[0]}
        y1={EQY[0]}
        y2={EQY[0]}
        stroke="rgba(255,255,255,0.45)"
        strokeWidth={1.2}
        strokeDasharray="4 5"
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? {} : { opacity: 1, x2: EQX, y1: EQY, y2: EQY }}
        transition={reduce ? {} : { opacity: { duration: 0.5, delay: 1.6 }, x2: loop, y1: loop, y2: loop }}
      />
      <motion.line
        x1={EQX[0]}
        x2={EQX[0]}
        y1={EQY[0]}
        y2={214}
        stroke="rgba(255,255,255,0.45)"
        strokeWidth={1.2}
        strokeDasharray="4 5"
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? {} : { opacity: 1, x1: EQX, x2: EQX, y1: EQY }}
        transition={reduce ? {} : { opacity: { duration: 0.5, delay: 1.6 }, x1: loop, x2: loop, y1: loop }}
      />

      {/* axis ticks that glide with the equilibrium */}
      <motion.circle
        cx={46}
        cy={EQY[0]}
        r={2.6}
        fill="#C9A94B"
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? {} : { opacity: 1, cy: EQY }}
        transition={reduce ? {} : { opacity: { duration: 0.4, delay: 1.8 }, cy: loop }}
      />
      <motion.circle
        cx={EQX[0]}
        cy={214}
        r={2.6}
        fill="#C9A94B"
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? {} : { opacity: 1, cx: EQX }}
        transition={reduce ? {} : { opacity: { duration: 0.4, delay: 1.8 }, cx: loop }}
      />

      {/* equilibrium point — glides along supply, always on the intersection */}
      <motion.g
        initial={{ x: 0, y: 0 }}
        animate={reduce ? {} : { x: EQDX, y: EQDY }}
        transition={reduce ? {} : loop}
      >
        <motion.circle
          cx={219}
          cy={140}
          r={16}
          fill="url(#eqGlow)"
          initial={reduce ? false : { opacity: 0 }}
          animate={reduce ? {} : { opacity: [0.35, 0.75, 0.35] }}
          transition={reduce ? {} : { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        {!reduce && (
          <motion.circle
            cx={219}
            cy={140}
            r={6}
            fill="none"
            stroke="#C9A94B"
            strokeWidth={1.6}
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 2 }}
            style={{ transformOrigin: "219px 140px" }}
          />
        )}
        <motion.circle
          cx={219}
          cy={140}
          r={5.5}
          fill="#C9A94B"
          initial={reduce ? false : { scale: 0 }}
          animate={reduce ? {} : { scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 13, delay: 1.7 }}
          style={{ transformOrigin: "219px 140px", filter: "drop-shadow(0 0 5px rgba(201,169,75,0.9))" }}
        />
        <motion.text
          x={230}
          y={131}
          fill="#C9A94B"
          fontSize={12}
          fontWeight={600}
          fontFamily={MONO}
          initial={reduce ? false : { opacity: 0 }}
          animate={reduce ? {} : { opacity: 1 }}
          transition={{ duration: 0.4, delay: 2 }}
        >
          E
        </motion.text>
      </motion.g>
    </svg>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const p = useSpring(scrollYProgress, spring.scroll);
  const textY = useTransform(p, [0, 1], ["0vh", "-12vh"]);
  const panelY = useTransform(p, [0, 1], [0, -90]);
  const panelScale = useTransform(p, [0, 1], [1, 0.88]);
  const fade = useTransform(p, [0, 0.8], [1, 0]);
  const cueOpacity = useTransform(p, [0, 0.1], [1, 0]);

  // pointer-reactive 3D tilt
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-11, 11]), { stiffness: 140, damping: 16 });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [9, -9]), { stiffness: 140, damping: 16 });

  const qty = useLive(1240, 9, 1500);
  const price = useLive(48.2, 0.6, 1300);

  const onMove = (e: React.MouseEvent) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <section id="top" ref={ref} className="relative min-h-[100svh] w-full overflow-hidden">
      <div className="aura" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-25 [mask-image:radial-gradient(ellipse_at_28%_42%,black_0%,transparent_68%)]"
        aria-hidden="true"
      >
        <DataStreamCanvas />
      </div>

      <motion.div
        style={reduce ? undefined : { opacity: fade }}
        className="relative z-10 mx-auto grid min-h-[100svh] max-w-6xl grid-cols-1 items-center gap-16 px-6 pt-32 md:px-10 lg:grid-cols-[1.25fr_1fr] lg:items-stretch lg:content-start lg:gap-14"
      >
        {/* Left — copy + CTAs */}
        <motion.div style={reduce ? undefined : { y: textY }}>
          <motion.div variants={colV} initial="hidden" animate="show">
            <motion.div
              variants={itemV}
              className="mb-9 inline-flex min-w-[349px] items-center justify-center gap-2.5 rounded-full bg-navy-deep px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-gold"
            >
              <span className="h-1.5 w-1.5 animate-pulse-node rounded-full bg-gold" />
              Cohort — Applications Open
            </motion.div>

            <motion.div variants={itemV}>
              <motion.h1
                variants={lineContainer}
                initial="hidden"
                animate="show"
                className="text-[clamp(2.8rem,6vw,4.3rem)] font-semibold leading-[1.0] tracking-tightest"
              >
                <Line words={["Master", "The"]} />
                <Line words={["Subject"]} />
                <div className="mt-5">
                  <Line words={["Ace", "The"]} gold />
                  <Line words={["Exam"]} gold />
                </div>
              </motion.h1>
              <motion.div
                className="mt-5 h-[3px] w-[337px] max-w-full origin-left rounded-full bg-gold"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.7, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.div>

            {/* subjects */}
            <motion.div
              variants={itemV}
              className="mt-8 flex items-center gap-5 text-lg font-medium uppercase tracking-[0.3em] text-navy/75"
            >
              <span>Economics</span>
              <span className="text-gold/70" aria-hidden="true">|</span>
              <span>Business</span>
            </motion.div>

            {/* exam-board trust strip */}
            <motion.div variants={itemV} className="mt-8">
              <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-navy/40">
                Preparing students for
              </p>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                <img
                  src="/cambridge-logo.png"
                  alt="Cambridge Assessment International Education"
                  className="h-[58px] w-auto object-contain opacity-80 grayscale-[0.65] transition duration-300 hover:opacity-100 hover:grayscale-0"
                />
                <span className="h-11 w-px bg-navy/10" aria-hidden="true" />
                <img
                  src="/pearson-logo.png"
                  alt="Pearson Edexcel"
                  className="h-8 w-auto object-contain opacity-80 grayscale-[0.65] transition duration-300 hover:opacity-100 hover:grayscale-0"
                />
                <span className="h-11 w-px bg-navy/10" aria-hidden="true" />
                <img
                  src="/ib-logo.png"
                  alt="International Baccalaureate"
                  className="h-[60px] w-auto object-contain opacity-80 grayscale-[0.65] transition duration-300 hover:opacity-100 hover:grayscale-0"
                />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Right — animated graph panel with 3D tilt */}
        <motion.div
          style={reduce ? undefined : { y: panelY, scale: panelScale }}
          className="relative mx-auto w-full max-w-md [perspective:1200px] lg:mb-[2px]"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          <motion.div
            style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
            initial={{ opacity: 0, y: 44, scale: 0.94, rotateY: -12 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
            transition={{ type: "spring", stiffness: 70, damping: 16, mass: 1, delay: 0.4 }}
            className="glass-navy relative flex h-full flex-col rounded-[28px] p-6 md:p-7"
          >
            <div className="mb-4 flex items-center justify-between" style={{ transform: "translateZ(40px)" }}>
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
                  Market Equilibrium
                </span>
                <span className="font-mono text-[13px] font-semibold tabular-nums text-white">
                  P* {price.toFixed(1)}
                </span>
              </div>
              <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
                <span className="h-1.5 w-1.5 animate-pulse-node rounded-full bg-gold" />
                Live
              </span>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <div className="aspect-[460/270] w-full scale-x-[1.25] scale-y-[1.6]">
                <HeroChart />
              </div>
            </div>
            <div
              className="mt-4 flex items-center justify-between border-t border-white/10 pt-4"
              style={{ transform: "translateZ(30px)" }}
            >
              <span className="text-sm text-white/60">Equilibrium quantity</span>
              <span className="text-lg font-semibold tabular-nums text-gold">
                Q* {Math.round(qty).toLocaleString()} units
              </span>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* scroll cue */}
      <motion.div
        style={reduce ? undefined : { opacity: cueOpacity }}
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-navy/40"
      >
        Scroll
        <motion.span
          animate={reduce ? {} : { y: [0, 7, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-6 w-px bg-navy/30"
        />
      </motion.div>
    </section>
  );
}
