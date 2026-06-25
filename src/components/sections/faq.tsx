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
      <circle cx="34" cy="48" r="6.5" fill="#C9A94B" />
      <motion.path d="M50 34 L132 34" {...line} transition={draw(0.1)} />
      <motion.path d="M50 48 L116 48" {...line} transition={draw(0.22)} />
      <motion.path d="M50 62 L96 62" {...line} transition={draw(0.34)} />
    </svg>
  );
}

const FAQS = [
  {
    q: "I'm struggling and falling behind. Will this actually help?",
    a: "Yes. Because every seminar is live and small, your confusion gets caught and fixed in the room, not left to fester until the next recorded video. Most students stop feeling lost within the first few sessions, because they finally understand the why behind every model instead of memorising it. You leave each seminar more in control of the material than when you walked in.",
  },
  {
    q: "Why choose Cognify over a private tutor?",
    a: "A private tutor gives you one person, one hour, one topic at a time. Cognify gives you specialist Microeconomics and Macroeconomics instructors, deliberately small live classes, examiner feedback on every question you submit, and Cognify AI tracking exactly where you're losing marks. You're not paying for time; you're paying for the rigour, feedback and intelligence that actually move grades.",
  },
  {
    q: "How do I know it's right for my exam board?",
    a: "Every class, problem set and piece of feedback is mapped to your exact specification: Cambridge O Level, IGCSE & A Level, Pearson Edexcel (IGCSE & A Level), or the IB Diploma. Nothing is generic. You only spend time on what your board rewards, taught by instructors who know precisely how each one marks.",
  },
  {
    q: "What does a typical week look like?",
    a: "One hour of live, co-taught class a day, five days a week, in a small cohort, with Microeconomics and Macroeconomics each led by a specialist. Around that sit compulsory weekly assignments and a monthly assessment with live exam feedback from trained examiners, so you're always being measured against the real standard.",
  },
  {
    q: "How quickly will I see results?",
    a: "Confidence usually shifts first, within the first couple of weeks, as concepts start to click instead of intimidate. From there, Cognify AI turns your submissions into a live Predicted Grade and Exam Readiness Score, so progress is visible, not guessed at. With consistent engagement across the cohort, grades move as your reasoning deepens.",
  },
  {
    q: "Is there enough practice and feedback?",
    a: "Yes, arguably more than anywhere else. You can submit an unlimited number of exam-style questions, and trained examiners return detailed, personalised feedback in under 24 hours. Add monthly assessments with live exam feedback and a 24/7 Cognify AI tutor, and you always know exactly where you stand and what to fix next.",
  },
  {
    q: "Is there a free trial or financial support?",
    a: "Every plan starts with a 7-day free trial, so you can experience the live classes and the Lab before committing. We also offer both need-based and merit scholarships. Cognify should be defined by how driven a student is, not only what they can pay.",
  },
  {
    q: "How are the cohorts structured?",
    a: "We run three-month cohorts, three times a year (July–September, October–December, January–March), kept intentionally small so classes stay interactive and personalised. Our founding cohort is reviewed individually, and built for students aiming at academic distinction and world-class university placements.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="info-desk" className="relative w-full px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="glass-navy flex flex-col rounded-[34px] p-8 md:p-10">
            <Reveal>
              <h2 className="text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-tightest text-white">
                Questions
                <br />
                <span className="text-gold">Answered</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-sm text-white/65">
                Everything you need to know before you apply. Still have a question
                we haven&apos;t answered? Apply for Cohort and we&apos;ll answer it
                personally.
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
                    className="group flex w-full items-center justify-between gap-6 py-7 text-left focus-gold"
                  >
                    <motion.span
                      animate={{ x: isOpen ? 12 : 0 }}
                      transition={spring.snappy}
                      className={cn(
                        "text-xl font-medium tracking-tight transition-colors duration-300 md:text-2xl",
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
