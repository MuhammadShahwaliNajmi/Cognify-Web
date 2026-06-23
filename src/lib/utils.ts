import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shared spring presets — physics-backed motion used across the site. */
export const spring = {
  soft: { type: "spring", stiffness: 120, damping: 20, mass: 0.8 } as const,
  snappy: { type: "spring", stiffness: 320, damping: 28, mass: 0.6 } as const,
  gentle: { type: "spring", stiffness: 70, damping: 18, mass: 1 } as const,
  /** Scroll-linked transform smoothing (per spec). */
  scroll: { stiffness: 100, damping: 30, restDelta: 0.001 } as const,
};
