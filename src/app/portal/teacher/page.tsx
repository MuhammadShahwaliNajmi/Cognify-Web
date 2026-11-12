"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import { cohortOf, topicOf, useTeacher } from "@/lib/portal/store";
import { fmtDateLong, fmtDay, fmtDuration, fmtTime, sessionState } from "@/lib/portal/format";
import { Avatar, Empty, PageHeader, Rise } from "@/components/portal/ui";
import { JoinButton, SessionStatus } from "@/components/portal/classroom";

const HOUR = 3_600_000;
const dayKey = (iso: string) => new Date(iso).toDateString();

/** Today: the classes you're teaching and the work waiting for you. Nothing else. */
export default function TeacherToday() {
  const { db, me, now } = useTeacher();

  const upcoming = db.sessions.filter((s) => sessionState(s.start, s.durationMin, now) !== "ended");
  const today = upcoming.filter((s) => dayKey(s.start) === new Date(now).toDateString());
  // nothing left today → show the next teaching day instead
  const nextDay = upcoming.find((s) => dayKey(s.start) !== new Date(now).toDateString());
  const showing = today.length ? today : nextDay ? upcoming.filter((s) => dayKey(s.start) === dayKey(nextDay.start)) : [];

  const queue = db.submissions
    .filter((x) => x.status === "submitted")
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

  return (
    <>
      <PageHeader title={`Hello, ${me.name.split(" ").find((w) => !w.endsWith(".")) ?? me.name}`} sub={fmtDateLong(new Date(now).toISOString())} />

      <Rise i={0}>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-navy/45">
          {today.length ? "Today's classes" : showing.length ? `Next classes · ${fmtDay(showing[0].start, now)}` : "Classes"}
        </h2>
        {showing.length === 0 ? (
          <Empty icon={<CalendarDays size={20} />} title="No classes scheduled" text="Classes appear here from each student's timetable." />
        ) : (
          <ul className="divide-y divide-navy/10 rounded-2xl border border-navy/10">
            {showing.map((s) => {
              const state = sessionState(s.start, s.durationMin, now);
              const topic = topicOf(s);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                  <span className="w-[4.5rem] shrink-0 text-sm font-semibold tabular-nums text-navy">{fmtTime(s.start)}</span>
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-[15px] font-medium tracking-tight text-navy">{cohortOf(db, s.cohortId).name}</p>
                    <p className="mt-0.5 truncate text-[13px] text-navy/50">
                      {s.title}
                      {topic ? ` · ${topic}` : ""}
                    </p>
                  </div>
                  {state === "upcoming" && new Date(s.start).getTime() - now > HOUR ? (
                    <SessionStatus session={s} />
                  ) : (
                    <JoinButton session={s} size="sm" surface="white" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Rise>

      <Rise i={1} className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-navy/45">To mark</h2>
          {queue.length > 0 && (
            <Link href="/portal/teacher/marking/" className="flex items-center gap-1 text-sm font-medium text-navy/55 hover:text-gold">
              Open marking <ArrowRight size={14} />
            </Link>
          )}
        </div>
        {queue.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-navy/10 px-5 py-4 text-sm text-navy/60">
            <CheckCircle2 size={18} className="text-gold" />
            Nothing waiting. Everything has been returned.
          </div>
        ) : (
          <ul className="divide-y divide-navy/10 rounded-2xl border border-navy/10">
            {queue.slice(0, 5).map((x) => {
              const st = db.students.find((s) => s.id === x.studentId);
              const a = db.assignments.find((y) => y.id === x.assignmentId);
              if (!st || !a) return null;
              const left = new Date(x.submittedAt).getTime() + 24 * HOUR - now;
              return (
                <li key={x.id}>
                  <Link href="/portal/teacher/marking/" className="group flex items-center gap-3.5 px-5 py-3.5 hover:bg-navy/[0.02] focus-gold">
                    <Avatar name={st.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-navy group-hover:text-gold">{st.name}</span>
                      <span className="block truncate text-[13px] text-navy/50">{a.title}</span>
                    </span>
                    <span className={left < 6 * HOUR ? "text-sm font-semibold text-navy" : "text-sm text-navy/55"}>
                      {left < 0 ? `Late by ${fmtDuration(-left)}` : `${fmtDuration(left)} left`}
                    </span>
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
