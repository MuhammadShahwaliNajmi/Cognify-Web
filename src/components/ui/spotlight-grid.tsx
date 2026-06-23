"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Faint navy coordinate grid + a cursor-tracked gold radial glow.
 * Updates CSS vars via rAF (no React re-render) to stay at 60fps.
 */
export function SpotlightGrid({
  className,
  children,
  masked = true,
}: {
  className?: string;
  children?: React.ReactNode;
  masked?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number>(0);
  const reduce = useReducedMotion();

  const onMove = (e: React.MouseEvent) => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      el.style.setProperty("--my", `${e.clientY - rect.top}px`);
      el.style.setProperty("--spot-opacity", "1");
    });
  };

  const onLeave = () => {
    ref.current?.style.setProperty("--spot-opacity", "0");
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn("spotlight relative", className)}
    >
      <div
        className={cn("pointer-events-none absolute inset-0 bg-grid", masked && "bg-grid-mask")}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
