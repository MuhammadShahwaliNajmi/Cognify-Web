"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Link2, Play, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { meetLink, usePortal } from "@/lib/portal/store";
import { fmtClock, fmtDay, fmtDuration, fmtTime, isMeetUrl, sessionState } from "@/lib/portal/format";
import type { Session } from "@/lib/portal/types";
import { Btn, Chip, Field, Label, Modal, fieldCls } from "./ui";

/** Re-renders its caller every second — only mount it inside small leaf components. */
export function useTick(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function Countdown({ to, className }: { to: string; className?: string }) {
  const now = useTick();
  const ms = new Date(to).getTime() - now;
  // a ticking clock only makes sense within the day; further out, "2d 4h" reads better
  return <span className={cn("tabular-nums", className)}>{ms > 24 * 3_600_000 ? fmtDuration(ms) : fmtClock(ms)}</span>;
}

/** Live / opens-soon / upcoming / ended status pill for a class. */
export function SessionStatus({ session, onNavy }: { session: Session; onNavy?: boolean }) {
  const now = useTick();
  const state = sessionState(session.start, session.durationMin, now);
  if (state === "live") return <Chip tone="gold" dot>Live now</Chip>;
  if (state === "open") return <Chip tone="gold" dot>Room open</Chip>;
  if (state === "ended") return <Chip tone={onNavy ? "onNavy" : "soft"}>Ended</Chip>;
  const ms = new Date(session.start).getTime() - now;
  return (
    <Chip tone={onNavy ? "onNavy" : "soft"}>
      {ms < 12 * 3_600_000 ? `Starts in ${fmtDuration(ms)}` : `${fmtDay(session.start, now)} · ${fmtTime(session.start)}`}
    </Chip>
  );
}

/** Paste / create the standing Google Meet room for a cohort. */
export function MeetLinkForm({ cohortId, onSaved }: { cohortId: string; onSaved?: () => void }) {
  const { db, setCohortMeet, toast } = usePortal();
  const current = db.cohorts.find((c) => c.id === cohortId)?.meetUrl ?? "";
  const [url, setUrl] = useState(current);
  const valid = isMeetUrl(url);

  return (
    <div>
      <Field
        label="Google Meet link"
        hint="Use one standing room per cohort: the same link works for every class, so students never hunt for it."
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://meet.google.com/abc-defg-hij"
          inputMode="url"
          className={fieldCls}
        />
      </Field>
      {url && !valid && (
        <p className="mt-2 text-xs font-medium text-navy">
          That doesn&apos;t look like a Meet link. It should read https://meet.google.com/abc-defg-hij
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <Btn
          variant="gold"
          disabled={!valid}
          onClick={async () => {
            if (!(await setCohortMeet(cohortId, url))) return;
            toast("Meet link saved for this cohort");
            onSaved?.();
          }}
        >
          <Link2 size={15} />
          Save link
        </Btn>
        <Btn variant="outline" href="https://meet.google.com/new" external>
          <ExternalLink size={14} />
          Create a new Meet room
        </Btn>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-navy/50">
        &ldquo;Create a new Meet room&rdquo; opens Google Meet in a new tab. Copy the link it gives you and paste it here.
      </p>
    </div>
  );
}

/**
 * The class button.
 *  - student: joinable from 10 minutes before the start; joining records attendance.
 *  - teacher: can open the room at any time.
 */
export function JoinButton({
  session,
  size = "md",
  surface = "navy",
  className,
}: {
  session: Session;
  size?: "sm" | "md" | "lg";
  /** what the button sits on — picks a readable style for the "not open yet" state */
  surface?: "navy" | "white";
  className?: string;
}) {
  const { db, auth, markJoined, toast } = usePortal();
  const now = useTick();
  const [missing, setMissing] = useState(false);
  const state = sessionState(session.start, session.durationMin, now);
  const link = meetLink(db, session);
  const teacher = auth?.role === "teacher";

  if (state === "ended") return null;

  const open = () => {
    if (!link) return setMissing(true);
    // open Meet straight away (inside the click, so pop-up blockers allow it)
    window.open(link, "_blank", "noopener,noreferrer");
    if (!teacher && auth) {
      markJoined(session.id, auth.userId).then((ok) => ok && toast("You're marked present. Enjoy the class!"));
    }
  };

  const joinable = teacher || state !== "upcoming";
  return (
    <>
      <Btn
        variant={joinable ? "gold" : surface === "white" ? "outline" : "onNavy"}
        size={size}
        disabled={!joinable}
        onClick={open}
        className={cn(!joinable && "!opacity-70", className)}
      >
        <Video size={size === "lg" ? 18 : 15} />
        {teacher ? "Start class" : joinable ? "Join class" : `Opens in ${fmtDuration(new Date(session.start).getTime() - 600_000 - now)}`}
      </Btn>

      <Modal open={missing} onClose={() => setMissing(false)} eyebrow="Google Meet" title={teacher ? "Add this cohort's Meet link" : "No Meet link yet"}>
        {teacher ? (
          <MeetLinkForm cohortId={session.cohortId} onSaved={() => setMissing(false)} />
        ) : (
          <div>
            <p className="text-[15px] leading-relaxed text-navy/70">
              Your teacher hasn&apos;t added the Google Meet link for this class yet. As soon as they do, this button
              takes you straight into the classroom and marks you present.
            </p>
            <div className="mt-5">
              <Btn variant="navy" onClick={() => setMissing(false)}>
                Got it
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/** The navy "next class" hero used on both dashboards. */
export function NextClassCard({ session, cohortLabel }: { session: Session; cohortLabel?: string }) {
  const now = useTick();
  const state = sessionState(session.start, session.durationMin, now);
  const start = new Date(session.start).getTime();
  const end = start + session.durationMin * 60_000;

  return (
    <div className="glass-navy-solid relative flex h-full flex-col overflow-hidden rounded-[26px] p-6 text-white md:p-8">
      {/* faint supply & demand lines — the brand's graph motif */}
      <svg viewBox="0 0 300 200" className="pointer-events-none absolute -right-6 -top-4 h-[130%] w-[62%] opacity-[0.09]" aria-hidden="true">
        <path d="M30 170 L270 30" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M30 30 L270 170" stroke="#D4B254" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="150" cy="100" r="9" fill="#D4B254" />
      </svg>

      <div className="relative flex flex-wrap items-center gap-2.5">
        <Label className="text-white/50">{state === "live" ? "Happening now" : "Next live class"}</Label>
        <SessionStatus session={session} onNavy />
      </div>

      <h2 className="relative mt-4 max-w-xl text-[clamp(1.35rem,2.6vw,1.9rem)] font-semibold leading-[1.15] tracking-tight">
        {session.title}
      </h2>
      <p className="relative mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-white/60">
        {[cohortLabel, session.strand, session.unit].filter(Boolean).map((part, i) => (
          <span key={i} className="contents">
            <span className={i === 0 && cohortLabel ? "text-white/80" : undefined}>{part}</span>
            <span className="text-gold/70">|</span>
          </span>
        ))}
        <span>
          {fmtDay(session.start, now)} {fmtTime(session.start)} – {fmtTime(new Date(end).toISOString())}
        </span>
      </p>

      <div className="relative mt-auto flex flex-wrap items-end justify-between gap-5 pt-8">
        <JoinButton session={session} size="lg" />
        <div className="text-right">
          <Label className="text-white/40">{state === "live" ? "Ends in" : "Starts in"}</Label>
          <p className="mt-1 font-mono text-[2rem] font-medium leading-none text-gold">
            <Countdown to={new Date(state === "live" ? end : start).toISOString()} />
          </p>
        </div>
      </div>
    </div>
  );
}

/** Compact date tile: "WED / 11". */
export function DateTile({ iso, active }: { iso: string; active?: boolean }) {
  const d = new Date(iso);
  return (
    <span
      className={cn(
        "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl leading-none",
        active ? "bg-gold text-navy-deep" : "bg-navy/[0.05] text-navy"
      )}
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-70">
        {d.toLocaleDateString([], { weekday: "short" })}
      </span>
      <span className="mt-1 text-[17px] font-semibold tabular-nums">{d.getDate()}</span>
    </span>
  );
}

export function WatchButton({ onClick }: { onClick: () => void }) {
  return (
    <Btn variant="outline" size="sm" onClick={onClick}>
      <Play size={13} className="fill-current" />
      Recording
    </Btn>
  );
}
