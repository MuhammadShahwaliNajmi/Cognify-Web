"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { cohortOf, useTeacher } from "@/lib/portal/store";
import { fmtRelative } from "@/lib/portal/format";
import { Btn, Empty, Field, PageHeader, Rise, fieldCls } from "@/components/portal/ui";

/** Notices: post an announcement to everyone or one student, and see what's been sent. */
export default function TeacherNotices() {
  const { db, now, addAnnouncement, toast } = useTeacher();
  const [to, setTo] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const post = async () => {
    setBusy(true);
    const ok = await addAnnouncement({ cohortId: to === "all" ? null : to, title: title.trim(), body: body.trim() });
    setBusy(false);
    if (!ok) return;
    toast("Notice posted");
    setTitle("");
    setBody("");
  };

  return (
    <>
      <PageHeader title="Notices" sub="Students see these under the bell at the top of their portal." />

      <Rise i={0}>
        <div className="rounded-2xl border border-navy/10 p-5 md:p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_2fr]">
            <Field label="Send to">
              <select value={to} onChange={(e) => setTo(e.target.value)} className={fieldCls}>
                <option value="all">Everyone</option>
                {db.cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Headline">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assessment this Friday" className={fieldCls} />
            </Field>
          </div>
          <div className="mt-5">
            <Field label="Message">
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className={cn(fieldCls, "resize-none")} />
            </Field>
          </div>
          <div className="mt-5">
            <Btn variant="gold" disabled={!title.trim() || !body.trim() || busy} onClick={post}>
              <Megaphone size={15} />
              {busy ? "Posting…" : "Post notice"}
            </Btn>
          </div>
        </div>
      </Rise>

      <Rise i={1} className="mt-10">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-navy/45">Sent</h2>
        {db.announcements.length === 0 ? (
          <Empty icon={<Megaphone size={20} />} title="No notices yet" text="Anything you post appears here and on your students' portals." />
        ) : (
          <ul className="divide-y divide-navy/10">
            {db.announcements.map((n) => (
              <li key={n.id} className="py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[15px] font-medium tracking-tight text-navy">{n.title}</p>
                  <span className="shrink-0 text-[13px] text-navy/45">{fmtRelative(n.at, now)}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-navy/60">{n.body}</p>
                <p className="mt-1.5 text-[13px] text-navy/45">To {n.cohortId ? cohortOf(db, n.cohortId).name : "everyone"}</p>
              </li>
            ))}
          </ul>
        )}
      </Rise>
    </>
  );
}
