// Portal file storage, backed by Google Drive (never shown to users as Drive).
//
// Routes (POST unless noted; caller sends their portal session as Bearer token):
//   /status            teacher   → is storage connected?
//   /connect           teacher   → Google consent URL (one-time, by the account that owns the storage)
//   GET /callback                → Google redirects here; stores the refresh token
//   /upload            any       → starts a resumable upload; the browser sends the bytes straight to Google
//   /link              any       → short-lived signed URL for a file the caller may see (checked with RLS)
//   GET /file                    → streams the file (signed URL only)
//   /trash             teacher   → deletes a resource and moves its file to the bin
//
// Scope is drive.file: the app only ever sees files and folders it created.
// Secrets: GOOGLE_CLIENT_SECRET (Edge Function secret). Supabase keys come from the platform.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/drive`;
const REDIRECT_URI = `${FN_URL}/callback`;
const CLIENT_ID =
  Deno.env.get("GOOGLE_CLIENT_ID") ?? "693012559122-tkcqq354iqifu4mdmp3poet5deskp97n.apps.googleusercontent.com";
const PORTAL = "https://cognifypk.com";
const ORIGINS = new Set(["https://cognifypk.com", "http://localhost:3002"]);
const ROOT_NAME = "Concept Lab Portal";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const MB = 1_048_576;

const keyFrom = (name: string): string | undefined => {
  try {
    return JSON.parse(Deno.env.get(name) ?? "{}").default;
  } catch {
    return undefined;
  }
};
const SECRET = keyFrom("SUPABASE_SECRET_KEYS") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLISHABLE = keyFrom("SUPABASE_PUBLISHABLE_KEYS") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false } });

/* ---------------- http helpers ---------------- */
function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return ORIGINS.has(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        Vary: "Origin",
      }
    : {};
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/* ---------------- who is calling ---------------- */
type Member = { id: number; role: "teacher" | "student"; cohort_id: number | null; full_name: string };
async function caller(req: Request): Promise<{ member: Member; token: string }> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Not signed in");
  const { data, error } = await admin.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email || !data.user?.email_confirmed_at) throw new HttpError(401, "Not signed in");
  const { data: m } = await admin
    .from("members")
    .select("id, role, cohort_id, full_name")
    .eq("email", email)
    .eq("active", true)
    .maybeSingle();
  if (!m) throw new HttpError(403, "Not a portal member");
  return { member: m as Member, token };
}
const asUser = (token: string) =>
  createClient(SUPABASE_URL, PUBLISHABLE, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

/* ---------------- Google auth ---------------- */
let cached: { token: string; exp: number } | null = null;
async function googleToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const { data } = await admin.from("drive_auth").select("refresh_token").eq("id", 1).maybeSingle();
  if (!data) throw new HttpError(503, "File storage is not connected yet");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new HttpError(503, `Storage sign-in failed (${body.error ?? res.status})`);
  cached = { token: body.access_token, exp: Date.now() + body.expires_in * 1000 };
  return cached.token;
}

