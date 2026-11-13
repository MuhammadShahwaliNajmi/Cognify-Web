"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Paperclip, PenLine, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeacher } from "@/lib/portal/store";
import { uploadFile } from "@/lib/portal/storage";
import { assessmentState, attemptFor, cohortOf, submissionFor, type AssessmentState } from "@/lib/portal/selectors";
import { DAY, dateInput, fmtDate, fmtDuration, fmtTime } from "@/lib/portal/format";
import type {Assignment, Student } from "@/lib/portal/types";
import { Btn, EmptyRow, Field, Label, Modal, PageHeader, Picker, RowLink, Status, Table, Td, fieldCls } from "@/components/portal/ui";

const STATE_LABEL: Record<AssessmentState, string> = {
  upcoming: "Not started",
  "in-progress": "In progress",
  grace: "In progress",
  submitted: "To mark",
  marked: "Marked",
  missed: "Missed",
  "time-up": "No answer",
};
const tone = (s: AssessmentState) => (s === "marked" ? "done" : s === "submitted" || s === "in-progress" || s === "grace" ? "attention" : "plain");

/* ---------------- create ---------------- */
function NewAssessment({ cohorts, onDone }: { cohorts: { id: string; name: string }[]; onDone: () => void }) {
  const { addAssessment, toast } = useTeacher();
  const [f, setF] = useState({
    cohortId: cohorts[0]?.id ?? "",
    title: "",
    unit: "",
    brief: "",
    questions: "",
    date: dateInput(new Date(Date.now() + 2 * DAY)),
    time: "21:00",
    limit: "60",
    maxMarks: "20",
  });
  const [paper, setPaper] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const limit = Number(f.limit);
  const marks = Number(f.maxMarks);
  const due = new Date(`${f.date}T${f.time}`);
  const ok =
    f.cohortId &&
    f.title.trim() &&
    f.unit.trim() &&
    limit >= 5 &&
    limit <= 600 &&
    marks > 0 &&
    due.getTime() > Date.now() &&
    (f.questions.trim() || paper);

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
      <Field label="Title">
        <input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Unit 2 test: market failure" className={fieldCls} />
      </Field>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Topic">
          <input value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="Market failure" className={fieldCls} />
        </Field>
        <Field label="Marks">
          <input value={f.maxMarks} onChange={(e) => set("maxMarks", e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={fieldCls} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field label="Start before (date)">
          <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Start before (time)">
          <input type="time" value={f.time} onChange={(e) => set("time", e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Time limit (minutes)">
          <input value={f.limit} onChange={(e) => set("limit", e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={fieldCls} />
        </Field>
      </div>
      <Field label="Instructions (visible before starting)">
        <textarea value={f.brief} onChange={(e) => set("brief", e.target.value)} rows={3} placeholder="Answer all questions. Show your working." className={cn(fieldCls, "resize-none")} />
      </Field>
      <Field label="Questions (hidden until the student starts)">
        <textarea value={f.questions} onChange={(e) => set("questions", e.target.value)} rows={6} className={cn(fieldCls, "resize-y")} />
      </Field>
      <Field label="Question paper (optional, hidden until the student starts)">
        <input
          type="file"
          onChange={(e) => setPaper(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-navy file:mr-3 file:rounded-full file:border-0 file:bg-navy-deep file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gold"
        />
      </Field>
      {progress !== null && (
        <div className="-mt-2 h-1.5 overflow-hidden rounded-full bg-navy/10">
          <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(3, progress * 100)}%` }} />
        </div>
      )}
      <Btn
        variant="gold"
        size="lg"
        disabled={!ok || busy}
        onClick={async () => {
          setBusy(true);
          let attachment: Partial<Pick<Assignment, "attachmentFileId" | "attachmentName" | "attachmentMime">> = {};
          if (paper) {
            try {
              setProgress(0);
              const up = await uploadFile(paper, { purpose: "assignment", cohortId: f.cohortId }, setProgress);
              attachment = { attachmentFileId: up.id, attachmentName: paper.name, attachmentMime: up.mimeType || paper.type };
            } catch (e) {
              setBusy(false);
              setProgress(null);
              toast(e instanceof Error ? e.message : "Upload failed");
              return;
            }
          }
          const saved = await addAssessment({
            cohortId: f.cohortId,
            title: f.title.trim(),
            kind: "Assessment",
            strand: null,
            unit: f.unit.trim(),
            brief: f.brief.trim(),
            dueAt: due.toISOString(),
            maxMarks: marks,
            timeLimitMin: limit,
            questions: f.questions,
            ...attachment,
          });
          setBusy(false);
          if (!saved) return;
          toast("Assessment set");
          onDone();
        }}
      >
        <Plus size={16} />
        {busy ? "Saving…" : "Set assessment"}
      </Btn>
    </div>
  );
}

/* ---------------- one student's attempt ---------------- */
function AttemptDetail({ a, student, onClose }: { a: Assignment; student: Student | undefined; onClose: () => void }) {
  const { db, now, openSubmission, openAttachment, allowRetake, toast } = useTeacher();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const attempt = student ? attemptFor(db, a.id, student.id) : undefined;
  const sub = student ? submissionFor(db, a.id, student.id) : undefined;
  const state = student ? assessmentState(db, a, student.id, now) : "upcoming";
  const used = attempt && sub ? new Date(sub.submittedAt).getTime() - new Date(attempt.startedAt).getTime() : null;
  const late = attempt && sub ? new Date(sub.submittedAt).getTime() > new Date(attempt.endsAt).getTime() : false;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Status tone={tone(state)}>{student ? STATE_LABEL[state] : "No student yet"}</Status>
        <Status>{a.timeLimitMin} min</Status>
        <Status>
          Start before {fmtDate(a.dueAt)}, {fmtTime(a.dueAt)}
        </Status>
      </div>

      {attempt && (
        <dl className="grid grid-cols-2 gap-4 rounded-xl border border-navy/15 p-4 sm:grid-cols-3">
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-navy">Started</dt>
            <dd className="mt-1 text-sm font-semibold text-navy">
              {fmtDate(attempt.startedAt)}, {fmtTime(attempt.startedAt)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-navy">Submitted</dt>
            <dd className="mt-1 text-sm font-semibold text-navy">{sub ? `${fmtTime(sub.submittedAt)}${late ? " (grace period)" : ""}` : "—"}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-navy">Time used</dt>
            <dd className="mt-1 text-sm font-semibold text-navy">{used !== null ? fmtDuration(used) : "—"}</dd>
          </div>
        </dl>
      )}

      {a.brief && (
        <div>
          <Label>Instructions</Label>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-navy">{a.brief}</p>
        </div>
      )}
      {db.questions[a.id] && (
        <div>
          <Label>Questions</Label>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-navy">{db.questions[a.id]}</p>
        </div>
      )}
      {a.attachmentFileId && (
        <Btn variant="outline" size="sm" onClick={() => openAttachment(a.id)}>
          <Paperclip size={14} /> Question paper
        </Btn>
      )}

      {sub?.answerText && (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-navy/15 p-4">
          <Label>Typed answer</Label>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-navy">{sub.answerText}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2.5 border-t border-navy/10 pt-5">
        {sub && (sub.driveFileId || sub.filePath) && (
          <Btn variant="outline" onClick={() => openSubmission(sub)}>
            <FileText size={15} /> Open file
          </Btn>
        )}
        {sub && (
          <Btn variant="gold" onClick={() => router.push(`/portal/teacher/submissions/?open=${sub.id}`)}>
            <PenLine size={15} /> {sub.status === "marked" ? "Edit mark" : "Mark"}
          </Btn>
        )}
        {student && (attempt || sub) && (
          <Btn variant="ghost" onClick={() => setConfirm(true)}>
            <RotateCcw size={15} /> Allow retake
          </Btn>
        )}
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Allow a retake?">
        <div className="space-y-5">
          <p className="text-[15px] text-navy">
            {student?.name}&apos;s attempt{sub ? " and answer" : ""} will be cleared. They can start again before {fmtDate(a.dueAt)},{" "}
            {fmtTime(a.dueAt)}.
          </p>
          <div className="flex gap-2.5">
            <Btn
              variant="navy"
              onClick={async () => {
                if (student && (await allowRetake(a.id, student.id))) {
                  toast("Retake allowed");
                  setConfirm(false);
                  onClose();
                }
              }}
            >
              <RotateCcw size={15} /> Allow retake
            </Btn>
            <Btn variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- page ---------------- */
export default function TeacherAssessments() {
  const { db, now } = useTeacher();
  const [who, setWho] = useState("all");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const cohorts = [...db.cohorts].sort((a, b) => a.name.localeCompare(b.name));
  const rows = db.assignments
    .filter((a) => a.timeLimitMin && (who === "all" || a.cohortId === who))
    .map((a) => {
      const student = db.students.find((s) => s.cohortId === a.cohortId);
      return { a, student, state: student ? assessmentState(db, a, student.id, now) : ("upcoming" as AssessmentState) };
    })
    .sort((x, y) => new Date(y.a.dueAt).getTime() - new Date(x.a.dueAt).getTime());
  const open = rows.find((r) => r.a.id === openId);

  return (
    <>
      <PageHeader
        title="Assessments"
        actions={
          <>
            <Picker
              label="Student"
              value={who}
              onChange={setWho}
              options={[{ value: "all", label: "All students" }, ...cohorts.map((c) => ({ value: c.id, label: c.name }))]}
            />
            <Btn variant="navy" onClick={() => setCreating(true)}>
              <Plus size={15} /> New assessment
            </Btn>
          </>
        }
      />

      <Table
        minWidth={720}
        head={[{ label: "Assessment" }, { label: "Student" }, { label: "Time" }, { label: "Start before" }, { label: "Status" }, { label: "Score", align: "right" }]}
      >
        {rows.length === 0 ? (
          <EmptyRow cols={6}>No assessments yet.</EmptyRow>
        ) : (
          rows.map(({ a, student, state }) => {
            const sub = student ? submissionFor(db, a.id, student.id) : undefined;
            return (
              <RowLink key={a.id} onClick={() => setOpenId(a.id)}>
                <Td className="font-medium">{a.title}</Td>
                <Td className="whitespace-nowrap">{student?.name ?? cohortOf(db, a.cohortId).name}</Td>
                <Td className="whitespace-nowrap">{a.timeLimitMin} min</Td>
                <Td className="whitespace-nowrap">
                  {fmtDate(a.dueAt)}, {fmtTime(a.dueAt)}
                </Td>
                <Td>
                  <Status tone={tone(state)}>{student ? STATE_LABEL[state] : "Not joined"}</Status>
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
            );
          })
        )}
      </Table>

      <Modal open={creating} onClose={() => setCreating(false)} wide title="New assessment">
        <NewAssessment cohorts={who === "all" ? cohorts : cohorts.filter((c) => c.id === who)} onDone={() => setCreating(false)} />
      </Modal>

      <Modal open={!!open} onClose={() => setOpenId(null)} wide eyebrow={open?.student?.name} title={open?.a.title ?? ""}>
        {open && <AttemptDetail key={open.a.id} a={open.a} student={open.student} onClose={() => setOpenId(null)} />}
      </Modal>
    </>
  );
}
