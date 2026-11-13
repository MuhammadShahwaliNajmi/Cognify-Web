"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, FileText, Paperclip, Send, Timer, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudent } from "@/lib/portal/store";
import { GRACE_MS, assessmentState, attemptFor, submissionFor, type AssessmentState } from "@/lib/portal/selectors";
import { fmtBytes, fmtClock, fmtDate, fmtDateLong, fmtRelative, fmtTime, MB } from "@/lib/portal/format";
import type { Assignment } from "@/lib/portal/types";
import { Btn, EmptyRow, Label, Modal, PageHeader, RowLink, Status, Table, Td, fieldCls } from "@/components/portal/ui";
import { useTick } from "@/components/portal/classroom";

const STATE_LABEL: Record<AssessmentState, string> = {
  upcoming: "Not started",
  "in-progress": "In progress",
  grace: "Time up · submit now",
  submitted: "Submitted",
  marked: "Marked",
  missed: "Missed",
  "time-up": "Time ran out",
};
const tone = (s: AssessmentState) =>
  s === "marked" || s === "submitted" ? "done" : s === "upcoming" || s === "in-progress" || s === "grace" ? "attention" : "plain";

/* ---------------- the timed room ---------------- */
function Room({ a }: { a: Assignment }) {
  const { db, me, startAssessment, submitWork, openAttachment, toast } = useStudent();
  const now = useTick(1000);
  const state = assessmentState(db, a, me.id, now);
  const attempt = attemptFor(db, a.id, me.id);
  const sub = submissionFor(db, a.id, me.id);
  const key = `cl-answer-${a.id}`;

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [answer, setAnswer] = useState(() => {
    try {
      return localStorage.getItem(key) ?? sub?.answerText ?? "";
    } catch {
      return sub?.answerText ?? "";
    }
  });
  const input = useRef<HTMLInputElement>(null);

  // keep a local copy of the typed answer, so a refresh or a dropped connection loses nothing
  useEffect(() => {
    try {
      localStorage.setItem(key, answer);
    } catch {
      /* storage unavailable: the answer still lives in the page */
    }
  }, [key, answer]);

  const live = state === "in-progress" || state === "grace";
  const left = attempt ? new Date(attempt.endsAt).getTime() - now : 0;
  const graceLeft = attempt ? new Date(attempt.endsAt).getTime() + GRACE_MS - now : 0;
  const canSend = live && !busy && (answer.trim().length > 0 || !!file || !!sub);

  const submit = async () => {
    if (!canSend) return;
    setBusy(true);
    setProgress(0);
    const ok = await submitWork({ assignmentId: a.id, studentId: me.id, file, answerText: answer, onProgress: setProgress });
    setBusy(false);
    if (!ok) return;
    setFile(null);
    toast(state === "grace" ? "Submitted" : "Submitted. You can still update it until the time is up.");
  };

  return (
    <div>
      <Link href="/portal/student/assessments/" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-gold">
        <ArrowLeft size={15} /> All assessments
      </Link>

      {/* header band: timer while live */}
      <div className={cn("rounded-2xl bg-navy-deep p-6", live && "sticky top-[7.5rem] z-30 shadow-[0_18px_40px_-20px_rgba(8,16,33,0.7)]")}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
              Timed assessment · {a.timeLimitMin} min · {a.maxMarks} marks
            </p>
            <h1 className="mt-1.5 text-[1.5rem] font-bold leading-tight tracking-tight text-white">{a.title}</h1>
          </div>
          {live && (
            <div className="text-right">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/80">
                {state === "grace" ? "Time up · submitting closes in" : "Time left"}
              </p>
              <p className="text-[2rem] font-bold leading-none tabular-nums text-gold">{fmtClock(state === "grace" ? graceLeft : left)}</p>
            </div>
          )}
        </div>
      </div>

      {/* not started */}
      {state === "upcoming" && (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Fact label="Start before" value={`${fmtDate(a.dueAt)}, ${fmtTime(a.dueAt)}`} />
            <Fact label="Time once started" value={`${a.timeLimitMin} minutes`} />
            <Fact label="Marks" value={String(a.maxMarks)} />
          </div>
          {a.brief && (
            <div className="rounded-xl border-l-[3px] border-gold bg-navy/[0.04] p-5">
              <Label>Instructions</Label>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-navy">{a.brief}</p>
            </div>
          )}
          <Btn variant="gold" size="lg" onClick={() => setConfirming(true)}>
            <Timer size={18} /> Start assessment
          </Btn>
        </div>
      )}

      {/* live */}
      {live && (
        <div className="mt-6 space-y-6">
          {a.brief && (
            <div className="rounded-xl border-l-[3px] border-gold bg-navy/[0.04] p-5">
              <Label>Instructions</Label>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-navy">{a.brief}</p>
            </div>
          )}
          {db.questions[a.id] && (
            <div className="rounded-xl border border-navy/15 p-5">
              <Label>Questions</Label>
              <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-navy">{db.questions[a.id]}</p>
            </div>
          )}
          {a.attachmentFileId && (
            <Btn variant="navy" onClick={() => openAttachment(a.id)}>
              <Paperclip size={15} /> Open question paper
            </Btn>
          )}

          <div className="rounded-xl border border-navy/15 p-5">
            <Label>Your answer</Label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={12}
              placeholder="Type your answer here, or upload your written work below."
              className={cn(fieldCls, "mt-3 resize-y leading-relaxed")}
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                ref={input}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > 50 * MB) return toast("That file is over 50 MB.");
                  setFile(f);
                  e.target.value = "";
                }}
              />
              {file ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-gold bg-gold/10 px-3.5 py-2 text-sm font-medium text-navy">
                  <FileText size={14} /> {file.name} · {fmtBytes(file.size)}
                  <button type="button" aria-label="Remove file" onClick={() => setFile(null)} className="text-navy hover:text-gold">
                    <X size={14} />
                  </button>
                </span>
              ) : (
                <Btn variant="outline" onClick={() => input.current?.click()}>
                  <UploadCloud size={15} /> {sub?.fileName ? "Replace file" : "Upload file"}
                </Btn>
              )}
              {sub?.fileName && !file && <span className="text-sm text-navy">Uploaded: {sub.fileName}</span>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Btn variant="gold" size="lg" disabled={!canSend} onClick={submit}>
              <Send size={16} />
              {busy ? (file ? `Uploading… ${Math.round(progress * 100)}%` : "Submitting…") : sub ? "Update submission" : "Submit"}
            </Btn>
            {sub && (
              <span className="text-sm font-medium text-navy">
                Submitted {fmtRelative(sub.submittedAt, now)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* finished */}
      {(state === "submitted" || state === "marked" || state === "missed" || state === "time-up") && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Status tone={tone(state)}>{STATE_LABEL[state]}</Status>
            {attempt && (
              <span className="text-sm text-navy">
                Started {fmtDateLong(attempt.startedAt)}, {fmtTime(attempt.startedAt)}
              </span>
            )}
          </div>
          {state === "missed" && <p className="text-[15px] text-navy">This assessment closed on {fmtDate(a.dueAt)} at {fmtTime(a.dueAt)} without being started.</p>}
          {state === "time-up" && <p className="text-[15px] text-navy">The time ran out before anything was submitted.</p>}

          {sub?.status === "marked" && (
            <div className="rounded-2xl bg-navy-deep p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Score</p>
              <p className="mt-1 text-[2rem] font-bold leading-none tabular-nums text-white">
                {sub.marks} <span className="text-white/70">/ {a.maxMarks}</span>
              </p>
              {sub.feedback && <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-white/90">{sub.feedback}</p>}
            </div>
          )}
          {sub?.answerText && (
            <div className="rounded-xl border border-navy/15 p-5">
              <Label>Your answer</Label>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-navy">{sub.answerText}</p>
            </div>
          )}
          {sub?.fileName && <p className="text-sm text-navy">File handed in: {sub.fileName}</p>}
        </div>
      )}

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Start now?">
        <div className="space-y-5">
          <p className="text-[15px] leading-relaxed text-navy">
            You&apos;ll have <span className="font-semibold">{a.timeLimitMin} minutes</span>. The clock keeps running even if you close this page.
          </p>
          <div className="flex gap-2.5">
            <Btn
              variant="gold"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await startAssessment(a.id);
                setBusy(false);
                setConfirming(false);
                if (ok) toast("Assessment started. Good luck!");
              }}
            >
              <Clock size={15} /> {busy ? "Starting…" : "Start"}
            </Btn>
            <Btn variant="ghost" onClick={() => setConfirming(false)}>
              Not yet
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-navy/15 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-navy">{label}</p>
      <p className="mt-1.5 text-lg font-bold text-navy">{value}</p>
    </div>
  );
}

