// A member's classes (and, for students, deadlines) as a calendar feed (.ics) that
// Apple Calendar or Google Calendar subscribes to. The private token in the link is
// the only key (calendar apps can't sign in), so it runs with verify_jwt off; members
// can replace their link from the app, which stops the old one.

import { createClient } from "npm:@supabase/supabase-js@2";

type Feed = {
  name: string;
  role: "student" | "teacher";
  sessions: { id: number; title: string; unit: string | null; start: string; minutes: number; meet: string | null; cohort: string }[];
  deadlines: { id: number; title: string; due: string; timed: boolean }[];
};

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
/** Lines longer than 75 characters continue on the next line, indented by a space. */
const fold = (line: string) => {
  const out: string[] = [];
  for (let i = 0; i < line.length; i += 73) out.push((i ? " " : "") + line.slice(i, i + 73));
  return out.join("\r\n");
};

function ics(feed: Feed) {
  const now = stamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Concept Lab//Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Concept Lab",
    "X-WR-TIMEZONE:Asia/Karachi",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const s of feed.sessions) {
    const start = new Date(s.start);
    const end = new Date(start.getTime() + s.minutes * 60_000);
    const summary = feed.role === "teacher" ? `${s.cohort}: ${s.title}` : s.title;
    const desc = [s.unit, s.meet ? `Join: ${s.meet}` : null, `In the app: https://cognifypk.com/app/?go=/class/${s.id}`].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:class-${s.id}@cognifypk.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      fold(`SUMMARY:${esc(summary)}`),
      fold(`DESCRIPTION:${esc(desc)}`),
      ...(s.meet ? [fold(`LOCATION:${esc(s.meet)}`), fold(`URL:${s.meet}`)] : []),
      "END:VEVENT"
    );
  }
  for (const a of feed.deadlines) {
    const due = new Date(a.due);
    lines.push(
      "BEGIN:VEVENT",
      `UID:due-${a.id}@cognifypk.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(new Date(due.getTime() - 15 * 60_000))}`,
      `DTEND:${stamp(due)}`,
      fold(`SUMMARY:${esc(`${a.timed ? "Start by" : "Due"}: ${a.title}`)}`),
      fold(`DESCRIPTION:${esc(`In the app: https://cognifypk.com/app/?go=/work/${a.id}`)}`),
      "TRANSP:TRANSPARENT",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  if (!/^[0-9a-f]{64}$/.test(token)) return new Response("Not found", { status: 404 });
  const secret = (() => {
    try {
      return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default as string | undefined;
    } catch {
      return undefined;
    }
  })() ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) return new Response("Unavailable", { status: 500 });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, secret, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc("calendar_feed", { p_token: token });
  if (error) return new Response("Unavailable", { status: 500 });
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(ics(data as Feed), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="concept-lab.ics"', "Cache-Control": "private, max-age=900" },
  });
});
