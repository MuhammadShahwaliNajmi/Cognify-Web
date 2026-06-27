"use client";

import { useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

type Testimonial = {
  quote: string;
  name: string;
  meta: string;
  initials: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "A shaky C to an A* in one cohort. Two specialists for micro and macro made it click.",
    name: "Zainab R.",
    meta: "A* Economics · Edexcel A Level",
    initials: "ZR",
  },
  {
    quote:
      "Examiner feedback in under 24 hours meant I never repeated a mistake twice.",
    name: "Daniyal A.",
    meta: "Grade 9 Business · Cambridge IGCSE",
    initials: "DA",
  },
  {
    quote:
      "Classes are small enough that someone always notices when you're confused, and fixes it.",
    name: "Mahnoor S.",
    meta: "7/7 Economics · IB Diploma",
    initials: "MS",
  },
  {
    quote:
      "Cognify AI showed me exactly which topics were dragging my grade down.",
    name: "Hamza K.",
    meta: "A* Economics · Cambridge A Level",
    initials: "HK",
  },
  {
    quote:
      "Asking a question at 2am and getting a proper, board-specific answer changed how I studied.",
    name: "Aliza F.",
    meta: "A Business · Edexcel A Level",
    initials: "AF",
  },
  {
    quote:
      "Two specialist teachers, all the resources and marking, for less than one tutor cost me.",
    name: "Bilal T.",
    meta: "Grade 8 Economics · Cambridge IGCSE",
    initials: "BT",
  },
  {
    quote:
      "Watching my Predicted Grade climb week by week is what kept me going.",
    name: "Sana M.",
    meta: "6 → 7 Economics · IB Diploma",
    initials: "SM",
  },
  {
    quote:
      "Five days a week with teachers who actually answer at midnight.",
    name: "Usman J.",
    meta: "A* Economics · Edexcel A Level",
    initials: "UJ",
  },
];

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <figure className="mr-5 flex w-[300px] shrink-0 flex-col rounded-[22px] border border-navy/10 bg-white p-5 shadow-[0_20px_50px_-38px_rgba(26,39,68,0.4)] transition-[box-shadow,border-color] duration-300 hover:border-gold/40 hover:shadow-[0_30px_70px_-34px_rgba(26,39,68,0.5)] md:w-[340px]">
      <div className="flex gap-1 text-gold" aria-label="5 out of 5">
        {Array.from({ length: 5 }).map((_, s) => (
          <Star key={s} size={13} className="fill-gold" />
        ))}
      </div>

      <blockquote className="mt-3 flex-1 text-[14px] leading-snug text-navy/75">
        &ldquo;{t.quote}&rdquo;
      </blockquote>

      <figcaption className="mt-4 flex items-center gap-3 border-t border-navy/10 pt-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-navy-deep text-[12px] font-semibold tracking-wide text-gold">
          {t.initials}
        </span>
        <span>
          <span className="block text-[13px] font-semibold text-navy">{t.name}</span>
          <span className="block text-[11px] uppercase tracking-[0.12em] text-navy/50">
            {t.meta}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

function MarqueeRow({
  items,
  reverse,
}: {
  items: Testimonial[];
  reverse?: boolean;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className="flex overflow-x-auto pb-2">
        {items.map((t) => (
          <TestimonialCard key={t.name} t={t} />
        ))}
      </div>
    );
  }

  return (
    <div className="group flex w-max">
      <div
        className={cn(
          "flex w-max shrink-0 group-hover:[animation-play-state:paused]",
          reverse ? "animate-marquee-right" : "animate-marquee-left"
        )}
      >
        {[...items, ...items].map((t, i) => (
          <TestimonialCard key={`${t.name}-${i}`} t={t} />
        ))}
      </div>
    </div>
  );
}

export function Testimonials() {
  const rowA = TESTIMONIALS.slice(0, 4);
  const rowB = TESTIMONIALS.slice(4);

  return (
    <section id="testimonials" className="relative w-full px-6 py-20 md:px-10 md:py-24">
      <div className="mx-auto mb-10 max-w-6xl">
        <Reveal>
          <h2 className="max-w-2xl text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-tightest text-navy">
            Grades Climbed
            <br />
            <span className="text-gold">So Did Confidence</span>
          </h2>
        </Reveal>
      </div>

      {/* clipped to the site content margins, with edge fades so cards
          dissolve into the gutters rather than hitting the screen edge */}
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent md:w-24" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent md:w-24" />

          <div className="flex flex-col gap-5">
            <MarqueeRow items={rowA} />
            <MarqueeRow items={rowB} reverse />
          </div>
        </div>
      </div>
    </section>
  );
}
