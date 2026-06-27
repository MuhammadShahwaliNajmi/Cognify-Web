"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { TextReveal } from "@/components/ui/text-reveal";
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
    stroke: "#FFFFFF",
    strokeWidth: 2,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    initial: reduce ? false : ({ pathLength: 0 } as const),
    animate: reduce ? {} : ({ pathLength: 1 } as const),
  };

  return (
    <svg viewBox="0 0 160 96" className="w-full max-w-[320px]">
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
              <circle cx="24" cy="24" r="5" fill="#FFFFFF" />
              <circle cx="136" cy="24" r="5" fill="#FFFFFF" />
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
              <circle cx="40" cy="70" r="4.5" fill="#FFFFFF" />
              <circle cx="80" cy="70" r="4.5" fill="#FFFFFF" />
              <circle cx="120" cy="70" r="4.5" fill="#FFFFFF" />
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
                  fill="#FFFFFF"
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
    glyph: 0,
    heading: "One Course *|* Two Instructors",
    result: "Sharper answers, higher grades",
  },
  {
    id: "02",
    glyph: 1,
    heading: "Concepts Mastered *|* Not Memorised",
    result: "Marks that hold under pressure",
  },
  {
    id: "03",
    glyph: 0,
    heading: "Personalised Learning",
    result: "Taught the way you score best",
  },
  {
    id: "04",
    glyph: 2,
    heading: "Examiner Feedback Within 24 Hours",
    result: "Mistakes caught before the exam",
  },
  {
    id: "05",
    glyph: 2,
    heading: "Know Your Predicted Grade",
    result: "Always know where you stand",
  },
];

export function Methodology() {
  const [active, setActive] = useState(0);

  return (
    <section id="method" className="relative w-full px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        {/* Pinned left — navy panel that stretches to the visible viewport and
            stays anchored while the pillars scroll past on the right */}
        <div className="lg:sticky lg:top-[11vh] lg:h-[86vh] lg:self-start">
          <div className="glass-navy flex h-full flex-col items-center justify-center rounded-[34px] p-8 text-center md:p-10">
            <Reveal delay={0.05}>
              <h2 className="text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.08] tracking-tightest text-white">
                <span className="block">The Cognify</span>
                <span className="block text-gold">Methodology</span>
              </h2>
            </Reveal>

            {/* animated glyph — integrates the USP visual, swaps per active pillar */}
            <div className="mt-[7.5rem] hidden lg:block">
              <PillarGlyph index={PILLARS[active].glyph} />
            </div>
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
                  "flex min-h-[30vh] flex-col justify-center border-t border-navy/12 py-8",
                  i === PILLARS.length - 1 && "border-b"
                )}
              >
                <span className="font-mono text-xs tracking-[0.2em] text-navy/35">
                  {pl.id}
                </span>
                <TextReveal
                  as="h3"
                  text={pl.heading}
                  className="mt-4 text-[clamp(1.3rem,2.7vw,1.75rem)] font-semibold leading-[1.1] tracking-tight text-navy lg:whitespace-nowrap"
                />
                <TextReveal
                  text={pl.result}
                  amount={0.4}
                  className="mt-3.5 text-[clamp(0.95rem,1.4vw,1.1rem)] font-medium tracking-tight text-gold"
                />
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
