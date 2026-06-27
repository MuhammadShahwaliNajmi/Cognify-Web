"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { LiquidButton } from "@/components/ui/liquid-button";
import { cn, spring } from "@/lib/utils";

const LEVELS = ["O-Level", "A-Level", "IB"] as const;
type Level = (typeof LEVELS)[number];

type Tier = {
  name: string;
  tagline: string;
  prices: Record<Level, string>;
  features: string[];
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Lab",
    tagline: "Self-Paced Mastery",
    prices: { "O-Level": "5,000", "A-Level": "6,000", IB: "6,000" },
    features: [
      "Recorded Lecture Library",
      "Cognify Vault: Every Study Resource",
      "AI Marking (Capped)",
      "Cognify Copilot AI",
    ],
  },
  {
    name: "Core",
    tagline: "The Complete Live Experience",
    prices: { "O-Level": "10,500", "A-Level": "14,500", IB: "14,500" },
    featured: true,
    features: [
      "Everything In Lab",
      "Live Classes, Small Cohorts Of 10-15",
      "Predicted Grades",
      "Subject-Specific Weakness Analysis",
      "Human Examiner Marking (Capped)",
      "Unlimited AI Marking",
    ],
  },
  {
    name: "Elite",
    tagline: "Maximum Support & Guarantee",
    prices: { "O-Level": "12,500", "A-Level": "16,500", IB: "16,500" },
    features: [
      "Everything In Core",
      "Weekly 1-On-1 Check-Ins",
      "24/7 Human Support",
      "Unlimited Human Examiner Marking",
    ],
  },
];

export function Pricing() {
  const [active, setActive] = useState<number>(0); // default O-Level | IGCSE
  const level = LEVELS[active];

  return (
    <section
      id="pricing"
      className="relative flex min-h-[100svh] w-full flex-col justify-center px-6 pb-0 pt-[64px] md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="max-w-2xl text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-tightest text-navy">
            One System
            <br />
            <span className="text-gold">Three Ways In</span>
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="mt-5 space-y-1.5 text-sm text-navy/60">
            <p>
              <span className="text-gold">*</span> Cognify Vault resources and Cognify Copilot AI are free for every student
            </p>
            <p>
              <span className="text-gold">*</span> Need-Based and Merit Scholarships available
            </p>
          </div>
        </Reveal>

        {/* level toggle */}
        <Reveal delay={0.08}>
          <div className="mt-8">
            <div className="relative inline-flex rounded-full bg-navy-deep p-1.5 shadow-[0_18px_50px_-34px_rgba(8,16,33,0.7)]">
              {LEVELS.map((l, i) => {
                const highlight = active === i;
                return (
                  <button
                    key={l}
                    onClick={() => setActive(i)}
                    aria-pressed={highlight}
                    className="relative block rounded-full px-6 py-2.5 text-sm font-semibold tracking-tight focus-gold md:px-8"
                  >
                    {highlight && (
                      <motion.span
                        layoutId="pricing-pill"
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
                      {l === "O-Level" ? (
                        <>
                          O-Level
                          <span className="mx-[0.35em] font-light opacity-50">|</span>
                          IGCSE
                        </>
                      ) : l === "IB" ? (
                        <>
                          IB
                          <span className="mx-[0.35em] font-light opacity-50">|</span>
                          HL &amp; SL
                        </>
                      ) : (
                        l
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={spring.snappy}
                className={cn(
                  "flex h-full flex-col rounded-[24px] p-5 md:p-6",
                  t.featured
                    ? "glass-navy text-white shadow-[0_30px_70px_-32px_rgba(201,169,75,0.5)]"
                    : "border border-navy/12 bg-white text-navy"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "font-mono text-[11px] uppercase tracking-[0.22em]",
                      t.featured ? "text-white/55" : "text-navy/45"
                    )}
                  >
                    {t.name}
                  </span>
                  {t.featured && (
                    <span className="rounded-full bg-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-deep">
                      Most Chosen
                    </span>
                  )}
                </div>

                <p
                  className={cn(
                    "mt-4 text-sm",
                    t.featured ? "text-white/60" : "text-navy/55"
                  )}
                >
                  {t.tagline}
                </p>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      "font-mono text-xs",
                      t.featured ? "text-gold" : "text-navy/40"
                    )}
                  >
                    PKR
                  </span>
                  <span className="relative inline-flex overflow-hidden text-[2.2rem] font-semibold leading-none tracking-tight tabular-nums text-gold">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={level}
                        initial={{ y: "60%", opacity: 0 }}
                        animate={{ y: "0%", opacity: 1 }}
                        exit={{ y: "-60%", opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {t.prices[level]}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      t.featured ? "text-white/50" : "text-navy/45"
                    )}
                  >
                    /month
                  </span>
                </div>

                <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-gold/15">
                        <Check size={11} className="text-gold" strokeWidth={3} />
                      </span>
                      <span
                        className={cn(
                          "text-[13px] leading-snug",
                          t.featured ? "text-white/80" : "text-navy/70"
                        )}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <LiquidButton
                    href="/apply/"
                    variant={t.featured ? "secondary" : "primary"}
                    className={cn(
                      "w-full px-6 py-3 text-[14px]",
                      !t.featured && "text-gold"
                    )}
                  >
                    Start 7-day trial
                  </LiquidButton>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
