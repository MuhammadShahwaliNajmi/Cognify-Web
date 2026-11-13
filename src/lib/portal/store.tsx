"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session as AuthSession, SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { loadPortal, type Portal } from "./data";
import { startGoogleRedirect, takeGoogleRedirect } from "./google-redirect";
import { cohortOf } from "./selectors";
import { StorageError, fileLink, trashResource, uploadFile } from "./storage";
import type { Assignment, Auth, DB, Resource, Session, Student, Submission, Teacher } from "./types";
import { EMPTY_DB } from "./types";

/**
 * Portal store backed by Supabase. Every screen reads and writes through this
 * one context. Row-level security in the database decides what each signed-in
 * user can see and change; this file never filters for security.
 *
 * Every write goes to Supabase and is followed by one snapshot request, so the
 * screens always show what is actually stored.
 */

/** "loading" → "signed-out" | "needs-join" (signed in, not yet a member) | "ready" */
type PortalStatus = "loading" | "signed-out" | "needs-join" | "ready";

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

  /** full-page Google sign-in on our own domain (Google names cognifypk.com, not Supabase) */
  signInWithGoogle: () => Promise<void>;
  /** Google Identity Services button: exchange Google's ID token for a session */
  signInWithGoogleToken: (idToken: string, nonce: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  joinWithCode: (code: string) => Promise<{ ok: boolean; message: string }>;

  markJoined: (sessionId: string, studentId: string) => Promise<boolean>;
  toggleAttendance: (sessionId: string, studentId: string) => Promise<boolean>;
  setCohortMeet: (cohortId: string, url: string) => Promise<boolean>;
  regenerateCode: (cohortId: string) => Promise<boolean>;
  addSession: (s: Omit<Session, "id" | "attendance">) => Promise<boolean>;
  setRecording: (sessionId: string, url: string) => Promise<boolean>;
  /** move an upcoming class (timetable classes are moved as a one-off; the weekly slot stays) */
  rescheduleSession: (sessionId: string, start: string, durationMin: number) => Promise<boolean>;
  /** cancel an upcoming class (it disappears from calendars; a timetable slot won't come back) */
  cancelSession: (sessionId: string) => Promise<boolean>;
  /** student: ask to move or cancel an upcoming class */
  requestChange: (r: { sessionId: string; studentId: string; kind: "reschedule" | "cancel"; proposedStart?: string; note?: string }) => Promise<boolean>;
  withdrawRequest: (id: string) => Promise<boolean>;
  /** teacher: approve (applies the change) or decline a request */
  resolveRequest: (id: string, approve: boolean) => Promise<boolean>;

  addAssignment: (a: Omit<Assignment, "id">) => Promise<boolean>;
  /** open an assignment's question paper in a new tab */
  openAttachment: (assignmentId: string) => Promise<void>;
  /** hand in work: a file, a typed answer (assessments), or both */
  submitWork: (s: {
    assignmentId: string;
    studentId: string;
    file?: File | null;
    answerText?: string;
    note?: string;
    onProgress?: (p: number) => void;
  }) => Promise<boolean>;
  /** teacher: set a timed assessment (questions stay hidden until each student starts) */
  addAssessment: (a: Omit<Assignment, "id"> & { timeLimitMin: number; questions?: string }) => Promise<boolean>;
  /** student: start the clock (once) */
  startAssessment: (assignmentId: string) => Promise<boolean>;
  /** teacher: let a student take an assessment again (clears their attempt and answer) */
  allowRetake: (assignmentId: string, studentId: string) => Promise<boolean>;
  markWork: (id: string, m: Pick<Submission, "marks" | "feedback" | "strengths" | "improvements">) => Promise<boolean>;
  /** open a handed-in piece of work in a new tab */
  openSubmission: (sub: Submission) => Promise<void>;

  addResource: (r: Omit<Resource, "id" | "addedAt">) => Promise<boolean>;
  deleteResource: (id: string) => Promise<boolean>;
  addFolder: (f: { cohortId: string; parentId: string | null; name: string }) => Promise<boolean>;
  renameFolder: (id: string, name: string) => Promise<boolean>;
  deleteFolder: (id: string) => Promise<boolean>;
  addAnnouncement: (a: { cohortId: string | null; title: string; body: string }) => Promise<boolean>;
  updateStudent: (id: string, p: { predicted: string; target: string }) => Promise<boolean>;
};

type Actions = Omit<Store, "status" | "ready" | "email" | "db" | "auth" | "me" | "now" | "toasts" | "toast">;
type Write = PromiseLike<{ error: { message: string } | null }>;

