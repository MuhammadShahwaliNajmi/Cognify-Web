"use client";

import { useState } from "react";
import { HardDrive, Plus } from "lucide-react";
import { useTeacher } from "@/lib/portal/store";
import type { Resource, ResourceType, Strand } from "@/lib/portal/types";
import { Btn, Card, Chip, Field, Label, Modal, PageHeader, Rise, Segmented, fieldCls } from "@/components/portal/ui";
import { RESOURCE_TYPES, ResourceRow, ResourceViewer } from "@/components/portal/resources";

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
      <Field label="Google Drive link" hint="In Drive: right-click the file, Share, Copy link. Students open it without leaving the portal.">
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
          toast("Added to The Vault");
          onDone();
        }}
      >
        <Plus size={16} />
        Add to The Vault
      </Btn>
    </div>
  );
}

export default function TeacherVault() {
  const { db } = useTeacher();
  const [cohortId, setCohortId] = useState(db.cohorts[0].id);
  const [type, setType] = useState<ResourceType | "All">("All");
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<Resource | null>(null);

  const cohort = db.cohorts.find((c) => c.id === cohortId)!;
  const all = db.resources.filter((r) => r.cohortId === cohortId);
  const shown = all
    .filter((r) => type === "All" || r.type === type)
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  const linked = all.filter((r) => r.driveUrl).length;

  return (
    <>
      <PageHeader
        eyebrow="Resource library"
        title="Manage The"
        gold="Vault"
        actions={
          <Btn variant="navy" onClick={() => setAdding(true)}>
            <Plus size={15} />
            Add a resource
          </Btn>
        }
      />

      <Rise i={0}>
        <Segmented value={cohortId} onChange={setCohortId} options={db.cohorts.map((c) => ({ value: c.id, label: c.name }))} />
      </Rise>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Rise i={1} className="lg:col-span-4">
          <Card tone="navy" className="h-full rounded-[26px] !p-7">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.07] text-gold ring-1 ring-white/10">
              <HardDrive size={18} />
            </span>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">Stored in your Google Drive</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Files live in Concept Lab&apos;s Drive. The Vault is the organised front door: students see the right files for their cohort and open them here.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
              <div>
                <Label className="text-white/45">Resources</Label>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums text-gold">{all.length}</p>
              </div>
              <div>
                <Label className="text-white/45">Drive-linked</Label>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums text-gold">{linked}</p>
              </div>
            </div>
          </Card>
        </Rise>

        <Rise i={2} className="lg:col-span-8">
          <Card className="h-full">
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {(["All", ...RESOURCE_TYPES] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  aria-pressed={type === t}
                  className={
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold tracking-tight transition-colors focus-gold " +
                    (type === t ? "border-navy-deep bg-navy-deep text-gold" : "border-navy/15 text-navy/65 hover:border-gold")
                  }
                >
                  {t === "All" ? "Everything" : t}
                </button>
              ))}
            </div>
            <div className="mt-3">
              {shown.map((r) => (
                <ResourceRow
                  key={r.id}
                  r={r}
                  onOpen={() => setViewing(r)}
                  action={<Chip tone={r.driveUrl ? "navy" : "outline"}>{r.driveUrl ? "Drive linked" : "No link"}</Chip>}
                />
              ))}
            </div>
          </Card>
        </Rise>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} eyebrow={cohort.name} title="Add a resource">
        <AddResource cohortId={cohortId} onDone={() => setAdding(false)} />
      </Modal>
      <ResourceViewer resource={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
