"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTeacher } from "@/lib/portal/store";
import type { Resource, ResourceType, Strand } from "@/lib/portal/types";
import { Btn, Field, Modal, PageHeader, Picker, Segmented, fieldCls } from "@/components/portal/ui";
import { RESOURCE_TYPES, ResourceTable, ResourceViewer, TYPE_LABEL } from "@/components/portal/resources";

function AddResource({ cohortId, onDone }: { cohortId: string; onDone: () => void }) {
  const { addResource, toast } = useTeacher();
  const [f, setF] = useState({ title: "", type: "Notes" as ResourceType, strand: "Micro" as Strand, unit: "", meta: "", driveUrl: "" });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const linkOk = !f.driveUrl.trim() || /^https:\/\/(drive|docs)\.google\.com\//.test(f.driveUrl.trim());
  const ok = f.title.trim() && f.unit.trim() && linkOk;

  return (
    <div className="space-y-5">
      <Field label="Title">
        <input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Market structures: complete notes" className={fieldCls} />
      </Field>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Type">
          <select value={f.type} onChange={(e) => set("type", e.target.value as ResourceType)} className={fieldCls}>
            {RESOURCE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Strand">
          <select value={f.strand} onChange={(e) => set("strand", e.target.value as Strand)} className={fieldCls}>
            <option>Micro</option>
            <option>Macro</option>
            <option>Business</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Unit / topic">
          <input value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="Market structures" className={fieldCls} />
        </Field>
        <Field label="Size">
          <input value={f.meta} onChange={(e) => set("meta", e.target.value)} placeholder="18 pages, 24 slides, 58 min…" className={fieldCls} />
        </Field>
      </div>
      <Field label="Google Drive link">
        <input value={f.driveUrl} onChange={(e) => set("driveUrl", e.target.value)} placeholder="https://drive.google.com/file/d/…" inputMode="url" className={fieldCls} />
      </Field>
      {!linkOk && <p className="-mt-2 text-xs font-medium text-navy">That doesn&apos;t look like a Google Drive link.</p>}
      <Btn
        variant="gold"
        size="lg"
        disabled={!ok}
        onClick={async () => {
          const saved = await addResource({ cohortId, title: f.title.trim(), type: f.type, strand: f.strand, unit: f.unit.trim(), meta: f.meta.trim() || f.type, driveUrl: f.driveUrl.trim() });
          if (!saved) return;
          toast("Resource added");
          onDone();
        }}
      >
        <Plus size={16} />
        Add resource
      </Btn>
    </div>
  );
}

export default function TeacherResources() {
  const { db } = useTeacher();
  const [cohortId, setCohortId] = useState(db.cohorts[0]?.id ?? "");
  const [type, setType] = useState<ResourceType | "All">("All");
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<Resource | null>(null);

  const cohort = db.cohorts.find((c) => c.id === cohortId) ?? db.cohorts[0];
  const all = db.resources.filter((r) => r.cohortId === cohort?.id);
  const types = RESOURCE_TYPES.filter((t) => all.some((r) => r.type === t));
  const shown = all
    .filter((r) => type === "All" || r.type === type)
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

  if (!cohort) return <PageHeader title="Resources" />;

  return (
    <>
      <PageHeader
        title="Resources"
        actions={
          <Btn variant="navy" onClick={() => setAdding(true)}>
            <Plus size={15} />
            Add a file
          </Btn>
        }
      />

      <div className="mb-5">
        <Picker
          label="Student"
          value={cohort.id}
          onChange={(v) => {
            setCohortId(v);
            setType("All");
          }}
          options={db.cohorts.map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>

      <Segmented
        value={type}
        onChange={setType}
        options={[
          { value: "All" as const, label: "All", count: all.length },
          ...types.map((t) => ({ value: t, label: TYPE_LABEL[t], count: all.filter((r) => r.type === t).length })),
        ]}
      />

      <div className="mt-4">
        <ResourceTable items={shown} onOpen={setViewing} empty={`Nothing here yet. Use Add a file to share something with ${cohort.name}.`} />
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} eyebrow={cohort.name} title="Add a file">
        <AddResource cohortId={cohort.id} onDone={() => setAdding(false)} />
      </Modal>
      <ResourceViewer resource={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
