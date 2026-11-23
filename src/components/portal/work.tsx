"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, ExternalLink, Eye, FileText, Paperclip, TrendingUp, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabase } from "@/lib/supabase/client";
import { fileLink, previewKind, uploadFile } from "@/lib/portal/storage";
import { usePortal } from "@/lib/portal/store";
import { fmtBytes, fmtDate, fmtRelative, fmtTime } from "@/lib/portal/format";
import { scoreText } from "@/lib/portal/selectors";
import type { Assignment, FeedbackFile, Submission } from "@/lib/portal/types";
import { AutoTextarea, Btn, Label, labelCls } from "./ui";
import { Ring } from "./charts";

/* ------------------------------------------------------------------ */
/* Files, shown inside the portal                                       */
/* ------------------------------------------------------------------ */

/** Signed link to a handed-in file (stored file, or the older built-in bucket). */
async function workLink(sub: Submission, download = false) {
  if (sub.driveFileId) return fileLink("submission", sub.id, download);
  const sb = getSupabase();
  if (!sb || !sub.filePath) throw new Error("No file was attached.");
  const { data, error } = await sb.storage
    .from("submissions")
    .createSignedUrl(sub.filePath, 3600, download ? { download: sub.fileName || true } : undefined);
  if (!data) throw new Error(error?.message ?? "No file was attached.");
  return data.signedUrl;
}

export const hasFile = (sub: Submission) => !!(sub.driveFileId || sub.filePath);

/** A feedback point without a typed bullet ("- ", "• ", "1. ") — the page adds its own. */
export const cleanPoint = (s: string) =>
  s
    .trim()
    .replace(/^([-–—•*·]|\d+[.)])\s+/, "")
    .trim();

type FileLike = { key: string; name: string; size?: string; mime?: string; link: (download: boolean) => Promise<string> };

/** Any stored file: PDFs and photos open in place; other files download. */
export function FileView({ file, className, fill }: { file: FileLike; className?: string; fill?: boolean }) {
  const { toast } = usePortal();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const kind = previewKind(file.mime, file.name);
  const viewable = kind === "pdf" || kind === "image";

  useEffect(() => {
    setUrl(null);
    setFailed(false);
    if (!viewable) return;
    let live = true;
    file
      .link(false)
      .then((u) => live && setUrl(u))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.key]);

  const go = async (download: boolean) => {
    const tab = download ? null : window.open("", "_blank");
    try {
      const u = download ? await file.link(true) : (url ?? (await file.link(false)));
      if (tab) tab.location.href = u;
      else window.location.href = u;
    } catch (e) {
      tab?.close();
      toast(e instanceof Error ? e.message : "Couldn't open the file");
    }
  };

  const frame = fill ? "h-full min-h-[60vh]" : "h-[70vh]";
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl border border-navy/12 bg-white", fill && "h-full", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-navy/10 bg-navy/[0.03] px-3 py-2">
        <FileText size={15} className="shrink-0 text-navy" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-navy">{file.name || "File"}</span>
        {file.size && <span className="text-xs text-navy">{file.size}</span>}
        {viewable && (
          <Btn variant="ghost" size="sm" onClick={() => go(false)}>
            <ExternalLink size={13} /> New tab
          </Btn>
        )}
        <Btn variant="ghost" size="sm" onClick={() => go(true)}>
          <Download size={13} /> Download
        </Btn>
      </div>

      {viewable ? (
        failed ? (
          <p className={cn("grid place-items-center p-6 text-center text-sm text-navy", frame)}>
            This file can&apos;t be shown right now. Try Download.
          </p>
        ) : !url ? (
          <div className={cn("grid place-items-center bg-navy/[0.03]", frame)}>
            <span className="h-2 w-2 animate-pulse-node rounded-full bg-gold" />
          </div>
        ) : kind === "pdf" ? (
          <iframe src={url} title={file.name} className={cn("w-full flex-1 bg-white", frame)} />
        ) : (
          <div className={cn("overflow-auto bg-navy/[0.03] p-2", frame)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={file.name} className="mx-auto max-w-full rounded-lg" />
          </div>
        )
      ) : (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-navy-deep text-gold">
            <FileText size={22} />
          </span>
          <p className="mt-4 text-[15px] font-semibold text-navy">{file.name}</p>
          <p className="mt-1 text-sm text-navy">This type of file opens in Word or a similar app.</p>
          <Btn variant="navy" className="mt-4" onClick={() => go(true)}>
            <Download size={14} /> Download to open
          </Btn>
        </div>
      )}
    </div>
  );
}

