"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtTime } from "@/lib/portal/format";

export type CalEvent = {
  id: string;
  start: string; // ISO
  title: string;
  sub?: string;
  kind: "class" | "due";
  onClick?: () => void;
};

const DAY = 86_400_000;

/** Monday 00:00 of the week containing `d`. */
function weekStartOf(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (x.getDay() + 6) % 7; // Monday = 0
  return new Date(x.getTime() - offset * DAY);
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** LMS-style week view: Monday → Sunday, classes (navy) and deadlines (gold). */
export function WeekCalendar({ events }: { events: CalEvent[] }) {
  const today = new Date();
  const [start, setStart] = useState(() => weekStartOf(today));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY)), [start]);
  const end = days[6];

  const byDay = days.map((d) =>
    events
      .filter((e) => sameDay(new Date(e.start), d))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  );

  const range =
    start.getMonth() === end.getMonth()
      ? `${start.getDate()} – ${end.getDate()} ${end.toLocaleDateString([], { month: "long", year: "numeric" })}`
      : `${start.toLocaleDateString([], { day: "numeric", month: "short" })} – ${end.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}`;

  const navBtn =
    "grid h-9 w-9 place-items-center rounded-lg border border-navy/12 text-navy/70 transition-colors hover:border-navy/30 hover:text-navy focus-gold";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous week" className={navBtn} onClick={() => setStart(new Date(start.getTime() - 7 * DAY))}>
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="h-9 rounded-lg border border-navy/12 px-3.5 text-sm font-medium text-navy transition-colors hover:border-navy/30 focus-gold"
            onClick={() => setStart(weekStartOf(new Date()))}
          >
            This week
          </button>
          <button type="button" aria-label="Next week" className={navBtn} onClick={() => setStart(new Date(start.getTime() + 7 * DAY))}>
            <ChevronRight size={16} />
          </button>
        </div>
        <p className="text-[15px] font-semibold text-navy">{range}</p>
        <div className="flex items-center gap-4 text-[13px] text-navy/55">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-navy" /> Class
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-gold" /> Deadline
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-navy/12 md:grid-cols-7">
        {days.map((d, i) => {
          const isToday = sameDay(d, today);
          return (
            <div key={i} className={cn("min-h-[3.5rem] border-navy/12 md:min-h-[14rem]", i > 0 && "border-t md:border-l md:border-t-0")}>
              <div className={cn("flex items-center gap-2 border-b border-navy/10 px-3 py-2", isToday ? "bg-gold/15" : "bg-navy/[0.03]")}>
                <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-navy/55">
                  {d.toLocaleDateString([], { weekday: "short" })}
                </span>
                <span
                  className={cn(
                    "grid h-6 min-w-6 place-items-center rounded-full px-1 text-[13px] font-semibold tabular-nums",
                    isToday ? "bg-navy text-white" : "text-navy"
                  )}
                >
                  {d.getDate()}
                </span>
              </div>
              <ul className="space-y-1.5 p-2">
                {byDay[i].length === 0 && <li className="px-1 py-1 text-[12px] text-navy/30 md:hidden">Nothing</li>}
                {byDay[i].map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={e.onClick}
                      disabled={!e.onClick}
                      className={cn(
                        "block w-full rounded-md border-l-[3px] px-2 py-1.5 text-left transition-colors focus-gold",
                        e.kind === "class" ? "border-navy bg-navy/[0.05] hover:bg-navy/[0.09]" : "border-gold bg-gold/15 hover:bg-gold/25",
                        !e.onClick && "cursor-default"
                      )}
                    >
                      <span className="block text-[11px] font-semibold tabular-nums text-navy/60">
                        {e.kind === "due" ? `Due ${fmtTime(e.start)}` : fmtTime(e.start)}
                      </span>
                      <span className="block truncate text-[13px] font-medium leading-snug text-navy">{e.title}</span>
                      {e.sub && <span className="block truncate text-[11px] text-navy/50">{e.sub}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
