"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cohortOf, topicOf } from "@/lib/portal/selectors";
import { useTeacher } from "@/lib/portal/store";
import { DAY, HOUR, fmtDate, fmtDateLong, fmtDay, fmtDuration, fmtRelative, fmtTime, sessionState } from "@/lib/portal/format";
import { flagKey, needsAttention, type Flag } from "@/lib/portal/insights";
import { getSupabase } from "@/lib/supabase/client";
import { CommentsToAnswer } from "@/components/portal/comments-to-answer";
import { Btn, EmptyRow, RowLink, SectionTitle, Status, Table, Td, WelcomeBand } from "@/components/portal/ui";
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
  // flags the teacher cleared (kept in the database, so every device agrees)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  useEffect(() => {
    let alive = true;
    getSupabase()
      ?.from("attention_dismissals")
      .select("key")
      .then(({ data }) => alive && data && setDismissed(new Set((data as { key: string }[]).map((r) => r.key))));
    return () => {
      alive = false;
    };
  }, []);
  const attention = needsAttention(db, now, dismissed);
  const dismiss = async (studentId: string, flags: Flag[]) => {
    const keys = flags.map((f) => flagKey(studentId, f));
    setDismissed((d) => new Set(Array.from(d).concat(keys)));
    await getSupabase()?.from("attention_dismissals").upsert(keys.map((key) => ({ key })), { onConflict: "member_id,key", ignoreDuplicates: true });
  };
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

      <div>
        <div className="space-y-8">
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

          <CommentsToAnswer />

          {attention.length > 0 && (
            <section>
              <SectionTitle>Needs attention</SectionTitle>
              <Table minWidth={520} head={[{ label: "Student" }, { label: "Why" }, { label: "", align: "right" }]}>
                {attention.slice(0, 8).map(({ st, flags }) => (
                  <tr key={st.id}>
                    <Td className="font-medium">{st.name}</Td>
                    <Td>{flags.map((f) => f.text).join(" · ")}</Td>
                    <Td align="right">
                      <div className="flex justify-end gap-2">
                        <Btn variant="outline" size="sm" href={`/portal/teacher/students/?open=${st.id}`}>
                          Open
                        </Btn>
                        <Btn variant="ghost" size="sm" onClick={() => dismiss(st.id, flags)} aria-label={`Dismiss for ${st.name}`}>
                          Dismiss
                        </Btn>
                      </div>
                    </Td>
                  </tr>
                ))}
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

      </div>

      <ClassDialog session={db.sessions.find((s) => s.id === openId) ?? null} onClose={() => setOpenId(null)} />
    </>
  );
}
