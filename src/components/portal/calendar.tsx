"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAY, fmtTime } from "@/lib/portal/format";

export type CalEvent = {
  id: string;
  start: string; // ISO
  /** classes: length in minutes. Deadlines are a moment and leave this out. */
  durationMin?: number;
  title: string;
  sub?: string;
  kind: "class" | "due";
  /** class in progress: stays highlighted until it finishes */
  live?: boolean;
  onClick?: () => void;
};

type View = "day" | "week" | "month";

/** Teaching hours shown on the grid: 9 AM to midnight (stretches earlier only if something starts before 9). */
const DAY_FROM = 9;
const DAY_TO = 24;
/** Hour height limits; in between, the grid is sized to fit the screen. */
const MIN_HOUR_PX = 26;
const MAX_HOUR_PX = 56;
/** Deadlines take this much room on the grid so they stay readable. */
const DUE_MIN = 30;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** Monday 00:00 of the week containing `d`. */
function weekStartOf(d: Date) {
  const x = startOfDay(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate() - ((x.getDay() + 6) % 7));
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const minutesIntoDay = (d: Date) => d.getHours() * 60 + d.getMinutes();
const lengthOf = (e: CalEvent) => (e.kind === "class" ? Math.max(e.durationMin ?? 60, 5) : DUE_MIN);
const endIso = (e: CalEvent) => new Date(new Date(e.start).getTime() + (e.durationMin ?? 60) * 60_000).toISOString();
const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: "numeric" });
const shortTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], d.getMinutes() ? { hour: "numeric", minute: "2-digit" } : { hour: "numeric" });
};

const timeText = (e: CalEvent) =>
  e.kind === "due" ? `Due ${fmtTime(e.start)}` : `${e.live ? "Live now · " : ""}${fmtTime(e.start)} – ${fmtTime(endIso(e))}`;

const eventsOn = (events: CalEvent[], d: Date) =>
  events.filter((e) => sameDay(new Date(e.start), d)).sort((a, b) => +new Date(a.start) - +new Date(b.start));

type Placed = { e: CalEvent; top: number; height: number; col: number; cols: number };

/** Side-by-side columns for things that overlap, like Google Calendar. */
function layoutDay(events: CalEvent[], fromMin: number, hourPx: number): Placed[] {
  const items = events
    .map((e) => {
      const s = Math.max(minutesIntoDay(new Date(e.start)), fromMin);
      return { e, s, end: Math.min(Math.max(s + lengthOf(e), s + 15), 24 * 60) };
    })
    .sort((a, b) => a.s - b.s || b.end - a.end);

  const out: Placed[] = [];
  let cluster: { item: (typeof items)[number]; col: number }[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    for (const { item, col } of cluster)
      out.push({
        e: item.e,
        top: ((item.s - fromMin) / 60) * hourPx,
        height: Math.max(((item.end - item.s) / 60) * hourPx - 2, 16),
        col,
        cols: colEnds.length,
      });
    cluster = [];
    colEnds = [];
  };
  for (const item of items) {
    if (item.s >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    let col = colEnds.findIndex((end) => end <= item.s);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(item.end);
    } else colEnds[col] = item.end;
    cluster.push({ item, col });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();
  return out;
}

/** Google-Calendar-style calendar: day, week and month views. */
export function WeekCalendar({ events }: { events: CalEvent[] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const today = new Date(now);

  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setView("day");
  }, []);

  const step = (dir: 1 | -1) =>
    setAnchor((a) =>
      view === "day" ? addDays(a, dir) : view === "week" ? addDays(a, 7 * dir) : new Date(a.getFullYear(), a.getMonth() + dir, 1)
    );
  const openDay = (d: Date) => {
    setAnchor(startOfDay(d));
    setView("day");
  };

  const weekDays = useMemo(() => {
    const s = weekStartOf(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [anchor]);

  const title =
    view === "day"
      ? anchor.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : view === "month" || weekDays[0].getMonth() === weekDays[6].getMonth()
        ? (view === "month" ? anchor : weekDays[0]).toLocaleDateString([], { month: "long", year: "numeric" })
        : `${weekDays[0].toLocaleDateString([], { month: "short" })} – ${weekDays[6].toLocaleDateString([], { month: "short", year: "numeric" })}`;

  const navBtn =
    "grid h-9 w-9 place-items-center rounded-full text-navy transition-colors hover:bg-navy/[0.06] focus-gold";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-3">
        <button
          type="button"
          className="h-9 rounded-full border border-navy/15 px-4 text-sm font-semibold text-navy transition-colors hover:bg-navy/[0.04] focus-gold"
          onClick={() => setAnchor(startOfDay(new Date()))}
        >
          Today
        </button>
        <div className="flex items-center">
          <button type="button" aria-label="Previous" className={navBtn} onClick={() => step(-1)}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Next" className={navBtn} onClick={() => step(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
        <p className="text-lg font-semibold tracking-tight text-navy">{title}</p>
        <div className="ml-auto flex rounded-full border border-navy/15 p-0.5" role="tablist" aria-label="Calendar view">
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                "h-8 rounded-full px-3.5 text-[13px] font-semibold capitalize transition-colors focus-gold",
                view === v ? "bg-navy text-white" : "text-navy hover:bg-navy/[0.05]"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <MonthGrid anchor={anchor} events={events} today={today} onPickDay={openDay} />
      ) : (
        <TimeGrid days={view === "day" ? [anchor] : weekDays} events={events} today={today} onPickDay={openDay} />
      )}
    </div>
  );
}

