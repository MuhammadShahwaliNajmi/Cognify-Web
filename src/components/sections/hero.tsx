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

/* ---------- animated market graph ---------- */
const CURVE =
  "M40 238 C90 230 120 206 150 198 C190 188 210 172 240 150 C272 126 300 116 330 96 C362 74 392 72 420 60";
const AREA = `${CURVE} L420 250 L40 250 Z`;
const SCATTER = [
  [108, 214], [168, 184], [228, 158], [288, 122], [350, 92], [402, 70],
];
const BARS = [62, 110, 158, 206, 254, 302, 350, 398];

function HeroChart() {
  const reduce = useReducedMotion();
  const draw = reduce
    ? { duration: 0 }
    : { duration: 1.5, ease: [0.22, 1, 0.36, 1] as const, delay: 0.6 };

  return (
    <svg viewBox="0 0 460 270" className="h-full w-full overflow-visible">
      <defs>
        <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9A94B" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#C9A94B" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="scanGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C9A94B" stopOpacity="0" />
          <stop offset="100%" stopColor="#C9A94B" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      <g stroke="rgba(255,255,255,0.07)" strokeWidth={1}>
        {[90, 140, 190, 240].map((y) => (
          <line key={y} x1={40} y1={y} x2={420} y2={y} />
        ))}
      </g>
      <g stroke="rgba(255,255,255,0.22)" strokeWidth={1.2}>
        <line x1={40} y1={250} x2={420} y2={250} />
        <line x1={40} y1={40} x2={40} y2={250} />
      </g>

      {BARS.map((x, i) => (
        <motion.rect
          key={x}
          x={x - 4}
          width={8}
          rx={2}
          fill="#C9A94B"
          fillOpacity={0.3}
          initial={reduce ? false : { height: 0, y: 250 }}
          animate={
            reduce
              ? {}
              : {
                  height: [0, 8 + i * 7, 8 + i * 7, 6 + i * 7, 8 + i * 7],
                  y: [250, 250 - (8 + i * 7), 250 - (8 + i * 7), 250 - (6 + i * 7), 250 - (8 + i * 7)],
                }
          }
          transition={
            reduce
              ? {}
              : {
                  height: { times: [0, 0.3, 0.6, 0.8, 1], duration: 4, repeat: Infinity, delay: 0.8 + i * 0.06, ease: "easeInOut" },
                  y: { times: [0, 0.3, 0.6, 0.8, 1], duration: 4, repeat: Infinity, delay: 0.8 + i * 0.06, ease: "easeInOut" },
                }
          }
        />
      ))}

      <motion.path
        d={AREA}
        fill="url(#goldArea)"
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? {} : { opacity: [0, 1, 0.78, 1] }}
        transition={reduce ? {} : { duration: 5, repeat: Infinity, delay: 1.2, ease: "easeInOut" }}
      />

      <motion.path
        d="M40 226 L420 78"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth={1.4}
        strokeDasharray="5 7"
        initial={reduce ? false : { pathLength: 0 }}
        animate={reduce ? {} : { pathLength: 1 }}
        transition={{ duration: 1.1, delay: 1 }}
      />

      <motion.path
        id="heroCurve"
        d={CURVE}
        fill="none"
        stroke="#C9A94B"
        strokeWidth={3}
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={reduce ? {} : { pathLength: 1 }}
        transition={draw}
      />

      {!reduce && (
        <motion.rect
          y={40}
          width={60}
          height={210}
          fill="url(#scanGrad)"
          initial={{ x: 0 }}
          animate={{ x: [0, 360] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "linear", delay: 2.2 }}
          style={{ transform: "translateX(40px)" }}
        />
      )}

      {SCATTER.map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r={3.2}
          fill="#ffffff"
          initial={reduce ? false : { scale: 0, opacity: 0 }}
          animate={reduce ? {} : { scale: 1, opacity: 0.9 }}
          transition={{ ...spring.snappy, delay: 1.1 + i * 0.08 }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      ))}

      {!reduce && (
        <circle r={4.5} fill="#C9A94B" style={{ filter: "drop-shadow(0 0 5px rgba(201,169,75,0.95))" }}>
          <animateMotion dur="4.5s" repeatCount="indefinite" rotate="auto" begin="2s">
            <mpath href="#heroCurve" />
          </animateMotion>
        </circle>
      )}

      <motion.circle
        cx={420}
        cy={60}
        r={6}
        fill="#C9A94B"
        initial={reduce ? false : { scale: 0 }}
        animate={reduce ? {} : { scale: 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 13, delay: 1.9 }}
        style={{ transformOrigin: "420px 60px" }}
      />
      {!reduce && (
        <motion.circle
          cx={420}
          cy={60}
          r={6}
          fill="none"
          stroke="#C9A94B"
          strokeWidth={1.6}
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 2.1 }}
          style={{ transformOrigin: "420px 60px" }}
        />
      )}
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

  const cagr = useLive(3.1, 0.4);
  const idx = useLive(1284, 6, 1200);

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
        className="relative z-10 mx-auto grid min-h-[100svh] max-w-6xl grid-cols-1 items-center gap-16 px-6 pt-32 md:px-10 lg:grid-cols-[1.08fr_1fr] lg:gap-20"
      >
        {/* Left — copy + CTAs */}
        <motion.div style={reduce ? undefined : { y: textY }}>
          <motion.div variants={colV} initial="hidden" animate="show">
            <motion.div
              variants={itemV}
              className="mb-9 inline-flex items-center gap-2.5 rounded-full bg-navy-deep px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-gold"
            >
              <span className="h-1.5 w-1.5 animate-pulse-node rounded-full bg-gold" />
              Cohort Zero — Applications Open
            </motion.div>

            <motion.div variants={itemV}>
              <motion.h1
                variants={lineContainer}
                initial="hidden"
                animate="show"
                className="text-[clamp(2.7rem,7vw,5.8rem)] font-semibold leading-[1.08] tracking-tightest"
              >
                <Line words={["Learn", "the", "theory"]} />
                <span className="relative mt-2 block">
                  <Line words={["Model", "the", "market"]} gold />
                  <motion.span
                    className="absolute bottom-[0.18em] left-0 h-[3px] w-full origin-left rounded-full bg-gold"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.7, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
              </motion.h1>
            </motion.div>

            <motion.p
              variants={itemV}
              className="mt-10 max-w-md text-lg leading-relaxed text-navy/70 md:text-xl"
            >
              Live, co-taught online Economics &amp; Business classes — five days
              a week, in small cohorts — for ambitious Cambridge, Edexcel
              &amp;&nbsp;IB students.
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Right — animated graph panel with 3D tilt */}
        <motion.div
          style={reduce ? undefined : { y: panelY, scale: panelScale }}
          className="relative mx-auto w-full max-w-md [perspective:1200px]"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          <motion.div
            style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
            initial={{ opacity: 0, y: 44, scale: 0.94, rotateY: -12 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
            transition={{ type: "spring", stiffness: 70, damping: 16, mass: 1, delay: 0.4 }}
            className="glass-navy relative rounded-[28px] p-6 md:p-7"
          >
            <div className="mb-4 flex items-center justify-between" style={{ transform: "translateZ(40px)" }}>
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
                  Market Index
                </span>
                <span className="font-mono text-[13px] font-semibold tabular-nums text-white">
                  {idx.toFixed(1)}
                </span>
              </div>
              <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
                <span className="h-1.5 w-1.5 animate-pulse-node rounded-full bg-gold" />
                Live
              </span>
            </div>
            <div className="aspect-[460/270]">
              <HeroChart />
            </div>
            <div
              className="mt-4 flex items-center justify-between border-t border-white/10 pt-4"
              style={{ transform: "translateZ(30px)" }}
            >
              <span className="text-sm text-white/60">Projected growth</span>
              <span className="text-lg font-semibold tabular-nums text-gold">
                ▲ {cagr.toFixed(1)}% CAGR
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
