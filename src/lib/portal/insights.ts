/**
 * Teacher insights, shared by the website and the app: which students need attention,
 * and a plain-text progress report a teacher can send to parents (WhatsApp, email, print).
 */
import { cohortOf, courseOf, submissionFor } from "./selectors";
import type { DB, Student } from "./types";

const DAY = 86_400_000;

export type Flag = { kind: "attendance" | "missing" | "falling"; text: string };

const ended = (s: { start: string; durationMin: number }, now: number) => new Date(s.start).getTime() + s.durationMin * 60_000 < now;

/** Classes in the window with a register, and how many the student was at. */
function attendanceIn(db: DB, st: Student, from: number, now: number) {
  const done = db.sessions.filter(
    (s) => s.cohortId === st.cohortId && ended(s, now) && new Date(s.start).getTime() >= from && Object.keys(s.attendance).length > 0,
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
  if (att.total >= 3 && att.present / att.total < 0.75)
    flags.push({ kind: "attendance", text: `At ${att.present} of the last ${att.total} classes` });

  const missing = db.assignments.filter(
    (a) =>
      a.cohortId === st.cohortId &&
      new Date(a.dueAt).getTime() < now &&
      new Date(a.dueAt).getTime() > now - 30 * DAY &&
      !submissionFor(db, a.id, st.id),
  ).length;
  if (missing) flags.push({ kind: "missing", text: `${missing} piece${missing === 1 ? "" : "s"} of work missing` });

  const pcts = markedPcts(db, st).map((x) => x.pct);
  if (pcts.length >= 4) {
    const recent = avg(pcts.slice(-2))!;
    const before = avg(pcts.slice(-5, -2))!;
    if (before - recent >= 10) flags.push({ kind: "falling", text: `Scores down ${before - recent} points` });
  }

  return flags;
}

/** A flag's identity: the same reason stays dismissed; a changed one (e.g. 2 → 3 missing) shows again. */
export const flagKey = (studentId: string, f: Flag) => `${studentId}|${f.kind}|${f.text}`;

/** Every student with at least one flag (minus the ones the teacher dismissed), most flags first. */
export function needsAttention(db: DB, now: number, dismissed: Set<string> = new Set()) {
  return db.students
    .map((st) => ({ st, flags: studentFlags(db, st, now).filter((f) => !dismissed.has(flagKey(st.id, f))) }))
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

  const due = db.assignments.filter(
    (a) => a.cohortId === st.cohortId && new Date(a.dueAt).getTime() < now && new Date(a.dueAt).getTime() >= from,
  );
  const handed = due.filter((a) => submissionFor(db, a.id, st.id));
  const onTime = handed.filter(
    (a) => new Date(submissionFor(db, a.id, st.id)!.submittedAt).getTime() <= new Date(a.dueAt).getTime() + 2 * 60_000,
  );

  const marked = markedPcts(db, st);
  const inWindow = marked.filter((x) => x.sub.markedAt && new Date(x.sub.markedAt).getTime() >= from);
  const overall = avg(marked.map((x) => x.pct));
  const recent = avg(inWindow.map((x) => x.pct));

  const mastery = [...(db.progress.find((p) => p.studentId === st.id)?.mastery ?? [])].sort((a, b) => b.score - a.score);
  const strong = mastery.filter((m) => m.score >= 70).slice(0, 2);
  const weak = [...mastery]
    .reverse()
    .filter((m) => m.score < 70)
    .slice(0, 2);

  const lines: string[] = [
    "Concept Lab · Progress report",
    `${st.name} · ${courseOf(c)}`,
    `${dmy(from)} to ${dmy(now)}`,
    "",
    `Attendance: ${att.total ? `${att.present} of ${att.total} classes (${Math.round((att.present / att.total) * 100)}%)` : "no classes with a register yet"}`,
    `Work: ${due.length ? `${handed.length} of ${due.length} handed in, ${onTime.length} on time` : "nothing was due"}`,
    `Average score: ${recent !== null ? `${recent}% this period` : "no marked work this period"}${overall !== null ? ` (${overall}% overall)` : ""}`,
  ];
  const predicted = predictGrade(db, st, now);
  if (predicted || st.target) lines.push(`Predicted grade: ${predicted?.grade ?? "–"} · Target: ${st.target || "–"}`);
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
  const past = db.assignments
    .filter((a) => a.cohortId === cohortId && new Date(a.dueAt).getTime() < now)
    .sort((a, b) => b.dueAt.localeCompare(a.dueAt));
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
    const toMark = db.submissions.filter(
      (x) => x.status === "submitted" && set.has(db.assignments.find((a) => a.id === x.assignmentId)?.cohortId ?? ""),
    ).length;
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

/* ---------- predicted grade (worked out, not typed in) ---------- */

type Band = [min: number, grade: string];
const IB: Band[] = [
  [72, "7"],
  [62, "6"],
  [52, "5"],
  [42, "4"],
  [32, "3"],
  [18, "2"],
  [0, "1"],
];
const LETTERS: Band[] = [
  [80, "A*"],
  [70, "A"],
  [60, "B"],
  [50, "C"],
  [40, "D"],
  [30, "E"],
  [0, "U"],
];
const FA: Band[] = [
  [80, "A+"],
  [70, "A"],
  [60, "B"],
  [50, "C"],
  [40, "D"],
  [33, "E"],
  [0, "F"],
];
const IEO: Band[] = [
  [80, "Gold"],
  [65, "Silver"],
  [50, "Bronze"],
  [0, "Honourable mention"],
];

/** The grade scale for a board ("IB Diploma", "A Level", "IGCSE", "FA", "IEO" …); null = show a percentage. */
function bandsFor(board: string): Band[] | null {
  const b = board.toLowerCase();
  if (b.includes("ib")) return IB;
  if (b.includes("ieo") || b.includes("olympiad")) return IEO;
  if (/\bfa\b|\bfsc\b|intermediate/.test(b)) return FA;
  if (/a.?level|o.?level|igcse|gcse|as level/.test(b)) return LETTERS;
  return null;
}

/** Weighted average where the most recent piece counts fully and each older one a little less. */
function recentAverage(pcts: number[]) {
  if (!pcts.length) return null;
  let sum = 0;
  let weight = 0;
  pcts.forEach((p, i) => {
    const w = 0.85 ** (pcts.length - 1 - i);
    sum += p * w;
    weight += w;
  });
  return sum / weight;
}

export type Prediction = { grade: string; pct: number; pieces: number; attendance: number };

/**
 * Predicted grade from marked work and attendance:
 *  - timed assessments count 60%, other work 40% (whichever exists counts fully), recent work weighs more;
 *  - attendance under 90% takes 0.15 points off per missing point;
 *  - mapped to the student's board. Null until something is marked. `readOnly` counts only feedback the student has read.
 */
export function predictGrade(db: DB, st: Student, now: number, opts: { readOnly?: boolean } = {}): Prediction | null {
  const marked = markedPcts(db, st).filter((x) => !opts.readOnly || x.sub.seenAt);
  if (!marked.length) return null;
  const timed = recentAverage(marked.filter((x) => x.a!.timeLimitMin).map((x) => x.pct));
  const work = recentAverage(marked.filter((x) => !x.a!.timeLimitMin).map((x) => x.pct));
  const base = timed !== null && work !== null ? 0.6 * timed + 0.4 * work : (timed ?? work)!;
  const att = attendanceIn(db, st, 0, now);
  const attendance = att.total ? Math.round((att.present / att.total) * 100) : 100;
  const pct = Math.max(0, Math.min(100, Math.round(base - Math.max(0, 90 - attendance) * 0.15)));
  const bands = bandsFor(cohortOf(db, st.cohortId).board);
  const grade = bands ? bands.find(([min]) => pct >= min)![1] : `${pct}%`;
  return { grade, pct, pieces: marked.length, attendance };
}

/** The percentage a grade on the student's board starts at (for "points to your target"); undefined if unknown. */
export function gradeMinPct(db: DB, st: Student, grade: string): number | undefined {
  const g = grade.trim().toLowerCase();
  if (!g) return undefined;
  const bands = bandsFor(cohortOf(db, st.cohortId).board) ?? [...IB, ...LETTERS];
  return bands.find(([, name]) => name.toLowerCase() === g)?.[0];
}
