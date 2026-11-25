"use client";

import { Users } from "lucide-react";
import { cohortOf, courseOf } from "@/lib/portal/selectors";
import type { DB } from "@/lib/portal/types";
import { Avatar } from "./ui";

/** Who a row is about, at a glance: initials, name in bold, their course underneath. */
export function StudentCell({ db, cohortId, name }: { db: DB; cohortId: string; name?: string }) {
  const c = cohortOf(db, cohortId);
  const who = name ?? c.name;
  return (
    <span className="flex items-center gap-3">
      {c.isGroup && !name ? (
        <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-navy-deep">
          <Users size={15} />
        </span>
      ) : (
        <Avatar name={who} size="sm" />
      )}
      <span className="min-w-0">
        <span className="block truncate text-[14.5px] font-semibold text-navy">{who}</span>
        <span className="block truncate text-[12px] text-navy">
          {c.isGroup
            ? name
              ? `${c.name}`
              : `Group of ${db.students.filter((s) => s.cohortId === c.id).length} · ${courseOf(c)}`
            : courseOf(c)}
        </span>
      </span>
    </span>
  );
}
