"use client";

import { Shell, type NavItem } from "@/components/portal/shell";
import { usePortal } from "@/lib/portal/store";
import { DAY } from "@/lib/portal/format";
import { assessmentState } from "@/lib/portal/selectors";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { db, auth, now } = usePortal();
  const cohortId = db.students.find((s) => s.id === auth?.userId)?.cohortId;
  const mine = db.assignments.filter((a) => a.cohortId === cohortId);
  const todo = mine.filter(
    (a) => !a.timeLimitMin && !db.submissions.some((x) => x.assignmentId === a.id && x.studentId === auth?.userId)
  ).length;
  // timed assessments still to start, or running now
  const tests = auth
    ? mine.filter((a) => a.timeLimitMin && ["upcoming", "in-progress", "grace"].includes(assessmentState(db, a, auth.userId, now))).length
    : 0;
  const fresh = db.announcements.filter(
    (a) => (!a.cohortId || a.cohortId === cohortId) && now - new Date(a.at).getTime() < 3 * DAY
  ).length;

  const nav: NavItem[] = [
    { href: "/portal/student/", label: "Dashboard" },
    { href: "/portal/student/calendar/", label: "Calendar" },
    { href: "/portal/student/assignments/", label: "Assignments", badge: todo },
    { href: "/portal/student/assessments/", label: "Assessments", badge: tests },
    { href: "/portal/student/grades/", label: "Grades" },
    { href: "/portal/student/resources/", label: "Resources" },
    { href: "/portal/student/announcements/", label: "Announcements", badge: fresh },
    { href: "/portal/student/tutor/", label: "AI Tutor" },
  ];
  return (
    <Shell role="student" nav={nav}>
      {children}
    </Shell>
  );
}
