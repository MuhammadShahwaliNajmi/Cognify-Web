"use client";

import { Shell, type NavItem } from "@/components/portal/shell";
import { usePortal } from "@/lib/portal/store";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { db } = usePortal();
  const toMark = db.submissions.filter((x) => x.status === "submitted").length;

  const nav: NavItem[] = [
    { href: "/portal/teacher/", label: "Dashboard" },
    { href: "/portal/teacher/calendar/", label: "Calendar" },
    { href: "/portal/teacher/classes/", label: "Classes" },
    { href: "/portal/teacher/assignments/", label: "Assignments" },
    { href: "/portal/teacher/submissions/", label: "Submissions", badge: toMark },
    { href: "/portal/teacher/students/", label: "Students" },
    { href: "/portal/teacher/resources/", label: "Resources" },
    { href: "/portal/teacher/announcements/", label: "Announcements" },
  ];
  return (
    <Shell role="teacher" nav={nav}>
      {children}
    </Shell>
  );
}
