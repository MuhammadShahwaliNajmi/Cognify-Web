"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session as AuthSession } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import type {
  Assignment,
  AssignmentKind,
  Auth,
  Cohort,
  DB,
  Plan,
  Progress,
  Resource,
  ResourceType,
  Session,
  Strand,
  Student,
  Submission,
  Teacher,
} from "./types";
import { EMPTY_DB } from "./types";

/**
 * Portal store backed by Supabase. Every screen reads and writes through this
 * one context. Row-level security in the database decides what each signed-in
 * user can see and change; this file never filters for security.
 *
 * Writes go to Supabase, then the visible data is reloaded (the data set is
 * small: one-to-one cohorts), so every screen always shows what's stored.
 */

/** "loading" → "signed-out" | "needs-join" (signed in, not yet a member) | "ready" */
export type PortalStatus = "loading" | "signed-out" | "needs-join" | "ready";

type Toast = { id: number; text: string };

type Store = {
  status: PortalStatus;
  ready: boolean;
  email: string | null; // the signed-in Google account
  db: DB;
  auth: Auth;
  me: Student | Teacher | null;
  now: number;
  toasts: Toast[];
  toast: (text: string) => void;

  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  joinWithCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  reload: () => Promise<void>;

  markJoined: (sessionId: string, studentId: string) => Promise<boolean>;
  toggleAttendance: (sessionId: string, studentId: string) => Promise<boolean>;
  setCohortMeet: (cohortId: string, url: string) => Promise<boolean>;
  regenerateCode: (cohortId: string) => Promise<boolean>;
  addSession: (s: Omit<Session, "id" | "attendance">) => Promise<boolean>;
  setRecording: (sessionId: string, url: string) => Promise<boolean>;

  submitWork: (s: { assignmentId: string; studentId: string; file: File; note?: string }) => Promise<boolean>;
  markWork: (id: string, m: Pick<Submission, "marks" | "feedback" | "strengths" | "improvements">) => Promise<boolean>;
  openFile: (path: string) => Promise<void>;
  addAssignment: (a: Omit<Assignment, "id">) => Promise<boolean>;

  addResource: (r: Omit<Resource, "id" | "addedAt">) => Promise<boolean>;
  addAnnouncement: (a: { cohortId: string | null; title: string; body: string }) => Promise<boolean>;
  updateStudent: (id: string, p: { predicted: string; target: string }) => Promise<boolean>;
};

const Ctx = createContext<Store | null>(null);

/* ---------------- row → model mapping ---------------- */

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const num = (v: unknown) => Number(v);

export const fmtBytes = (bytes: number | null | undefined) => {
  if (!bytes && bytes !== 0) return "";
  return bytes > 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const shortDate = (iso: string) => new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });

type Row = Record<string, unknown>;

