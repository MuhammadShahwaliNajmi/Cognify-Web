"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session as AuthSession, SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { loadPortal, toPortal, type Portal } from "./data";
import { forwardToApp, startGoogleRedirect, takeGoogleRedirect } from "./google-redirect";
import { browserWasClosed, markAlive } from "./keep-signed-in";
import { cohortOf } from "./selectors";
import { StorageError, fileLink, trashFeedbackFile, trashResource, uploadFile } from "./storage";
import type { Assignment, Auth, DB, Resource, SeriesInput, Session, Student, Submission, Teacher } from "./types";
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
  /** a parent signed in with their own email, looking at their child's portal (read-only) */
  parent: boolean;
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
  /** teacher: take the register for a student (present or absent) */
  setAttendance: (sessionId: string, studentId: string, present: boolean) => Promise<boolean>;
  setCohortMeet: (cohortId: string, url: string) => Promise<boolean>;
  /** teacher: the student's exam date (yyyy-mm-dd), or "" to clear it */
  setExamDate: (cohortId: string, date: string) => Promise<boolean>;
  regenerateCode: (cohortId: string) => Promise<boolean>;
  addSession: (s: Omit<Session, "id" | "attendance">) => Promise<boolean>;
  setRecording: (sessionId: string, url: string) => Promise<boolean>;
  /** teacher: lesson notes for a class (the student is told the first time) */
  setLessonNotes: (sessionId: string, notes: string) => Promise<boolean>;
  /** a repeating class (like Google Calendar): these weekdays, every N weeks, from startDate until endsOn or stopped */
  addRepeatingClass: (r: { cohortId: string } & SeriesInput) => Promise<boolean>;
  /** change a series: every class ("all") or from a day on ("following") */
  updateSeries: (seriesId: string, scope: "all" | "following", from: string | null, r: SeriesInput) => Promise<boolean>;
  /** stop a series: all upcoming classes (from = null) or from a day on; past ones stay */
  endSeries: (seriesId: string, from: string | null) => Promise<boolean>;
  /** this class only: new name / topic (it stops following the series' name) */
  editSession: (sessionId: string, p: { title: string; unit: string }) => Promise<boolean>;
  /** remove a one-off class without telling anyone (used when it becomes a series) */
  deleteSession: (sessionId: string) => Promise<boolean>;
  /** move an upcoming class (timetable classes are moved as a one-off; the weekly slot stays) */
  rescheduleSession: (sessionId: string, start: string, durationMin: number) => Promise<boolean>;
  /** cancel an upcoming class (it disappears from calendars; a timetable slot won't come back) */
  cancelSession: (sessionId: string) => Promise<boolean>;
  /** student: ask to move or cancel an upcoming class */
  requestChange: (r: {
    sessionId: string;
    studentId: string;
    kind: "reschedule" | "cancel";
    proposedStart?: string;
    note?: string;
  }) => Promise<boolean>;
  withdrawRequest: (id: string) => Promise<boolean>;
  /** teacher: approve (applies the change) or decline a request */
  resolveRequest: (id: string, approve: boolean) => Promise<boolean>;

  addAssignment: (a: Omit<Assignment, "id">) => Promise<boolean>;
  /** change an assignment or assessment (a new deadline restarts its reminders) */
  updateAssignment: (
    id: string,
    p: Pick<Assignment, "title" | "kind" | "unit" | "brief" | "dueAt" | "maxMarks" | "grading">,
  ) => Promise<boolean>;
  /** attach, replace (file) or remove (null) an assignment's question paper */
  setQuestionPaper: (id: string, file: { fileId: string; name: string; mime: string } | null) => Promise<boolean>;
  /** delete an assignment or assessment with its hand-ins and marks */
  deleteAssignment: (id: string) => Promise<boolean>;
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
  /** teacher: change a timed assessment (questions are replaced; empty removes them) */
  updateAssessment: (
    id: string,
    p: Pick<Assignment, "title" | "unit" | "brief" | "dueAt" | "maxMarks"> & { timeLimitMin: number; questions: string },
  ) => Promise<boolean>;
  /** student: start the clock (once) */
  startAssessment: (assignmentId: string) => Promise<boolean>;
  /** teacher: let a student take an assessment again (clears their attempt and answer) */
  allowRetake: (assignmentId: string, studentId: string) => Promise<boolean>;
  markWork: (id: string, m: Pick<Submission, "marks" | "feedback" | "strengths" | "improvements">) => Promise<boolean>;
  /** open a handed-in piece of work in a new tab */
  openSubmission: (sub: Submission) => Promise<void>;
  /** teacher: return files with the feedback (marked copy, model answer…) */
  addFeedbackFiles: (submissionId: string, files: File[], onProgress?: (p: number) => void) => Promise<boolean>;
  removeFeedbackFile: (feedbackFileId: string) => Promise<boolean>;
  /** student: "I've read my feedback" (shows the score), with their own next step */
  acknowledgeFeedback: (submissionId: string, reflection?: string) => Promise<boolean>;

  addResource: (r: Omit<Resource, "id" | "addedAt">) => Promise<boolean>;
  deleteResource: (id: string) => Promise<boolean>;
  addFolder: (f: { cohortId: string; parentId: string | null; name: string }) => Promise<boolean>;
  renameFolder: (id: string, name: string) => Promise<boolean>;
  deleteFolder: (id: string) => Promise<boolean>;
  addAnnouncement: (a: { cohortId: string | null; title: string; body: string }) => Promise<boolean>;
  deleteAnnouncement: (id: string) => Promise<boolean>;
  updateStudent: (id: string, p: { predicted: string; target: string }) => Promise<boolean>;
  /** teacher: create a student's class (join code, folders, weekly timetable; login if an email is given) */
  addStudent: (s: {
    name: string;
    board?: string;
    subject?: string;
    email?: string;
    meetUrl?: string;
    slots: { weekday: number; start: string; duration: number }[];
    /** admin only: the teacher the student belongs to (default: whoever adds them) */
    teacherId?: string;
  }) => Promise<{ joinCode: string } | null>;
  /** admin: create a teacher account (they sign in with that Google email) */
  addTeacher: (t: { name: string; email: string; title?: string; admin?: boolean }) => Promise<boolean>;
  /** admin: make a teacher an admin, or take it away (the portal always keeps one) */
  setAdmin: (memberId: string, admin: boolean) => Promise<boolean>;
  /** admin: remove a teacher; their students become unassigned (admin only) */
  removeTeacher: (memberId: string) => Promise<boolean>;
  /** admin: move a student to another teacher */
  assignTeacher: (cohortId: string, teacherId: string | null) => Promise<boolean>;
  /** teacher: replace a student's weekly class times (upcoming classes follow) */
  setTimetable: (cohortId: string, slots: { weekday: number; start: string; duration: number }[]) => Promise<boolean>;
  /** teacher: take a student out of the portal without deleting anything, or bring them back */
  archiveStudent: (cohortId: string, archive: boolean) => Promise<boolean>;
  /** teacher: delete a student and everything in their class */
  removeStudent: (cohortId: string) => Promise<boolean>;
};

