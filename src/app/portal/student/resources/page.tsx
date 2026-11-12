"use client";

import { useMemo, useState } from "react";
import { FolderOpen, Search } from "lucide-react";
import { useStudent } from "@/lib/portal/store";
import type { Resource, ResourceType } from "@/lib/portal/types";
import { Empty, PageHeader, Segmented } from "@/components/portal/ui";
import { RESOURCE_TYPES, ResourceTable, ResourceViewer, TYPE_LABEL } from "@/components/portal/resources";

export default function StudentResources() {
  const { db, me } = useStudent();
  const [q, setQ] = useState("");
  const [type, setType] = useState<ResourceType | "All">("All");
  const [viewing, setViewing] = useState<Resource | null>(null);

  const all = useMemo(() => db.resources.filter((r) => r.cohortId === me.cohortId), [db.resources, me.cohortId]);
  // only show tabs for types that actually have files
  const types = RESOURCE_TYPES.filter((t) => all.some((r) => r.type === t));

  const shown = all
    .filter(
    (r) =>
      (type === "All" || r.type === type) &&
      (!q.trim() || `${r.title} ${r.unit} ${r.type}`.toLowerCase().includes(q.trim().toLowerCase()))
    )
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

  return (
    <>
      <PageHeader title="Resources" />

      {all.length === 0 ? (
        <Empty
          icon={<FolderOpen size={20} />}
          title="No resources yet"
          text="Your teacher adds slides, notes, past papers and class recordings here as your course goes on."
        />
      ) : (
        <>
          <div className="relative mb-5">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy/35" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, topic or type"
              aria-label="Search resources"
              className="w-full rounded-lg border border-navy/15 bg-white py-2.5 pl-11 pr-5 text-[15px] text-navy outline-none transition-all placeholder:text-navy/35 focus:border-gold focus:ring-4 focus:ring-gold/15"
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
            <ResourceTable items={shown} onOpen={setViewing} empty="Nothing matches that search." />
          </div>
        </>
      )}

      <ResourceViewer resource={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
