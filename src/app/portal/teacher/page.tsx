"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cohortOf, topicOf } from "@/lib/portal/selectors";
import { useTeacher } from "@/lib/portal/store";
import { DAY, HOUR, fmtDate, fmtDateLong, fmtDay, fmtDuration, fmtRelative, fmtTime, sessionState } from "@/lib/portal/format";
import { EmptyRow, Panel, RowLink, SectionTitle, Status, Table, Td, WelcomeBand } from "@/components/portal/ui";
import { JoinButton, SessionStatus } from "@/components/portal/classroom";
import { ClassDialog } from "@/components/portal/class-tools";

const dayKey = (iso: string) => new Date(iso).toDateString();

export default function TeacherDashboard() {
  const { db, me, now } = useTeacher();
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  const upcoming = db.sessions.filter((s) => sessionState(s.start, s.durationMin, now) !== "ended");
  const todayKey = new Date(now).toDateString();
  const today = upcoming.filter((s) => dayKey(s.start) === todayKey);
  // nothing left today → show the next teaching day instead
  const nextDay = upcoming.find((s) => dayKey(s.start) !== todayKey);
  const showing = today.length ? today : nextDay ? upcoming.filter((s) => dayKey(s.start) === dayKey(nextDay.start)) : [];

  const queue = db.submissions
    .filter((x) => x.status === "submitted")
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  const dueSoon = db.assignments.filter((a) => {
    const ms = new Date(a.dueAt).getTime() - now;
    return ms > 0 && ms < 7 * DAY;
  }).length;
  const notices = db.announcements.slice(0, 3);
  const requests = db.requests.filter((r) => r.status === "pending" && db.sessions.some((s) => s.id === r.sessionId));

  return (
    <>
      <WelcomeBand
        date={fmtDateLong(new Date(now).toISOString())}
        title={`Hello, ${me.name.split(" ").find((w) => !w.endsWith(".")) ?? me.name}`}
        figures={[
          { label: "Classes left today", value: today.length },
          { label: "To mark", value: queue.length },
          { label: "Deadlines this week", value: dueSoon },
          { label: "Students", value: db.students.length },
        ]}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <SectionTitle
              action={
                <Link href="/portal/teacher/calendar/" className="text-sm font-medium text-navy hover:text-gold">
                  Calendar
                </Link>
              }
            >
              {today.length ? "Today's classes" : showing.length ? `Next classes · ${fmtDay(showing[0].start, now)}` : "Classes"}
            </SectionTitle>
            <Table minWidth={520} head={[{ label: "Time" }, { label: "Student" }, { label: "Topic" }, { label: "", align: "right" }]}>
              {showing.length === 0 ? (
                <EmptyRow cols={4}>No classes scheduled.</EmptyRow>
              ) : (
                showing.map((s) => {
                  const soon = sessionState(s.start, s.durationMin, now) !== "upcoming" || new Date(s.start).getTime() - now <= HOUR;
                  return (
                    <RowLink key={s.id} onClick={() => setOpenId(s.id)}>
                      <Td className="whitespace-nowrap font-bold tabular-nums">{fmtTime(s.start)}</Td>
                      <Td className="font-medium">{cohortOf(db, s.cohortId).name}</Td>
                      <Td>{topicOf(s) || s.title}</Td>
                      <Td align="right">
                        {/* stop the row click from also opening the dialog */}
                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                          {soon ? <JoinButton session={s} size="sm" /> : <SessionStatus session={s} />}
                        </div>
                      </Td>
                    </RowLink>
                  );
                })
              )}
            </Table>
          </section>

          {requests.length > 0 && (
            <section>
              <SectionTitle>Class requests</SectionTitle>
              <Table minWidth={560} head={[{ label: "Student" }, { label: "Class" }, { label: "Request" }, { label: "Sent", align: "right" }]}>
                {requests.map((r) => {
                  const s = db.sessions.find((x) => x.id === r.sessionId)!;
                  return (
                    <RowLink key={r.id} onClick={() => setOpenId(s.id)}>
                      <Td className="font-medium">{db.students.find((x) => x.id === r.studentId)?.name ?? "Student"}</Td>
                      <Td className="whitespace-nowrap">
                        {fmtDay(s.start, now)}, {fmtTime(s.start)}
                      </Td>
                      <Td>
                        {r.kind === "cancel" ? (
                          <Status tone="attention">Cancel</Status>
                        ) : (
                          <Status tone="attention">Move to {r.proposedStart ? `${fmtDay(r.proposedStart, now)}, ${fmtTime(r.proposedStart)}` : "?"}</Status>
                        )}
                      </Td>
                      <Td align="right" className="whitespace-nowrap">
                        {fmtRelative(r.createdAt, now)}
                      </Td>
                    </RowLink>
                  );
                })}
              </Table>
            </section>
          )}

          <section>
            <SectionTitle
              action={
                <Link href="/portal/teacher/submissions/" className="text-sm font-medium text-navy hover:text-gold">
                  All submissions
                </Link>
              }
            >
              To mark
            </SectionTitle>
            <Table minWidth={520} head={[{ label: "Student" }, { label: "Assignment" }, { label: "Submitted" }, { label: "Due back", align: "right" }]}>
              {queue.length === 0 ? (
                <EmptyRow cols={4}>Nothing to mark.</EmptyRow>
              ) : (
                queue.slice(0, 6).map((x) => {
                  const st = db.students.find((s) => s.id === x.studentId);
                  const a = db.assignments.find((y) => y.id === x.assignmentId);
                  if (!st || !a) return null;
                  const left = new Date(x.submittedAt).getTime() + DAY - now;
                  return (
                    <RowLink key={x.id} onClick={() => router.push(`/portal/teacher/submissions/?open=${x.id}`)}>
                      <Td className="font-medium">{st.name}</Td>
                      <Td>{a.title}</Td>
                      <Td className="whitespace-nowrap">{fmtRelative(x.submittedAt, now)}</Td>
                      <Td align="right">
                        {left < 0 ? (
                          <Status tone="attention">Late by {fmtDuration(-left)}</Status>
                        ) : (
                          <Status tone={left < 6 * HOUR ? "attention" : "plain"}>{fmtDuration(left)} left</Status>
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
          <Panel title="Announcements" link={{ href: "/portal/teacher/announcements/", label: "Post" }}>
            {notices.length === 0 ? (
              <p className="text-sm text-navy">Nothing posted yet.</p>
            ) : (
              <ul className="divide-y divide-navy/10">
                {notices.map((n) => (
                  <li key={n.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-[15px] font-semibold text-navy">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-navy">{n.body}</p>
                    <p className="mt-1 text-[12px] font-semibold text-navy">
                      {fmtDate(n.at)} · {n.cohortId ? cohortOf(db, n.cohortId).name : "All students"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>
      </div>

      <ClassDialog session={db.sessions.find((s) => s.id === openId) ?? null} onClose={() => setOpenId(null)} />
    </>
  );
}
