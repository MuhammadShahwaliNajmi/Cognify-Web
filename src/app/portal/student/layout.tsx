"use client";

import { ClipboardList, FolderOpen, LayoutDashboard, LineChart, Sparkles, Video } from "lucide-react";
import { Shell, type NavItem } from "@/components/portal/shell";
import { usePortal } from "@/lib/portal/store";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { db, auth } = usePortal();
  const cohortId = db.students.find((s) => s.id === auth?.userId)?.cohortId;
  const todo = db.assignments.filter(
    (a) => a.cohortId === cohortId && !db.submissions.some((x) => x.assignmentId === a.id && x.studentId === auth?.userId)
  ).length;

  const nav: NavItem[] = [
    { href: "/portal/student/", label: "Dashboard", short: "Home", icon: LayoutDashboard },
    { href: "/portal/student/classes/", label: "Live classes", short: "Classes", icon: Video },
    { href: "/portal/student/vault/", label: "The Vault", short: "Vault", icon: FolderOpen },
    { href: "/portal/student/assignments/", label: "Assignments", short: "Work", icon: ClipboardList, badge: todo },
    { href: "/portal/student/progress/", label: "Progress", short: "Progress", icon: LineChart },
    { href: "/portal/student/tutor/", label: "Lab AI Tutor", short: "Tutor", icon: Sparkles },
  ];
  return (
    <Shell role="student" nav={nav}>
      {children}
    </Shell>
  );
}
