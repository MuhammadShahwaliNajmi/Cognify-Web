"use client";

import { useMemo, useState } from "react";
import { FolderOpen, Search } from "lucide-react";
import { useStudent } from "@/lib/portal/store";
import type { Resource, ResourceType } from "@/lib/portal/types";
import { Empty, PageHeader, Rise, Segmented } from "@/components/portal/ui";
import { RESOURCE_TYPES, ResourceRow, ResourceViewer } from "@/components/portal/resources";

const TAB_LABEL: Record<ResourceType, string> = {
  Slides: "Slides",
  Notes: "Notes",
  "Summary sheet": "Summaries",
  "Past paper": "Past papers",
  "Essay structure": "Essays",
  Recording: "Recordings",
};

export default function StudentVault() {
  const { db, me } = useStudent();
  const [q, setQ] = useState("");
  const [type, setType] = useState<ResourceType | "All">("All");
  const [viewing, setViewing] = useState<Resource | null>(null);

  const all = useMemo(() => db.resources.filter((r) => r.cohortId === me.cohortId), [db.resources, me.cohortId]);
  // only show tabs for types that actually have files
  const types = RESOURCE_TYPES.filter((t) => all.some((r) => r.type === t));

  const shown = all.filter(
    (r) =>
      (type === "All" || r.type === type) &&
      (!q.trim() || `${r.title} ${r.unit} ${r.type}`.toLowerCase().includes(q.trim().toLowerCase()))
  );

  // group by topic, newest first
  const groups = useMemo(() => {
    const m = new Map<string, Resource[]>();
    [...shown]
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .forEach((r) => m.set(r.unit, [...(m.get(r.unit) ?? []), r]));
    return Array.from(m.entries());
  }, [shown]);

  return (
    <>
      <PageHeader title="Vault" sub="Slides, notes, past papers, essay plans and class recordings." />

      {all.length === 0 ? (
        <Empty
          icon={<FolderOpen size={20} />}
          title="The Vault is empty for now"
          text="Your teacher adds slides, notes, past papers and class recordings here as your course goes on."
        />
      ) : (
        <>
          <div className="relative mb-5">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy/35" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              aria-label="Search the Vault"
              className="w-full rounded-full border border-navy/12 bg-white py-3 pl-11 pr-5 text-[15px] text-navy outline-none transition-all placeholder:text-navy/35 focus:border-gold focus:ring-4 focus:ring-gold/15"
            />
          </div>

          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: "All" as const, label: "All", count: all.length },
              ...types.map((t) => ({ value: t, label: TAB_LABEL[t], count: all.filter((r) => r.type === t).length })),
            ]}
          />

          <Rise key={`${type}-${q}`} className="mt-4">
            {groups.length === 0 ? (
              <p className="py-10 text-center text-sm text-navy/50">Nothing matches that search.</p>
            ) : (
              groups.map(([unit, items]) => (
                <section key={unit} className="mt-4 first:mt-0">
                  <h2 className="pb-1 pt-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-navy/45">{unit}</h2>
                  <div className="divide-y divide-navy/10">
                    {items.map((r) => (
                      <ResourceRow key={r.id} r={r} onOpen={() => setViewing(r)} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </Rise>
        </>
      )}

      <ResourceViewer resource={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
