"use client";

import { Megaphone } from "lucide-react";
import { useStudent } from "@/lib/portal/store";
import { fmtDate, fmtRelative, fmtTime } from "@/lib/portal/format";
import { Empty, PageHeader, Status } from "@/components/portal/ui";

export default function StudentAnnouncements() {
  const { db, me, now } = useStudent();
  const list = db.announcements.filter((a) => !a.cohortId || a.cohortId === me.cohortId);

  return (
    <>
      <PageHeader title="Announcements" />
      {list.length === 0 ? (
        <Empty icon={<Megaphone size={20} />} title="No announcements yet" text="When your teacher posts an update, it appears here." />
      ) : (
        <ul className="space-y-3">
          {list.map((n) => (
            <li key={n.id} className="rounded-xl border-l-[3px] border-gold bg-navy/[0.03] p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-[15px] font-semibold text-navy">{n.title}</h2>
                {now - new Date(n.at).getTime() < 3 * 86_400_000 && <Status tone="attention">New</Status>}
                <span className="ml-auto text-[13px] font-semibold text-navy" title={`${fmtDate(n.at)}, ${fmtTime(n.at)}`}>
                  {fmtRelative(n.at, now)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-navy">{n.body}</p>
              
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
