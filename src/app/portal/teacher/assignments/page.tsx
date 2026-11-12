"use client";

import { useState } from "react";
import { Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeacher } from "@/lib/portal/store";
import { fmtDate, fmtRelative, fmtTime } from "@/lib/portal/format";
import type { AssignmentKind, Strand } from "@/lib/portal/types";
import { Bar, Btn, Card, Chip, Field, Label, Modal, PageHeader, Rise, Segmented, fieldCls } from "@/components/portal/ui";

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
  const [cohortId, setCohortId] = useState(db.cohorts[0].id);
  const [creating, setCreating] = useState(false);

  const cohort = db.cohorts.find((c) => c.id === cohortId)!;
  const size = db.students.filter((s) => s.cohortId === cohortId).length;
  const list = db.assignments
    .filter((a) => a.cohortId === cohortId)
    .sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());

  return (
    <>
      <PageHeader
        eyebrow="Weekly assignments & monthly assessments"
        title="Set"
        gold="Work"
        actions={
          <Btn variant="navy" onClick={() => setCreating(true)}>
            <Plus size={15} />
            New assignment
          </Btn>
        }
      />

      <Rise i={0}>
        <Segmented value={cohortId} onChange={setCohortId} options={db.cohorts.map((c) => ({ value: c.id, label: c.name }))} />
      </Rise>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {list.map((a, i) => {
          const subs = db.submissions.filter((x) => x.assignmentId === a.id);
          const marked = subs.filter((x) => x.status === "marked").length;
          const open = new Date(a.dueAt).getTime() > now;
          return (
            <Rise key={a.id} i={i + 1}>
              <Card className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-3">
                  <Label>
                    {a.kind} · {a.strand}
                  </Label>
                  <Chip tone={open ? "gold" : "soft"}>
                    <Clock size={11} />
                    {open ? `Due ${fmtRelative(a.dueAt, now)}` : "Closed"}
                  </Chip>
                </div>
                <h2 className="mt-3 text-[17px] font-semibold leading-snug tracking-tight text-navy">{a.title}</h2>
                <p className="mt-1.5 text-[13px] text-navy/50">
                  {a.unit} · {a.maxMarks} marks · due {fmtDate(a.dueAt)}, {fmtTime(a.dueAt)}
                </p>
                <div className="mt-auto pt-5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-navy">
                      {subs.length} of {size} handed in
                    </span>
                    <span className="text-navy/50">
                      {marked} marked{subs.length - marked > 0 ? ` · ${subs.length - marked} waiting` : ""}
                    </span>
                  </div>
                  <Bar value={(subs.length / Math.max(1, size)) * 100} className="mt-2.5" />
                </div>
              </Card>
            </Rise>
          );
        })}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} eyebrow={cohort.name} title="New assignment">
        <NewAssignment cohortId={cohortId} onDone={() => setCreating(false)} />
      </Modal>
    </>
  );
}
