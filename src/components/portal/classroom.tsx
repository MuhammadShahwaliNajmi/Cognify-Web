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

/** The next (or live) class: one clean card with the time and the Join button. */
export function NextClassCard({ session, cohortLabel }: { session: Session; cohortLabel?: string }) {
  const now = useTick();
  const state = sessionState(session.start, session.durationMin, now);
  const start = new Date(session.start).getTime();
  const end = start + session.durationMin * 60_000;
  const live = state === "live";
  const topic = [session.strand, session.unit].filter(Boolean).join(" · ");

  return (
    <div className={cn("rounded-2xl border p-5 md:p-6", live ? "border-gold bg-gold/[0.06]" : "border-navy/10 bg-white")}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-medium text-navy/55">
            {live && <span className="h-2 w-2 animate-pulse-node rounded-full bg-gold" />}
            {live ? "Live now" : fmtDay(session.start, now)} · {fmtTime(session.start)} – {fmtTime(new Date(end).toISOString())}
          </p>
          <h2 className="mt-1.5 truncate text-xl font-semibold tracking-tight text-navy">
            {cohortLabel ? `${cohortLabel}` : session.title}
          </h2>
          <p className="mt-1 text-sm text-navy/55">
            {cohortLabel ? session.title : null}
            {cohortLabel && topic ? " · " : null}
            {topic}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {live && (
            <span className="text-sm tabular-nums text-navy/55">
              Ends in <Countdown to={new Date(end).toISOString()} className="font-semibold text-navy" />
            </span>
          )}
          <JoinButton session={session} surface="white" />
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
