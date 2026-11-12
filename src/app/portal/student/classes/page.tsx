"use client";

import { useState } from "react";
import { attendancePct, topicOf, useStudent } from "@/lib/portal/store";
import { fmtDate, fmtTime, sessionState } from "@/lib/portal/format";
import type { Resource } from "@/lib/portal/types";
import { Btn, PageHeader, Segmented, Status, Table, Td } from "@/components/portal/ui";
import { NextClassCard } from "@/components/portal/classroom";
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
  const attended = past.filter((s) => s.attendance[me.id]).length;

  return (
    <>
      <PageHeader
        title="Classes"
        sub="Live classes on Google Meet. The room opens 10 minutes before the start, and joining from here marks you present."
      />

      {upcoming[0] && (
        <div className="mb-8">
          <NextClassCard session={upcoming[0]} />
        </div>
      )}

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "upcoming", label: "Upcoming", count: upcoming.length },
          { value: "past", label: "Past", count: past.length },
        ]}
      />

      <div className="mt-4">
        {tab === "upcoming" ? (
          <Table head={[{ label: "Date" }, { label: "Time" }, { label: "Class" }, { label: "Topic" }]}>
            {upcoming.length === 0 ? (
              <tr>
                <Td colSpan={4} className="py-6 text-center text-navy/50">
                  No classes scheduled yet.
                </Td>
              </tr>
            ) : (
              upcoming.map((s) => (
                <tr key={s.id}>
                  <Td className="whitespace-nowrap font-medium text-navy">{fmtDate(s.start)}</Td>
                  <Td className="whitespace-nowrap">
                    {fmtTime(s.start)} · {s.durationMin} min
                  </Td>
                  <Td>{s.title}</Td>
                  <Td className="text-navy/55">{topicOf(s) || "—"}</Td>
                </tr>
              ))
            )}
          </Table>
        ) : (
          <>
            <p className="mb-3 text-sm text-navy/60">
              Attendance: <span className="font-semibold text-navy">{attendancePct(db, me.id, me.cohortId, now)}%</span> ({attended} of{" "}
              {past.length} classes)
            </p>
            <Table head={[{ label: "Date" }, { label: "Class" }, { label: "Topic" }, { label: "Attendance" }, { label: "Materials", align: "right" }]}>
              {past.length === 0 ? (
                <tr>
                  <Td colSpan={5} className="py-6 text-center text-navy/50">
                    No past classes yet.
                  </Td>
                </tr>
              ) : (
                past.map((s) => {
                  const rec = res(s.id, "Recording");
                  const slides = res(s.id, "Slides");
                  return (
                    <tr key={s.id}>
                      <Td className="whitespace-nowrap font-medium text-navy">
                        {fmtDate(s.start)}, {fmtTime(s.start)}
                      </Td>
                      <Td>{s.title}</Td>
                      <Td className="text-navy/55">{topicOf(s) || "—"}</Td>
                      <Td>{s.attendance[me.id] ? <Status tone="done">Present</Status> : <Status>Absent</Status>}</Td>
                      <Td align="right">
                        <div className="flex justify-end gap-2">
                          {slides && (
                            <Btn variant="outline" size="sm" onClick={() => setViewing(slides)}>
                              Slides
                            </Btn>
                          )}
                          {rec && (
                            <Btn variant="outline" size="sm" onClick={() => setViewing(rec)}>
                              Recording
                            </Btn>
                          )}
                          {!slides && !rec && <span className="text-navy/35">—</span>}
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </Table>
          </>
        )}
      </div>

      <ResourceViewer resource={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
