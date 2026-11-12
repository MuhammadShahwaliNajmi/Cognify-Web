"use client";

import { ExternalLink, FileText, ListChecks, type LucideIcon, Play, Presentation, ScrollText, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortal } from "@/lib/portal/store";
import { fmtRelative } from "@/lib/portal/format";
import type { Resource, ResourceType } from "@/lib/portal/types";
import { Btn, Chip, Label, Modal } from "./ui";

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

export function ResourceRow({ r, onOpen, action }: { r: Resource; onOpen: () => void; action?: React.ReactNode }) {
  const { now } = usePortal();
  const Icon = TYPE_ICON[r.type];
  const isNew = now - new Date(r.addedAt).getTime() < 2 * 86_400_000;
  return (
    <div className="group flex items-center gap-3.5 border-t border-navy/10 py-3.5 first:border-t-0">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3.5 text-left focus-gold">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-colors",
            r.type === "Recording" ? "bg-navy-deep text-gold" : "bg-navy/[0.05] text-navy group-hover:bg-gold/20"
          )}
        >
          <Icon size={17} className={r.type === "Recording" ? "fill-current" : undefined} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium tracking-tight text-navy transition-colors group-hover:text-gold">
            {r.title}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-navy/50">
            {r.type} · {r.meta} · added {fmtRelative(r.addedAt, now)}
          </span>
        </span>
      </button>
      {isNew && <Chip tone="gold">New</Chip>}
      {action}
    </div>
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
              <Label className="text-gold">{resource.strand} · {resource.unit}</Label>
              <p className="mt-3 text-lg font-semibold tracking-tight text-navy">{resource.title}</p>
              <div className="mt-5 space-y-2.5" aria-hidden="true">
                {[100, 92, 97, 64, 0, 100, 88, 95, 71].map((w, i) =>
                  w ? <div key={i} className="h-2 rounded-full bg-navy/10" style={{ width: `${w}%` }} /> : <div key={i} className="h-2" />
                )}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-[13px] leading-relaxed text-navy/55">
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
