/** Small read-only lookups over the portal data, shared by several screens. */
import type { Cohort, DB, Session, Strand } from "./types";

const EMPTY_COHORT: Cohort = { id: "", name: "", board: "", subject: "", meetUrl: "", joinCode: "" };

export const cohortOf = (db: DB, id: string) => db.cohorts.find((c) => c.id === id) ?? EMPTY_COHORT;

/** What a student is studying, e.g. "IB Diploma · Economics & Business".
 *  (One-to-one cohorts are named after the student, so never show cohort.name to them.) */
export const courseOf = (c: Cohort) => [c.board, c.subject].filter(Boolean).join(" · ") || "Your course";

export const meetLink = (db: DB, s: Session) => s.meetUrl || cohortOf(db, s.cohortId).meetUrl;

/** "Micro · Elasticities" — or "" for a timetable class with no topic yet. */
export const topicOf = (s: { strand: Strand | null; unit: string | null }) => [s.strand, s.unit].filter(Boolean).join(" · ");

export const submissionFor = (db: DB, assignmentId: string, studentId: string) =>
  db.submissions.find((x) => x.assignmentId === assignmentId && x.studentId === studentId);

/** Share of finished classes the student joined (100 before the first class). */
export function attendancePct(db: DB, studentId: string, cohortId: string, now: number) {
  const past = db.sessions.filter((s) => s.cohortId === cohortId && new Date(s.start).getTime() + s.durationMin * 60_000 < now);
  if (!past.length) return 100;
  return Math.round((past.filter((s) => s.attendance[studentId]).length / past.length) * 100);
}

/** Mean score across marked work, or null if nothing is marked yet. */
export function averagePct(db: DB, studentId: string) {
  const marked = db.submissions.filter((x) => x.studentId === studentId && x.status === "marked");
  if (!marked.length) return null;
  const total = marked.reduce((sum, x) => {
    const a = db.assignments.find((y) => y.id === x.assignmentId);
    return sum + (a ? (x.marks ?? 0) / a.maxMarks : 0);
  }, 0);
  return Math.round((total / marked.length) * 100);
}

export const attemptFor = (db: DB, assignmentId: string, studentId: string) =>
  db.attempts.find((t) => t.assignmentId === assignmentId && t.studentId === studentId);

/** Timed assessments vs ordinary assignments. */
export const isAssessment = (a: { timeLimitMin?: number }) => !!a.timeLimitMin;

/** Where a student opens a piece of work. */
export const workHref = (a: { id: string; timeLimitMin?: number }) =>
  `/portal/student/${a.timeLimitMin ? "assessments" : "assignments"}/?open=${a.id}`;

/** Grace after the clock runs out for an upload to finish (matches the database). */
export const GRACE_MS = 2 * 60_000;

export type AssessmentState = "upcoming" | "in-progress" | "grace" | "submitted" | "marked" | "missed" | "time-up";

/** Where a student is with a timed assessment, right now. */
export function assessmentState(db: DB, a: { id: string; dueAt: string }, studentId: string, now: number): AssessmentState {
  const sub = db.submissions.find((x) => x.assignmentId === a.id && x.studentId === studentId);
  if (sub?.status === "marked") return "marked";
  const t = attemptFor(db, a.id, studentId);
  if (t) {
    const end = new Date(t.endsAt).getTime();
    if (now < end) return "in-progress";
    if (now < end + GRACE_MS) return "grace";
    return sub ? "submitted" : "time-up";
  }
  if (sub) return "submitted";
  return now <= new Date(a.dueAt).getTime() ? "upcoming" : "missed";
}
