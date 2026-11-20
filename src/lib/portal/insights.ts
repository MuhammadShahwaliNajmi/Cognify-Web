/**
 * Teacher insights, shared by the website and the app: which students need attention,
 * and a plain-text progress report a teacher can send to parents (WhatsApp, email, print).
 */
import { cohortOf, courseOf, submissionFor } from "./selectors";
import type { DB, Student } from "./types";

const DAY = 86_400_000;

export type Flag = { kind: "attendance" | "missing" | "falling" | "unread"; text: string };

const ended = (s: { start: string; durationMin: number }, now: number) => new Date(s.start).getTime() + s.durationMin * 60_000 < now;

/** Classes in the window with a register, and how many the student was at. */
function attendanceIn(db: DB, st: Student, from: number, now: number) {
  const done = db.sessions.filter(
    (s) => s.cohortId === st.cohortId && ended(s, now) && new Date(s.start).getTime() >= from && Object.keys(s.attendance).length > 0
  );
  return { total: done.length, present: done.filter((s) => s.attendance[st.id]).length };
}

/** Marked work, oldest first, as percentages. */
function markedPcts(db: DB, st: Student) {
  return db.submissions
    .filter((x) => x.studentId === st.id && x.status === "marked")
    .sort((a, b) => (a.markedAt ?? "").localeCompare(b.markedAt ?? ""))
    .map((x) => {
      const a = db.assignments.find((y) => y.id === x.assignmentId);
      return { sub: x, a, pct: a ? Math.round(((x.marks ?? 0) / a.maxMarks) * 100) : 0 };
    })
    .filter((x) => x.a);
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((n, x) => n + x, 0) / xs.length) : null);

/** Why a student may need attention (empty = all fine). Looks at the last 30 days. */
export function studentFlags(db: DB, st: Student, now: number): Flag[] {
  const flags: Flag[] = [];
  const att = attendanceIn(db, st, now - 30 * DAY, now);
  if (att.total >= 3 && att.present / att.total < 0.75) flags.push({ kind: "attendance", text: `At ${att.present} of the last ${att.total} classes` });

  const missing = db.assignments.filter(
    (a) => a.cohortId === st.cohortId && new Date(a.dueAt).getTime() < now && new Date(a.dueAt).getTime() > now - 30 * DAY && !submissionFor(db, a.id, st.id)
  ).length;
  if (missing) flags.push({ kind: "missing", text: `${missing} piece${missing === 1 ? "" : "s"} of work missing` });

  const pcts = markedPcts(db, st).map((x) => x.pct);
  if (pcts.length >= 4) {
    const recent = avg(pcts.slice(-2))!;
    const before = avg(pcts.slice(-5, -2))!;
    if (before - recent >= 10) flags.push({ kind: "falling", text: `Scores down ${before - recent} points` });
  }

  const unread = db.submissions.filter((x) => x.studentId === st.id && x.status === "marked" && !x.seenAt && x.markedAt && new Date(x.markedAt).getTime() < now - 3 * DAY).length;
  if (unread) flags.push({ kind: "unread", text: `Hasn't read ${unread} feedback` });
  return flags;
}

/** Every student with at least one flag, most flags first. */
export function needsAttention(db: DB, now: number) {
  return db.students
    .map((st) => ({ st, flags: studentFlags(db, st, now) }))
    .filter((x) => x.flags.length)
    .sort((a, b) => b.flags.length - a.flags.length || a.st.name.localeCompare(b.st.name));
}

