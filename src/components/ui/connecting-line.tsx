"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { spring } from "@/lib/utils";

/**
 * A thin navy line that draws itself top→bottom as the viewport scrolls through
 * the wrapped region, with a gold node travelling along its leading edge.
 * Place inside a `relative` container; it fills the container's height.
 */
export function ConnectingLine({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 88%"],
  });
  const p = useSpring(scrollYProgress, spring.scroll);
  const nodeTop = useTransform(p, [0, 1], ["0%", "100%"]);

  return (
    <div ref={ref} className={className} aria-hidden="true">
      <svg
        className="h-full w-full"
        viewBox="0 0 2 100"
        preserveAspectRatio="none"
        fill="none"
      >
        {/* faint full track */}
        <line x1="1" y1="0" x2="1" y2="100" stroke="#1a2744" strokeOpacity="0.1" strokeWidth="1" />
        {/* drawn portion */}
        <motion.line
          x1="1"
          y1="0"
          x2="1"
          y2="100"
          stroke="#1a2744"
          strokeWidth="1.4"
          style={reduce ? { pathLength: 1 } : { pathLength: p }}
        />
      </svg>
      {!reduce && (
        <motion.span
          style={{ top: nodeTop }}
          className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_0_4px_rgba(212, 178, 84,0.18)]"
        />
      )}
    </div>
  );
}
