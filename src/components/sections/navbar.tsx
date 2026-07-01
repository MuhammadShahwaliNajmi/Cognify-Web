"use client";

import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { LiquidButton } from "@/components/ui/liquid-button";
import { cn, spring } from "@/lib/utils";

const LINKS = [
  { label: "Home", href: "#top" },
  { label: "Methodology", href: "#method" },
  { label: "Cognify Tutors", href: "#tutors" },
  { label: "Curriculums", href: "#curriculum" },
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "Pricing", href: "#pricing" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Info Desk", href: "#info-desk" },
];

/* small brand graph glyph for the mobile menu — white axes, gold regression vector */
function MenuGlyph() {
  return (
    <svg viewBox="0 0 56 56" className="h-32 w-32" fill="none" aria-hidden="true">
      <motion.path
        d="M16 8 V44 H52"
        stroke="#FFFFFF"
        strokeOpacity={0.45}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
      />
      <motion.path
        d="M20 40 L48 14"
        stroke="#D4B254"
        strokeWidth={2.6}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.36 }}
      />
      <motion.circle
        cx={48}
        cy={14}
        r={4}
        fill="#D4B254"
        style={{ transformOrigin: "48px 14px" }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...spring.snappy, delay: 0.72 }}
      />
    </svg>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...spring.soft, delay: 0.2 }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <nav
        className={cn(
          "flex w-full items-center justify-between px-6 transition-all duration-500 lg:px-10",
          scrolled
            ? "border-b border-navy/12 bg-white/85 py-3 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent py-5"
        )}
      >
        <a href="#top" aria-label="Cognify home" className="flex items-center">
          <img src="/cognify-logo-mark.png" alt="Cognify" className="h-9 w-auto md:h-10" />
        </a>

        {/* deep-navy nav pill · gold hover highlight (motion.dev-style glide) */}
        <ul
          className="relative hidden items-center gap-0.5 rounded-full bg-navy-deep px-2 py-1.5 shadow-[0_10px_30px_-16px_rgba(8,16,33,0.7)] md:flex"
          onMouseLeave={() => setHovered(null)}
        >
          {LINKS.map((l, i) => (
            <li key={l.href} className="relative">
              <a
                href={l.href}
                onMouseEnter={() => setHovered(i)}
                onFocus={() => setHovered(i)}
                className="relative block rounded-full px-3.5 py-1.5 text-sm font-medium tracking-tight lg:px-4"
              >
                {hovered === i && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-gold"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 transition-colors duration-200",
                    hovered === i ? "text-navy-deep" : "text-white"
                  )}
                >
                  {l.label}
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <LiquidButton href="/apply/" className="px-5 py-2.5 text-[0.8125rem] lg:px-6">
            Apply for Cohort
          </LiquidButton>
        </div>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-full text-navy md:hidden focus-gold"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.snappy}
            className="overflow-hidden border-b border-white/10 bg-navy-deep md:hidden"
          >
            <div className="flex items-stretch gap-5 px-6 py-7">
              {/* left — navigation pills */}
              <ul className="flex w-fit flex-col gap-2.5">
                {LINKS.map((l, i) => (
                  <motion.li
                    key={l.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i, ...spring.snappy }}
                  >
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block w-full rounded-full bg-gold px-4 py-1.5 text-left text-[13px] font-semibold tracking-tight text-navy-deep transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
                    >
                      {l.label}
                    </a>
                  </motion.li>
                ))}
                <motion.li
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * LINKS.length, ...spring.snappy }}
                  className="pt-1"
                >
                  <a
                    href="/apply/"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-2 rounded-full border border-gold bg-transparent px-4 py-1.5 text-left text-[13px] font-semibold tracking-tight text-gold transition-colors duration-200 hover:bg-gold hover:text-navy-deep"
                  >
                    Apply for Cohort →
                  </a>
                </motion.li>
              </ul>

              {/* right — brand glyph, centered in its own space */}
              <div className="relative flex flex-1 items-center justify-center" aria-hidden="true">
                <span className="absolute left-0 top-2 bottom-2 w-px bg-white/10" />
                <MenuGlyph />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
