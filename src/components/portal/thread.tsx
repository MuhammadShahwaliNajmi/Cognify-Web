"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUp, Bookmark, BookmarkPlus, MessageCircle, Trash2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { usePortal } from "@/lib/portal/store";
import { fmtRelative } from "@/lib/portal/format";
import { cn } from "@/lib/utils";
import { Label } from "./ui";

type Comment = { id: number; author_id: number; body: string; created_at: string };

/**
 * Private comments on one piece of work, between a student and their teacher (the
 * same threads as the app). Only those two can see it; each comment notifies the other.
 */
export function WorkThread({ assignmentId, studentId, className }: { assignmentId: string; studentId: string; className?: string }) {
  const { db, me, now, parent, toast } = usePortal();
  const [list, setList] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchRows = useCallback(async (): Promise<Comment[]> => {
    const sb = getSupabase();
    if (!sb) return [];
    const { data } = await sb
      .from("work_comments")
      .select("id, author_id, body, created_at")
      .eq("assignment_id", Number(assignmentId))
      .eq("student_id", Number(studentId))
      .order("created_at");
    return (data as Comment[]) ?? [];
  }, [assignmentId, studentId]);

  useEffect(() => {
    let alive = true;
    fetchRows().then((rows) => alive && setList(rows));
    return () => {
      alive = false;
    };
  }, [fetchRows]);

  const nameOf = (id: number) =>
    String(id) === me?.id ? "You" : (db.teachers.find((t) => t.id === String(id))?.name ?? db.students.find((s) => s.id === String(id))?.name ?? "Teacher");

  const send = async () => {
    const body = draft.trim();
    const sb = getSupabase();
    if (!body || !me || !sb) return;
    setBusy(true);
    const { error } = await sb.from("work_comments").insert({ assignment_id: Number(assignmentId), student_id: Number(studentId), author_id: Number(me.id), body });
    setBusy(false);
    if (error) return toast(`Couldn't send: ${error.message}`);
    setDraft("");
    setList(await fetchRows());
  };

  return (
    <div className={cn("rounded-2xl border border-navy/12 p-4", className)}>
      <Label>Private comments</Label>
      <div className="mt-3 space-y-3">
        {list === null ? null : list.length === 0 ? (
          <p className="flex items-center gap-2 text-[13px] font-medium text-navy">
            <MessageCircle size={14} /> No comments yet.
          </p>
        ) : (
          list.map((c) => {
            const mine = String(c.author_id) === me?.id;
            return (
              <div key={c.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                <p
                  className={cn(
                    "max-w-[88%] whitespace-pre-wrap rounded-[18px] px-3.5 py-2.5 text-[14px] leading-relaxed",
                    mine ? "rounded-br-md bg-navy-deep text-white" : "rounded-bl-md border border-navy/10 bg-white text-navy"
                  )}
                >
                  {c.body}
                </p>
                <span className="mx-1.5 mt-1 text-[12px] text-navy">
                  {nameOf(c.author_id)} · {fmtRelative(c.created_at, now)}
                </span>
              </div>
            );
          })
        )}
      </div>
      {!parent && (
      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
          rows={2}
          maxLength={2000}
          placeholder="Write a private comment"
          className="min-h-[46px] flex-1 resize-y rounded-xl border border-navy/15 bg-white px-3 py-2.5 text-[14px] text-navy outline-none placeholder:text-navy/55 focus:border-gold"
        />
        <button
          type="button"
          aria-label="Send comment"
          disabled={!draft.trim() || busy}
          onClick={send}
          className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-navy-deep text-gold transition-opacity disabled:opacity-40 focus-gold"
        >
          <ArrowUp size={18} />
        </button>
      </div>
      )}
    </div>
  );
}

type Saved = { id: number; body: string };

/** A teacher's saved feedback phrases (shared with the app): insert one, or save what's typed. */
export function CommentBank({ value, onInsert }: { value: string; onInsert: (text: string) => void }) {
  const { toast } = usePortal();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Saved[] | null>(null);

  const fetchItems = useCallback(async (): Promise<Saved[]> => {
    const sb = getSupabase();
    if (!sb) return [];
    const { data } = await sb.from("comment_bank").select("id, body").order("created_at", { ascending: false });
    return (data as Saved[]) ?? [];
  }, []);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchItems().then((rows) => alive && setItems(rows));
    return () => {
      alive = false;
    };
  }, [open, fetchItems]);

  const save = async () => {
    const sb = getSupabase();
    const text = value.trim().split("\n").filter(Boolean).pop()?.trim();
    if (!sb || !text) return;
    const { error } = await sb.from("comment_bank").insert({ body: text.slice(0, 500) });
    if (error) return toast(`Couldn't save: ${error.message}`);
    toast("Saved to your comment bank");
    if (open) setItems(await fetchItems());
  };

  return (
    <div className="mt-1.5">
      <div className="flex gap-3 text-[12px] font-semibold text-navy">
        <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 hover:text-gold">
          <Bookmark size={12} /> Saved
        </button>
        {value.trim() && (
          <button type="button" onClick={save} className="inline-flex items-center gap-1 hover:text-gold">
            <BookmarkPlus size={12} /> Save to bank
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-gold/50 bg-white p-2">
          {items === null ? null : items.length === 0 ? (
            <p className="px-1.5 py-1 text-[12px] text-navy">Nothing saved yet. Type a phrase above and choose Save to bank.</p>
          ) : (
            items.map((it) => (
              <div key={it.id} className="flex items-start gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onInsert(it.body);
                    setOpen(false);
                  }}
                  className="flex-1 rounded-lg px-2 py-1.5 text-left text-[13px] text-navy hover:bg-gold/15"
                >
                  {it.body}
                </button>
                <button
                  type="button"
                  aria-label="Delete this saved comment"
                  onClick={async () => {
                    await getSupabase()?.from("comment_bank").delete().eq("id", it.id);
                    setItems(await fetchItems());
                  }}
                  className="mt-1 grid h-6 w-6 place-items-center rounded text-navy hover:text-gold"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