async function loadAll(): Promise<{ db: DB; meRow: Row | null; error?: string }> {
  const sb = getSupabase()!;
  const { data: auth } = await sb.auth.getUser();
  const email = auth.user?.email?.toLowerCase() ?? "";

  const since = new Date(Date.now() - 180 * 86_400_000).toISOString();
  const [members, cohorts, sessions, attendance, resources, assignments, submissions, feedback, announcements, mastery] =
    await Promise.all([
      sb.from("members").select("*"),
      sb.from("cohorts").select("*").order("id"),
      sb.from("sessions").select("*").gte("starts_at", since).order("starts_at"),
      sb.from("attendance").select("session_id, member_id, present"),
      sb.from("resources").select("*").order("created_at", { ascending: false }),
      sb.from("assignments").select("*").order("due_at"),
      sb.from("submissions").select("*"),
      sb.from("feedback").select("*"),
      sb.from("announcements").select("*").order("created_at", { ascending: false }),
      sb.from("mastery").select("*"),
    ]);

  const firstError = [members, cohorts, sessions, attendance, resources, assignments, submissions, feedback, announcements, mastery].find(
    (r) => r.error
  )?.error;
  if (firstError) return { db: EMPTY_DB, meRow: null, error: firstError.message };

  const memberRows = (members.data ?? []) as Row[];
  const meRow = memberRows.find((m) => str(m.email) === email && m.active) ?? null;

  const att = new Map<string, Record<string, boolean>>();
  for (const a of (attendance.data ?? []) as Row[]) {
    const k = str(a.session_id);
    att.set(k, { ...(att.get(k) ?? {}), [str(a.member_id)]: Boolean(a.present) });
  }
  const fb = new Map<string, Row>(((feedback.data ?? []) as Row[]).map((f) => [str(f.submission_id), f]));

  const students: Student[] = memberRows
    .filter((m) => m.role === "student" && m.active)
    .map((m) => ({
      id: str(m.id),
      name: str(m.full_name),
      email: str(m.email),
      plan: (str(m.plan) || "Core") as Plan,
      cohortId: str(m.cohort_id),
      predicted: str(m.predicted),
      target: str(m.target),
    }));
  const teachers: Teacher[] = memberRows
    .filter((m) => m.role === "teacher" && m.active)
    .map((m) => ({ id: str(m.id), name: str(m.full_name), email: str(m.email), title: str(m.title) }));

  const assignmentRows: Assignment[] = ((assignments.data ?? []) as Row[]).map((a) => ({
    id: str(a.id),
    cohortId: str(a.cohort_id),
    title: str(a.title),
    kind: str(a.kind) as AssignmentKind,
    strand: str(a.strand) as Strand,
    unit: str(a.unit),
    brief: str(a.brief),
    dueAt: str(a.due_at),
    maxMarks: num(a.max_marks),
    attachmentUrl: str(a.attachment_url) || undefined,
  }));

  const submissionRows: Submission[] = ((submissions.data ?? []) as Row[]).map((s) => {
    const f = fb.get(str(s.id));
    return {
      id: str(s.id),
      assignmentId: str(s.assignment_id),
      studentId: str(s.member_id),
      submittedAt: str(s.submitted_at),
      fileName: str(s.file_name),
      fileSize: fmtBytes(s.file_size as number | null),
      filePath: str(s.file_path) || undefined,
      note: str(s.note) || undefined,
      status: f ? "marked" : "submitted",
      marks: f ? num(f.marks) : undefined,
      feedback: f ? str(f.feedback) : undefined,
      strengths: f ? ((f.strengths as string[]) ?? []) : undefined,
      improvements: f ? ((f.improvements as string[]) ?? []) : undefined,
      markedAt: f ? str(f.marked_at) : undefined,
    };
  });

  // predicted-grade trend: one point per marked piece of work, oldest first
  const progress: Progress[] = students.map((st) => {
    const marked = submissionRows
      .filter((x) => x.studentId === st.id && x.status === "marked")
      .sort((a, b) => new Date(a.markedAt!).getTime() - new Date(b.markedAt!).getTime());
    return {
      studentId: st.id,
      history: marked.map((x) => {
        const a = assignmentRows.find((y) => y.id === x.assignmentId);
        return { label: shortDate(x.markedAt!), pct: a ? Math.round(((x.marks ?? 0) / a.maxMarks) * 100) : 0 };
      }),
      mastery: ((mastery.data ?? []) as Row[])
        .filter((m) => str(m.member_id) === st.id)
        .map((m) => ({ unit: str(m.unit), strand: str(m.strand) as Strand, score: num(m.score), fix: str(m.fix) })),
    };
  });

  const db: DB = {
    cohorts: ((cohorts.data ?? []) as Row[]).map(
      (c): Cohort => ({
        id: str(c.id),
        name: str(c.name),
        board: str(c.board),
        subject: str(c.subject),
        term: str(c.term),
        meetUrl: str(c.meet_url),
        joinCode: str(c.join_code),
      })
    ),
    students,
    teachers,
    sessions: ((sessions.data ?? []) as Row[]).map(
      (s): Session => ({
        id: str(s.id),
        cohortId: str(s.cohort_id),
        title: str(s.title),
        strand: (s.strand as Strand | null) ?? null,
        unit: (s.unit as string | null) ?? null,
        start: str(s.starts_at),
        durationMin: num(s.duration_min),
        meetUrl: str(s.meet_url) || undefined,
        recordingUrl: str(s.recording_url) || undefined,
        attendance: att.get(str(s.id)) ?? {},
      })
    ),
    resources: ((resources.data ?? []) as Row[]).map(
      (r): Resource => ({
        id: str(r.id),
        cohortId: str(r.cohort_id),
        title: str(r.title),
        type: str(r.type) as ResourceType,
        strand: str(r.strand) as Strand,
        unit: str(r.unit),
        meta: str(r.meta),
        driveUrl: str(r.drive_url),
        sessionId: str(r.session_id) || undefined,
        addedAt: str(r.created_at),
      })
    ),
    assignments: assignmentRows,
    submissions: submissionRows,
    announcements: ((announcements.data ?? []) as Row[]).map((a) => ({
      id: str(a.id),
      cohortId: a.cohort_id === null ? null : str(a.cohort_id),
      title: str(a.title),
      body: str(a.body),
      at: str(a.created_at),
    })),
    progress,
  };
  return { db, meRow };
}

