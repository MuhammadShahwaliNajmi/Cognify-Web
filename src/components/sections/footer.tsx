"use client";

import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { TextReveal } from "@/components/ui/text-reveal";
import { LiquidButton } from "@/components/ui/liquid-button";
import { Logo } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer id="apply" className="relative w-full border-t border-navy/12 px-6 pb-12 pt-28 md:px-10 md:pt-40">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">
            Applications Open
          </p>
        </Reveal>

        <TextReveal
          as="h2"
          text="Claim your seat in *Cohort* *Zero*"
          className="mt-7 max-w-3xl text-[clamp(2.4rem,7vw,5.5rem)] font-semibold leading-[1.04] tracking-tightest text-navy"
        />

        <Reveal delay={0.1}>
          <p className="mt-8 max-w-xl text-lg text-navy/70">
            Distraction-free. Fast-paced. Built for students aiming at A*s,
            Grade&nbsp;7s, and world-class university placements.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-12">
            <LiquidButton href="#apply" className="px-9 py-[1.15rem] text-base">
              Apply for Cohort Zero
              <ArrowUpRight size={18} />
            </LiquidButton>
          </div>
        </Reveal>

        <div className="mt-28 flex flex-col items-start justify-between gap-6 border-t border-navy/12 pt-8 md:flex-row md:items-center">
          <Logo />
          <nav className="flex flex-wrap gap-x-9 gap-y-2 text-sm font-medium text-navy">
            <a href="#method" className="link-gold">Methodology</a>
            <a href="#curriculum" className="link-gold">Curriculums</a>
            <a href="#ecosystem" className="link-gold">Ecosystem</a>
            <a href="#pricing" className="link-gold">Pricing</a>
            <a href="#info-desk" className="link-gold">Info Desk</a>
          </nav>
          <p className="text-xs text-navy/40">
            © {new Date().getFullYear()} Cognify · cognifypk.com
          </p>
        </div>
      </div>
    </footer>
  );
}
