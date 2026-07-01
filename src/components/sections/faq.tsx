"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { cn, spring } from "@/lib/utils";

/* line-art glyph — a question routed into clear answers (white lines, gold node),
   echoing the Methodology panel's visual language */
function FaqGlyph() {
  const reduce = useReducedMotion();
  const line = {
    stroke: "#FFFFFF",
    strokeWidth: 2,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    initial: reduce ? false : ({ pathLength: 0 } as const),
    animate: reduce ? {} : ({ pathLength: 1 } as const),
  };
  const draw = (delay: number) =>
    reduce ? { duration: 0 } : { duration: 0.85, ease: [0.22, 1, 0.36, 1] as const, delay };

  return (
    <svg viewBox="0 0 160 96" className="w-full max-w-[300px]">
      <circle cx="34" cy="48" r="6.5" fill="#D4B254" />
      <motion.path d="M50 34 L132 34" {...line} transition={draw(0.1)} />
      <motion.path d="M50 48 L116 48" {...line} transition={draw(0.22)} />
      <motion.path d="M50 62 L96 62" {...line} transition={draw(0.34)} />
    </svg>
  );
}

const FAQS = [
  {
    q: "I'm falling behind. Will this help?",
    a: "Yes. Classes are live and small, so confusion gets caught and fixed in the room. Most students stop feeling lost within the first few sessions.",
  },
  {
    q: "Why Cognify over a private tutor?",
    a: "A private tutor runs PKR 25,000 to 30,000 a month, and you still buy topicals, papers, notes and marking separately. With Cognify it's all included: two specialist teachers, every resource, examiner-marked papers, predicted grades and Cognify AI, for a fraction of the cost.",
  },
  {
    q: "Why do we have two teachers?",
    a: "Because A Level Economics is really two subjects. A Microeconomics specialist and a Macroeconomics specialist each teach what they know best, giving you sharper exam prep.",
  },
  {
    q: "Is it tailored to my exam board?",
    a: "Yes. Every class, paper and piece of feedback is mapped to your exact spec, whether Cambridge, Pearson Edexcel or IB. Nothing generic.",
  },
  {
    q: "What does a typical week look like?",
    a: "One hour of live, co-taught class per session, plus weekly assignments and a monthly assessment with examiner feedback. O-Level runs 3 days a week, A-Level 5, and IB 4.",
  },
  {
    q: "How quickly will I see results?",
    a: "Confidence usually shifts in the first couple of weeks. From there, Cognify AI turns your work into a live Predicted Grade, so progress is visible, not guessed.",
  },
  {
    q: "Is there enough practice and feedback?",
    a: "Yes. Submit unlimited exam-style questions and trained examiners return detailed feedback within 24 hours, backed by a 24/7 Cognify AI tutor.",
  },
  {
    q: "Free trial or financial support?",
    a: "Every plan starts with a 7-day free trial, and we offer both need-based and merit scholarships.",
  },
  {
    q: "How are the cohorts structured?",
    a: "Three-month cohorts, three times a year, kept small so classes stay personal. Each student is reviewed individually.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="info-desk" className="relative w-full px-6 py-20 md:px-10 md:py-40">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="glass-navy flex flex-col rounded-[34px] p-8 md:p-10">
            <Reveal>
              <h2 className="text-[clamp(1.6rem,7vw,2.2rem)] font-semibold leading-[1.02] tracking-tightest text-white md:text-[clamp(2rem,5vw,3.6rem)]">
                Questions
                <br />
                <span className="text-gold">Answered</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-sm text-white/65">
                Everything you need to know before you apply. Still curious?
                Apply for Cohort and we&apos;ll answer personally.
              </p>
            </Reveal>
            <div className="mt-12 hidden lg:block">
              <FaqGlyph />
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={i} delay={i * 0.05}>
                <div className="border-t border-navy/12 last:border-b">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="group flex w-full items-center justify-between gap-3 py-4 text-left focus-gold md:gap-6 md:py-7"
                  >
                    <motion.span
                      animate={{ x: isOpen ? 12 : 0 }}
                      transition={spring.snappy}
                      className={cn(
                        "text-[15px] font-medium tracking-tight transition-colors duration-300 md:text-2xl",
                        isOpen ? "text-gold" : "text-navy group-hover:text-gold"
                      )}
                    >
                      {item.q}
                    </motion.span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={spring.snappy}
                      className={cn(
                        "relative grid h-7 w-7 shrink-0 place-items-center transition-colors",
                        isOpen ? "text-gold" : "text-navy/50"
                      )}
                    >
                      <span className="absolute h-px w-4 bg-current" />
                      <span className="absolute h-4 w-px bg-current" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={spring.soft}
                        className="overflow-hidden"
                      >
                        <p className="max-w-2xl pb-8 pr-10 text-lg leading-relaxed text-navy/70">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
