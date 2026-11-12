"use client";

import { Shell, type NavItem } from "@/components/portal/shell";
import { usePortal } from "@/lib/portal/store";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { db, auth, now } = usePortal();
  const cohortId = db.students.find((s) => s.id === auth?.userId)?.cohortId;
  const todo = db.assignments.filter(
    (a) => a.cohortId === cohortId && !db.submissions.some((x) => x.assignmentId === a.id && x.studentId === auth?.userId)
  ).length;
  const fresh = db.announcements.filter(
    (a) => (!a.cohortId || a.cohortId === cohortId) && now - new Date(a.at).getTime() < 3 * 86_400_000
  ).length;

  const nav: NavItem[] = [
    { href: "/portal/student/", label: "Dashboard" },
    { href: "/portal/student/calendar/", label: "Calendar" },
    { href: "/portal/student/assignments/", label: "Assignments", badge: todo },
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
