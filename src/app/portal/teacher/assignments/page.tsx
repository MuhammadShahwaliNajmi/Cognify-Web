"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeacher } from "@/lib/portal/store";
import { uploadFile } from "@/lib/portal/storage";
import { DAY, dateInput, fmtDate, fmtRelative, fmtTime } from "@/lib/portal/format";
import type {AssignmentKind } from "@/lib/portal/types";
import { Btn, EmptyRow, Field, Modal, PageHeader, Picker, RowLink, Segmented, Status, Table, Td, fieldCls } from "@/components/portal/ui";


function NewAssignment({ cohortId, onDone }: { cohortId: string; onDone: () => void }) {
  const { addAssignment, toast } = useTeacher();
  const [f, setF] = useState({
    title: "",
    kind: "Essay" as AssignmentKind,
    unit: "",
    brief: "",
    date: dateInput(new Date(Date.now() + 7 * DAY)),
    time: "23:59",
    maxMarks: "20",
  });
  const [paper, setPaper] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const marks = Number(f.maxMarks);
  const ok = f.title.trim() && f.unit.trim() && f.brief.trim() && marks > 0;

  return (
    <div className="space-y-5">
      <Field label="Title">
        <input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Evaluate the case for a minimum wage" className={fieldCls} />
      </Field>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Type">
          <select value={f.kind} onChange={(e) => set("kind", e.target.value as AssignmentKind)} className={fieldCls}>
            <option>Essay</option>
            <option>Past paper</option>
            <option>Problem set</option>
            <option>Assessment</option>
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
      <Field label="Question paper (optional)">
        <input
          type="file"
          onChange={(e) => setPaper(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-navy file:mr-3 file:rounded-full file:border-0 file:bg-navy-deep file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gold"
        />
      </Field>
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
          let attachment: { attachmentFileId?: string; attachmentName?: string; attachmentMime?: string } = {};
          if (paper) {
            try {
              setProgress(0);
              const up = await uploadFile(paper, { purpose: "assignment", cohortId }, setProgress);
              attachment = { attachmentFileId: up.id, attachmentName: paper.name, attachmentMime: up.mimeType || paper.type };
            } catch (e) {
              setBusy(false);
              setProgress(null);
              toast(e instanceof Error ? e.message : "Upload failed");
              return;
            }
          }
          const saved = await addAssignment({
            cohortId,
            title: f.title.trim(),
            kind: f.kind,
            strand: null,
            unit: f.unit.trim(),
            brief: f.brief.trim(),
            dueAt: new Date(`${f.date}T${f.time}`).toISOString(),
            maxMarks: marks,
            ...attachment,
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
    .filter((a) => a.cohortId === cohort?.id && !a.timeLimitMin)
    .sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());
  const open = all.filter((a) => new Date(a.dueAt).getTime() > now).reverse();
  const closed = all.filter((a) => new Date(a.dueAt).getTime() <= now);
  const list = tab === "open" ? open : tab === "closed" ? closed : all;

  if (!cohort) return <PageHeader title="Assignments" />;

  return (
    <>
      <PageHeader
        title="Assignments"
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
                      <span className="text-navy">Due {fmtRelative(a.dueAt, now)}</span>
                    )}
                  </Td>
                  <Td align="right" className="whitespace-nowrap tabular-nums">
                    {sub?.status === "marked" ? (
                      <span className="font-semibold text-navy">
                        {sub.marks} <span className="font-normal text-navy">/ {a.maxMarks}</span>
                      </span>
                    ) : (
                      <span className="text-navy">– / {a.maxMarks}</span>
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
