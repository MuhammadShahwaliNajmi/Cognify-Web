"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Copy, Plus, Trash2, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { attendancePct, averagePct, cohortOf, scoreText } from "@/lib/portal/selectors";
import { useTeacher } from "@/lib/portal/store";
import { ProgressReport } from "@/components/portal/report";
import { ParentAccess } from "@/components/portal/parent-access";
import { fmtDate, fmtTime, minutesBetween, classLengthOk, fmtLength } from "@/lib/portal/format";
import type { Student } from "@/lib/portal/types";
import { Avatar, Btn, Chip, Field, Label, Stat, Segmented, fieldCls } from "@/components/portal/ui";
import { TrendChart } from "@/components/portal/charts";
import { predictGrade } from "@/lib/portal/insights";
import { ClassSetup, ScheduleForm } from "@/components/portal/class-tools";
import { describeRule } from "@/lib/portal/series";

/** The student's exam date: their home screen counts down to it. */
function ExamDateForm({ cohortId }: { cohortId: string }) {
  const { db, setExamDate, toast } = useTeacher();
  const saved = db.cohorts.find((c) => c.id === cohortId)?.examOn ?? "";
  const [date, setDate] = useState(saved);
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <label className="w-44">
        <span className="text-[12px] font-semibold text-navy">Exam date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldCls} />
      </label>
      <Btn
        variant="navy"
        disabled={date === saved || busy}
        onClick={async () => {
          setBusy(true);
          const ok = await setExamDate(cohortId, date);
          setBusy(false);
          if (ok) toast(date ? "Exam date saved" : "Exam date removed");
        }}
        className="mb-0.5"
      >
        {busy ? "Saving…" : "Save date"}
      </Btn>
    </div>
  );
}

/** Target grade — set by the teacher (the predicted grade is worked out from their work). */
function GradeForm({ s }: { s: Student }) {
  const { updateStudent, toast } = useTeacher();
  const [target, setTarget] = useState(s.target);
  const [busy, setBusy] = useState(false);
  const changed = target.trim() !== s.target;
  return (
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <label className="w-28">
        <span className="text-[12px] font-semibold text-navy">Target</span>
        <input value={target} onChange={(e) => setTarget(e.target.value.slice(0, 6))} placeholder="A* / 7" className={fieldCls} />
      </label>
      <Btn
        variant="navy"
        disabled={!changed || busy}
        onClick={async () => {
          setBusy(true);
          const ok = await updateStudent(s.id, { predicted: s.predicted, target });
          setBusy(false);
          if (ok) toast("Target saved");
        }}
        className="mb-0.5"
      >
        {busy ? "Saving…" : "Save target"}
      </Btn>
    </div>
  );
}

/** A student who hasn't joined yet: their class set-up, timetable, teacher, archive. */
export function PendingStudent({ cohortId, name, onArchived }: { cohortId: string; name: string; onArchived: () => void }) {
  return (
    <>
      <ClassSetup cohortId={cohortId} />
      <RepeatingClasses cohortId={cohortId} />
      <TeacherOf cohortId={cohortId} />
      <ArchiveStudent cohortId={cohortId} name={name} onArchived={onArchived} />
    </>
  );
}

