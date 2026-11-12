"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cohortOf, topicOf, useTeacher } from "@/lib/portal/store";
import { fmtDate, fmtDateLong, fmtDay, fmtDuration, fmtRelative, fmtTime, sessionState } from "@/lib/portal/format";
import { EmptyRow, PageHeader, RowLink, SectionTitle, Status, Table, Td } from "@/components/portal/ui";
import { JoinButton, SessionStatus } from "@/components/portal/classroom";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const dayKey = (iso: string) => new Date(iso).toDateString();

function SideCard({ title, link, children }: { title: string; link?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-navy/12 p-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-navy/50">{title}</p>
        {link && (
          <Link href={link.href} className="text-[13px] font-medium text-navy/55 hover:text-gold">
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

/** Dashboard: today's classes, the marking queue, and this week at a glance. */
export default function TeacherDashboard() {
  const { db, me, now } = useTeacher();
  const router = useRouter();

  const upcoming = db.sessions.filter((s) => sessionState(s.start, s.durationMin, now) !== "ended");
  const todayKey = new Date(now).toDateString();
  const today = upcoming.filter((s) => dayKey(s.start) === todayKey);
  // nothing left today → show the next teaching day instead
  const nextDay = upcoming.find((s) => dayKey(s.start) !== todayKey);
  const showing = today.length ? today : nextDay ? upcoming.filter((s) => dayKey(s.start) === dayKey(nextDay.start)) : [];

  const queue = db.submissions
    .filter((x) => x.status === "submitted")
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  const weekClasses = upcoming.filter((s) => new Date(s.start).getTime() - now < 7 * DAY).length;
  const dueSoon = db.assignments.filter((a) => {
    const ms = new Date(a.dueAt).getTime() - now;
    return ms > 0 && ms < 7 * DAY;
  }).length;
  const notice = db.announcements[0];

  return (
    <>
      <PageHeader title={`Hello, ${me.name.split(" ").find((w) => !w.endsWith(".")) ?? me.name}`} sub={fmtDateLong(new Date(now).toISOString())} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <SectionTitle
              action={
                <Link href="/portal/teacher/calendar/" className="text-sm font-medium text-navy/60 hover:text-gold">
                  Calendar
                </Link>
              }
            >
              {today.length ? "Today's classes" : showing.length ? `Next classes · ${fmtDay(showing[0].start, now)}` : "Classes"}
            </SectionTitle>
            <Table minWidth={560} head={[{ label: "Time" }, { label: "Student" }, { label: "Topic" }, { label: "", align: "right" }]}>
              {showing.length === 0 ? (
                <EmptyRow cols={4}>No classes scheduled. Classes appear from each student&apos;s timetable.</EmptyRow>
              ) : (
                showing.map((s) => {
                  const soon = sessionState(s.start, s.durationMin, now) !== "upcoming" || new Date(s.start).getTime() - now <= HOUR;
                  return (
                    <tr key={s.id}>
                      <Td className="whitespace-nowrap font-semibold tabular-nums text-navy">{fmtTime(s.start)}</Td>
                      <Td className="font-medium text-navy">{cohortOf(db, s.cohortId).name}</Td>
                      <Td className="text-navy/60">{topicOf(s) || s.title}</Td>
                      <Td align="right">
                        <div className="flex justify-end">{soon ? <JoinButton session={s} size="sm" surface="white" /> : <SessionStatus session={s} />}</div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </Table>
          </section>

          <section>
            <SectionTitle
              action={
                <Link href="/portal/teacher/submissions/" className="text-sm font-medium text-navy/60 hover:text-gold">
                  All submissions
                </Link>
              }
            >
              To mark
            </SectionTitle>
            <Table minWidth={560} head={[{ label: "Student" }, { label: "Assignment" }, { label: "Submitted" }, { label: "Feedback due", align: "right" }]}>
              {queue.length === 0 ? (
                <EmptyRow cols={4}>Nothing waiting. Everything has been returned.</EmptyRow>
              ) : (
                queue.slice(0, 6).map((x) => {
                  const st = db.students.find((s) => s.id === x.studentId);
                  const a = db.assignments.find((y) => y.id === x.assignmentId);
                  if (!st || !a) return null;
                  const left = new Date(x.submittedAt).getTime() + DAY - now;
                  return (
                    <RowLink key={x.id} onClick={() => router.push(`/portal/teacher/submissions/?open=${x.id}`)}>
                      <Td className="font-medium text-navy">{st.name}</Td>
                      <Td>{a.title}</Td>
                      <Td className="whitespace-nowrap">{fmtRelative(x.submittedAt, now)}</Td>
                      <Td align="right">
                        {left < 0 ? (
                          <Status tone="attention">Late by {fmtDuration(-left)}</Status>
                        ) : left < 6 * HOUR ? (
                          <Status tone="attention">{fmtDuration(left)} left</Status>
                        ) : (
                          <Status>{fmtDuration(left)} left</Status>
                        )}
                      </Td>
                    </RowLink>
                  );
                })
              )}
            </Table>
          </section>
        </div>

        <aside className="space-y-6">
          <SideCard title="Next 7 days">
            <dl className="mt-3 grid grid-cols-3 gap-3">
              {[
                { k: "Classes", v: weekClasses },
                { k: "To mark", v: queue.length },
                { k: "Deadlines", v: dueSoon },
              ].map((x) => (
                <div key={x.k}>
                  <dd className="text-2xl font-semibold tabular-nums text-navy">{x.v}</dd>
                  <dt className="text-[13px] text-navy/50">{x.k}</dt>
                </div>
              ))}
            </dl>
          </SideCard>

          <SideCard title="Students" link={{ href: "/portal/teacher/students/", label: "View all" }}>
            <p className="mt-2 text-[15px] font-semibold text-navy">{db.students.length} enrolled</p>
            <p className="mt-1 text-sm text-navy/55">
              {db.cohorts.length} class{db.cohorts.length === 1 ? "" : "es"} · {db.cohorts.filter((c) => !c.meetUrl).length} without a Meet link
            </p>
          </SideCard>

          <SideCard title="Last announcement" link={{ href: "/portal/teacher/announcements/", label: "Post" }}>
            {notice ? (
              <>
                <p className="mt-2 text-[15px] font-semibold text-navy">{notice.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-navy/60">{notice.body}</p>
                <p className="mt-2 text-[12px] text-navy/40">
                  {fmtDate(notice.at)} · {notice.cohortId ? cohortOf(db, notice.cohortId).name : "All students"}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-navy/50">Nothing posted yet.</p>
            )}
          </SideCard>
        </aside>
      </div>
    </>
  );
}
