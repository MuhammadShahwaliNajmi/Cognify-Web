"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useStudent } from "@/lib/portal/store";
import type { Resource } from "@/lib/portal/types";
import { PageHeader } from "@/components/portal/ui";
import { FileBrowser, FileSearchResults, ResourceViewer } from "@/components/portal/resources";

export default function StudentResources() {
  const { db, me } = useStudent();
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<Resource | null>(null);

  const query = q.trim().toLowerCase();
  const results = query
    ? db.resources
        .filter((r) => r.cohortId === me.cohortId && `${r.title} ${r.unit} ${r.type}`.toLowerCase().includes(query))
        .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    : [];

  return (
    <>
      <PageHeader title="Resources" />

      <div className="relative mb-5">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search all files"
          aria-label="Search all files"
          className="w-full rounded-lg border border-navy/15 bg-white py-2.5 pl-11 pr-5 text-[15px] text-navy outline-none transition-all placeholder:text-navy/40 focus:border-gold focus:ring-4 focus:ring-gold/15"
        />
      </div>

      {query ? (
        <FileSearchResults items={results} folders={db.folders} onOpen={setViewing} />
      ) : (
        <FileBrowser cohortId={me.cohortId} rootLabel="My files" />
      )}

      <ResourceViewer resource={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
