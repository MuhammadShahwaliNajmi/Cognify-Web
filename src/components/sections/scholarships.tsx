"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";

type Track = {
  kind: string;
  line: string;
  criteria: string[];
  glyph: "merit" | "need";
};

const TRACKS: Track[] = [
  {
    kind: "Merit",
    line: "For students whose results set them apart.",
    glyph: "merit",
    criteria: [
      "Consistent top-band grades",
      "Strong score on the Cognify entry task",
      "A clear record of academic drive",
    ],
  },
  {
    kind: "Need Based",
    line: "So ability, not income, decides who gets a seat.",
    glyph: "need",
    criteria: [
      "Demonstrated financial need",
      "Commitment to attend every live session",
      "A short statement of goals, reviewed personally",
    ],
  },
];

const TICKER = [
  "Talent Over Tuition",
  "Full & Partial Awards",
  "Merit Based",
  "Need Based",
  "Reviewed Personally",
  "Every Driven Student",
];

const drawT = { duration: 1, ease: [0.22, 1, 0.36, 1] as const };

/* ascending bars rising to a gold node with sparkle rays — achievement */
function MeritGlyph() {
  const reduce = useReducedMotion();
  const stroke = {
    stroke: "#FFFFFF",
    strokeOpacity: 0.85,
    strokeWidth: 2.4,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    variants: {
      hidden: reduce ? {} : { pathLength: 0, opacity: 0 },
      show: reduce ? {} : { pathLength: 1, opacity: 1, transition: drawT },
    } as Variants,
  };
  return (
    <motion.svg viewBox="0 0 120 80" className="h-14 w-auto md:h-16" aria-hidden="true">
      <motion.path d="M8 70 H112" {...stroke} />
      <motion.path d="M34 70 V54" {...stroke} />
      <motion.path d="M61 70 V40" {...stroke} />
      <motion.path d="M88 70 V26" {...stroke} />
      {/* sparkle rays */}
      <motion.path d="M88 8 V2 M99 13 L103 9 M77 13 L73 9" stroke="#C9A94B" strokeWidth={2.2} strokeLinecap="round" fill="none"
        variants={{ hidden: reduce ? {} : { pathLength: 0, opacity: 0 }, show: reduce ? {} : { pathLength: 1, opacity: 1, transition: { ...drawT, delay: 0.35 } } }}
      />
      <motion.circle cx={88} cy={18} r={5} fill="#C9A94B"
        style={{ transformOrigin: "88px 18px" }}
        variants={{ hidden: reduce ? {} : { scale: 0, opacity: 0 }, show: reduce ? {} : { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 380, damping: 14, delay: 0.5 } } }}
      />
    </motion.svg>
  );
}

/* balance scale with gold pivot — fairness / equity */
function NeedGlyph() {
  const reduce = useReducedMotion();
  const stroke = {
    stroke: "#FFFFFF",
    strokeOpacity: 0.85,
    strokeWidth: 2.4,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    variants: {
      hidden: reduce ? {} : { pathLength: 0, opacity: 0 },
      show: reduce ? {} : { pathLength: 1, opacity: 1, transition: drawT },
    } as Variants,
  };
  return (
    <motion.svg viewBox="0 0 120 80" className="h-14 w-auto md:h-16" aria-hidden="true">
      <motion.path d="M60 20 V64" {...stroke} />
      <motion.path d="M44 66 H76" {...stroke} />
      <motion.path d="M24 30 H96" {...stroke} />
      <motion.path d="M24 30 L16 48 Q24 56 32 48 Z" {...stroke} />
      <motion.path d="M96 30 L88 48 Q96 56 104 48 Z" {...stroke} />
      <motion.circle cx={60} cy={20} r={5} fill="#C9A94B"
        style={{ transformOrigin: "60px 20px" }}
        variants={{ hidden: reduce ? {} : { scale: 0, opacity: 0 }, show: reduce ? {} : { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 380, damping: 14, delay: 0.5 } } }}
      />
    </motion.svg>
  );
}

const colV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 140, damping: 20 } },
};

export function Scholarships() {
  const reduce = useReducedMotion();

  return (
    <section
      id="scholarships"
      className="relative flex min-h-[88vh] w-full flex-col justify-center px-6 py-24 md:px-10 md:py-28"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Reveal>
          <h2 className="text-center text-[clamp(2.1rem,5.5vw,4rem)] font-semibold leading-[1.04] tracking-tightest text-navy">
            Merit <span className="text-gold">&amp;</span> Need Based Scholarship
          </h2>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="relative mt-12 overflow-hidden rounded-[32px] glass-navy">
            {/* animated gold centre divider (desktop) */}
            {!reduce && (
              <motion.span
                aria-hidden="true"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute left-1/2 top-[12%] hidden h-[76%] w-px origin-top -translate-x-1/2 bg-gold/30 md:block"
              />
            )}

            <div className="grid grid-cols-1 divide-y divide-white/10 md:grid-cols-2 md:divide-x md:divide-y-0 md:divide-transparent">
              {TRACKS.map((t) => (
                <motion.div
                  key={t.kind}
                  variants={colV}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.35 }}
                  className="flex flex-col p-10 md:p-16"
                >
                  <motion.div
                    variants={itemV}
                    animate={reduce ? undefined : { y: [0, -5, 0] }}
                    transition={reduce ? undefined : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {t.glyph === "merit" ? <MeritGlyph /> : <NeedGlyph />}
                  </motion.div>

                  <motion.span
                    variants={itemV}
                    className="mt-8 text-[clamp(2.2rem,4.5vw,3.2rem)] font-semibold leading-none tracking-tightest text-gold"
                  >
                    {t.kind}
                  </motion.span>
                  <motion.p variants={itemV} className="mt-3 text-sm text-white/55">
                    {t.line}
                  </motion.p>

                  <ul className="mt-9 flex flex-col gap-6">
                    {t.criteria.map((c, i) => (
                      <motion.li key={c} variants={itemV} className="flex items-start gap-4">
                        <span className="font-mono text-[13px] leading-snug text-gold/70">
                          0{i + 1}
                        </span>
                        <span className="text-[15px] leading-snug text-white/85">{c}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            {/* rolling ticker across the base of the panel */}
            <div className="overflow-hidden border-t border-gold/20 py-4">
              {reduce ? (
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 px-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
                  {TICKER.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>
              ) : (
                <div className="flex w-max animate-marquee-left whitespace-nowrap">
                  {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((w, i) => (
                    <span
                      key={`${w}-${i}`}
                      className="mr-8 inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45"
                    >
                      {w}
                      <span className="ml-8 h-1 w-1 rounded-full bg-gold" />
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
