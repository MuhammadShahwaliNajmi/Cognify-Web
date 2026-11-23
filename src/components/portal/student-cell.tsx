"use client";

import { cohortOf, courseOf } from "@/lib/portal/selectors";
import type { DB } from "@/lib/portal/types";
import { Avatar } from "./ui";

/** Who a row is about, at a glance: initials, name in bold, their course underneath. */
export function StudentCell({ db, cohortId, name }: { db: DB; cohortId: string; name?: string }) {
  const c = cohortOf(db, cohortId);
  const who = name ?? c.name;
  return (
    <span className="flex items-center gap-3">
      <Avatar name={who} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-[14.5px] font-semibold text-navy">{who}</span>
        <span className="block truncate text-[12px] text-navy">{courseOf(c)}</span>
      </span>
    </span>
  );
}
