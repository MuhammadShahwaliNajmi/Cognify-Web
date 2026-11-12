"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { attendancePct, submissionFor, useStudent } from "@/lib/portal/store";
import { fmtDate } from "@/lib/portal/format";
import { Bar, EmptyRow, PageHeader, RowLink, Segmented, Status, Table, Td } from "@/components/portal/ui";
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

export default function StudentGrades() {
  const { db, me, now } = useStudent();
  const router = useRouter();
  const [tab, setTab] = useState<"gradebook" | "trend" | "topics">("gradebook");
  const progress = db.progress.find((p) => p.studentId === me.id);
  const history = progress?.history ?? [];
  const mastery = [...(progress?.mastery ?? [])].sort((a, b) => a.score - b.score);

  const latest = history.length ? history[history.length - 1].pct : null;
  const targetPct = BOUNDARY[me.target];
  const items = db.assignments
    .filter((a) => a.cohortId === me.cohortId)
    .map((a) => ({ a, sub: submissionFor(db, a.id, me.id) }))
    .sort((x, y) => new Date(y.a.dueAt).getTime() - new Date(x.a.dueAt).getTime());
  const graded = items.filter((r) => r.sub?.status === "marked");
  const got = graded.reduce((n, r) => n + (r.sub!.marks ?? 0), 0);
  const max = graded.reduce((n, r) => n + r.a.maxMarks, 0);

  return (
    <>
      <PageHeader title="Grades" sub="Every assignment and its score. Your predicted grade is an estimate set by your teacher." />

      <div className="grid grid-cols-2 gap-6 rounded-xl border border-navy/12 p-5 sm:grid-cols-4">
        <Figure label="Predicted grade" value={me.predicted || "–"} sub={me.predicted ? "set by your teacher" : "after your first graded work"} />
        <Figure label="Target" value={me.target || "–"} />
        <Figure label="Overall" value={max ? `${Math.round((got / max) * 100)}%` : "–"} sub={`${graded.length} graded`} />
        <Figure label="Attendance" value={`${attendancePct(db, me.id, me.cohortId, now)}%`} sub="of live classes" />
      </div>
      {targetPct !== undefined && latest !== null && (
        <div className="mt-3 flex items-center gap-4 text-[13px] text-navy/55">
          <Bar value={(latest / targetPct) * 100} className="flex-1" />
          {latest >= targetPct ? "On target" : `${targetPct - latest} points to your target`}
        </div>
      )}

      <div className="mt-8">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "gradebook", label: "Gradebook", count: items.length || undefined },
            { value: "trend", label: "Trend" },
            { value: "topics", label: "Topics", count: mastery.length || undefined },
          ]}
        />
      </div>

      <div className="mt-4">
        {tab === "gradebook" && (
          <Table
            head={[{ label: "Assignment" }, { label: "Type" }, { label: "Due" }, { label: "Returned" }, { label: "Score", align: "right" }, { label: "%", align: "right" }]}
          >
            {items.length === 0 ? (
              <EmptyRow cols={6}>No assignments yet.</EmptyRow>
            ) : (
              items.map(({ a, sub }) => {
                const done = sub?.status === "marked";
                return (
                  <RowLink key={a.id} onClick={() => router.push(`/portal/student/assignments/?open=${a.id}`)}>
                    <Td className="font-medium text-navy">{a.title}</Td>
                    <Td className="whitespace-nowrap">{a.kind}</Td>
                    <Td className="whitespace-nowrap">{fmtDate(a.dueAt)}</Td>
                    <Td className="whitespace-nowrap">
                      {done ? fmtDate(sub!.markedAt!) : sub ? <Status>Being marked</Status> : <span className="text-navy/40">Not submitted</span>}
                    </Td>
                    <Td align="right" className="whitespace-nowrap tabular-nums">
                      {done ? (
                        <span className="font-semibold text-navy">
                          {sub!.marks} <span className="font-normal text-navy/45">/ {a.maxMarks}</span>
                        </span>
                      ) : (
                        <span className="text-navy/40">– / {a.maxMarks}</span>
                      )}
                    </Td>
                    <Td align="right" className="tabular-nums font-semibold text-navy">
                      {done ? `${Math.round(((sub!.marks ?? 0) / a.maxMarks) * 100)}%` : <span className="font-normal text-navy/40">–</span>}
                    </Td>
                  </RowLink>
                );
              })
            )}
          </Table>
        )}

        {tab === "trend" && (
          <div className="rounded-xl border border-navy/12 p-5">
            <TrendChart points={history} target={targetPct} targetLabel={me.target ? `${me.target} line` : undefined} />
          </div>
        )}

        {tab === "topics" && (
          <Table minWidth={520} head={[{ label: "Topic" }, { label: "Score" }, { label: "What to work on" }]}>
            {mastery.length === 0 ? (
              <EmptyRow cols={3}>Your teacher adds your strongest and weakest topics here as your work is marked.</EmptyRow>
            ) : (
              mastery.map((m, i) => (
                <tr key={m.unit}>
                  <Td className="font-medium text-navy">
                    {m.unit}
                    {i < 2 && (
                      <span className="ml-2">
                        <Status tone="attention">Focus</Status>
                      </span>
                    )}
                  </Td>
                  <Td className="w-48">
                    <div className="flex items-center gap-3">
                      <Bar value={m.score} className="flex-1" />
                      <span className="w-10 text-right font-semibold tabular-nums text-navy">{m.score}%</span>
                    </div>
                  </Td>
                  <Td className="text-navy/65">{m.fix || "—"}</Td>
                </tr>
              ))
            )}
          </Table>
        )}
      </div>
    </>
  );
}
