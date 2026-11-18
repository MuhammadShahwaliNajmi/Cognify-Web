"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, ExternalLink, FileText, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabase } from "@/lib/supabase/client";
import { fileLink, previewKind } from "@/lib/portal/storage";
import { usePortal } from "@/lib/portal/store";
import { fmtDate, fmtRelative, fmtTime } from "@/lib/portal/format";
import type { Assignment, Submission } from "@/lib/portal/types";
import { Btn, Label } from "./ui";
import { Ring } from "./charts";

/** Signed link to a handed-in file (stored file, or the older built-in bucket). */
async function workLink(sub: Submission, download = false) {
  if (sub.driveFileId) return fileLink("submission", sub.id, download);
  const sb = getSupabase();
  if (!sb || !sub.filePath) throw new Error("No file was attached.");
  const { data, error } = await sb.storage.from("submissions").createSignedUrl(sub.filePath, 3600, download ? { download: sub.fileName || true } : undefined);
  if (!data) throw new Error(error?.message ?? "No file was attached.");
  return data.signedUrl;
}

export const hasFile = (sub: Submission) => !!(sub.driveFileId || sub.filePath);

/** The handed-in work, shown right here: PDFs and photos open in place; other files download. */
export function WorkFile({ sub, className, fill }: { sub: Submission; className?: string; fill?: boolean }) {
  const { toast } = usePortal();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const kind = previewKind(sub.mimeType, sub.fileName);
  const viewable = kind === "pdf" || kind === "image";

  useEffect(() => {
    setUrl(null);
    setFailed(false);
    if (!hasFile(sub) || !viewable) return;
    let live = true;
    workLink(sub)
      .then((u) => live && setUrl(u))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub.id, sub.driveFileId, sub.filePath]);

  const go = async (download: boolean) => {
    const tab = download ? null : window.open("", "_blank");
    try {
      const u = download ? await workLink(sub, true) : url ?? (await workLink(sub));
      if (tab) tab.location.href = u;
      else window.location.href = u;
    } catch (e) {
      tab?.close();
      toast(e instanceof Error ? e.message : "Couldn't open the file");
    }
  };

  if (!hasFile(sub)) return null;
  const frame = fill ? "h-full min-h-[60vh]" : "h-[70vh]";

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl border border-navy/12 bg-white", fill && "h-full", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-navy/10 bg-navy/[0.03] px-3 py-2">
        <FileText size={15} className="shrink-0 text-navy" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-navy">{sub.fileName || "Handed-in file"}</span>
        {sub.fileSize && <span className="text-xs text-navy">{sub.fileSize}</span>}
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
          <p className={cn("grid place-items-center p-6 text-center text-sm text-navy", frame)}>This file can&apos;t be shown right now. Try Download.</p>
        ) : !url ? (
          <div className={cn("grid place-items-center bg-navy/[0.03]", frame)}>
            <span className="h-2 w-2 animate-pulse-node rounded-full bg-gold" />
          </div>
        ) : kind === "pdf" ? (
          <iframe src={url} title={sub.fileName || "Handed-in work"} className={cn("w-full flex-1 bg-white", frame)} />
        ) : (
          <div className={cn("overflow-auto bg-navy/[0.03] p-2", frame)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={sub.fileName || "Handed-in work"} className="mx-auto max-w-full rounded-lg" />
          </div>
        )
      ) : (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-navy-deep text-gold">
            <FileText size={22} />
          </span>
          <p className="mt-4 text-[15px] font-semibold text-navy">{sub.fileName}</p>
          <p className="mt-1 text-sm text-navy">This type of file opens in Word or a similar app.</p>
          <Btn variant="navy" className="mt-4" onClick={() => go(true)}>
            <Download size={14} /> Download to open
          </Btn>
        </div>
      )}
    </div>
  );
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

/** Returned work: the score and the teacher's feedback, laid out to read. */
export function FeedbackPanel({ a, sub, now }: { a: Assignment; sub: Submission; now: number }) {
  const pct = Math.round(((sub.marks ?? 0) / a.maxMarks) * 100);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5 rounded-2xl bg-navy-deep p-5">
        <div className="shrink-0 rounded-full bg-white p-1">
          <Ring value={sub.marks ?? 0} max={a.maxMarks} size={84} />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Score</p>
          <p className="mt-1 text-[2rem] font-bold leading-none tabular-nums text-white">
            {sub.marks} <span className="text-xl font-semibold text-white/75">/ {a.maxMarks}</span>
          </p>
          <p className="mt-1.5 text-sm text-white/85">
            {pct}% · returned {sub.markedAt ? fmtRelative(sub.markedAt, now) : ""}
          </p>
        </div>
      </div>

      {sub.feedback && (
        <div className="rounded-2xl border border-navy/12 p-5">
          <Label>Teacher&apos;s feedback</Label>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-navy">{sub.feedback}</p>
        </div>
      )}

      {!!sub.strengths?.length && (
        <div className="rounded-2xl border border-navy/12 p-5">
          <Label>What you did well</Label>
          <ul className="mt-3 flex flex-col gap-2.5">
            {sub.strengths.map((s) => (
              <li key={s} className="flex gap-2.5 text-[15px] leading-relaxed text-navy">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!sub.improvements?.length && (
        <div className="rounded-2xl border-l-[3px] border-gold bg-gold/10 p-5">
          <Label>To gain more marks</Label>
          <ul className="mt-3 flex flex-col gap-2.5">
            {sub.improvements.map((s) => (
              <li key={s} className="flex gap-2.5 text-[15px] leading-relaxed text-navy">
                <TrendingUp size={16} className="mt-0.5 shrink-0 text-navy" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[13px] text-navy">
        Handed in {fmtDate(sub.submittedAt)}, {fmtTime(sub.submittedAt)}
        {sub.markedAt ? ` · returned ${fmtDate(sub.markedAt)}, ${fmtTime(sub.markedAt)}` : ""}
      </p>
    </div>
  );
}
