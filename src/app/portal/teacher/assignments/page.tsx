"use client";

import { useState } from "react";
import { Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeacher } from "@/lib/portal/store";
import { fmtDate, fmtRelative, fmtTime } from "@/lib/portal/format";
import type { AssignmentKind, Strand } from "@/lib/portal/types";
import { Btn, Field, Modal, PageHeader, Picker, Rise, Segmented, fieldCls } from "@/components/portal/ui";

const pad = (n: number) => String(n).padStart(2, "0");
const dateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function NewAssignment({ cohortId, onDone }: { cohortId: string; onDone: () => void }) {
  const { addAssignment, toast } = useTeacher();
  const [f, setF] = useState({
    title: "",
    kind: "Essay" as AssignmentKind,
    strand: "Micro" as Strand,
    unit: "",
    brief: "",
    date: dateInput(new Date(Date.now() + 7 * 86_400_000)),
    time: "23:59",
    maxMarks: "20",
    attachmentUrl: "",
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const marks = Number(f.maxMarks);
  const linkOk = !f.attachmentUrl.trim() || /^https:\/\/(drive|docs)\.google\.com\//.test(f.attachmentUrl.trim());
  const ok = f.title.trim() && f.unit.trim() && f.brief.trim() && marks > 0 && linkOk;

  return (
    <div className="space-y-5">
      <Field label="Title">
        <input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Evaluate the case for a minimum wage" className={fieldCls} />
      </Field>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field label="Type">
          <select value={f.kind} onChange={(e) => set("kind", e.target.value as AssignmentKind)} className={fieldCls}>
            <option>Essay</option>
            <option>Past paper</option>
            <option>Problem set</option>
            <option>Assessment</option>
          </select>
        </Field>
        <Field label="Strand">
          <select value={f.strand} onChange={(e) => set("strand", e.target.value as Strand)} className={fieldCls}>
            <option>Micro</option>
            <option>Macro</option>
            <option>Business</option>
          </select>
        </Field>
        <Field label="Marks">
          <input value={f.maxMarks} onChange={(e) => set("maxMarks", e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={fieldCls} />
        </Field>
      </div>
      <Field label="Unit / topic">
        <input value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="Labour market" className={fieldCls} />
      </Field>
      <Field label="Instructions for students">
        <textarea value={f.brief} onChange={(e) => set("brief", e.target.value)} rows={4} className={cn(fieldCls, "resize-none")} />
      </Field>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Due date">
          <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Due time">
          <input type="time" value={f.time} onChange={(e) => set("time", e.target.value)} className={fieldCls} />
        </Field>
      </div>
      <Field label="Question paper (optional)" hint="Google Drive link to the PDF. In Drive: Share, set to 'Anyone with the link', then Copy link.">
        <input
          value={f.attachmentUrl}
          onChange={(e) => set("attachmentUrl", e.target.value)}
          placeholder="https://drive.google.com/file/d/…"
          inputMode="url"
          className={fieldCls}
        />
      </Field>
      {!linkOk && <p className="-mt-2 text-xs font-medium text-navy">That doesn&apos;t look like a Google Drive link.</p>}
      <Btn
        variant="gold"
        size="lg"
        disabled={!ok || busy}
        onClick={async () => {
          setBusy(true);
          const saved = await addAssignment({
            cohortId,
            title: f.title.trim(),
            kind: f.kind,
            strand: f.strand,
            unit: f.unit.trim(),
            brief: f.brief.trim(),
            dueAt: new Date(`${f.date}T${f.time}`).toISOString(),
            maxMarks: marks,
            attachmentUrl: f.attachmentUrl.trim() || undefined,
          });
          setBusy(false);
          if (!saved) return;
          toast("Assignment set");
          onDone();
        }}
      >
        <Plus size={16} />
        {busy ? "Saving…" : "Set assignment"}
      </Btn>
    </div>
  );
}

export default function TeacherAssignments() {
  const { db, now } = useTeacher();
  const [cohortId, setCohortId] = useState(db.cohorts[0]?.id ?? "");
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [creating, setCreating] = useState(false);

  const cohort = db.cohorts.find((c) => c.id === cohortId) ?? db.cohorts[0];
  const all = db.assignments.filter((a) => a.cohortId === cohort?.id);
  const open = all.filter((a) => new Date(a.dueAt).getTime() > now).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const closed = all.filter((a) => new Date(a.dueAt).getTime() <= now).sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());
  const list = tab === "open" ? open : closed;

  if (!cohort) return <PageHeader title="Work" sub="No students yet." />;

  return (
    <>
      <PageHeader
        title="Work"
        actions={
          <Btn variant="navy" onClick={() => setCreating(true)}>
            <Plus size={15} />
            New assignment
          </Btn>
        }
      />

      <div className="mb-5">
        <Picker label="Student" value={cohort.id} onChange={setCohortId} options={db.cohorts.map((c) => ({ value: c.id, label: c.name }))} />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "open", label: "Open", count: open.length },
          { value: "closed", label: "Past due", count: closed.length },
        ]}
      />

      <Rise key={`${cohort.id}-${tab}`} className="mt-2">
        {list.length === 0 ? (
          <p className="py-10 text-center text-sm text-navy/50">
            {tab === "open" ? "No open assignments. Use New assignment to set one." : "Nothing past due yet."}
          </p>
        ) : (
          <ul className="divide-y divide-navy/10">
            {list.map((a) => {
              const sub = db.submissions.find((x) => x.assignmentId === a.id);
              return (
                <li key={a.id} className="flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium tracking-tight text-navy">{a.title}</p>
                    <p className="mt-0.5 truncate text-[13px] text-navy/50">
                      {a.kind} · {a.maxMarks} marks · due {fmtDate(a.dueAt)}, {fmtTime(a.dueAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-navy/55">
                    {sub?.status === "marked" ? (
                      <span className="font-semibold tabular-nums text-navy">
                        {sub.marks}
                        <span className="text-navy/40">/{a.maxMarks}</span>
                      </span>
                    ) : sub ? (
                      "Handed in · to mark"
                    ) : tab === "open" ? (
                      `Due ${fmtRelative(a.dueAt, now)}`
                    ) : (
                      "Not handed in"
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Rise>

      <Modal open={creating} onClose={() => setCreating(false)} eyebrow={cohort.name} title="New assignment">
        <NewAssignment cohortId={cohort.id} onDone={() => setCreating(false)} />
      </Modal>
    </>
  );
}
