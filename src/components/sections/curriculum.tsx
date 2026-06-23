"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { SectionLabel } from "@/components/ui/section-label";
import { cn, spring } from "@/lib/utils";

const PROGRAMS = [
  {
    name: "Cambridge O Level, IGCSE & A Level",
    desc: "Rigorous, structured coverage of the Cambridge Economics and Business syllabi — from O Level and IGCSE through AS & A Level — drilling the precise answer structure that converts understanding into A*s.",
  },
  {
    name: "Pearson Edexcel · IGCSE & A Level",
    desc: "Theme-by-theme command of the Edexcel Economics and Business specification, from IGCSE through A Level, with exam-board-specific essay technique and quantitative skills woven throughout.",
  },
  {
    name: "IB Diploma Programme",
    desc: "HL & SL mastery of Economics and Business Management — micro, macro, the global economy and the management framework, taught with the analytical depth IB examiners reward.",
  },
];

export function Curriculum() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section id="curriculum" className="relative w-full px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionLabel index="03">Curriculums Offered</SectionLabel>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-7 max-w-2xl text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-tightest text-navy">
            Two subjects.
            <br />
            <span className="text-gold">Three boards.</span>
          </h2>
        </Reveal>

        <div
          className="mt-16"
          onMouseLeave={() => setHovered(null)}
        >
          {PROGRAMS.map((prog, i) => {
            const isOn = hovered === i;
            const dimmed = hovered !== null && hovered !== i;
            return (
              <div key={prog.name} className="border-t border-navy/12 last:border-b">
                <motion.button
                  onMouseEnter={() => setHovered(i)}
                  onFocus={() => setHovered(i)}
                  onClick={() => setHovered(isOn ? null : i)}
                  animate={{ x: isOn ? 10 : 0 }}
                  transition={spring.snappy}
                  className="flex w-full items-baseline gap-4 py-6 text-left focus-gold"
                >
                  <span
                    className={cn(
                      "font-mono text-xs transition-colors duration-300",
                      isOn ? "text-gold" : "text-navy/40"
                    )}
                  >
                    0{i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-xl font-medium tracking-tight transition-colors duration-300 md:text-2xl",
                      isOn ? "text-gold" : dimmed ? "text-navy/30" : "text-navy"
                    )}
                  >
                    {prog.name}
                  </span>
                </motion.button>

                <AnimatePresence initial={false}>
                  {isOn && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={spring.soft}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-7 pl-8 text-[15px] leading-relaxed text-navy/70">
                        {prog.desc}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
