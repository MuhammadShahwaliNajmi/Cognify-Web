"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { TextReveal } from "@/components/ui/text-reveal";
import { SectionLabel } from "@/components/ui/section-label";
import { ConnectingLine } from "@/components/ui/connecting-line";
import { cn, spring } from "@/lib/utils";

/* Line-art glyph that draws itself per active pillar (integrates the old USPs
   visual into the methodology — typography + navy/gold lines, no box). */
function PillarGlyph({ index }: { index: number }) {
  const reduce = useReducedMotion();
  const draw = reduce
    ? { duration: 0 }
    : { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const };
  const line = {
    stroke: "#1a2744",
    strokeWidth: 2,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    initial: reduce ? false : ({ pathLength: 0 } as const),
    animate: reduce ? {} : ({ pathLength: 1 } as const),
  };

  return (
    <svg viewBox="0 0 160 96" className="w-full max-w-[260px]">
      <AnimatePresence mode="wait">
        <motion.g
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {index === 0 && (
            <>
              {/* two instructors → one shared room */}
              <motion.path d="M24 24 L80 60" {...line} transition={draw} />
              <motion.path d="M136 24 L80 60" {...line} transition={{ ...draw, delay: 0.1 }} />
              <circle cx="24" cy="24" r="5" fill="#1a2744" />
              <circle cx="136" cy="24" r="5" fill="#1a2744" />
              <circle cx="80" cy="60" r="6.5" fill="#C9A94B" />
            </>
          )}
          {index === 1 && (
            <>
              {/* one principle → many derivations */}
              <motion.path d="M80 18 L40 70" {...line} transition={draw} />
              <motion.path d="M80 18 L80 70" {...line} transition={{ ...draw, delay: 0.08 }} />
              <motion.path d="M80 18 L120 70" {...line} transition={{ ...draw, delay: 0.16 }} />
              <circle cx="80" cy="18" r="6.5" fill="#C9A94B" />
              <circle cx="40" cy="70" r="4.5" fill="#1a2744" />
              <circle cx="80" cy="70" r="4.5" fill="#1a2744" />
              <circle cx="120" cy="70" r="4.5" fill="#1a2744" />
            </>
          )}
          {index === 2 && (
            <>
              {/* scatter + regression fit */}
              <motion.path d="M22 74 L138 26" {...line} transition={draw} />
              {[[34, 64], [56, 60], [74, 52], [96, 46], [116, 36]].map(([x, y], i) => (
                <motion.circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={3.4}
                  fill="#1a2744"
                  initial={reduce ? false : { scale: 0 }}
                  animate={reduce ? {} : { scale: 1 }}
                  transition={{ ...spring.snappy, delay: 0.3 + i * 0.06 }}
                  style={{ transformOrigin: `${x}px ${y}px` }}
                />
              ))}
              <circle cx="138" cy="26" r="6.5" fill="#C9A94B" />
            </>
          )}
        </motion.g>
      </AnimatePresence>
    </svg>
  );
}

const PILLARS = [
  {
    id: "01",
    title: "Live, Co-Taught Seminars",
    body: "Five live classes a week, in deliberately small cohorts. Economics is split between Microeconomics and Macroeconomics specialists — each teaching exactly what they know best, and co-teaching wherever the two collide — so no concept is ever left abstract or half-explained.",
  },
  {
    id: "02",
    title: "First-Principles Learning",
    body: "We abandon rote memorization. Students master the core mechanisms of economics and business so deeply that they can rebuild any model from the ground up, under any exam board.",
  },
  {
    id: "03",
    title: "The Empirical Edge",
    body: "We bridge high-school theory with real-world data and analytical intuition — turning textbook diagrams into instincts students can defend, apply, and carry into university.",
  },
];

export function Methodology() {
  const [active, setActive] = useState(0);

  return (
    <section id="method" className="relative w-full px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        {/* Pinned left — content-height so it stays pinned through all three
            pillars and releases only after the connecting line has filled */}
        <div className="lg:sticky lg:top-[7vh] lg:self-start">
          <Reveal>
            <SectionLabel index="01">The Cognify Methodology</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-7 text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-tightest text-navy">
              How we teach,
              <br />
              <span className="text-gold">deliberately.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-sm text-navy/70">
              A boutique academy is defined by its method. Ours rests on three
              non-negotiable pillars.
            </p>
          </Reveal>

          {/* animated glyph — integrates the USP visual, swaps per active pillar */}
          <div className="mt-12 hidden lg:block">
            <PillarGlyph index={active} />
          </div>

          {/* progress indicator */}
          <div className="mt-10 hidden gap-3 lg:flex">
            {PILLARS.map((pl, i) => (
              <motion.span
                key={pl.id}
                animate={{
                  width: active === i ? 44 : 20,
                  backgroundColor: active === i ? "#C9A94B" : "rgba(26,39,68,0.2)",
                }}
                transition={spring.snappy}
                className="h-px"
              />
            ))}
          </div>
        </div>

        {/* Scrolling right */}
        <div className="relative">
          <ConnectingLine className="absolute -left-6 top-0 hidden h-full w-3 lg:block" />
          <div className="flex flex-col">
            {PILLARS.map((pl, i) => (
              <motion.article
                key={pl.id}
                onViewportEnter={() => setActive(i)}
                viewport={{ amount: 0.6, margin: "-20% 0px -20% 0px" }}
                className={cn(
                  "flex min-h-[70vh] flex-col justify-center border-t border-navy/12 py-12",
                  i === PILLARS.length - 1 && "border-b"
                )}
              >
                <span className="font-mono text-sm text-gold">{pl.id}</span>
                <TextReveal
                  as="h3"
                  text={pl.title}
                  className="mt-5 text-[clamp(1.9rem,4.4vw,3.2rem)] font-semibold leading-[1.02] tracking-tight text-navy"
                />
                <TextReveal
                  text={pl.body}
                  amount={0.4}
                  className="mt-7 max-w-xl text-lg leading-relaxed text-navy/70"
                />
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
