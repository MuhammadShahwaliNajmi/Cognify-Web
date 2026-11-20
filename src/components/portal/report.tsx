"use client";

import { useState } from "react";
import { Copy, FileText, MessageCircle, Printer } from "lucide-react";
import { progressReport } from "@/lib/portal/insights";
import { useTeacher } from "@/lib/portal/store";
import type { Student } from "@/lib/portal/types";
import { AutoTextarea, Btn, Field, Segmented } from "./ui";

/** Teacher: a progress report for a student's parents — copy it, send it on WhatsApp, or print it. */
export function ProgressReport({ s }: { s: Student }) {
  const { db, me, now, toast } = useTeacher();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<"30" | "90">("30");
  const [note, setNote] = useState("");
  const text = progressReport(db, s, now, { days: Number(days), note, teacher: me.name });

  if (!open)
    return (
      <Btn variant="outline" size="sm" className="mt-6" onClick={() => setOpen(true)}>
        <FileText size={14} /> Progress report for parents
      </Btn>
    );

  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return toast("Allow pop-ups to print the report.");
    const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    w.document.write(
      `<!doctype html><title>Progress report · ${esc(s.name)}</title><style>body{font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#1a2744;max-width:640px;margin:48px auto;padding:0 24px}pre{white-space:pre-wrap;font:inherit}h1{font-size:20px;border-bottom:3px solid #D4B254;padding-bottom:8px}</style><h1>Concept Lab Education</h1><pre>${esc(text.split("\n").slice(1).join("\n"))}</pre>`
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="mt-6 rounded-2xl border border-gold/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-semibold text-navy">Progress report for parents</p>
        <Segmented
          value={days}
          onChange={setDays}
          options={[
            { value: "30", label: "Last 30 days" },
            { value: "90", label: "Last 90 days" },
          ]}
        />
      </div>
      <div className="mt-4">
        <Field label="Your note (optional)">
          <AutoTextarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Zara is working hard; more past-paper practice will lift her evaluation marks." />
        </Field>
      </div>
      <pre className="mt-4 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-navy/[0.04] p-4 font-sans text-[13.5px] leading-relaxed text-navy">{text}</pre>
      <div className="mt-4 flex flex-wrap gap-2">
        <Btn
          variant="navy"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            toast("Report copied");
          }}
        >
          <Copy size={14} /> Copy
        </Btn>
        <Btn variant="gold" size="sm" href={`https://wa.me/?text=${encodeURIComponent(text)}`} external>
          <MessageCircle size={14} /> WhatsApp
        </Btn>
        <Btn variant="outline" size="sm" onClick={print}>
          <Printer size={14} /> Print
        </Btn>
        <Btn variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Btn>
      </div>
    </div>
  );
}
