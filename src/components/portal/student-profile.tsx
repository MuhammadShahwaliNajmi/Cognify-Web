"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Copy, Lock, Plus, Trash2, Unlock, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { attendancePct, averagePct, cohortOf, scoreText, studentsIn } from "@/lib/portal/selectors";
import { useTeacher } from "@/lib/portal/store";
import { ProgressReport } from "@/components/portal/report";
import { ParentAccess } from "@/components/portal/parent-access";
import { fmtDate, fmtTime, minutesBetween, classLengthOk, fmtLength } from "@/lib/portal/format";
import type { Student } from "@/lib/portal/types";
import { Avatar, Btn, Chip, Field, Label, Stat, Status, Segmented, fieldCls } from "@/components/portal/ui";
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

/** A group class's students: see who's in it, add one by Google email, or take one out. */
function GroupMembers({ cohortId }: { cohortId: string }) {
  const { db, addToGroup, toast } = useTeacher();
  const c = cohortOf(db, cohortId);
  const list = [...studentsIn(db, cohortId), ...db.inactive.filter((x) => x.cohortId === cohortId)].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const off = new Set(db.inactive.map((x) => x.id));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  return (
    <div className="mt-6 rounded-2xl border border-navy/12 p-5">
      <Label>
        {c.name}: {list.length} student{list.length === 1 ? "" : "s"}
      </Label>
      <ul className="mt-2 divide-y divide-navy/10">
        {list.map((st) => (
          <li key={st.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="block truncate text-[14.5px] font-semibold text-navy">
                  {st.name}
                  {off.has(st.id) && (
                    <span className="ml-2 align-middle">
                      <Status>Access off</Status>
                    </span>
                  )}
                </span>
                <span className="block truncate text-[12.5px] text-navy">{st.email}</span>
              </span>
            </div>
            <AccessControls s={st} compact />
          </li>
        ))}
      </ul>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.3fr_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          aria-label="New student's name"
          className={fieldCls + " !mt-0"}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Google email"
          inputMode="email"
          aria-label="New student's Google email"
          className={fieldCls + " !mt-0"}
        />
        <Btn
          variant="navy"
          disabled={!ok || busy}
          onClick={async () => {
            setBusy(true);
            const done = await addToGroup(cohortId, name, email);
            setBusy(false);
            if (!done) return;
            toast(`${name.trim() || email.trim()} added to the group`);
            setName("");
            setEmail("");
          }}
        >
          <UserPlus size={14} /> Add
        </Btn>
      </div>
      <p className="mt-2 text-[13px] text-navy">Students can also join with the group&apos;s join code above.</p>
    </div>
  );
}

/**
 * The two choices for a student: turn their portal access off or back on (everything is kept),
 * or delete them and everything about them for good (asks first).
 */
export function AccessControls({ s, compact = false, onDeleted }: { s: Student; compact?: boolean; onDeleted?: () => void }) {
  const { db, setAccess, deleteStudent, toast } = useTeacher();
  const on = !db.inactive.some((x) => x.id === s.id);
  const group = cohortOf(db, s.cohortId).isGroup;
  const [confirm, setConfirm] = useState<"off" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<boolean>, done: string, after?: () => void) => {
    setBusy(true);
    const ok = await fn();
    setBusy(false);
    setConfirm(null);
    if (!ok) return;
    toast(done);
    after?.();
  };
  return (
    <div className={compact ? "mt-2" : "mt-6 border-t border-navy/10 pt-5"}>
      {!compact && <Label>Portal access</Label>}
      {!compact && (
        <p className="mt-1 text-[14px] text-navy">
          {on ? `${s.name.split(" ")[0]} can sign in.` : `Access is off: ${s.name.split(" ")[0]} can't sign in. Their work is kept.`}
        </p>
      )}
      {confirm === null ? (
        <div className={cn("flex flex-wrap gap-2", !compact && "mt-3")}>
          {on ? (
            <Btn variant="outline" size="sm" disabled={busy} onClick={() => setConfirm("off")}>
              <Lock size={14} /> Turn off access
            </Btn>
          ) : (
            <Btn variant="navy" size="sm" disabled={busy} onClick={() => act(() => setAccess(s.id, true), `${s.name} can sign in again`)}>
              <Unlock size={14} /> Turn on access
            </Btn>
          )}
          <Btn variant="ghost" size="sm" disabled={busy} onClick={() => setConfirm("delete")}>
            <Trash2 size={14} /> Delete student
          </Btn>
        </div>
      ) : (
        <div className="mt-2 rounded-xl border-l-[3px] border-gold bg-navy/[0.04] p-4">
          <p className="text-[15px] font-semibold text-navy">
            {confirm === "off" ? `Turn off ${s.name}'s access?` : `Delete ${s.name} and everything about them?`}
          </p>
          <p className="mt-1 text-sm text-navy">
            {confirm === "off"
              ? "They can't sign in until you turn it back on. Their work, marks and attendance are kept."
              : `Their hand-ins, marks, feedback, attendance, comments and parent logins are deleted for good.${
                  group ? "" : " Their class, timetable and files go too."
                } This can't be undone.`}
          </p>
          <div className="mt-3 flex gap-2.5">
            <Btn
              variant="navy"
              size="sm"
              disabled={busy}
              onClick={() =>
                confirm === "off"
                  ? act(() => setAccess(s.id, false), `${s.name}'s access is off`)
                  : act(() => deleteStudent(s.id), `${s.name} deleted`, onDeleted)
              }
            >
              {confirm === "off" ? <Lock size={14} /> : <Trash2 size={14} />}
              {busy ? "Working…" : confirm === "off" ? "Turn off" : "Delete for good"}
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => setConfirm(null)}>
              Cancel
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/** A student who hasn't joined yet: their class set-up, timetable, teacher, archive. */
export function PendingStudent({ cohortId, name, onArchived }: { cohortId: string; name: string; onArchived: () => void }) {
  const { db } = useTeacher();
  return (
    <>
      <ClassSetup cohortId={cohortId} />
      {cohortOf(db, cohortId).isGroup && <GroupMembers cohortId={cohortId} />}
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
          {cohortOf(db, s.cohortId).isGroup && <GroupMembers cohortId={s.cohortId} />}
          <RepeatingClasses cohortId={s.cohortId} />
          <TeacherOf cohortId={s.cohortId} />
          <AccessControls s={s} onDeleted={onArchived} />
          {cohortOf(db, s.cohortId).isGroup && <ArchiveStudent cohortId={s.cohortId} name={s.name} onArchived={onArchived} />}
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
  const [group, setGroup] = useState(false);
  const [f, setF] = useState({ name: "", board: "IB", subject: "Economics", email: "", meetUrl: "" });
  // a group's students: name + Google email (anyone left out joins with the group's code)
  const [members, setMembers] = useState([
    { name: "", email: "" },
    { name: "", email: "" },
  ]);
  const [slots, setSlots] = useState<Slot[]>([NEW_SLOT]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string; code: string; email: string; group: boolean; added: number } | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: string) => setF((x) => ({ ...x, [k]: v }));
  const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const emailOk = group ? members.every((m) => !m.email.trim() || isEmail(m.email)) : !f.email.trim() || isEmail(f.email);
  const meetOk = !f.meetUrl.trim() || /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(f.meetUrl.trim());
  const ok = f.name.trim() && emailOk && meetOk && slotsOk(slots);
  const listed = members.filter((m) => m.email.trim()).map((m) => ({ name: m.name.trim(), email: m.email.trim().toLowerCase() }));

  if (done) {
    return (
      <div className="space-y-5">
        <p className="text-[15px] text-navy">
          <span className="font-semibold">{done.name}</span> has been added.
          {done.group
            ? `${done.added ? ` ${done.added} student${done.added === 1 ? " can" : "s can"} sign in straight away.` : ""} Anyone else in the group joins with this code:`
            : done.email
              ? ` They can sign in with ${done.email} straight away.`
              : " Send them this join code:"}
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
      <Segmented
        value={group ? "group" : "one"}
        onChange={(v) => setGroup(v === "group")}
        options={[
          { value: "one", label: "One student" },
          { value: "group", label: "Group class" },
        ]}
      />
      <Field label={group ? "Group name" : "Student name"}>
        <input
          value={f.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={group ? "IB Economics HL group" : undefined}
          className={fieldCls}
        />
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
      {group && (
        <Field label="Students">
          <div className="space-y-2">
            {members.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.3fr_auto] items-center gap-2">
                <input
                  value={m.name}
                  onChange={(e) => setMembers((xs) => xs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  placeholder="Name"
                  aria-label={`Student ${i + 1} name`}
                  className={fieldCls + " !mt-0"}
                />
                <input
                  value={m.email}
                  onChange={(e) => setMembers((xs) => xs.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))}
                  placeholder="Google email"
                  inputMode="email"
                  aria-label={`Student ${i + 1} email`}
                  className={fieldCls + " !mt-0"}
                />
                <button
                  type="button"
                  aria-label={`Remove student ${i + 1}`}
                  disabled={members.length === 1}
                  onClick={() => setMembers((xs) => xs.filter((_, j) => j !== i))}
                  className="grid h-10 w-10 place-items-center rounded-md text-navy hover:bg-navy/[0.06] disabled:opacity-30 focus-gold"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
          <Btn variant="outline" size="sm" className="mt-2.5" onClick={() => setMembers((xs) => [...xs, { name: "", email: "" }])}>
            <Plus size={14} /> Another student
          </Btn>
        </Field>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {!group && (
          <Field label="Student's Google email (optional)">
            <input
              value={f.email}
              onChange={(e) => set("email", e.target.value)}
              inputMode="email"
              placeholder="Leave empty to use a join code"
              className={fieldCls}
            />
          </Field>
        )}
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
            group,
            students: group ? listed : undefined,
          });
          setBusy(false);
          if (res) setDone({ name: f.name.trim(), code: res.joinCode, email: group ? "" : f.email.trim(), group, added: listed.length });
        }}
      >
        <UserPlus size={16} />
        {busy ? "Adding…" : group ? "Add group" : "Add student"}
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
  const { db, archiveStudent, toast } = useTeacher();
  const group = cohortOf(db, cohortId).isGroup;
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-6 border-t border-navy/10 pt-5">
      {!confirm ? (
        <Btn variant="ghost" size="sm" onClick={() => setConfirm(true)}>
          <Archive size={14} /> {group ? "Archive the whole group" : "Archive student"}
        </Btn>
      ) : (
        <div className="rounded-xl border-l-[3px] border-gold bg-navy/[0.04] p-4">
          <p className="text-[15px] font-semibold text-navy">Archive {group ? cohortOf(db, cohortId).name : name}?</p>
          <p className="mt-1 text-sm text-navy">
            {group ? "Every student in the group loses access" : "They lose access"} and upcoming classes are removed. Nothing is deleted,
            and you can restore {group ? "the group" : "them"}.
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
                toast(`${group ? cohortOf(db, cohortId).name : name} archived`);
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
