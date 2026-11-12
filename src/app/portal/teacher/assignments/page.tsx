"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeacher } from "@/lib/portal/store";
import { fmtDate, fmtRelative, fmtTime } from "@/lib/portal/format";
import type { AssignmentKind, Strand } from "@/lib/portal/types";
import { Btn, EmptyRow, Field, Modal, PageHeader, Picker, RowLink, Segmented, Status, Table, Td, fieldCls } from "@/components/portal/ui";

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
  const router = useRouter();
  const [cohortId, setCohortId] = useState(db.cohorts[0]?.id ?? "");
  const [tab, setTab] = useState<"open" | "closed" | "all">("open");
  const [creating, setCreating] = useState(false);

  const cohort = db.cohorts.find((c) => c.id === cohortId) ?? db.cohorts[0];
  const all = db.assignments
    .filter((a) => a.cohortId === cohort?.id)
    .sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());
  const open = all.filter((a) => new Date(a.dueAt).getTime() > now).reverse();
  const closed = all.filter((a) => new Date(a.dueAt).getTime() <= now);
  const list = tab === "open" ? open : tab === "closed" ? closed : all;

  if (!cohort) return <PageHeader title="Assignments" sub="No students yet." />;

  return (
    <>
      <PageHeader
        title="Assignments"
        sub="Set work for each student. Click a handed-in assignment to mark it."
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
          { value: "all", label: "All", count: all.length },
        ]}
      />

      <div className="mt-4">
        <Table head={[{ label: "Assignment" }, { label: "Type" }, { label: "Due" }, { label: "Submission" }, { label: "Score", align: "right" }]}>
          {list.length === 0 ? (
            <EmptyRow cols={5}>{tab === "open" ? "No open assignments. Use New assignment to set one." : "Nothing here yet."}</EmptyRow>
          ) : (
            list.map((a) => {
              const sub = db.submissions.find((x) => x.assignmentId === a.id);
              const due = new Date(a.dueAt).getTime() - now;
              const cells = (
                <>
                  <Td className="font-medium text-navy">{a.title}</Td>
                  <Td className="whitespace-nowrap">{a.kind}</Td>
                  <Td className="whitespace-nowrap">
                    {fmtDate(a.dueAt)}, {fmtTime(a.dueAt)}
                  </Td>
                  <Td>
                    {sub?.status === "marked" ? (
                      <Status tone="done">Returned</Status>
                    ) : sub ? (
                      <Status tone="attention">To mark</Status>
                    ) : due < 0 ? (
                      <Status>Not handed in</Status>
                    ) : (
                      <span className="text-navy/55">Due {fmtRelative(a.dueAt, now)}</span>
                    )}
                  </Td>
                  <Td align="right" className="whitespace-nowrap tabular-nums">
                    {sub?.status === "marked" ? (
                      <span className="font-semibold text-navy">
                        {sub.marks} <span className="font-normal text-navy/45">/ {a.maxMarks}</span>
                      </span>
                    ) : (
                      <span className="text-navy/40">– / {a.maxMarks}</span>
                    )}
                  </Td>
                </>
              );
              return sub ? (
                <RowLink key={a.id} onClick={() => router.push(`/portal/teacher/submissions/?open=${sub.id}`)}>
                  {cells}
                </RowLink>
              ) : (
                <tr key={a.id}>{cells}</tr>
              );
            })
          )}
        </Table>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} eyebrow={cohort.name} title="New assignment">
        <NewAssignment cohortId={cohort.id} onDone={() => setCreating(false)} />
      </Modal>
    </>
  );
}