const dmy = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** A progress report for parents, as plain text (it reads well in WhatsApp, email and print). */
export function progressReport(db: DB, st: Student, now: number, opts: { days?: number; note?: string; teacher?: string } = {}) {
  const days = opts.days ?? 30;
  const from = now - days * DAY;
  const c = cohortOf(db, st.cohortId);
  const att = attendanceIn(db, st, from, now);

  const due = db.assignments.filter((a) => a.cohortId === st.cohortId && new Date(a.dueAt).getTime() < now && new Date(a.dueAt).getTime() >= from);
  const handed = due.filter((a) => submissionFor(db, a.id, st.id));
  const onTime = handed.filter((a) => new Date(submissionFor(db, a.id, st.id)!.submittedAt).getTime() <= new Date(a.dueAt).getTime() + 2 * 60_000);

  const marked = markedPcts(db, st);
  const inWindow = marked.filter((x) => x.sub.markedAt && new Date(x.sub.markedAt).getTime() >= from);
  const overall = avg(marked.map((x) => x.pct));
  const recent = avg(inWindow.map((x) => x.pct));

  const mastery = [...(db.progress.find((p) => p.studentId === st.id)?.mastery ?? [])].sort((a, b) => b.score - a.score);
  const strong = mastery.filter((m) => m.score >= 70).slice(0, 2);
  const weak = [...mastery].reverse().filter((m) => m.score < 70).slice(0, 2);

  const lines: string[] = [
    "Concept Lab · Progress report",
    `${st.name} · ${courseOf(c)}`,
    `${dmy(from)} to ${dmy(now)}`,
    "",
    `Attendance: ${att.total ? `${att.present} of ${att.total} classes (${Math.round((att.present / att.total) * 100)}%)` : "no classes with a register yet"}`,
    `Work: ${due.length ? `${handed.length} of ${due.length} handed in, ${onTime.length} on time` : "nothing was due"}`,
    `Average score: ${recent !== null ? `${recent}% this period` : "no marked work this period"}${overall !== null ? ` (${overall}% overall)` : ""}`,
  ];
  if (st.predicted || st.target) lines.push(`Predicted grade: ${st.predicted || "–"} · Target: ${st.target || "–"}`);
  if (strong.length) lines.push("", `Strongest topics: ${strong.map((m) => `${m.unit} (${m.score}%)`).join(", ")}`);
  if (weak.length) {
    if (!strong.length) lines.push("");
    lines.push(`To work on: ${weak.map((m) => `${m.unit} (${m.score}%)${m.fix ? ` — ${m.fix}` : ""}`).join("; ")}`);
  }
  if (inWindow.length) {
    lines.push("", "Marked work:");
    for (const x of inWindow.slice(-5).reverse()) lines.push(`• ${x.a!.title}: ${x.sub.marks ?? 0}/${x.a!.maxMarks} (${x.pct}%)`);
  }
  if (opts.note?.trim()) lines.push("", `Teacher's note: ${opts.note.trim()}`);
  lines.push("", `${opts.teacher ? `${opts.teacher}, ` : ""}Concept Lab Education · cognifypk.com`);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

/** Pieces of work in a row handed in on time (most recent deadlines first; stops at the first miss). */
export function onTimeStreak(db: DB, studentId: string, cohortId: string, now: number) {
  const past = db.assignments.filter((a) => a.cohortId === cohortId && new Date(a.dueAt).getTime() < now).sort((a, b) => b.dueAt.localeCompare(a.dueAt));
  let n = 0;
  for (const a of past) {
    const sub = submissionFor(db, a.id, studentId);
    if (!sub || new Date(sub.submittedAt).getTime() > new Date(a.dueAt).getTime() + 2 * 60_000) break;
    n++;
  }
  return n;
}

export type TeachingRow = { students: number; classes: number; hours: number; attendancePct: number | null; toMark: number };

/** Admins: the last `days` of teaching, in total and per teacher (finished classes only). */
export function teachingOverview(db: DB, now: number, days = 30) {
  const from = now - days * DAY;
  const row = (cohortIds: string[]): TeachingRow => {
    const set = new Set(cohortIds);
    const done = db.sessions.filter((s) => set.has(s.cohortId) && ended(s, now) && new Date(s.start).getTime() >= from);
    let present = 0;
    let marks = 0;
    for (const s of done) {
      const st = db.students.filter((x) => x.cohortId === s.cohortId);
      for (const x of st) {
        if (s.attendance[x.id] === undefined) continue;
        marks++;
        if (s.attendance[x.id]) present++;
      }
    }
    const toMark = db.submissions.filter((x) => x.status === "submitted" && set.has(db.assignments.find((a) => a.id === x.assignmentId)?.cohortId ?? "")).length;
    return {
      students: db.students.filter((x) => set.has(x.cohortId)).length,
      classes: done.length,
      hours: Math.round((done.reduce((n, s) => n + s.durationMin, 0) / 60) * 10) / 10,
      attendancePct: marks ? Math.round((present / marks) * 100) : null,
      toMark,
    };
  };
  return {
    total: row(db.cohorts.map((c) => c.id)),
    teachers: db.teachers.map((t) => ({ teacher: t, ...row(db.cohorts.filter((c) => c.teacherId === t.id).map((c) => c.id)) })),
  };
}
