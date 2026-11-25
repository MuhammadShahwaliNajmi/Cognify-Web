"use client";

import { useState } from "react";
import { Megaphone, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { classLabel, cohortOf } from "@/lib/portal/selectors";
import { useTeacher } from "@/lib/portal/store";
import { fmtRelative } from "@/lib/portal/format";
import type { Announcement } from "@/lib/portal/types";
import { Btn, Empty, Field, Modal, MultiPick, PageHeader, Rise, fieldCls } from "@/components/portal/ui";

/** Announcements: post to the students you pick, and see what's been sent. */
export default function TeacherAnnouncements() {
  const { db, now, addAnnouncement, deleteAnnouncement, toast } = useTeacher();
  const [removeId, setRemoveId] = useState<string | null>(null);
  // "All my students" posts one copy per student: show (and delete) them as one
  const sent: (Announcement & { ids: string[]; to: string[] })[] = [];
  for (const n of db.announcements) {
    const same = sent.find(
      (g) => g.title === n.title && g.body === n.body && Math.abs(new Date(g.at).getTime() - new Date(n.at).getTime()) < 120_000,
    );
    const to = n.cohortId ? cohortOf(db, n.cohortId).name : "all students";
    if (same) {
      same.ids.push(n.id);
      same.to.push(to);
    } else sent.push({ ...n, ids: [n.id], to: [to] });
  }
  const removing = sent.find((n) => n.id === removeId);
  const [to, setTo] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const post = async () => {
    setBusy(true);
    // one copy per student picked
    const targets = to;
    let ok = targets.length > 0;
    for (const cohortId of targets) ok = (await addAnnouncement({ cohortId, title: title.trim(), body: body.trim() })) && ok;
    setBusy(false);
    if (!ok) return;
    toast("Announcement posted");
    setTitle("");
    setBody("");
    setTo([]);
  };

  return (
    <>
      <PageHeader title="Announcements" />

      <Rise i={0}>
        <div className="rounded-2xl border border-navy/10 p-5 md:p-6">
          <MultiPick
            single
            label="Send to"
            value={to}
            onChange={setTo}
            options={[...db.cohorts].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: classLabel(c) }))}
          />
          <div className="mt-5">
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
            <Btn variant="gold" disabled={!to.length || !title.trim() || !body.trim() || busy} onClick={post}>
              <Megaphone size={15} />
              {busy ? "Posting…" : "Post announcement"}
            </Btn>
          </div>
        </div>
      </Rise>

      <Rise i={1} className="mt-10">
        <h2 className="mb-3 text-[13px] font-semibold text-navy">Sent</h2>
        {sent.length === 0 ? (
          <Empty
            icon={<Megaphone size={20} />}
            title="No announcements yet"
            text="Anything you post appears here and on your students' portals."
          />
        ) : (
          <ul className="divide-y divide-navy/10">
            {sent.map((n) => (
              <li key={n.id} className="py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[15px] font-medium tracking-tight text-navy">{n.title}</p>
                  <span className="flex shrink-0 items-center gap-2 text-[13px] font-semibold text-navy">
                    {fmtRelative(n.at, now)}
                    <button
                      type="button"
                      aria-label={`Delete ${n.title}`}
                      onClick={() => setRemoveId(n.id)}
                      className="grid h-10 w-10 place-items-center rounded-md text-navy hover:bg-navy/[0.06] focus-gold"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-navy">{n.body}</p>
                <p className="mt-1.5 text-[13px] text-navy">To {n.to.length > 3 ? `${n.to.length} students` : n.to.join(", ")}</p>
              </li>
            ))}
          </ul>
        )}
      </Rise>

      <Modal open={!!removing} onClose={() => setRemoveId(null)} title="Delete this announcement?">
        {removing && (
          <div className="space-y-5">
            <p className="text-[15px] font-medium text-navy">{removing.title}</p>
            <div className="flex gap-2.5">
              <Btn
                variant="navy"
                onClick={async () => {
                  let ok = true;
                  for (const id of removing.ids) ok = (await deleteAnnouncement(id)) && ok;
                  if (ok) toast("Announcement deleted");
                  setRemoveId(null);
                }}
              >
                <Trash2 size={14} /> Delete
              </Btn>
              <Btn variant="ghost" onClick={() => setRemoveId(null)}>
                Keep
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
