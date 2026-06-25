"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { SectionLabel } from "@/components/ui/section-label";
import { spring } from "@/lib/utils";

const BESTIES = [
  {
    initials: "AK",
    name: "Ayesha Khan",
    tag: "Your Economics Bestie",
    chips: ["Microeconomics", "Macroeconomics"],
    bio: "A former senior examiner who splits your Economics between micro and macro so nothing stays abstract. Famous for turning impossible diagrams into the easiest marks on the paper.",
    stats: [
      { value: "9 yrs", label: "Teaching" },
      { value: "A* avg", label: "Cohort grade" },
    ],
  },
  {
    initials: "HA",
    name: "Hamza Ali",
    tag: "Your Business Bestie",
    chips: ["Business", "Exam Technique"],
    bio: "Equal parts strategist and hype-man. He drills case studies, command words and 24-hour feedback until exam-style answers become second nature — and somehow makes 8am classes fun.",
    stats: [
      { value: "7 yrs", label: "Teaching" },
      { value: "600+", label: "Students" },
    ],
  },
];

export function Besties() {
  const reduce = useReducedMotion();

  return (
    <section id="besties" className="relative w-full px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionLabel index="02">The Teaching Team</SectionLabel>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-7 max-w-2xl text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-tightest text-navy">
            Meet your
            <br />
            <span className="text-gold">Besties.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-md text-navy/70">
            Not distant lecturers — mentors in your corner, five days a week, who
            know your name, your weak spots and your target grade.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {BESTIES.map((b, i) => (
            <Reveal key={b.name} delay={0.15 + i * 0.18}>
              <motion.article
                whileHover={reduce ? undefined : { y: -6 }}
                transition={spring.snappy}
                className="flex h-full flex-col rounded-[34px] border border-navy/10 bg-white p-8 shadow-[0_24px_60px_-34px_rgba(26,39,68,0.4)] md:p-10"
              >
                <div className="flex items-center gap-5">
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-navy-deep text-xl font-semibold tracking-wide text-gold">
                    {b.initials}
                  </span>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
                      {b.tag}
                    </span>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
                      {b.name}
                    </h3>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {b.chips.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-navy/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-navy/65"
                    >
                      {c}
                    </span>
                  ))}
                </div>

                <p className="mt-6 flex-1 text-[15px] leading-relaxed text-navy/75">{b.bio}</p>

                <div className="mt-8 grid grid-cols-2 gap-4 border-t border-navy/10 pt-6">
                  {b.stats.map((s) => (
                    <div key={s.label}>
                      <span className="block text-xl font-semibold text-navy">{s.value}</span>
                      <span className="block text-[12px] uppercase tracking-[0.12em] text-navy/50">
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
