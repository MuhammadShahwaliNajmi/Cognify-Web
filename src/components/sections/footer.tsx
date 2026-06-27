"use client";

import { ArrowUpRight, Facebook, Instagram, Mail } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { TextReveal } from "@/components/ui/text-reveal";
import { LiquidButton } from "@/components/ui/liquid-button";

export function Footer() {
  return (
    <footer id="apply" className="relative w-full px-6 pb-10 pt-20 md:px-10 md:pt-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <span className="inline-flex items-center gap-2.5 rounded-full bg-navy-deep px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-gold">
            <span className="h-1.5 w-1.5 animate-pulse-node rounded-full bg-gold" />
            Cohort · Applications Open
          </span>
        </Reveal>

        <TextReveal
          as="h2"
          text="Claim Your Seat In The *Cohort*"
          className="mt-6 max-w-3xl text-[clamp(2.2rem,6vw,4.5rem)] font-semibold leading-[1.04] tracking-tightest text-navy"
        />

        <Reveal delay={0.1}>
          <p className="mt-6 max-w-xl text-base text-navy/70">
            Distraction-free. Fast-paced. Built for students aiming at A*s and
            world-class university placements.
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-4 text-sm text-navy/60">
            <span className="text-gold">*</span> Need-based and merit scholarships available
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-8">
            <LiquidButton href="/apply/" className="px-6 py-3 text-sm">
              Apply for Cohort
              <ArrowUpRight size={16} />
            </LiquidButton>
          </div>
        </Reveal>

        <div className="mt-14 border-t border-gold pt-8">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-navy/45">
                Stay Connected
              </p>
              <div className="mt-5 space-y-2.5">
                <a
                  href="mailto:najmi@cognifypk.com"
                  className="flex items-center gap-2.5 text-base font-medium tracking-tight text-navy transition-colors hover:text-gold"
                >
                  <Mail size={16} className="text-navy" />
                  najmi@cognifypk.com
                </a>
                <a
                  href="mailto:hasaan@cognifypk.com"
                  className="flex items-center gap-2.5 text-base font-medium tracking-tight text-navy transition-colors hover:text-gold"
                >
                  <Mail size={16} className="text-navy" />
                  hasaan@cognifypk.com
                </a>
              </div>
            </div>

            <div className="md:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-navy/45">
                Social Media
              </p>
              <div className="mt-5 flex gap-3 md:justify-end">
                <a
                  href="https://instagram.com/cognifyeducation"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Cognify on Instagram"
                  className="grid h-11 w-11 place-items-center rounded-full border border-navy/15 text-navy transition-colors hover:border-gold hover:text-gold"
                >
                  <Instagram size={18} />
                </a>
                <a
                  href="https://facebook.com/cognifyeducation"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Cognify on Facebook"
                  className="grid h-11 w-11 place-items-center rounded-full border border-navy/15 text-navy transition-colors hover:border-gold hover:text-gold"
                >
                  <Facebook size={18} />
                </a>
              </div>
            </div>
          </div>

          <p className="mt-10 text-center text-xs text-navy/40">
            © {new Date().getFullYear()} Cognify. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
