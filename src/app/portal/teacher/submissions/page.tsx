"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { cohortOf } from "@/lib/portal/selectors";
import { useTeacher } from "@/lib/portal/store";
import { HOUR, fmtDate, fmtDuration, fmtRelative, fmtTime } from "@/lib/portal/format";
import type { Submission } from "@/lib/portal/types";
import { Avatar, Btn, Chip, EmptyRow, Field, Label, Modal, PageHeader, Picker, RowLink, Segmented, Status, Table, Td, fieldCls } from "@/components/portal/ui";

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

function MarkForm({ sub, onDone }: { sub: Submission; onDone: () => void }) {
  const { db, markWork, openSubmission, toast } = useTeacher();
  const [busy, setBusy] = useState(false);
  const a = db.assignments.find((x) => x.id === sub.assignmentId)!;
  const st = db.students.find((s) => s.id === sub.studentId)!;
  const [marks, setMarks] = useState(sub.marks !== undefined ? String(sub.marks) : "");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  const [strengths, setStrengths] = useState((sub.strengths ?? []).join("\n"));
  const [improvements, setImprovements] = useState((sub.improvements ?? []).join("\n"));

  const n = Number(marks);
  const marksOk = marks.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= a.maxMarks;
  const ok = marksOk && feedback.trim().length > 0;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[0.9fr_1.1fr]">
      {/* the script */}
      <div>
        <div className="flex items-center gap-3">
          <Avatar name={st.name} />
          <div>
            <p className="text-[15px] font-semibold tracking-tight text-navy">{st.name}</p>
            <p className="text-[13px] text-navy">
              {cohortOf(db, st.cohortId).name} {st.predicted ? ` · predicted ${st.predicted}` : ""}
            </p>
          </div>
        </div>

        {sub.answerText && (
          <div className="mt-4 max-h-80 overflow-y-auto rounded-2xl border border-navy/10 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy">Typed answer</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-navy">{sub.answerText}</p>
          </div>
        )}

        {(sub.filePath || sub.driveFileId || !sub.answerText) && (
        <button
          type="button"
          onClick={() => (sub.filePath || sub.driveFileId ? openSubmission(sub) : toast("No file was attached to this submission."))}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-navy/10 p-3.5 text-left transition-colors hover:border-gold focus-gold"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-deep text-gold">
            <FileText size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-navy">{sub.fileName}</span>
            <span className="block text-xs text-navy">
              {sub.fileSize} · {fmtDate(sub.submittedAt)}, {fmtTime(sub.submittedAt)} · tap to open
            </span>
          </span>
        </button>
        )}

        {sub.note && (
          <div className="mt-3 rounded-2xl bg-gold/15 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy">Note from {st.name.split(" ")[0]}</p>
            <p className="mt-1.5 text-sm italic leading-relaxed text-navy">&ldquo;{sub.note}&rdquo;</p>
          </div>
        )}

        <div className="mt-3 rounded-2xl bg-navy/[0.04] p-4">
          <Label>The task · {a.maxMarks} marks</Label>
          <p className="mt-2 text-sm leading-relaxed text-navy">{a.brief}</p>
          {db.questions[a.id] && <p className="mt-3 whitespace-pre-wrap border-t border-navy/10 pt-3 text-sm leading-relaxed text-navy">{db.questions[a.id]}</p>}
        </div>
      </div>

      {/* the mark */}
      <div className="space-y-5">
        <Field label={`Marks (out of ${a.maxMarks})`}>
          <div className="mt-2 flex items-center gap-3">
            <input
              value={marks}
              onChange={(e) => setMarks(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="0"
              aria-invalid={marks !== "" && !marksOk}
              className={cn(fieldCls, "!mt-0 w-28 text-center text-xl font-semibold tabular-nums")}
            />
            <span className="text-lg font-medium text-navy">/ {a.maxMarks}</span>
            {marksOk && <Chip tone="navy">{Math.round((n / a.maxMarks) * 100)}%</Chip>}
          </div>
        </Field>
        {marks !== "" && !marksOk && <p className="-mt-2 text-xs font-medium text-navy">Enter a mark between 0 and {a.maxMarks}.</p>}

        <Field label="Overall feedback">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            placeholder="What level is this, and why?"
            className={cn(fieldCls, "resize-none")}
          />
        </Field>
        <Field label="What they did well">
          <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={2} className={cn(fieldCls, "resize-none")} />
        </Field>
        <Field label="To gain more marks">
          <textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} rows={2} className={cn(fieldCls, "resize-none")} />
        </Field>

        <Btn
          variant="gold"
          size="lg"
          disabled={!ok || busy}
          onClick={async () => {
            setBusy(true);
            const saved = await markWork(sub.id, { marks: n, feedback: feedback.trim(), strengths: lines(strengths), improvements: lines(improvements) });
            setBusy(false);
            if (!saved) return;
            toast(`Returned to ${st.name.split(" ")[0]}`);
            onDone();
          }}
        >
          <Send size={16} />
          {busy ? "Saving…" : "Return to student"}
        </Btn>
      </div>
    </div>
  );
}

