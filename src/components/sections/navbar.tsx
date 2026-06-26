"use client";

import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
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
          "flex w-full items-center justify-between px-6 transition-all duration-500 md:px-10",
          scrolled
            ? "border-b border-navy/12 bg-white/85 py-3 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent py-5"
        )}
      >
        <Logo />

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
                className="relative block rounded-full px-4 py-1.5 text-sm font-medium tracking-tight"
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
          <LiquidButton href="/apply/" className="px-6 py-2.5 text-[13px]">
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
            className="overflow-hidden border-b border-navy/12 bg-white md:hidden"
          >
            <ul className="flex flex-col px-6 py-2">
              {LINKS.map((l) => (
                <li key={l.href} className="border-b border-navy/8 last:border-b-0">
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block py-4 text-base font-medium text-navy transition-colors hover:text-gold"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <a
              href="/apply/"
              onClick={() => setOpen(false)}
              className="block px-6 pb-5 pt-2 text-base font-semibold text-gold"
            >
              Apply for Cohort →
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
