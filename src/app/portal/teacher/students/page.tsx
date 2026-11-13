"use client";

import { useState } from "react";
import { Copy, Plus, Trash2, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { attendancePct, averagePct, cohortOf } from "@/lib/portal/selectors";
import { useTeacher } from "@/lib/portal/store";
import { fmtDate } from "@/lib/portal/format";
import type { Student } from "@/lib/portal/types";
import { Avatar, Btn, Chip, EmptyRow, Field, Label, Modal, PageHeader, RowLink, Stat, Status, Table, Td, fieldCls } from "@/components/portal/ui";
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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type Slot = { weekday: number; start: string; duration: number };

/** Add a student: their class, join code, weekly timetable and (optionally) their login. */
function AddStudent({ onClose }: { onClose: () => void }) {
  const { addStudent, toast } = useTeacher();
  const [f, setF] = useState({ name: "", board: "IB", subject: "Economics", email: "", meetUrl: "" });
  const [slots, setSlots] = useState<Slot[]>([{ weekday: 1, start: "18:00", duration: 60 }]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string; code: string; email: string } | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: string) => setF((x) => ({ ...x, [k]: v }));
  const setSlot = (i: number, patch: Partial<Slot>) => setSlots((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const emailOk = !f.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim());
  const meetOk = !f.meetUrl.trim() || /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(f.meetUrl.trim());
  const ok = f.name.trim() && emailOk && meetOk && slots.every((x) => x.start);

  if (done) {
    return (
      <div className="space-y-5">
        <p className="text-[15px] text-navy">
          <span className="font-semibold">{done.name}</span> has been added.
          {done.email ? ` They can sign in with ${done.email} straight away.` : " Send them this join code:"}
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-lg bg-navy-deep px-4 py-2 font-mono text-lg tracking-[0.2em] text-gold">{done.code}</span>
          <Btn variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(done.code).then(() => toast("Code copied"))}>
            <Copy size={13} /> Copy
          </Btn>
        </div>
        <Btn variant="navy" onClick={onClose}>
          Done
        </Btn>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Field label="Student name">
        <input value={f.name} onChange={(e) => set("name", e.target.value)} className={fieldCls} />
      </Field>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Board">
          <input value={f.board} onChange={(e) => set("board", e.target.value)} list="boards" className={fieldCls} />
          <datalist id="boards">
            {["IB", "A Level", "O Level", "IGCSE", "FA", "IEO"].map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>
        <Field label="Subject">
          <input value={f.subject} onChange={(e) => set("subject", e.target.value)} className={fieldCls} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Student's Google email (optional)">
          <input value={f.email} onChange={(e) => set("email", e.target.value)} inputMode="email" placeholder="Leave empty to use a join code" className={fieldCls} />
        </Field>
        <Field label="Google Meet link (optional)">
          <input value={f.meetUrl} onChange={(e) => set("meetUrl", e.target.value)} inputMode="url" placeholder="https://meet.google.com/abc-defg-hij" className={fieldCls} />
        </Field>
      </div>
      {!emailOk && <p className="-mt-2 text-xs font-medium text-navy">Check the email address.</p>}
      {!meetOk && <p className="-mt-2 text-xs font-medium text-navy">A Meet link looks like https://meet.google.com/abc-defg-hij</p>}

      <div>
        <Label>Weekly classes</Label>
        <ul className="mt-2 space-y-2">
          {slots.map((x, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <select value={x.weekday} onChange={(e) => setSlot(i, { weekday: Number(e.target.value) })} className={cn(fieldCls, "!mt-0 w-40")}>
                {DAYS.map((d, j) => (
                  <option key={d} value={j + 1}>
                    {d}
                  </option>
                ))}
              </select>
              <input type="time" value={x.start} onChange={(e) => setSlot(i, { start: e.target.value })} className={cn(fieldCls, "!mt-0 w-32")} />
              <select value={x.duration} onChange={(e) => setSlot(i, { duration: Number(e.target.value) })} className={cn(fieldCls, "!mt-0 w-28")}>
                {[45, 60, 75, 90, 120].map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Remove this class time"
                onClick={() => setSlots((xs) => xs.filter((_, j) => j !== i))}
                className="grid h-9 w-9 place-items-center rounded-md text-navy hover:bg-navy/[0.06] focus-gold"
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
        <Btn variant="ghost" size="sm" className="mt-2" onClick={() => setSlots((xs) => [...xs, { weekday: 1, start: "18:00", duration: 60 }])}>
          <Plus size={14} /> Add class time
        </Btn>
      </div>

      <Btn
        variant="gold"
        size="lg"
        disabled={!ok || busy}
        onClick={async () => {
          setBusy(true);
          const res = await addStudent({
            name: f.name.trim(),
            board: f.board.trim(),
            subject: f.subject.trim(),
            email: f.email.trim(),
            meetUrl: f.meetUrl.trim(),
            slots,
          });
          setBusy(false);
          if (res) setDone({ name: f.name.trim(), code: res.joinCode, email: f.email.trim() });
        }}
      >
        <UserPlus size={16} />
        {busy ? "Adding…" : "Add student"}
      </Btn>
    </div>
  );
}

/** Remove a student and everything in their class (asks first). */
function RemoveStudent({ cohortId, name, onRemoved }: { cohortId: string; name: string; onRemoved: () => void }) {
  const { removeStudent, toast } = useTeacher();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-6 border-t border-navy/10 pt-5">
      {!confirm ? (
        <Btn variant="ghost" size="sm" onClick={() => setConfirm(true)}>
          <Trash2 size={14} /> Remove student
        </Btn>
      ) : (
        <div className="rounded-xl border-l-[3px] border-gold bg-navy/[0.04] p-4">
          <p className="text-[15px] font-semibold text-navy">Remove {name}?</p>
          <p className="mt-1 text-sm text-navy">
            This permanently deletes their classes, assignments, assessments, submissions, marks and folders in the portal. Files already in
            Google Drive stay there.
          </p>
          <div className="mt-3 flex gap-2.5">
            <Btn
              variant="navy"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await removeStudent(cohortId);
                setBusy(false);
                if (!ok) return;
                toast(`${name} removed`);
                onRemoved();
              }}
            >
              <Trash2 size={14} /> {busy ? "Removing…" : "Remove permanently"}
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => setConfirm(false)}>
              Keep
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherStudents() {
  const { db, now } = useTeacher();
  const [openId, setOpenId] = useState<string | null>(null);
  const [setupId, setSetupId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const students = [...db.students].sort((a, b) => a.name.localeCompare(b.name));
  const open = db.students.find((s) => s.id === openId) ?? null;
  const waiting = db.cohorts.filter((c) => !db.students.some((s) => s.cohortId === c.id));

  return (
    <>
      <PageHeader
        title="Students"
        actions={
          <Btn variant="navy" onClick={() => setAdding(true)}>
            <UserPlus size={15} /> Add student
          </Btn>
        }
      />

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
        {open && (
          <>
            <Profile key={open.id} s={open} />
            <RemoveStudent cohortId={open.cohortId} name={open.name} onRemoved={() => setOpenId(null)} />
          </>
        )}
      </Modal>
      <Modal open={!!setupId} onClose={() => setSetupId(null)} eyebrow="Not joined yet" title={db.cohorts.find((c) => c.id === setupId)?.name ?? ""}>
        {setupId && (
          <>
            <ClassSetup cohortId={setupId} />
            <RemoveStudent cohortId={setupId} name={db.cohorts.find((c) => c.id === setupId)?.name ?? "this student"} onRemoved={() => setSetupId(null)} />
          </>
        )}
      </Modal>
      <Modal open={adding} onClose={() => setAdding(false)} wide title="Add a student">
        {adding && <AddStudent onClose={() => setAdding(false)} />}
      </Modal>
    </>
  );
}
