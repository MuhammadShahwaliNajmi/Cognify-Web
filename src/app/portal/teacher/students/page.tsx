"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { attendancePct, averagePct, cohortOf, useTeacher } from "@/lib/portal/store";
import { fmtDate } from "@/lib/portal/format";
import type { Student } from "@/lib/portal/types";
import { Avatar, Bar, Btn, Card, Chip, Empty, Label, Modal, PageHeader, Rise, Segmented, Stat, fieldCls } from "@/components/portal/ui";
import { Spark, TrendChart } from "@/components/portal/charts";

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
  const [cohortId, setCohortId] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const students = db.students
    .filter((s) => cohortId === "all" || s.cohortId === cohortId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const open = db.students.find((s) => s.id === openId) ?? null;

  return (
    <>
      <PageHeader eyebrow={`${db.students.length} enrolled`} title="Your" gold="Students" sub="Attendance, marks and predicted grades for every student. Open a name for the full picture." />

      <Rise i={0}>
        <Segmented
          value={cohortId}
          onChange={setCohortId}
          options={[{ value: "all", label: "All students" }, ...db.cohorts.map((c) => ({ value: c.id, label: c.name }))]}
        />
      </Rise>

      <Rise i={1} className="mt-5">
        <Card className="!p-0">
          {/* column headings (desktop) */}
          <div className="hidden grid-cols-[minmax(0,2.2fr)_0.8fr_1.2fr_1fr_1fr_1.1fr_1.5rem] items-center gap-4 border-b border-navy/10 px-6 py-3.5 md:grid">
            {["Student", "Plan", "Attendance", "Average", "Predicted", "Trend", ""].map((h) => (
              <Label key={h}>{h}</Label>
            ))}
          </div>
          <ul>
            {students.map((s) => {
              const att = attendancePct(db, s.id, s.cohortId, now);
              const avg = averagePct(db, s.id);
              const hist = db.progress.find((p) => p.studentId === s.id)?.history;
              return (
                <li key={s.id} className="border-t border-navy/10 first:border-t-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(s.id)}
                    className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-5 py-4 text-left transition-colors hover:bg-navy/[0.025] focus-gold md:grid-cols-[minmax(0,2.2fr)_0.8fr_1.2fr_1fr_1fr_1.1fr_1.5rem] md:px-6"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={s.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold tracking-tight text-navy transition-colors group-hover:text-gold">
                          {s.name}
                        </span>
                        <span className="block truncate text-[13px] text-navy/50">{cohortOf(db, s.cohortId).name}</span>
                      </span>
                    </span>
                    <span className="justify-self-end md:justify-self-start">
                      <Chip tone={s.plan === "Elite" ? "navy" : s.plan === "Core" ? "soft" : "outline"}>{s.plan}</Chip>
                    </span>

                    {/* phone: one compact stats line */}
                    <span className="col-span-2 flex items-center gap-4 text-[13px] text-navy/60 md:hidden">
                      <span>
                        <span className="font-semibold text-navy">{att}%</span> attendance
                      </span>
                      <span>
                        <span className="font-semibold text-navy">{avg ?? "–"}%</span> average
                      </span>
                      <span>
                        predicted <span className="font-semibold text-navy">{s.predicted || "–"}</span>
                      </span>
                    </span>

                    <span className="hidden items-center gap-2.5 md:flex">
                      <Bar value={att} className="w-16" />
                      <span className="text-sm font-medium tabular-nums text-navy">{att}%</span>
                    </span>
                    <span className="hidden text-sm font-medium tabular-nums text-navy md:block">{avg !== null ? `${avg}%` : "–"}</span>
                    <span className="hidden text-sm md:block">
                      <span className="font-semibold text-navy">{s.predicted || "–"}</span>
                      {s.target && <span className="text-navy/40"> → {s.target}</span>}
                    </span>
                    <span className="hidden md:block">{hist && <Spark points={hist} className="h-7 w-24" />}</span>
                    <ChevronRight size={16} className="hidden text-navy/30 transition-all group-hover:translate-x-0.5 group-hover:text-gold md:block" />
                  </button>
                </li>
              );
            })}
          </ul>
          {students.length === 0 && (
            <div className="p-5">
              <Empty
                icon={<ChevronRight size={20} />}
                title="No students have joined yet"
                text="Students appear here once they sign in with Google and enter their class code. You'll find each code under Classes."
                action={
                  <Btn variant="navy" href="/portal/teacher/classes/">
                    See join codes
                  </Btn>
                }
              />
            </div>
          )}
        </Card>
      </Rise>

      <Modal open={!!open} onClose={() => setOpenId(null)} eyebrow="Student profile" title={open?.name ?? ""}>
        {open && <Profile key={open.id} s={open} />}
      </Modal>
    </>
  );
}
