"use client";

import { useState } from "react";
import { CalendarPlus, Check, Copy, ExternalLink, Link2, Pencil, Play, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { topicOf, useTeacher } from "@/lib/portal/store";
import { fmtDate, fmtDay, fmtTime, sessionState } from "@/lib/portal/format";
import type { Session, Strand } from "@/lib/portal/types";
import { Avatar, Btn, EmptyRow, Field, Modal, PageHeader, Picker, Rise, Segmented, Status, Table, Td, fieldCls } from "@/components/portal/ui";
import { JoinButton, MeetLinkForm, SessionStatus } from "@/components/portal/classroom";

const pad = (n: number) => String(n).padStart(2, "0");
const dateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function ScheduleForm({ cohortId, onDone }: { cohortId: string; onDone: () => void }) {
  const { addSession, toast } = useTeacher();
  const tomorrow = new Date(Date.now() + 86_400_000);
  const [f, setF] = useState({ title: "", strand: "Micro" as Strand, unit: "", date: dateInput(tomorrow), time: "18:00", duration: 60 });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const ok = f.title.trim() && f.unit.trim() && f.date && f.time;

  return (
    <div className="space-y-5">
      <Field label="Class title">
        <input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Oligopoly & the kinked demand curve" className={fieldCls} />
      </Field>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Strand">
          <select value={f.strand} onChange={(e) => set("strand", e.target.value as Strand)} className={fieldCls}>
            <option>Micro</option>
            <option>Macro</option>
            <option>Business</option>
          </select>
        </Field>
        <Field label="Unit / topic">
          <input value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="Market structures" className={fieldCls} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field label="Date">
          <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Start time">
          <input type="time" value={f.time} onChange={(e) => set("time", e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Length">
          <select value={f.duration} onChange={(e) => set("duration", Number(e.target.value))} className={fieldCls}>
            {[45, 60, 75, 90].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="rounded-2xl bg-navy/[0.04] p-4 text-[13px] leading-relaxed text-navy/60">
        The class uses this cohort&apos;s standing Google Meet room, so students join with the same button every time.
      </p>
      <Btn
        variant="gold"
        size="lg"
        disabled={!ok}
        onClick={async () => {
          const saved = await addSession({
            cohortId,
            title: f.title.trim(),
            strand: f.strand,
            unit: f.unit.trim(),
            start: new Date(`${f.date}T${f.time}`).toISOString(),
            durationMin: f.duration,
          });
          if (!saved) return;
          toast("Class scheduled");
          onDone();
        }}
      >
        <CalendarPlus size={16} />
        Schedule class
      </Btn>
    </div>
  );
}

function RecordingForm({ session, onDone }: { session: Session; onDone: () => void }) {
  const { setRecording, toast } = useTeacher();
  const [url, setUrl] = useState(session.recordingUrl ?? "");
  const valid = /^https:\/\/(drive|docs)\.google\.com\//.test(url.trim());
  return (
    <div>
      <ol className="mb-5 space-y-2 text-sm leading-relaxed text-navy/65">
        <li><span className="font-semibold text-navy">1.</span> Google Meet saves the recording to your Google Drive after class.</li>
        <li><span className="font-semibold text-navy">2.</span> In Drive, open the file&apos;s Share menu and copy the link.</li>
        <li><span className="font-semibold text-navy">3.</span> Paste it here. It appears in that student&apos;s Classes and Resources straight away.</li>
      </ol>
      <Field label="Google Drive link to the recording">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/file/d/…" inputMode="url" className={fieldCls} />
      </Field>
      <div className="mt-5">
        <Btn
          variant="gold"
          size="lg"
          disabled={!valid}
          onClick={async () => {
            if (!(await setRecording(session.id, url))) return;
            toast("Recording added");
            onDone();
          }}
        >
          <Play size={15} className="fill-current" />
          Save recording
        </Btn>
      </div>
    </div>
  );
}

export default function TeacherClasses() {
  const { db, now, toggleAttendance, regenerateCode, toast } = useTeacher();
  const [renewing, setRenewing] = useState(false);
  const [cohortId, setCohortId] = useState(db.cohorts[0]?.id ?? "");
  const [tab, setTab] = useState<"upcoming" | "past" | "setup">("upcoming");
  const [scheduling, setScheduling] = useState(false);
  const [editingLink, setEditingLink] = useState(false);
  const [registerId, setRegisterId] = useState<string | null>(null);
  const [recordingFor, setRecordingFor] = useState<Session | null>(null);

  const cohort = db.cohorts.find((c) => c.id === cohortId) ?? db.cohorts[0];
  const students = db.students.filter((s) => s.cohortId === cohort?.id);
  const sessions = db.sessions.filter((s) => s.cohortId === cohort?.id);
  const upcoming = sessions.filter((s) => sessionState(s.start, s.durationMin, now) !== "ended");
  const past = sessions.filter((s) => sessionState(s.start, s.durationMin, now) === "ended").reverse();
  const register = sessions.find((s) => s.id === registerId) ?? null;

  if (!cohort) {
    return (
      <>
        <PageHeader title="Classes" />
        <p className="text-sm text-navy/55">No students yet.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Classes"
        actions={
          <Btn variant="navy" onClick={() => setScheduling(true)}>
            <CalendarPlus size={15} />
            Add a class
          </Btn>
        }
      />

      <div className="mb-5">
        <Picker
          label="Student"
          value={cohort.id}
          onChange={(v) => {
            setCohortId(v);
            setEditingLink(false);
          }}
          options={db.cohorts.map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "upcoming", label: "Upcoming", count: upcoming.length },
          { value: "past", label: "Past", count: past.length },
          { value: "setup", label: "Setup" },
        ]}
      />

      <Rise key={`${cohort.id}-${tab}`} className="mt-4">
        {tab === "upcoming" ? (
          <Table head={[{ label: "Date" }, { label: "Time" }, { label: "Class" }, { label: "Topic" }, { label: "", align: "right" }]}>
            {upcoming.length === 0 ? (
              <EmptyRow cols={5}>No classes scheduled.</EmptyRow>
            ) : (
              upcoming.map((s, i) => (
                <tr key={s.id}>
                  <Td className="whitespace-nowrap font-medium text-navy">{fmtDay(s.start, now)}</Td>
                  <Td className="whitespace-nowrap">
                    {fmtTime(s.start)} · {s.durationMin} min
                  </Td>
                  <Td>{s.title}</Td>
                  <Td className="text-navy/55">{topicOf(s) || "—"}</Td>
                  <Td align="right">
                    <div className="flex justify-end">
                      {i === 0 ? (
                        <JoinButton session={s} size="sm" surface="white" />
                      ) : new Date(s.start).getTime() - now < 12 * 3_600_000 ? (
                        <SessionStatus session={s} />
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </Table>
        ) : tab === "past" ? (
          <Table head={[{ label: "Date" }, { label: "Class" }, { label: "Topic" }, { label: "Attendance" }, { label: "Recording", align: "right" }]}>
            {past.length === 0 ? (
              <EmptyRow cols={5}>No past classes yet.</EmptyRow>
            ) : (
              past.map((s) => {
                const present = students.filter((st) => s.attendance[st.id]).length;
                return (
                  <tr key={s.id}>
                    <Td className="whitespace-nowrap font-medium text-navy">
                      {fmtDate(s.start)}, {fmtTime(s.start)}
                    </Td>
                    <Td>{s.title}</Td>
                    <Td className="text-navy/55">{topicOf(s) || "—"}</Td>
                    <Td>
                      <button type="button" onClick={() => setRegisterId(s.id)} className="rounded-md focus-gold" title="Open the attendance register">
                        {students.length === 0 ? (
                          <Status>No student</Status>
                        ) : present === students.length ? (
                          <Status tone="done">Present</Status>
                        ) : (
                          <Status>Absent · edit</Status>
                        )}
                      </button>
                    </Td>
                    <Td align="right">
                      <Btn variant="outline" size="sm" onClick={() => setRecordingFor(s)}>
                        {s.recordingUrl ? <Check size={13} /> : <Link2 size={13} />}
                        {s.recordingUrl ? "Added" : "Add link"}
                      </Btn>
                    </Td>
                  </tr>
                );
              })
            )}
          </Table>
        ) : (
          <div className="divide-y divide-navy/10">
            {/* student */}
            <section className="py-6">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-navy/45">Student</h2>
              {students.length ? (
                <div className="mt-3 flex items-center gap-3.5">
                  <Avatar name={students[0].name} />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium text-navy">{students[0].name}</p>
                    <p className="truncate text-[13px] text-navy/50">{students[0].email} · joined</p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-navy/60">
                  Not joined yet. Send them the join code below. They sign in at cognifypk.com/portal with Google and enter it once.
                </p>
              )}
            </section>

            {/* join code */}
            <section className="py-6">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-navy/45">Join code</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <span className="rounded-xl border border-navy/12 px-4 py-2 font-mono text-lg tracking-[0.2em] text-navy">{cohort.joinCode}</span>
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
                    if (ok) toast("New code issued. The old one no longer works.");
                  }}
                >
                  <RefreshCw size={13} /> New code
                </Btn>
              </div>
            </section>

            {/* meet room */}
            <section className="py-6">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-navy/45">Google Meet room</h2>
              {cohort.meetUrl && !editingLink ? (
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <span className="break-all text-[15px] text-navy">{cohort.meetUrl}</span>
                  <Btn variant="outline" size="sm" href={cohort.meetUrl} external>
                    <ExternalLink size={13} /> Open
                  </Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setEditingLink(true)}>
                    <Pencil size={13} /> Change
                  </Btn>
                </div>
              ) : (
                <div className="mt-3 max-w-xl">
                  <MeetLinkForm key={cohort.id} cohortId={cohort.id} onSaved={() => setEditingLink(false)} />
                </div>
              )}
            </section>
          </div>
        )}
      </Rise>

      <Modal open={scheduling} onClose={() => setScheduling(false)} eyebrow={cohort.name} title="Add a class">
        <ScheduleForm cohortId={cohort.id} onDone={() => setScheduling(false)} />
      </Modal>

      <Modal open={!!register} onClose={() => setRegisterId(null)} eyebrow="Attendance register" title={register?.title ?? ""}>
        {register && (
          <>
            <p className="mb-3 text-sm leading-relaxed text-navy/60">
              Students are marked present automatically when they join from the portal. Tap a name to correct the register.
            </p>
            <ul>
              {students.map((st) => {
                const here = !!register.attendance[st.id];
                return (
                  <li key={st.id} className="border-t border-navy/10 first:border-t-0">
                    <button
                      type="button"
                      onClick={() => toggleAttendance(register.id, st.id)}
                      aria-pressed={here}
                      className="flex w-full items-center gap-3.5 py-3 text-left focus-gold"
                    >
                      <Avatar name={st.name} size="sm" />
                      <span className="flex-1 text-sm font-semibold tracking-tight text-navy">{st.name}</span>
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                          here ? "bg-navy-deep text-gold" : "border border-navy/15 text-navy/50"
                        )}
                      >
                        {here ? "Present" : "Absent"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Modal>

      <Modal open={!!recordingFor} onClose={() => setRecordingFor(null)} eyebrow="Class recording" title={recordingFor?.title ?? ""}>
        {recordingFor && <RecordingForm session={recordingFor} onDone={() => setRecordingFor(null)} />}
      </Modal>
    </>
  );
}
