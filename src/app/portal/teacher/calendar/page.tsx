"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { classLabel, cohortOf, topicOf } from "@/lib/portal/selectors";
import { projectSeries, ruleOf } from "@/lib/portal/series";
import { useTeacher } from "@/lib/portal/store";
import { dateInput, sessionState, timeInput } from "@/lib/portal/format";
import type { Session } from "@/lib/portal/types";
import { Btn, Modal, PageHeader, Picker } from "@/components/portal/ui";
import { CalendarSync } from "@/components/portal/calendar-sync";
import { WeekCalendar, type CalEvent } from "@/components/portal/calendar";
import { ClassDialog, MoveSeriesDialog, ScheduleForm, type NewClassAt } from "@/components/portal/class-tools";

export default function TeacherCalendar() {
  const { db, now, rescheduleSession, toast } = useTeacher();
  const router = useRouter();
  const [who, setWho] = useState("all");
  const [open, setOpen] = useState<Session | null>(null);
  const [adding, setAdding] = useState<NewClassAt | null>(null);
  const [move, setMove] = useState<{ session: Session; start: string; durationMin: number } | null>(null);

  const mine = useCallback(<T extends { cohortId: string }>(x: T) => who === "all" || x.cohortId === who, [who]);
  const cohorts = [...db.cohorts].sort((a, b) => a.name.localeCompare(b.name));

  // dragging a class: a one-off moves at once; a repeating one asks which classes to move
  const moved = useCallback(
    async (s: Session, start: string, durationMin: number) => {
      if (s.virtual || ruleOf(db, s)) return setMove({ session: s, start, durationMin });
      if (await rescheduleSession(s.id, start, durationMin)) toast("Class moved");
    },
    [db, rescheduleSession, toast],
  );

  const toEvent = useCallback(
    (s: Session): CalEvent => ({
      id: `s${s.id}`,
      start: s.start,
      durationMin: s.durationMin,
      title: cohortOf(db, s.cohortId).name,
      sub: db.requests.some((r) => r.sessionId === s.id && r.status === "pending") ? "Request pending" : topicOf(s) || s.title,
      kind: "class",
      live: sessionState(s.start, s.durationMin, now) === "live",
      onClick: () => setOpen(s),
      onMove: sessionState(s.start, s.durationMin, now) === "upcoming" ? (start, d) => moved(s, start, d) : undefined,
    }),
    [db, now, moved],
  );

  const events: CalEvent[] = [
    ...db.sessions.filter(mine).map(toEvent),
    ...db.assignments.filter(mine).map((a) => ({
      id: `a${a.id}`,
      start: a.dueAt,
      title: a.title,
      sub: cohortOf(db, a.cohortId).name,
      kind: "due" as const,
      onClick: () => router.push(a.timeLimitMin ? "/portal/teacher/assessments/" : "/portal/teacher/assignments/"),
    })),
  ];
  // repeating classes run on until stopped: draw the ones beyond what's stored
  const extra = useCallback((from: Date, to: Date) => projectSeries(db, from, to).filter(mine).map(toEvent), [db, mine, toEvent]);

  const addAt = (at: Date) =>
    setAdding({ date: dateInput(at), start: timeInput(at), end: timeInput(new Date(at.getTime() + 60 * 60_000)) });
  const shown = useMemo(() => (open && !open.virtual ? (db.sessions.find((s) => s.id === open.id) ?? null) : open), [open, db.sessions]);

  return (
    <>
      <PageHeader
        title="Calendar"
        actions={
          <>
            <CalendarSync />
            <Picker
              label="Student"
              value={who}
              onChange={setWho}
              options={[{ value: "all", label: "All students" }, ...cohorts.map((c) => ({ value: c.id, label: classLabel(c) }))]}
            />
            <Btn
              variant="navy"
              onClick={() => {
                const t = new Date();
                t.setDate(t.getDate() + 1);
                t.setHours(18, 0, 0, 0);
                addAt(t);
              }}
            >
              <CalendarPlus size={15} />
              Add class
            </Btn>
          </>
        }
      />
      <WeekCalendar events={events} extra={extra} onCreateAt={addAt} />
      <ClassDialog session={shown} onClose={() => setOpen(null)} />
      <MoveSeriesDialog move={move} onClose={() => setMove(null)} />
      <Modal open={!!adding} onClose={() => setAdding(null)} title="Add a class">
        {adding && (
          <ScheduleForm
            key={`${adding.date}-${adding.start}`}
            initial={adding}
            cohorts={who === "all" ? cohorts : cohorts.filter((c) => c.id === who)}
            onDone={() => setAdding(null)}
          />
        )}
      </Modal>
    </>
  );
}
