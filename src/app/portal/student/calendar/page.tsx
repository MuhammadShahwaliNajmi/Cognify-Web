"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { topicOf, useStudent } from "@/lib/portal/store";
import { sessionState } from "@/lib/portal/format";
import { PageHeader } from "@/components/portal/ui";
import { NextClassCard } from "@/components/portal/classroom";
import { WeekCalendar, type CalEvent } from "@/components/portal/calendar";
import { ClassDialog } from "@/components/portal/class-tools";

export default function StudentCalendar() {
  const { db, me, now } = useStudent();
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  const sessions = db.sessions.filter((s) => s.cohortId === me.cohortId);
  const next = sessions.find((s) => sessionState(s.start, s.durationMin, now) !== "ended");

  const events: CalEvent[] = [
    ...sessions.map((s) => ({
      id: `s${s.id}`,
      start: s.start,
      title: s.title,
      sub: topicOf(s) || `${s.durationMin} min`,
      kind: "class" as const,
      live: sessionState(s.start, s.durationMin, now) === "live",
      onClick: () => setOpenId(s.id),
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
      <PageHeader title="Calendar" />
      {next && (
        <div className="mb-8">
          <NextClassCard session={next} />
        </div>
      )}
      <WeekCalendar events={events} />
      <ClassDialog session={sessions.find((s) => s.id === openId) ?? null} onClose={() => setOpenId(null)} />
    </>
  );
}
