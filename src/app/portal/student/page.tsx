"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Megaphone, Play } from "lucide-react";
import { courseOf, useStudent } from "@/lib/portal/store";
import { fmtDateLong, fmtDay, fmtRelative, fmtTime } from "@/lib/portal/format";
import { Bar, Btn, Card, Chip, Label, PageHeader, Rise } from "@/components/portal/ui";
import { DateTile, NextClassCard } from "@/components/portal/classroom";
import { Spark } from "@/components/portal/charts";

const HOUR = 3_600_000;

export default function StudentDashboard() {
  const { db, me, cohort, now } = useStudent();

  const sessions = db.sessions.filter((s) => s.cohortId === me.cohortId);
  const upcoming = sessions.filter((s) => new Date(s.start).getTime() + s.durationMin * 60_000 > now);
  const next = upcoming[0];
  const lastRecorded = [...sessions].reverse().find((s) => s.recordingUrl !== undefined && new Date(s.start).getTime() < now);

  const mine = db.submissions.filter((x) => x.studentId === me.id);
  const todo = db.assignments
    .filter((a) => a.cohortId === me.cohortId && !mine.some((x) => x.assignmentId === a.id))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const waiting = mine.filter((x) => x.status === "submitted");
  const latest = mine
    .filter((x) => x.status === "marked")
    .sort((a, b) => new Date(b.markedAt!).getTime() - new Date(a.markedAt!).getTime())[0];
  const latestA = latest && db.assignments.find((a) => a.id === latest.assignmentId);

  const progress = db.progress.find((p) => p.studentId === me.id);
  const pct = progress?.history.length ? progress.history[progress.history.length - 1].pct : null;
  const weakest = progress?.mastery.length ? [...progress.mastery].sort((a, b) => a.score - b.score)[0] : null;
  const notices = db.announcements.filter((a) => !a.cohortId || a.cohortId === me.cohortId).slice(0, 2);

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning," : hour < 17 ? "Good afternoon," : "Good evening,";
  const live = me.plan !== "Lab";

  return (
    <>
      <PageHeader
        eyebrow={fmtDateLong(new Date(now).toISOString())}
        title={greeting}
        gold={me.name.split(" ")[0]}
        sub={[courseOf(cohort), cohort.term].filter(Boolean).join(" · ")}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* next class */}
        <Rise i={0} className="lg:col-span-8">
          {live && next ? (
            <NextClassCard session={next} />
          ) : (
            <Card tone="navy" className="flex h-full flex-col rounded-[26px] !p-8">
              <Label className="text-white/50">{live ? "Live classes" : "Self-paced"}</Label>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                {live ? "No class scheduled right now" : "Pick up where the class left off"}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">
                {live
                  ? "Your teacher will schedule the next session soon. Recordings of every past class are in The Vault."
                  : lastRecorded
                    ? `Latest recording: ${lastRecorded.title}`
                    : "Recorded lectures appear here as soon as they're uploaded."}
              </p>
              <div className="mt-auto pt-7">
                <Btn variant="gold" href="/portal/student/vault/">
                  <Play size={15} className="fill-current" />
                  Open recordings
                </Btn>
              </div>
            </Card>
          )}
        </Rise>

        {/* predicted grade */}
        <Rise i={1} className="lg:col-span-4">
          <Card className="flex h-full flex-col">
            <div className="flex items-center justify-between">
              <Label>Predicted grade</Label>
              <Chip tone="soft">Lab AI</Chip>
            </div>
            {live && progress ? (
              <>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="text-[4.2rem] font-semibold leading-[0.85] tracking-tightest text-gold">{me.predicted || "–"}</p>
                  <Spark points={progress.history} className="h-12 w-32" />
                </div>
                <p className="mt-4 text-sm text-navy/60">
                  {pct !== null ? (
                    <>
                      Tracking at <span className="font-semibold text-navy">{pct}%</span>
                    </>
                  ) : (
                    "Appears after your first marked piece of work"
                  )}
                  {me.target && (
                    <>
                      {" "}
                      · target <span className="font-semibold text-navy">{me.target}</span>
                    </>
                  )}
                </p>
                {weakest && (
                  <div className="mt-4 rounded-2xl bg-navy/[0.04] p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/45">Fix first</p>
                    <p className="mt-1 text-sm font-medium text-navy">{weakest.unit}</p>
                    <Bar value={weakest.score} className="mt-2.5" />
                  </div>
                )}
                <Link
                  href="/portal/student/progress/"
                  className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-navy transition-colors hover:text-gold"
                >
                  See full progress <ArrowRight size={15} />
                </Link>
              </>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-navy/60">
                Predicted grades and weakness analysis are part of the Core and Elite plans.
              </p>
            )}
          </Card>
        </Rise>

        {/* to do */}
        <Rise i={2} className="lg:col-span-7">
          <Card className="h-full">
            <div className="flex items-center justify-between">
              <div>
                <Label>To do</Label>
                <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
                  {todo.length ? `${todo.length} assignment${todo.length === 1 ? "" : "s"} to hand in` : "You're all caught up"}
                </h2>
              </div>
              <Btn variant="ghost" size="sm" href="/portal/student/assignments/">
                All work <ArrowRight size={14} />
              </Btn>
            </div>

            <ul className="mt-4">
              {todo.slice(0, 3).map((a) => {
                const ms = new Date(a.dueAt).getTime() - now;
                const urgent = ms < 48 * HOUR;
                return (
                  <li key={a.id} className="border-t border-navy/10 first:border-t-0">
                    <Link
                      href={`/portal/student/assignments/?open=${a.id}`}
                      className="group flex items-center gap-3.5 py-3.5 focus-gold"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium tracking-tight text-navy transition-colors group-hover:text-gold">
                          {a.title}
                        </span>
                        <span className="mt-0.5 block text-[13px] text-navy/50">
                          {a.kind} · {a.unit} · {a.maxMarks} marks
                        </span>
                      </span>
                      <Chip tone={ms < 0 ? "navy" : urgent ? "gold" : "soft"}>
                        <Clock size={11} />
                        {ms < 0 ? "Overdue" : `Due ${fmtRelative(a.dueAt, now)}`}
                      </Chip>
                    </Link>
                  </li>
                );
              })}
              {waiting.map((x) => {
                const a = db.assignments.find((y) => y.id === x.assignmentId)!;
                return (
                  <li key={x.id} className="border-t border-navy/10 first:border-t-0">
                    <Link href={`/portal/student/assignments/?open=${a.id}`} className="group flex items-center gap-3.5 py-3.5 focus-gold">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium tracking-tight text-navy/60 transition-colors group-hover:text-gold">
                          {a.title}
                        </span>
                        <span className="mt-0.5 block text-[13px] text-navy/45">Submitted {fmtRelative(x.submittedAt, now)}</span>
                      </span>
                      <Chip tone="soft" dot>
                        With examiner
                      </Chip>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </Rise>

        {/* feedback + notices */}
        <Rise i={3} className="flex flex-col gap-5 lg:col-span-5">
          {latest && latestA && (
            <Card>
              <div className="flex items-center justify-between">
                <Label>Latest feedback</Label>
                <Chip tone="navy">
                  <CheckCircle2 size={11} />
                  {latest.marks} / {latestA.maxMarks}
                </Chip>
              </div>
              <p className="mt-3 text-[15px] font-medium tracking-tight text-navy">{latestA.title}</p>
              <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-navy/60">{latest.feedback}</p>
              <Link
                href={`/portal/student/assignments/?open=${latestA.id}`}
                className="mt-3.5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy transition-colors hover:text-gold"
              >
                Read the full feedback <ArrowRight size={15} />
              </Link>
            </Card>
          )}
          <Card className="flex-1">
            <Label>Notice board</Label>
            <ul className="mt-3 flex flex-col gap-3.5">
              {notices.map((n) => (
                <li key={n.id} className="flex gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/20 text-navy">
                    <Megaphone size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight text-navy">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-navy/55">{n.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </Rise>

        {/* the week ahead */}
        {live && upcoming.length > 1 && (
          <Rise i={4} className="lg:col-span-12">
            <Card>
              <div className="flex items-center justify-between">
                <Label>Coming up</Label>
                <Btn variant="ghost" size="sm" href="/portal/student/classes/">
                  Full timetable <ArrowRight size={14} />
                </Btn>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-x-8 md:grid-cols-2">
                {upcoming.slice(1, 5).map((s) => (
                  <div key={s.id} className="flex items-center gap-3.5 border-t border-navy/10 py-3.5 md:[&:nth-child(-n+2)]:border-t-0 max-md:first:border-t-0">
                    <DateTile iso={s.start} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium tracking-tight text-navy">{s.title}</p>
                      <p className="mt-0.5 text-[13px] text-navy/50">
                        {fmtDay(s.start, now)} · {fmtTime(s.start)}
                        {s.strand ? ` · ${s.strand}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Rise>
        )}
      </div>
    </>
  );
}
