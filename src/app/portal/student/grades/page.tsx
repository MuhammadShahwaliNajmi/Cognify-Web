"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { attendancePct, gradingText, isScored, scoreText, submissionFor, workHref } from "@/lib/portal/selectors";
import { useStudent } from "@/lib/portal/store";
import { fmtDate } from "@/lib/portal/format";
import { Bar, EmptyRow, PageHeader, RowLink, Segmented, Status, Table, Td } from "@/components/portal/ui";
import { TrendChart } from "@/components/portal/charts";
import { gradeMinPct, predictGrade } from "@/lib/portal/insights";

function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] text-navy">{label}</p>
      <p className="mt-1 text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums text-navy">{value}</p>
      {sub && <p className="mt-1.5 text-[13px] text-navy">{sub}</p>}
    </div>
  );
}

export default function StudentGrades() {
  const { db, me, now } = useStudent();
  const router = useRouter();
  const [tab, setTab] = useState<"gradebook" | "trend">("gradebook");
  const progress = db.progress.find((p) => p.studentId === me.id);
  const history = progress?.history ?? [];

  const predicted = predictGrade(db, me, now, { readOnly: true });
  const latest = predicted?.pct ?? null;
  const targetPct = gradeMinPct(db, me, me.target);
  const items = db.assignments
    .filter((a) => a.cohortId === me.cohortId)
    .map((a) => ({ a, sub: submissionFor(db, a.id, me.id) }))
    .sort((x, y) => new Date(y.a.dueAt).getTime() - new Date(x.a.dueAt).getTime());
  const graded = items.filter((r) => r.sub?.status === "marked");
  // scores count once the feedback has been read (comments first)
  const read = graded.filter((r) => r.sub!.seenAt && isScored(r.a));
  const got = read.reduce((n, r) => n + (r.sub!.marks ?? 0), 0);
  const max = read.reduce((n, r) => n + r.a.maxMarks, 0);
  const unread = graded.filter((r) => !r.sub!.seenAt).length;

  return (
    <>
      <PageHeader title="Grades" />

      <div className="grid grid-cols-2 gap-6 rounded-xl border border-navy/12 p-5 sm:grid-cols-4">
        <Figure
          label="Predicted grade"
          value={predicted?.grade ?? "–"}
          sub={
            predicted
              ? `from ${predicted.pieces} marked piece${predicted.pieces === 1 ? "" : "s"} and attendance`
              : "after your first marked work"
          }
        />
        <Figure label="Target" value={me.target || "–"} />
        <Figure
          label="Overall"
          value={max ? `${Math.round((got / max) * 100)}%` : "–"}
          sub={unread ? `${unread} new feedback to read` : `${graded.length} graded`}
        />
        <Figure label="Attendance" value={`${attendancePct(db, me.id, me.cohortId, now)}%`} />
      </div>
      {targetPct !== undefined && latest !== null && (
        <div className="mt-3 flex items-center gap-4 text-[13px] text-navy">
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
          ]}
        />
      </div>

      <div className="mt-4">
        {tab === "gradebook" && (
          <Table
            head={[
              { label: "Assignment" },
              { label: "Type" },
              { label: "Due" },
              { label: "Returned" },
              { label: "Score", align: "right" },
              { label: "%", align: "right" },
            ]}
          >
            {items.length === 0 ? (
              <EmptyRow cols={6}>No assignments yet.</EmptyRow>
            ) : (
              items.map(({ a, sub }) => {
                const done = sub?.status === "marked";
                return (
                  <RowLink key={a.id} onClick={() => router.push(workHref(a))}>
                    <Td className="font-medium text-navy">{a.title}</Td>
                    <Td className="whitespace-nowrap">{a.kind}</Td>
                    <Td className="whitespace-nowrap">{fmtDate(a.dueAt)}</Td>
                    <Td className="whitespace-nowrap">
                      {done ? (
                        fmtDate(sub!.markedAt!)
                      ) : sub ? (
                        <Status>Being marked</Status>
                      ) : (
                        <span className="text-navy">Not submitted</span>
                      )}
                    </Td>
                    <Td align="right" className="whitespace-nowrap tabular-nums">
                      {done && !sub!.seenAt ? (
                        <span className="font-medium text-navy underline decoration-gold decoration-2 underline-offset-4">
                          New feedback
                        </span>
                      ) : done ? (
                        <span className="font-semibold text-navy">{scoreText(a, sub!.marks)}</span>
                      ) : (
                        <span className="text-navy">{a.grading === "marks" ? `– / ${a.maxMarks}` : gradingText(a)}</span>
                      )}
                    </Td>
                    <Td align="right" className="tabular-nums font-semibold text-navy">
                      {done && sub!.seenAt && isScored(a) ? (
                        `${Math.round(((sub!.marks ?? 0) / a.maxMarks) * 100)}%`
                      ) : (
                        <span className="font-normal text-navy">–</span>
                      )}
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
      </div>
    </>
  );
}
