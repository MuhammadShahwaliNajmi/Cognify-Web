"use client";

import { useRouter } from "next/navigation";
import { topicOf, useStudent } from "@/lib/portal/store";
import { PageHeader } from "@/components/portal/ui";
import { WeekCalendar, type CalEvent } from "@/components/portal/calendar";

export default function StudentCalendar() {
  const { db, me } = useStudent();
  const router = useRouter();

  const events: CalEvent[] = [
    ...db.sessions
      .filter((s) => s.cohortId === me.cohortId)
      .map((s) => ({
        id: `s${s.id}`,
        start: s.start,
        title: s.title,
        sub: topicOf(s) || `${s.durationMin} min`,
        kind: "class" as const,
        onClick: () => router.push("/portal/student/classes/"),
      })),
    ...db.assignments
      .filter((a) => a.cohortId === me.cohortId)
      .map((a) => ({
        id: `a${a.id}`,
        start: a.dueAt,
        title: a.title,
        sub: a.kind,
        kind: "due" as const,
        onClick: () => router.push(`/portal/student/assignments/?open=${a.id}`),
      })),
  ];

  return (
    <>
      <PageHeader title="Calendar" sub="Your live classes and assignment deadlines, week by week." />
      <WeekCalendar events={events} />
    </>
  );
}
