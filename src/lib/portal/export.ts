/** Spreadsheet exports (CSV) of what the teacher can see. */
import type { DB } from "./types";
import { cohortOf, courseOf } from "./selectors";

type Cell = string | number;

/** Quote where needed, and defuse cells a spreadsheet would run as a formula. */
function cell(v: Cell) {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(name: string, rows: Cell[][]) {
  // the BOM makes Excel read the file as UTF-8
  const blob = new Blob(["\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** One row per student per piece of work. */
export function exportGrades(db: DB) {
  const rows: Cell[][] = [["Student", "Email", "Course", "Work", "Type", "Due", "Handed in", "Marks", "Out of", "Percent", "Status"]];
  for (const s of [...db.students].sort((a, b) => a.name.localeCompare(b.name))) {
    for (const a of db.assignments.filter((x) => x.cohortId === s.cohortId)) {
      const sub = db.submissions.find((x) => x.assignmentId === a.id && x.studentId === s.id);
      const marked = sub?.status === "marked";
      rows.push([
        s.name,
        s.email,
        courseOf(cohortOf(db, s.cohortId)),
        a.title,
        a.timeLimitMin ? "Timed assessment" : a.kind,
        `${day(a.dueAt)} ${time(a.dueAt)}`,
        sub ? `${day(sub.submittedAt)} ${time(sub.submittedAt)}` : "",
        marked ? sub.marks ?? "" : "",
        a.maxMarks,
        marked ? Math.round(((sub.marks ?? 0) / a.maxMarks) * 100) : "",
        marked ? "Marked" : sub ? "To mark" : "Not handed in",
      ]);
    }
  }
  download("concept-lab-grades", rows);
}

/** One row per student per finished class. */
export function exportAttendance(db: DB, now: number) {
  const rows: Cell[][] = [["Student", "Date", "Start", "Class", "Attendance"]];
  for (const s of [...db.students].sort((a, b) => a.name.localeCompare(b.name))) {
    for (const c of db.sessions) {
      if (c.cohortId !== s.cohortId || new Date(c.start).getTime() + c.durationMin * 60_000 > now) continue;
      rows.push([s.name, day(c.start), time(c.start), c.title, c.attendance[s.id] ? "Present" : "Absent"]);
    }
  }
  download("concept-lab-attendance", rows);
}
