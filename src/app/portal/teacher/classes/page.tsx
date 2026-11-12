"use client";

import { useState } from "react";
import { CalendarPlus, Check, Copy, ExternalLink, KeyRound, Link2, Pencil, Play, RefreshCw, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { topicOf, useTeacher } from "@/lib/portal/store";
import { fmtDay, fmtTime, sessionState } from "@/lib/portal/format";
import type { Session, Strand } from "@/lib/portal/types";
import { Avatar, Btn, Card, Chip, Field, Label, Modal, PageHeader, Rise, Segmented, fieldCls } from "@/components/portal/ui";
import { DateTile, JoinButton, MeetLinkForm, NextClassCard, SessionStatus } from "@/components/portal/classroom";

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
        <li><span className="font-semibold text-navy">3.</span> Paste it here. It appears in The Vault for this cohort straight away.</li>
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
            toast("Recording added to The Vault");
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
  const [cohortId, setCohortId] = useState(db.cohorts[0].id);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [scheduling, setScheduling] = useState(false);
  const [editingLink, setEditingLink] = useState(false);
  const [registerId, setRegisterId] = useState<string | null>(null);
  const [recordingFor, setRecordingFor] = useState<Session | null>(null);

  const cohort = db.cohorts.find((c) => c.id === cohortId)!;
  const students = db.students.filter((s) => s.cohortId === cohortId);
  const sessions = db.sessions.filter((s) => s.cohortId === cohortId);
  const upcoming = sessions.filter((s) => sessionState(s.start, s.durationMin, now) !== "ended");
  const past = sessions.filter((s) => sessionState(s.start, s.durationMin, now) === "ended").reverse();
  const register = sessions.find((s) => s.id === registerId) ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Google Meet classroom"
        title="Your"
        gold="Classes"
        actions={
          <Btn variant="navy" onClick={() => setScheduling(true)}>
            <CalendarPlus size={15} />
            Schedule a class
          </Btn>
        }
      />

      <Rise i={0}>
        <Segmented value={cohortId} onChange={setCohortId} options={db.cohorts.map((c) => ({ value: c.id, label: c.name }))} />
      </Rise>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Rise i={1} className="lg:col-span-7">
          {upcoming[0] ? (
            <NextClassCard session={upcoming[0]} cohortLabel={cohort.name} />
          ) : (
            <Card tone="navy" className="flex h-full flex-col rounded-[26px] !p-8">
              <Label className="text-white/50">{cohort.name}</Label>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">No class scheduled</h2>
              <div className="mt-auto pt-7">
                <Btn variant="gold" onClick={() => setScheduling(true)}>
                  <CalendarPlus size={15} />
                  Schedule a class
                </Btn>
              </div>
            </Card>
          )}
        </Rise>

        {/* the cohort's Meet room */}
        <Rise i={2} className="lg:col-span-5">
          <Card className="flex h-full flex-col">
            <div className="flex items-center justify-between">
              <Label>Meet room · {cohort.name}</Label>
              {cohort.meetUrl ? <Chip tone="navy"><Check size={11} /> Connected</Chip> : <Chip tone="gold">Not set</Chip>}
            </div>

            {cohort.meetUrl && !editingLink ? (
              <>
                <p className="mt-4 break-all rounded-2xl bg-navy/[0.04] p-4 font-mono text-[13px] text-navy">{cohort.meetUrl}</p>
                <p className="mt-3 text-sm leading-relaxed text-navy/60">
                  Students reach this room through the Join class button. They never need the link itself.
                </p>
                <div className="mt-auto flex flex-wrap gap-2.5 pt-5">
                  <Btn variant="navy" size="sm" href={cohort.meetUrl} external>
                    <ExternalLink size={13} /> Open room
                  </Btn>
                  <Btn
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard?.writeText(cohort.meetUrl).then(() => toast("Link copied"))}
                  >
                    <Copy size={13} /> Copy
                  </Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setEditingLink(true)}>
                    <Pencil size={13} /> Change
                  </Btn>
                </div>
              </>
            ) : (
              <div className="mt-4">
                <MeetLinkForm key={cohortId} cohortId={cohortId} onSaved={() => setEditingLink(false)} />
              </div>
            )}
          </Card>
        </Rise>

        {/* the student + their join code */}
        <Rise i={3} className="lg:col-span-12">
          <Card className="flex flex-wrap items-center gap-x-6 gap-y-4">
            {students.length ? (
              <div className="flex min-w-0 flex-1 basis-64 items-center gap-3.5">
                <Avatar name={students[0].name} />
                <div className="min-w-0">
                  <Label>Student</Label>
                  <p className="mt-1 truncate text-[15px] font-semibold tracking-tight text-navy">{students[0].name}</p>
                  <p className="truncate text-[13px] text-navy/50">{students[0].email}</p>
                </div>
                <Chip tone="navy" className="ml-auto">
                  <Check size={11} /> Joined
                </Chip>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 basis-64 items-center gap-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/20 text-navy">
                  <KeyRound size={17} />
                </span>
                <div className="min-w-0">
                  <Label>Waiting for {cohort.name} to join</Label>
                  <p className="mt-1 text-sm leading-relaxed text-navy/60">
                    Send this code privately. They sign in at cognifypk.com/portal with Google and enter it once.
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-xl bg-navy-deep px-4 py-2.5 font-mono text-lg tracking-[0.2em] text-gold">{cohort.joinCode}</span>
              <Btn
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard?.writeText(cohort.joinCode).then(() => toast("Code copied"))}
              >
                <Copy size={13} /> Copy
              </Btn>
              <Btn
                variant="ghost"
                size="sm"
                disabled={renewing}
                onClick={async () => {
                  setRenewing(true);
                  const ok = await regenerateCode(cohortId);
                  setRenewing(false);
                  if (ok) toast("New code issued. The old one no longer works.");
                }}
              >
                <RefreshCw size={13} /> New code
              </Btn>
            </div>
          </Card>
        </Rise>

        <Rise i={4} className="lg:col-span-12">
          <Card>
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "upcoming", label: "Upcoming", count: upcoming.length },
                { value: "past", label: "Past classes", count: past.length },
              ]}
            />
            <ul className="mt-4">
              {(tab === "upcoming" ? upcoming : past).map((s, i) => {
                const present = students.filter((st) => s.attendance[st.id]).length;
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-navy/10 py-4 first:border-t-0">
                    <DateTile iso={s.start} active={tab === "upcoming" && i === 0} />
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="text-[15px] font-medium leading-snug tracking-tight text-navy">{s.title}</p>
                      <p className="mt-1 text-[13px] text-navy/50">
                        {fmtDay(s.start, now)} · {fmtTime(s.start)} · {s.durationMin} min
                        {topicOf(s) ? ` · ${topicOf(s)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {tab === "upcoming" ? (
                        i === 0 ? (
                          <JoinButton session={s} size="sm" surface="white" />
                        ) : new Date(s.start).getTime() - now < 12 * 3_600_000 ? (
                          <SessionStatus session={s} />
                        ) : null
                      ) : (
                        <>
                          <Btn variant="outline" size="sm" onClick={() => setRegisterId(s.id)}>
                            <Users size={13} /> {present} / {students.length} present
                          </Btn>
                          <Btn variant={s.recordingUrl ? "outline" : "navy"} size="sm" onClick={() => setRecordingFor(s)}>
                            {s.recordingUrl ? <Check size={13} /> : <Link2 size={13} />}
                            {s.recordingUrl ? "Recording linked" : "Add recording"}
                          </Btn>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </Rise>
      </div>

      <Modal open={scheduling} onClose={() => setScheduling(false)} eyebrow={cohort.name} title="Schedule a class">
        <ScheduleForm cohortId={cohortId} onDone={() => setScheduling(false)} />
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
