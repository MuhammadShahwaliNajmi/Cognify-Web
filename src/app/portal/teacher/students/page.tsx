"use client";

import { useState } from "react";
import { attendancePct, averagePct, cohortOf } from "@/lib/portal/selectors";
import { useTeacher } from "@/lib/portal/store";
import { fmtDate } from "@/lib/portal/format";
import type { Student } from "@/lib/portal/types";
import { Avatar, Btn, Chip, EmptyRow, Label, Modal, PageHeader, RowLink, Stat, Status, Table, Td, fieldCls } from "@/components/portal/ui";
import { TrendChart } from "@/components/portal/charts";
import { ClassSetup } from "@/components/portal/class-tools";

/** Predicted and target grade — set by the teacher, shown to the student. */
function GradeForm({ s }: { s: Student }) {
  const { updateStudent, toast } = useTeacher();
  const [predicted, setPredicted] = useState(s.predicted);
  const [target, setTarget] = useState(s.target);
  const [busy, setBusy] = useState(false);
  const changed = predicted.trim() !== s.predicted || target.trim() !== s.target;
  return (
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <label className="w-28">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy">Predicted</span>
        <input value={predicted} onChange={(e) => setPredicted(e.target.value.slice(0, 4))} placeholder="A / 6" className={fieldCls} />
      </label>
      <label className="w-28">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy">Target</span>
        <input value={target} onChange={(e) => setTarget(e.target.value.slice(0, 4))} placeholder="A* / 7" className={fieldCls} />
      </label>
      <Btn
        variant="navy"
        disabled={!changed || busy}
        onClick={async () => {
          setBusy(true);
          const ok = await updateStudent(s.id, { predicted, target });
          setBusy(false);
          if (ok) toast("Grades saved");
        }}
        className="mb-0.5"
      >
        {busy ? "Saving…" : "Save grades"}
      </Btn>
    </div>
  );
}

function Profile({ s }: { s: Student }) {
  const { db, now } = useTeacher();
  const progress = db.progress.find((p) => p.studentId === s.id);
  const work = db.assignments
    .filter((a) => a.cohortId === s.cohortId)
    .sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime())
    .map((a) => ({ a, sub: db.submissions.find((x) => x.assignmentId === a.id && x.studentId === s.id) }));

  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar name={s.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm text-navy">{s.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip tone="navy">{s.plan}</Chip>
            <Chip tone="soft">{cohortOf(db, s.cohortId).name}</Chip>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 rounded-2xl bg-navy/[0.04] p-5">
        <Stat label="Predicted" value={s.predicted || "–"} sub={s.target ? `target ${s.target}` : "no target set"} />
        <Stat label="Attendance" value={`${attendancePct(db, s.id, s.cohortId, now)}%`} />
        <Stat label="Average" value={averagePct(db, s.id) !== null ? `${averagePct(db, s.id)}%` : "–"} />
      </div>
      <GradeForm key={`${s.predicted}|${s.target}`} s={s} />

      {progress && (
        <div className="mt-6">
          <Label>Grade trend</Label>
          <div className="mt-2">
            <TrendChart points={progress.history} />
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-navy/10 pt-5">
        <ClassSetup cohortId={s.cohortId} />
      </div>

      <div className="mt-6">
        <Label>Work this term</Label>
        <ul className="mt-2">
          {work.map(({ a, sub }) => (
            <li key={a.id} className="flex items-center gap-3 border-t border-navy/10 py-3 first:border-t-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium tracking-tight text-navy">{a.title}</p>
                <p className="text-xs text-navy">
                  {a.kind} · due {fmtDate(a.dueAt)}
                </p>
              </div>
              {sub?.status === "marked" ? (
                <Chip tone="navy">
                  {sub.marks} / {a.maxMarks}
                </Chip>
              ) : sub ? (
                <Chip tone="soft" dot>
                  To mark
                </Chip>
              ) : new Date(a.dueAt).getTime() < now ? (
                <Chip tone="gold">Not handed in</Chip>
              ) : (
                <Chip tone="outline">Open</Chip>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function TeacherStudents() {
  const { db, now } = useTeacher();
  const [openId, setOpenId] = useState<string | null>(null);
  const [setupId, setSetupId] = useState<string | null>(null);

  const students = [...db.students].sort((a, b) => a.name.localeCompare(b.name));
  const open = db.students.find((s) => s.id === openId) ?? null;
  const waiting = db.cohorts.filter((c) => !db.students.some((s) => s.cohortId === c.id));

  return (
    <>
      <PageHeader title="Students" />

      <Table
        minWidth={720}
        head={[
          { label: "Student" },
          { label: "Course" },
          { label: "Attendance", align: "right" },
          { label: "Average", align: "right" },
          { label: "Predicted", align: "right" },
          { label: "Target", align: "right" },
        ]}
      >
        {students.length === 0 && waiting.length === 0 ? (
          <EmptyRow cols={6}>No students yet.</EmptyRow>
        ) : (
          <>
            {students.map((s) => {
              const avg = averagePct(db, s.id);
              const c = cohortOf(db, s.cohortId);
              return (
                <RowLink key={s.id} onClick={() => setOpenId(s.id)}>
                  <Td>
                    <span className="block font-medium text-navy">{s.name}</span>
                    <span className="block text-[12px] text-navy">{s.email}</span>
                  </Td>
                  <Td className="whitespace-nowrap">{[c.board, c.subject].filter(Boolean).join(" · ") || "—"}</Td>
                  <Td align="right" className="tabular-nums">{attendancePct(db, s.id, s.cohortId, now)}%</Td>
                  <Td align="right" className="tabular-nums">{avg !== null ? `${avg}%` : "–"}</Td>
                  <Td align="right" className="font-semibold text-navy">{s.predicted || "–"}</Td>
                  <Td align="right">{s.target || "–"}</Td>
                </RowLink>
              );
            })}
            {waiting.map((c) => (
              <RowLink key={c.id} onClick={() => setSetupId(c.id)}>
                <Td>
                  <span className="block font-medium text-navy">{c.name}</span>
                  <span className="block text-[12px] text-navy">Join code {c.joinCode}</span>
                </Td>
                <Td className="whitespace-nowrap">{[c.board, c.subject].filter(Boolean).join(" · ") || "—"}</Td>
                <Td colSpan={4} align="right">
                  <Status tone="attention">Not joined yet</Status>
                </Td>
              </RowLink>
            ))}
          </>
        )}
      </Table>

      <Modal open={!!open} onClose={() => setOpenId(null)} title={open?.name ?? ""}>
        {open && <Profile key={open.id} s={open} />}
      </Modal>
      <Modal open={!!setupId} onClose={() => setSetupId(null)} eyebrow="Not joined yet" title={db.cohorts.find((c) => c.id === setupId)?.name ?? ""}>
        {setupId && <ClassSetup cohortId={setupId} />}
      </Modal>
    </>
  );
}
