"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { Star } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { SectionLabel } from "@/components/ui/section-label";

type Testimonial = {
  quote: string;
  name: string;
  meta: string;
  initials: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I went from a shaky C to an A* in Edexcel Economics in one cohort. Splitting micro and macro between two specialists finally made the diagrams click — and the under-24-hour examiner feedback meant I never repeated a mistake.",
    name: "Zainab R.",
    meta: "A* Economics · Edexcel A Level",
    initials: "ZR",
  },
  {
    quote:
      "The live classes feel tiny and personal, never a lecture. My Cognify AI Predicted Grade kept creeping up every week, and by the mocks I knew exactly which topics were costing me marks.",
    name: "Daniyal A.",
    meta: "Grade 9 Business · Cambridge IGCSE",
    initials: "DA",
  },
  {
    quote:
      "Five days a week with people who actually answer at midnight. Cognify didn't just get me a 7 in IB Economics — it made me genuinely enjoy the subject for the first time.",
    name: "Mahnoor S.",
    meta: "7/7 Economics · IB Diploma",
    initials: "MS",
  },
];

function TestimonialCard({ t, index }: { t: Testimonial; index: number }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), {
    stiffness: 150,
    damping: 15,
  });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), {
    stiffness: 150,
    damping: 15,
  });

  const onMove = (e: React.MouseEvent) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <Reveal delay={0.15 + index * 0.18} className="h-full">
      <div className="h-full [perspective:1100px]" onMouseMove={onMove} onMouseLeave={onLeave}>
        <motion.figure
          style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
          animate={reduce ? undefined : { y: [0, -14, 0] }}
          transition={
            reduce
              ? undefined
              : {
                  duration: 4.6 + index * 0.7,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.5,
                }
          }
          whileHover={reduce ? undefined : { scale: 1.035 }}
          className="flex h-full flex-col rounded-[34px] border border-navy/10 bg-white p-8 shadow-[0_24px_60px_-34px_rgba(26,39,68,0.4)] transition-[box-shadow,border-color] duration-300 hover:border-gold/40 hover:shadow-[0_40px_90px_-30px_rgba(26,39,68,0.55)]"
        >
          <div
            className="flex gap-1 text-gold"
            style={reduce ? undefined : { transform: "translateZ(45px)" }}
            aria-label="5 out of 5"
          >
            {Array.from({ length: 5 }).map((_, s) => (
              <Star key={s} size={15} className="fill-gold" />
            ))}
          </div>

          <blockquote
            className="mt-5 flex-1 text-[15px] leading-relaxed text-navy/75"
            style={reduce ? undefined : { transform: "translateZ(28px)" }}
          >
            &ldquo;{t.quote}&rdquo;
          </blockquote>

          <figcaption
            className="mt-7 flex items-center gap-3.5 border-t border-navy/10 pt-5"
            style={reduce ? undefined : { transform: "translateZ(36px)" }}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-navy-deep text-[13px] font-semibold tracking-wide text-gold">
              {t.initials}
            </span>
            <span>
              <span className="block text-sm font-semibold text-navy">{t.name}</span>
              <span className="block text-[12px] uppercase tracking-[0.12em] text-navy/50">
                {t.meta}
              </span>
            </span>
          </figcaption>
        </motion.figure>
      </div>
    </Reveal>
  );
}

export function Testimonials() {
  return (
    <section id="testimonials" className="relative w-full px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionLabel index="07">In Their Words</SectionLabel>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-7 max-w-2xl text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-tightest text-navy">
            Grades climbed.
            <br />
            <span className="text-gold">So did confidence.</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={t.name} t={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
