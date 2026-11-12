"use client";

import { Lock, Target } from "lucide-react";
import { attendancePct, averagePct, courseOf, useStudent } from "@/lib/portal/store";
import { fmtDate } from "@/lib/portal/format";
import { Bar, Btn, Card, Chip, Label, PageHeader, Rise, Stat } from "@/components/portal/ui";
import { TrendChart } from "@/components/portal/charts";

/** Approximate percentage needed for each grade (A Level letters, IB 1–7). */
const BOUNDARY: Record<string, number> = { "A*": 88, A: 78, B: 68, C: 58, D: 48, "7": 80, "6": 68, "5": 56, "4": 45 };

export default function StudentProgress() {
  const { db, me, cohort, now } = useStudent();
  const progress = db.progress.find((p) => p.studentId === me.id);

  if (me.plan === "Lab" || !progress) {
    return (
      <>
        <PageHeader eyebrow="Lab AI" title="Your" gold="Progress" />
        <Card tone="navy" className="rounded-[26px] !p-8 md:!p-10">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.07] text-gold ring-1 ring-white/10">
            <Lock size={18} />
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">Predicted grades are part of Core and Elite</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/60">
            Lab AI turns your marked work into a live predicted grade, pinpoints your weakest topics and tells you exactly what to improve.
          </p>
          <div className="mt-7">
            <Btn variant="gold" href="/#pricing">
              Compare plans
            </Btn>
          </div>
        </Card>
      </>
    );
  }

  const n = progress.history.length;
  const pct = n ? progress.history[n - 1].pct : null;
  const first = n ? progress.history[0].pct : null;
  const targetPct = BOUNDARY[me.target];
  const gap = targetPct !== undefined && pct !== null ? targetPct - pct : 0;
  const trend =
    n >= 2 && pct !== null && first !== null
      ? `${pct >= first ? "up" : "down"} ${Math.abs(pct - first)} points over ${n} marked pieces`
      : n === 1
        ? "from your first marked piece of work"
        : "hand in your first assignment to start";
  const mastery = [...progress.mastery].sort((a, b) => a.score - b.score);

  const cohortWork = db.assignments.filter((a) => a.cohortId === me.cohortId && new Date(a.dueAt).getTime() < now);
  const mine = db.submissions.filter((x) => x.studentId === me.id);
  const onTime = cohortWork.filter((a) => {
    const s = mine.find((x) => x.assignmentId === a.id);
    return s && new Date(s.submittedAt).getTime() <= new Date(a.dueAt).getTime();
  }).length;
  const marked = mine
    .filter((x) => x.status === "marked")
    .sort((a, b) => new Date(b.markedAt!).getTime() - new Date(a.markedAt!).getTime());

  return (
    <>
      <PageHeader
        eyebrow={`Lab AI · ${courseOf(cohort)}`}
        title="Your"
        gold="Progress"
        sub="Your predicted grade updates every time a piece of work is marked. Recent assessments count the most."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Rise i={0} className="lg:col-span-5">
          <Card tone="navy" className="flex h-full flex-col rounded-[26px] !p-7 md:!p-8">
            <Label className="text-white/50">Predicted grade</Label>
            <div className="mt-4 flex items-end gap-5">
              <p className="text-[6.5rem] font-semibold leading-[0.8] tracking-tightest text-gold">{me.predicted || "–"}</p>
              <div className="pb-1">
                <p className="text-3xl font-semibold tracking-tight tabular-nums">{pct !== null ? `${pct}%` : "No marks yet"}</p>
                <p className="mt-1 text-sm text-white/55">{trend}</p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Target size={15} className="text-gold" />
                  Target: {me.target || "set by your teacher"}
                </span>
                <span className="text-sm text-white/60">
                  {pct === null || targetPct === undefined ? "" : gap > 0 ? `${gap} points to go` : "On target"}
                </span>
              </div>
              <Bar value={targetPct && pct !== null ? (pct / targetPct) * 100 : 0} onNavy className="mt-3" />
            </div>

            <p className="mt-auto pt-6 text-[13px] leading-relaxed text-white/45">
              An estimate from your marked work, not a guarantee. It moves as you do.
            </p>
          </Card>
        </Rise>

        <Rise i={1} className="lg:col-span-7">
          <Card className="h-full">
            <div className="flex items-center justify-between">
              <div>
                <Label>Grade trend</Label>
                <h2 className="mt-1.5 text-lg font-semibold tracking-tight">Week by week</h2>
              </div>
              <Chip tone="soft">% across marked work</Chip>
            </div>
            <div className="mt-4">
              <TrendChart points={progress.history} target={targetPct} targetLabel={`${me.target} line`} />
            </div>
          </Card>
        </Rise>

        <Rise i={2} className="lg:col-span-12">
          <Card className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:divide-x sm:divide-navy/10">
            <Stat label="Attendance" value={`${attendancePct(db, me.id, me.cohortId, now)}%`} sub="of live classes this term" />
            <div className="sm:pl-6">
              <Stat label="Average mark" value={averagePct(db, me.id) !== null ? `${averagePct(db, me.id)}%` : "–"} sub={`across ${marked.length} marked pieces`} />
            </div>
            <div className="sm:pl-6">
              <Stat label="Handed in on time" value={`${onTime} / ${cohortWork.length}`} sub="assignments this term" />
            </div>
          </Card>
        </Rise>

        <Rise i={3} className="lg:col-span-7">
          <Card className="h-full">
            <Label>Topic mastery</Label>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight">What to fix, weakest first</h2>
            {mastery.length === 0 && (
              <p className="mt-4 text-sm leading-relaxed text-navy/55">
                Your teacher adds your strongest and weakest topics here as your work is marked.
              </p>
            )}
            <ul className="mt-4">
              {mastery.map((m, i) => (
                <li key={m.unit} className="border-t border-navy/10 py-4 first:border-t-0">
                  <div className="flex items-center gap-3">
                    <p className="flex-1 text-[15px] font-semibold tracking-tight text-navy">{m.unit}</p>
                    {i < 2 && <Chip tone="gold">Fix first</Chip>}
                    <Chip tone="outline">{m.strand}</Chip>
                    <span className="w-10 text-right text-sm font-semibold tabular-nums text-navy">{m.score}%</span>
                  </div>
                  <Bar value={m.score} className="mt-3" />
                  <p className="mt-2.5 text-sm leading-relaxed text-navy/60">{m.fix}</p>
                </li>
              ))}
            </ul>
          </Card>
        </Rise>

        <Rise i={4} className="lg:col-span-5">
          <Card className="h-full">
            <Label>Recent results</Label>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight">Marked work</h2>
            <ul className="mt-4">
              {marked.map((x) => {
                const a = db.assignments.find((y) => y.id === x.assignmentId)!;
                const p = Math.round(((x.marks ?? 0) / a.maxMarks) * 100);
                return (
                  <li key={x.id} className="border-t border-navy/10 py-3.5 first:border-t-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium tracking-tight text-navy">{a.title}</p>
                      <span className="text-sm font-semibold tabular-nums text-navy">
                        {x.marks}/{a.maxMarks}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Bar value={p} className="flex-1" />
                      <span className="w-20 text-right text-xs text-navy/45">{fmtDate(x.markedAt!)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </Rise>
      </div>
    </>
  );
}
