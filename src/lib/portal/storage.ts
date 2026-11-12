/**
 * Portal file storage. Files live in the school's Google Drive, but the portal
 * never shows that: uploads go straight from the browser to storage, and files
 * are opened through short-lived links that the server signs after checking access.
 */
import { getSupabase } from "@/lib/supabase/client";

const FN = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/drive`;

export class StorageError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const sb = getSupabase();
  const token = (await sb?.auth.getSession())?.data.session?.access_token;
  if (!token) throw new StorageError(401, "Please sign in again.");
  const res = await fetch(`${FN}/${action}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new StorageError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const storageStatus = () => call<{ connected: boolean; account: string | null }>("status");
export const connectStorage = async () => {
  const { url } = await call<{ url: string }>("connect");
  window.location.assign(url);
};

export type Uploaded = { id: string; name: string; mimeType: string; size: number };
export type UploadTarget =
  | { purpose: "resource"; cohortId: string; folderId?: string | null }
  | { purpose: "assignment"; cohortId: string }
  | { purpose: "submission"; assignmentId: string };

/** Upload one file; `onProgress` gets 0–1. Resolves with the stored file's id. */
export async function uploadFile(file: File, target: UploadTarget, onProgress?: (p: number) => void): Promise<Uploaded> {
  const { uploadUrl } = await call<{ uploadUrl: string }>("upload", {
    ...target,
    folderId: "folderId" in target && target.folderId ? Number(target.folderId) : undefined,
    cohortId: "cohortId" in target ? Number(target.cohortId) : undefined,
    assignmentId: "assignmentId" in target ? Number(target.assignmentId) : undefined,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
  });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const r = JSON.parse(xhr.responseText);
          resolve({ id: r.id, name: r.name ?? file.name, mimeType: r.mimeType ?? file.type, size: Number(r.size ?? file.size) });
        } catch {
          reject(new StorageError(500, "Upload finished but the reply was unreadable."));
        }
      } else reject(new StorageError(xhr.status, `Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new StorageError(0, "Upload failed. Check your connection and try again."));
    xhr.send(file);
  });
}

/** Signed link (valid ~1 hour) to view or download a stored file. */
export const fileLink = (kind: "resource" | "submission" | "assignment", id: string, download = false) =>
  call<{ url: string }>("link", { kind, id: Number(id), download }).then((r) => r.url);

export const trashResource = (resourceId: string) => call<{ ok: boolean }>("trash", { resourceId: Number(resourceId) });

/** How the viewer should show a file of this type. */
export function previewKind(mime: string | undefined, name = ""): "pdf" | "image" | "video" | "audio" | "other" {
  const m = (mime ?? "").toLowerCase();
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  return "other";
}
