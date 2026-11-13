/** Formatting helpers for the portal. All dates display in the viewer's local time. */

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const MB = 1_048_576;

const pad = (n: number) => String(n).padStart(2, "0");

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });

export const fmtDateLong = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today", "Tomorrow", "Yesterday" or "Mon 9 Nov". */
export function fmtDay(iso: string, now = Date.now()) {
  const diff = Math.round((startOfDay(new Date(iso)) - startOfDay(new Date(now))) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return fmtDate(iso);
}

/** "2h 14m", "12m", "3d 4h" — for a positive duration in ms. */
export function fmtDuration(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** "in 2 days", "in 3 hours", "5 min ago", "yesterday". */
export function fmtRelative(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  if (abs < 60_000) return "just now";
  const unit =
    abs < HOUR
      ? `${Math.max(1, Math.round(abs / 60_000))} min`
      : abs < DAY
        ? `${Math.round(abs / HOUR)} hr`
        : `${Math.round(abs / DAY)} day${Math.round(abs / DAY) === 1 ? "" : "s"}`;
  return diff >= 0 ? `in ${unit}` : `${unit} ago`;
}

/** mm:ss or h:mm:ss countdown. */
export function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** "840 KB", "1.2 MB", "2.31 GB" — or "" when the size is unknown. */
export function fmtBytes(bytes: number | null | undefined) {
  if (bytes === null || bytes === undefined) return "";
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${(bytes / (1024 * MB)).toFixed(2)} GB`;
}

/** Values for <input type="date"> and <input type="time">, in local time. */
export const dateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const timeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

/** Session timing relative to now. Students can join from 10 min before the start. */
export function sessionState(start: string, durationMin: number, now = Date.now()) {
  const s = new Date(start).getTime();
  const e = s + durationMin * 60_000;
  if (now >= e) return "ended" as const;
  if (now >= s) return "live" as const;
  if (now >= s - 10 * 60_000) return "open" as const;
  return "upcoming" as const;
}

/** A valid Google Meet link looks like https://meet.google.com/abc-defg-hij */
export const isMeetUrl = (url: string) =>
  /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(\?.*)?$/i.test(url.trim());

/** A Google Drive / Docs share link. */
export const isDriveUrl = (url: string) => /^https:\/\/(drive|docs)\.google\.com\//.test(url.trim());
