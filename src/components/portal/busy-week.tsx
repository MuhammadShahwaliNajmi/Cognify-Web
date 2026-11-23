"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, ClipboardCheck } from "lucide-react";
import { projectSeries } from "@/lib/portal/series";
import { workHref } from "@/lib/portal/selectors";
import { fmtTime } from "@/lib/portal/format";
import type { Assignment, DB } from "@/lib/portal/types";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;
const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const dayOf = (iso: string) => key(new Date(iso));

/** The next 7 days as a workload graph (gold = deadlines, navy = classes); click a day to see it. */
export function BusyWeek({ db, cohortId, deadlines, now }: { db: DB; cohortId: string; deadlines: Assignment[]; now: number }) {
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY));
  const to = now + 7 * DAY;
  const classes = [...db.sessions.filter((s) => s.cohortId === cohortId), ...projectSeries(db, new Date(now), new Date(to)).filter((s) => s.cohortId === cohortId)]
    .filter((s) => new Date(s.start).getTime() + s.durationMin * 60_000 > now && new Date(s.start).getTime() < to)
    .sort((a, b) => a.start.localeCompare(b.start));
  const due = deadlines.filter((a) => new Date(a.dueAt).getTime() < to);
  const [day, setDay] = useState(key(days[0]));
  const load = days.map((d) => ({ d, k: key(d), c: classes.filter((s) => dayOf(s.start) === key(d)).length, w: due.filter((a) => dayOf(a.dueAt) === key(d)).length }));
  const max = Math.max(3, ...load.map((x) => x.c + x.w));
  const dayClasses = classes.filter((s) => dayOf(s.start) === day);
  const dayDue = due.filter((a) => dayOf(a.dueAt) === day);

  return (
    <div className="rounded-2xl border border-navy/12 p-4">
      <div className="grid grid-cols-7 gap-1.5">
        {load.map(({ d, k, c, w }, i) => {
          const on = k === day;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setDay(k)}
              aria-label={`${d.toDateString()}: ${c} classes, ${w} deadlines`}
              className={cn("flex flex-col items-center gap-2 rounded-xl py-2.5 transition-colors focus-gold", on ? "bg-navy-deep" : "hover:bg-navy/[0.04]")}
            >
              <span className={cn("flex h-16 w-3.5 flex-col justify-end overflow-hidden rounded-full", on ? "bg-white/15" : "bg-navy/[0.06]")}>
                <span className="bg-gold" style={{ height: `${(w / max) * 100}%` }} />
                <span className={on ? "bg-white" : "bg-navy"} style={{ height: `${(c / max) * 100}%` }} />
              </span>
              <span className={cn("text-[12px] font-bold", on ? "text-gold" : "text-navy")}>{i === 0 ? "Today" : d.toLocaleDateString([], { weekday: "short" })}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 space-y-2">
        {dayDue.map((a) => (
          <Link key={a.id} href={workHref(a)} className="flex items-center gap-3 rounded-xl bg-gold/15 px-3.5 py-2.5 text-[14px] text-navy hover:bg-gold/25">
            <ClipboardCheck size={16} className="shrink-0" />
            <span className="flex-1 truncate font-semibold">{a.title}</span>
            <span className="text-[13px]">due {fmtTime(a.dueAt)}</span>
          </Link>
        ))}
        {dayClasses.map((s) => (
          <Link key={s.id} href="/portal/student/calendar/" className="flex items-center gap-3 rounded-xl bg-navy/[0.04] px-3.5 py-2.5 text-[14px] text-navy hover:bg-navy/[0.07]">
            <CalendarClock size={16} className="shrink-0" />
            <span className="flex-1 truncate font-semibold">{s.title}</span>
            <span className="text-[13px]">{fmtTime(s.start)}</span>
          </Link>
        ))}
        {!dayDue.length && !dayClasses.length && <p className="px-1 text-[13px] font-medium text-navy">Nothing on this day.</p>}
      </div>
    </div>
  );
}
