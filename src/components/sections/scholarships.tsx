"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

type Track = {
  kind: string;
  tag: string;
  line: string;
  criteria: string[];
  glyph: "merit" | "need";
};

const TRACKS: Track[] = [
  {
    kind: "Merit",
    tag: "Awarded for excellence",
    line: "For students whose results and ambition set them apart, regardless of background.",
    glyph: "merit",
    criteria: [
      "Consistent top-band grades",
      "Strong score on the Cognify entry task",
      "A clear record of academic drive",
    ],
  },
  {
    kind: "Need Based",
    tag: "Awarded for access",
    line: "So that ability, not income, decides who earns a seat in the cohort.",
    glyph: "need",
    criteria: [
      "Demonstrated financial need",
      "Commitment to attend every live session",
      "A short statement of goals, reviewed personally",
    ],
  },
];

const drawT = { duration: 1, ease: [0.22, 1, 0.36, 1] as const };

/* ascending bars rising to a gold sparkle node — achievement (navy on white) */
function MeritGlyph({ reduce }: { reduce: boolean | null }) {
  const s = {
    stroke: "#1a2744",
    strokeWidth: 2.4,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    initial: reduce ? false : ({ pathLength: 0, opacity: 0 } as const),
    animate: reduce ? {} : ({ pathLength: 1, opacity: 1 } as const),
  };
  return (
    <svg viewBox="0 0 120 80" className="h-16 w-auto md:h-[4.5rem]" aria-hidden="true">
      <motion.path d="M8 70 H112" {...s} transition={drawT} />
      <motion.path d="M34 70 V54" {...s} transition={{ ...drawT, delay: 0.1 }} />
      <motion.path d="M61 70 V40" {...s} transition={{ ...drawT, delay: 0.2 }} />
      <motion.path d="M88 70 V26" {...s} transition={{ ...drawT, delay: 0.3 }} />
      <motion.path
        d="M88 8 V2 M99 13 L103 9 M77 13 L73 9"
        stroke="#D4B254"
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={reduce ? {} : { pathLength: 1, opacity: 1 }}
        transition={{ ...drawT, delay: 0.55 }}
      />
      <motion.circle
        cx={88}
        cy={18}
        r={5}
        fill="#D4B254"
        style={{ transformOrigin: "88px 18px" }}
        initial={reduce ? false : { scale: 0, opacity: 0 }}
        animate={reduce ? {} : { scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.5 }}
      />
    </svg>
  );
}

/* balance scale with gold pivot — fairness / access (navy on white) */
function NeedGlyph({ reduce }: { reduce: boolean | null }) {
  const s = {
    stroke: "#1a2744",
    strokeWidth: 2.4,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    initial: reduce ? false : ({ pathLength: 0, opacity: 0 } as const),
    animate: reduce ? {} : ({ pathLength: 1, opacity: 1 } as const),
  };
  return (
    <svg viewBox="0 0 120 80" className="h-16 w-auto md:h-[4.5rem]" aria-hidden="true">
      <motion.path d="M60 22 V64" {...s} transition={{ ...drawT, delay: 0.1 }} />
      <motion.path d="M44 66 H76" {...s} transition={{ ...drawT, delay: 0.2 }} />
      <motion.path d="M24 32 H96" {...s} transition={drawT} />
      <motion.path d="M24 32 L16 50 Q24 58 32 50 Z" {...s} transition={{ ...drawT, delay: 0.3 }} />
      <motion.path d="M96 32 L88 50 Q96 58 104 50 Z" {...s} transition={{ ...drawT, delay: 0.4 }} />
      <motion.circle
        cx={60}
        cy={22}
        r={5}
        fill="#D4B254"
        style={{ transformOrigin: "60px 22px" }}
        initial={reduce ? false : { scale: 0, opacity: 0 }}
        animate={reduce ? {} : { scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.5 }}
      />
    </svg>
  );
}

const listV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const itemV: Variants = {
  hidden: { opacity: 0, x: 18 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 160, damping: 22 } },
};

export function Scholarships() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const t = TRACKS[active];

  return (
    <section
      id="scholarships"
      className="relative flex min-h-[82vh] w-full flex-col justify-center px-6 py-24 md:px-10 md:py-28"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Reveal>
          <h2 className="max-w-2xl text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-tightest text-navy">
            Merit &amp; Need Based
            <br />
            <span className="text-gold">Scholarship</span>
          </h2>
        </Reveal>

        {/* segmented toggle */}
        <Reveal delay={0.05}>
          <div className="mt-10">
            <div className="relative inline-flex rounded-full bg-navy-deep p-1.5 shadow-[0_18px_50px_-34px_rgba(8,16,33,0.7)]">
              {TRACKS.map((track, i) => {
                const highlight = active === i;
                return (
                  <button
                    key={track.kind}
                    onClick={() => setActive(i)}
                    aria-pressed={active === i}
                    className="relative block rounded-full px-7 py-2.5 text-sm font-semibold tracking-tight focus-gold md:px-9"
                  >
                    {highlight && (
                      <motion.span
                        layoutId="scholarship-pill"
                        className="absolute inset-0 rounded-full bg-gold"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 transition-colors duration-200",
                        highlight ? "text-navy-deep" : "text-white"
                      )}
                    >
                      {track.kind}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* animated content */}
        <div className="mt-14 min-h-[300px] md:mt-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -14 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-16"
            >
              {/* left — identity + illustration */}
              <div className="md:border-r md:border-navy/10 md:pr-16">
                <div className="mb-7">
                  {t.glyph === "merit" ? (
                    <MeritGlyph reduce={reduce} />
                  ) : (
                    <NeedGlyph reduce={reduce} />
                  )}
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
                  {t.tag}
                </span>
                <h3 className="mt-4 text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[0.98] tracking-tightest text-navy">
                  {t.kind}
                </h3>
              </div>

              {/* right — criteria */}
              <motion.ul
                variants={listV}
                initial="hidden"
                animate="show"
                className="flex flex-col"
              >
                {t.criteria.map((c, i) => (
                  <motion.li
                    key={c}
                    variants={itemV}
                    className="group flex items-center gap-6 border-b border-navy/10 py-5 first:border-t"
                  >
                    <span className="font-mono text-2xl font-medium tabular-nums text-gold/80 transition-transform duration-300 group-hover:translate-x-1 md:text-3xl">
                      0{i + 1}
                    </span>
                    <span className="text-lg font-medium tracking-tight text-navy transition-colors duration-300 group-hover:text-gold md:text-xl">
                      {c}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