type Actions = Omit<Store, "status" | "ready" | "email" | "db" | "auth" | "me" | "parent" | "now" | "toasts" | "toast">;
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

  /** fetch the snapshot; false if it couldn't be loaded */
  const reload = useCallback(
    async (quiet = false) => {
      if (!sb) return false;
      const res = await loadPortal(sb);
      if ("error" in res) {
        if (!quiet) toast(`Couldn't load your data: ${res.error}`);
        return false;
      }
      loadedAt.current = Date.now();
      setPortal(res);
      setNow(Date.now()); // keep "submitted 2 min ago" labels honest right after a change
      setStatus(res.me ? "ready" : "needs-join");
      return true;
    },
    [sb, toast],
  );

  // the portal never runs inside another site's frame (clickjacking)
  const [framed, setFramed] = useState(false);
  useEffect(() => setFramed(window.top !== window.self), []);

  // follow the auth session
  useEffect(() => {
    // local development only: /portal/?demo=teacher (or student) shows the signed-in
    // screens with made-up data; ?demo=off leaves it. Stripped from production builds.
    if (process.env.NODE_ENV === "development") {
      const asked = new URLSearchParams(window.location.search).get("demo");
      if (asked) sessionStorage.setItem("cl-demo", asked);
      const role = sessionStorage.getItem("cl-demo");
      if (role === "teacher" || role === "student") {
        import("./demo").then((m) => {
          setPortal(toPortal(m.demoSnapshot(role)));
          setStatus("ready");
        });
        return;
      }
    }
    if (!sb) return setStatus("signed-out");
    // signing in for the phone app: hand Google's answer back to the app and stop here
    if (forwardToApp()) return;
    let cancelled = false;
    // "keep me signed in" was off and the browser has been closed since: sign out on this device
    const expired = browserWasClosed();
    markAlive();
    if (expired) sb.auth.signOut({ scope: "local" });
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

  // load when the signed-in user changes. A failed first load keeps retrying
  // (2s, 4s, 8s … up to 30s) so a flaky connection never leaves a dead spinner.
  // Afterwards, refresh when the tab comes back into view or the connection
  // returns, so work other people did meanwhile (a submission, a mark) shows up.
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const first = async (attempt: number) => {
      if (stopped || (await reload(attempt > 0)) || stopped) return;
      timer = setTimeout(() => first(attempt + 1), Math.min(30_000, 2000 * 2 ** attempt));
    };
    setStatus("loading");
    first(0);
    const refresh = () => {
      if (document.visibilityState === "visible" && Date.now() - loadedAt.current > STALE_AFTER) reload(true);
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [userId, reload]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { db, me } = portal;
  // signed in with an email that isn't the student's own → a parent (the database makes them read-only)
  const signedInAs = session?.user.email?.toLowerCase() ?? null;
  const parent = !!me && "plan" in me && !!signedInAs && me.email.toLowerCase() !== signedInAs;

  const actions = useMemo<Actions>(() => {
    const viewOnly = async () => {
      toast("Parents can view the portal but not change anything.");
      return false;
    };
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
        parent
          ? viewOnly()
          : run("Recording attendance", (api) =>
              api
                .from("attendance")
                .upsert({ session_id: num(sessionId), member_id: num(studentId), present: true, joined_at: new Date().toISOString() }),
            ),
      toggleAttendance: (sessionId, studentId) => {
        const here = db.sessions.find((s) => s.id === sessionId)?.attendance[studentId] ?? false;
        return run("Updating the register", (api) =>
          api.from("attendance").upsert({ session_id: num(sessionId), member_id: num(studentId), present: !here }),
        );
      },
      setAttendance: (sessionId, studentId, present) =>
        run("Updating the register", (api) =>
          api.from("attendance").upsert({ session_id: num(sessionId), member_id: num(studentId), present }),
        ),
      setCohortMeet: (cohortId, url) =>
        run("Saving the Meet link", (api) =>
          api
            .from("cohorts")
            .update({ meet_url: url.trim() || null })
            .eq("id", num(cohortId)),
        ),
      setExamDate: (cohortId, date) =>
        run("Saving the exam date", (api) =>
          api
            .from("cohorts")
            .update({ exam_on: date || null })
            .eq("id", num(cohortId)),
        ),
      regenerateCode: (cohortId) => run("Creating a new code", (api) => api.rpc("regenerate_join_code", { p_cohort_id: num(cohortId) })),
      addRepeatingClass: (r) =>
        run("Adding the repeating class", (api) =>
          api.rpc("create_series", {
            p_cohort: num(r.cohortId),
            p_title: r.title,
            p_unit: r.unit,
            p_starts_on: r.startDate,
            p_start: r.start,
            p_duration: r.durationMin,
            p_weekdays: r.weekdays,
            p_every: r.everyWeeks,
            p_ends_on: r.endsOn,
          }),
        ),
      updateSeries: (seriesId, scope, from, r) =>
        run("Saving the repeating class", (api) =>
          api.rpc("update_series", {
            p_series: seriesId,
            p_scope: scope,
            p_from: from,
            p_title: r.title,
            p_unit: r.unit,
            p_start: r.start,
            p_duration: r.durationMin,
            p_weekdays: r.weekdays,
            p_every: r.everyWeeks,
            p_ends_on: r.endsOn,
          }),
        ),
      endSeries: (seriesId, from) => run("Cancelling the classes", (api) => api.rpc("end_series", { p_series: seriesId, p_from: from })),
      editSession: (sessionId, p) =>
        run("Saving the class", (api) =>
          api
            .from("sessions")
            .update({ title: p.title.trim(), unit: p.unit.trim() || null, auto: false })
            .eq("id", num(sessionId)),
        ),
      deleteSession: (sessionId) => run("Saving the class", (api) => api.from("sessions").delete().eq("id", num(sessionId))),
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
          }),
        ),
      rescheduleSession: (sessionId, start, durationMin) =>
        run("Rescheduling", (api) => api.rpc("reschedule_session", { p_session: num(sessionId), p_start: start, p_duration: durationMin })),
      cancelSession: (sessionId) =>
        run("Cancelling the class", (api) => api.from("sessions").update({ cancelled: true }).eq("id", num(sessionId))),
      setLessonNotes: (sessionId, notes) =>
        run("Saving the notes", (api) =>
          api
            .from("sessions")
            .update({ notes: notes.trim() || null })
            .eq("id", num(sessionId)),
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
        // the recording also appears in the student's Other folder
        const existing = db.resources.find((r) => r.sessionId === sessionId && r.type === "Recording");
        const folder = db.folders.find((f) => f.cohortId === ses.cohortId && !f.parentId && f.name.toLowerCase() === "other");
        return run("Adding the recording to The Vault", (api) =>
          existing
            ? api.from("resources").update({ drive_url: driveUrl }).eq("id", num(existing.id))
            : api.from("resources").insert({
                cohort_id: num(ses.cohortId),
                session_id: num(sessionId),
                folder_id: numOrNull(folder?.id),
                title: `Class recording: ${ses.title}`,
                type: "Recording",
                strand: ses.strand,
                unit: ses.unit || "Class recordings",
                drive_url: driveUrl,
              }),
        );
      },

      /* ---------- class change requests ---------- */
      requestChange: ({ sessionId, studentId, kind, proposedStart, note }) =>
        parent
          ? viewOnly()
          : run("Sending the request", (api) =>
              api.from("class_requests").insert({
                session_id: num(sessionId),
                member_id: num(studentId),
                kind,
                proposed_start: kind === "reschedule" ? proposedStart : null,
                note: note?.trim() || null,
              }),
            ),
      withdrawRequest: (id) =>
        parent ? viewOnly() : run("Withdrawing the request", (api) => api.from("class_requests").delete().eq("id", num(id))),
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
            grading: a.grading,
            attachment_url: a.attachmentUrl || null,
            attachment_file_id: a.attachmentFileId || null,
            attachment_name: a.attachmentName || null,
            attachment_mime: a.attachmentMime || null,
          }),
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
      updateAssessment: (id, p) =>
        run("Saving the assessment", async (api) => {
          const { error } = await api
            .from("assignments")
            .update({
              title: p.title,
              unit: p.unit,
              brief: p.brief,
              due_at: p.dueAt,
              max_marks: p.maxMarks,
              time_limit_min: p.timeLimitMin,
            })
            .eq("id", num(id));
          if (error) return { error };
          return p.questions.trim()
            ? api.from("assessment_questions").upsert({ assignment_id: num(id), body: p.questions.trim() })
            : api.from("assessment_questions").delete().eq("assignment_id", num(id));
        }),
      startAssessment: (assignmentId) =>
        parent ? viewOnly() : run("Starting the assessment", (api) => api.rpc("start_assessment", { p_assignment: num(assignmentId) })),
      allowRetake: (assignmentId, studentId) =>
        run("Allowing a retake", async (api) => {
          const sub = await api.from("submissions").delete().eq("assignment_id", num(assignmentId)).eq("member_id", num(studentId));
          if (sub.error) return sub;
          return api.from("assessment_attempts").delete().eq("assignment_id", num(assignmentId)).eq("member_id", num(studentId));
        }),
      updateAssignment: (id, p) =>
        run("Saving the assignment", (api) =>
          api
            .from("assignments")
            .update({
              title: p.title,
              kind: p.kind,
              unit: p.unit,
              brief: p.brief,
              due_at: p.dueAt,
              max_marks: p.maxMarks,
              grading: p.grading,
            })
            .eq("id", num(id)),
        ),
      setQuestionPaper: (id, file) =>
        run(file ? "Attaching the question paper" : "Removing the question paper", (api) =>
          api
            .from("assignments")
            .update(
              file
                ? { attachment_file_id: file.fileId, attachment_name: file.name, attachment_mime: file.mime, attachment_url: null }
                : { attachment_file_id: null, attachment_name: null, attachment_mime: null, attachment_url: null },
            )
            .eq("id", num(id)),
        ),
      deleteAssignment: (id) => run("Deleting the assignment", (api) => api.from("assignments").delete().eq("id", num(id))),
      openAttachment: (assignmentId) => open(() => fileLink("assignment", assignmentId)),
      submitWork: async ({ assignmentId, studentId, file, answerText, note, onProgress }) => {
        if (parent) return viewOnly();
        if (!sb) return false;
        const existing = db.submissions.find((x) => x.assignmentId === assignmentId && x.studentId === studentId);
        let stored: { drive_file_id: string | null; file_path: string | null; mime_type: string | null } = {
          drive_file_id: existing?.driveFileId ?? null,
          file_path: existing?.filePath ?? null,
          mime_type: null,
        };
        if (file)
          try {
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
            },
            { onConflict: "assignment_id,member_id" }, // the database stamps the hand-in time
          ),
        );
      },
      addFeedbackFiles: async (submissionId, files, onProgress) => {
        if (!sb) return false;
        const total = files.reduce((n, f) => n + f.size, 0) || 1;
        let done = 0;
        const rows: { submission_id: number; drive_file_id: string; file_name: string; mime_type: string | null; size_bytes: number }[] =
          [];
        for (const file of files) {
          try {
            const up = await uploadFile(file, { purpose: "feedback", submissionId }, (p) => onProgress?.((done + p * file.size) / total));
            rows.push({
              submission_id: num(submissionId),
              drive_file_id: up.id,
              file_name: file.name.slice(0, 200),
              mime_type: up.mimeType || file.type || null,
              size_bytes: file.size,
            });
            done += file.size;
          } catch (e) {
            toast(e instanceof StorageError && e.status === 503 ? "File storage isn't connected yet." : message(e, "Upload failed"));
            if (!rows.length) return false;
            break;
          }
        }
        return run("Attaching the files", (api) => api.from("feedback_files").insert(rows));
      },
      removeFeedbackFile: (feedbackFileId) =>
        run("Removing the file", async () => {
          try {
            await trashFeedbackFile(feedbackFileId);
            return { error: null };
          } catch (e) {
            return { error: { message: message(e, "Couldn't remove the file") } };
          }
        }),
      acknowledgeFeedback: (submissionId, reflection) =>
        parent
          ? viewOnly()
          : run("Saving", (api) => api.rpc("acknowledge_feedback", { p_submission: num(submissionId), p_reflection: reflection ?? null })),
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
          }),
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
          }),
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
          api.from("folders").insert({ cohort_id: num(cohortId), parent_id: numOrNull(parentId), name: name.trim() }),
        ),
      renameFolder: (id, name) => run("Renaming the folder", (api) => api.from("folders").update({ name: name.trim() }).eq("id", num(id))),
      deleteFolder: (id) => run("Deleting the folder", (api) => api.from("folders").delete().eq("id", num(id))),
      addAnnouncement: (a) =>
        run("Posting", (api) =>
          api
            .from("announcements")
            .insert({ cohort_id: numOrNull(a.cohortId), title: a.title, body: a.body, created_by: numOrNull(me?.id) }),
        ),
      addStudent: async (st) => {
        if (!sb) return null;
        const { data, error } = await sb.rpc("add_student", {
          p_name: st.name,
          p_board: st.board || null,
          p_subject: st.subject || null,
          p_email: st.email || null,
          p_meet_url: st.meetUrl || null,
          p_slots: st.slots,
          p_teacher: st.teacherId ? num(st.teacherId) : null,
        });
        if (error) {
          toast(`Adding the student failed: ${error.message}`);
          return null;
        }
        await reload();
        return { joinCode: (data as { join_code: string }).join_code };
      },
      addTeacher: (t) =>
        run("Adding the teacher", (api) =>
          api.from("members").insert({
            email: t.email.trim().toLowerCase(),
            role: "teacher",
            full_name: t.name.trim(),
            title: t.title?.trim() || null,
            is_admin: !!t.admin,
          }),
        ),
      setAdmin: (memberId, admin) =>
        run(admin ? "Making them an admin" : "Removing admin access", (api) =>
          api.rpc("set_admin", { p_member: num(memberId), p_admin: admin }),
        ),
      removeTeacher: (memberId) =>
        run("Removing the teacher", (api) =>
          api.from("members").delete().eq("id", num(memberId)).eq("role", "teacher").eq("is_admin", false),
        ),
      assignTeacher: (cohortId, teacherId) =>
        run("Changing the teacher", (api) =>
          api
            .from("cohorts")
            .update({ teacher_id: teacherId ? num(teacherId) : null })
            .eq("id", num(cohortId)),
        ),
      deleteAnnouncement: (id) => run("Deleting the announcement", (api) => api.from("announcements").delete().eq("id", num(id))),
      setTimetable: (cohortId, slots) =>
        run("Saving the timetable", (api) => api.rpc("set_timetable", { p_cohort: num(cohortId), p_slots: slots })),
      archiveStudent: (cohortId, archive) =>
        run(archive ? "Archiving the student" : "Restoring the student", (api) =>
          api.rpc("archive_student", { p_cohort: num(cohortId), p_archive: archive }),
        ),
      removeStudent: (cohortId) => run("Removing the student", (api) => api.rpc("remove_student", { p_cohort: num(cohortId) })),
      updateStudent: (id, p) =>
        run("Saving", (api) =>
          api
            .from("members")
            .update({ predicted: p.predicted.trim() || null, target: p.target.trim() || null })
            .eq("id", num(id)),
        ),
    };
  }, [sb, db, me, parent, toast, reload]);

  const store = useMemo<Store>(
    () => ({
      ...actions,
      status,
      ready: status !== "loading",
      email: session?.user.email ?? null,
      db,
      auth: me ? { role: "plan" in me ? "student" : "teacher", userId: me.id } : null,
      me,
      parent,
      now,
      toasts,
      toast,
    }),
    [actions, status, session, db, me, parent, now, toasts, toast],
  );

  return framed ? null : <Ctx.Provider value={store}>{children}</Ctx.Provider>;
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
