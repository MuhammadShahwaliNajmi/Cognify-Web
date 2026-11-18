"use client";

import { useState } from "react";
import { CalendarPlus, CalendarX, Copy, ExternalLink, Pencil, Play, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { cohortOf, meetLink, topicOf } from "@/lib/portal/selectors";
import { DAY_LONG, DAY_SHORT, describeRule, isoDayOf, lastDayAfter, ruleOf, ymd, type Rule } from "@/lib/portal/series";
import { usePortal } from "@/lib/portal/store";
import { DAY, dateInput, fmtDateLong, fmtTime, isDriveUrl, sessionState, timeInput, minutesBetween, classLengthOk, fmtLength } from "@/lib/portal/format";
import type { ClassRequest, Resource, Session } from "@/lib/portal/types";
import { Btn, Field, Label, Modal, Status, fieldCls, labelCls } from "./ui";
import { JoinButton, MeetLinkForm, useTick } from "./classroom";
import { ResourceViewer } from "./resources";

/* ------------------------------------------------------------------ */
/* Repeat (Google Calendar's "Does not repeat / Daily / Weekly / Custom") */
/* ------------------------------------------------------------------ */

type RepeatMode = "none" | "daily" | "weekly" | "weekdays" | "custom";
export type Repeat = {
  mode: RepeatMode;
  weekdays: number[];
  everyWeeks: number;
  ends: "never" | "on" | "after";
  endsOn: string;
  count: number;
};
type RuleParts = { weekdays: number[]; everyWeeks: number; endsOn: string | null };

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const WEEKDAYS = [1, 2, 3, 4, 5];
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const inMonths = (day: string, n: number) => {
  const d = new Date(`${day}T12:00`);
  d.setMonth(d.getMonth() + n);
  return ymd(d);
};

/** The picker's starting state for a class (and its series, if it repeats). */
export function repeatFrom(rule: Pick<Rule, "weekdays" | "everyWeeks" | "endsOn"> | null, day: string): Repeat {
  const base: Repeat = { mode: "none", weekdays: [isoDayOf(day)], everyWeeks: 1, ends: "never", endsOn: inMonths(day, 3), count: 10 };
  if (!rule) return base;
  const days = rule.weekdays.join();
  const plain = rule.everyWeeks === 1 && !rule.endsOn;
  const mode: RepeatMode = !plain
    ? "custom"
    : days === ALL_DAYS.join()
      ? "daily"
      : days === WEEKDAYS.join()
        ? "weekdays"
        : rule.weekdays.length === 1 && rule.weekdays[0] === isoDayOf(day)
          ? "weekly"
          : "custom";
  return { ...base, mode, weekdays: rule.weekdays, everyWeeks: rule.everyWeeks, ends: rule.endsOn ? "on" : "never", endsOn: rule.endsOn ?? base.endsOn };
}

/** Days / every N weeks / last day for the database, or null for a one-off class. */
export function ruleFrom(r: Repeat, day: string): RuleParts | null {
  if (r.mode === "none") return null;
  if (r.mode === "daily") return { weekdays: ALL_DAYS, everyWeeks: 1, endsOn: null };
  if (r.mode === "weekdays") return { weekdays: WEEKDAYS, everyWeeks: 1, endsOn: null };
  if (r.mode === "weekly") return { weekdays: [isoDayOf(day)], everyWeeks: 1, endsOn: null };
  const weekdays = r.weekdays.length ? [...r.weekdays].sort() : [isoDayOf(day)];
  const everyWeeks = clamp(r.everyWeeks || 1, 1, 12);
  const endsOn =
    r.ends === "on" ? r.endsOn || null : r.ends === "after" ? lastDayAfter({ weekdays, everyWeeks, startsOn: day }, Math.max(1, r.count || 1)) : null;
  return { weekdays, everyWeeks, endsOn };
}

function RepeatPicker({ value, onChange, day }: { value: Repeat; onChange: (r: Repeat) => void; day: string }) {
  const iso = isoDayOf(day);
  const set = (p: Partial<Repeat>) => onChange({ ...value, ...p });
  const rule = ruleFrom(value, day);
  const radio = "h-4 w-4 accent-[#1a2744]";

  return (
    <div className="space-y-3">
      <Field label="Repeat">
        <select
          value={value.mode}
          onChange={(e) => {
            const mode = e.target.value as RepeatMode;
            set({ mode, weekdays: mode === "custom" && !value.weekdays.length ? [iso] : value.weekdays });
          }}
          className={fieldCls}
        >
          <option value="none">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly on {DAY_LONG[iso - 1]}</option>
          <option value="weekdays">Every weekday (Monday to Friday)</option>
          <option value="custom">Custom…</option>
        </select>
      </Field>

      {value.mode === "custom" && (
        <div className="space-y-5 rounded-xl border border-navy/15 p-4">
          <div className="flex flex-wrap items-center gap-2.5 text-[15px] text-navy">
            <span>Repeat every</span>
            <input
              type="number"
              min={1}
              max={12}
              value={value.everyWeeks}
              onChange={(e) => set({ everyWeeks: clamp(Number(e.target.value) || 1, 1, 12) })}
              className="w-16 rounded-lg border border-navy/15 px-3 py-2 text-[15px] text-navy outline-none focus:border-gold focus:ring-4 focus:ring-gold/15"
              aria-label="Weeks between classes"
            />
            <span>{value.everyWeeks === 1 ? "week" : "weeks"}</span>
          </div>

          <div>
            <span className={labelCls}>Repeat on</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAY_SHORT.map((d, i) => {
                const on = value.weekdays.includes(i + 1);
                return (
                  <button
                    key={d}
                    type="button"
                    title={DAY_LONG[i]}
                    aria-label={DAY_LONG[i]}
                    aria-pressed={on}
                    onClick={() => set({ weekdays: on ? value.weekdays.filter((x) => x !== i + 1) : [...value.weekdays, i + 1].sort() })}
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-full text-[13px] font-semibold transition-colors focus-gold",
                      on ? "bg-navy text-white" : "bg-navy/[0.06] text-navy hover:bg-navy/[0.12]"
                    )}
                  >
                    {d.slice(0, 1)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className={labelCls}>Ends</span>
            <div className="mt-2 space-y-2.5 text-[15px] text-navy">
              <label className="flex items-center gap-2.5">
                <input type="radio" name="ends" className={radio} checked={value.ends === "never"} onChange={() => set({ ends: "never" })} />
                Never
              </label>
              <label className="flex flex-wrap items-center gap-2.5">
                <input type="radio" name="ends" className={radio} checked={value.ends === "on"} onChange={() => set({ ends: "on" })} />
                On
                <input
                  type="date"
                  value={value.endsOn}
                  min={day}
                  onChange={(e) => set({ ends: "on", endsOn: e.target.value })}
                  className="rounded-lg border border-navy/15 px-3 py-1.5 text-[15px] text-navy outline-none focus:border-gold"
                />
              </label>
              <label className="flex flex-wrap items-center gap-2.5">
                <input type="radio" name="ends" className={radio} checked={value.ends === "after"} onChange={() => set({ ends: "after" })} />
                After
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={value.count}
                  onChange={(e) => set({ ends: "after", count: clamp(Number(e.target.value) || 1, 1, 500) })}
                  className="w-20 rounded-lg border border-navy/15 px-3 py-1.5 text-[15px] text-navy outline-none focus:border-gold"
                />
                classes
              </label>
            </div>
          </div>
        </div>
      )}

      {rule && (
        <p className="text-[13px] font-medium text-navy">
          {describeRule(rule)}
          {rule.endsOn ? "" : ", until you stop it"}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add a class                                                          */
/* ------------------------------------------------------------------ */

export type NewClassAt = { date: string; start: string; end: string };

/** Teacher: add a class, one-off or repeating. */
export function ScheduleForm({
  cohorts,
  onDone,
  initial,
}: {
  cohorts: { id: string; name: string }[];
  onDone: () => void;
  initial?: NewClassAt;
}) {
  const { addSession, addRepeatingClass, toast } = usePortal();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    cohortId: cohorts[0]?.id ?? "",
    title: "Economics class",
    unit: "",
    date: initial?.date ?? dateInput(new Date(Date.now() + DAY)),
    time: initial?.start ?? "18:00",
    end: initial?.end ?? "19:00",
  });
  const [repeat, setRepeat] = useState<Repeat>(() => repeatFrom(null, f.date));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const length = minutesBetween(f.time, f.end);
  const rule = f.date ? ruleFrom(repeat, f.date) : null;
  // a one-off class needs its topic; a repeating one may leave it to each class
  const ok = f.cohortId && f.title.trim() && (rule || f.unit.trim()) && f.date && f.time && classLengthOk(length) && !busy;

  return (
    <div className="space-y-5">
      <Field label="Student">
        <select value={f.cohortId} onChange={(e) => set("cohortId", e.target.value)} className={fieldCls}>
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Class">
          <input value={f.title} onChange={(e) => set("title", e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Topic">
          <input value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="Market structures" className={fieldCls} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field label="Date">
          <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Start">
          <input type="time" value={f.time} onChange={(e) => set("time", e.target.value)} className={fieldCls} />
        </Field>
        <Field label={`End${length ? ` · ${fmtLength(length)}` : ""}`}>
          <input type="time" value={f.end} onChange={(e) => set("end", e.target.value)} className={fieldCls} />
        </Field>
      </div>
      {!classLengthOk(length) && <p className="-mt-2 text-xs font-medium text-navy">A class can be 5 minutes to 12 hours long.</p>}
      {f.date && <RepeatPicker value={repeat} onChange={setRepeat} day={f.date} />}
      <Btn
        variant="gold"
        size="lg"
        disabled={!ok}
        onClick={async () => {
          setBusy(true);
          const saved = !rule
            ? await addSession({
                cohortId: f.cohortId,
                title: f.title.trim(),
                strand: null,
                unit: f.unit.trim(),
                start: new Date(`${f.date}T${f.time}`).toISOString(),
                durationMin: length,
              })
            : await addRepeatingClass({
                cohortId: f.cohortId,
                title: f.title.trim(),
                unit: f.unit.trim(),
                startDate: f.date,
                start: f.time,
                durationMin: length,
                ...rule,
              });
          setBusy(false);
          if (!saved) return;
          toast(rule ? "Repeating class added" : "Class added");
          onDone();
        }}
      >
        <CalendarPlus size={16} />
        {busy ? "Saving…" : rule ? "Add repeating class" : "Add class"}
      </Btn>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* "This class / This and following / All classes"                     */
/* ------------------------------------------------------------------ */

export type Scope = "this" | "following" | "all";
const SCOPES: { value: Scope; label: string }[] = [
  { value: "this", label: "This class" },
  { value: "following", label: "This and following classes" },
  { value: "all", label: "All classes" },
];

function ScopePicker({ value, onChange, allowThis = true }: { value: Scope; onChange: (s: Scope) => void; allowThis?: boolean }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {SCOPES.filter((o) => allowThis || o.value !== "this").map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus-gold",
            value === o.value ? "border-navy bg-navy text-white" : "border-navy/20 text-navy hover:bg-navy/[0.05]"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Move a repeating class (after a drag on the calendar): this one, this and following, or all. */
export function MoveSeriesDialog({
  move,
  onClose,
}: {
  move: { session: Session; start: string; durationMin: number } | null;
  onClose: () => void;
}) {
  const { db, rescheduleSession, updateSeries, toast } = usePortal();
  const [busy, setBusy] = useState(false);
  const rule = move ? ruleOf(db, move.session) : null;

  const apply = async (scope: Scope) => {
    if (!move || !rule) return;
    setBusy(true);
    let ok: boolean;
    if (scope === "this") ok = await rescheduleSession(move.session.id, move.start, move.durationMin);
    else {
      const oldDay = ymd(new Date(move.session.start));
      const newDay = ymd(new Date(move.start));
      const from = scope === "all" ? null : [oldDay, newDay].sort()[0];
      const weekdays = Array.from(new Set(rule.weekdays.map((w) => (w === isoDayOf(oldDay) ? isoDayOf(newDay) : w)))).sort();
      ok = await updateSeries(rule.seriesId, scope, from, {
        title: rule.title,
        unit: rule.unit,
        startDate: newDay,
        start: timeInput(new Date(move.start)),
        durationMin: move.durationMin,
        weekdays,
        everyWeeks: rule.everyWeeks,
        endsOn: rule.endsOn,
      });
    }
    setBusy(false);
    if (!ok) return;
    toast(scope === "this" ? "Class moved" : "Classes moved");
    onClose();
  };

  return (
    <Modal open={!!move && !!rule} onClose={onClose} title="Move repeating class">
      {move && (
        <div className="space-y-5">
          <p className="text-[15px] text-navy">
            New time: {fmtDateLong(move.start)}, {fmtTime(move.start)} – {fmtTime(new Date(new Date(move.start).getTime() + move.durationMin * 60_000).toISOString())}
          </p>
          <div className="flex flex-col gap-2.5">
            {SCOPES.filter((o) => !move.session.virtual || o.value !== "this").map((o) => (
              <Btn key={o.value} variant={o.value === "this" ? "navy" : "outline"} disabled={busy} onClick={() => apply(o.value)}>
                {o.label}
              </Btn>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Teacher: a student's join code and standing Meet room. */
export function ClassSetup({ cohortId }: { cohortId: string }) {
  const { db, regenerateCode, toast } = usePortal();
  const cohort = cohortOf(db, cohortId);
  const [renewing, setRenewing] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <Label>Join code</Label>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <span className="rounded-lg bg-navy-deep px-4 py-2 font-mono text-lg tracking-[0.2em] text-gold">{cohort.joinCode}</span>
          <Btn variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(cohort.joinCode).then(() => toast("Code copied"))}>
            <Copy size={13} /> Copy
          </Btn>
          <Btn
            variant="ghost"
            size="sm"
            disabled={renewing}
            onClick={async () => {
              setRenewing(true);
              const ok = await regenerateCode(cohort.id);
              setRenewing(false);
              if (ok) toast("New code issued");
            }}
          >
            <RefreshCw size={13} /> New code
          </Btn>
        </div>
      </div>
      <div>
        <Label>Google Meet room</Label>
        {cohort.meetUrl && !editing ? (
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span className="break-all text-[15px] text-navy">{cohort.meetUrl}</span>
            <Btn variant="outline" size="sm" href={cohort.meetUrl} external>
              <ExternalLink size={13} /> Open
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={13} /> Change
            </Btn>
          </div>
        ) : (
          <div className="mt-2">
            <MeetLinkForm cohortId={cohort.id} onSaved={() => setEditing(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

function RecordingField({ session }: { session: Session }) {
  const { setRecording, toast } = usePortal();
  const [url, setUrl] = useState(session.recordingUrl ?? "");
  return (
    <div className="flex flex-wrap items-end gap-2.5">
      <div className="min-w-0 flex-1 basis-60">
        <Field label="Recording (Google Drive link)">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/file/d/…" inputMode="url" className={fieldCls} />
        </Field>
      </div>
      <Btn
        variant="navy"
        disabled={!isDriveUrl(url) || url.trim() === (session.recordingUrl ?? "")}
        onClick={async () => {
          if (await setRecording(session.id, url)) toast("Recording saved");
        }}
      >
        Save
      </Btn>
    </div>
  );
}

/** Teacher: change a class — name, topic, time and how it repeats (Google Calendar's edit). */
function EditClassForm({ session, rule, onDone, onCancel }: { session: Session; rule: Rule | null; onDone: () => void; onCancel: () => void }) {
  const { addSession, addRepeatingClass, updateSeries, endSeries, editSession, deleteSession, rescheduleSession, toast } = usePortal();
  const start = new Date(session.start);
  const origDay = ymd(start);
  const [f, setF] = useState({
    title: session.title,
    unit: session.unit ?? "",
    date: origDay,
    time: timeInput(start),
    end: timeInput(new Date(start.getTime() + session.durationMin * 60_000)),
  });
  const [repeat, setRepeat] = useState<Repeat>(() => repeatFrom(rule, origDay));
  const [scope, setScope] = useState<Scope>(session.virtual ? "following" : "this");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const length = minutesBetween(f.time, f.end);
  const next = new Date(`${f.date}T${f.time}`);
  const newRule = f.date ? ruleFrom(repeat, f.date) : null;
  const seriesEdit = !!rule && scope !== "this";
  const valid = f.title.trim() && f.date && f.time && classLengthOk(length) && !Number.isNaN(next.getTime()) && next.getTime() + length * 60_000 > Date.now();

  const save = async () => {
    const timeChanged = next.getTime() !== start.getTime() || length !== session.durationMin;
    const textChanged = f.title.trim() !== session.title || f.unit.trim() !== (session.unit ?? "");
    const input = (r: RuleParts) => ({ title: f.title.trim(), unit: f.unit.trim(), startDate: f.date, start: f.time, durationMin: length, ...r });
    setBusy(true);
    let ok = true;
    if (!rule && newRule) {
      // a one-off class becomes the first of a series
      ok = (await deleteSession(session.id)) && (await addRepeatingClass({ cohortId: session.cohortId, ...input(newRule) }));
    } else if (!seriesEdit) {
      if (textChanged) ok = await editSession(session.id, { title: f.title, unit: f.unit });
      if (ok && timeChanged) ok = await rescheduleSession(session.id, next.toISOString(), length);
    } else {
      const from = scope === "all" ? null : [origDay, f.date].sort()[0];
      ok = newRule
        ? await updateSeries(rule!.seriesId, scope as "all" | "following", from, input(newRule))
        : (await endSeries(rule!.seriesId, from)) &&
          (await addSession({ cohortId: session.cohortId, title: f.title.trim(), strand: null, unit: f.unit.trim(), start: next.toISOString(), durationMin: length }));
    }
    setBusy(false);
    if (!ok) return;
    toast("Class saved");
    onDone();
  };

  return (
    <div className="space-y-5 rounded-xl border border-navy/15 p-4">
      {rule && (
        <div>
          <span className={labelCls}>Change</span>
          <div className="mt-2">
            <ScopePicker value={scope} onChange={setScope} allowThis={!session.virtual} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Class">
          <input value={f.title} onChange={(e) => set("title", e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Topic">
          <input value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="Market structures" className={fieldCls} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Date">
          <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Start">
          <input type="time" value={f.time} onChange={(e) => set("time", e.target.value)} className={fieldCls} />
        </Field>
        <Field label={`End${length ? ` · ${fmtLength(length)}` : ""}`}>
          <input type="time" value={f.end} onChange={(e) => set("end", e.target.value)} className={fieldCls} />
        </Field>
      </div>
      {!classLengthOk(length) && <p className="-mt-2 text-xs font-medium text-navy">A class can be 5 minutes to 12 hours long.</p>}
      {(!rule || seriesEdit) && f.date ? (
        <RepeatPicker value={repeat} onChange={setRepeat} day={f.date} />
      ) : (
        rule && <p className="text-[13px] font-medium text-navy">{describeRule(rule)}</p>
      )}
      <div className="flex gap-2.5">
        <Btn variant="gold" disabled={!valid || busy} onClick={save}>
          {busy ? "Saving…" : "Save"}
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </div>
  );
}

const fmtWhen = (iso: string) => `${fmtDateLong(iso)}, ${fmtTime(iso)}`;

/** Student: ask to move or cancel a class. */
function RequestForm({ session, kind, onDone, onCancel }: { session: Session; kind: "reschedule" | "cancel"; onDone: () => void; onCancel: () => void }) {
  const { auth, requestChange, toast } = usePortal();
  const start = new Date(session.start);
  const [date, setDate] = useState(dateInput(start));
  const [time, setTime] = useState(timeInput(start));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const next = new Date(`${date}T${time}`);
  const valid = kind === "cancel" || (date && time && next.getTime() > Date.now() && next.getTime() !== start.getTime());

  return (
    <div className="rounded-xl border border-navy/15 p-4">
      <p className="text-[15px] font-semibold text-navy">{kind === "cancel" ? "Request to cancel this class" : "Request a new time"}</p>
      {kind === "reschedule" && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldCls} />
          </Field>
          <Field label="Start">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldCls} />
          </Field>
        </div>
      )}
      <div className="mt-4">
        <Field label="Reason (optional)">
          <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} className={fieldCls} />
        </Field>
      </div>
      <div className="mt-4 flex gap-2.5">
        <Btn
          variant="gold"
          disabled={!valid || busy || !auth}
          onClick={async () => {
            setBusy(true);
            const ok = await requestChange({
              sessionId: session.id,
              studentId: auth!.userId,
              kind,
              proposedStart: kind === "reschedule" ? next.toISOString() : undefined,
              note,
            });
            setBusy(false);
            if (!ok) return;
            toast("Request sent to your teacher");
            onDone();
          }}
        >
          {busy ? "Sending…" : "Send request"}
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          Back
        </Btn>
      </div>
    </div>
  );
}

/** A student's request, as the teacher sees it (approve / decline) or the student sees it (status / withdraw). */
function RequestCard({ r, teacher }: { r: ClassRequest; teacher: boolean }) {
  const { db, resolveRequest, withdrawRequest, toast } = usePortal();
  const [busy, setBusy] = useState(false);
  const who = db.students.find((x) => x.id === r.studentId)?.name ?? "Student";
  const act = async (fn: () => Promise<boolean>, msg: string) => {
    setBusy(true);
    const ok = await fn();
    setBusy(false);
    if (ok) toast(msg);
  };

  return (
    <div className="rounded-xl border-l-[3px] border-gold bg-navy/[0.04] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[15px] font-semibold text-navy">
          {teacher ? `${who} asks to ` : "You asked to "}
          {r.kind === "cancel" ? "cancel this class" : "reschedule"}
        </p>
        <Status tone={r.status === "pending" ? "attention" : r.status === "approved" ? "done" : "plain"}>
          {r.status === "pending" ? "Pending" : r.status === "approved" ? "Approved" : "Declined"}
        </Status>
      </div>
      {r.kind === "reschedule" && r.proposedStart && <p className="mt-1 text-sm text-navy">New time: {fmtWhen(r.proposedStart)}</p>}
      {r.note && <p className="mt-1 text-sm italic text-navy">&ldquo;{r.note}&rdquo;</p>}
      {r.status === "pending" && (
        <div className="mt-3 flex gap-2.5">
          {teacher ? (
            <>
              <Btn variant="navy" size="sm" disabled={busy} onClick={() => act(() => resolveRequest(r.id, true), r.kind === "cancel" ? "Class cancelled" : "Class rescheduled")}>
                Approve
              </Btn>
              <Btn variant="ghost" size="sm" disabled={busy} onClick={() => act(() => resolveRequest(r.id, false), "Request declined")}>
                Decline
              </Btn>
            </>
          ) : (
            <Btn variant="ghost" size="sm" disabled={busy} onClick={() => act(() => withdrawRequest(r.id), "Request withdrawn")}>
              Withdraw
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}

/** One class, opened from the calendar: time, topic, the Meet button, and what's left after it. */
export function ClassDialog({ session, onClose }: { session: Session | null; onClose: () => void }) {
  const { db, auth, toggleAttendance, cancelSession, endSeries, toast } = usePortal();
  const now = useTick(30_000);
  const [viewing, setViewing] = useState<Resource | null>(null);
  const [moving, setMoving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelScope, setCancelScope] = useState<Scope>("this");
  const [busy, setBusy] = useState(false);
  const teacher = auth?.role === "teacher";
  const close = () => {
    setMoving(false);
    setCancelling(false);
    onClose();
  };
  // requests on this class: teachers see pending ones; a student sees their latest one
  const requests = session
    ? db.requests.filter((r) => r.sessionId === session.id && (teacher ? r.status === "pending" : r.studentId === auth?.userId))
    : [];
  const shownRequests = teacher ? requests : requests.slice(0, 1);
  const myPending = !teacher && requests.some((r) => r.status === "pending");

  const s = session;
  const state = s ? sessionState(s.start, s.durationMin, now) : "upcoming";
  const ended = state === "ended";
  const cohort = s ? cohortOf(db, s.cohortId) : null;
  const students = s ? db.students.filter((x) => x.cohortId === s.cohortId) : [];
  const me = !teacher ? db.students.find((x) => x.id === auth?.userId) : undefined;
  const files = s ? db.resources.filter((r) => r.sessionId === s.id) : [];
  const link = s ? meetLink(db, s) : "";
  const rule = s ? ruleOf(db, s) : null;
  const virtual = !!s?.virtual;

  const startCancel = () => {
    setCancelScope(virtual ? "following" : "this");
    setCancelling(true);
  };
  const doCancel = async () => {
    if (!s) return;
    setBusy(true);
    const ok =
      rule && cancelScope !== "this"
        ? await endSeries(rule.seriesId, cancelScope === "all" ? null : ymd(new Date(s.start)))
        : await cancelSession(s.id);
    setBusy(false);
    if (!ok) return;
    toast(rule && cancelScope !== "this" ? "Classes cancelled" : "Class cancelled");
    close();
  };

  return (
    <>
      <Modal
        open={!!s && !viewing}
        onClose={close}
        eyebrow={s ? `${fmtDateLong(s.start)} · ${fmtTime(s.start)} – ${fmtTime(new Date(new Date(s.start).getTime() + s.durationMin * 60_000).toISOString())}` : undefined}
        title={s ? (teacher ? cohort!.name : s.title) : ""}
      >
        {s && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {teacher && <Status>{s.title}</Status>}
              {topicOf(s) && <Status>{topicOf(s)}</Status>}
              {rule && <Status>{describeRule(rule)}</Status>}
              {state === "live" ? <Status tone="attention">Live now</Status> : ended ? <Status tone="done">Ended</Status> : null}
            </div>

            {!ended && (
              <div className="flex flex-wrap items-center gap-3">
                {!virtual && <JoinButton session={s} size="lg" />}
                {teacher && !moving && !cancelling && (
                  <>
                    <Btn variant="outline" size="lg" onClick={() => setMoving(true)}>
                      <Pencil size={15} />
                      Edit
                    </Btn>
                    <Btn variant="ghost" size="lg" onClick={startCancel}>
                      <CalendarX size={16} />
                      Cancel class
                    </Btn>
                  </>
                )}
                {!teacher && !virtual && !myPending && !moving && !cancelling && (
                  <>
                    <Btn variant="outline" size="lg" onClick={() => setMoving(true)}>
                      <Pencil size={15} />
                      Request reschedule
                    </Btn>
                    <Btn variant="ghost" size="lg" onClick={() => setCancelling(true)}>
                      <CalendarX size={16} />
                      Request cancellation
                    </Btn>
                  </>
                )}
                {teacher && link && !virtual && (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-medium text-navy underline decoration-gold decoration-2 underline-offset-4">
                    {link.replace("https://", "")}
                  </a>
                )}
              </div>
            )}

            {!ended && teacher && cancelling && (
              <div className="space-y-4 rounded-xl border-l-[3px] border-gold bg-navy/[0.04] p-4">
                <p className="text-[15px] font-semibold text-navy">{rule ? "Cancel repeating class" : "Cancel this class?"}</p>
                {rule && <ScopePicker value={cancelScope} onChange={setCancelScope} allowThis={!virtual} />}
                <div className="flex flex-wrap gap-2.5">
                  <Btn variant="navy" disabled={busy} onClick={doCancel}>
                    {busy ? "Cancelling…" : rule && cancelScope !== "this" ? "Cancel classes" : "Yes, cancel"}
                  </Btn>
                  <Btn variant="ghost" onClick={() => setCancelling(false)}>
                    Keep
                  </Btn>
                </div>
              </div>
            )}

            {!ended && teacher && moving && <EditClassForm key={s.id} session={s} rule={rule} onDone={close} onCancel={() => setMoving(false)} />}

            {!ended && !teacher && !virtual && (moving || cancelling) && (
              <RequestForm
                key={`${s.id}-${moving ? "r" : "c"}`}
                session={s}
                kind={moving ? "reschedule" : "cancel"}
                onDone={() => {
                  setMoving(false);
                  setCancelling(false);
                }}
                onCancel={() => {
                  setMoving(false);
                  setCancelling(false);
                }}
              />
            )}

            {shownRequests.map((r) => (
              <RequestCard key={r.id} r={r} teacher={teacher} />
            ))}

            {ended && !teacher && me && (
              <p className="text-[15px] text-navy">
                Attendance: {s.attendance[me.id] ? <Status tone="done">Present</Status> : <Status>Absent</Status>}
              </p>
            )}

            {ended && teacher && (
              <div>
                <Label>Attendance</Label>
                <ul className="mt-2 space-y-2">
                  {students.length === 0 && <li className="text-sm text-navy">No student has joined this class yet.</li>}
                  {students.map((st) => {
                    const here = !!s.attendance[st.id];
                    return (
                      <li key={st.id} className="flex items-center justify-between gap-3">
                        <span className="text-[15px] font-medium text-navy">{st.name}</span>
                        <Btn variant={here ? "navy" : "outline"} size="sm" onClick={() => toggleAttendance(s.id, st.id)} aria-pressed={here}>
                          {here ? "Present" : "Absent"}
                        </Btn>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {files.length > 0 && (
              <div>
                <Label>Materials</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {files.map((r) => (
                    <Btn key={r.id} variant="outline" size="sm" onClick={() => setViewing(r)}>
                      {r.type === "Recording" && <Play size={13} className="fill-current" />}
                      {r.type}
                    </Btn>
                  ))}
                </div>
              </div>
            )}

            {ended && teacher && <RecordingField key={s.id} session={s} />}
          </div>
        )}
      </Modal>
      <ResourceViewer resource={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
