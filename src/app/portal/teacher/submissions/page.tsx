"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import {  } from "@/lib/portal/selectors";
import { useTeacher } from "@/lib/portal/store";
import { HOUR, fmtDate, fmtDuration, fmtRelative, fmtTime } from "@/lib/portal/format";
import { TypedAnswer, WorkFile, cleanPoint, hasFile } from "@/components/portal/work";
import type { Submission } from "@/lib/portal/types";
import { Avatar, Btn, Chip, EmptyRow, AutoTextarea, Field, Label, Modal, PageHeader, Picker, RowLink, Segmented, Status, Table, Td, fieldCls } from "@/components/portal/ui";

const navBtn =
  "grid h-9 w-9 place-items-center rounded-full border border-navy/12 text-navy transition-colors hover:border-gold disabled:opacity-30 focus-gold";

const lines = (s: string) => s.split("\n").map(cleanPoint).filter(Boolean);

function MarkForm({ sub, onReturned }: { sub: Submission; onReturned: () => void }) {
  const { db, now, markWork, toast } = useTeacher();
  const [busy, setBusy] = useState(false);
  const a = db.assignments.find((x) => x.id === sub.assignmentId)!;
  const st = db.students.find((s) => s.id === sub.studentId)!;
  const [marks, setMarks] = useState(sub.marks !== undefined ? String(sub.marks) : "");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  const [strengths, setStrengths] = useState((sub.strengths ?? []).map(cleanPoint).join("\n"));
  const [improvements, setImprovements] = useState((sub.improvements ?? []).map(cleanPoint).join("\n"));

  const n = Number(marks);
  const marksOk = marks.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= a.maxMarks;
  const ok = marksOk && feedback.trim().length > 0;
  const late = new Date(sub.submittedAt).getTime() > new Date(a.dueAt).getTime();

  return (
    <div className="grid grid-cols-1 gap-5 md:h-[calc(94dvh-8.5rem)] md:grid-cols-[minmax(0,1fr)_400px]">
      {/* the work, large */}
      <div className="flex min-h-0 flex-col gap-4 md:overflow-y-auto">
        {hasFile(sub) && <WorkFile sub={sub} fill className={cn(!sub.answerText && "md:flex-1")} />}
        {sub.answerText && <TypedAnswer text={sub.answerText} />}
        {!hasFile(sub) && !sub.answerText && (
          <p className="rounded-2xl bg-navy/[0.04] p-8 text-center text-[15px] text-navy">No file was attached to this submission.</p>
        )}
      </div>

      {/* the mark */}
      <div className="min-h-0 space-y-5 md:overflow-y-auto md:pr-1">
        <div className="flex items-center gap-3">
          <Avatar name={st.name} />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold tracking-tight text-navy">{st.name}</p>
            <p className="text-[13px] text-navy">
              Handed in {fmtDate(sub.submittedAt)}, {fmtTime(sub.submittedAt)} {late ? "· after the deadline" : ""}
            </p>
          </div>
        </div>

        {sub.note && (
          <div className="rounded-2xl bg-gold/15 p-4">
            <Label>Note from {st.name.split(" ")[0]}</Label>
            <p className="mt-1.5 text-sm italic leading-relaxed text-navy">&ldquo;{sub.note}&rdquo;</p>
          </div>
        )}

        <details className="group rounded-2xl bg-navy/[0.04] p-4">
          <summary className="cursor-pointer list-none text-[13px] font-semibold text-navy">
            The task · {a.maxMarks} marks <span className="font-normal underline decoration-gold decoration-2 underline-offset-4 group-open:hidden">show</span>
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-navy">{a.brief}</p>
          {db.questions[a.id] && <p className="mt-3 whitespace-pre-wrap border-t border-navy/10 pt-3 text-sm leading-relaxed text-navy">{db.questions[a.id]}</p>}
        </details>

        <Field label={`Marks (out of ${a.maxMarks})`}>
          <div className="mt-2 flex items-center gap-3">
            <input
              value={marks}
              onChange={(e) => setMarks(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="0"
              aria-invalid={marks !== "" && !marksOk}
              className={cn(fieldCls, "!mt-0 w-28 text-center text-xl font-semibold tabular-nums")}
            />
            <span className="text-lg font-medium text-navy">/ {a.maxMarks}</span>
            {marksOk && <Chip tone="navy">{Math.round((n / a.maxMarks) * 100)}%</Chip>}
          </div>
        </Field>
        {marks !== "" && !marksOk && <p className="-mt-2 text-xs font-medium text-navy">Enter a mark between 0 and {a.maxMarks}.</p>}

        <Field label="Overall feedback">
          <AutoTextarea value={feedback} onChange={(e) => setFeedback(e.target.value)} minRows={5} placeholder="What level is this, and why?" />
        </Field>
        <Field label="What they did well">
          <AutoTextarea value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="One point per line" />
        </Field>
        <Field label="To gain more marks">
          <AutoTextarea value={improvements} onChange={(e) => setImprovements(e.target.value)} placeholder="One point per line" />
        </Field>

        <div className="sticky bottom-0 -mx-1 bg-white px-1 pb-1 pt-2">
          <Btn
            variant="gold"
            size="lg"
            className="w-full"
            disabled={!ok || busy}
            onClick={async () => {
              setBusy(true);
              const saved = await markWork(sub.id, { marks: n, feedback: feedback.trim(), strengths: lines(strengths), improvements: lines(improvements) });
              setBusy(false);
              if (!saved) return;
              toast(sub.status === "marked" ? "Feedback updated" : `Returned to ${st.name.split(" ")[0]}`);
              onReturned();
            }}
          >
            <Send size={16} />
            {busy ? "Saving…" : sub.status === "marked" ? "Update feedback" : "Return to student"}
          </Btn>
          {sub.status === "marked" && sub.markedAt && <p className="mt-2 text-center text-xs text-navy">Returned {fmtRelative(sub.markedAt, now)}</p>}
        </div>
      </div>
    </div>
  );
}

type Tab = "queue" | "returned" | "all";

function Submissions() {
  const { db, now } = useTeacher();
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>("queue");
  const [who, setWho] = useState("all");
  const [openId, setOpenId] = useState<string | null>(params.get("open"));

  const subs = db.submissions.filter((x) => who === "all" || x.studentId === who);
  const queue = subs
    .filter((x) => x.status === "submitted")
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  const returned = subs
    .filter((x) => x.status === "marked")
    .sort((a, b) => new Date(b.markedAt!).getTime() - new Date(a.markedAt!).getTime());
  const all = [...subs].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  const list = tab === "queue" ? queue : tab === "returned" ? returned : all;

  const open = db.submissions.find((x) => x.id === openId) ?? null;
  const openA = open && db.assignments.find((a) => a.id === open.assignmentId);
  const openSt = open && db.students.find((x) => x.id === open.studentId);
  // step through the list on screen (opened from elsewhere: just this one)
  const at = open ? list.findIndex((x) => x.id === open.id) : -1;
  const prev = at > 0 ? list[at - 1] : null;
  const next = at >= 0 && at < list.length - 1 ? list[at + 1] : null;
  const close = () => {
    setOpenId(null);
    if (params.get("open")) router.replace("/portal/teacher/submissions/", { scroll: false });
  };
  // after returning one from "To mark", go straight to the next
  const afterReturn = () => (tab === "queue" && next ? setOpenId(next.id) : close());

  return (
    <>
      <PageHeader title="Submissions" />

      <div className="mb-5">
        <Picker
          label="Student"
          value={who}
          onChange={setWho}
          options={[{ value: "all", label: "All students" }, ...db.students.map((s) => ({ value: s.id, label: s.name }))]}
        />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "queue", label: "To mark", count: queue.length },
          { value: "returned", label: "Returned", count: returned.length },
          { value: "all", label: "All", count: all.length },
        ]}
      />

      <div className="mt-4">
        <Table
          head={[{ label: "Student" }, { label: "Assignment" }, { label: "Submitted" }, { label: "Status" }, { label: "Score", align: "right" }]}
        >
          {list.length === 0 ? (
            <EmptyRow cols={5}>
              {tab === "queue" ? "Nothing to mark. New work appears here the moment a student hands it in." : "Nothing here yet."}
            </EmptyRow>
          ) : (
            list.map((x) => {
              const st = db.students.find((s) => s.id === x.studentId);
              const a = db.assignments.find((y) => y.id === x.assignmentId);
              if (!st || !a) return null;
              const left = new Date(x.submittedAt).getTime() + 24 * HOUR - now;
              return (
                <RowLink key={x.id} onClick={() => setOpenId(x.id)}>
                  <Td className="whitespace-nowrap font-medium text-navy">{st.name}</Td>
                  <Td>{a.title}</Td>
                  <Td className="whitespace-nowrap" >
                    <span title={`${fmtDate(x.submittedAt)}, ${fmtTime(x.submittedAt)}`}>{fmtRelative(x.submittedAt, now)}</span>
                  </Td>
                  <Td>
                    {x.status === "marked" ? (
                      <Status tone="done">Returned</Status>
                    ) : left < 0 ? (
                      <Status tone="attention">Late by {fmtDuration(-left)}</Status>
                    ) : left < 6 * HOUR ? (
                      <Status tone="attention">{fmtDuration(left)} left</Status>
                    ) : (
                      <Status>{fmtDuration(left)} left</Status>
                    )}
                  </Td>
                  <Td align="right" className="whitespace-nowrap tabular-nums">
                    {x.status === "marked" ? (
                      <span className="font-semibold text-navy">
                        {x.marks} <span className="font-normal text-navy">/ {a.maxMarks}</span>
                      </span>
                    ) : (
                      <span className="font-medium text-navy underline decoration-gold decoration-2 underline-offset-4">Mark</span>
                    )}
                  </Td>
                </RowLink>
              );
            })
          )}
        </Table>
      </div>

      <Modal
        open={!!open}
        onClose={close}
        full
        eyebrow={openA ? `${openA.title} · ${openA.kind}` : undefined}
        title={openSt?.name ?? ""}
        actions={
          at >= 0 && list.length > 1 ? (
            <div className="hidden items-center gap-1 md:flex">
              <button type="button" aria-label="Previous" disabled={!prev} onClick={() => prev && setOpenId(prev.id)} className={navBtn}>
                <ChevronLeft size={16} />
              </button>
              <span className="px-1 text-[13px] font-semibold tabular-nums text-navy">
                {at + 1} of {list.length}
              </span>
              <button type="button" aria-label="Next" disabled={!next} onClick={() => next && setOpenId(next.id)} className={navBtn}>
                <ChevronRight size={16} />
              </button>
            </div>
          ) : null
        }
      >
        {open && <MarkForm key={open.id} sub={open} onReturned={afterReturn} />}
      </Modal>
    </>
  );
}

export default function TeacherSubmissions() {
  return (
    <Suspense>
      <Submissions />
    </Suspense>
  );
}
