"use client";

import { useState } from "react";
import { ArrowRight, Megaphone, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { attendancePct, averagePct, cohortOf, useTeacher } from "@/lib/portal/store";
import { fmtDateLong, fmtDay, fmtDuration, fmtRelative, fmtTime, sessionState } from "@/lib/portal/format";
import { Avatar, Btn, Card, Chip, Field, Label, Modal, PageHeader, Rise, Stat, fieldCls } from "@/components/portal/ui";
import { DateTile, JoinButton, NextClassCard, SessionStatus } from "@/components/portal/classroom";

const HOUR = 3_600_000;

function AnnounceForm({ onDone }: { onDone: () => void }) {
  const { db, addAnnouncement, toast } = useTeacher();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [to, setTo] = useState("all");
  return (
    <div className="space-y-5">
      <Field label="Send to">
        <select value={to} onChange={(e) => setTo(e.target.value)} className={fieldCls}>
          <option value="all">Everyone</option>
          {db.cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.board}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Headline">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Monthly assessment this Friday" className={fieldCls} />
      </Field>
      <Field label="Message">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={cn(fieldCls, "resize-none")} />
      </Field>
      <Btn
        variant="gold"
        size="lg"
        disabled={!title.trim() || !body.trim()}
        onClick={async () => {
          if (!(await addAnnouncement({ cohortId: to === "all" ? null : to, title: title.trim(), body: body.trim() }))) return;
          toast("Announcement posted");
          onDone();
        }}
      >
        <Megaphone size={16} />
        Post announcement
      </Btn>
    </div>
  );
}

export default function TeacherOverview() {
  const { db, now } = useTeacher();
  const [announcing, setAnnouncing] = useState(false);

  // one-to-one cohorts: show the single next class big, the rest as a compact schedule
  const upcoming = db.sessions.filter((s) => sessionState(s.start, s.durationMin, now) !== "ended");
  const next = upcoming[0];

  const queue = db.submissions
    .filter((x) => x.status === "submitted")
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  const markedThisWeek = db.submissions.filter((x) => x.markedAt && now - new Date(x.markedAt).getTime() < 7 * 24 * HOUR).length;

  const rows = db.students.map((s) => ({
    s,
    att: attendancePct(db, s.id, s.cohortId, now),
    avg: averagePct(db, s.id),
    missing: db.assignments.filter(
      (a) => a.cohortId === s.cohortId && new Date(a.dueAt).getTime() < now && !db.submissions.some((x) => x.assignmentId === a.id && x.studentId === s.id)
    ).length,
  }));
  const avgAtt = rows.length ? Math.round(rows.reduce((n, r) => n + r.att, 0) / rows.length) : 0;
  const withAvg = rows.filter((r) => r.avg !== null);
  const avgMark = Math.round(withAvg.reduce((n, r) => n + (r.avg ?? 0), 0) / Math.max(1, withAvg.length));
  const attention = rows
    .filter((r) => r.att < 80 || (r.avg !== null && r.avg < 62) || r.missing > 0)
    .sort((a, b) => b.missing - a.missing || a.att - b.att)
    .slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow={fmtDateLong(new Date(now).toISOString())}
        title="Teaching"
        gold="Overview"
        sub={`${db.students.length} students across ${db.cohorts.length} cohorts.`}
        actions={
          <Btn variant="navy" onClick={() => setAnnouncing(true)}>
            <Megaphone size={15} />
            Post announcement
          </Btn>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Rise i={0} className="lg:col-span-7">
          {next ? (
            <NextClassCard session={next} cohortLabel={cohortOf(db, next.cohortId).name} />
          ) : (
            <Card tone="navy" className="h-full rounded-[26px] !p-8">
              <Label className="text-white/50">Next live class</Label>
              <p className="mt-3 text-lg font-semibold">Nothing scheduled</p>
            </Card>
          )}
        </Rise>

        <Rise i={1} className="lg:col-span-5">
          <Card className="h-full">
            <div className="flex items-center justify-between">
              <Label>Coming up</Label>
              <Btn variant="ghost" size="sm" href="/portal/teacher/classes/">
                Timetable <ArrowRight size={14} />
              </Btn>
            </div>
            <ul className="thin-scroll mt-2 max-h-[22rem] overflow-y-auto pr-1">
              {upcoming.slice(1, 9).map((s) => (
                <li key={s.id} className="flex items-center gap-3 border-t border-navy/10 py-3 first:border-t-0">
                  <DateTile iso={s.start} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold tracking-tight text-navy">{cohortOf(db, s.cohortId).name}</p>
                    <p className="truncate text-[13px] text-navy/50">
                      {fmtDay(s.start, now)} · {fmtTime(s.start)}
                    </p>
                  </div>
                  {sessionState(s.start, s.durationMin, now) !== "upcoming" ? (
                    <JoinButton session={s} size="sm" surface="white" />
                  ) : new Date(s.start).getTime() - now < 12 * 3_600_000 ? (
                    <SessionStatus session={s} />
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        </Rise>

        <Rise i={2} className="lg:col-span-7">
          <Card className="h-full">
            <div className="flex items-center justify-between">
              <div>
                <Label>Marking queue · 24-hour promise</Label>
                <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
                  {queue.length ? `${queue.length} submission${queue.length === 1 ? "" : "s"} waiting` : "Queue is clear"}
                </h2>
              </div>
              <Btn variant="gold" size="sm" href="/portal/teacher/marking/">
                <PenLine size={14} />
                Start marking
              </Btn>
            </div>
            <ul className="mt-4">
              {queue.slice(0, 4).map((x) => {
                const st = db.students.find((s) => s.id === x.studentId)!;
                const a = db.assignments.find((y) => y.id === x.assignmentId)!;
                const left = new Date(x.submittedAt).getTime() + 24 * HOUR - now;
                return (
                  <li key={x.id} className="flex items-center gap-3.5 border-t border-navy/10 py-3 first:border-t-0">
                    <Avatar name={st.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-tight text-navy">{st.name}</p>
                      <p className="truncate text-[13px] text-navy/50">{a.title}</p>
                    </div>
                    <Chip tone={left < 0 ? "navy" : left < 6 * HOUR ? "gold" : "soft"}>
                      {left < 0 ? `Late by ${fmtDuration(-left)}` : `${fmtDuration(left)} left`}
                    </Chip>
                  </li>
                );
              })}
            </ul>
          </Card>
        </Rise>

        <Rise i={3} className="lg:col-span-5">
          <Card tone="navy" className="grid h-full grid-cols-2 gap-x-6 gap-y-7 rounded-[26px] !p-7">
            <Stat onNavy label="Students" value={db.students.length} sub={`${db.cohorts.length} live cohorts`} />
            <Stat onNavy label="Attendance" value={`${avgAtt}%`} sub="average this term" />
            <Stat onNavy label="Average mark" value={`${avgMark}%`} sub="across marked work" />
            <Stat onNavy label="Returned" value={markedThisWeek} sub="pieces in the last 7 days" />
          </Card>
        </Rise>

        <Rise i={4} className="lg:col-span-7">
          <Card className="h-full">
            <div className="flex items-center justify-between">
              <div>
                <Label>Needs attention</Label>
                <h2 className="mt-1.5 text-lg font-semibold tracking-tight">Students to check in with</h2>
              </div>
              <Btn variant="ghost" size="sm" href="/portal/teacher/students/">
                All students <ArrowRight size={14} />
              </Btn>
            </div>
            <ul className="mt-4">
              {attention.map(({ s, att, avg, missing }) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-navy/10 py-3 first:border-t-0">
                  <Avatar name={s.name} size="sm" />
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-sm font-semibold tracking-tight text-navy">{s.name}</p>
                    <p className="truncate text-[13px] text-navy/50">{cohortOf(db, s.cohortId).name}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {missing > 0 && <Chip tone="gold">{missing} not handed in</Chip>}
                    {att < 80 && <Chip tone="soft">{att}% attendance</Chip>}
                    {avg !== null && avg < 62 && <Chip tone="soft">{avg}% average</Chip>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </Rise>

        <Rise i={5} className="lg:col-span-5">
          <Card className="h-full">
            <Label>Notice board</Label>
            <ul className="mt-3 flex flex-col">
              {db.announcements.slice(0, 4).map((n) => (
                <li key={n.id} className="border-t border-navy/10 py-3 first:border-t-0">
                  <p className="text-sm font-semibold tracking-tight text-navy">{n.title}</p>
                  <p className="mt-0.5 text-[13px] text-navy/50">
                    {n.cohortId ? cohortOf(db, n.cohortId).name : "Everyone"} · {fmtRelative(n.at, now)}
                  </p>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setAnnouncing(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy transition-colors hover:text-gold focus-gold"
            >
              Post a new one <ArrowRight size={15} />
            </button>
          </Card>
        </Rise>
      </div>

      <Modal open={announcing} onClose={() => setAnnouncing(false)} eyebrow="Notice board" title="Post an announcement">
        <AnnounceForm onDone={() => setAnnouncing(false)} />
      </Modal>
    </>
  );
}