const Ctx = createContext<Store | null>(null);
const SIGNED_OUT: Portal = { db: EMPTY_DB, me: null };
const STALE_AFTER = 60_000;

const num = (id: string) => Number(id);
const numOrNull = (id: string | null | undefined) => (id ? Number(id) : null);
const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const sb = getSupabase();
  const [status, setStatus] = useState<PortalStatus>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [portal, setPortal] = useState<Portal>(SIGNED_OUT);
  const [now, setNow] = useState(() => Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const loadedAt = useRef(0);

  const toast = useCallback((text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const reload = useCallback(async () => {
    if (!sb) return;
    const res = await loadPortal(sb);
    if ("error" in res) return toast(`Couldn't load your data: ${res.error}`);
    loadedAt.current = Date.now();
    setPortal(res);
    setNow(Date.now()); // keep "submitted 2 min ago" labels honest right after a change
    setStatus(res.me ? "ready" : "needs-join");
  }, [sb, toast]);

  // follow the auth session
  useEffect(() => {
    if (!sb) return setStatus("signed-out");
    let cancelled = false;
    // back from the full-page Google sign-in? exchange its ID token for a session
    const back = takeGoogleRedirect();
    const exchanging = !!back && "idToken" in back;
    if (back && "error" in back) toast(back.error);
    if (back && "idToken" in back) {
      sb.auth.signInWithIdToken({ provider: "google", token: back.idToken, nonce: back.nonce }).then(({ error }) => {
        if (!error) return;
        toast(`Google sign-in failed: ${error.message}`);
        setStatus("signed-out");
      });
    }
    sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      // while a Google token is being exchanged, stay on "loading"
      if (!data.session && !exchanging) setStatus("signed-out");
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) return;
      setStatus("signed-out");
      setPortal(SIGNED_OUT);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [sb, toast]);

  // load when the signed-in user changes; refresh when the tab comes back into
  // view, so work other people did meanwhile (a new submission, a mark) shows up
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    setStatus("loading");
    reload();
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - loadedAt.current > STALE_AFTER) reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId, reload]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { db, me } = portal;

  const actions = useMemo<Actions>(() => {
    /** run a write, report a failure, refresh on success */
    const run = async (label: string, write: (api: SupabaseClient) => Write) => {
      if (!sb) return false;
      const { error } = await write(sb);
      if (error) {
        toast(`${label} failed: ${error.message}`);
        return false;
      }
      await reload();
      return true;
    };

    /** open a signed link in a new tab; the tab opens first (inside the click) so pop-up blockers allow it */
    const open = async (link: () => Promise<string>) => {
      const tab = window.open("", "_blank");
      try {
        const url = await link();
        if (tab) tab.location.href = url;
        else window.location.href = url;
      } catch (e) {
        tab?.close();
        toast(`Couldn't open the file: ${message(e, "please try again")}`);
      }
    };

    return {
      signInWithGoogle: async () => {
        if (sb && !(await startGoogleRedirect())) toast("Google sign-in isn't set up.");
      },
      signInWithGoogleToken: async (idToken, nonce) => {
        if (!sb) return false;
        const { error } = await sb.auth.signInWithIdToken({ provider: "google", token: idToken, nonce });
        if (error) toast(`Google sign-in failed: ${error.message}`);
        return !error;
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

      /* ---------- classes ---------- */
      markJoined: (sessionId, studentId) =>
        run("Recording attendance", (api) =>
          api.from("attendance").upsert({ session_id: num(sessionId), member_id: num(studentId), present: true, joined_at: new Date().toISOString() })
        ),
      toggleAttendance: (sessionId, studentId) => {
        const here = db.sessions.find((s) => s.id === sessionId)?.attendance[studentId] ?? false;
        return run("Updating the register", (api) =>
          api.from("attendance").upsert({ session_id: num(sessionId), member_id: num(studentId), present: !here })
        );
      },
      setCohortMeet: (cohortId, url) =>
        run("Saving the Meet link", (api) => api.from("cohorts").update({ meet_url: url.trim() || null }).eq("id", num(cohortId))),
      regenerateCode: (cohortId) => run("Creating a new code", (api) => api.rpc("regenerate_join_code", { p_cohort_id: num(cohortId) })),
      addSession: (s) =>
        run("Scheduling the class", (api) =>
          api.from("sessions").insert({
            cohort_id: num(s.cohortId),
            title: s.title,
            strand: s.strand,
            unit: s.unit,
            starts_at: s.start,
            duration_min: s.durationMin,
            meet_url: s.meetUrl ?? null,
          })
        ),
      rescheduleSession: (sessionId, start, durationMin) =>
        run("Rescheduling", (api) => api.rpc("reschedule_session", { p_session: num(sessionId), p_start: start, p_duration: durationMin })),
      cancelSession: (sessionId) =>
        run("Cancelling the class", (api) => api.from("sessions").update({ cancelled: true }).eq("id", num(sessionId))),
      setRecording: async (sessionId, url) => {
        const ses = db.sessions.find((s) => s.id === sessionId);
        if (!sb || !ses) return false;
        const driveUrl = url.trim();
        const { error } = await sb.from("sessions").update({ recording_url: driveUrl }).eq("id", num(sessionId));
        if (error) {
          toast(`Saving the recording failed: ${error.message}`);
          return false;
        }
        // the recording also appears in the student's Recordings folder
        const existing = db.resources.find((r) => r.sessionId === sessionId && r.type === "Recording");
        const folder = db.folders.find((f) => f.cohortId === ses.cohortId && !f.parentId && f.name.toLowerCase() === "recordings");
        return run("Adding the recording to The Vault", (api) =>
          existing
            ? api.from("resources").update({ drive_url: driveUrl }).eq("id", num(existing.id))
            : api.from("resources").insert({
                cohort_id: num(ses.cohortId),
                session_id: num(sessionId),
                folder_id: numOrNull(folder?.id),
                title: `Class recording: ${ses.title}`,
                type: "Recording",
                strand: ses.strand ?? "Micro",
                unit: ses.unit || "Class recordings",
                drive_url: driveUrl,
              })
        );
      },

      /* ---------- class change requests ---------- */
      requestChange: ({ sessionId, studentId, kind, proposedStart, note }) =>
        run("Sending the request", (api) =>
          api.from("class_requests").insert({
            session_id: num(sessionId),
            member_id: num(studentId),
            kind,
            proposed_start: kind === "reschedule" ? proposedStart : null,
            note: note?.trim() || null,
          })
        ),
      withdrawRequest: (id) => run("Withdrawing the request", (api) => api.from("class_requests").delete().eq("id", num(id))),
      resolveRequest: (id, approve) =>
        run(approve ? "Approving" : "Declining", (api) => api.rpc("resolve_class_request", { p_request: num(id), p_approve: approve })),

      /* ---------- assignments and marking ---------- */
      addAssignment: (a) =>
        run("Setting the assignment", (api) =>
          api.from("assignments").insert({
            cohort_id: num(a.cohortId),
            title: a.title,
            kind: a.kind,
            strand: a.strand,
            unit: a.unit,
            brief: a.brief,
            due_at: a.dueAt,
            max_marks: a.maxMarks,
            attachment_url: a.attachmentUrl || null,
            attachment_file_id: a.attachmentFileId || null,
            attachment_name: a.attachmentName || null,
            attachment_mime: a.attachmentMime || null,
          })
        ),
      addAssessment: (a) =>
        run("Setting the assessment", async (api) => {
          const { data, error } = await api
            .from("assignments")
            .insert({
              cohort_id: num(a.cohortId),
              title: a.title,
              kind: "Assessment",
              strand: a.strand,
              unit: a.unit,
              brief: a.brief,
              due_at: a.dueAt,
              max_marks: a.maxMarks,
              time_limit_min: a.timeLimitMin,
              attachment_file_id: a.attachmentFileId || null,
              attachment_name: a.attachmentName || null,
              attachment_mime: a.attachmentMime || null,
            })
            .select("id")
            .single();
          if (error || !a.questions?.trim()) return { error };
          return api.from("assessment_questions").insert({ assignment_id: data.id, body: a.questions.trim() });
        }),
      startAssessment: (assignmentId) =>
        run("Starting the assessment", (api) => api.rpc("start_assessment", { p_assignment: num(assignmentId) })),
      allowRetake: (assignmentId, studentId) =>
        run("Allowing a retake", async (api) => {
          const sub = await api.from("submissions").delete().eq("assignment_id", num(assignmentId)).eq("member_id", num(studentId));
          if (sub.error) return sub;
          return api.from("assessment_attempts").delete().eq("assignment_id", num(assignmentId)).eq("member_id", num(studentId));
        }),
      openAttachment: (assignmentId) => open(() => fileLink("assignment", assignmentId)),
      submitWork: async ({ assignmentId, studentId, file, answerText, note, onProgress }) => {
        if (!sb) return false;
        const existing = db.submissions.find((x) => x.assignmentId === assignmentId && x.studentId === studentId);
        let stored: { drive_file_id: string | null; file_path: string | null; mime_type: string | null } = {
          drive_file_id: existing?.driveFileId ?? null,
          file_path: existing?.filePath ?? null,
          mime_type: null,
        };
        if (file) try {
          const up = await uploadFile(file, { purpose: "submission", assignmentId }, onProgress);
          stored = { drive_file_id: up.id, file_path: null, mime_type: up.mimeType || file.type || null };
        } catch (e) {
          if (!(e instanceof StorageError && e.status === 503)) {
            toast(message(e, "Upload failed"));
            return false;
          }
          // file storage isn't connected → keep students able to hand in, via the built-in bucket
          const path = `${studentId}/${assignmentId}/${Date.now()}-${file.name.replace(/[^\w.\- ]+/g, "_").slice(-120)}`;
          const up = await sb.storage.from("submissions").upload(path, file, { contentType: file.type || undefined });
          if (up.error) {
            toast(`Upload failed: ${up.error.message}`);
            return false;
          }
          stored = { drive_file_id: null, file_path: path, mime_type: file.type || null };
        }
        return run("Submitting", (api) =>
          api.from("submissions").upsert(
            {
              assignment_id: num(assignmentId),
              member_id: num(studentId),
              file_name: file ? file.name : existing?.fileName || null,
              file_size: file ? file.size : null,
              ...stored,
              ...(answerText !== undefined ? { answer_text: answerText.trim() || null } : {}),
              note: note?.trim() || null,
              submitted_at: new Date().toISOString(),
            },
            { onConflict: "assignment_id,member_id" }
          )
        );
      },
      markWork: (id, m) =>
        run("Returning the work", (api) =>
          api.from("feedback").upsert({
            submission_id: num(id),
            marks: m.marks,
            feedback: m.feedback,
            strengths: m.strengths ?? [],
            improvements: m.improvements ?? [],
            marked_by: numOrNull(me?.id),
            marked_at: new Date().toISOString(),
          })
        ),
      openSubmission: (sub) =>
        open(async () => {
          if (sub.driveFileId) return fileLink("submission", sub.id);
          if (!sb || !sub.filePath) throw new Error("No file was attached.");
          const { data, error } = await sb.storage.from("submissions").createSignedUrl(sub.filePath, 600);
          if (!data) throw new Error(error?.message ?? "No file was attached.");
          return data.signedUrl;
        }),

      /* ---------- files, announcements, students ---------- */
      addResource: (r) =>
        run("Adding the file", (api) =>
          api.from("resources").insert({
            cohort_id: num(r.cohortId),
            session_id: numOrNull(r.sessionId),
            folder_id: numOrNull(r.folderId),
            title: r.title,
            type: r.type,
            strand: r.strand,
            unit: r.unit,
            drive_url: r.driveUrl || null,
            drive_file_id: r.driveFileId || null,
            mime_type: r.mimeType || null,
            size_bytes: r.sizeBytes ?? null,
          })
        ),
      deleteResource: async (id) => {
        try {
          await trashResource(id);
          await reload();
          return true;
        } catch (e) {
          toast(message(e, "Couldn't delete the file"));
          return false;
        }
      },
      addFolder: ({ cohortId, parentId, name }) =>
        run("Creating the folder", (api) =>
          api.from("folders").insert({ cohort_id: num(cohortId), parent_id: numOrNull(parentId), name: name.trim() })
        ),
      renameFolder: (id, name) => run("Renaming the folder", (api) => api.from("folders").update({ name: name.trim() }).eq("id", num(id))),
      deleteFolder: (id) => run("Deleting the folder", (api) => api.from("folders").delete().eq("id", num(id))),
      addAnnouncement: (a) =>
        run("Posting", (api) =>
          api.from("announcements").insert({ cohort_id: numOrNull(a.cohortId), title: a.title, body: a.body, created_by: numOrNull(me?.id) })
        ),
      updateStudent: (id, p) =>
        run("Saving", (api) =>
          api.from("members").update({ predicted: p.predicted.trim() || null, target: p.target.trim() || null }).eq("id", num(id))
        ),
    };
  }, [sb, db, me, toast, reload]);

  const store = useMemo<Store>(
    () => ({
      ...actions,
      status,
      ready: status !== "loading",
      email: session?.user.email ?? null,
      db,
      auth: me ? { role: "plan" in me ? "student" : "teacher", userId: me.id } : null,
      me,
      now,
      toasts,
      toast,
    }),
    [actions, status, session, db, me, now, toasts, toast]
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function usePortal() {
  const s = useContext(Ctx);
  if (!s) throw new Error("usePortal must be used inside <PortalProvider>");
  return s;
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
