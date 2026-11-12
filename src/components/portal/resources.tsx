"use client";

import { ExternalLink, FileText, ListChecks, type LucideIcon, Play, Presentation, ScrollText, StickyNote } from "lucide-react";
import { usePortal } from "@/lib/portal/store";
import { fmtDate } from "@/lib/portal/format";
import type { Resource, ResourceType } from "@/lib/portal/types";
import { Btn, EmptyRow, Label, Modal, RowLink, Status, Table, Td } from "./ui";

export const RESOURCE_TYPES: ResourceType[] = ["Slides", "Notes", "Summary sheet", "Past paper", "Essay structure", "Recording"];

export const TYPE_ICON: Record<ResourceType, LucideIcon> = {
  Slides: Presentation,
  Notes: FileText,
  "Summary sheet": StickyNote,
  "Past paper": ListChecks,
  "Essay structure": ScrollText,
  Recording: Play,
};

/** Google Drive share link → embeddable preview URL (null if it isn't a Drive file link). */
export function drivePreview(url: string) {
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]{10,})/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
}

export const TYPE_LABEL: Record<ResourceType, string> = {
  Slides: "Slides",
  Notes: "Notes",
  "Summary sheet": "Summaries",
  "Past paper": "Past papers",
  "Essay structure": "Essays",
  Recording: "Recordings",
};

/** Files as a table: Name / Type / Topic / Added. Click a row to open it. */
export function ResourceTable({ items, onOpen, empty }: { items: Resource[]; onOpen: (r: Resource) => void; empty: string }) {
  const { now } = usePortal();
  return (
    <Table head={[{ label: "Name" }, { label: "Type" }, { label: "Topic" }, { label: "Added", align: "right" }]}>
      {items.length === 0 ? (
        <EmptyRow cols={4}>{empty}</EmptyRow>
      ) : (
        items.map((r) => {
          const Icon = TYPE_ICON[r.type];
          const isNew = now - new Date(r.addedAt).getTime() < 2 * 86_400_000;
          return (
            <RowLink key={r.id} onClick={() => onOpen(r)}>
              <Td>
                <span className="flex items-center gap-3">
                  <Icon size={16} className="shrink-0 text-navy" />
                  <span className="min-w-0">
                    <span className="block font-medium text-navy">{r.title}</span>
                    {(r.meta && r.meta !== r.type) || !r.driveUrl ? (
                      <span className="block text-[12px] text-navy">{r.driveUrl ? r.meta : "No Drive link yet"}</span>
                    ) : null}
                  </span>
                  {isNew && <Status tone="attention">New</Status>}
                </span>
              </Td>
              <Td className="whitespace-nowrap">{r.type}</Td>
              <Td className="text-navy">{r.unit}</Td>
              <Td align="right" className="whitespace-nowrap text-navy">
                {fmtDate(r.addedAt)}
              </Td>
            </RowLink>
          );
        })
      )}
    </Table>
  );
}

/** Opens a Vault file: embeds the Google Drive preview when a real link is attached. */
export function ResourceViewer({ resource, onClose }: { resource: Resource | null; onClose: () => void }) {
  const preview = resource ? drivePreview(resource.driveUrl) : null;
  return (
    <Modal open={!!resource} onClose={onClose} wide eyebrow={resource ? `${resource.type} · ${resource.unit}` : undefined} title={resource?.title ?? ""}>
      {resource && (
        <div>
          {preview ? (
            <iframe
              src={preview}
              title={resource.title}
              allow="autoplay; fullscreen"
              className="aspect-video w-full rounded-2xl border border-navy/10 bg-navy/[0.03]"
            />
          ) : resource.type === "Recording" ? (
            <div className="glass-navy-solid relative grid aspect-video w-full place-items-center overflow-hidden rounded-2xl">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-gold text-navy-deep">
                <Play size={24} className="translate-x-0.5 fill-current" />
              </span>
              <span className="absolute bottom-4 left-5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
                {resource.meta} · class recording
              </span>
            </div>
          ) : (
            <div className="rounded-2xl border border-navy/10 bg-navy/[0.025] p-6 md:p-8">
              <Label>{resource.strand} · {resource.unit}</Label>
              <p className="mt-3 text-lg font-semibold tracking-tight text-navy">{resource.title}</p>
              <div className="mt-5 space-y-2.5" aria-hidden="true">
                {[100, 92, 97, 64, 0, 100, 88, 95, 71].map((w, i) =>
                  w ? <div key={i} className="h-2 rounded-full bg-navy/10" style={{ width: `${w}%` }} /> : <div key={i} className="h-2" />
                )}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-[13px] leading-relaxed text-navy">
              {resource.driveUrl
                ? "Stored in Concept Lab's Google Drive."
                : "No file is attached to this item yet."}
            </p>
            {resource.driveUrl ? (
              <Btn variant="navy" href={resource.driveUrl} external>
                <ExternalLink size={14} />
                Open in Google Drive
              </Btn>
            ) : (
              <Btn variant="navy" onClick={onClose}>
                Close
              </Btn>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
