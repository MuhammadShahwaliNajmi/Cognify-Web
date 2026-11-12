"use client";

import { Shell, type NavItem } from "@/components/portal/shell";
import { usePortal } from "@/lib/portal/store";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { db, auth } = usePortal();
  const cohortId = db.students.find((s) => s.id === auth?.userId)?.cohortId;
  const todo = db.assignments.filter(
    (a) => a.cohortId === cohortId && !db.submissions.some((x) => x.assignmentId === a.id && x.studentId === auth?.userId)
  ).length;

  const nav: NavItem[] = [
    { href: "/portal/student/", label: "Home" },
    { href: "/portal/student/classes/", label: "Classes" },
    { href: "/portal/student/vault/", label: "Vault" },
    { href: "/portal/student/assignments/", label: "Work", badge: todo },
    { href: "/portal/student/progress/", label: "Progress" },
    { href: "/portal/student/tutor/", label: "Tutor" },
  ];
  return (
    <Shell role="student" nav={nav}>
      {children}
    </Shell>
  );
}
