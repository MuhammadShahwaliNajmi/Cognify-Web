"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { usePortal } from "@/lib/portal/store";
import { Btn, fieldCls } from "./ui";

/** Teacher: parents who can sign in with their own Google email and see this student's portal (read-only). */
export function ParentAccess({ studentId }: { studentId: string }) {
  const { toast } = usePortal();
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const load = useCallback(async () => {
    const { data } = (await getSupabase()?.from("parent_logins").select("email").eq("student_id", Number(studentId))) ?? { data: null };
    return ((data as { email: string }[] | null) ?? []).map((r) => r.email);
  }, [studentId]);
  useEffect(() => {
    let alive = true;
    load().then((e) => alive && setEmails(e));
    return () => {
      alive = false;
    };
  }, [load]);
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.trim());
  return (
    <div className="mt-6 rounded-2xl border border-navy/12 p-5">
      <p className="text-[15px] font-semibold text-navy">Parent access</p>
      <ul className="mt-2 space-y-1.5">
        {emails.map((e) => (
          <li key={e} className="flex items-center justify-between gap-2 text-[14px] text-navy">
            {e}
            <button
              type="button"
              aria-label={`Remove ${e}`}
              onClick={async () => {
                await getSupabase()?.from("parent_logins").delete().eq("email", e);
                setEmails(await load());
              }}
              className="grid h-9 w-9 place-items-center rounded text-navy hover:text-gold"
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={emails.length ? "Another parent's Google email" : "Parent's Google email"}
          inputMode="email"
          className={fieldCls + " !mt-0"}
        />
        <Btn
          variant="navy"
          disabled={!ok}
          onClick={async () => {
            const { error } = (await getSupabase()
              ?.from("parent_logins")
              .insert({ email: draft.trim().toLowerCase(), student_id: Number(studentId) })) ?? { error: null };
            if (error) return toast(error.code === "23505" ? "That email already has parent access." : `Couldn't add: ${error.message}`);
            setDraft("");
            setEmails(await load());
            toast("Added. They sign in at cognifypk.com/portal with that Google account.");
          }}
        >
          <UserPlus size={14} /> Add
        </Btn>
      </div>
    </div>
  );
}
