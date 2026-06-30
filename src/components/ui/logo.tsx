"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Cognify mark — faithful to the brand logo: navy coordinate axes with an
 * upward gold regression vector ending in a node. Renders crisply on pure
 * white. Draws on mount; the node + vector re-energise on hover.
 */
export function LogoMark({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <motion.svg
      viewBox="0 0 40 40"
      className={cn("overflow-visible", className)}
      fill="none"
      initial="rest"
      whileHover="hover"
      animate="rest"
      aria-hidden="true"
    >
      {/* Axes (navy) */}
      <motion.path
        d="M9 6 V31 H34"
        stroke="#1a2744"
        strokeWidth={1.8}
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={reduce ? {} : { pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
      {/* Arrowheads */}
      <path d="M9 6 l-2.4 3.4 M9 6 l2.4 3.4" stroke="#1a2744" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M34 31 l-3.4 -2.4 M34 31 l-3.4 2.4" stroke="#1a2744" strokeWidth={1.6} strokeLinecap="round" />

      {/* Gold regression vector */}
      <motion.path
        d="M12 28 L29 11"
        stroke="#D4B254"
        strokeWidth={2.6}
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={reduce ? {} : { pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        variants={reduce ? {} : { rest: { pathLength: 1 }, hover: { pathLength: [1, 0.55, 1] } }}
      />

      {/* Data node (gold) */}
      <motion.circle
        cx={29}
        cy={11}
        r={3.4}
        fill="#D4B254"
        initial={reduce ? false : { scale: 0, opacity: 0 }}
        animate={reduce ? {} : { scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.95 }}
        variants={reduce ? {} : { rest: { scale: 1 }, hover: { scale: 1.3 } }}
        style={{ transformOrigin: "29px 11px" }}
      />
    </motion.svg>
  );
}

export function Logo({
  className,
  withWordmark = true,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <a
      href="#top"
      className={cn("group flex items-center gap-2.5", className)}
      aria-label="Cognify home"
    >
      <LogoMark className="h-8 w-8" />
      {withWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[17px] font-bold tracking-tight text-navy">
            COGNI<span className="text-gold">FY</span>
          </span>
          <span className="mt-0.5 text-[7px] font-medium uppercase tracking-[0.42em] text-navy/55">
            Education
          </span>
        </span>
      )}
    </a>
  );
}