async function drive(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await googleToken()}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new HttpError(502, `Storage error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}
const newFolder = async (name: string, parent?: string): Promise<string> =>
  (await drive("files?fields=id", {
    method: "POST",
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, ...(parent ? { parents: [parent] } : {}) }),
  })).id;

/* ---------------- folder tree (created on demand) ---------------- */
async function rootFolder(): Promise<string> {
  const { data } = await admin.from("drive_auth").select("root_folder_id").eq("id", 1).single();
  if (data?.root_folder_id) return data.root_folder_id;
  const id = await newFolder(ROOT_NAME);
  await admin.from("drive_auth").update({ root_folder_id: id }).eq("id", 1);
  return id;
}

async function studentFolder(cohortId: number): Promise<string> {
  const { data: c } = await admin.from("cohorts").select("name, drive_folder_id").eq("id", cohortId).single();
  if (!c) throw new HttpError(404, "Student not found");
  if (c.drive_folder_id) return c.drive_folder_id;
  const id = await newFolder(c.name, await rootFolder());
  await admin.from("cohorts").update({ drive_folder_id: id }).eq("id", cohortId);
  return id;
}

async function systemFolder(cohortId: number, kind: "Assignments" | "Submissions"): Promise<string> {
  const col = kind === "Assignments" ? "drive_assignments_folder_id" : "drive_submissions_folder_id";
  const { data: c } = await admin.from("cohorts").select(col).eq("id", cohortId).single();
  const existing = (c as Record<string, string | null> | null)?.[col];
  if (existing) return existing;
  const id = await newFolder(kind, await studentFolder(cohortId));
  await admin.from("cohorts").update({ [col]: id }).eq("id", cohortId);
  return id;
}

async function portalFolder(folderId: number, cohortId: number): Promise<string> {
  const { data: f } = await admin
    .from("folders")
    .select("id, cohort_id, parent_id, name, drive_folder_id")
    .eq("id", folderId)
    .single();
  if (!f || f.cohort_id !== cohortId) throw new HttpError(404, "Folder not found");
  if (f.drive_folder_id) return f.drive_folder_id;
  const parent = f.parent_id ? await portalFolder(f.parent_id, cohortId) : await studentFolder(cohortId);
  const id = await newFolder(f.name, parent);
  await admin.from("folders").update({ drive_folder_id: id }).eq("id", f.id);
  return id;
}

/* ---------------- signed file links ---------------- */
const enc = new TextEncoder();
const hmacKey = crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const sign = async (payload: string) => b64url(await crypto.subtle.sign("HMAC", await hmacKey, enc.encode(payload)));

/* ---------------- routes ---------------- */
async function route(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const action = url.pathname.split("/").filter(Boolean).pop();

  // ---- Google's redirect after consent
  if (req.method === "GET" && action === "callback") {
    const back = (s: string) => Response.redirect(`${PORTAL}/portal/teacher/resources/?storage=${s}`, 302);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state") ?? "";
    if (!code) return back("cancelled");
    const { data: st } = await admin.from("drive_oauth_states").select("member_id, created_at").eq("state", state).maybeSingle();
    await admin.from("drive_oauth_states").delete().eq("state", state);
    if (!st || Date.now() - new Date(st.created_at).getTime() > 30 * 60_000) return back("expired");
    const { data: m } = await admin.from("members").select("role").eq("id", st.member_id).single();
    if (m?.role !== "teacher") return back("error");
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tok = await res.json();
    if (!res.ok || !tok.refresh_token) return back("error");
    let email: string | null = null;
    try {
      email = JSON.parse(atob(tok.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).email ?? null;
    } catch { /* email is informational only */ }
    const { data: prev } = await admin.from("drive_auth").select("account_email").eq("id", 1).maybeSingle();
    if (prev && prev.account_email !== email) {
      // a different account: its folders don't exist there, start the tree afresh
      await admin.from("cohorts").update({ drive_folder_id: null, drive_assignments_folder_id: null, drive_submissions_folder_id: null }).not("id", "is", null);
      await admin.from("folders").update({ drive_folder_id: null }).not("id", "is", null);
    }
    await admin.from("drive_auth").upsert({
      id: 1,
      refresh_token: tok.refresh_token,
      account_email: email,
      root_folder_id: prev && prev.account_email === email ? undefined : null,
      connected_at: new Date().toISOString(),
    });
    cached = null;
    return back("connected");
  }

  // ---- signed file stream
  if (req.method === "GET" && action === "file") {
    const f = url.searchParams.get("f") ?? "";
    const e = url.searchParams.get("e") ?? "";
    const d = url.searchParams.get("d") === "1" ? "1" : "0";
    const n = url.searchParams.get("n") ?? "file";
    const s = url.searchParams.get("s") ?? "";
    if (!f || Number(e) < Date.now() / 1000 || s !== (await sign(`${f}.${e}.${d}`))) {
      return new Response("This link has expired. Open the file again from the portal.", { status: 403 });
    }
    const range = req.headers.get("range");
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(f)}?alt=media`, {
      headers: { Authorization: `Bearer ${await googleToken()}`, ...(range ? { Range: range } : {}) },
    });
    if (!res.ok && res.status !== 206) return new Response("File not found", { status: 404 });
    const headers = new Headers();
    for (const h of ["content-type", "content-length", "content-range"]) {
      const v = res.headers.get(h);
      if (v) headers.set(h, v);
    }
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "private, max-age=3600");
    headers.set("Content-Disposition", `${d === "1" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(n)}`);
    return new Response(res.body, { status: res.status, headers });
  }

  if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
  const { member, token } = await caller(req);
  const body = await req.json().catch(() => ({}));

  if (action === "status") {
    const { data } = await admin.from("drive_auth").select("account_email, connected_at").eq("id", 1).maybeSingle();
    return json(req, { connected: !!data, account: member.role === "teacher" ? data?.account_email ?? null : null });
  }

  if (action === "connect") {
    if (member.role !== "teacher") throw new HttpError(403, "Teachers only");
    const state = crypto.randomUUID();
    await admin.from("drive_oauth_states").insert({ state, member_id: member.id });
    const q = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "openid email https://www.googleapis.com/auth/drive.file",
      access_type: "offline",
      prompt: "consent select_account",
      state,
    });
    return json(req, { url: `https://accounts.google.com/o/oauth2/v2/auth?${q}` });
  }

  if (action === "upload") {
    const name = String(body.name ?? "").slice(0, 200) || "file";
    const mime = String(body.mimeType || "application/octet-stream");
    const size = Number(body.size ?? 0);
    const origin = req.headers.get("origin") ?? PORTAL;
    let parent: string;
    let driveName = name;

    if (body.purpose === "submission") {
      if (member.role !== "student" || !member.cohort_id) throw new HttpError(403, "Students only");
      if (size > 50 * MB) throw new HttpError(413, "Files must be under 50 MB");
      const { data: a } = await admin.from("assignments").select("id, title, cohort_id").eq("id", body.assignmentId).single();
      if (!a || a.cohort_id !== member.cohort_id) throw new HttpError(404, "Assignment not found");
      parent = await systemFolder(member.cohort_id, "Submissions");
      driveName = `${a.title} — ${name}`;
    } else {
      if (member.role !== "teacher") throw new HttpError(403, "Teachers only");
      if (size > 4096 * MB) throw new HttpError(413, "Files must be under 4 GB");
      const cohortId = Number(body.cohortId);
      if (body.purpose === "assignment") parent = await systemFolder(cohortId, "Assignments");
      else parent = body.folderId ? await portalFolder(Number(body.folderId), cohortId) : await studentFolder(cohortId);
    }

    const init = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await googleToken()}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mime,
          ...(size ? { "X-Upload-Content-Length": String(size) } : {}),
          Origin: ORIGINS.has(origin) ? origin : PORTAL,
        },
        body: JSON.stringify({ name: driveName, parents: [parent] }),
      }
    );
    const uploadUrl = init.headers.get("location");
    if (!init.ok || !uploadUrl) throw new HttpError(502, `Couldn't start the upload (${init.status})`);
    return json(req, { uploadUrl });
  }

  if (action === "link") {
    const kind = body.kind as "resource" | "submission" | "assignment";
    const id = Number(body.id);
    const db = asUser(token); // RLS decides whether the caller may see this file
    let fileId: string | null = null;
    let name = "file";
    if (kind === "resource") {
      const { data } = await db.from("resources").select("drive_file_id, title, mime_type").eq("id", id).maybeSingle();
      fileId = data?.drive_file_id ?? null;
      name = data?.title ?? name;
    } else if (kind === "submission") {
      const { data } = await db.from("submissions").select("drive_file_id, file_name").eq("id", id).maybeSingle();
      fileId = data?.drive_file_id ?? null;
      name = data?.file_name ?? name;
    } else if (kind === "assignment") {
      const { data } = await db.from("assignments").select("attachment_file_id, attachment_name").eq("id", id).maybeSingle();
      fileId = data?.attachment_file_id ?? null;
      name = data?.attachment_name ?? name;
    }
    if (!fileId) throw new HttpError(404, "File not found");
    const e = String(Math.floor(Date.now() / 1000) + 3600);
    const d = body.download ? "1" : "0";
    const s = await sign(`${fileId}.${e}.${d}`);
    const q = new URLSearchParams({ f: fileId, e, d, n: name, s });
    return json(req, { url: `${FN_URL}/file?${q}` });
  }

  if (action === "trash") {
    if (member.role !== "teacher") throw new HttpError(403, "Teachers only");
    const { data: r } = await admin.from("resources").select("id, drive_file_id").eq("id", body.resourceId).maybeSingle();
    if (!r) throw new HttpError(404, "File not found");
    if (r.drive_file_id) {
      await drive(`files/${encodeURIComponent(r.drive_file_id)}?fields=id`, { method: "PATCH", body: JSON.stringify({ trashed: true }) }).catch(() => null);
    }
    await admin.from("resources").delete().eq("id", r.id);
    return json(req, { ok: true });
  }

  throw new HttpError(404, "Unknown action");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  try {
    return await route(req);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json(req, { error: e instanceof Error ? e.message : "Something went wrong" }, status);
  }
});
