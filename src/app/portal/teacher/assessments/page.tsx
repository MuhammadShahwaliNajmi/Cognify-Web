"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Pencil, PenLine, Plus, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeacher } from "@/lib/portal/store";
import { uploadFile } from "@/lib/portal/storage";
import { assessmentState, attemptFor, cohortOf, submissionFor, type AssessmentState } from "@/lib/portal/selectors";
import { DAY, dateInput, fmtDate, fmtDuration, fmtTime, timeInput } from "@/lib/portal/format";
import type {Assignment, Student } from "@/lib/portal/types";
import { Btn, EmptyRow, Field, Label, Modal, PageHeader, Picker, RowLink, Status, Table, Td, fieldCls } from "@/components/portal/ui";
import { QuestionPaperField, TypedAnswer, WorkFile, hasFile } from "@/components/portal/work";

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

/* ---------------- create / edit ---------------- */
function AssessmentForm({ cohorts, editing, onDone }: { cohorts: { id: string; name: string }[]; editing?: Assignment; onDone: () => void }) {
  const { db, addAssessment, updateAssessment, deleteAssignment, toast } = useTeacher();
  const startBy = editing ? new Date(editing.dueAt) : null;
  const [f, setF] = useState({
    cohortId: editing?.cohortId ?? cohorts[0]?.id ?? "",
    title: editing?.title ?? "",
    unit: editing?.unit ?? "",
    brief: editing?.brief ?? "",
    questions: editing ? db.questions[editing.id] ?? "" : "",
    date: dateInput(startBy ?? new Date(Date.now() + 2 * DAY)),
    time: startBy ? timeInput(startBy) : "21:00",
    limit: String(editing?.timeLimitMin ?? 60),
    maxMarks: String(editing?.maxMarks ?? 20),
  });
  const [deleting, setDeleting] = useState(false);
  // a clock that is already running keeps its length; a mark already given keeps its total
  const started = !!editing && db.attempts.some((t) => t.assignmentId === editing.id);
  const marked = !!editing && db.submissions.some((x) => x.assignmentId === editing.id && x.status === "marked");
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
    (editing ? !Number.isNaN(due.getTime()) : due.getTime() > Date.now()) &&
    (f.questions.trim() || paper || editing?.attachmentFileId);

  return (
    <div className="space-y-5">
      {!editing && (
        <Field label="Student">
          <select value={f.cohortId} onChange={(e) => set("cohortId", e.target.value)} className={fieldCls}>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Title">
        <input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Unit 2 test: market failure" className={fieldCls} />
      </Field>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Topic">
          <input value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="Market failure" className={fieldCls} />
        </Field>
        <Field label="Marks">
          <input
            value={f.maxMarks}
            onChange={(e) => set("maxMarks", e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            disabled={marked}
            className={cn(fieldCls, marked && "opacity-60")}
          />
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
          <input
            value={f.limit}
            onChange={(e) => set("limit", e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            disabled={started}
            className={cn(fieldCls, started && "opacity-60")}
          />
        </Field>
      </div>
      <Field label="Instructions (visible before starting)">
        <textarea value={f.brief} onChange={(e) => set("brief", e.target.value)} rows={3} placeholder="Answer all questions. Show your working." className={cn(fieldCls, "resize-none")} />
      </Field>
      <Field label="Questions (hidden until the student starts)">
        <textarea value={f.questions} onChange={(e) => set("questions", e.target.value)} rows={6} className={cn(fieldCls, "resize-y")} />
      </Field>
      {editing && <QuestionPaperField a={editing} label="Question paper (hidden until the student starts)" />}
      {!editing && (
        <Field label="Question paper (optional, hidden until the student starts)">
          <input
            type="file"
            onChange={(e) => setPaper(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-navy file:mr-3 file:rounded-full file:border-0 file:bg-navy-deep file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gold"
          />
        </Field>
      )}
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
          if (editing) {
            const saved = await updateAssessment(editing.id, {
              title: f.title.trim(),
              unit: f.unit.trim(),
              brief: f.brief.trim(),
              dueAt: due.toISOString(),
              maxMarks: marks,
              timeLimitMin: limit,
              questions: f.questions,
            });
            setBusy(false);
            if (!saved) return;
            toast("Assessment saved");
            onDone();
            return;
          }
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
        {!editing && <Plus size={16} />}
        {busy ? "Saving…" : editing ? "Save changes" : "Set assessment"}
      </Btn>

      {editing &&
        (deleting ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border-l-[3px] border-gold bg-navy/[0.04] p-4">
            <p className="flex-1 text-[15px] font-semibold text-navy">Delete this assessment, its attempt and answer?</p>
            <Btn
              variant="navy"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await deleteAssignment(editing.id);
                setBusy(false);
                if (!ok) return;
                toast("Assessment deleted");
                onDone();
              }}
            >
              <Trash2 size={14} /> Delete
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => setDeleting(false)}>
              Keep
            </Btn>
          </div>
        ) : (
          <div>
            <Btn variant="ghost" size="sm" onClick={() => setDeleting(true)}>
              <Trash2 size={14} /> Delete assessment
            </Btn>
          </div>
        ))}
    </div>
  );
}

/* ---------------- one student's attempt ---------------- */
function AttemptDetail({ a, student, onClose }: { a: Assignment; student: Student | undefined; onClose: () => void }) {
  const { db, now, openAttachment, allowRetake, toast } = useTeacher();
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

      {sub?.answerText && <TypedAnswer text={sub.answerText} />}
      {sub && hasFile(sub) && <WorkFile sub={sub} className="[&_iframe]:h-[60vh]" />}

      <div className="flex flex-wrap gap-2.5 border-t border-navy/10 pt-5">
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
  const [editId, setEditId] = useState<string | null>(null);
  const editing = db.assignments.find((a) => a.id === editId);

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
        head={[{ label: "Assessment" }, { label: "Student" }, { label: "Time" }, { label: "Start before" }, { label: "Status" }, { label: "Score", align: "right" }, { label: " ", align: "right" }]}
      >
        {rows.length === 0 ? (
          <EmptyRow cols={7}>No assessments yet.</EmptyRow>
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
                <Td align="right">
                  <button
                    type="button"
                    aria-label={`Edit ${a.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditId(a.id);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="grid h-8 w-8 place-items-center rounded-md text-navy hover:bg-navy/[0.06] focus-gold"
                  >
                    <Pencil size={14} />
                  </button>
                </Td>
              </RowLink>
            );
          })
        )}
      </Table>

      <Modal open={creating} onClose={() => setCreating(false)} wide title="New assessment">
        <AssessmentForm cohorts={who === "all" ? cohorts : cohorts.filter((c) => c.id === who)} onDone={() => setCreating(false)} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditId(null)} wide eyebrow={editing ? cohortOf(db, editing.cohortId).name : undefined} title="Edit assessment">
        {editing && <AssessmentForm key={editing.id} cohorts={cohorts} editing={editing} onDone={() => setEditId(null)} />}
      </Modal>

      <Modal open={!!open} onClose={() => setOpenId(null)} wide eyebrow={open?.student?.name} title={open?.a.title ?? ""}>
        {open && <AttemptDetail key={open.a.id} a={open.a} student={open.student} onClose={() => setOpenId(null)} />}
      </Modal>
    </>
  );
}
