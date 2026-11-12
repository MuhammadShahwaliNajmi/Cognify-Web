"use client";

import { Shell, type NavItem } from "@/components/portal/shell";
import { usePortal } from "@/lib/portal/store";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { db } = usePortal();
  const toMark = db.submissions.filter((x) => x.status === "submitted").length;

  const nav: NavItem[] = [
    { href: "/portal/teacher/", label: "Today" },
    { href: "/portal/teacher/classes/", label: "Classes" },
    { href: "/portal/teacher/marking/", label: "Marking", badge: toMark },
    { href: "/portal/teacher/assignments/", label: "Work" },
    { href: "/portal/teacher/vault/", label: "Vault" },
    { href: "/portal/teacher/students/", label: "Students" },
    { href: "/portal/teacher/notices/", label: "Notices" },
  ];
  return (
    <Shell role="teacher" nav={nav}>
      {children}
    </Shell>
  );
}
