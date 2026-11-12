"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Download,
  ExternalLink,
  File as FileIcon,
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  Image as ImageIcon,
  Link2,
  ListChecks,
  type LucideIcon,
  Music,
  Pencil,
  Play,
  Presentation,
  ScrollText,
  StickyNote,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortal } from "@/lib/portal/store";
import { fmtDate } from "@/lib/portal/format";
import { fileLink, previewKind, uploadFile } from "@/lib/portal/storage";
import type { Folder, Resource, ResourceType } from "@/lib/portal/types";
import { Btn, EmptyRow, Field, Modal, Table, Td, fieldCls } from "./ui";

export const RESOURCE_TYPES: ResourceType[] = ["Slides", "Notes", "Summary sheet", "Past paper", "Essay structure", "Recording", "File"];

export const TYPE_ICON: Record<ResourceType, LucideIcon> = {
  Slides: Presentation,
  Notes: FileText,
  "Summary sheet": StickyNote,
  "Past paper": ListChecks,
  "Essay structure": ScrollText,
  Recording: Play,
  File: FileIcon,
};

export const TYPE_LABEL: Record<ResourceType, string> = {
  Slides: "Slides",
  Notes: "Notes",
  "Summary sheet": "Summaries",
  "Past paper": "Past papers",
  "Essay structure": "Essays",
  Recording: "Recordings",
  File: "Files",
};

export const sizeText = (b?: number) =>
  b === undefined
    ? ""
    : b < 1024 * 1024
      ? `${Math.max(1, Math.round(b / 1024))} KB`
      : b < 1024 ** 3
        ? `${(b / 1024 / 1024).toFixed(1)} MB`
        : `${(b / 1024 ** 3).toFixed(2)} GB`;

function iconFor(r: Resource): LucideIcon {
  if (r.driveFileId) {
    const k = previewKind(r.mimeType, r.title);
    if (k === "image") return ImageIcon;
    if (k === "video") return Play;
    if (k === "audio") return Music;
  }
  return TYPE_ICON[r.type] ?? FileIcon;
}

/** A pasted Google Drive share link → embeddable preview URL (older items only). */
export function drivePreview(url: string) {
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]{10,})/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
}

