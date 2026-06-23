"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const wordV: Variants = {
  hidden: { y: "115%", opacity: 0 },
  show: {
    y: "0%",
    opacity: 1,
    transition: { type: "spring", stiffness: 120, damping: 20, mass: 0.7 },
  },
};

/**
 * Splits text into words and reveals them on scroll-into-view, line-by-line via
 * a clipped stagger. Words containing markers wrapped in *asterisks* render gold.
 */
export function TextReveal({
  text,
  className,
  as: Tag = "p",
  once = true,
  amount = 0.5,
}: {
  text: string;
  className?: string;
  as?: "p" | "h1" | "h2" | "h3" | "span";
  once?: boolean;
  amount?: number;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");

  if (reduce) {
    const Static = Tag as React.ElementType;
    return (
      <Static className={className}>
        {words.map((w, i) => {
          const gold = w.startsWith("*") && w.endsWith("*");
          return (
            <span key={i} className={gold ? "text-gold" : undefined}>
              {gold ? w.slice(1, -1) : w}
              {i < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </Static>
    );
  }

  const MotionTag = motion[Tag] as typeof motion.p;

  return (
    <MotionTag
      className={cn(className)}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
    >
      {words.map((w, i) => {
        const gold = w.startsWith("*") && w.endsWith("*");
        const clean = gold ? w.slice(1, -1) : w;
        return (
          <span key={i} className="inline-flex overflow-hidden pb-[0.18em]">
            <motion.span
              variants={wordV}
              className={cn("inline-block", gold && "text-gold")}
            >
              {clean}
              {i < words.length - 1 ? " " : ""}
            </motion.span>
          </span>
        );
      })}
    </MotionTag>
  );
}
