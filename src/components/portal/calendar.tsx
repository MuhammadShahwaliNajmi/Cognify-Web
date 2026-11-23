"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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
  /** set to let the teacher drag the class to a new time (or stretch its end) */
  onMove?: (startIso: string, durationMin: number) => void;
};

type View = "day" | "week" | "month" | "schedule";

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

const VIEWS: { v: View; label: string; key: string }[] = [
  { v: "day", label: "Day", key: "d" },
  { v: "week", label: "Week", key: "w" },
  { v: "month", label: "Month", key: "m" },
  { v: "schedule", label: "Schedule", key: "a" },
];
const SCHEDULE_DAYS = 42;

/** Google-Calendar-style calendar: day, week, month and schedule views.
 *  `extra` adds events for a date range (repeating classes far ahead);
 *  `onCreateAt` lets a teacher click an empty time to add a class there. */
export function WeekCalendar({
  events,
  extra,
  onCreateAt,
}: {
  events: CalEvent[];
  extra?: (from: Date, to: Date) => CalEvent[];
  onCreateAt?: (at: Date) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const today = new Date(now);

  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const datePicker = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setView("day");
  }, []);

  const step = (dir: 1 | -1) =>
    setAnchor((a) =>
      view === "day"
        ? addDays(a, dir)
        : view === "week"
          ? addDays(a, 7 * dir)
          : view === "schedule"
            ? addDays(a, SCHEDULE_DAYS * dir)
            : new Date(a.getFullYear(), a.getMonth() + dir, 1)
    );
  const openDay = (d: Date) => {
    setAnchor(startOfDay(d));
    setView("day");
  };

  const weekDays = useMemo(() => {
    const s = weekStartOf(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [anchor]);

  // the dates on screen, so repeating classes far ahead can be drawn for them
  const [from, to] = useMemo((): [Date, Date] => {
    if (view === "day") return [anchor, addDays(anchor, 1)];
    if (view === "week") return [weekDays[0], addDays(weekDays[0], 7)];
    if (view === "schedule") return [anchor, addDays(anchor, SCHEDULE_DAYS)];
    const start = weekStartOf(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    return [start, addDays(start, 42)];
  }, [view, anchor, weekDays]);
  const all = useMemo(() => (extra ? [...events, ...extra(from, to)] : events), [events, extra, from, to]);

  // keyboard shortcuts, as in Google Calendar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.querySelector('[role="dialog"]')) return;
      const k = e.key.toLowerCase();
      const v = VIEWS.find((x) => x.key === k);
      if (v) setView(v.v);
      else if (k === "t") setAnchor(startOfDay(new Date()));
      else if (k === "j" || k === "n") step(1);
      else if (k === "k" || k === "p") step(-1);
      else if (k === "c" && onCreateAt) {
        const at = new Date(anchor);
        at.setHours(Math.min(Math.max(new Date().getHours() + 1, DAY_FROM), 23), 0, 0, 0);
        onCreateAt(at);
      } else if (k === "g") datePicker.current?.showPicker?.();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const title =
    view === "day"
      ? anchor.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : view === "schedule"
        ? `${from.toLocaleDateString([], { day: "numeric", month: "short" })} – ${addDays(to, -1).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}`
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
          title="Today (T)"
          className="h-9 rounded-full border border-navy/15 px-4 text-sm font-semibold text-navy transition-colors hover:bg-navy/[0.04] focus-gold"
          onClick={() => setAnchor(startOfDay(new Date()))}
        >
          Today
        </button>
        <div className="flex items-center">
          <button type="button" aria-label="Previous" title="Previous (K)" className={navBtn} onClick={() => step(-1)}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Next" title="Next (J)" className={navBtn} onClick={() => step(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
        {/* the title opens a date picker to jump anywhere (G) */}
        <label className="relative flex cursor-pointer items-center gap-1 rounded-lg px-1.5 py-1 transition-colors hover:bg-navy/[0.05]" title="Go to date (G)">
          <span className="text-lg font-semibold tracking-tight text-navy">{title}</span>
          <ChevronDown size={16} className="text-navy" />
          <input
            ref={datePicker}
            type="date"
            aria-label="Go to date"
            value={`${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}-${String(anchor.getDate()).padStart(2, "0")}`}
            onChange={(e) => e.target.value && setAnchor(startOfDay(new Date(`${e.target.value}T12:00`)))}
            onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <div className="ml-auto flex rounded-full border border-navy/15 p-0.5" role="tablist" aria-label="Calendar view">
          {VIEWS.map(({ v, label, key }) => (
            <button
              key={v}
              type="button"
              role="tab"
              title={`${label} (${key.toUpperCase()})`}
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                "h-8 rounded-full px-3 text-[13px] font-semibold transition-colors focus-gold",
                view === v ? "bg-navy text-white" : "text-navy hover:bg-navy/[0.05]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <MonthGrid anchor={anchor} events={all} today={today} onPickDay={openDay} onCreateAt={onCreateAt} />
      ) : view === "schedule" ? (
        <ScheduleList from={from} days={SCHEDULE_DAYS} events={all} today={today} onPickDay={openDay} />
      ) : (
        <TimeGrid days={view === "day" ? [anchor] : weekDays} events={all} today={today} onPickDay={openDay} onCreateAt={onCreateAt} />
      )}
    </div>
  );
}

function DayHeading({ d, today, onClick, big }: { d: Date; today: Date; onClick: () => void; big?: boolean }) {
  const isToday = sameDay(d, today);
  return (
    <button type="button" onClick={onClick} className="group flex w-full flex-col items-center gap-0.5 py-1.5 focus-gold">
      <span className={cn("text-[12px] font-semibold", "text-navy")}>
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

type Drag = {
  ev: CalEvent;
  mode: "move" | "resize";
  x0: number;
  y0: number;
  start0: number; // minutes into the day
  dur0: number;
  day: number; // column index
  start: number;
  dur: number;
  moved: boolean;
};

function TimeGrid({
  days,
  events,
  today,
  onPickDay,
  onCreateAt,
}: {
  days: Date[];
  events: CalEvent[];
  today: Date;
  onPickDay: (d: Date) => void;
  onCreateAt?: (at: Date) => void;
}) {
  const body = useRef<HTMLDivElement>(null);
  const cols = useRef<(HTMLDivElement | null)[]>([]);

  // dragging a class to a new time, or its bottom edge to a new end (mouse / pen)
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const justDragged = useRef(false);
  const atMin = (dayIdx: number, min: number) => {
    const d = days[dayIdx];
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, min);
  };

  const shown = drag?.moved
    ? events.map((e) =>
        e.id === drag.ev.id ? { ...e, start: atMin(drag.day, drag.start).toISOString(), durationMin: drag.dur } : e
      )
    : events;
  const byDay = days.map((d) => eventsOn(shown, d));
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

  useEffect(() => {
    if (!drag) return;
    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dy = ev.clientY - d.y0;
      const moved = d.moved || Math.abs(dy) > 4 || Math.abs(ev.clientX - d.x0) > 4;
      const dm = Math.round(((dy / hourPx) * 60) / 15) * 15;
      let next: Drag;
      if (d.mode === "resize") {
        next = { ...d, moved, dur: Math.min(Math.max(d.dur0 + dm, 15), 24 * 60 - d.start0) };
      } else {
        let day = d.day;
        cols.current.forEach((c, i) => {
          const r = c?.getBoundingClientRect();
          if (r && ev.clientX >= r.left && ev.clientX < r.right) day = i;
        });
        next = { ...d, moved, day, start: Math.min(Math.max(d.start0 + dm, fromMin), 24 * 60 - d.dur0) };
      }
      dragRef.current = next;
      setDrag(next);
    };
    const up = () => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d?.moved) return;
      justDragged.current = true;
      setTimeout(() => (justDragged.current = false), 0);
      const startIso = atMin(d.day, d.start).toISOString();
      if (startIso !== new Date(d.ev.start).toISOString() || d.dur !== d.dur0) d.ev.onMove?.(startIso, d.dur);
    };
    const esc = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      dragRef.current = null;
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", esc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!drag, hourPx, fromMin]);

  const startDrag = (ev: React.PointerEvent, e: CalEvent, dayIdx: number, mode: Drag["mode"]) => {
    if (!e.onMove || ev.pointerType === "touch" || ev.button !== 0) return;
    ev.preventDefault();
    const start0 = minutesIntoDay(new Date(e.start));
    const d: Drag = { ev: e, mode, x0: ev.clientX, y0: ev.clientY, start0, dur0: lengthOf(e), day: dayIdx, start: start0, dur: lengthOf(e), moved: false };
    dragRef.current = d;
    setDrag(d);
  };

  const gridCols = `3.5rem repeat(${days.length}, minmax(0, 1fr))`;
  const nowMin = minutesIntoDay(today);
  const nowTop = nowMin >= fromMin ? ((nowMin - fromMin) / 60) * hourPx : null;
  const single = days.length === 1;

  return (
    <div className={cn("overflow-hidden rounded-xl border border-navy/12 bg-white", drag?.moved && "select-none")}>
      <div>
        <div className="grid border-b border-navy/12 bg-white" style={{ gridTemplateColumns: gridCols }}>
          <div />
          {days.map((d, i) => (
            <div key={i} className={cn(!single && "border-l border-navy/12", single && "flex justify-start pl-2")}>
              <div className={cn(single && "w-16")}>
                <DayHeading d={d} today={today} onClick={() => onPickDay(d)} big={single} />
              </div>
            </div>
          ))}
        </div>

        <div ref={body} className="grid" style={{ gridTemplateColumns: gridCols }}>
          <div className="relative" style={{ height: hours * hourPx }}>
            {Array.from({ length: hours }, (_, i) => fromH + i).map((h, i) => (
              <span
                key={h}
                className={cn("absolute right-2 text-[12px] font-medium tabular-nums leading-none text-navy", i === 0 ? "top-0.5" : "-translate-y-1/2")}
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
                ref={(el) => {
                  cols.current[i] = el;
                }}
                className={cn("relative border-l border-navy/12", onCreateAt && "cursor-pointer")}
                style={{
                  height: hours * hourPx,
                  backgroundImage: "linear-gradient(to bottom, rgba(26,39,68,0.09) 1px, transparent 1px)",
                  backgroundSize: `100% ${hourPx}px`,
                }}
                onClick={(ev) => {
                  // click an empty time to add a class there (on the half hour)
                  if (!onCreateAt || ev.target !== ev.currentTarget) return;
                  const y = ev.clientY - ev.currentTarget.getBoundingClientRect().top;
                  const min = Math.min(fromMin + Math.floor(((y / hourPx) * 60) / 30) * 30, 23 * 60);
                  onCreateAt(atMin(i, min));
                }}
              >
                {layoutDay(byDay[i], fromMin, hourPx).map(({ e, top, height, col, cols: n }) => {
                  const compact = height < 38;
                  const cls = e.kind === "class";
                  const dragging = drag?.moved && drag.ev.id === e.id;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        if (justDragged.current) return;
                        e.onClick?.();
                      }}
                      onPointerDown={(ev) => startDrag(ev, e, i, "move")}
                      disabled={!e.onClick}
                      title={`${e.title} · ${timeText(e)}${e.sub ? ` · ${e.sub}` : ""}`}
                      className={cn(
                        "absolute overflow-hidden rounded-md border-l-[3px] border-gold px-2 text-left shadow-[0_1px_2px_rgba(14,26,51,0.12)] transition-[filter] hover:brightness-110 focus-gold",
                        compact ? "py-0.5" : "py-1",
                        cls ? "bg-navy-deep" : "bg-[#F6F0DD]",
                        n > 1 && "outline outline-1 outline-white",
                        e.live && "ring-2 ring-gold ring-offset-1",
                        !e.onClick && "cursor-default",
                        dragging && "z-40 cursor-grabbing opacity-90 shadow-[0_8px_24px_rgba(14,26,51,0.3)]"
                      )}
                      style={{
                        top,
                        height,
                        // overlaps cascade like Google Calendar: wider blocks, later ones on top
                        left: `calc(${(col / n) * 100}% + 2px)`,
                        width: `calc(${(n === 1 || col === n - 1 ? 100 / n : Math.min(1.7 / n, 1 - col / n) * 100)}% - ${single ? 12 : 4}px)`,
                        zIndex: dragging ? 40 : 1 + col,
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
                      {e.onMove && (
                        <span
                          aria-hidden
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            startDrag(ev, e, i, "resize");
                          }}
                          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
                        />
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

/** Schedule view: everything coming up, day by day. */
function ScheduleList({
  from,
  days,
  events,
  today,
  onPickDay,
}: {
  from: Date;
  days: number;
  events: CalEvent[];
  today: Date;
  onPickDay: (d: Date) => void;
}) {
  const list = Array.from({ length: days }, (_, i) => addDays(from, i))
    .map((d) => ({ d, items: eventsOn(events, d) }))
    .filter((x) => x.items.length);

  return (
    <div className="overflow-hidden rounded-xl border border-navy/12 bg-white">
      {list.length === 0 && <p className="px-5 py-10 text-center text-[15px] font-medium text-navy">Nothing scheduled</p>}
      {list.map(({ d, items }, i) => {
        const isToday = sameDay(d, today);
        return (
          <div key={d.toDateString()} className={cn("flex gap-3 px-3 py-2.5 md:gap-5 md:px-5", i > 0 && "border-t border-navy/12")}>
            <button type="button" onClick={() => onPickDay(d)} className="flex w-24 shrink-0 items-start gap-2 pt-0.5 text-left focus-gold md:w-36">
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[15px] font-semibold tabular-nums",
                  isToday ? "bg-navy text-white" : "text-navy"
                )}
              >
                {d.getDate()}
              </span>
              <span className="pt-1.5 text-[12px] font-semibold text-navy">
                {d.toLocaleDateString([], { month: "short", weekday: "short" })}
              </span>
            </button>
            <ul className="min-w-0 flex-1 space-y-0.5">
              {items.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={e.onClick}
                    disabled={!e.onClick}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-navy/[0.05] focus-gold",
                      e.live && "ring-2 ring-gold"
                    )}
                  >
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", e.kind === "class" ? "bg-navy-deep" : "bg-gold")} />
                    <span className="w-28 shrink-0 text-[13px] tabular-nums text-navy md:w-40">
                      {e.kind === "due" ? `Due ${fmtTime(e.start)}` : `${fmtTime(e.start)} – ${fmtTime(endIso(e))}`}
                    </span>
                    <span className="min-w-0 truncate text-[14px] font-semibold text-navy">
                      {e.title}
                      {e.sub && <span className="font-normal"> · {e.sub}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({
  anchor,
  events,
  today,
  onPickDay,
  onCreateAt,
}: {
  anchor: Date;
  events: CalEvent[];
  today: Date;
  onPickDay: (d: Date) => void;
  onCreateAt?: (at: Date) => void;
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
          <div key={i} className={cn("py-2 text-center text-[12px] font-semibold text-navy", i > 0 && "border-l border-navy/12")}>
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
                !inMonth && "bg-navy/[0.03]",
                onCreateAt && "cursor-pointer"
              )}
              onClick={(ev) => {
                if (!onCreateAt || (ev.target as HTMLElement).closest("button")) return;
                onCreateAt(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0));
              }}
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
                        "flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-[12px] transition-colors focus-gold md:px-1.5 md:text-[12px]",
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
