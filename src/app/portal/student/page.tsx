"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import { courseOf, useStudent } from "@/lib/portal/store";
import { fmtDateLong, fmtRelative, sessionState } from "@/lib/portal/format";
import { Empty, PageHeader, Rise } from "@/components/portal/ui";
import { NextClassCard } from "@/components/portal/classroom";

const HOUR = 3_600_000;

/** Home: just today — the next class and what's due. Everything else has its own tab. */
export default function StudentHome() {
  const { db, me, cohort, now } = useStudent();

  const next = db.sessions.find(
    (s) => s.cohortId === me.cohortId && sessionState(s.start, s.durationMin, now) !== "ended"
  );
  const due = db.assignments
    .filter((a) => a.cohortId === me.cohortId && !db.submissions.some((x) => x.assignmentId === a.id && x.studentId === me.id))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        title={`${greeting}, ${me.name.split(" ")[0]}`}
        sub={`${fmtDateLong(new Date(now).toISOString())} · ${courseOf(cohort)}`}
      />

      <Rise i={0}>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-navy/45">Next class</h2>
        {next ? (
          <NextClassCard session={next} />
        ) : (
          <Empty
            icon={<CalendarDays size={20} />}
            title="No class scheduled"
            text="Your next class will appear here as soon as it's on the timetable."
          />
        )}
      </Rise>

      <Rise i={1} className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-navy/45">Due soon</h2>
          <Link href="/portal/student/assignments/" className="flex items-center gap-1 text-sm font-medium text-navy/55 hover:text-gold">
            All work <ArrowRight size={14} />
          </Link>
        </div>

        {due.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-navy/10 px-5 py-4 text-sm text-navy/60">
            <CheckCircle2 size={18} className="text-gold" />
            You&apos;re all caught up. Nothing to hand in.
          </div>
        ) : (
          <ul className="divide-y divide-navy/10 rounded-2xl border border-navy/10">
            {due.slice(0, 5).map((a) => {
              const ms = new Date(a.dueAt).getTime() - now;
              return (
                <li key={a.id}>
                  <Link
                    href={`/portal/student/assignments/?open=${a.id}`}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-navy/[0.02] focus-gold"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium tracking-tight text-navy group-hover:text-gold">
                        {a.title}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-navy/50">
                        {a.kind} · {a.maxMarks} marks
                      </span>
                    </span>
                    <span className={ms < 48 * HOUR ? "text-sm font-semibold text-navy" : "text-sm text-navy/55"}>
                      {ms < 0 ? "Overdue" : `Due ${fmtRelative(a.dueAt, now)}`}
                    </span>
                    <ArrowRight size={16} className="shrink-0 text-navy/25 transition-colors group-hover:text-gold" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Rise>
    </>
  );
}
