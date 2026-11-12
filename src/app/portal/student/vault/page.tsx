"use client";

import { useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { courseOf, useStudent } from "@/lib/portal/store";
import type { Resource, ResourceType } from "@/lib/portal/types";
import { Card, Empty, Label, PageHeader, Rise, Segmented } from "@/components/portal/ui";
import { RESOURCE_TYPES, ResourceRow, ResourceViewer, TYPE_ICON } from "@/components/portal/resources";

const PLURAL: Record<ResourceType, string> = {
  Slides: "Slides",
  Notes: "Notes",
  "Summary sheet": "Summary sheets",
  "Past paper": "Past papers",
  "Essay structure": "Essay structures",
  Recording: "Recordings",
};

export default function StudentVault() {
  const { db, me, cohort } = useStudent();
  const [q, setQ] = useState("");
  const [type, setType] = useState<ResourceType | "All">("All");
  const [strand, setStrand] = useState<"All" | "Micro" | "Macro" | "Business">("All");
  const [viewing, setViewing] = useState<Resource | null>(null);

  const all = useMemo(() => db.resources.filter((r) => r.cohortId === me.cohortId), [db.resources, me.cohortId]);
  const strands = useMemo(() => ["All", ...Array.from(new Set(all.map((r) => r.strand)))] as (typeof strand)[], [all]);

  const shown = all.filter(
    (r) =>
      (type === "All" || r.type === type) &&
      (strand === "All" || r.strand === strand) &&
      (!q.trim() || `${r.title} ${r.unit} ${r.type}`.toLowerCase().includes(q.trim().toLowerCase()))
  );

  // group by unit, newest unit first
  const groups = useMemo(() => {
    const m = new Map<string, Resource[]>();
    [...shown]
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .forEach((r) => m.set(r.unit, [...(m.get(r.unit) ?? []), r]));
    return Array.from(m.entries());
  }, [shown]);

  return (
    <>
      <PageHeader
        eyebrow={`${courseOf(cohort)} · ${all.length} resource${all.length === 1 ? "" : "s"}`}
        title="The"
        gold="Vault"
        sub="Every slide deck, set of notes, summary sheet, topical past paper, essay structure and class recording, organised by topic."
      />

      <Rise i={0}>
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search The Vault: try “elasticity” or “essay”"
            aria-label="Search resources"
            className="w-full rounded-full border border-navy/15 bg-white py-3.5 pl-11 pr-5 text-[15px] text-navy outline-none transition-all placeholder:text-navy/40 focus:border-gold focus:ring-4 focus:ring-gold/15"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(["All", ...RESOURCE_TYPES] as const).map((t) => {
            const on = type === t;
            const Icon = t === "All" ? null : TYPE_ICON[t];
            const n = t === "All" ? all.length : all.filter((r) => r.type === t).length;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={on}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold tracking-tight transition-colors focus-gold",
                  on ? "border-navy-deep bg-navy-deep text-gold" : "border-navy/15 bg-white text-navy/70 hover:border-gold hover:text-navy"
                )}
              >
                {Icon && <Icon size={13} />}
                {t === "All" ? "Everything" : PLURAL[t]}
                <span className={cn("tabular-nums", on ? "text-gold/60" : "text-navy/35")}>{n}</span>
              </button>
            );
          })}
        </div>
        {strands.length > 2 && (
          <Segmented className="mt-4" value={strand} onChange={setStrand} options={strands.map((s) => ({ value: s, label: s === "All" ? "Micro & Macro" : s }))} />
        )}
      </Rise>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {groups.map(([unit, items], i) => (
          <Rise key={unit} i={i + 1}>
            <Card className="h-full">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-navy">{unit}</h2>
                <Label>
                  {items[0].strand} · {items.length} file{items.length === 1 ? "" : "s"}
                </Label>
              </div>
              <div className="mt-2">
                {items.map((r) => (
                  <ResourceRow key={r.id} r={r} onOpen={() => setViewing(r)} />
                ))}
              </div>
            </Card>
          </Rise>
        ))}
      </div>

      {groups.length === 0 && (
        <Empty
          icon={<SearchX size={20} />}
          title={all.length ? "Nothing matches that" : "The Vault is empty for now"}
          text={
            all.length
              ? "Try a different search word, or clear the filters to see everything in The Vault."
              : "Your teacher adds slides, notes, past papers and class recordings here as your course goes on."
          }
        />
      )}

      <ResourceViewer resource={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
