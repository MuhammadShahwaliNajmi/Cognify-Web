/** Small read-only lookups over the portal data, shared by several screens. */
import type { Cohort, DB, Session } from "./types";

const EMPTY_COHORT: Cohort = { id: "", name: "", board: "", subject: "", meetUrl: "", joinCode: "", teacherId: "", examOn: "" };

export const cohortOf = (db: DB, id: string) => db.cohorts.find((c) => c.id === id) ?? EMPTY_COHORT;

/** What a student is studying, e.g. "IB Diploma · Economics & Business".
 *  (One-to-one cohorts are named after the student, so never show cohort.name to them.) */
export const courseOf = (c: Cohort) => [c.board, c.subject].filter(Boolean).join(" · ") || "Your course";

export const meetLink = (db: DB, s: Session) => s.meetUrl || cohortOf(db, s.cohortId).meetUrl;

/** "Micro · Elasticities" — or "" for a timetable class with no topic yet. */
export const topicOf = (s: { unit: string | null }) => s.unit ?? "";

export const submissionFor = (db: DB, assignmentId: string, studentId: string) =>
  db.submissions.find((x) => x.assignmentId === assignmentId && x.studentId === studentId);

/** A finished class whose register nobody has taken yet (no one joined, the teacher hasn't marked it). */
export const registerMissing = (s: Session, now: number) =>
  new Date(s.start).getTime() + s.durationMin * 60_000 < now && Object.keys(s.attendance).length === 0;

/** Share of finished classes (with a register) the student was present at (100 before the first one). */
export function attendancePct(db: DB, studentId: string, cohortId: string, now: number) {
  const past = db.sessions.filter(
    (s) => s.cohortId === cohortId && new Date(s.start).getTime() + s.durationMin * 60_000 < now && Object.keys(s.attendance).length > 0,
  );
  if (!past.length) return 100;
  return Math.round((past.filter((s) => s.attendance[studentId]).length / past.length) * 100);
}

/** Mean score across marked work, or null if nothing is marked yet. */
/** Work marked out of a total (pass/fail, complete and feedback-only work have no percentage). */
export const isScored = (a: { grading?: string }) => (a.grading ?? "marks") === "marks";

/** How a marked piece of work reads: "14 / 20", "Pass", "Fail", "Complete", "Incomplete", "Feedback given". */
export function scoreText(a: { grading?: string; maxMarks: number }, marks: number | undefined | null) {
  switch (a.grading) {
    case "pass_fail":
      return marks ? "Pass" : "Fail";
    case "complete":
      return marks ? "Complete" : "Incomplete";
    case "none":
      return "Feedback given";
    default:
      return `${marks ?? 0} / ${a.maxMarks}`;
  }
}

/** What a piece of work is out of, before marking: "/ 20", "Pass / fail", … */
export function gradingText(a: { grading?: string; maxMarks: number }) {
  return a.grading === "pass_fail"
    ? "Pass / fail"
    : a.grading === "complete"
      ? "Complete / incomplete"
      : a.grading === "none"
        ? "Feedback only"
        : `${a.maxMarks} marks`;
}

export function averagePct(db: DB, studentId: string) {
  const marked = db.submissions.filter(
    (x) => x.studentId === studentId && x.status === "marked" && isScored(db.assignments.find((y) => y.id === x.assignmentId) ?? {}),
  );
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

/** Where a student opens a piece of work from inside the portal (`back=1`: closing it returns to where they were). */
export const workHref = (a: { id: string; timeLimitMin?: number }) =>
  `/portal/student/${a.timeLimitMin ? "assessments" : "assignments"}/?open=${a.id}&back=1`;

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

/** Whole days from today to the exam date (0 = today), or null when no date / it has passed. */
export function daysToExam(c: Cohort, now: number) {
  if (!c.examOn) return null;
  const exam = new Date(`${c.examOn}T00:00:00`);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const d = Math.round((exam.getTime() - today.getTime()) / 86_400_000);
  return d >= 0 ? d : null;
}
