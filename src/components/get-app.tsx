"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BatteryFull,
  BookOpen,
  Bookmark,
  Check,
  ChevronLeft,
  Copy,
  Download,
  History,
  Lock,
  MoreHorizontal,
  MoreVertical,
  Plus,
  RotateCw,
  Search,
  Share,
  Signal,
  Smartphone,
  SquarePlus,
  Star,
  Wifi,
  X,
} from "lucide-react";
import { LogoMark, Wordmark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/**
 * cognifypk.com/get-app — how to put the Concept Lab app on a phone's home screen.
 * Each platform has a looping, phone-accurate walkthrough (a fingertip moves to
 * each button and presses it), with the matching written step highlighted beside it.
 */

type Platform = "iphone" | "android";

/** How long each frame of the walkthrough stays on screen (ms). */
const DURATIONS: Record<Platform, number[]> = {
  iphone: [1700, 1500, 1900, 1200, 2100, 2300, 1600, 1200, 2200],
  android: [1700, 1500, 2100, 2200, 1600, 1200, 2200],
};

const STEPS: Record<Platform, { text: string; frames: number[] }[]> = {
  iphone: [
    { text: "Open cognifypk.com/app in Safari", frames: [0] },
    { text: "Tap ⋯ next to the address bar, then Share (older iPhones: the Share button)", frames: [1, 2] },
    { text: "Scroll down and tap Add to Home Screen", frames: [3, 4] },
    { text: "Keep “Open as Web App” on and tap Add", frames: [5] },
    { text: "Open Concept Lab from your home screen", frames: [6, 7, 8] },
  ],
  android: [
    { text: "Open cognifypk.com/app in Chrome", frames: [0] },
    { text: "Tap ⋮ in the top corner", frames: [1] },
    { text: "Tap Add to home screen (or Install app)", frames: [2] },
    { text: "Tap Install", frames: [3] },
    { text: "Open Concept Lab from your home screen", frames: [4, 5, 6] },
  ],
};

export function GetApp() {
  const [platform, setPlatform] = useState<Platform>("iphone");
  const [frame, setFrame] = useState(0);

  // show the visitor's own phone first
  useEffect(() => {
    if (/Android/i.test(navigator.userAgent)) setPlatform("android");
  }, []);
  // play the frames, each for its own time, on a loop
  useEffect(() => {
    const t = setTimeout(() => setFrame((f) => (f + 1) % DURATIONS[platform].length), DURATIONS[platform][frame] ?? 1500);
    return () => clearTimeout(t);
  }, [platform, frame]);

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
              onClick={() => {
                setPlatform(p);
                setFrame(0);
              }}
              className={cn(
                "rounded-full px-6 py-2.5 text-[14px] font-semibold transition-colors focus-gold",
                platform === p ? "bg-navy-deep text-white" : "text-navy hover:text-gold",
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
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold text-[13px] font-bold text-navy-deep">
                {active + 1}
              </span>
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
                      i === active ? "border-gold bg-gold/10" : "border-navy/10 bg-white hover:border-gold/60",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold",
                        i === active ? "bg-gold text-navy-deep" : i < active ? "bg-navy-deep text-white" : "bg-navy/[0.06] text-navy",
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
              On a computer? Open <span className="font-semibold">cognifypk.com/app</span> on your phone instead. Sign in with the Google
              account your teacher added, then turn on notifications inside the app.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------------- the drawn phones ---------------- */
// The screen is 256 × 540 px; positions below are in those pixels.

function Phone({ platform, frame }: { platform: Platform; frame: number }) {
  const ios = platform === "iphone";
  return (
    <div
      className={cn(
        "relative h-[560px] w-[276px] bg-navy-deep p-[10px] shadow-[0_40px_70px_-25px_rgba(14,26,51,0.55),inset_0_0_0_2px_rgba(255,255,255,0.08)]",
        ios ? "rounded-[50px]" : "rounded-[38px]",
      )}
    >
      {/* side buttons */}
      <span className="absolute -left-[3px] top-[110px] h-8 w-[3px] rounded-l bg-navy-deep" />
      <span className="absolute -left-[3px] top-[150px] h-12 w-[3px] rounded-l bg-navy-deep" />
      <span className="absolute -right-[3px] top-[140px] h-16 w-[3px] rounded-r bg-navy-deep" />
      <div className={cn("relative h-full w-full overflow-hidden bg-white", ios ? "rounded-[40px]" : "rounded-[30px]")}>
        {ios ? <IPhone frame={frame} /> : <Android frame={frame} />}
        {ios ? (
          <span className="absolute left-1/2 top-[10px] z-50 h-[24px] w-[80px] -translate-x-1/2 rounded-full bg-black" />
        ) : (
          <span className="absolute left-1/2 top-[9px] z-50 h-[12px] w-[12px] -translate-x-1/2 rounded-full bg-black" />
        )}
      </div>
    </div>
  );
}

/** A fingertip that glides to (x, y) and presses, with a gold ripple. */
function Finger({ x, y, delay = 0.2 }: { x: number; y: number; delay?: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-40"
      initial={{ x: x + 60, y: y + 120, opacity: 0 }}
      animate={{ x, y, opacity: 1 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.span
        className="absolute -left-[18px] -top-[18px] h-9 w-9 rounded-full border-2 border-white bg-navy-deep/30 shadow-[0_8px_18px_rgba(14,26,51,0.5)]"
        animate={{ scale: [1, 1, 0.76, 1] }}
        transition={{ duration: 0.45, delay: delay + 0.65, times: [0, 0.2, 0.55, 1] }}
      />
      <motion.span
        className="absolute -left-[18px] -top-[18px] h-9 w-9 rounded-full border-2 border-gold"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: [0.6, 2], opacity: [1, 0] }}
        transition={{ duration: 0.6, delay: delay + 0.85 }}
      />
    </motion.div>
  );
}

function StatusBar({ light, android }: { light?: boolean; android?: boolean }) {
  const c = light ? "text-white" : "text-navy";
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 z-30 flex items-center justify-between font-semibold",
        c,
        android ? "h-7 px-5 pt-1 text-[10px]" : "h-[46px] px-7 pt-1 text-[12px]",
      )}
    >
      <span>9:41</span>
      <span className={cn("flex items-center gap-1", android && "pr-1")}>
        <Signal size={android ? 11 : 13} strokeWidth={2.5} />
        <Wifi size={android ? 11 : 13} strokeWidth={2.5} />
        <BatteryFull size={android ? 13 : 16} strokeWidth={2} />
      </span>
    </div>
  );
}

/** The bar at the bottom of the screen (iPhone home indicator / Android gesture bar). */
function HomeBar({ light }: { light?: boolean }) {
  return (
    <span
      className={cn("absolute bottom-[7px] left-1/2 z-30 h-[4px] w-[96px] -translate-x-1/2 rounded-full", light ? "bg-white" : "bg-navy")}
    />
  );
}

/** The Concept Lab sign-in screen, as the site / app shows it. */
function AppScreen({ top = 46, bottom = 0 }: { top?: number; bottom?: number }) {
  return (
    <div className="flex h-full flex-col bg-navy-deep px-4" style={{ paddingTop: top, paddingBottom: bottom }}>
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5">
        <LogoMark onDark className="h-10 w-10" />
        <span className="text-[13px] font-extrabold tracking-tight text-white">
          CONCEPT <span className="text-gold">LAB</span>
        </span>
        <span className="text-[7px] font-bold tracking-[0.35em] text-gold">PORTAL</span>
      </div>
      <div className="mb-5 rounded-2xl bg-white p-4">
        <span className="block text-[15px] font-bold text-navy">Sign in</span>
        <span className="mt-1.5 block h-[2px] w-6 rounded-full bg-gold" />
        <span className="mt-3 block rounded-lg border border-navy/15 py-2 text-center text-[10px] font-semibold text-navy">
          Continue with Google
        </span>
      </div>
    </div>
  );
}

const APPS = ["Mail", "Notes", "Photos", "Camera", "Clock", "Maps", "Music", "Weather", "Files", "Books", "Settings"];

/** A home screen with the new Concept Lab icon popping in at the 12th place (row 3, column 4). */
function HomeScreen({ android }: { android?: boolean }) {
  return (
    <div className="relative h-full bg-[radial-gradient(120%_70%_at_80%_10%,rgba(212,178,84,0.35),transparent_55%),linear-gradient(180deg,#1a2744,#0E1A33)]">
      <StatusBar light android={android} />
      <div className="grid grid-cols-4 gap-x-[5px] gap-y-[12px] px-[18px]" style={{ paddingTop: 54 }}>
        {APPS.map((name, i) => (
          <span key={name} className="flex flex-col items-center gap-1">
            <span
              className={cn("h-[50px] w-[50px]", android ? "rounded-full" : "rounded-[13px]")}
              style={{ background: `rgba(255,255,255,${0.1 + (i % 4) * 0.035})` }}
            />
            <span className="text-[8px] font-medium text-white">{name}</span>
          </span>
        ))}
        <motion.span
          className="flex flex-col items-center gap-1"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 15, delay: 0.3 }}
        >
          <span
            className={cn(
              "grid h-[50px] w-[50px] place-items-center bg-navy-deep shadow-[0_0_0_2px_#D4B254]",
              android ? "rounded-full" : "rounded-[13px]",
            )}
          >
            <LogoMark onDark className="h-7 w-7" />
          </span>
          <span className="whitespace-nowrap text-[8px] font-semibold text-white">Concept Lab</span>
        </motion.span>
      </div>
      {android ? (
        <div className="absolute inset-x-4 bottom-8 flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-[10px] font-medium text-white">
          <Search size={12} /> Search
        </div>
      ) : (
        <div className="absolute inset-x-3 bottom-4 flex justify-around rounded-[26px] bg-white/15 px-2 py-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="h-[46px] w-[46px] rounded-[12px] bg-white/20" />
          ))}
        </div>
      )}
      <HomeBar light />
    </div>
  );
}

