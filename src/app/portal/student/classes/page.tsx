"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, Lock, Presentation, XCircle } from "lucide-react";
import { attendancePct, courseOf, topicOf, useStudent } from "@/lib/portal/store";
import { fmtDay, fmtTime, sessionState } from "@/lib/portal/format";
import type { Resource } from "@/lib/portal/types";
import { Bar, Btn, Card, Chip, Empty, Label, PageHeader, Rise, Segmented } from "@/components/portal/ui";
import { DateTile, JoinButton, NextClassCard, SessionStatus, WatchButton } from "@/components/portal/classroom";
import { ResourceViewer } from "@/components/portal/resources";

export default function StudentClasses() {
  const { db, me, cohort, now } = useStudent();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [viewing, setViewing] = useState<Resource | null>(null);

  const sessions = db.sessions.filter((s) => s.cohortId === me.cohortId);
  const upcoming = sessions.filter((s) => sessionState(s.start, s.durationMin, now) !== "ended");
  const past = sessions.filter((s) => sessionState(s.start, s.durationMin, now) === "ended").reverse();
  const attended = past.filter((s) => s.attendance[me.id]).length;
  const pct = attendancePct(db, me.id, me.cohortId, now);
  const live = me.plan !== "Lab";
  const res = (sessionId: string, type: Resource["type"]) =>
    db.resources.find((r) => r.sessionId === sessionId && r.type === type) ?? null;

  return (
    <>
      <PageHeader
        eyebrow={courseOf(cohort)}
        title="Live"
        gold="Classes"
        sub="Every class runs on Google Meet. The room opens 10 minutes before the start, and joining from here marks you present."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Rise i={0} className="lg:col-span-8">
          {live && upcoming[0] ? (
            <NextClassCard session={upcoming[0]} />
          ) : (
            <Card tone="navy" className="flex h-full flex-col rounded-[26px] !p-8">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.07] text-gold ring-1 ring-white/10">
                <Lock size={18} />
              </span>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight">Live classes are part of Core and Elite</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">
                Your Lab plan includes every class recording in The Vault. Move to Core to join the live cohort of 10 to 15 students.
              </p>
              <div className="mt-auto pt-7">
                <Btn variant="gold" href="/#pricing">
                  Compare plans
                </Btn>
              </div>
            </Card>
          )}
        </Rise>

        <Rise i={1} className="lg:col-span-4">
          <Card className="flex h-full flex-col justify-between">
            <div>
              <Label>Attendance this term</Label>
              <p className="mt-3 text-[3.2rem] font-semibold leading-none tracking-tightest text-navy tabular-nums">
                {pct}
                <span className="text-2xl text-navy/40">%</span>
              </p>
              <Bar value={pct} className="mt-4" />
            </div>
            <p className="mt-5 text-sm leading-relaxed text-navy/60">
              You&apos;ve attended <span className="font-semibold text-navy">{attended}</span> of{" "}
              <span className="font-semibold text-navy">{past.length}</span> classes. Missed one? The recording is waiting below.
            </p>
          </Card>
        </Rise>

        <Rise i={2} className="lg:col-span-12">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented
                value={tab}
                onChange={setTab}
                options={[
                  { value: "upcoming", label: "Upcoming", count: upcoming.length },
                  { value: "past", label: "Past classes", count: past.length },
                ]}
              />
              <Label>All times in your local time</Label>
            </div>

            <ul className="mt-4">
              {(tab === "upcoming" ? upcoming : past).map((s, i) => {
                const ended = tab === "past";
                const rec = res(s.id, "Recording");
                const slides = res(s.id, "Slides");
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-navy/10 py-4 first:border-t-0">
                    <DateTile iso={s.start} active={!ended && i === 0} />
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="text-[15px] font-medium leading-snug tracking-tight text-navy">{s.title}</p>
                      <p className="mt-1 text-[13px] text-navy/50">
                        {fmtDay(s.start, now)} · {fmtTime(s.start)} · {s.durationMin} min
                        {topicOf(s) ? ` · ${topicOf(s)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {ended ? (
                        <>
                          {s.attendance[me.id] ? (
                            <Chip tone="soft">
                              <CheckCircle2 size={12} /> Attended
                            </Chip>
                          ) : (
                            <Chip tone="outline">
                              <XCircle size={12} /> Missed
                            </Chip>
                          )}
                          {slides && (
                            <Btn variant="outline" size="sm" onClick={() => setViewing(slides)}>
                              <Presentation size={13} /> Slides
                            </Btn>
                          )}
                          {rec && <WatchButton onClick={() => setViewing(rec)} />}
                        </>
                      ) : live ? (
                        i === 0 ? (
                          <JoinButton session={s} size="sm" surface="white" />
                        ) : (
                          new Date(s.start).getTime() - now < 12 * 3_600_000 && <SessionStatus session={s} />
                        )
                      ) : (
                        <Chip tone="outline">
                          <Lock size={11} /> Core &amp; Elite
                        </Chip>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {(tab === "upcoming" ? upcoming : past).length === 0 && (
              <Empty
                icon={<CalendarDays size={20} />}
                title={tab === "upcoming" ? "Nothing scheduled yet" : "No past classes yet"}
                text={tab === "upcoming" ? "New classes appear here as soon as your teacher schedules them." : "Once a class has run, its slides and recording appear here."}
              />
            )}
          </Card>
        </Rise>
      </div>

      <ResourceViewer resource={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
