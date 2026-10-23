"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { cn, spring } from "@/lib/utils";

type Bestie = {
  name: string;
  image: string;
  bio: string;
  logos: { src: string; alt: string; imgClass?: string }[];
  stats: { value: string; label: string }[];
};

const BESTIES: Bestie[] = [
  {
    name: "M. Shahwali Najmi",
    image: "/shahwali-profile.jpg",
    bio: "The teacher who won't move on until you've got it. He breaks hard topics into clear steps and shows you exactly what examiners want.",
    logos: [
      { src: "/cambridge-logo.png", alt: "Cambridge" },
      { src: "/ib-logo.png", alt: "International Baccalaureate" },
    ],
    stats: [
      { value: "Coach", label: "Pakistan Team - Int'l Economics Olympiad" },
      { value: "Instructor", label: "TNS Beaconhouse\nIB Economics" },
    ],
  },
  {
    name: "M. Hasaan Haroon",
    image: "/hasaan-profile.jpg",
    bio: "Makes the hard parts feel manageable. Patient with questions, fast with feedback, and sharp at catching the small mistakes that cost you marks.",
    logos: [
      { src: "/cambridge-logo.png", alt: "Cambridge" },
      { src: "/pearson-p-logo.jpg", alt: "Pearson Edexcel", imgClass: "scale-[1.5]" },
    ],
    stats: [
      { value: "Coach", label: "Pakistan Team - World Youth Forum" },
      { value: "Mentor", label: "Pakistan Team - Int'l Business Olympiad" },
    ],
  },
];

const RADIUS = 34; // matches rounded-[34px]
const INSET = 2.5; // half the stroke width — puts the line's outer edge on the card edge

function BestieCard({ b }: { b: Bestie }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // pixel-perfect rounded-rect outline, split at the top-centre so it can grow
  // both ways and meet at the bottom-centre (one full highlight around the card)
  const { w, h } = size;
  const cx = w / 2;
  const right = w - INSET;
  const bottom = h - INSET;
  const r = Math.max(0, Math.min(RADIUS - INSET, w / 2 - INSET, h / 2 - INSET));
  const rightPath = `M${cx} ${INSET} H${right - r} Q${right} ${INSET} ${right} ${INSET + r} V${bottom - r} Q${right} ${bottom} ${right - r} ${bottom} H${cx}`;
  const leftPath = `M${cx} ${INSET} H${INSET + r} Q${INSET} ${INSET} ${INSET} ${INSET + r} V${bottom - r} Q${INSET} ${bottom} ${INSET + r} ${bottom} H${cx}`;

  return (
    <motion.article
      ref={ref}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileHover={reduce ? undefined : { y: -6 }}
      transition={spring.snappy}
      className="glass-navy relative flex h-full flex-col items-center rounded-[34px] p-8 text-center text-white md:p-10"
    >
      {!reduce && w > 0 && (
        <svg
          width={w}
          height={h}
          className="pointer-events-none absolute -inset-px z-10 overflow-visible"
          aria-hidden="true"
        >
          {[rightPath, leftPath].map((d, k) => (
            <motion.path
              key={k}
              d={d}
              fill="none"
              stroke="#D4B254"
              strokeWidth={5}
              strokeLinecap="round"
              initial={false}
              animate={{ pathLength: hover ? 1 : 0, opacity: hover ? 1 : 0 }}
              transition={{
                pathLength: { duration: hover ? 3 : 0, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: hover ? 0.08 : 0.25 },
              }}
            />
          ))}
        </svg>
      )}

      {/* profile picture space */}
      <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/15 md:h-40 md:w-40">
        <img
          src={b.image}
          alt={b.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-top"
        />
      </div>

      <span className="mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">
        Economics
        <span className="mx-[0.4em] font-light text-gold/80">|</span>
        Business
      </span>

      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
        {b.name}
      </h3>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        {b.logos.map((l) => (
          <span
            key={l.src}
            className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white"
          >
            <img
              src={l.src}
              alt={l.alt}
              loading="lazy"
              decoding="async"
              className={cn("h-9 w-9 object-contain", l.imgClass)}
            />
          </span>
        ))}
      </div>

      <p className="mt-6 flex-1 text-[15px] leading-relaxed text-white/70">
        {b.bio}
      </p>

      <div className="mt-8 grid w-full grid-cols-2 items-start gap-5 border-t border-white/15 pt-6">
        {b.stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center text-center">
            <span className="block text-lg font-semibold text-gold">{s.value}</span>
            <span className="mt-2 block w-full text-balance text-center text-[10.5px] uppercase leading-relaxed tracking-[0.12em] text-white">
              {s.label.split("\n").map((line, li) => (
                <span key={li} className="block">
                  {line.split("-").map((part, idx, arr) => (
                    <span key={idx}>
                      {part.trim()}
                      {idx < arr.length - 1 && (
                        <span className="px-[0.35em] font-light text-gold/80">-</span>
                      )}
                    </span>
                  ))}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </motion.article>
  );
}

export function Besties() {
  return (
    <section id="besties" className="relative w-full px-6 py-20 md:px-10 md:py-40">
      <div id="tutors" className="mx-auto max-w-6xl scroll-mt-20">
        <Reveal>
          <div className="flex justify-center">
            <h2 className="inline-flex items-center rounded-full bg-gold px-7 py-3 text-[clamp(1.05rem,2.4vw,1.5rem)] font-semibold tracking-tight text-navy-deep">
              Meet The Concept Lab Tutors
            </h2>
          </div>
        </Reveal>

        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
          {BESTIES.map((b, i) => (
            <Reveal key={b.name} delay={0.15 + i * 0.18}>
              <BestieCard b={b} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
