"use client";

import { useState } from "react";
import { CalendarClock, CalendarPlus, CalendarX, Copy, ExternalLink, Pencil, Play, RefreshCw } from "lucide-react";
import { cohortOf, meetLink, topicOf, usePortal } from "@/lib/portal/store";
import { fmtDateLong, fmtTime, sessionState } from "@/lib/portal/format";
import type { Resource, Session, Strand } from "@/lib/portal/types";
import { Btn, Field, Label, Modal, Status, fieldCls } from "./ui";
import { JoinButton, MeetLinkForm, useTick } from "./classroom";
import { ResourceViewer } from "./resources";

const pad = (n: number) => String(n).padStart(2, "0");
const dateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isDrive = (u: string) => /^https:\/\/(drive|docs)\.google\.com\//.test(u.trim());

/** Teacher: schedule a one-off class. */
export function ScheduleForm({ cohorts, onDone }: { cohorts: { id: string; name: string }[]; onDone: () => void }) {
  const { addSession, toast } = usePortal();
  const tomorrow = new Date(Date.now() + 86_400_000);
  const [f, setF] = useState({
    cohortId: cohorts[0]?.id ?? "",
    title: "Economics class",
    strand: "Micro" as Strand,
    unit: "",
    date: dateInput(tomorrow),
    time: "18:00",
    duration: 60,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const ok = f.cohortId && f.title.trim() && f.unit.trim() && f.date && f.time;

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
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field label="Class">
          <input value={f.title} onChange={(e) => set("title", e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Strand">
          <select value={f.strand} onChange={(e) => set("strand", e.target.value as Strand)} className={fieldCls}>
            <option>Micro</option>
            <option>Macro</option>
            <option>Business</option>
          </select>
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
        <Field label="Length">
          <select value={f.duration} onChange={(e) => set("duration", Number(e.target.value))} className={fieldCls}>
            {[45, 60, 75, 90].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Btn
        variant="gold"
        size="lg"
        disabled={!ok}
        onClick={async () => {
          const saved = await addSession({
            cohortId: f.cohortId,
            title: f.title.trim(),
            strand: f.strand,
            unit: f.unit.trim(),
            start: new Date(`${f.date}T${f.time}`).toISOString(),
            durationMin: f.duration,
          });
          if (!saved) return;
          toast("Class added");
          onDone();
        }}
      >
        <CalendarPlus size={16} />
        Add class
      </Btn>
    </div>
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
        disabled={!isDrive(url) || url.trim() === (session.recordingUrl ?? "")}
        onClick={async () => {
          if (await setRecording(session.id, url)) toast("Recording saved");
        }}
      >
        Save
      </Btn>
    </div>
  );
}

const timeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Teacher: move an upcoming class to a new date / time. */
function RescheduleForm({ session, onDone, onCancel }: { session: Session; onDone: () => void; onCancel: () => void }) {
  const { rescheduleSession, toast } = usePortal();
  const start = new Date(session.start);
  const [date, setDate] = useState(dateInput(start));
  const [time, setTime] = useState(timeInput(start));
  const [duration, setDuration] = useState(session.durationMin);
  const [busy, setBusy] = useState(false);
  const next = new Date(`${date}T${time}`);
  const valid = date && time && !Number.isNaN(next.getTime()) && next.getTime() + duration * 60_000 > Date.now();
  const same = next.getTime() === start.getTime() && duration === session.durationMin;

  return (
    <div className="rounded-xl border border-navy/15 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Start">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Length">
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={fieldCls}>
            {Array.from(new Set([45, 60, 75, 90, session.durationMin])).sort((a, b) => a - b).map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-4 flex gap-2.5">
        <Btn
          variant="gold"
          disabled={!valid || same || busy}
          onClick={async () => {
            setBusy(true);
            const ok = await rescheduleSession(session.id, next.toISOString(), duration);
            setBusy(false);
            if (!ok) return;
            toast("Class rescheduled");
            onDone();
          }}
        >
          <CalendarClock size={15} />
          {busy ? "Saving…" : "Save new time"}
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </div>
  );
}

/** One class, opened from the calendar: time, topic, the Meet button, and what's left after it. */
export function ClassDialog({ session, onClose }: { session: Session | null; onClose: () => void }) {
  const { db, auth, toggleAttendance, cancelSession, toast } = usePortal();
  const now = useTick(30_000);
  const [viewing, setViewing] = useState<Resource | null>(null);
  const [moving, setMoving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const teacher = auth?.role === "teacher";
  const close = () => {
    setMoving(false);
    setCancelling(false);
    onClose();
  };

  const s = session;
  const state = s ? sessionState(s.start, s.durationMin, now) : "upcoming";
  const ended = state === "ended";
  const cohort = s ? cohortOf(db, s.cohortId) : null;
  const students = s ? db.students.filter((x) => x.cohortId === s.cohortId) : [];
  const me = !teacher ? db.students.find((x) => x.id === auth?.userId) : undefined;
  const files = s ? db.resources.filter((r) => r.sessionId === s.id) : [];
  const link = s ? meetLink(db, s) : "";

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
              {state === "live" ? <Status tone="attention">Live now</Status> : ended ? <Status tone="done">Ended</Status> : null}
            </div>

            {!ended && (
              <div className="flex flex-wrap items-center gap-3">
                <JoinButton session={s} size="lg" surface="white" />
                {teacher && !moving && !cancelling && (
                  <>
                    <Btn variant="outline" size="lg" onClick={() => setMoving(true)}>
                      <CalendarClock size={16} />
                      Reschedule
                    </Btn>
                    <Btn variant="ghost" size="lg" onClick={() => setCancelling(true)}>
                      <CalendarX size={16} />
                      Cancel class
                    </Btn>
                  </>
                )}
                {teacher && link && (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-medium text-navy underline decoration-gold decoration-2 underline-offset-4">
                    {link.replace("https://", "")}
                  </a>
                )}
              </div>
            )}

            {!ended && teacher && cancelling && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border-l-[3px] border-gold bg-navy/[0.04] p-4">
                <p className="flex-1 text-[15px] font-semibold text-navy">Cancel this class?</p>
                <Btn
                  variant="navy"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const ok = await cancelSession(s.id);
                    setBusy(false);
                    if (!ok) return;
                    toast("Class cancelled");
                    close();
                  }}
                >
                  {busy ? "Cancelling…" : "Yes, cancel"}
                </Btn>
                <Btn variant="ghost" onClick={() => setCancelling(false)}>
                  Keep
                </Btn>
              </div>
            )}

            {!ended && teacher && moving && <RescheduleForm key={s.id} session={s} onDone={close} onCancel={() => setMoving(false)} />}

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
