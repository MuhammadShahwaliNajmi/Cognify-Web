"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { cn, spring } from "@/lib/utils";

type Tone = "navy" | "gold";

/* line-art placeholder face — gentle float + periodic blink (white/gold, on navy) */
function AnimatedFace({ variant }: { variant: number }) {
  const reduce = useReducedMotion();
  const blinkT = {
    duration: 4.2,
    repeat: Infinity,
    times: [0, 0.9, 0.95, 1],
    ease: "easeInOut" as const,
    delay: variant * 1.4,
  };
  const eye = reduce ? {} : { scaleY: [1, 1, 0.12, 1] };
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="h-[78%] w-[78%]"
      animate={reduce ? undefined : { y: [0, -4, 0] }}
      transition={
        reduce
          ? undefined
          : { duration: 4.6 + variant, repeat: Infinity, ease: "easeInOut", delay: variant * 0.5 }
      }
    >
      <circle cx="50" cy="50" r="30" fill="none" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="2.4" />
      <motion.circle
        cx="40"
        cy="45"
        r="3.4"
        fill="#D4B254"
        style={{ transformOrigin: "40px 45px" }}
        animate={eye}
        transition={blinkT}
      />
      <motion.circle
        cx="60"
        cy="45"
        r="3.4"
        fill="#D4B254"
        style={{ transformOrigin: "60px 45px" }}
        animate={eye}
        transition={blinkT}
      />
      <path
        d={variant === 0 ? "M39 60 Q50 69 61 60" : "M39 62 Q50 67 61 62"}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.85"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}

type Bestie = {
  initials: string;
  name: string;
  tone: Tone;
  image?: string;
  bio: string;
  logos: { src: string; alt: string; imgClass?: string }[];
  stats: { value: string; label: string }[];
};

const BESTIES: Bestie[] = [
  {
    initials: "SN",
    name: "M. Shahwali Najmi",
    tone: "navy",
    image: "/shahwali-profile.png",
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
    initials: "HH",
    name: "M. Hasaan Haroon",
    tone: "navy",
    image: "/hasaan-profile.png",
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

function BestieCard({ b, index }: { b: Bestie; index: number }) {
  const reduce = useReducedMotion();
  const navy = b.tone === "navy";
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
      className={cn(
        "relative flex h-full flex-col items-center rounded-[34px] p-8 text-center shadow-[0_24px_60px_-34px_rgba(26,39,68,0.45)] md:p-10",
        navy ? "glass-navy text-white" : "bg-gold text-navy-deep"
      )}
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
      <div
        className={cn(
          "flex h-36 w-36 items-center justify-center overflow-hidden rounded-full md:h-40 md:w-40",
          navy
            ? "bg-white/[0.06] ring-1 ring-white/15"
            : "bg-navy-deep/10 ring-1 ring-navy-deep/20"
        )}
      >
        {b.image ? (
          <img
            src={b.image}
            alt={b.name}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <AnimatedFace variant={index} />
        )}
      </div>

      <span
        className={cn(
          "mt-7 text-[11px] font-semibold uppercase tracking-[0.22em]",
          navy ? "text-white/85" : "text-navy-deep/80"
        )}
      >
        Economics
        <span
          className={cn("mx-[0.4em] font-light", navy ? "text-gold/80" : "text-navy-deep/45")}
        >
          |
        </span>
        Business
      </span>

      <h3
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight",
          navy ? "text-white" : "text-navy-deep"
        )}
      >
        {b.name}
      </h3>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        {b.logos.map((l) => (
          <span
            key={l.src}
            className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white"
          >
            <img src={l.src} alt={l.alt} className={cn("h-9 w-9 object-contain", l.imgClass)} />
          </span>
        ))}
      </div>

      <p
        className={cn(
          "mt-6 flex-1 text-[15px] leading-relaxed",
          navy ? "text-white/70" : "text-navy-deep/80"
        )}
      >
        {b.bio}
      </p>

      <div
        className={cn(
          "mt-8 grid w-full grid-cols-2 items-start gap-5 border-t pt-6",
          navy ? "border-white/15" : "border-navy-deep/20"
        )}
      >
        {b.stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center text-center">
            <span
              className={cn("block text-lg font-semibold", navy ? "text-gold" : "text-navy-deep")}
            >
              {s.value}
            </span>
            <span
              className={cn(
                "mt-2 block w-full text-balance text-center text-[10.5px] uppercase leading-relaxed tracking-[0.12em]",
                navy ? "text-white" : "text-navy-deep/60"
              )}
            >
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
              Meet The Cognify Tutors
            </h2>
          </div>
        </Reveal>

        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
          {BESTIES.map((b, i) => (
            <Reveal key={b.name} delay={0.15 + i * 0.18}>
              <BestieCard b={b} index={i} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
