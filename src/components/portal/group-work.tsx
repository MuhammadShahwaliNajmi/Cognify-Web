"use client";

import { ChevronRight } from "lucide-react";
import { assessmentState, isScored, scoreText, studentsIn, submissionFor, type AssessmentState } from "@/lib/portal/selectors";
import { fmtRelative } from "@/lib/portal/format";
import type { Assignment, DB, Student, Submission } from "@/lib/portal/types";
import { Avatar, Status } from "./ui";

export type MemberWork = { st: Student; sub?: Submission; state: AssessmentState | "todo" | "handed-in" | "returned" | "missing" };

/** Each student's position on one piece of a group's work. */
export function groupWork(db: DB, a: Assignment, now: number): MemberWork[] {
  return studentsIn(db, a.cohortId)
    .sort((x, y) => x.name.localeCompare(y.name))
    .map((st) => {
      const sub = submissionFor(db, a.id, st.id);
      if (a.timeLimitMin) return { st, sub, state: assessmentState(db, a, st.id, now) };
      const state = sub?.status === "marked" ? "returned" : sub ? "handed-in" : new Date(a.dueAt).getTime() < now ? "missing" : "todo";
      return { st, sub, state };
    });
}

/** One line for a group's row: what needs the teacher first, then how far the group has got. */
export function GroupStatus({ work }: { work: MemberWork[] }) {
  const n = work.length;
  const count = (...s: MemberWork["state"][]) => work.filter((w) => s.includes(w.state)).length;
  const toMark = count("handed-in", "submitted");
  const done = count("returned", "marked");
  const missing = count("missing", "missed", "time-up");
  const running = count("in-progress", "grace");
  if (!n) return <Status>No students yet</Status>;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {toMark > 0 && <Status tone="attention">{toMark} to mark</Status>}
      {running > 0 && <Status tone="attention">{running} in progress</Status>}
      {done === n ? (
        <Status tone="done">All returned</Status>
      ) : (
        <span className="text-[13px] text-navy">
          {n - count("todo", "upcoming", "missing", "missed", "time-up")} of {n} handed in
          {missing > 0 ? ` · ${missing} missed` : ""}
        </span>
      )}
    </span>
  );
}

/** A group's score column: the average of what's been marked (or how many have passed / completed). */
export function groupScore(a: Assignment, work: MemberWork[]) {
  const marked = work.filter((w) => w.sub?.status === "marked");
  if (!marked.length) return a.grading === "marks" || !a.grading ? `– / ${a.maxMarks}` : "–";
  if (!isScored(a))
    return `${marked.filter((w) => w.sub!.marks).length} of ${work.length} ${a.grading === "pass_fail" ? "passed" : "done"}`;
  const avg = marked.reduce((t, w) => t + (w.sub!.marks ?? 0), 0) / marked.length;
  return `avg ${Math.round(avg * 10) / 10} / ${a.maxMarks}`;
}

const LABEL: Record<MemberWork["state"], string> = {
  todo: "Not handed in yet",
  "handed-in": "To mark",
  returned: "Returned",
  missing: "Not handed in",
  upcoming: "Not started",
  "in-progress": "In progress",
  grace: "In progress",
  submitted: "To mark",
  marked: "Marked",
  missed: "Missed",
  "time-up": "No answer",
};
const TONE = (s: MemberWork["state"]) =>
  s === "returned" || s === "marked"
    ? "done"
    : s === "handed-in" || s === "submitted" || s === "missing" || s === "in-progress"
      ? "attention"
      : "plain";

/** Every student in the group on one piece of work; pick one to mark or look at it. */
export function GroupWorkList({
  a,
  work,
  now,
  onPick,
}: {
  a: Assignment;
  work: MemberWork[];
  now: number;
  onPick: (w: MemberWork) => void;
}) {
  return (
    <ul className="divide-y divide-navy/10">
      {work.map((w) => {
        const clickable = !!w.sub || !!a.timeLimitMin;
        return (
          <li key={w.st.id}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onPick(w)}
              className="flex min-h-[56px] w-full items-center gap-3 py-2.5 text-left transition-colors enabled:hover:bg-gold/[0.08] disabled:cursor-default focus-gold"
            >
              <Avatar name={w.st.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-semibold text-navy">{w.st.name}</span>
                <span className="block text-[12.5px] text-navy">
                  {w.sub ? `Handed in ${fmtRelative(w.sub.submittedAt, now)}` : LABEL[w.state]}
                </span>
              </span>
              <Status tone={TONE(w.state)}>{LABEL[w.state]}</Status>
              <span className="w-20 text-right text-[14px] font-semibold tabular-nums text-navy">
                {w.sub?.status === "marked" ? scoreText(a, w.sub.marks) : ""}
              </span>
              {clickable ? <ChevronRight size={16} className="shrink-0 text-gold" /> : <span className="w-4" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