/** A student's profile (teacher side): figures, then Overview / Report / Settings. Used on Students and the dashboard. */
export function StudentProfile({ s, onArchived }: { s: Student; onArchived: () => void }) {
  const { db, now } = useTeacher();
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "report" | "settings">("overview");
  const predicted = predictGrade(db, s, now);
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
        <Stat
          label="Predicted"
          value={predicted?.grade ?? "–"}
          sub={
            predicted
              ? `${predicted.pct}% · ${predicted.pieces} marked${predicted.missed ? ` · ${predicted.missed} missed` : ""}${s.target ? ` · target ${s.target}` : ""}`
              : "after the first marked work"
          }
        />
        <Stat label="Attendance" value={`${attendancePct(db, s.id, s.cohortId, now)}%`} />
        <Stat label="Average" value={averagePct(db, s.id) !== null ? `${averagePct(db, s.id)}%` : "–"} />
      </div>

      <Segmented
        className="mt-6"
        value={tab}
        onChange={setTab}
        options={[
          { value: "overview", label: "Overview" },
          { value: "report", label: "Report" },
          { value: "settings", label: "Settings" },
        ]}
      />

      {tab === "overview" && (
        <>
          {progress && (
            <div className="mt-6">
              <Label>Grade trend</Label>
              <div className="mt-2">
                <TrendChart points={progress.history} />
              </div>
            </div>
          )}
          <div className="mt-6">
            <Label>Work this term</Label>
            <ul className="mt-2">
              {work.map(({ a, sub }) => {
                const body = (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium tracking-tight text-navy">{a.title}</p>
                      <p className="text-xs text-navy">
                        {a.kind} · due {fmtDate(a.dueAt)}
                      </p>
                    </div>
                    {sub?.status === "marked" ? (
                      <Chip tone="navy">{scoreText(a, sub.marks)}</Chip>
                    ) : sub ? (
                      <Chip tone="soft" dot>
                        To mark
                      </Chip>
                    ) : new Date(a.dueAt).getTime() < now ? (
                      <Chip tone="gold">Not handed in</Chip>
                    ) : (
                      <Chip tone="outline">Open</Chip>
                    )}
                  </>
                );
                return (
                  <li key={a.id} className="border-t border-navy/10 first:border-t-0">
                    {sub ? (
                      <button
                        type="button"
                        onClick={() => router.push(`/portal/teacher/submissions/?back=1&open=${sub.id}`)}
                        className="flex w-full items-center gap-3 py-3 text-left hover:bg-navy/[0.03] focus-gold"
                      >
                        {body}
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 py-3">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {tab === "report" && <ProgressReport key={s.id} s={s} />}

      {tab === "settings" && (
        <>
          <GradeForm key={`target-${s.target}`} s={s} />
          <ExamDateForm key={`exam-${s.cohortId}`} cohortId={s.cohortId} />
          <ParentAccess key={`parents-${s.id}`} studentId={s.id} />
          <div className="mt-6 border-t border-navy/10 pt-5">
            <ClassSetup cohortId={s.cohortId} />
          </div>
          <RepeatingClasses cohortId={s.cohortId} />
          <TeacherOf cohortId={s.cohortId} />
          <ArchiveStudent cohortId={s.cohortId} name={s.name} onArchived={onArchived} />
        </>
      )}
    </div>
  );
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type Slot = { weekday: number; start: string; end: string };
const NEW_SLOT: Slot = { weekday: 1, start: "18:00", end: "19:00" };
const slotsOk = (slots: Slot[]) => slots.every((x) => x.start && classLengthOk(minutesBetween(x.start, x.end)));
const toRpcSlots = (slots: Slot[]) => slots.map((x) => ({ weekday: x.weekday, start: x.start, duration: minutesBetween(x.start, x.end) }));
/** "18:00" + 90 minutes → "19:30" */
const endOf = (start: string, minutes: number) => {
  const [h, m] = start.split(":").map(Number);
  const t = (h * 60 + m + minutes) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/** The weekly class times of one student: day, start and end for each. */
function SlotEditor({ slots, onChange }: { slots: Slot[]; onChange: (slots: Slot[]) => void }) {
  const setSlot = (i: number, patch: Partial<Slot>) => onChange(slots.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div>
      <Label>Weekly classes</Label>
      <ul className="mt-2 space-y-2">
        {slots.map((x, i) => (
          <li key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 sm:flex sm:flex-wrap">
            {/* phones: the day and the remove button on one line, the times underneath */}
            <select
              value={x.weekday}
              onChange={(e) => setSlot(i, { weekday: Number(e.target.value) })}
              className={cn(fieldCls, "order-1 col-span-3 !mt-0 sm:order-none sm:w-40")}
            >
              {DAYS.map((d, j) => (
                <option key={d} value={j + 1}>
                  {d}
                </option>
              ))}
            </select>
            <input
              type="time"
              aria-label="Start"
              value={x.start}
              onChange={(e) => setSlot(i, { start: e.target.value })}
              className={cn(fieldCls, "order-3 !mt-0 min-w-0 !px-3 sm:order-none sm:w-36")}
            />
            <span className="order-4 text-sm text-navy sm:order-none">to</span>
            <input
              type="time"
              aria-label="End"
              value={x.end}
              onChange={(e) => setSlot(i, { end: e.target.value })}
              className={cn(fieldCls, "order-5 !mt-0 min-w-0 !px-3 sm:order-none sm:w-36")}
            />
            <span className="order-6 w-14 text-sm text-navy sm:order-none sm:w-16">
              {classLengthOk(minutesBetween(x.start, x.end)) ? fmtLength(minutesBetween(x.start, x.end)) : "—"}
            </span>
            <button
              type="button"
              aria-label="Remove this class time"
              onClick={() => onChange(slots.filter((_, j) => j !== i))}
              className="order-2 grid h-9 w-9 place-items-center justify-self-end rounded-md text-navy hover:bg-navy/[0.06] focus-gold sm:order-none"
            >
              <X size={15} />
            </button>
          </li>
        ))}
      </ul>
      <Btn variant="ghost" size="sm" className="mt-2" onClick={() => onChange([...slots, NEW_SLOT])}>
        <Plus size={14} /> Add class time
      </Btn>
    </div>
  );
}

/** "18:00" → "6:00 PM" (the viewer's own clock style) */
const clock = (hm: string) => fmtTime(`2000-01-01T${hm}`);

/** A student's repeating classes (the calendar's series): see them, stop one, or add a class. */
function RepeatingClasses({ cohortId }: { cohortId: string }) {
  const { db, endSeries, toast } = useTeacher();
  const [adding, setAdding] = useState(false);
  const [stopping, setStopping] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = db.timetable.filter((t) => t.cohortId === cohortId);
  const series = Array.from(new Set(rows.map((t) => t.seriesId ?? t.id ?? ""))).map((key) => {
    const mine = rows.filter((t) => (t.seriesId ?? t.id ?? "") === key);
    const t = mine[0];
    return {
      key,
      seriesId: t.seriesId,
      title: t.title || "Class",
      unit: t.unit || "",
      time: `${clock(t.start)} – ${clock(endOf(t.start, t.durationMin))}`,
      rule: describeRule({ weekdays: mine.map((x) => x.weekday), everyWeeks: t.everyWeeks ?? 1, endsOn: t.endsOn ?? null }),
    };
  });
  const cohort = cohortOf(db, cohortId);

  return (
    <div className="mt-6 border-t border-navy/10 pt-5">
      <Label>Repeating classes</Label>
      <ul className="mt-2">
        {series.length === 0 && <li className="py-2 text-sm text-navy">None yet.</li>}
        {series.map((x) => (
          <li key={x.key} className="border-t border-navy/10 py-3 first:border-t-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy">
                  {x.title}
                  {x.unit && <span className="font-normal"> · {x.unit}</span>}
                </p>
                <p className="text-[13px] text-navy">
                  {x.rule} · {x.time}
                </p>
              </div>
              {x.seriesId && stopping !== x.key && (
                <Btn variant="ghost" size="sm" onClick={() => setStopping(x.key)}>
                  <X size={14} /> Stop
                </Btn>
              )}
            </div>
            {stopping === x.key && x.seriesId && (
              <div className="mt-3 flex flex-wrap items-center gap-2.5 rounded-xl border-l-[3px] border-gold bg-navy/[0.04] p-3">
                <p className="flex-1 text-sm font-semibold text-navy">Cancel all upcoming classes in this series?</p>
                <Btn
                  variant="navy"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const ok = await endSeries(x.seriesId!, null);
                    setBusy(false);
                    if (!ok) return;
                    setStopping(null);
                    toast("Repeating class stopped");
                  }}
                >
                  {busy ? "Stopping…" : "Stop classes"}
                </Btn>
                <Btn variant="ghost" size="sm" onClick={() => setStopping(null)}>
                  Keep
                </Btn>
              </div>
            )}
          </li>
        ))}
      </ul>
      {adding ? (
        <div className="mt-3 rounded-2xl border border-navy/10 p-4">
          <ScheduleForm cohorts={[{ id: cohort.id, name: cohort.name }]} onDone={() => setAdding(false)} />
          <Btn variant="ghost" size="sm" className="mt-3" onClick={() => setAdding(false)}>
            Close
          </Btn>
        </div>
      ) : (
        <Btn variant="outline" size="sm" className="mt-2" onClick={() => setAdding(true)}>
          <Plus size={14} /> Add class
        </Btn>
      )}
    </div>
  );
}

/** Add a student: their class, join code, weekly timetable and (optionally) their login. */
export function AddStudent({ onClose }: { onClose: () => void }) {
  const { db, me, addStudent, toast } = useTeacher();
  const [teacherId, setTeacherId] = useState(me.id);
  const [f, setF] = useState({ name: "", board: "IB", subject: "Economics", email: "", meetUrl: "" });
  const [slots, setSlots] = useState<Slot[]>([NEW_SLOT]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string; code: string; email: string } | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: string) => setF((x) => ({ ...x, [k]: v }));
  const emailOk = !f.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim());
  const meetOk = !f.meetUrl.trim() || /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(f.meetUrl.trim());
  const ok = f.name.trim() && emailOk && meetOk && slotsOk(slots);

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
      {me.isAdmin && db.teachers.length > 1 && (
        <Field label="Teacher">
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={fieldCls}>
            {db.teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.id === me.id ? " (you)" : ""}
              </option>
            ))}
          </select>
        </Field>
      )}
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
          <input
            value={f.email}
            onChange={(e) => set("email", e.target.value)}
            inputMode="email"
            placeholder="Leave empty to use a join code"
            className={fieldCls}
          />
        </Field>
        <Field label="Google Meet link (optional)">
          <input
            value={f.meetUrl}
            onChange={(e) => set("meetUrl", e.target.value)}
            inputMode="url"
            placeholder="https://meet.google.com/abc-defg-hij"
            className={fieldCls}
          />
        </Field>
      </div>
      {!emailOk && <p className="-mt-2 text-xs font-medium text-navy">Check the email address.</p>}
      {!meetOk && <p className="-mt-2 text-xs font-medium text-navy">A Meet link looks like https://meet.google.com/abc-defg-hij</p>}

      <SlotEditor slots={slots} onChange={setSlots} />

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
            teacherId: me.isAdmin ? teacherId : undefined,
            slots: toRpcSlots(slots),
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

/** Admin: which teacher a student belongs to. */
function TeacherOf({ cohortId }: { cohortId: string }) {
  const { db, me, assignTeacher, toast } = useTeacher();
  const cohort = db.cohorts.find((c) => c.id === cohortId);
  if (!me.isAdmin || !cohort) return null;
  return (
    <div className="mt-6 border-t border-navy/10 pt-5">
      <Field label="Teacher">
        <select
          value={cohort.teacherId}
          onChange={async (e) => {
            if (await assignTeacher(cohortId, e.target.value || null)) toast("Teacher changed");
          }}
          className={fieldCls}
        >
          <option value="">Unassigned (admin only)</option>
          {db.teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

/** Take a student out of the portal without deleting anything (asks first). */
function ArchiveStudent({ cohortId, name, onArchived }: { cohortId: string; name: string; onArchived: () => void }) {
  const { archiveStudent, toast } = useTeacher();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-6 border-t border-navy/10 pt-5">
      {!confirm ? (
        <Btn variant="ghost" size="sm" onClick={() => setConfirm(true)}>
          <Archive size={14} /> Archive student
        </Btn>
      ) : (
        <div className="rounded-xl border-l-[3px] border-gold bg-navy/[0.04] p-4">
          <p className="text-[15px] font-semibold text-navy">Archive {name}?</p>
          <p className="mt-1 text-sm text-navy">
            They lose access and their upcoming classes are removed. Nothing is deleted, and you can restore them.
          </p>
          <div className="mt-3 flex gap-2.5">
            <Btn
              variant="navy"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await archiveStudent(cohortId, true);
                setBusy(false);
                if (!ok) return;
                toast(`${name} archived`);
                onArchived();
              }}
            >
              <Archive size={14} /> {busy ? "Archiving…" : "Archive"}
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

/** An archived student: bring them back, or delete them for good. */
export function ArchivedStudent({ cohortId, name, onDone }: { cohortId: string; name: string; onDone: () => void }) {
  const { archiveStudent, removeStudent, toast } = useTeacher();
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<boolean>, done: string) => {
    setBusy(true);
    const ok = await fn();
    setBusy(false);
    if (!ok) return;
    toast(done);
    onDone();
  };
  return (
    <div className="space-y-6">
      <Btn variant="gold" disabled={busy} onClick={() => act(() => archiveStudent(cohortId, false), `${name} restored`)}>
        <ArchiveRestore size={15} /> Restore
      </Btn>
      <div className="rounded-xl border-l-[3px] border-gold bg-navy/[0.04] p-4">
        <p className="text-[15px] font-semibold text-navy">Delete {name} for good?</p>
        <p className="mt-1 text-sm text-navy">
          This permanently deletes their classes, assignments, assessments, submissions, marks and folders in the portal. Files already in
          Google Drive stay there.
        </p>
        <Btn
          variant="navy"
          size="sm"
          className="mt-3"
          disabled={busy}
          onClick={() => act(() => removeStudent(cohortId), `${name} deleted`)}
        >
          <Trash2 size={14} /> Delete permanently
        </Btn>
      </div>
    </div>
  );
}
