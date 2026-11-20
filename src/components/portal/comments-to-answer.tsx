"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useTeacher } from "@/lib/portal/store";
import { fmtRelative } from "@/lib/portal/format";
import { WorkThread } from "./thread";
import { Btn, Modal, SectionTitle, Table, Td } from "./ui";

type Last = { assignment_id: number; student_id: number; author_id: number; body: string; created_at: string };

/** Teacher dashboard: private comment threads where the student wrote last (waiting for a reply). */
export function CommentsToAnswer() {
  const { db, now } = useTeacher();
  const [rows, setRows] = useState<Last[]>([]);
  const [open, setOpen] = useState<Last | null>(null);

  useEffect(() => {
    let alive = true;
    const sb = getSupabase();
    sb?.from("work_comments")
      .select("assignment_id, student_id, author_id, body, created_at")
      .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(300)
      .then(({ data }) => {
        if (!alive || !data) return;
        // the latest comment in each thread; keep threads where the student spoke last
        const seen = new Set<string>();
        const last: Last[] = [];
        for (const c of data as Last[]) {
          const k = `${c.assignment_id}-${c.student_id}`;
          if (seen.has(k)) continue;
          seen.add(k);
          if (c.author_id === c.student_id) last.push(c);
        }
        setRows(last);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  if (!rows.length) return null;
  const nameOf = (id: number) => db.students.find((s) => s.id === String(id))?.name ?? "Student";
  const workOf = (id: number) => db.assignments.find((a) => a.id === String(id))?.title ?? "Work";

  return (
    <section>
      <SectionTitle>Comments to answer</SectionTitle>
      <Table minWidth={520} head={[{ label: "Student" }, { label: "Comment" }, { label: "", align: "right" }]}>
        {rows.slice(0, 8).map((c) => (
          <tr key={`${c.assignment_id}-${c.student_id}`}>
            <Td className="font-medium">
              {nameOf(c.student_id)}
              <span className="block text-[12px] font-normal">{workOf(c.assignment_id)}</span>
            </Td>
            <Td>
              <span className="line-clamp-2">&ldquo;{c.body}&rdquo;</span>
              <span className="block text-[12px]">{fmtRelative(c.created_at, now)}</span>
            </Td>
            <Td align="right">
              <Btn variant="navy" size="sm" onClick={() => setOpen(c)}>
                <MessageCircle size={13} /> Reply
              </Btn>
            </Td>
          </tr>
        ))}
      </Table>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${nameOf(open.student_id)} · ${workOf(open.assignment_id)}` : ""}>
        {open && <WorkThread assignmentId={String(open.assignment_id)} studentId={String(open.student_id)} />}
      </Modal>
    </section>
  );
}
