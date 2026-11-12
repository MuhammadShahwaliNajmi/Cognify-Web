"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { courseOf, useStudent } from "@/lib/portal/store";
import { fmtDate, fmtDateLong, fmtRelative, fmtTime, sessionState } from "@/lib/portal/format";
import { Empty, PageHeader, SectionTitle, Status, Table, Td } from "@/components/portal/ui";
import { NextClassCard } from "@/components/portal/classroom";

const HOUR = 3_600_000;

/** Dashboard: next class, upcoming deadlines, and a sidebar with course info, news and recent grades. */
export default function StudentDashboard() {
  const { db, me, cohort, now } = useStudent();
  const router = useRouter();

  const next = db.sessions.find((s) => s.cohortId === me.cohortId && sessionState(s.start, s.durationMin, now) !== "ended");
  const mine = db.submissions.filter((x) => x.studentId === me.id);
  const deadlines = db.assignments
    .filter((a) => a.cohortId === me.cohortId && !mine.some((x) => x.assignmentId === a.id))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const notice = db.announcements.find((a) => !a.cohortId || a.cohortId === me.cohortId);
  const recent = mine
    .filter((x) => x.status === "marked")
    .sort((a, b) => new Date(b.markedAt!).getTime() - new Date(a.markedAt!).getTime())
    .slice(0, 3);

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader title={`${greeting}, ${me.name.split(" ")[0]}`} sub={fmtDateLong(new Date(now).toISOString())} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* main column */}
        <div className="space-y-8 lg:col-span-2">
          <section>
            <SectionTitle>Next class</SectionTitle>
            {next ? (
              <NextClassCard session={next} />
            ) : (
              <Empty icon={<CalendarDays size={20} />} title="No class scheduled" text="Your next class will appear here once it's on the timetable." />
            )}
          </section>

          <section>
            <SectionTitle
              action={
                <Link href="/portal/student/assignments/" className="text-sm font-medium text-navy/60 hover:text-gold">
                  All assignments
                </Link>
              }
            >
              Upcoming deadlines
            </SectionTitle>
            <Table
              minWidth={460}
              head={[{ label: "Assignment" }, { label: "Type" }, { label: "Due" }, { label: "Status", align: "right" }]}
            >
              {deadlines.length === 0 ? (
                <tr>
                  <Td colSpan={4} className="py-6 text-center text-navy/50">
                    Nothing due. You&apos;re all caught up.
                  </Td>
                </tr>
              ) : (
                deadlines.slice(0, 6).map((a) => {
                  const ms = new Date(a.dueAt).getTime() - now;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => router.push(`/portal/student/assignments/?open=${a.id}`)}
                      className="cursor-pointer transition-colors hover:bg-navy/[0.025]"
                    >
                      <Td className="font-medium text-navy">{a.title}</Td>
                      <Td>{a.kind}</Td>
                      <Td className="whitespace-nowrap">
                        {fmtDate(a.dueAt)}, {fmtTime(a.dueAt)}
                      </Td>
                      <Td align="right">
                        {ms < 0 ? (
                          <Status tone="attention">Overdue</Status>
                        ) : ms < 48 * HOUR ? (
                          <Status tone="attention">Due {fmtRelative(a.dueAt, now)}</Status>
                        ) : (
                          <Status>Not submitted</Status>
                        )}
                      </Td>
                    </tr>
                  );
                })
              )}
            </Table>
          </section>
        </div>

        {/* sidebar */}
        <aside className="space-y-6">
          <div className="rounded-xl border border-navy/12 p-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-navy/50">My course</p>
            <p className="mt-2 text-[15px] font-semibold text-navy">{courseOf(cohort)}</p>
            <p className="mt-1 text-sm text-navy/55">One-to-one · {me.plan} plan</p>
          </div>

          <div className="rounded-xl border border-navy/12 p-5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-navy/50">Latest announcement</p>
              <Link href="/portal/student/announcements/" className="text-[13px] font-medium text-navy/55 hover:text-gold">
                View all
              </Link>
            </div>
            {notice ? (
              <>
                <p className="mt-2 text-[15px] font-semibold text-navy">{notice.title}</p>
                <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-navy/60">{notice.body}</p>
                <p className="mt-2 text-[12px] text-navy/40">{fmtRelative(notice.at, now)}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-navy/50">No announcements yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-navy/12 p-5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-navy/50">Recent grades</p>
              <Link href="/portal/student/grades/" className="text-[13px] font-medium text-navy/55 hover:text-gold">
                Gradebook
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="mt-2 text-sm text-navy/50">No marked work yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-navy/10">
                {recent.map((x) => {
                  const a = db.assignments.find((y) => y.id === x.assignmentId);
                  if (!a) return null;
                  return (
                    <li key={x.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="truncate text-sm text-navy">{a.title}</span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-navy">
                        {x.marks}/{a.maxMarks}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
