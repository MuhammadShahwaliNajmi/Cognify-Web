"use client";

import { useState } from "react";
import { attendancePct, useStudent } from "@/lib/portal/store";
import { fmtDate } from "@/lib/portal/format";
import { Bar, PageHeader, Rise, Segmented } from "@/components/portal/ui";
import { TrendChart } from "@/components/portal/charts";

/** Approximate percentage needed for each grade (A Level letters, IB 1–7). */
const BOUNDARY: Record<string, number> = { "A*": 88, A: 78, B: 68, C: 58, D: 48, "7": 80, "6": 68, "5": 56, "4": 45 };

function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] text-navy/50">{label}</p>
      <p className="mt-1 text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums text-navy">{value}</p>
      {sub && <p className="mt-1.5 text-[13px] text-navy/45">{sub}</p>}
    </div>
  );
}

export default function StudentProgress() {
  const { db, me, now } = useStudent();
  const [tab, setTab] = useState<"trend" | "topics" | "results">("trend");
  const progress = db.progress.find((p) => p.studentId === me.id);
  const history = progress?.history ?? [];
  const mastery = [...(progress?.mastery ?? [])].sort((a, b) => a.score - b.score);

  const latest = history.length ? history[history.length - 1].pct : null;
  const targetPct = BOUNDARY[me.target];
  const marked = db.submissions
    .filter((x) => x.studentId === me.id && x.status === "marked")
    .sort((a, b) => new Date(b.markedAt!).getTime() - new Date(a.markedAt!).getTime());

  return (
    <>
      <PageHeader title="Progress" sub="Your predicted grade updates as your work is marked. It's an estimate, not a guarantee." />

      <Rise i={0}>
        <div className="grid grid-cols-2 gap-6 rounded-2xl border border-navy/10 p-5 sm:grid-cols-4 md:p-6">
          <Figure label="Predicted grade" value={me.predicted || "–"} sub={me.predicted ? "set by your teacher" : "after your first marked work"} />
          <Figure label="Target" value={me.target || "–"} />
          <Figure label="Latest mark" value={latest !== null ? `${latest}%` : "–"} sub={`${marked.length} marked piece${marked.length === 1 ? "" : "s"}`} />
          <Figure label="Attendance" value={`${attendancePct(db, me.id, me.cohortId, now)}%`} sub="of live classes" />
        </div>
        {targetPct !== undefined && latest !== null && (
          <div className="mt-4 flex items-center gap-4 text-[13px] text-navy/55">
            <Bar value={(latest / targetPct) * 100} className="flex-1" />
            {latest >= targetPct ? "On target" : `${targetPct - latest} points to your target`}
          </div>
        )}
      </Rise>

      <div className="mt-8">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "trend", label: "Trend" },
            { value: "topics", label: "Topics", count: mastery.length || undefined },
            { value: "results", label: "Results", count: marked.length || undefined },
          ]}
        />
      </div>

      <Rise key={tab} className="mt-6">
        {tab === "trend" && <TrendChart points={history} target={targetPct} targetLabel={me.target ? `${me.target} line` : undefined} />}

        {tab === "topics" &&
          (mastery.length === 0 ? (
            <p className="py-8 text-center text-sm text-navy/50">
              Your teacher adds your strongest and weakest topics here as your work is marked.
            </p>
          ) : (
            <ul className="divide-y divide-navy/10">
              {mastery.map((m, i) => (
                <li key={m.unit} className="py-4">
                  <div className="flex items-center gap-3">
                    <p className="flex-1 text-[15px] font-medium tracking-tight text-navy">
                      {m.unit}
                      {i < 2 && <span className="ml-2 text-[13px] font-normal text-gold">fix first</span>}
                    </p>
                    <span className="text-sm font-semibold tabular-nums text-navy">{m.score}%</span>
                  </div>
                  <Bar value={m.score} className="mt-2.5" />
                  {m.fix && <p className="mt-2 text-sm leading-relaxed text-navy/55">{m.fix}</p>}
                </li>
              ))}
            </ul>
          ))}

        {tab === "results" &&
          (marked.length === 0 ? (
            <p className="py-8 text-center text-sm text-navy/50">Your marked work will collect here.</p>
          ) : (
            <ul className="divide-y divide-navy/10">
              {marked.map((x) => {
                const a = db.assignments.find((y) => y.id === x.assignmentId);
                if (!a) return null;
                return (
                  <li key={x.id} className="flex items-center gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium tracking-tight text-navy">{a.title}</p>
                      <p className="mt-0.5 text-[13px] text-navy/50">Returned {fmtDate(x.markedAt!)}</p>
                    </div>
                    <span className="text-[15px] font-semibold tabular-nums text-navy">
                      {x.marks}
                      <span className="text-navy/40">/{a.maxMarks}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ))}
      </Rise>
    </>
  );
}
