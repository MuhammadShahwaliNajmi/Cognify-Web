"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, CheckCircle2, ClipboardCheck, Clock, FileText, Paperclip, TrendingUp, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtBytes, submissionFor, useStudent } from "@/lib/portal/store";
import { fmtDate, fmtDuration, fmtRelative, fmtTime } from "@/lib/portal/format";
import type { Assignment, Submission } from "@/lib/portal/types";
import { Btn, Card, Chip, Empty, Field, Label, Modal, PageHeader, Rise, Segmented, fieldCls } from "@/components/portal/ui";
import { Ring } from "@/components/portal/charts";

const HOUR = 3_600_000;
type Tab = "todo" | "submitted" | "marked";

/* ---------- upload form ---------- */
function SubmitForm({ a, replacing, onDone }: { a: Assignment; replacing?: boolean; onDone?: () => void }) {
  const { me, submitWork, toast } = useStudent();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const pick = (f: File | null) => {
    if (f && f.size > 25 * 1_048_576) {
      toast("That file is over 25 MB. Please export a smaller PDF.");
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!file || busy) return;
    setBusy(true);
    const ok = await submitWork({ assignmentId: a.id, studentId: me.id, file, note });
    setBusy(false);
    if (!ok) return;
    toast("Submitted. Feedback within 24 hours.");
    onDone?.();
  };

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-2xl border border-gold bg-gold/10 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-deep text-gold">
            <FileText size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy">{file.name}</p>
            <p className="text-xs text-navy/55">{fmtBytes(file.size)} · ready to submit</p>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            aria-label="Remove file"
            className="grid h-8 w-8 place-items-center rounded-full text-navy/50 transition-colors hover:text-navy focus-gold"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            pick(e.dataTransfer.files?.[0] ?? null);
          }}
          className={cn(
            "flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-colors focus-gold",
            over ? "border-gold bg-gold/10" : "border-navy/15 hover:border-gold"
          )}
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-navy-deep text-gold">
            <UploadCloud size={20} />
          </span>
          <span className="mt-3.5 text-[15px] font-semibold tracking-tight text-navy">
            {replacing ? "Choose a replacement file" : "Choose your file, or drop it here"}
          </span>
          <span className="mt-1 text-[13px] text-navy/50">PDF, Word, or clear photos of handwritten work</span>
        </button>
      )}

      <div className="mt-4">
        <Field label="Note for your examiner (optional)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Anything you were unsure about?"
            className={cn(fieldCls, "resize-none")}
          />
        </Field>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Btn variant="gold" size="lg" disabled={!file || busy} onClick={submit}>
          <ArrowUpRight size={17} />
          {busy ? "Uploading…" : replacing ? "Replace submission" : "Submit work"}
        </Btn>
        {replacing && (
          <Btn variant="ghost" onClick={onDone}>
            Cancel
          </Btn>
        )}
      </div>
    </div>
  );
}

