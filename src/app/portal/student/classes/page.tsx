"use client";

import { useState } from "react";
import { CalendarDays, Check, Presentation } from "lucide-react";
import { topicOf, useStudent } from "@/lib/portal/store";
import { fmtDay, fmtTime, sessionState } from "@/lib/portal/format";
import type { Resource } from "@/lib/portal/types";
import { Btn, Empty, PageHeader, Rise, Segmented } from "@/components/portal/ui";
import { DateTile, JoinButton, SessionStatus, WatchButton } from "@/components/portal/classroom";
import { ResourceViewer } from "@/components/portal/resources";

export default function StudentClasses() {
  const { db, me, now } = useStudent();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [viewing, setViewing] = useState<Resource | null>(null);

  const sessions = db.sessions.filter((s) => s.cohortId === me.cohortId);
  const upcoming = sessions.filter((s) => sessionState(s.start, s.durationMin, now) !== "ended");
  const past = sessions.filter((s) => sessionState(s.start, s.durationMin, now) === "ended").reverse();
  const res = (sessionId: string, type: Resource["type"]) =>
    db.resources.find((r) => r.sessionId === sessionId && r.type === type) ?? null;
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <>
      <PageHeader title="Classes" sub="Live on Google Meet. The room opens 10 minutes before each class, and joining from here marks you present." />

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "upcoming", label: "Upcoming", count: upcoming.length },
          { value: "past", label: "Past", count: past.length },
        ]}
      />

      <Rise key={tab} className="mt-2">
        {list.length === 0 ? (
          <div className="mt-6">
            <Empty
              icon={<CalendarDays size={20} />}
              title={tab === "upcoming" ? "Nothing scheduled yet" : "No past classes yet"}
              text={
                tab === "upcoming"
                  ? "Your classes appear here as soon as they're on the timetable."
                  : "Once a class has run, its slides and recording appear here."
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-navy/10">
            {list.map((s, i) => {
              const rec = res(s.id, "Recording");
              const slides = res(s.id, "Slides");
              const topic = topicOf(s);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
                  <DateTile iso={s.start} active={tab === "upcoming" && i === 0} />
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate text-[15px] font-medium tracking-tight text-navy">{s.title}</p>
                    <p className="mt-0.5 text-[13px] text-navy/50">
                      {fmtDay(s.start, now)} · {fmtTime(s.start)}
                      {topic ? ` · ${topic}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {tab === "past" ? (
                      <>
                        {s.attendance[me.id] && (
                          <span className="flex items-center gap-1 text-[13px] text-navy/50">
                            <Check size={14} className="text-gold" /> Attended
                          </span>
                        )}
                        {slides && (
                          <Btn variant="outline" size="sm" onClick={() => setViewing(slides)}>
                            <Presentation size={13} /> Slides
                          </Btn>
                        )}
                        {rec && <WatchButton onClick={() => setViewing(rec)} />}
                      </>
                    ) : i === 0 ? (
                      <JoinButton session={s} size="sm" surface="white" />
                    ) : (
                      new Date(s.start).getTime() - now < 12 * 3_600_000 && <SessionStatus session={s} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Rise>

      <ResourceViewer resource={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
