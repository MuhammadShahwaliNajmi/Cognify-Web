"use client";

import { useState } from "react";
import { CheckCircle2, FileText, PenLine, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { cohortOf, useTeacher } from "@/lib/portal/store";
import { fmtDate, fmtDuration, fmtRelative, fmtTime } from "@/lib/portal/format";
import type { Submission } from "@/lib/portal/types";
import { Avatar, Btn, Card, Chip, Empty, Field, Label, Modal, PageHeader, Rise, Segmented, fieldCls } from "@/components/portal/ui";

const HOUR = 3_600_000;
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

function MarkForm({ sub, onDone }: { sub: Submission; onDone: () => void }) {
  const { db, markWork, openFile, toast } = useTeacher();
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
            <p className="text-[13px] text-navy/50">
              {cohortOf(db, st.cohortId).name} {st.predicted ? ` · predicted ${st.predicted}` : ""}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => (sub.filePath ? openFile(sub.filePath) : toast("No file was attached to this submission."))}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-navy/10 p-3.5 text-left transition-colors hover:border-gold focus-gold"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-deep text-gold">
            <FileText size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-navy">{sub.fileName}</span>
            <span className="block text-xs text-navy/50">
              {sub.fileSize} · {fmtDate(sub.submittedAt)}, {fmtTime(sub.submittedAt)} · tap to open
            </span>
          </span>
        </button>

        {sub.note && (
          <div className="mt-3 rounded-2xl bg-gold/15 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/55">Note from {st.name.split(" ")[0]}</p>
            <p className="mt-1.5 text-sm italic leading-relaxed text-navy/80">&ldquo;{sub.note}&rdquo;</p>
          </div>
        )}

        <div className="mt-3 rounded-2xl bg-navy/[0.04] p-4">
          <Label>The task · {a.maxMarks} marks</Label>
          <p className="mt-2 text-sm leading-relaxed text-navy/70">{a.brief}</p>
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
            <span className="text-lg font-medium text-navy/40">/ {a.maxMarks}</span>
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
        <Field label="What they did well" hint="One point per line.">
          <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={2} className={cn(fieldCls, "resize-none")} />
        </Field>
        <Field label="To gain more marks" hint="One point per line. These feed the student's 'what to fix' list.">
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

export default function TeacherMarking() {
  const { db, now } = useTeacher();
  const [tab, setTab] = useState<"queue" | "returned">("queue");
  const [openId, setOpenId] = useState<string | null>(null);

  const queue = db.submissions
    .filter((x) => x.status === "submitted")
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  const returned = db.submissions
    .filter((x) => x.status === "marked")
    .sort((a, b) => new Date(b.markedAt!).getTime() - new Date(a.markedAt!).getTime())
    .slice(0, 20);
  const open = db.submissions.find((x) => x.id === openId) ?? null;
  const openA = open && db.assignments.find((a) => a.id === open.assignmentId);
  const urgent = queue.filter((x) => new Date(x.submittedAt).getTime() + 24 * HOUR - now < 6 * HOUR).length;

  return (
    <>
      <PageHeader
        title="Marking"
        sub={
          queue.length
            ? `Oldest first. Feedback is due within 24 hours of hand-in.${urgent ? ` ${urgent} due in the next 6 hours.` : ""}`
            : "Nothing waiting. Everything has been returned."
        }
      />

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "queue", label: "To mark", count: queue.length },
          { value: "returned", label: "Returned", count: returned.length },
        ]}
      />

      <Rise key={tab} className="mt-2">
        {(tab === "queue" ? queue : returned).length === 0 ? (
          <div className="mt-6">
            <Empty
              icon={<CheckCircle2 size={20} />}
              title={tab === "queue" ? "Nothing to mark" : "Nothing returned yet"}
              text={tab === "queue" ? "New work appears here the moment a student hands it in." : "Marked work collects here."}
            />
          </div>
        ) : (
          <ul className="divide-y divide-navy/10">
            {(tab === "queue" ? queue : returned).map((x) => {
              const st = db.students.find((s) => s.id === x.studentId);
              const a = db.assignments.find((y) => y.id === x.assignmentId);
              if (!st || !a) return null;
              const left = new Date(x.submittedAt).getTime() + 24 * HOUR - now;
              return (
                <li key={x.id}>
                  <button type="button" onClick={() => setOpenId(x.id)} className="group flex w-full items-center gap-4 py-4 text-left focus-gold">
                    <Avatar name={st.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium tracking-tight text-navy group-hover:text-gold">
                        {st.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-navy/50">
                        {a.title} · handed in {fmtRelative(x.submittedAt, now)}
                      </span>
                    </span>
                    {tab === "queue" ? (
                      <span className={left < 6 * HOUR ? "text-sm font-semibold text-navy" : "text-sm text-navy/55"}>
                        {left < 0 ? `Late by ${fmtDuration(-left)}` : `${fmtDuration(left)} left`}
                      </span>
                    ) : (
                      <span className="text-[15px] font-semibold tabular-nums text-navy">
                        {x.marks}
                        <span className="text-navy/40">/{a.maxMarks}</span>
                      </span>
                    )}
                    <span className="hidden text-sm font-medium text-navy/45 group-hover:text-gold sm:inline">
                      {tab === "queue" ? "Mark" : "Edit"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Rise>

      <Modal open={!!open} onClose={() => setOpenId(null)} wide eyebrow={openA ? `${openA.kind} · ${openA.unit}` : undefined} title={openA?.title ?? ""}>
        {open && <MarkForm key={open.id} sub={open} onDone={() => setOpenId(null)} />}
      </Modal>
    </>
  );
}
