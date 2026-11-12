"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { attendancePct, averagePct, cohortOf, useTeacher } from "@/lib/portal/store";
import { fmtDate } from "@/lib/portal/format";
import type { Student } from "@/lib/portal/types";
import { Avatar, Btn, Chip, Empty, Label, Modal, PageHeader, Rise, Stat, fieldCls } from "@/components/portal/ui";
import { TrendChart } from "@/components/portal/charts";

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
          <p className="truncate text-sm text-navy/55">{s.email}</p>
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

      <div className="mt-5">
        <Label>Work this term</Label>
        <ul className="mt-2">
          {work.map(({ a, sub }) => (
            <li key={a.id} className="flex items-center gap-3 border-t border-navy/10 py-3 first:border-t-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium tracking-tight text-navy">{a.title}</p>
                <p className="text-xs text-navy/45">
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

  const students = [...db.students].sort((a, b) => a.name.localeCompare(b.name));
  const open = db.students.find((s) => s.id === openId) ?? null;
  const waiting = db.cohorts.filter((c) => !db.students.some((s) => s.cohortId === c.id));

  return (
    <>
      <PageHeader title="Students" sub="Open a student for their grades, attendance and work." />

      <Rise i={0}>
        {students.length === 0 ? (
          <Empty
            icon={<ChevronRight size={20} />}
            title="No students have joined yet"
            text="Students appear here once they sign in with Google and enter their join code. Each code is under Classes → Setup."
            action={
              <Btn variant="navy" href="/portal/teacher/classes/">
                Go to Classes
              </Btn>
            }
          />
        ) : (
          <ul className="divide-y divide-navy/10 border-y border-navy/10">
            {students.map((s) => {
              const att = attendancePct(db, s.id, s.cohortId, now);
              const avg = averagePct(db, s.id);
              const c = cohortOf(db, s.cohortId);
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => setOpenId(s.id)} className="group flex w-full items-center gap-4 py-4 text-left focus-gold">
                    <Avatar name={s.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium tracking-tight text-navy group-hover:text-gold">{s.name}</span>
                      <span className="mt-0.5 block truncate text-[13px] text-navy/50">
                        {[c.board, c.subject].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="hidden w-24 text-right text-sm text-navy/55 sm:block">{att}% attended</span>
                    <span className="hidden w-20 text-right text-sm text-navy/55 sm:block">{avg !== null ? `${avg}% avg` : "–"}</span>
                    <span className="w-16 text-right text-[15px] font-semibold text-navy">
                      {s.predicted || "–"}
                      {s.target && <span className="font-normal text-navy/40"> → {s.target}</span>}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-navy/25 group-hover:text-gold" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {students.length > 0 && waiting.length > 0 && (
          <p className="mt-5 text-sm text-navy/50">
            Not joined yet: {waiting.map((c) => c.name).join(", ")}. Their join codes are under Classes → Setup.
          </p>
        )}
      </Rise>

      <Modal open={!!open} onClose={() => setOpenId(null)} title={open?.name ?? ""}>
        {open && <Profile key={open.id} s={open} />}
      </Modal>
    </>
  );
}