const workFile = (sub: Submission): FileLike => ({
  key: `w${sub.id}-${sub.driveFileId ?? sub.filePath}`,
  name: sub.fileName || "Handed-in work",
  size: sub.fileSize || undefined,
  mime: sub.mimeType,
  link: (d) => workLink(sub, d),
});
const feedbackFile = (f: FeedbackFile): FileLike => ({
  key: `f${f.id}`,
  name: f.name,
  size: f.sizeBytes ? fmtBytes(f.sizeBytes) : undefined,
  mime: f.mimeType,
  link: (d) => fileLink("feedback", f.id, d),
});

/** The question paper attached to an assignment. */
export const paperFile = (a: Assignment): FileLike => ({
  key: `a${a.id}-${a.attachmentFileId}`,
  name: a.attachmentName || "Question paper",
  mime: a.attachmentMime,
  link: (d) => fileLink("assignment", a.id, d),
});

/** Teacher, editing: see the question paper, replace it or remove it (or add one). */
export function QuestionPaperField({ a, label = "Question paper" }: { a: Assignment; label?: string }) {
  const { setQuestionPaper, toast } = usePortal();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setProgress(0);
    try {
      const up = await uploadFile(file, { purpose: "assignment", cohortId: a.cohortId }, setProgress);
      const ok = await setQuestionPaper(a.id, { fileId: up.id, name: file.name, mime: up.mimeType || file.type });
      if (ok) toast(a.attachmentFileId ? "Question paper replaced" : "Question paper attached");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed");
    }
    setProgress(null);
  };

  return (
    <div>
      <span className={labelCls}>{label}</span>
      <input ref={input} type="file" className="sr-only" onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
      {a.attachmentFileId ? (
        <>
          <FileView file={paperFile(a)} className="mt-2 [&_iframe]:h-[45vh] [&_img]:max-h-[45vh]" />
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Btn variant="outline" size="sm" disabled={progress !== null || busy} onClick={() => input.current?.click()}>
              <Upload size={14} />
              {progress !== null ? `Uploading… ${Math.round(progress * 100)}%` : "Replace file"}
            </Btn>
            <Btn
              variant="ghost"
              size="sm"
              disabled={progress !== null || busy}
              onClick={async () => {
                setBusy(true);
                const ok = await setQuestionPaper(a.id, null);
                setBusy(false);
                if (ok) toast("Question paper removed");
              }}
            >
              <X size={14} /> Remove
            </Btn>
          </div>
        </>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {a.attachmentUrl && (
            <a
              href={a.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-navy underline decoration-gold decoration-2 underline-offset-4"
            >
              Linked paper
            </a>
          )}
          <Btn variant="outline" size="sm" disabled={progress !== null} onClick={() => input.current?.click()}>
            <Upload size={14} />
            {progress !== null ? `Uploading… ${Math.round(progress * 100)}%` : "Attach a file"}
          </Btn>
        </div>
      )}
    </div>
  );
}

/** The handed-in work, shown right here. */
export function WorkFile({ sub, className, fill }: { sub: Submission; className?: string; fill?: boolean }) {
  if (!hasFile(sub)) return null;
  return <FileView file={workFile(sub)} className={className} fill={fill} />;
}

/** A typed answer (timed assessments), as a page. */
export function TypedAnswer({ text, title = "Typed answer", className }: { text: string; title?: string; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-navy/12 bg-white p-5", className)}>
      <Label>{title}</Label>
      <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-navy">{text}</p>
    </div>
  );
}

