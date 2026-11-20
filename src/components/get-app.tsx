"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Copy, MoreHorizontal, MoreVertical, Plus, Share, Smartphone } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/**
 * cognifypk.com/get-app — how to put the Concept Lab app on a phone's home screen.
 * Each platform has a looping animated walkthrough on a drawn phone, with the
 * written step that matches the animation highlighted beside it.
 */

type Platform = "iphone" | "android";
const STEP_MS = 2600;

const STEPS: Record<Platform, { text: string; frames: number[] }[]> = {
  iphone: [
    { text: "Open cognifypk.com/app in Safari", frames: [0] },
    { text: "Tap ⋯ next to the address bar, then Share (older iPhones: the Share button)", frames: [1, 2] },
    { text: "Tap Add to Home Screen", frames: [3] },
    { text: "Keep “Open as Web App” on and tap Add", frames: [4] },
    { text: "Open Concept Lab from your home screen", frames: [5, 6] },
  ],
  android: [
    { text: "Open cognifypk.com/app in Chrome", frames: [0] },
    { text: "Tap ⋮ in the top corner", frames: [1] },
    { text: "Tap Add to home screen (or Install app)", frames: [2] },
    { text: "Tap Install", frames: [3] },
    { text: "Open Concept Lab from your home screen", frames: [4, 5] },
  ],
};
const FRAMES: Record<Platform, number> = { iphone: 7, android: 6 };

export function GetApp() {
  const [platform, setPlatform] = useState<Platform>("iphone");
  const [frame, setFrame] = useState(0);

  // show the visitor's own phone first
  useEffect(() => {
    if (/Android/i.test(navigator.userAgent)) setPlatform("android");
  }, []);
  useEffect(() => {
    setFrame(0);
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES[platform]), STEP_MS);
    return () => clearInterval(id);
  }, [platform]);

  const steps = STEPS[platform];
  const active = steps.findIndex((s) => s.frames.includes(frame));

  return (
    <main data-portal className="min-h-[100svh] bg-white">
      <header className="border-b border-navy/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <a href="/" aria-label="Concept Lab home">
            <Wordmark />
          </a>
          <a href="/portal/" className="text-[14px] font-semibold text-navy hover:text-gold">
            Portal
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-20 pt-10 md:pt-16">
        <h1 className="text-[clamp(2rem,6vw,3.25rem)] font-bold leading-[1.05] tracking-tightest text-navy">Get the Concept Lab app</h1>
        <span className="mt-4 block h-[3px] w-14 rounded-full bg-gold" />

        <div className="mt-8 inline-flex rounded-full bg-navy/[0.05] p-1" role="tablist" aria-label="Your phone">
          {(["iphone", "android"] as const).map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={platform === p}
              onClick={() => setPlatform(p)}
              className={cn(
                "rounded-full px-6 py-2.5 text-[14px] font-semibold transition-colors focus-gold",
                platform === p ? "bg-navy-deep text-white" : "text-navy hover:text-gold"
              )}
            >
              {p === "iphone" ? "iPhone" : "Android"}
            </button>
          ))}
        </div>

        <div className="mt-10 grid items-center gap-12 md:grid-cols-[300px_1fr] md:gap-16">
          <div className="mx-auto">
            <Phone platform={platform} frame={frame} />
            {/* phones: the matching step under the walkthrough */}
            <p className="mx-auto mt-5 flex min-h-[48px] max-w-[276px] items-start gap-3 md:hidden" aria-live="polite">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold text-[13px] font-bold text-navy-deep">{active + 1}</span>
              <span className="pt-0.5 text-[15px] font-semibold leading-snug text-navy">{steps[active]?.text}</span>
            </p>
          </div>

          <div>
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={s.text}>
                  <button
                    type="button"
                    onClick={() => setFrame(s.frames[0])}
                    className={cn(
                      "flex w-full items-start gap-4 rounded-2xl border px-5 py-4 text-left transition-colors",
                      i === active ? "border-gold bg-gold/10" : "border-navy/10 bg-white hover:border-gold/60"
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold",
                        i === active ? "bg-gold text-navy-deep" : i < active ? "bg-navy-deep text-white" : "bg-navy/[0.06] text-navy"
                      )}
                    >
                      {i < active ? <Check size={15} /> : i + 1}
                    </span>
                    <span className="pt-1 text-[16px] font-semibold leading-snug text-navy">{s.text}</span>
                  </button>
                </li>
              ))}
            </ol>

            <a
              href="/app/"
              className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-navy-deep px-7 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-gold hover:text-navy-deep focus-gold"
            >
              <Smartphone size={18} />
              Open cognifypk.com/app
              <ArrowRight size={17} />
            </a>
            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-navy">
              On a computer? Open <span className="font-semibold">cognifypk.com/app</span> on your phone instead. Sign in with the Google account
              your teacher added, then turn on notifications inside the app.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------------- the drawn phone ---------------- */