/* ---------------- provider ---------------- */

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const sb = getSupabase();
  const [status, setStatus] = useState<PortalStatus>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [db, setDb] = useState<DB>(EMPTY_DB);
  const [meRow, setMeRow] = useState<Row | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const reload = useCallback(async () => {
    if (!sb) return;
    const res = await loadAll();
    if (res.error) {
      toast(`Couldn't load your data: ${res.error}`);
      return;
    }
    setDb(res.db);
    setMeRow(res.meRow);
    setNow(Date.now()); // keep "submitted 2 min ago" labels honest right after a change
    setStatus(res.meRow ? "ready" : "needs-join");
  }, [sb, toast]);

  // follow the auth session
  useEffect(() => {
    if (!sb) {
      setStatus("signed-out");
      return;
    }
    let cancelled = false;
    sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (!data.session) setStatus("signed-out");
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setStatus("signed-out");
        setDb(EMPTY_DB);
        setMeRow(null);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [sb]);

  // load data whenever the signed-in user changes
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    // tidy the ?code=… left behind by the Google redirect
    if (window.location.search.includes("code=")) window.history.replaceState(null, "", window.location.pathname);
    setStatus("loading");
    reload();
  }, [userId, reload]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const store = useMemo<Store>(() => {
    const auth: Auth = meRow ? { role: meRow.role as "student" | "teacher", userId: str(meRow.id) } : null;
    const me =
      auth?.role === "student"
        ? db.students.find((s) => s.id === auth.userId) ?? null
        : auth?.role === "teacher"
          ? db.teachers.find((t) => t.id === auth.userId) ?? null
          : null;

    /** run a write, report failures, refresh on success */
    const run = async (label: string, fn: () => PromiseLike<{ error: { message: string } | null }>) => {
      if (!sb) return false;
      const { error } = await fn();
      if (error) {
        toast(`${label} failed: ${error.message}`);
        return false;
      }
      await reload();
      return true;
    };

    return {
      status,
      ready: status !== "loading",
      email: session?.user.email ?? null,
      db,
      auth,
      me,
      now,
      toasts,
      toast,
      reload,

      signInWithGoogle: async () => {
        if (!sb) return;
        const { error } = await sb.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/portal/`, queryParams: { prompt: "select_account" } },
        });
        if (error) toast(`Google sign-in failed: ${error.message}`);
      },
      signOut: async () => {
        await sb?.auth.signOut();
      },
      joinWithCode: async (code) => {
        if (!sb) return { ok: false, message: "The portal isn't connected." };
        const { data, error } = await sb.rpc("join_cohort", { p_code: code });
        if (error) return { ok: false, message: error.message };
        const row = (Array.isArray(data) ? data[0] : data) as { ok: boolean; message: string } | undefined;
        if (row?.ok) await reload();
        return { ok: Boolean(row?.ok), message: row?.message ?? "Something went wrong." };
      },

      markJoined: (sessionId, studentId) =>
        run("Recording attendance", () =>
          sb!
            .from("attendance")
            .upsert({ session_id: num(sessionId), member_id: num(studentId), present: true, joined_at: new Date().toISOString() })
        ),
      toggleAttendance: (sessionId, studentId) => {
        const here = db.sessions.find((s) => s.id === sessionId)?.attendance[studentId] ?? false;
        return run("Updating the register", () =>
          sb!.from("attendance").upsert({ session_id: num(sessionId), member_id: num(studentId), present: !here })
        );
      },
      setCohortMeet: (cohortId, url) =>
        run("Saving the Meet link", () => sb!.from("cohorts").update({ meet_url: url.trim() || null }).eq("id", num(cohortId))),
      regenerateCode: (cohortId) =>
        run("Creating a new code", () => sb!.rpc("regenerate_join_code", { p_cohort_id: num(cohortId) })),
      addSession: (s) =>
        run("Scheduling the class", () =>
          sb!.from("sessions").insert({
            cohort_id: num(s.cohortId),
            title: s.title,
            strand: s.strand,
            unit: s.unit,
            starts_at: s.start,
            duration_min: s.durationMin,
            meet_url: s.meetUrl ?? null,
          })
        ),
      setRecording: async (sessionId, url) => {
        const ses = db.sessions.find((s) => s.id === sessionId);
        if (!sb || !ses) return false;
        const driveUrl = url.trim();
        const { error } = await sb.from("sessions").update({ recording_url: driveUrl }).eq("id", num(sessionId));
        if (error) {
          toast(`Saving the recording failed: ${error.message}`);
          return false;
        }
        const existing = db.resources.find((r) => r.sessionId === sessionId && r.type === "Recording");
        return run("Adding the recording to The Vault", () =>
          existing
            ? sb.from("resources").update({ drive_url: driveUrl }).eq("id", num(existing.id))
            : sb.from("resources").insert({
                cohort_id: num(ses.cohortId),
                session_id: num(sessionId),
                title: `Class recording: ${ses.title}`,
                type: "Recording",
                strand: ses.strand ?? "Micro",
                unit: ses.unit || "Class recordings",
                meta: `${ses.durationMin} min`,
                drive_url: driveUrl,
              })
        );
      },

      submitWork: async ({ assignmentId, studentId, file, note }) => {
        if (!sb) return false;
        const safe = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120);
        const path = `${studentId}/${assignmentId}/${Date.now()}-${safe}`;
        const up = await sb.storage.from("submissions").upload(path, file, { contentType: file.type || undefined });
        if (up.error) {
          toast(`Upload failed: ${up.error.message}`);
          return false;
        }
        return run("Submitting", () =>
          sb.from("submissions").upsert(
            {
              assignment_id: num(assignmentId),
              member_id: num(studentId),
              file_name: file.name,
              file_size: file.size,
              file_path: path,
              note: note?.trim() || null,
              submitted_at: new Date().toISOString(),
            },
            { onConflict: "assignment_id,member_id" }
          )
        );
      },
      markWork: (id, m) =>
        run("Returning the work", () =>
          sb!.from("feedback").upsert({
            submission_id: num(id),
            marks: m.marks,
            feedback: m.feedback,
            strengths: m.strengths ?? [],
            improvements: m.improvements ?? [],
            marked_by: auth ? num(auth.userId) : null,
            marked_at: new Date().toISOString(),
          })
        ),
      openFile: async (path) => {
        if (!sb) return;
        // open the tab first so pop-up blockers allow it, then point it at the signed link
        const w = window.open("", "_blank");
        const { data, error } = await sb.storage.from("submissions").createSignedUrl(path, 600);
        if (error || !data) {
          w?.close();
          toast(`Couldn't open the file: ${error?.message ?? "unknown error"}`);
          return;
        }
        if (w) w.location.href = data.signedUrl;
        else window.location.href = data.signedUrl;
      },
      addAssignment: (a) =>
        run("Setting the assignment", () =>
          sb!.from("assignments").insert({
            cohort_id: num(a.cohortId),
            title: a.title,
            kind: a.kind,
            strand: a.strand,
            unit: a.unit,
            brief: a.brief,
            due_at: a.dueAt,
            max_marks: a.maxMarks,
            attachment_url: a.attachmentUrl || null,
          })
        ),

      addResource: (r) =>
        run("Adding to The Vault", () =>
          sb!.from("resources").insert({
            cohort_id: num(r.cohortId),
            title: r.title,
            type: r.type,
            strand: r.strand,
            unit: r.unit,
            meta: r.meta || null,
            drive_url: r.driveUrl || null,
            session_id: r.sessionId ? num(r.sessionId) : null,
          })
        ),
      addAnnouncement: (a) =>
        run("Posting", () =>
          sb!.from("announcements").insert({
            cohort_id: a.cohortId ? num(a.cohortId) : null,
            title: a.title,
            body: a.body,
            created_by: auth ? num(auth.userId) : null,
          })
        ),
      updateStudent: (id, p) =>
        run("Saving", () =>
          sb!.from("members").update({ predicted: p.predicted.trim() || null, target: p.target.trim() || null }).eq("id", num(id))
        ),
    };
  }, [sb, status, session, db, meRow, now, toasts, toast, reload]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function usePortal() {
  const s = useContext(Ctx);
  if (!s) throw new Error("usePortal must be used inside <PortalProvider>");
  return s;
}