type Tab = "queue" | "returned" | "all";

function Submissions() {
  const { db, now } = useTeacher();
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>("queue");
  const [who, setWho] = useState("all");
  const [openId, setOpenId] = useState<string | null>(params.get("open"));

  const subs = db.submissions.filter((x) => who === "all" || x.studentId === who);
  const queue = subs
    .filter((x) => x.status === "submitted")
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  const returned = subs
    .filter((x) => x.status === "marked")
    .sort((a, b) => new Date(b.markedAt!).getTime() - new Date(a.markedAt!).getTime());
  const all = [...subs].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  const list = tab === "queue" ? queue : tab === "returned" ? returned : all;

  const open = db.submissions.find((x) => x.id === openId) ?? null;
  const openA = open && db.assignments.find((a) => a.id === open.assignmentId);
  const close = () => {
    setOpenId(null);
    if (params.get("open")) router.replace("/portal/teacher/submissions/", { scroll: false });
  };

  return (
    <>
      <PageHeader title="Submissions" />

      <div className="mb-5">
        <Picker
          label="Student"
          value={who}
          onChange={setWho}
          options={[{ value: "all", label: "All students" }, ...db.students.map((s) => ({ value: s.id, label: s.name }))]}
        />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "queue", label: "To mark", count: queue.length },
          { value: "returned", label: "Returned", count: returned.length },
          { value: "all", label: "All", count: all.length },
        ]}
      />

      <div className="mt-4">
        <Table
          head={[{ label: "Student" }, { label: "Assignment" }, { label: "Submitted" }, { label: "Status" }, { label: "Score", align: "right" }]}
        >
          {list.length === 0 ? (
            <EmptyRow cols={5}>
              {tab === "queue" ? "Nothing to mark. New work appears here the moment a student hands it in." : "Nothing here yet."}
            </EmptyRow>
          ) : (
            list.map((x) => {
              const st = db.students.find((s) => s.id === x.studentId);
              const a = db.assignments.find((y) => y.id === x.assignmentId);
              if (!st || !a) return null;
              const left = new Date(x.submittedAt).getTime() + 24 * HOUR - now;
              return (
                <RowLink key={x.id} onClick={() => setOpenId(x.id)}>
                  <Td className="whitespace-nowrap font-medium text-navy">{st.name}</Td>
                  <Td>{a.title}</Td>
                  <Td className="whitespace-nowrap" >
                    <span title={`${fmtDate(x.submittedAt)}, ${fmtTime(x.submittedAt)}`}>{fmtRelative(x.submittedAt, now)}</span>
                  </Td>
                  <Td>
                    {x.status === "marked" ? (
                      <Status tone="done">Returned</Status>
                    ) : left < 0 ? (
                      <Status tone="attention">Late by {fmtDuration(-left)}</Status>
                    ) : left < 6 * HOUR ? (
                      <Status tone="attention">{fmtDuration(left)} left</Status>
                    ) : (
                      <Status>{fmtDuration(left)} left</Status>
                    )}
                  </Td>
                  <Td align="right" className="whitespace-nowrap tabular-nums">
                    {x.status === "marked" ? (
                      <span className="font-semibold text-navy">
                        {x.marks} <span className="font-normal text-navy">/ {a.maxMarks}</span>
                      </span>
                    ) : (
                      <span className="font-medium text-navy underline decoration-gold decoration-2 underline-offset-4">Mark</span>
                    )}
                  </Td>
                </RowLink>
              );
            })
          )}
        </Table>
      </div>

      <Modal open={!!open} onClose={close} wide eyebrow={openA ? `${openA.kind}${openA.unit ? ` · ${openA.unit}` : ""}` : undefined} title={openA?.title ?? ""}>
        {open && <MarkForm key={open.id} sub={open} onDone={close} />}
      </Modal>
    </>
  );
}

export default function TeacherSubmissions() {
  return (
    <Suspense>
      <Submissions />
    </Suspense>
  );
}
