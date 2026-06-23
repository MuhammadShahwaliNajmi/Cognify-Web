"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { SectionLabel } from "@/components/ui/section-label";
import { LiquidButton } from "@/components/ui/liquid-button";
import { cn, spring } from "@/lib/utils";

type Tier = {
  name: string;
  tagline: string;
  price: string;
  features: string[];
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "The Lab",
    tagline: "Self-paced mastery",
    price: "14,500",
    features: [
      "Full Cognify Lab access",
      "Lecture recordings, slides & notes",
      "Sample answers & summary sheets",
      "Unlimited exam practice (capped grading)",
    ],
  },
  {
    name: "Core Cohort",
    tagline: "The complete live experience",
    price: "16,500",
    featured: true,
    features: [
      "Everything in The Lab",
      "Live, co-taught classes · 5 days a week",
      "Cognify AI — Predicted Grade & readiness",
      "Examiner feedback on every submission",
    ],
  },
  {
    name: "Elite",
    tagline: "Maximum support & guarantee",
    price: "17,500",
    features: [
      "Everything in Core Cohort",
      "Priority 24-hour examiner grading",
      "24-hour priority human mentor support",
      "Highest grading caps",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative w-full px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionLabel index="05">Plans &amp; Pricing</SectionLabel>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-7 max-w-2xl text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-tightest text-navy">
            One academy,
            <br />
            <span className="text-gold">three ways in.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy/70">
            Every plan begins with a 7-day free trial — no commitment. Need-based
            and merit scholarships are available for students who earn their place.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={spring.snappy}
                className={cn(
                  "flex h-full flex-col rounded-[24px] p-7 md:p-8",
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
                    "mt-5 text-sm",
                    t.featured ? "text-white/60" : "text-navy/55"
                  )}
                >
                  {t.tagline}
                </p>

                <div className="mt-4 flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      "font-mono text-xs",
                      t.featured ? "text-gold" : "text-navy/40"
                    )}
                  >
                    PKR
                  </span>
                  <span className="text-[2.6rem] font-semibold leading-none tracking-tight tabular-nums text-gold">
                    {t.price}
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

                <ul className="mt-8 flex flex-1 flex-col gap-3.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-gold/15">
                        <Check size={11} className="text-gold" strokeWidth={3} />
                      </span>
                      <span
                        className={cn(
                          "text-[14px] leading-snug",
                          t.featured ? "text-white/80" : "text-navy/70"
                        )}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-9">
                  <LiquidButton
                    href="#apply"
                    variant={t.featured ? "secondary" : "primary"}
                    className={cn(
                      "w-full px-6 py-3.5 text-[14px]",
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
