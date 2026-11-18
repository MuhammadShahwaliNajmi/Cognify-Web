/** Repeating classes (Google-Calendar-style series): rules, wording and the classes far ahead. */
import { cohortOf } from "./selectors";
import type { DB, Session, Slot } from "./types";

export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Classes are stored this many days ahead (matches private.sync_sessions); the calendar draws the rest. */
export const STORED_DAYS = 120;

export type Rule = {
  seriesId: string;
  cohortId: string;
  title: string;
  unit: string;
  startsOn: string | null; // yyyy-mm-dd
  start: string; // HH:MM
  durationMin: number;
  weekdays: number[]; // 1 = Monday … 7 = Sunday
  everyWeeks: number;
  endsOn: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const atNoon = (day: string) => new Date(`${day}T12:00`);
const addDays = (day: string, n: number) => {
  const d = atNoon(day);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
/** 1 = Monday … 7 = Sunday */
export const isoDayOf = (day: string) => ((atNoon(day).getDay() + 6) % 7) + 1;
const mondayOf = (day: string) => addDays(day, 1 - isoDayOf(day));
const daysBetween = (a: string, b: string) => Math.round((atNoon(b).getTime() - atNoon(a).getTime()) / 86_400_000);

/** The whole series a stored class belongs to, or null for a one-off. */
export function ruleOf(db: DB, s: { timetableId?: string }): Rule | null {
  if (!s.timetableId) return null;
  const row = db.timetable.find((t) => t.id === s.timetableId);
  if (!row?.seriesId) return null;
  const rows = db.timetable.filter((t) => t.seriesId === row.seriesId);
  return {
    seriesId: row.seriesId,
    cohortId: row.cohortId,
    title: row.title ?? "",
    unit: row.unit ?? "",
    startsOn: row.startsOn ?? null,
    start: row.start,
    durationMin: row.durationMin,
    weekdays: Array.from(new Set(rows.map((t) => t.weekday))).sort(),
    everyWeeks: row.everyWeeks ?? 1,
    endsOn: row.endsOn ?? null,
  };
}

/** "Weekly on Monday", "Every 2 weeks on Mon, Wed", "Every weekday (Monday to Friday)", "Daily" (+ ", until …"). */
export function describeRule(r: { weekdays: number[]; everyWeeks: number; endsOn: string | null }) {
  const days = Array.from(new Set(r.weekdays)).sort();
  const every = r.everyWeeks > 1 ? `Every ${r.everyWeeks} weeks` : "";
  let base: string;
  if (!every && days.length === 7) base = "Daily";
  else if (!every && days.join() === "1,2,3,4,5") base = "Every weekday (Monday to Friday)";
  else if (days.length === 1) base = `${every || "Weekly"} on ${DAY_LONG[days[0] - 1]}`;
  else base = `${every || "Weekly"} on ${days.map((d) => DAY_SHORT[d - 1]).join(", ")}`;
  if (!r.endsOn) return base;
  return `${base}, until ${atNoon(r.endsOn).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}`;
}

/** Does the series meet on this day? (same rule as private.series_day_ok) */
function meetsOn(r: { weekdays: number[]; everyWeeks: number; startsOn: string | null; endsOn: string | null }, day: string) {
  if (r.startsOn && day < r.startsOn) return false;
  if (r.endsOn && day > r.endsOn) return false;
  if (!r.weekdays.includes(isoDayOf(day))) return false;
  if (r.everyWeeks <= 1 || !r.startsOn) return true;
  return (daysBetween(mondayOf(r.startsOn), mondayOf(day)) / 7) % r.everyWeeks === 0;
}

/** The day of the n-th class from `startsOn` ("ends after n classes"). */
export function lastDayAfter(r: { weekdays: number[]; everyWeeks: number; startsOn: string }, n: number) {
  let day = r.startsOn;
  let seen = 0;
  for (let i = 0; i < 3660 && r.weekdays.length; i++, day = addDays(day, 1)) {
    if (meetsOn({ ...r, endsOn: null }, day) && ++seen >= n) return day;
  }
  return day;
}

/** Classes beyond what's stored, drawn from each series' rule, for days in [from, to). */
export function projectSeries(db: DB, from: Date, to: Date): Session[] {
  const out: Session[] = [];
  const lastStored = new Map<string, string>();
  for (const s of db.sessions) {
    if (!s.timetableId) continue;
    const d = ymd(new Date(s.start));
    if ((lastStored.get(s.timetableId) ?? "") < d) lastStored.set(s.timetableId, d);
  }
  const horizon = addDays(ymd(new Date()), STORED_DAYS);
  const end = ymd(to);

  for (const t of db.timetable) {
    if (!t.id || !t.seriesId || !db.cohorts.some((c) => c.id === t.cohortId)) continue;
    const after = lastStored.get(t.id);
    let day = [ymd(from), horizon, after ? addDays(after, 1) : ""].sort().pop()!;
    const rule = { weekdays: [t.weekday], everyWeeks: t.everyWeeks ?? 1, startsOn: t.startsOn ?? null, endsOn: t.endsOn ?? null };
    for (; day < end; day = addDays(day, 1)) {
      if (rule.endsOn && day > rule.endsOn) break;
      if (!meetsOn(rule, day)) continue;
      const c = cohortOf(db, t.cohortId);
      out.push({
        id: `v-${t.id}-${day}`,
        cohortId: t.cohortId,
        title: t.title || `${c.subject || "Live"} class`,
        strand: null,
        unit: t.unit ?? null,
        // series times are Pakistan time (UTC+5, no daylight saving)
        start: new Date(`${day}T${t.start}:00+05:00`).toISOString(),
        durationMin: t.durationMin,
        timetableId: t.id,
        attendance: {},
        virtual: true,
      });
    }
  }
  return out;
}
