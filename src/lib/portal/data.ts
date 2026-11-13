/**
 * Loads the portal's data: one request to `portal_snapshot()`, which returns
 * every row the signed-in member may see (row-level security decides), then
 * maps those rows into the shapes in types.ts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { fmtBytes } from "./format";
import type { AssignmentKind, DB, Plan, Progress, ResourceType, Role, Strand, Student, Submission, Teacher } from "./types";

type Id = number;

type Snapshot = {
  me: Id | null;
  members: {
    id: Id;
    email: string;
    role: Role;
    full_name: string;
    title: string | null;
    plan: Plan | null;
    cohort_id: Id | null;
    predicted: string | null;
    target: string | null;
  }[];
  cohorts: { id: Id; name: string; board: string | null; subject: string | null; meet_url: string | null; join_code: string }[];
  sessions: {
    id: Id;
    cohort_id: Id;
    title: string;
    strand: Strand | null;
    unit: string | null;
    starts_at: string;
    duration_min: number;
    meet_url: string | null;
    recording_url: string | null;
    attendance: Record<string, boolean>;
  }[];
  resources: {
    id: Id;
    cohort_id: Id;
    folder_id: Id | null;
    session_id: Id | null;
    title: string;
    type: ResourceType;
    strand: Strand | null;
    unit: string;
    drive_url: string | null;
    drive_file_id: string | null;
    mime_type: string | null;
    size_bytes: number | null;
    created_at: string;
  }[];
  folders: { id: Id; cohort_id: Id; parent_id: Id | null; name: string }[];
  assignments: {
    id: Id;
    cohort_id: Id;
    title: string;
    kind: AssignmentKind;
    strand: Strand | null;
    unit: string;
    brief: string;
    due_at: string;
    max_marks: number;
    time_limit_min: number | null;
    attachment_url: string | null;
    attachment_file_id: string | null;
    attachment_name: string | null;
    attachment_mime: string | null;
  }[];
  submissions: {
    id: Id;
    assignment_id: Id;
    member_id: Id;
    file_name: string | null;
    file_size: number | null;
    file_path: string | null;
    drive_file_id: string | null;
    answer_text: string | null;
    note: string | null;
    submitted_at: string;
    // from feedback; all null until the work is marked
    marks: number | null;
    feedback: string | null;
    strengths: string[] | null;
    improvements: string[] | null;
    marked_at: string | null;
  }[];
  announcements: { id: Id; cohort_id: Id | null; title: string; body: string; created_at: string }[];
  mastery: { member_id: Id; unit: string; strand: Strand; score: number; fix: string }[];
  requests: {
    id: Id;
    session_id: Id;
    member_id: Id;
    kind: "reschedule" | "cancel";
    proposed_start: string | null;
    note: string | null;
    status: "pending" | "approved" | "declined";
    created_at: string;
  }[];  // timed assessments (also: assignments.time_limit_min, submissions.answer_text / mime_type)
  attempts: { assignment_id: Id; member_id: Id; started_at: string; ends_at: string }[];
  questions: { assignment_id: Id; body: string }[];
};

export type Portal = { db: DB; me: Student | Teacher | null };

const id = (v: Id | null) => (v === null ? "" : String(v));
const shortDate = (iso: string) => new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });

function toPortal(snap: Snapshot): Portal {
  const students: Student[] = snap.members
    .filter((m) => m.role === "student")
    .map((m) => ({
      id: id(m.id),
      name: m.full_name,
      email: m.email,
      plan: m.plan ?? "Core",
      cohortId: id(m.cohort_id),
      predicted: m.predicted ?? "",
      target: m.target ?? "",
    }));

  const submissions: Submission[] = snap.submissions.map((s) => {
    const marked = s.marked_at !== null;
    return {
      id: id(s.id),
      assignmentId: id(s.assignment_id),
      studentId: id(s.member_id),
      submittedAt: s.submitted_at,
      fileName: s.file_name ?? "",
      fileSize: fmtBytes(s.file_size),
      filePath: s.file_path ?? undefined,
      driveFileId: s.drive_file_id ?? undefined,
      answerText: s.answer_text ?? undefined,
      note: s.note ?? undefined,
      status: marked ? "marked" : "submitted",
      marks: marked ? Number(s.marks) : undefined,
      feedback: marked ? s.feedback ?? "" : undefined,
      strengths: marked ? s.strengths ?? [] : undefined,
      improvements: marked ? s.improvements ?? [] : undefined,
      markedAt: s.marked_at ?? undefined,
    };
  });

  // predicted-grade trend: one point per marked piece of work, oldest first
  const maxMarks = new Map(snap.assignments.map((a) => [id(a.id), a.max_marks]));
  const progress: Progress[] = students.map((st) => ({
    studentId: st.id,
    history: submissions
      .filter((x) => x.studentId === st.id && x.markedAt)
      .sort((a, b) => new Date(a.markedAt!).getTime() - new Date(b.markedAt!).getTime())
      .map((x) => {
        const max = maxMarks.get(x.assignmentId);
        return { label: shortDate(x.markedAt!), pct: max ? Math.round(((x.marks ?? 0) / max) * 100) : 0 };
      }),
    mastery: snap.mastery
      .filter((m) => id(m.member_id) === st.id)
      .map((m) => ({ unit: m.unit, strand: m.strand, score: m.score, fix: m.fix })),
  }));

  const mine = snap.members.find((m) => m.id === snap.me);
  const me: Portal["me"] = !mine
    ? null
    : mine.role === "teacher"
      ? { id: id(mine.id), name: mine.full_name, email: mine.email, title: mine.title ?? "" }
      : students.find((s) => s.id === id(mine.id)) ?? null;

  return {
    me,
    db: {
      students,
      submissions,
      progress,
      cohorts: snap.cohorts.map((c) => ({
        id: id(c.id),
        name: c.name,
        board: c.board ?? "",
        subject: c.subject ?? "",
        meetUrl: c.meet_url ?? "",
        joinCode: c.join_code,
      })),
      sessions: snap.sessions.map((s) => ({
        id: id(s.id),
        cohortId: id(s.cohort_id),
        title: s.title,
        strand: s.strand,
        unit: s.unit,
        start: s.starts_at,
        durationMin: s.duration_min,
        meetUrl: s.meet_url ?? undefined,
        recordingUrl: s.recording_url ?? undefined,
        attendance: s.attendance,
      })),
      resources: snap.resources.map((r) => ({
        id: id(r.id),
        cohortId: id(r.cohort_id),
        title: r.title,
        type: r.type,
        strand: r.strand,
        unit: r.unit,
        driveUrl: r.drive_url ?? "",
        sessionId: id(r.session_id) || undefined,
        addedAt: r.created_at,
        folderId: id(r.folder_id) || undefined,
        driveFileId: r.drive_file_id ?? undefined,
        mimeType: r.mime_type ?? undefined,
        sizeBytes: r.size_bytes ?? undefined,
      })),
      folders: snap.folders.map((f) => ({
        id: id(f.id),
        cohortId: id(f.cohort_id),
        parentId: f.parent_id === null ? null : id(f.parent_id),
        name: f.name,
      })),
      assignments: snap.assignments.map((a) => ({
        id: id(a.id),
        cohortId: id(a.cohort_id),
        title: a.title,
        kind: a.kind,
        strand: a.strand,
        unit: a.unit,
        brief: a.brief,
        dueAt: a.due_at,
        maxMarks: a.max_marks,
        attachmentUrl: a.attachment_url ?? undefined,
        attachmentFileId: a.attachment_file_id ?? undefined,
        attachmentName: a.attachment_name ?? undefined,
        attachmentMime: a.attachment_mime ?? undefined,
        timeLimitMin: a.time_limit_min ?? undefined,
      })),
      attempts: (snap.attempts ?? []).map((t) => ({
        assignmentId: id(t.assignment_id),
        studentId: id(t.member_id),
        startedAt: t.started_at,
        endsAt: t.ends_at,
      })),
      questions: Object.fromEntries((snap.questions ?? []).map((q) => [id(q.assignment_id), q.body])),
      announcements: snap.announcements.map((a) => ({
        id: id(a.id),
        cohortId: a.cohort_id === null ? null : id(a.cohort_id),
        title: a.title,
        body: a.body,
        at: a.created_at,
      })),
      requests: snap.requests.map((r) => ({
        id: id(r.id),
        sessionId: id(r.session_id),
        studentId: id(r.member_id),
        kind: r.kind,
        proposedStart: r.proposed_start,
        note: r.note ?? "",
        status: r.status,
        createdAt: r.created_at,
      })),
    },
  };
}

export async function loadPortal(sb: SupabaseClient): Promise<Portal | { error: string }> {
  const { data, error } = await sb.rpc("portal_snapshot");
  return error ? { error: error.message } : toPortal(data as Snapshot);
}
