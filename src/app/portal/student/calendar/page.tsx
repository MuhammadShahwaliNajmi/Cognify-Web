"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { topicOf, workHref } from "@/lib/portal/selectors";
import { projectSeries } from "@/lib/portal/series";
import { useStudent } from "@/lib/portal/store";
import { sessionState } from "@/lib/portal/format";
import type { Session } from "@/lib/portal/types";
import { PageHeader } from "@/components/portal/ui";
import { CalendarSync } from "@/components/portal/calendar-sync";
import { NextClassCard } from "@/components/portal/classroom";
import { WeekCalendar, type CalEvent } from "@/components/portal/calendar";
import { ClassDialog } from "@/components/portal/class-tools";

export default function StudentCalendar() {
  const { db, me, now } = useStudent();
  const router = useRouter();
  const [open, setOpen] = useState<Session | null>(null);

  const sessions = db.sessions.filter((s) => s.cohortId === me.cohortId);
  const next = sessions.find((s) => sessionState(s.start, s.durationMin, now) !== "ended");

  const toEvent = useCallback(
    (s: Session): CalEvent => ({
      id: `s${s.id}`,
      start: s.start,
      durationMin: s.durationMin,
      title: s.title,
      sub: db.requests.some((r) => r.sessionId === s.id && r.status === "pending") ? "Change requested" : topicOf(s) || `${s.durationMin} min`,
      kind: "class",
      live: sessionState(s.start, s.durationMin, now) === "live",
      onClick: () => setOpen(s),
    }),
    [db.requests, now]
  );

  const events: CalEvent[] = [
    ...sessions.map(toEvent),
    ...db.assignments
      .filter((a) => a.cohortId === me.cohortId)
      .map((a) => ({
        id: `a${a.id}`,
        start: a.dueAt,
        title: a.title,
        sub: a.kind,
        kind: "due" as const,
        onClick: () => router.push(workHref(a)),
      })),
  ];
  // repeating classes run on until stopped: draw the ones beyond what's stored
  const extra = useCallback(
    (from: Date, to: Date) => projectSeries(db, from, to).filter((s) => s.cohortId === me.cohortId).map(toEvent),
    [db, me.cohortId, toEvent]
  );
  const shown = useMemo(() => (open && !open.virtual ? sessions.find((s) => s.id === open.id) ?? null : open), [open, sessions]);

  return (
    <>
      <PageHeader title="Calendar" actions={<CalendarSync />} />
      {next && (
        <div className="mb-8">
          <NextClassCard session={next} />
        </div>
      )}
      <WeekCalendar events={events} extra={extra} />
      <ClassDialog session={shown} onClose={() => setOpen(null)} />
    </>
  );
}
