"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { cn, spring } from "@/lib/utils";

const PROGRAMS = [
  {
    name: "Cambridge O Level, IGCSE & A Level",
    desc: "Rigorous, structured coverage of the Cambridge Economics and Business syllabi, from O Level and IGCSE through AS & A Level, drilling the precise answer structure that converts understanding into A*s.",
    result: "Drilled for the A*",
  },
  {
    name: "Pearson Edexcel · IGCSE & A Level",
    desc: "Theme-by-theme command of the Edexcel Economics and Business specification, from IGCSE through A Level, with exam-board-specific essay technique and quantitative skills woven throughout.",
    result: "Marks in every theme",
  },
  {
    name: "IB Diploma Programme",
    desc: "HL & SL mastery of Economics and Business Management: micro, macro, the global economy and the management framework, taught with the analytical depth IB examiners reward.",
    result: "Built for the 7",
  },
];

export function Curriculum() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section id="curriculum" className="relative w-full px-6 py-20 md:px-10 md:py-40">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="max-w-2xl text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-tightest text-navy">
            Two Subjects
            <br />
            <span className="text-gold">Three Boards</span>
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
                      <div className="max-w-2xl pb-7 pl-8">
                        <p className="text-[15px] leading-relaxed text-navy/70">
                          {prog.desc}
                        </p>
                        <p className="mt-4 text-sm font-medium tracking-tight text-gold">
                          {prog.result}
                        </p>
                      </div>
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
