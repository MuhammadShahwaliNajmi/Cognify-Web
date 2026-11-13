"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { cohortOf, topicOf } from "@/lib/portal/selectors";
import { useTeacher } from "@/lib/portal/store";
import { sessionState } from "@/lib/portal/format";
import { Btn, Modal, PageHeader, Picker } from "@/components/portal/ui";
import { WeekCalendar, type CalEvent } from "@/components/portal/calendar";
import { ClassDialog, ScheduleForm } from "@/components/portal/class-tools";

export default function TeacherCalendar() {
  const { db, now } = useTeacher();
  const router = useRouter();
  const [who, setWho] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const mine = <T extends { cohortId: string }>(x: T) => who === "all" || x.cohortId === who;
  const cohorts = [...db.cohorts].sort((a, b) => a.name.localeCompare(b.name));

  const events: CalEvent[] = [
    ...db.sessions.filter(mine).map((s) => ({
      id: `s${s.id}`,
      start: s.start,
      title: cohortOf(db, s.cohortId).name,
      sub: db.requests.some((r) => r.sessionId === s.id && r.status === "pending") ? "Request pending" : topicOf(s) || s.title,
      kind: "class" as const,
      live: sessionState(s.start, s.durationMin, now) === "live",
      onClick: () => setOpenId(s.id),
    })),
    ...db.assignments.filter(mine).map((a) => ({
      id: `a${a.id}`,
      start: a.dueAt,
      title: a.title,
      sub: cohortOf(db, a.cohortId).name,
      kind: "due" as const,
      onClick: () => router.push(a.timeLimitMin ? "/portal/teacher/assessments/" : "/portal/teacher/assignments/"),
    })),
  ];

  return (
    <>
      <PageHeader
        title="Calendar"
        actions={
          <>
            <Picker
              label="Student"
              value={who}
              onChange={setWho}
              options={[{ value: "all", label: "All students" }, ...cohorts.map((c) => ({ value: c.id, label: c.name }))]}
            />
            <Btn variant="navy" onClick={() => setAdding(true)}>
              <CalendarPlus size={15} />
              Add class
            </Btn>
          </>
        }
      />
      <WeekCalendar events={events} />
      <ClassDialog session={db.sessions.find((s) => s.id === openId) ?? null} onClose={() => setOpenId(null)} />
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a class">
        <ScheduleForm cohorts={who === "all" ? cohorts : cohorts.filter((c) => c.id === who)} onDone={() => setAdding(false)} />
      </Modal>
    </>
  );
}
