"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cohortOf, registerMissing, topicOf } from "@/lib/portal/selectors";
import { useTeacher } from "@/lib/portal/store";
import { DAY, HOUR, fmtDate, fmtDateLong, fmtDay, fmtDuration, fmtRelative, fmtTime, sessionState } from "@/lib/portal/format";
import { needsAttention } from "@/lib/portal/insights";
import { Btn, EmptyRow, Panel, RowLink, SectionTitle, Status, Table, Td, WelcomeBand } from "@/components/portal/ui";
import { JoinButton, SessionStatus } from "@/components/portal/classroom";
import { ClassDialog } from "@/components/portal/class-tools";

const dayKey = (iso: string) => new Date(iso).toDateString();

export default function TeacherDashboard() {
  const { db, me, now, setAttendance } = useTeacher();
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
  // one copy is posted per student; show each announcement once
  const notices = db.announcements.filter((n, i, all) => all.findIndex((m) => m.title === n.title && m.body === n.body) === i).slice(0, 3);
  const attention = needsAttention(db, now);
  const requests = db.requests.filter((r) => r.status === "pending" && db.sessions.some((s) => s.id === r.sessionId));
  // finished classes in the last 30 days with no register yet (one row per student)
  const registers = db.sessions
    .filter((s) => registerMissing(s, now) && now - new Date(s.start).getTime() < 30 * DAY)
    .flatMap((s) => db.students.filter((st) => st.cohortId === s.cohortId).map((st) => ({ s, st })))
    .reverse();

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

          {attention.length > 0 && (
            <section>
              <SectionTitle>Needs attention</SectionTitle>
              <Table minWidth={520} head={[{ label: "Student" }, { label: "Why" }, { label: "", align: "right" }]}>
                {attention.slice(0, 8).map(({ st, flags }) => (
                  <tr key={st.id}>
                    <Td className="font-medium">{st.name}</Td>
                    <Td>{flags.map((f) => f.text).join(" · ")}</Td>
                    <Td align="right">
                      <Btn variant="outline" size="sm" href={`/portal/teacher/students/?open=${st.id}`}>
                        Open
                      </Btn>
                    </Td>
                  </tr>
                ))}
              </Table>
            </section>
          )}

          {registers.length > 0 && (
            <section>
              <SectionTitle>Registers to take</SectionTitle>
              <Table minWidth={520} head={[{ label: "Class" }, { label: "Student" }, { label: "", align: "right" }]}>
                {registers.slice(0, 8).map(({ s, st }) => (
                  <tr key={`${s.id}-${st.id}`}>
                    <Td className="whitespace-nowrap">
                      <span className="font-semibold">{fmtDay(s.start, now)}</span>, {fmtTime(s.start)}
                    </Td>
                    <Td className="font-medium">{st.name}</Td>
                    <Td align="right">
                      <div className="flex justify-end gap-2">
                        <Btn variant="navy" size="sm" onClick={() => setAttendance(s.id, st.id, true)}>
                          Present
                        </Btn>
                        <Btn variant="outline" size="sm" onClick={() => setAttendance(s.id, st.id, false)}>
                          Absent
                        </Btn>
                      </div>
                    </Td>
                  </tr>
                ))}
                {registers.length > 8 && <EmptyRow cols={3}>{registers.length - 8} more after these</EmptyRow>}
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
                      {fmtDate(n.at)} ·{" "}
                      {db.announcements.filter((m) => m.title === n.title && m.body === n.body).length > 1
                        ? "Several students"
                        : n.cohortId
                          ? cohortOf(db, n.cohortId).name
                          : "All students"}
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
