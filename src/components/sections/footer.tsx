"use client";

import { ArrowUpRight, Instagram, Mail } from "lucide-react";
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
          text="Claim Your Seat In The *Cohort*"
          className="mt-7 max-w-3xl text-[clamp(2.4rem,7vw,5.5rem)] font-semibold leading-[1.04] tracking-tightest text-navy"
        />

        <Reveal delay={0.1}>
          <p className="mt-8 max-w-xl text-lg text-navy/70">
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
          <div className="mt-12">
            <LiquidButton href="/apply/" className="px-9 py-[1.15rem] text-base">
              Apply for Cohort
              <ArrowUpRight size={18} />
            </LiquidButton>
          </div>
        </Reveal>

        <div className="mt-28 border-t border-navy/12 pt-10">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xs">
              <Logo />
              <p className="mt-4 text-sm text-navy/55">
                Live Economics &amp; Business, taught by two specialists. Built for
                A* and 7+ students.
              </p>
            </div>

            <div className="flex flex-col gap-10 sm:flex-row sm:gap-16">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-navy/45">
                  Contact
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li>
                    <a href="mailto:najmi@cognifypk.com" className="link-gold inline-flex items-center gap-2">
                      <Mail size={14} />
                      najmi@cognifypk.com
                    </a>
                  </li>
                  <li>
                    <a href="mailto:hasaan@cognifypk.com" className="link-gold inline-flex items-center gap-2">
                      <Mail size={14} />
                      hasaan@cognifypk.com
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-navy/45">
                  Follow
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li>
                    <a
                      href="https://instagram.com/cognifyeducation"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-gold inline-flex items-center gap-2"
                    >
                      <Instagram size={14} />
                      @Cognifyeducation
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-navy/12 pt-6 md:flex-row md:items-center">
            <p className="text-xs text-navy/40">
              © {new Date().getFullYear()} Cognify · cognifypk.com
            </p>
            <p className="text-xs text-navy/40">All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
