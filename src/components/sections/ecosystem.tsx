"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { LiquidButton } from "@/components/ui/liquid-button";
import { cn, spring } from "@/lib/utils";

const ITEMS = [
  {
    code: "THE LAB",
    title: "Cognify Lab",
    desc: "Lecture slides, notes, summary sheets, topical past papers and sample essay structures by topic, plus essays and papers marked by a trained examiner within 24 hours.",
    result: "One complete learning system",
    cta: "Explore the Lab",
  },
  {
    code: "INTELLIGENCE",
    title: "Cognify AI",
    desc: "Two tools in one: a tutor trained on all three boards that answers your 2am Economics and Business questions, and a data model that tracks your performance to give an exact predicted grade and your weakest topics.",
    result: "Know your grade, and what to fix",
    cta: "See Cognify AI",
  },
];

export function Ecosystem() {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <section id="ecosystem" className="relative w-full px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="max-w-2xl text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-tightest text-navy">
            The Cognify Ecosystem
            <br />
            <span className="text-gold">Beyond The Classroom</span>
          </h2>
        </Reveal>

        <div
          className="mt-14 grid grid-cols-1 md:grid-cols-2"
          onMouseLeave={() => setHover(null)}
        >
          {ITEMS.map((e, i) => (
            <Reveal key={e.code} delay={i * 0.08}>
              <motion.div
                onMouseEnter={() => setHover(i)}
                animate={{ x: hover === i ? 8 : 0 }}
                transition={spring.snappy}
                className={cn(
                  "border-t border-navy/12 py-8 md:border-t-0",
                  i === 0 && "md:border-r md:pr-12",
                  i === 1 && "md:pl-12"
                )}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold">
                  {e.code}
                </span>
                <h3
                  className={cn(
                    "mt-4 text-2xl font-semibold tracking-tight transition-colors md:text-3xl",
                    hover === i ? "text-gold" : "text-navy"
                  )}
                >
                  {e.title}
                </h3>
                <p className="mt-4 max-w-md text-navy/70">{e.desc}</p>
                <p className="mt-4 text-sm font-medium tracking-tight text-gold">
                  {e.result}
                </p>
                <div className="mt-6">
                  <LiquidButton href="#apply" variant="primary" className="px-5 py-2.5 text-[13px] text-gold">
                    {e.cta}
                    <ArrowUpRight size={15} />
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