function Phone({ platform, frame }: { platform: Platform; frame: number }) {
  return (
    <div className="relative h-[560px] w-[276px] rounded-[46px] bg-navy-deep p-[10px] shadow-[0_30px_60px_-20px_rgba(14,26,51,0.45)]">
      <div className="relative h-full w-full overflow-hidden rounded-[36px] bg-white">
        {platform === "iphone" ? <IPhone frame={frame} /> : <Android frame={frame} />}
      </div>
      {platform === "iphone" && <span className="absolute left-1/2 top-[18px] h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-navy-deep" />}
    </div>
  );
}

/** A finger tap, drawn as a gold ring that pulses where the person should press. */
function Tap({ className }: { className: string }) {
  return (
    <motion.span
      className={cn("pointer-events-none absolute z-30 h-11 w-11 rounded-full border-[3px] border-gold bg-gold/25", className)}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: [0.4, 1, 0.85, 1], opacity: [0, 1, 1, 1] }}
      transition={{ duration: 0.9, delay: 0.7 }}
    />
  );
}

/** The Concept Lab sign-in screen, small. */
function AppScreen({ full }: { full?: boolean }) {
  return (
    <div className={cn("flex h-full flex-col bg-navy-deep px-4", full ? "pt-16" : "pt-12")}>
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <LogoMark onDark className="h-10 w-10" />
        <span className="text-[13px] font-extrabold tracking-tight text-white">
          CONCEPT <span className="text-gold">LAB</span>
        </span>
      </div>
      <div className={cn("mb-4 rounded-2xl bg-white p-4", full ? "mb-8" : "mb-24")}>
        <span className="block text-[15px] font-bold text-navy">Sign in</span>
        <span className="mt-1.5 block h-[2px] w-6 rounded-full bg-gold" />
        <span className="mt-3 block rounded-lg border border-navy/15 py-2 text-center text-[11px] font-semibold text-navy">Continue with Google</span>
      </div>
    </div>
  );
}

function HomeScreen({ tapped }: { tapped: boolean }) {
  return (
    <div className="h-full bg-gradient-to-b from-navy to-navy-deep px-5 pt-16">
      <div className="grid grid-cols-4 gap-x-4 gap-y-5">
        {Array.from({ length: 11 }).map((_, i) => (
          <span key={i} className="aspect-square rounded-[14px] bg-white/[0.12]" />
        ))}
        <motion.span
          className="relative flex flex-col items-center gap-1"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.25 }}
        >
          <span className="grid aspect-square w-full place-items-center rounded-[14px] bg-navy-deep ring-2 ring-gold">
            <LogoMark onDark className="h-7 w-7" />
          </span>
          <span className="whitespace-nowrap text-[8px] font-semibold text-white">Concept Lab</span>
          {tapped && <Tap className="-top-1 left-1/2 -translate-x-1/2" />}
        </motion.span>
      </div>
    </div>
  );
}

const screen = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.35 } };