/* ---------- small selectors shared by several screens ---------- */

const EMPTY_COHORT: Cohort = { id: "", name: "", board: "", subject: "", term: "", meetUrl: "", joinCode: "" };

export const cohortOf = (db: DB, id: string) => db.cohorts.find((c) => c.id === id) ?? EMPTY_COHORT;

export const meetLink = (db: DB, s: Session) => s.meetUrl || cohortOf(db, s.cohortId).meetUrl;

export const submissionFor = (db: DB, assignmentId: string, studentId: string) =>
  db.submissions.find((x) => x.assignmentId === assignmentId && x.studentId === studentId);

/** "Micro · Elasticities" — or "" for a timetable class with no topic yet. */
export const topicOf = (s: { strand: Strand | null; unit: string | null }) => [s.strand, s.unit].filter(Boolean).join(" · ");

export function attendancePct(db: DB, studentId: string, cohortId: string, now: number) {
  const past = db.sessions.filter(
    (s) => s.cohortId === cohortId && new Date(s.start).getTime() + s.durationMin * 60_000 < now
  );
  if (!past.length) return 100;
  return Math.round((past.filter((s) => s.attendance[studentId]).length / past.length) * 100);
}

export function averagePct(db: DB, studentId: string) {
  const marked = db.submissions.filter((x) => x.studentId === studentId && x.status === "marked");
  if (!marked.length) return null;
  const total = marked.reduce((sum, x) => {
    const a = db.assignments.find((y) => y.id === x.assignmentId);
    return sum + (a ? (x.marks ?? 0) / a.maxMarks : 0);
  }, 0);
  return Math.round((total / marked.length) * 100);
}

/** For screens inside the student shell (which guarantees a signed-in student). */
export function useStudent() {
  const p = usePortal();
  const me = p.me as Student;
  return { ...p, me, cohort: cohortOf(p.db, me.cohortId) };
}

/** For screens inside the teacher shell. */
export function useTeacher() {
  const p = usePortal();
  return { ...p, me: p.me as Teacher };
}

/** What a student is studying, e.g. "IB Diploma · Economics & Business".
 *  (One-to-one cohorts are named after the student, so never show cohort.name to them.) */
export const courseOf = (c: Cohort) => [c.board, c.subject].filter(Boolean).join(" · ") || "Your course";
