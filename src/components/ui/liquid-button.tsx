"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface LiquidButtonProps {
  href?: string;
  variant?: "primary" | "secondary";
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

interface Burst {
  id: number;
  x: number;
  y: number;
  particles: { dx: number; dy: number }[];
}

/**
 * Deep-navy liquid-glass CTA: a specular sheen wipe (.gloss), a gold glow on
 * hover, and a gold data-particle burst on click. No magnetic tracking.
 * Renders a real <button> when no `href` is supplied (so it won't navigate).
 *  - primary   → deep-navy glass / white text
 *  - secondary → white glass / navy text → gold
 */
export function LiquidButton({
  href,
  variant = "primary",
  className,
  children,
  onClick,
}: LiquidButtonProps) {
  const ref = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();
  const [bursts, setBursts] = useState<Burst[]>([]);

  const handleClick = (e: React.MouseEvent) => {
    onClick?.(e);
    if (reduce) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const id = Date.now();
    const particles = Array.from({ length: 14 }, () => {
      const a = Math.random() * Math.PI * 2;
      const dist = 32 + Math.random() * 40;
      return { dx: Math.cos(a) * dist, dy: Math.sin(a) * dist };
    });
    setBursts((b) => [
      ...b,
      { id, x: e.clientX - rect.left, y: e.clientY - rect.top, particles },
    ]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 700);
  };

  const cls = cn(
    "gloss group relative inline-flex items-center justify-center gap-2.5 rounded-full px-8 py-4 text-[15px] font-semibold tracking-tight transition-shadow duration-300 focus-gold",
    variant === "primary"
      ? "glass-navy text-white hover:shadow-[0_18px_42px_-16px_rgba(201,169,75,0.55)]"
      : "glass-white text-navy hover:shadow-[0_18px_40px_-18px_rgba(201,169,75,0.5)]",
    className
  );

  const motionProps = {
    whileHover: reduce ? undefined : { y: -2 },
    whileTap: reduce ? undefined : { scale: 0.97 },
    transition: { type: "spring" as const, stiffness: 400, damping: 22 },
    onClick: handleClick,
    className: cls,
  };

  const inner = (
    <>
      {/* gold highlight fill on hover */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span className="relative z-10 inline-flex items-center gap-2.5 transition-colors duration-300 group-hover:text-navy-deep">
        {children}
      </span>
      <AnimatePresence>
        {bursts.map((burst) =>
          burst.particles.map((p, i) => (
            <motion.span
              key={`${burst.id}-${i}`}
              initial={{ opacity: 1, x: burst.x, y: burst.y, scale: 1 }}
              animate={{ opacity: 0, x: burst.x + p.dx, y: burst.y + p.dy, scale: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.62, ease: "easeOut" }}
              className="pointer-events-none absolute left-0 top-0 z-20 h-[3px] w-[3px] rounded-[1px] bg-gold"
            />
          ))
        )}
      </AnimatePresence>
    </>
  );

  if (href) {
    return (
      <motion.a ref={ref as React.RefObject<HTMLAnchorElement>} href={href} {...motionProps}>
        {inner}
      </motion.a>
    );
  }

  return (
    <motion.button ref={ref as React.RefObject<HTMLButtonElement>} type="button" {...motionProps}>
      {inner}
    </motion.button>
  );
}
