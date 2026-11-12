"use client";

import { useRouter } from "next/navigation";
import { cohortOf, topicOf, useTeacher } from "@/lib/portal/store";
import { PageHeader } from "@/components/portal/ui";
import { WeekCalendar, type CalEvent } from "@/components/portal/calendar";

export default function TeacherCalendar() {
  const { db } = useTeacher();
  const router = useRouter();

  const events: CalEvent[] = [
    ...db.sessions.map((s) => ({
      id: `s${s.id}`,
      start: s.start,
      title: cohortOf(db, s.cohortId).name,
      sub: topicOf(s) || s.title,
      kind: "class" as const,
      onClick: () => router.push("/portal/teacher/classes/"),
    })),
    ...db.assignments.map((a) => ({
      id: `a${a.id}`,
      start: a.dueAt,
      title: a.title,
      sub: cohortOf(db, a.cohortId).name,
      kind: "due" as const,
      onClick: () => router.push("/portal/teacher/assignments/"),
    })),
  ];

  return (
    <>
      <PageHeader title="Calendar" sub="Every student's live classes and assignment deadlines, week by week." />
      <WeekCalendar events={events} />
    </>
  );
}