/** Returned files and the handed-in work as tabs over one viewer (the marked copy first). */
export function WorkAndFeedbackFiles({ sub, student, className }: { sub: Submission; student?: boolean; className?: string }) {
  const workLabel = student ? "Your work" : "Their work";
  const tabs = [
    ...sub.feedbackFiles.map((f, i) => ({
      id: `f${f.id}`,
      label: sub.feedbackFiles.length > 1 ? `Feedback file ${i + 1}` : "Marked copy",
      file: feedbackFile(f),
    })),
    ...(hasFile(sub) ? [{ id: "work", label: workLabel, file: workFile(sub) }] : []),
  ];
  // students open on the marked copy; teachers on the work they're marking
  const [on, setOn] = useState(student ? tabs[0]?.id : (tabs.find((t) => t.id === "work")?.id ?? tabs[0]?.id));
  const current = tabs.find((t) => t.id === on) ?? tabs[0];

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      {tabs.length > 1 && (
        <div role="tablist" className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={current?.id === t.id}
              onClick={() => setOn(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus-gold",
                current?.id === t.id ? "border-navy bg-navy text-white" : "border-navy/20 text-navy hover:bg-navy/[0.05]",
              )}
            >
              {t.id !== "work" && <Paperclip size={12} />}
              {t.label}
            </button>
          ))}
        </div>
      )}
      {current && <FileView key={current.id} file={current.file} fill className="md:min-h-0 md:flex-1" />}
      {sub.answerText && <TypedAnswer text={sub.answerText} title={student ? "Your answer" : "Typed answer"} />}
      {!current && !sub.answerText && (
        <p className="rounded-2xl bg-navy/[0.04] p-8 text-center text-[15px] text-navy">No file was attached to this submission.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Returned work, for the student                                       */
/*   Students skip comments when the mark is shown first, so the        */
/*   comments come first and the score shows once they've read them;    */
/*   then they set their own next step (feedback → action).              */
/* ------------------------------------------------------------------ */

function Points({ title, items, icon, tone }: { title: string; items: string[]; icon: "check" | "up"; tone: "plain" | "gold" }) {
  const list = items.map(cleanPoint).filter(Boolean);
  if (!list.length) return null;
  return (
    <div className={cn("rounded-2xl p-5", tone === "gold" ? "border-l-[3px] border-gold bg-gold/10" : "border border-navy/12")}>
      <Label>{title}</Label>
      <ul className="mt-3 flex flex-col gap-2.5">
        {list.map((s) => (
          <li key={s} className="flex gap-2.5 text-[15px] leading-relaxed text-navy">
            {icon === "check" ? (
              <CheckCircle2 size={16} className="mt-1 shrink-0 text-navy" />
            ) : (
              <TrendingUp size={16} className="mt-1 shrink-0 text-navy" />
            )}
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreCard({ a, sub, now }: { a: Assignment; sub: Submission; now: number }) {
  const pct = Math.round(((sub.marks ?? 0) / a.maxMarks) * 100);
  if (a.grading !== "marks")
    return (
      <div className="rounded-2xl bg-navy-deep p-5">
        <p className="text-[12px] font-semibold text-gold">Result</p>
        <p className="mt-1 text-[2rem] font-bold leading-none text-white">{scoreText(a, sub.marks)}</p>
        <p className="mt-1.5 text-sm text-white/85">Returned {sub.markedAt ? fmtRelative(sub.markedAt, now) : ""}</p>
      </div>
    );
  return (
    <div className="flex items-center gap-5 rounded-2xl bg-navy-deep p-5">
      <div className="shrink-0 rounded-full bg-white p-1">
        <Ring value={sub.marks ?? 0} max={a.maxMarks} size={84} />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] text-gold font-semibold">Score</p>
        <p className="mt-1 text-[2rem] font-bold leading-none tabular-nums text-white">
          {sub.marks} <span className="text-xl font-semibold text-white/75">/ {a.maxMarks}</span>
        </p>
        <p className="mt-1.5 text-sm text-white/85">
          {pct}% · returned {sub.markedAt ? fmtRelative(sub.markedAt, now) : ""}
        </p>
      </div>
    </div>
  );
}

function NextStep({ sub }: { sub: Submission }) {
  const { acknowledgeFeedback, toast } = usePortal();
  const [editing, setEditing] = useState(!sub.reflection);
  const [text, setText] = useState(sub.reflection ?? "");
  const [busy, setBusy] = useState(false);

  if (!editing && sub.reflection)
    return (
      <div className="rounded-2xl bg-navy/[0.04] p-5">
        <div className="flex items-center justify-between gap-3">
          <Label>My next step</Label>
          <Btn variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Btn>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-navy">{sub.reflection}</p>
      </div>
    );

  return (
    <div className="rounded-2xl bg-navy/[0.04] p-5">
      <Label>My next step</Label>
      <p className="mt-1.5 text-[15px] font-medium text-navy">What will you do differently in your next piece of work?</p>
      <AutoTextarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 1000))}
        minRows={2}
        placeholder="e.g. Use the PED formula with numbers in my next answer"
      />
      <div className="mt-3 flex gap-2.5">
        <Btn
          variant="navy"
          size="sm"
          disabled={!text.trim() || busy}
          onClick={async () => {
            setBusy(true);
            const ok = await acknowledgeFeedback(sub.id, text);
            setBusy(false);
            if (!ok) return;
            toast("Next step saved. Your teacher can see it.");
            setEditing(false);
          }}
        >
          {busy ? "Saving…" : "Save my next step"}
        </Btn>
        {sub.reflection && (
          <Btn variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Btn>
        )}
      </div>
    </div>
  );
}

/** Returned work for the student: comments → strengths → next steps → score → their own next step. */
export function FeedbackPanel({ a, sub, now }: { a: Assignment; sub: Submission; now: number }) {
  const { acknowledgeFeedback, parent } = usePortal();
  const [busy, setBusy] = useState(false);
  const read = !!sub.seenAt || parent;

  return (
    <div className="space-y-4">
      {read ? (
        <ScoreCard a={a} sub={sub} now={now} />
      ) : (
        <p className="rounded-2xl border-l-[3px] border-gold bg-gold/10 px-5 py-3.5 text-[15px] font-semibold text-navy">
          New feedback. Read it first, then see your score.
        </p>
      )}

      {sub.feedback && (
        <div className="rounded-2xl border border-navy/12 p-5">
          <Label>Teacher&apos;s feedback</Label>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-navy">{sub.feedback}</p>
        </div>
      )}
      <Points title="What you did well" items={sub.strengths ?? []} icon="check" tone="plain" />
      <Points title="To gain more marks" items={sub.improvements ?? []} icon="up" tone="gold" />

      {sub.feedbackFiles.length > 0 && (
        <p className="flex items-center gap-2 text-[13px] font-medium text-navy">
          <Paperclip size={14} className="shrink-0" />
          {sub.feedbackFiles.length === 1
            ? "Your teacher returned a marked copy."
            : `Your teacher returned ${sub.feedbackFiles.length} files.`}{" "}
          Open it beside your work.
        </p>
      )}

      {!read ? (
        <Btn
          variant="navy"
          size="lg"
          className="w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await acknowledgeFeedback(sub.id);
            setBusy(false);
          }}
        >
          <Eye size={16} />
          {busy ? "Opening…" : "I've read my feedback · show my score"}
        </Btn>
      ) : (
        <NextStep key={sub.reflection ?? ""} sub={sub} />
      )}

      <p className="text-[13px] text-navy">
        Handed in {fmtDate(sub.submittedAt)}, {fmtTime(sub.submittedAt)}
        {sub.markedAt ? ` · returned ${fmtDate(sub.markedAt)}, ${fmtTime(sub.markedAt)}` : ""}
      </p>
    </div>
  );
}

/** The last feedback's next steps, shown when starting new work (feed-forward). */
export function LastTargets({ items, reflection, title }: { items: string[]; reflection?: string; title: string }) {
  const list = items.map(cleanPoint).filter(Boolean);
  if (!list.length && !reflection) return null;
  return (
    <div className="rounded-2xl border-l-[3px] border-gold bg-gold/10 p-5">
      <Label>Remember from your last feedback</Label>
      <p className="mt-1 text-[13px] text-navy">{title}</p>
      {list.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {list.map((s) => (
            <li key={s} className="flex gap-2.5 text-[15px] leading-relaxed text-navy">
              <TrendingUp size={16} className="mt-1 shrink-0 text-navy" />
              {s}
            </li>
          ))}
        </ul>
      )}
      {reflection && <p className="mt-3 text-[15px] italic leading-relaxed text-navy">Your next step: &ldquo;{reflection}&rdquo;</p>}
    </div>
  );
}
