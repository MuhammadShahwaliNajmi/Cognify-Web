"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { useStudent } from "@/lib/portal/store";
import { fmtDateLong, fmtTime } from "@/lib/portal/format";
import { RequestForm } from "./class-tools";
import { Btn, Field, Modal, Segmented, fieldCls } from "./ui";

/** Student calendar: ask to move or cancel any upcoming class, with a reason. */
export function RequestChange() {
  const { db, me, now, parent } = useStudent();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"reschedule" | "cancel">("reschedule");
  const pending = new Set(db.requests.filter((r) => r.status === "pending" && r.studentId === me.id).map((r) => r.sessionId));
  const upcoming = db.sessions
    .filter((s) => s.cohortId === me.cohortId && new Date(s.start).getTime() > now && !pending.has(s.id))
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 30);
  const [id, setId] = useState("");
  const session = upcoming.find((s) => s.id === id) ?? upcoming[0];
  if (parent || !upcoming.length) return null;
  return (
    <>
      <Btn variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarClock size={14} /> Request a change
      </Btn>
      <Modal open={open} onClose={() => setOpen(false)} title="Request a change">
        <div className="space-y-4">
          <Field label="Class">
            <select value={session?.id ?? ""} onChange={(e) => setId(e.target.value)} className={fieldCls}>
              {upcoming.map((s) => (
                <option key={s.id} value={s.id}>
                  {fmtDateLong(s.start)}, {fmtTime(s.start)} · {s.title}
                </option>
              ))}
            </select>
          </Field>
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { value: "reschedule", label: "Move it" },
              { value: "cancel", label: "Cancel it" },
            ]}
          />
          {session && <RequestForm key={`${session.id}-${kind}`} session={session} kind={kind} onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />}
        </div>
      </Modal>
    </>
  );
}