/* ---------------- list ---------------- */
function Assessments() {
  const { db, me, now } = useStudent();
  const router = useRouter();
  const params = useSearchParams();
  const openId = params.get("open");

  const list = db.assignments
    .filter((a) => a.cohortId === me.cohortId && a.timeLimitMin)
    .map((a) => ({ a, state: assessmentState(db, a, me.id, now), sub: submissionFor(db, a.id, me.id) }))
    .sort((x, y) => {
      const rank = (s: AssessmentState) => (s === "in-progress" || s === "grace" ? 0 : s === "upcoming" ? 1 : 2);
      return rank(x.state) - rank(y.state) || new Date(x.a.dueAt).getTime() - new Date(y.a.dueAt).getTime();
    });

  const open = openId ? list.find((r) => r.a.id === openId)?.a : undefined;
  if (open) return <Room key={open.id} a={open} />;

  return (
    <>
      <PageHeader title="Assessments" />
      <Table head={[{ label: "Assessment" }, { label: "Time" }, { label: "Start before" }, { label: "Status" }, { label: "Score", align: "right" }]}>
        {list.length === 0 ? (
          <EmptyRow cols={5}>No assessments yet.</EmptyRow>
        ) : (
          list.map(({ a, state, sub }) => (
            <RowLink key={a.id} onClick={() => router.push(`/portal/student/assessments/?open=${a.id}`)}>
              <Td className="font-medium">{a.title}</Td>
              <Td className="whitespace-nowrap">{a.timeLimitMin} min</Td>
              <Td className="whitespace-nowrap">
                {fmtDate(a.dueAt)}, {fmtTime(a.dueAt)}
              </Td>
              <Td>
                <Status tone={tone(state)}>{STATE_LABEL[state]}</Status>
              </Td>
              <Td align="right" className="whitespace-nowrap tabular-nums">
                {sub?.status === "marked" ? (
                  <span className="font-semibold">
                    {sub.marks} / {a.maxMarks}
                  </span>
                ) : (
                  <span>– / {a.maxMarks}</span>
                )}
              </Td>
            </RowLink>
          ))
        )}
      </Table>
    </>
  );
}

export default function StudentAssessments() {
  return (
    <Suspense>
      <Assessments />
    </Suspense>
  );
}