/* ---------------- viewer ---------------- */
export function ResourceViewer({ resource, onClose }: { resource: Resource | null; onClose: () => void }) {
  const { toast } = usePortal();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const kind = resource?.driveFileId ? previewKind(resource.mimeType, resource.title) : null;

  useEffect(() => {
    setUrl(null);
    setFailed(false);
    if (!resource?.driveFileId) return;
    let live = true;
    fileLink("resource", resource.id)
      .then((u) => live && setUrl(u))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [resource?.id, resource?.driveFileId]);

  const download = async () => {
    if (!resource) return;
    try {
      window.location.href = await fileLink("resource", resource.id, true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't download the file");
    }
  };

  const legacy = resource && !resource.driveFileId ? drivePreview(resource.driveUrl) : null;

  return (
    <Modal open={!!resource} onClose={onClose} wide eyebrow={resource ? resource.type : undefined} title={resource?.title ?? ""}>
      {resource && (
        <div>
          {resource.driveFileId ? (
            failed ? (
              <p className="rounded-xl bg-navy/[0.04] p-6 text-center text-sm text-navy">This file can&apos;t be opened right now. Try again in a moment.</p>
            ) : !url ? (
              <div className="grid aspect-video w-full place-items-center rounded-xl bg-navy/[0.04]">
                <span className="h-2 w-2 animate-pulse-node rounded-full bg-gold" />
              </div>
            ) : kind === "pdf" ? (
              <iframe src={url} title={resource.title} className="h-[70vh] w-full rounded-xl border border-navy/12 bg-white" />
            ) : kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={resource.title} className="max-h-[70vh] w-full rounded-xl object-contain" />
            ) : kind === "video" ? (
              <video src={url} controls playsInline className="aspect-video w-full rounded-xl bg-navy-deep" />
            ) : kind === "audio" ? (
              <audio src={url} controls className="w-full" />
            ) : (
              <div className="flex flex-col items-center rounded-xl bg-navy/[0.04] px-6 py-10 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-navy-deep text-gold">
                  <FileIcon size={22} />
                </span>
                <p className="mt-4 text-[15px] font-semibold text-navy">{resource.title}</p>
                <p className="mt-1 text-sm text-navy">{sizeText(resource.sizeBytes)}</p>
              </div>
            )
          ) : legacy ? (
            <iframe src={legacy} title={resource.title} allow="autoplay; fullscreen" className="aspect-video w-full rounded-xl border border-navy/12" />
          ) : (
            <p className="rounded-xl bg-navy/[0.04] p-6 text-center text-sm text-navy">No file is attached to this item yet.</p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
            {resource.driveFileId ? (
              <>
                {url && kind !== "other" && (
                  <Btn variant="outline" href={url} external>
                    <ExternalLink size={14} />
                    Open in new tab
                  </Btn>
                )}
                <Btn variant="navy" onClick={download}>
                  <Download size={14} />
                  Download
                </Btn>
              </>
            ) : resource.driveUrl ? (
              <Btn variant="navy" href={resource.driveUrl} external>
                <ExternalLink size={14} />
                Open
              </Btn>
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- browser ---------------- */
type Pending = { id: number; name: string; progress: number; error?: string };

/** type shown for an uploaded file: from its folder's name, else from the file itself */
function typeFor(folderName: string | undefined, mime: string): ResourceType {
  const f = (folderName ?? "").toLowerCase();
  if (f.includes("slide")) return "Slides";
  if (f.includes("note")) return "Notes";
  if (f.includes("past paper")) return "Past paper";
  if (f.includes("recording") || mime.startsWith("video/")) return "Recording";
  if (f.includes("summar")) return "Summary sheet";
  if (f.includes("essay")) return "Essay structure";
  return "File";
}

const rowCls = "cursor-pointer transition-colors hover:bg-gold/[0.08]";
const iconBtn = "grid h-8 w-8 place-items-center rounded-md text-navy hover:bg-navy/[0.06] focus-gold";

/**
 * Folders and files for one student. Teachers can create, rename and delete
 * folders, upload files and remove them; students browse.
 */
export function FileBrowser({ cohortId, rootLabel, teacher = false }: { cohortId: string; rootLabel: string; teacher?: boolean }) {
  const { db, addResource, addFolder, renameFolder, deleteFolder, deleteResource, toast } = usePortal();
  const [folderId, setFolderId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Resource | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [naming, setNaming] = useState<{ mode: "new" | "rename"; folder?: Folder } | null>(null);
  const [linking, setLinking] = useState(false);
  const [removing, setRemoving] = useState<Resource | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  // back to the top when switching student
  useEffect(() => setFolderId(null), [cohortId]);

  const folders = useMemo(() => db.folders.filter((f) => f.cohortId === cohortId), [db.folders, cohortId]);
  const current = folders.find((f) => f.id === folderId) ?? null;
  const trail = useMemo(() => {
    const out: Folder[] = [];
    let f = folders.find((x) => x.id === folderId) ?? null;
    while (f) {
      out.unshift(f);
      const parent: string | null = f.parentId;
      f = folders.find((x) => x.id === parent) ?? null;
    }
    return out;
  }, [folderId, folders]);

  const subfolders = folders.filter((f) => f.parentId === (current?.id ?? null)).sort((a, b) => a.name.localeCompare(b.name));
  const files = db.resources
    .filter((r) => r.cohortId === cohortId && (r.folderId ?? null) === (current?.id ?? null))
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  const countIn = (id: string) => folders.filter((f) => f.parentId === id).length + db.resources.filter((r) => r.folderId === id).length;

  const upload = async (list: FileList | File[]) => {
    const here = current;
    for (const file of Array.from(list)) {
      const id = ++seq.current;
      setPending((p) => [...p, { id, name: file.name, progress: 0 }]);
      try {
        const up = await uploadFile(file, { purpose: "resource", cohortId, folderId: here?.id ?? null }, (progress) =>
          setPending((p) => p.map((x) => (x.id === id ? { ...x, progress } : x)))
        );
        const ok = await addResource({
          cohortId,
          title: file.name,
          type: typeFor(here?.name, up.mimeType || file.type),
          strand: null,
          unit: here?.name ?? "",
          meta: sizeText(file.size),
          driveUrl: "",
          folderId: here?.id,
          driveFileId: up.id,
          mimeType: up.mimeType || file.type,
          sizeBytes: file.size,
        });
        setPending((p) => p.filter((x) => x.id !== id));
        if (ok) toast(`Uploaded ${file.name}`);
      } catch (e) {
        setPending((p) => p.map((x) => (x.id === id ? { ...x, error: e instanceof Error ? e.message : "Upload failed" } : x)));
      }
    }
  };

  return (
    <div
      onDragOver={(e) => {
        if (!teacher) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!teacher) return;
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files?.length) upload(e.dataTransfer.files);
      }}
      className={cn("rounded-xl transition-shadow", over && "ring-2 ring-gold ring-offset-4")}
    >
      {/* breadcrumb + actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Folder" className="flex min-w-0 flex-wrap items-center gap-1 text-[15px]">
          <button type="button" onClick={() => setFolderId(null)} className="rounded-md px-1.5 py-0.5 font-semibold text-navy hover:text-gold focus-gold">
            {rootLabel}
          </button>
          {trail.map((f) => (
            <span key={f.id} className="flex items-center gap-1">
              <ChevronRight size={14} className="text-gold" />
              <button type="button" onClick={() => setFolderId(f.id)} className="rounded-md px-1.5 py-0.5 font-semibold text-navy hover:text-gold focus-gold">
                {f.name}
              </button>
            </span>
          ))}
        </nav>
        {teacher && (
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => setLinking(true)}>
              <Link2 size={14} /> Add link
            </Btn>
            <Btn variant="outline" size="sm" onClick={() => setNaming({ mode: "new" })}>
              <FolderPlus size={14} /> New folder
            </Btn>
            <Btn variant="navy" size="sm" onClick={() => input.current?.click()}>
              <UploadCloud size={14} /> Upload
            </Btn>
            <input
              ref={input}
              type="file"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.length) upload(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>

      {/* uploads in progress */}
      {pending.length > 0 && (
        <ul className="mb-4 space-y-2">
          {pending.map((p) => (
            <li key={p.id} className="rounded-lg border border-navy/12 px-4 py-2.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium text-navy">{p.name}</span>
                {p.error ? (
                  <button
                    type="button"
                    className="shrink-0 text-[13px] font-semibold text-navy underline decoration-gold"
                    onClick={() => setPending((x) => x.filter((y) => y.id !== p.id))}
                  >
                    Dismiss
                  </button>
                ) : (
                  <span className="shrink-0 tabular-nums text-navy">{Math.round(p.progress * 100)}%</span>
                )}
              </div>
              {p.error ? (
                <p className="mt-1 text-[13px] text-navy">{p.error}</p>
              ) : (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy/10">
                  <div className="h-full rounded-full bg-gold transition-[width]" style={{ width: `${Math.max(3, p.progress * 100)}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Table head={[{ label: "Name" }, { label: "Type" }, { label: "Size" }, { label: "Added" }, ...(teacher ? [{ label: " ", align: "right" as const }] : [])]}>
        {subfolders.length === 0 && files.length === 0 ? (
          <EmptyRow cols={teacher ? 5 : 4}>{teacher ? "Empty folder. Upload files or drop them here." : "Nothing here yet."}</EmptyRow>
        ) : (
          <>
            {subfolders.map((f) => (
              <tr key={`f${f.id}`} onClick={() => setFolderId(f.id)} className={rowCls}>
                <Td>
                  <span className="flex items-center gap-3 font-semibold text-navy">
                    <FolderIcon size={17} className="shrink-0 fill-gold/30 text-gold" />
                    {f.name}
                  </span>
                </Td>
                <Td>Folder</Td>
                <Td className="whitespace-nowrap">
                  {countIn(f.id)} item{countIn(f.id) === 1 ? "" : "s"}
                </Td>
                <Td>—</Td>
                {teacher && (
                  <Td align="right">
                    <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button type="button" aria-label={`Rename ${f.name}`} onClick={() => setNaming({ mode: "rename", folder: f })} className={iconBtn}>
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${f.name}`}
                        onClick={async () => {
                          if (countIn(f.id) > 0) return toast("Empty the folder before deleting it.");
                          if (await deleteFolder(f.id)) toast("Folder deleted");
                        }}
                        className={iconBtn}
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </Td>
                )}
              </tr>
            ))}
            {files.map((r) => {
              const Icon = iconFor(r);
              return (
                <tr key={r.id} onClick={() => setViewing(r)} className={rowCls}>
                  <Td>
                    <span className="flex items-center gap-3">
                      <Icon size={16} className="shrink-0 text-navy" />
                      <span className="font-medium text-navy">{r.title}</span>
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">{r.type}</Td>
                  <Td className="whitespace-nowrap">{sizeText(r.sizeBytes) || (r.driveUrl ? "Link" : "—")}</Td>
                  <Td className="whitespace-nowrap">{fmtDate(r.addedAt)}</Td>
                  {teacher && (
                    <Td align="right">
                      <span className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <button type="button" aria-label={`Delete ${r.title}`} onClick={() => setRemoving(r)} className={iconBtn}>
                          <Trash2 size={14} />
                        </button>
                      </span>
                    </Td>
                  )}
                </tr>
              );
            })}
          </>
        )}
      </Table>

      <ResourceViewer resource={viewing} onClose={() => setViewing(null)} />

      <Modal open={!!naming} onClose={() => setNaming(null)} title={naming?.mode === "rename" ? "Rename folder" : "New folder"}>
        {naming && (
          <NameForm
            key={naming.folder?.id ?? "new"}
            initial={naming.folder?.name ?? ""}
            label={naming.mode === "rename" ? "Save" : "Create folder"}
            onSave={async (name) => {
              const ok =
                naming.mode === "rename" && naming.folder
                  ? await renameFolder(naming.folder.id, name)
                  : await addFolder({ cohortId, parentId: current?.id ?? null, name });
              if (ok) setNaming(null);
            }}
          />
        )}
      </Modal>

      <Modal open={linking} onClose={() => setLinking(false)} title="Add a link">
        <LinkForm
          onSave={async (title, link) => {
            const ok = await addResource({
              cohortId,
              title,
              type: typeFor(current?.name, ""),
              strand: null,
              unit: current?.name ?? "",
              meta: "",
              driveUrl: link,
              folderId: current?.id,
            });
            if (ok) setLinking(false);
          }}
        />
      </Modal>

      <Modal open={!!removing} onClose={() => setRemoving(null)} title="Delete this file?">
        {removing && (
          <div className="space-y-5">
            <p className="text-[15px] font-medium text-navy">{removing.title}</p>
            <div className="flex gap-2.5">
              <Btn
                variant="navy"
                onClick={async () => {
                  if (await deleteResource(removing.id)) toast("File deleted");
                  setRemoving(null);
                }}
              >
                <Trash2 size={14} /> Delete
              </Btn>
              <Btn variant="ghost" onClick={() => setRemoving(null)}>
                Keep
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function NameForm({ initial, label, onSave }: { initial: string; label: string; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const ok = name.trim().length > 0 && name.trim().length <= 80;
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ok || busy) return;
        setBusy(true);
        await onSave(name);
        setBusy(false);
      }}
    >
      <Field label="Folder name">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
      </Field>
      <Btn variant="gold" disabled={!ok || busy} type="submit">
        <FolderPlus size={15} />
        {busy ? "Saving…" : label}
      </Btn>
    </form>
  );
}

function LinkForm({ onSave }: { onSave: (title: string, link: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = title.trim() && /^https:\/\/(drive|docs)\.google\.com\//.test(link.trim());
  return (
    <div className="space-y-5">
      <Field label="Name">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldCls} />
      </Field>
      <Field label="Link">
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/…" inputMode="url" className={fieldCls} />
      </Field>
      <Btn
        variant="gold"
        disabled={!valid || busy}
        onClick={async () => {
          setBusy(true);
          await onSave(title.trim(), link.trim());
          setBusy(false);
        }}
      >
        <Link2 size={15} />
        {busy ? "Saving…" : "Add link"}
      </Btn>
    </div>
  );
}

/** Flat search results across all of a student's folders. */
export function FileSearchResults({ items, folders, onOpen }: { items: Resource[]; folders: Folder[]; onOpen: (r: Resource) => void }) {
  return (
    <Table head={[{ label: "Name" }, { label: "Folder" }, { label: "Type" }, { label: "Added", align: "right" }]}>
      {items.length === 0 ? (
        <EmptyRow cols={4}>Nothing matches that search.</EmptyRow>
      ) : (
        items.map((r) => {
          const Icon = iconFor(r);
          return (
            <tr key={r.id} onClick={() => onOpen(r)} className={rowCls}>
              <Td>
                <span className="flex items-center gap-3">
                  <Icon size={16} className="shrink-0 text-navy" />
                  <span className="font-medium text-navy">{r.title}</span>
                </span>
              </Td>
              <Td>{folders.find((f) => f.id === r.folderId)?.name ?? "—"}</Td>
              <Td>{r.type}</Td>
              <Td align="right" className="whitespace-nowrap">
                {fmtDate(r.addedAt)}
              </Td>
            </tr>
          );
        })
      )}
    </Table>
  );
}