/* ---------- detail (inside the modal) ---------- */
function Detail({ a, sub }: { a: Assignment; sub?: Submission }) {
  const { now, openFile } = useStudent();
  const [replacing, setReplacing] = useState(false);
  const msLeft = new Date(a.dueAt).getTime() - now;

  const steps = sub
    ? [
        { t: "Submitted", d: `${fmtDate(sub.submittedAt)}, ${fmtTime(sub.submittedAt)}`, done: true },
        {
          t: "With your examiner",
          d:
            sub.status === "marked"
              ? "Marked against the mark scheme"
              : `Feedback due in about ${fmtDuration(Math.max(0, new Date(sub.submittedAt).getTime() + 24 * HOUR - now))}`,
          done: sub.status === "marked",
          active: sub.status === "submitted",
        },
        {
          t: "Feedback returned",
          d: sub.markedAt ? `${fmtDate(sub.markedAt)}, ${fmtTime(sub.markedAt)}` : "You'll see your marks here",
          done: sub.status === "marked",
        },
      ]
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="navy">{a.kind}</Chip>
        <Chip tone="soft">
          {a.strand} · {a.unit}
        </Chip>
        <Chip tone="soft">{a.maxMarks} marks</Chip>
        {!sub && (
          <Chip tone={msLeft < 0 ? "navy" : msLeft < 48 * HOUR ? "gold" : "outline"}>
            <Clock size={11} />
            {msLeft < 0 ? `Was due ${fmtRelative(a.dueAt, now)}` : `Due ${fmtDate(a.dueAt)}, ${fmtTime(a.dueAt)}`}
          </Chip>
        )}
      </div>

      <div className="mt-5 rounded-2xl bg-navy/[0.04] p-5">
        <Label>The task</Label>
        <p className="mt-2 text-[15px] leading-relaxed text-navy/80">{a.brief}</p>
        {a.attachmentUrl && (
          <a
            href={a.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-3.5 py-2 text-[13px] font-semibold text-navy transition-colors hover:border-gold hover:text-gold focus-gold"
          >
            <Paperclip size={13} />
            Open the question paper
          </a>
        )}
      </div>

      {/* marked → results */}
      {sub?.status === "marked" && (
        <div className="mt-6">
          <div className="flex items-center gap-5">
            <Ring value={sub.marks ?? 0} max={a.maxMarks} />
            <div>
              <Label className="text-gold">Examiner feedback</Label>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-navy">
                {Math.round(((sub.marks ?? 0) / a.maxMarks) * 100)}%
              </p>
              <p className="mt-1 text-[13px] text-navy/50">Returned {fmtRelative(sub.markedAt!, now)}</p>
            </div>
          </div>
          <p className="mt-5 text-[15px] leading-relaxed text-navy/80">{sub.feedback}</p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {!!sub.strengths?.length && (
              <div className="rounded-2xl border border-navy/10 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/45">What you did well</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {sub.strengths.map((s) => (
                    <li key={s} className="flex gap-2.5 text-sm leading-relaxed text-navy/75">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-gold" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!!sub.improvements?.length && (
              <div className="rounded-2xl bg-navy-deep p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">To gain more marks</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {sub.improvements.map((s) => (
                    <li key={s} className="flex gap-2.5 text-sm leading-relaxed text-white/80">
                      <TrendingUp size={15} className="mt-0.5 shrink-0 text-gold" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* submitted → timeline */}
      {sub && (
        <div className="mt-6">
          <Label>Your submission</Label>
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-navy/10 p-3.5">
            <button
              type="button"
              onClick={() => sub.filePath && openFile(sub.filePath)}
              disabled={!sub.filePath}
              className="group flex min-w-0 flex-1 items-center gap-3 text-left focus-gold"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy/[0.05] text-navy transition-colors group-hover:bg-gold/20">
                <FileText size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-navy transition-colors group-hover:text-gold">{sub.fileName}</span>
                <span className="block text-xs text-navy/50">{sub.fileSize}{sub.filePath ? " · tap to open" : ""}</span>
              </span>
            </button>
            {sub.status === "submitted" && !replacing && (
              <Btn variant="ghost" size="sm" onClick={() => setReplacing(true)}>
                Replace
              </Btn>
            )}
          </div>
          {sub.note && <p className="mt-2.5 text-[13px] italic leading-relaxed text-navy/55">&ldquo;{sub.note}&rdquo;</p>}

          {replacing ? (
            <div className="mt-5">
              <SubmitForm a={a} replacing onDone={() => setReplacing(false)} />
            </div>
          ) : (
            <ol className="mt-5 flex flex-col">
              {steps.map((s, i) => (
                <li key={s.t} className="relative flex gap-3.5 pb-5 last:pb-0">
                  {i < steps.length - 1 && (
                    <span className={cn("absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-px", s.done ? "bg-gold" : "bg-navy/12")} />
                  )}
                  <span
                    className={cn(
                      "relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full",
                      s.done ? "bg-gold text-navy-deep" : s.active ? "border-2 border-gold bg-white" : "border border-navy/20 bg-white"
                    )}
                  >
                    {s.done ? <CheckCircle2 size={14} /> : s.active ? <span className="h-2 w-2 animate-pulse-node rounded-full bg-gold" /> : null}
                  </span>
                  <div>
                    <p className={cn("text-sm font-semibold tracking-tight", s.done || s.active ? "text-navy" : "text-navy/40")}>{s.t}</p>
                    <p className="text-[13px] text-navy/50">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* not submitted → upload */}
      {!sub && (
        <div className="mt-6">
          <Label>Hand in your work</Label>
          <div className="mt-3">
            <SubmitForm a={a} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- page ---------- */
function Assignments() {
  const { db, me, now } = useStudent();
  const router = useRouter();
  const params = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(params.get("open"));
  const [tab, setTab] = useState<Tab>("todo");

  const rows = db.assignments
    .filter((a) => a.cohortId === me.cohortId)
    .map((a) => ({ a, sub: submissionFor(db, a.id, me.id) }));
  const groups: Record<Tab, typeof rows> = {
    todo: rows.filter((r) => !r.sub).sort((x, y) => new Date(x.a.dueAt).getTime() - new Date(y.a.dueAt).getTime()),
    submitted: rows.filter((r) => r.sub?.status === "submitted"),
    marked: rows
      .filter((r) => r.sub?.status === "marked")
      .sort((x, y) => new Date(y.sub!.markedAt!).getTime() - new Date(x.sub!.markedAt!).getTime()),
  };
  const open = rows.find((r) => r.a.id === openId);

  const close = () => {
    setOpenId(null);
    if (params.get("open")) router.replace("/portal/student/assignments/", { scroll: false });
  };

  return (
    <>
      <PageHeader
        eyebrow="Weekly assignments & monthly assessments"
        title="Your"
        gold="Work"
        sub="Hand in each piece here. A trained examiner marks it against the mark scheme and returns it within 24 hours."
      />

      <Rise i={0}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "todo", label: "To do", count: groups.todo.length },
            { value: "submitted", label: "With examiner", count: groups.submitted.length },
            { value: "marked", label: "Marked", count: groups.marked.length },
          ]}
        />
      </Rise>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {groups[tab].map(({ a, sub }, i) => {
          const ms = new Date(a.dueAt).getTime() - now;
          return (
            <Rise key={a.id} i={i + 1}>
              <button type="button" onClick={() => setOpenId(a.id)} className="group block h-full w-full text-left focus-gold">
                <Card className="flex h-full flex-col transition-[border-color,transform,box-shadow] duration-200 group-hover:-translate-y-1 group-hover:border-gold/60">
                  <div className="flex items-center justify-between gap-3">
                    <Label>
                      {a.kind} · {a.strand}
                    </Label>
                    {sub?.status === "marked" ? (
                      <Chip tone="navy">
                        {sub.marks} / {a.maxMarks}
                      </Chip>
                    ) : sub ? (
                      <Chip tone="soft" dot>
                        With examiner
                      </Chip>
                    ) : (
                      <Chip tone={ms < 0 ? "navy" : ms < 48 * HOUR ? "gold" : "soft"}>
                        <Clock size={11} />
                        {ms < 0 ? "Overdue" : `Due ${fmtRelative(a.dueAt, now)}`}
                      </Chip>
                    )}
                  </div>
                  <h2 className="mt-3 text-[17px] font-semibold leading-snug tracking-tight text-navy transition-colors group-hover:text-gold">
                    {a.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-navy/55">
                    {sub?.status === "marked" ? sub.feedback : a.brief}
                  </p>
                  <p className="mt-auto pt-4 text-[13px] font-medium text-navy/45">
                    {a.unit} · {a.maxMarks} marks
                    {sub ? ` · submitted ${fmtRelative(sub.submittedAt, now)}` : ""}
                  </p>
                </Card>
              </button>
            </Rise>
          );
        })}
      </div>

      {groups[tab].length === 0 && (
        <Empty
          icon={<ClipboardCheck size={20} />}
          title={tab === "todo" ? "Nothing to hand in" : tab === "submitted" ? "Nothing waiting on an examiner" : "No marked work yet"}
          text={
            tab === "todo"
              ? "You're up to date. New assignments appear here every week."
              : tab === "submitted"
                ? "Work you submit shows here until your feedback comes back."
                : "Your marks and feedback will collect here."
          }
        />
      )}

      <Modal open={!!open} onClose={close} wide eyebrow={open ? `${open.a.kind} · ${open.a.unit}` : undefined} title={open?.a.title ?? ""}>
        {open && <Detail key={open.a.id} a={open.a} sub={open.sub} />}
      </Modal>
    </>
  );
}

export default function StudentAssignments() {
  return (
    <Suspense>
      <Assignments />
    </Suspense>
  );
}