function IPhone({ frame }: { frame: number }) {
  const inSafari = frame <= 4;
  return (
    <AnimatePresence mode="wait">
      {inSafari ? (
        <motion.div key="safari" {...screen} className="relative h-full">
          <AppScreen />
          {/* Safari's bottom bar */}
          <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 bg-white px-3 pb-6 pt-2.5">
            <span className="flex-1 rounded-full bg-navy/[0.07] py-2 text-center text-[11px] font-semibold text-navy">cognifypk.com</span>
            <span className="relative grid h-8 w-8 place-items-center rounded-full bg-navy/[0.07]">
              <MoreHorizontal size={16} className="text-navy" />
              {frame === 0 && <Tap className="-left-1.5 -top-1.5" />}
            </span>
          </div>

          {/* ⋯ menu */}
          <AnimatePresence>
            {frame === 1 && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-[70px] right-3 z-20 w-40 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-navy/10"
              >
                {["Bookmarks", "New Tab"].map((t) => (
                  <span key={t} className="block border-b border-navy/10 px-3.5 py-2.5 text-[11px] font-medium text-navy">
                    {t}
                  </span>
                ))}
                <span className="relative flex items-center justify-between bg-gold/15 px-3.5 py-2.5 text-[11px] font-bold text-navy">
                  Share <Share size={13} />
                  <Tap className="right-2 top-0" />
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* share sheet */}
          <AnimatePresence>
            {(frame === 2 || frame === 3) && (
              <motion.div
                key="sheet"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-white px-3 pb-6 pt-3 shadow-[0_-10px_30px_rgba(14,26,51,0.2)]"
              >
                <span className="mx-auto block h-1 w-9 rounded-full bg-navy/20" />
                <div className="mt-3 flex gap-3 px-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className="h-10 w-10 rounded-full bg-navy/[0.08]" />
                  ))}
                </div>
                <div className="mt-3 overflow-hidden rounded-xl bg-navy/[0.05]">
                  <span className="flex items-center justify-between border-b border-navy/10 px-3 py-2.5 text-[11px] font-medium text-navy">
                    Copy <Copy size={13} />
                  </span>
                  <span
                    className={cn(
                      "relative flex items-center justify-between px-3 py-2.5 text-[11px] text-navy",
                      frame === 3 ? "bg-gold/20 font-bold" : "font-medium"
                    )}
                  >
                    Add to Home Screen <Plus size={14} />
                    {frame === 3 && <Tap className="right-2 top-0" />}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add to Home Screen */}
          <AnimatePresence>
            {frame === 4 && (
              <motion.div
                key="add"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className="absolute inset-0 z-20 bg-white px-4 pt-14"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-navy">Cancel</span>
                  <span className="font-bold text-navy">Add to Home Screen</span>
                  <span className="relative font-bold text-navy">
                    Add
                    <Tap className="-right-3 -top-3.5" />
                  </span>
                </div>
                <div className="mt-6 flex items-center gap-3 rounded-xl bg-navy/[0.05] p-3">
                  <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-navy-deep">
                    <LogoMark onDark className="h-7 w-7" />
                  </span>
                  <div>
                    <span className="block text-[12px] font-bold text-navy">Concept Lab</span>
                    <span className="block text-[10px] text-navy">cognifypk.com</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-navy/[0.05] px-3 py-3 text-[11px] font-semibold text-navy">
                  Open as Web App
                  <span className="flex h-5 w-9 items-center justify-end rounded-full bg-gold p-0.5">
                    <span className="h-4 w-4 rounded-full bg-white" />
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : frame === 5 ? (
        <motion.div key="home" {...screen} className="h-full">
          <HomeScreen tapped />
        </motion.div>
      ) : (
        <motion.div key="app" initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} className="h-full">
          <AppScreen full />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Android({ frame }: { frame: number }) {
  const inChrome = frame <= 3;
  return (
    <AnimatePresence mode="wait">
      {inChrome ? (
        <motion.div key="chrome" {...screen} className="relative h-full">
          {/* Chrome's top bar */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-white px-3 pb-2.5 pt-8">
            <span className="flex-1 rounded-full bg-navy/[0.07] px-3 py-2 text-[11px] font-semibold text-navy">cognifypk.com/app</span>
            <span className="relative grid h-8 w-6 place-items-center">
              <MoreVertical size={17} className="text-navy" />
              {frame === 0 && <Tap className="-left-2.5 -top-1.5" />}
            </span>
          </div>
          <div className="h-full pt-[52px]">
            <AppScreen />
          </div>

          {/* ⋮ menu */}
          <AnimatePresence>
            {(frame === 1 || frame === 2) && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, scale: 0.9, originX: 1, originY: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute right-2 top-9 z-20 w-44 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-navy/10"
              >
                {["New tab", "Bookmarks", "Share…"].map((t) => (
                  <span key={t} className="block px-4 py-2.5 text-[11px] font-medium text-navy">
                    {t}
                  </span>
                ))}
                <span className={cn("relative block px-4 py-2.5 text-[11px] text-navy", frame === 2 ? "bg-gold/20 font-bold" : "font-medium")}>
                  Add to home screen
                  {frame === 2 && <Tap className="right-3 top-0" />}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* install dialog */}
          <AnimatePresence>
            {frame === 3 && (
              <motion.div key="dialog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 grid place-items-center bg-navy-deep/50 px-5">
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full rounded-3xl bg-white p-5">
                  <span className="block text-[14px] font-bold text-navy">Install app</span>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-navy-deep">
                      <LogoMark onDark className="h-6 w-6" />
                    </span>
                    <div>
                      <span className="block text-[12px] font-bold text-navy">Concept Lab</span>
                      <span className="block text-[10px] text-navy">cognifypk.com</span>
                    </div>
                  </div>
                  <div className="mt-5 flex justify-end gap-5 text-[12px] font-bold">
                    <span className="text-navy">Cancel</span>
                    <span className="relative text-navy">
                      Install
                      <Tap className="-right-3 -top-3" />
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : frame === 4 ? (
        <motion.div key="home" {...screen} className="h-full">
          <HomeScreen tapped />
        </motion.div>
      ) : (
        <motion.div key="app" initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} className="h-full">
          <AppScreen full />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