function DayHeading({ d, today, onClick, big }: { d: Date; today: Date; onClick: () => void; big?: boolean }) {
  const isToday = sameDay(d, today);
  return (
    <button type="button" onClick={onClick} className="group flex w-full flex-col items-center gap-0.5 py-1.5 focus-gold">
      <span className={cn("text-[11px] font-semibold uppercase tracking-[0.1em]", "text-navy")}>
        {d.toLocaleDateString([], { weekday: "short" })}
      </span>
      <span
        className={cn(
          "grid place-items-center rounded-full font-semibold tabular-nums transition-colors",
          big ? "h-10 w-10 text-[20px]" : "h-8 w-8 text-[17px]",
          isToday ? "bg-navy text-white" : "text-navy group-hover:bg-navy/[0.06]"
        )}
      >
        {d.getDate()}
      </span>
    </button>
  );
}

function TimeGrid({
  days,
  events,
  today,
  onPickDay,
}: {
  days: Date[];
  events: CalEvent[];
  today: Date;
  onPickDay: (d: Date) => void;
}) {
  const body = useRef<HTMLDivElement>(null);
  const byDay = days.map((d) => eventsOn(events, d));
  const starts = byDay.flat().map((e) => Math.floor(minutesIntoDay(new Date(e.start)) / 60));
  const fromH = Math.min(DAY_FROM, ...starts);
  const hours = DAY_TO - fromH;
  const fromMin = fromH * 60;

  // size the hours so 9 AM – midnight fits on screen without scrolling
  const [hourPx, setHourPx] = useState(36);
  useEffect(() => {
    const fit = () => {
      const el = body.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const room = window.innerHeight - top - 24;
      setHourPx(Math.min(MAX_HOUR_PX, Math.max(MIN_HOUR_PX, room / hours)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [hours]);

  const cols = `3.5rem repeat(${days.length}, minmax(0, 1fr))`;
  const nowMin = minutesIntoDay(today);
  const nowTop = nowMin >= fromMin ? ((nowMin - fromMin) / 60) * hourPx : null;
  const single = days.length === 1;

  return (
    <div className="overflow-hidden rounded-xl border border-navy/12 bg-white">
      <div>
        <div className="grid border-b border-navy/12 bg-white" style={{ gridTemplateColumns: cols }}>
          <div />
          {days.map((d, i) => (
            <div key={i} className={cn(!single && "border-l border-navy/12", single && "flex justify-start pl-2")}>
              <div className={cn(single && "w-16")}>
                <DayHeading d={d} today={today} onClick={() => onPickDay(d)} big={single} />
              </div>
            </div>
          ))}
        </div>

        <div ref={body} className="grid" style={{ gridTemplateColumns: cols }}>
          <div className="relative" style={{ height: hours * hourPx }}>
            {Array.from({ length: hours }, (_, i) => fromH + i).map((h, i) => (
              <span
                key={h}
                className={cn("absolute right-2 text-[11px] font-medium tabular-nums leading-none text-navy", i === 0 ? "top-0.5" : "-translate-y-1/2")}
                style={i === 0 ? undefined : { top: i * hourPx }}
              >
                {hourLabel(h)}
              </span>
            ))}
          </div>

          {days.map((d, i) => {
            const isToday = sameDay(d, today);
            return (
              <div
                key={i}
                className="relative border-l border-navy/12"
                style={{
                  height: hours * hourPx,
                  backgroundImage: "linear-gradient(to bottom, rgba(26,39,68,0.09) 1px, transparent 1px)",
                  backgroundSize: `100% ${hourPx}px`,
                }}
              >
                {layoutDay(byDay[i], fromMin, hourPx).map(({ e, top, height, col, cols: n }) => {
                  const compact = height < 38;
                  const cls = e.kind === "class";
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={e.onClick}
                      disabled={!e.onClick}
                      title={`${e.title} · ${timeText(e)}${e.sub ? ` · ${e.sub}` : ""}`}
                      className={cn(
                        "absolute overflow-hidden rounded-md border-l-[3px] border-gold px-2 text-left shadow-[0_1px_2px_rgba(14,26,51,0.12)] transition-[filter] hover:brightness-110 focus-gold",
                        compact ? "py-0.5" : "py-1",
                        cls ? "bg-navy-deep" : "bg-[#F6F0DD]",
                        n > 1 && "outline outline-1 outline-white",
                        e.live && "ring-2 ring-gold ring-offset-1",
                        !e.onClick && "cursor-default"
                      )}
                      style={{
                        top,
                        height,
                        // overlaps cascade like Google Calendar: wider blocks, later ones on top
                        left: `calc(${(col / n) * 100}% + 2px)`,
                        width: `calc(${(n === 1 || col === n - 1 ? 100 / n : Math.min(1.7 / n, 1 - col / n) * 100)}% - ${single ? 12 : 4}px)`,
                        zIndex: 1 + col,
                      }}
                    >
                      {compact ? (
                        <span className={cn("block truncate text-[12px] font-semibold leading-tight", cls ? "text-white" : "text-navy")}>
                          {e.title}
                          <span className={cn("font-medium", cls ? "text-gold" : "text-navy")}>
                            , {e.kind === "due" ? "due " : ""}
                            {shortTime(e.start)}
                          </span>
                        </span>
                      ) : (
                        <>
                          <span className={cn("block truncate text-[13px] font-semibold leading-snug", cls ? "text-white" : "text-navy")}>
                            {e.title}
                          </span>
                          <span className={cn("block truncate text-[11.5px] font-medium tabular-nums leading-snug", cls ? "text-gold" : "text-navy")}>
                            {timeText(e)}
                          </span>
                          {e.sub && height >= 60 && (
                            <span className={cn("block truncate text-[11.5px] leading-snug", cls ? "text-white/85" : "text-navy")}>{e.sub}</span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}

                {isToday && nowTop !== null && (
                  <div className="pointer-events-none absolute inset-x-0 z-0" style={{ top: nowTop }}>
                    <div className="relative h-[2px] bg-gold">
                      <span className="absolute -left-[6px] -top-[5px] h-3 w-3 rounded-full bg-gold" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({
  anchor,
  events,
  today,
  onPickDay,
}: {
  anchor: Date;
  events: CalEvent[];
  today: Date;
  onPickDay: (d: Date) => void;
}) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = weekStartOf(firstOfMonth);
  const lastOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const weeks = Math.ceil((Math.round((+lastOfMonth - +start) / DAY) + 1) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const MAX = 3;

  return (
    <div className="overflow-hidden rounded-xl border border-navy/12 bg-white">
      <div className="grid grid-cols-7 border-b border-navy/12">
        {cells.slice(0, 7).map((d, i) => (
          <div key={i} className={cn("py-2 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-navy", i > 0 && "border-l border-navy/12")}>
            {d.toLocaleDateString([], { weekday: "short" })}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const list = eventsOn(events, d);
          const inMonth = d.getMonth() === anchor.getMonth();
          const isToday = sameDay(d, today);
          return (
            <div
              key={i}
              className={cn(
                "min-h-[5.5rem] border-navy/12 p-0.5 md:min-h-[6.5rem] md:p-1",
                i % 7 > 0 && "border-l",
                i >= 7 && "border-t",
                !inMonth && "bg-navy/[0.03]"
              )}
            >
              <div className="mb-0.5 flex justify-center">
                <button
                  type="button"
                  onClick={() => onPickDay(d)}
                  className={cn(
                    "grid h-7 min-w-7 place-items-center rounded-full px-1 text-[12.5px] font-semibold tabular-nums transition-colors focus-gold",
                    isToday ? "bg-navy text-white" : "text-navy hover:bg-navy/[0.06]"
                  )}
                >
                  {d.getDate() === 1 ? d.toLocaleDateString([], { day: "numeric", month: "short" }) : d.getDate()}
                </button>
              </div>
              <ul className="space-y-0.5">
                {list.slice(0, MAX).map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={e.onClick}
                      disabled={!e.onClick}
                      title={`${e.title} · ${timeText(e)}`}
                      className={cn(
                        "flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-[10.5px] transition-colors focus-gold md:px-1.5 md:text-[12px]",
                        "md:bg-transparent md:text-navy md:hover:bg-navy/[0.06]",
                        e.kind === "class" ? "bg-navy-deep text-white" : "bg-gold/30 text-navy"
                      )}
                    >
                      <span className={cn("hidden h-2 w-2 shrink-0 rounded-full md:block", e.kind === "class" ? "bg-navy-deep" : "bg-gold")} />
                      <span className="hidden shrink-0 tabular-nums md:inline">{shortTime(e.start)}</span>
                      <span className="truncate font-semibold">{e.title}</span>
                    </button>
                  </li>
                ))}
                {list.length > MAX && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onPickDay(d)}
                      className="rounded px-1.5 py-0.5 text-[12px] font-semibold text-navy hover:bg-navy/[0.06] focus-gold"
                    >
                      {list.length - MAX} more
                    </button>
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
