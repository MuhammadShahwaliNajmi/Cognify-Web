"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { assessmentState, attendancePct, workHref } from "@/lib/portal/selectors";
import { useStudent } from "@/lib/portal/store";
import { HOUR, fmtDate, fmtDateLong, fmtRelative, fmtTime, sessionState } from "@/lib/portal/format";
import { EmptyRow, Panel, RowLink, SectionTitle, Status, Table, Td, WelcomeBand } from "@/components/portal/ui";
import { NextClassCard } from "@/components/portal/classroom";


export default function StudentDashboard() {
  const { db, me, now } = useStudent();
  const router = useRouter();

  const next = db.sessions.find((s) => s.cohortId === me.cohortId && sessionState(s.start, s.durationMin, now) !== "ended");
  const mine = db.submissions.filter((x) => x.studentId === me.id);
  const deadlines = db.assignments
    .filter(
      (a) =>
        a.cohortId === me.cohortId &&
        !mine.some((x) => x.assignmentId === a.id) &&
        (!a.timeLimitMin || ["upcoming", "in-progress", "grace"].includes(assessmentState(db, a, me.id, now)))
    )
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const notices = db.announcements.filter((a) => !a.cohortId || a.cohortId === me.cohortId).slice(0, 3);
  const graded = mine
    .filter((x) => x.status === "marked")
    .sort((a, b) => new Date(b.markedAt!).getTime() - new Date(a.markedAt!).getTime());
  const max = graded.reduce((n, x) => n + (db.assignments.find((a) => a.id === x.assignmentId)?.maxMarks ?? 0), 0);
  const got = graded.reduce((n, x) => n + (x.marks ?? 0), 0);

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <WelcomeBand
        date={fmtDateLong(new Date(now).toISOString())}
        title={`${greeting}, ${me.name.split(" ")[0]}`}
        figures={[
          { label: "Predicted grade", value: me.predicted || "–" },
          { label: "Overall score", value: max ? `${Math.round((got / max) * 100)}%` : "–" },
          { label: "Attendance", value: `${attendancePct(db, me.id, me.cohortId, now)}%` },
          { label: "To hand in", value: deadlines.length },
        ]}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {next && (
            <section>
              <SectionTitle>Next class</SectionTitle>
              <NextClassCard session={next} />
            </section>
          )}

          <section>
            <SectionTitle
              action={
                <Link href="/portal/student/assignments/" className="text-sm font-medium text-navy hover:text-gold">
                  All assignments
                </Link>
              }
            >
              Upcoming deadlines
            </SectionTitle>
            <Table minWidth={460} head={[{ label: "Assignment" }, { label: "Due" }, { label: "Status", align: "right" }]}>
              {deadlines.length === 0 ? (
                <EmptyRow cols={3}>All caught up.</EmptyRow>
              ) : (
                deadlines.slice(0, 6).map((a) => {
                  const ms = new Date(a.dueAt).getTime() - now;
                  return (
                    <RowLink key={a.id} onClick={() => router.push(workHref(a))}>
                      <Td className="font-medium">{a.title}</Td>
                      <Td className="whitespace-nowrap">
                        {fmtDate(a.dueAt)}, {fmtTime(a.dueAt)}
                      </Td>
                      <Td align="right">
                        {a.timeLimitMin ? (
                          <Status tone="attention">
                            {assessmentState(db, a, me.id, now) === "upcoming" ? `Timed · start by ${fmtRelative(a.dueAt, now)}` : "In progress"}
                          </Status>
                        ) : ms < 0 ? (
                          <Status tone="attention">Overdue</Status>
                        ) : ms < 48 * HOUR ? (
                          <Status tone="attention">Due {fmtRelative(a.dueAt, now)}</Status>
                        ) : (
                          <Status>Not submitted</Status>
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
          <Panel title="Announcements" link={{ href: "/portal/student/announcements/", label: "View all" }}>
            {notices.length === 0 ? (
              <p className="text-sm text-navy">Nothing new.</p>
            ) : (
              <ul className="divide-y divide-navy/10">
                {notices.map((n) => (
                  <li key={n.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-[15px] font-semibold text-navy">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-navy">{n.body}</p>
                    <p className="mt-1 text-[12px] font-semibold text-navy">{fmtRelative(n.at, now)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent grades" link={{ href: "/portal/student/grades/", label: "Gradebook" }}>
            {graded.length === 0 ? (
              <p className="text-sm text-navy">No graded work yet.</p>
            ) : (
              <ul className="divide-y divide-navy/10">
                {graded.slice(0, 4).map((x) => {
                  const a = db.assignments.find((y) => y.id === x.assignmentId);
                  if (!a) return null;
                  return (
                    <li key={x.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="truncate text-sm text-navy">{a.title}</span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-navy">
                        {x.marks}/{a.maxMarks}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