/** The app opening full-screen from its icon. */
function Opening({ android }: { android?: boolean }) {
  return (
    <motion.div
      key="app"
      className="relative h-full"
      style={{ transformOrigin: "210px 233px" }}
      initial={{ scale: 0.18, opacity: 0, borderRadius: 40 }}
      animate={{ scale: 1, opacity: 1, borderRadius: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <StatusBar light android={android} />
      <AppScreen top={android ? 30 : 50} bottom={android ? 14 : 18} />
      <HomeBar light />
    </motion.div>
  );
}

const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.3 } };

/* ---------- iPhone (iOS 26 Safari) ---------- */

const SHARE_ACTIONS: { label: string; icon: typeof Copy }[] = [
  { label: "Copy", icon: Copy },
  { label: "Add to Reading List", icon: BookOpen },
  { label: "Add Bookmark", icon: Bookmark },
  { label: "Add to Favourites", icon: Star },
  { label: "Find on Page", icon: Search },
  { label: "Add to Home Screen", icon: SquarePlus },
  { label: "Markup", icon: Download },
];

function IPhone({ frame }: { frame: number }) {
  const scene = frame <= 5 ? "safari" : frame <= 7 ? "home" : "app";
  return (
    <AnimatePresence mode="wait" initial={false}>
      {scene === "safari" && (
        <motion.div key="safari" {...fade} className="relative h-full">
          <StatusBar light />
          <AppScreen top={50} bottom={70} />

          {/* Safari's floating bottom bar */}
          <div className="absolute inset-x-0 bottom-0 z-10 h-[78px] bg-gradient-to-t from-navy-deep via-navy-deep/90 to-transparent" />
          <div className="absolute inset-x-3 bottom-[22px] z-20 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-lg">
              <ChevronLeft size={16} className="text-navy" />
            </span>
            <span className="flex h-9 flex-1 items-center justify-center rounded-full bg-white/90 text-[11px] font-semibold text-navy shadow-lg">
              cognifypk.com
            </span>
            <span className={cn("grid h-9 w-9 place-items-center rounded-full shadow-lg", frame === 1 ? "bg-gold" : "bg-white/90")}>
              <MoreHorizontal size={16} className="text-navy" />
            </span>
          </div>
          <HomeBar light />
          {frame === 1 && <Finger x={228} y={500} />}

          {/* the ⋯ menu */}
          <AnimatePresence>
            {frame === 2 && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ transformOrigin: "100% 100%" }}
                className="absolute bottom-[66px] right-3 z-30 w-[180px] overflow-hidden rounded-[18px] bg-white/95 shadow-2xl ring-1 ring-navy/10"
              >
                {[
                  { label: "Share", icon: Share },
                  { label: "Add to Bookmarks", icon: Bookmark },
                  { label: "Add to Favourites", icon: Star },
                  { label: "Find on Page", icon: Search },
                  { label: "New Tab", icon: Plus },
                ].map(({ label, icon: Icon }, i) => (
                  <span
                    key={label}
                    className={cn(
                      "flex h-[34px] items-center justify-between px-3.5 text-[11px] text-navy",
                      i && "border-t border-navy/10",
                      i === 0 ? "bg-gold/20 font-bold" : "font-medium",
                    )}
                  >
                    {label} <Icon size={13} />
                  </span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          {frame === 2 && <Finger x={140} y={325} delay={0.35} />}

          {/* the share sheet: scrolls down to Add to Home Screen */}
          <AnimatePresence>
            {(frame === 3 || frame === 4) && (
              <motion.div
                key="sheet"
                initial={{ y: 380 }}
                animate={{ y: 0 }}
                exit={{ y: 380 }}
                transition={{ type: "spring", stiffness: 240, damping: 30 }}
                className="absolute inset-x-0 bottom-0 top-[173px] z-30 overflow-hidden rounded-t-[26px] bg-white shadow-[0_-12px_40px_rgba(14,26,51,0.35)]"
              >
                <div className="relative z-10 bg-white">
                  <span className="mx-auto block h-1 w-9 rounded-full bg-navy/20 pt-0 [margin-top:8px]" />
                  <div className="flex items-center gap-2.5 px-4 pb-2 pt-2">
                    <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-navy-deep">
                      <LogoMark onDark className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[11px] font-bold text-navy">Concept Lab</span>
                      <span className="block text-[9px] text-navy">cognifypk.com</span>
                    </span>
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-navy/10">
                      <X size={11} className="text-navy" />
                    </span>
                  </div>
                </div>
                {/* everything under the header scrolls together, like the real sheet */}
                <motion.div animate={{ y: frame === 4 ? -96 : 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
                  <div className="flex justify-between border-y border-navy/10 px-4 py-2.5">
                    {["Messages", "Mail", "Notes", "More"].map((n) => (
                      <span key={n} className="flex flex-col items-center gap-1">
                        <span className="h-10 w-10 rounded-full bg-navy/10" />
                        <span className="text-[8px] text-navy">{n}</span>
                      </span>
                    ))}
                  </div>
                  <div className="px-3 pt-2">
                    <div className="overflow-hidden rounded-xl bg-navy/[0.05]">
                      {SHARE_ACTIONS.map(({ label, icon: Icon }, i) => {
                        const hit = frame === 4 && label === "Add to Home Screen";
                        return (
                          <span
                            key={label}
                            className={cn(
                              "flex h-9 items-center justify-between px-3 text-[11px] text-navy transition-colors duration-300",
                              i && "border-t border-navy/10",
                              hit ? "bg-gold/25 font-bold" : "font-medium",
                            )}
                          >
                            {label} <Icon size={14} />
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {frame === 4 && <Finger x={128} y={417} delay={0.75} />}

          {/* Add to Home Screen */}
          <AnimatePresence>
            {frame === 5 && (
              <motion.div
                key="add"
                initial={{ y: 520 }}
                animate={{ y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 30 }}
                className="absolute inset-x-0 bottom-0 top-[44px] z-30 rounded-t-[24px] bg-[#F4F5F8] px-4 pt-4 shadow-[0_-12px_40px_rgba(14,26,51,0.35)]"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-navy">Cancel</span>
                  <span className="font-bold text-navy">Add to Home Screen</span>
                  <span className="rounded-full bg-navy-deep px-2.5 py-1 font-bold text-white">Add</span>
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white p-3">
                  <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[13px] bg-navy-deep">
                    <LogoMark onDark className="h-7 w-7" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block border-b border-navy/10 pb-1.5 text-[12px] font-semibold text-navy">Concept Lab</span>
                    <span className="mt-1.5 block truncate text-[9px] text-navy">https://cognifypk.com/app/</span>
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-3.5 py-3 text-[11px] font-semibold text-navy">
                  Open as Web App
                  <span className="flex h-[18px] w-8 items-center justify-end rounded-full bg-gold p-[2px]">
                    <span className="h-[14px] w-[14px] rounded-full bg-white shadow" />
                  </span>
                </div>
                <p className="mt-2 px-1 text-[9px] leading-snug text-navy">
                  An icon will be added to your Home Screen so you can quickly access this website.
                </p>
                <HomeBar />
              </motion.div>
            )}
          </AnimatePresence>
          {frame === 5 && <Finger x={226} y={63} delay={0.7} />}
        </motion.div>
      )}
      {scene === "home" && (
        <motion.div key="home" {...fade} className="relative h-full">
          <HomeScreen />
          {frame === 7 && <Finger x={210} y={233} />}
        </motion.div>
      )}
      {scene === "app" && <Opening />}
    </AnimatePresence>
  );
}

/* ---------- Android (Chrome) ---------- */

const CHROME_MENU = [
  "New tab",
  "New Incognito tab",
  "History",
  "Downloads",
  "Bookmarks",
  "Recent tabs",
  "Share…",
  "Find in page",
  "Add to home screen",
  "Desktop site",
  "Settings",
];

function Android({ frame }: { frame: number }) {
  const scene = frame <= 3 ? "chrome" : frame <= 5 ? "home" : "app";
  return (
    <AnimatePresence mode="wait" initial={false}>
      {scene === "chrome" && (
        <motion.div key="chrome" {...fade} className="relative h-full">
          <StatusBar android />
          {/* Chrome's toolbar */}
          <div className="absolute inset-x-0 top-7 z-20 flex h-11 items-center gap-2 border-b border-navy/10 bg-white px-2.5">
            <span className="flex h-8 flex-1 items-center gap-1.5 rounded-full bg-navy/[0.07] px-3 text-[10.5px] font-medium text-navy">
              <Lock size={10} /> cognifypk.com/app
            </span>
            <span className="grid h-5 w-5 place-items-center rounded-[5px] border-[1.5px] border-navy text-[8px] font-bold text-navy">
              1
            </span>
            <span className={cn("grid h-8 w-6 place-items-center rounded-full", frame === 1 && "bg-gold/30")}>
              <MoreVertical size={16} className="text-navy" />
            </span>
          </div>
          <div className="h-full pt-[72px]">
            <AppScreen top={0} bottom={14} />
          </div>
          <HomeBar light />
          {frame === 1 && <Finger x={240} y={49} />}

          {/* Chrome's ⋮ menu */}
          <AnimatePresence>
            {frame === 2 && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ transformOrigin: "100% 0%" }}
                className="absolute right-1.5 top-[30px] z-30 w-[188px] overflow-hidden rounded-xl bg-white py-1 shadow-2xl ring-1 ring-navy/10"
              >
                <div className="flex h-10 items-center justify-around border-b border-navy/10 text-navy">
                  <ArrowRight size={14} />
                  <Star size={14} />
                  <Download size={14} />
                  <History size={14} />
                  <RotateCw size={14} />
                </div>
                {CHROME_MENU.map((item) => (
                  <span
                    key={item}
                    className={cn(
                      "block h-[30px] px-4 text-[10.5px] leading-[30px] text-navy",
                      item === "Add to home screen" ? "bg-gold/25 font-bold" : "font-medium",
                    )}
                  >
                    {item}
                  </span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          {frame === 2 && <Finger x={150} y={323} delay={0.45} />}

          {/* install dialog */}
          <AnimatePresence>
            {frame === 3 && (
              <motion.div
                key="dialog"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-navy-deep/55"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-x-5 top-[170px] rounded-[26px] bg-[#F4F5F8] p-5"
                >
                  <span className="block text-[15px] font-semibold text-navy">Install app</span>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-navy-deep">
                      <LogoMark onDark className="h-6 w-6" />
                    </span>
                    <span>
                      <span className="block text-[12px] font-semibold text-navy">Concept Lab</span>
                      <span className="block text-[9.5px] text-navy">cognifypk.com</span>
                    </span>
                  </div>
                  <div className="mt-6 flex justify-end gap-6 text-[11.5px] font-semibold text-navy">
                    <span>Cancel</span>
                    <span className="rounded-full bg-navy-deep px-3 py-1 text-white">Install</span>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {frame === 3 && <Finger x={205} y={318} delay={0.6} />}
        </motion.div>
      )}
      {scene === "home" && (
        <motion.div key="home" {...fade} className="relative h-full">
          <HomeScreen android />
          {frame === 5 && <Finger x={210} y={233} />}
        </motion.div>
      )}
      {scene === "app" && <Opening android />}
    </AnimatePresence>
  );
}
