"use client";

import { ClipboardList, FolderOpen, LayoutDashboard, PenLine, Users, Video } from "lucide-react";
import { Shell, type NavItem } from "@/components/portal/shell";
import { usePortal } from "@/lib/portal/store";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { db } = usePortal();
  const toMark = db.submissions.filter((x) => x.status === "submitted").length;

  const nav: NavItem[] = [
    { href: "/portal/teacher/", label: "Overview", short: "Home", icon: LayoutDashboard },
    { href: "/portal/teacher/classes/", label: "Classes", short: "Classes", icon: Video },
    { href: "/portal/teacher/marking/", label: "Marking", short: "Marking", icon: PenLine, badge: toMark },
    { href: "/portal/teacher/assignments/", label: "Assignments", short: "Work", icon: ClipboardList },
    { href: "/portal/teacher/vault/", label: "The Vault", short: "Vault", icon: FolderOpen },
    { href: "/portal/teacher/students/", label: "Students", short: "Students", icon: Users },
  ];
  return (
    <Shell role="teacher" nav={nav}>
      {children}
    </Shell>
  );
}
