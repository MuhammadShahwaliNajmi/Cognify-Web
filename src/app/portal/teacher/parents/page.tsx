"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, UserPlus, UsersRound, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useTeacher } from "@/lib/portal/store";
import { fmtDate } from "@/lib/portal/format";
import { Btn, Empty, Field, Modal, PageHeader, Picker, Table, Td, fieldCls } from "@/components/portal/ui";
import { StudentCell } from "@/components/portal/student-cell";

type ParentRow = { email: string; student_id: number; created_at: string };

/** Parents: who can sign in to see each student's portal (read-only). Add or remove them here. */
export default function TeacherParents() {
  const { db, toast } = useTeacher();
  const [rows, setRows] = useState<ParentRow[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ParentRow | null>(null);
  const [who, setWho] = useState("all");

  const fetchRows = useCallback(async (): Promise<ParentRow[]> => {
    const sb = getSupabase();
    if (!sb) return [];
    const { data } = await sb.from("parent_logins").select("email, student_id, created_at").order("created_at", { ascending: false });
    return (data as ParentRow[]) ?? [];
  }, []);
  useEffect(() => {
    let alive = true;
    fetchRows().then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, [fetchRows]);

  const studentOf = (id: number) => db.students.find((s) => s.id === String(id));
  const students = [...db.students].sort((a, b) => a.name.localeCompare(b.name));
  const list = (rows ?? []).filter((r) => studentOf(r.student_id) && (who === "all" || String(r.student_id) === who));

  return (
    <>
      <PageHeader
        title="Parents"
        actions={
          <Btn variant="navy" onClick={() => setAdding(true)}>
            <UserPlus size={15} /> Add a parent
          </Btn>
        }
      />

      <div className="mb-5">
        <Picker
          label="Student"
          value={who}
          onChange={setWho}
          options={[{ value: "all", label: "All students" }, ...students.map((s) => ({ value: s.id, label: s.name }))]}
        />
      </div>

      {rows !== null && list.length === 0 ? (
        <Empty
          icon={<UsersRound size={20} />}
          title="No parents yet"
          text="Add a parent's Google email. They sign in at cognifypk.com/portal and see their child's classes, work and marks."
          action={
            <Btn variant="gold" onClick={() => setAdding(true)}>
              <UserPlus size={15} /> Add a parent
            </Btn>
          }
        />
      ) : (
        <Table head={[{ label: "Student" }, { label: "Parent's email" }, { label: "Added" }, { label: " ", align: "right" }]}>
          {list.map((r) => {
            const st = studentOf(r.student_id)!;
            return (
              <tr key={r.email}>
                <Td>
                  <StudentCell db={db} cohortId={st.cohortId} name={st.name} />
                </Td>
                <Td className="break-all text-navy">{r.email}</Td>
                <Td className="whitespace-nowrap">{fmtDate(r.created_at)}</Td>
                <Td align="right">
                  <button
                    type="button"
                    aria-label={`Remove ${r.email}`}
                    onClick={() => setRemoving(r)}
                    className="grid h-10 w-10 place-items-center rounded-md text-navy hover:bg-navy/[0.06] focus-gold"
                  >
                    <Trash2 size={14} />
                  </button>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a parent">
        {adding && (
          <AddParent
            students={students.map((s) => ({ value: s.id, label: s.name }))}
            initial={who === "all" ? "" : who}
            onAdded={async () => {
              setAdding(false);
              setRows(await fetchRows());
            }}
          />
        )}
      </Modal>

      <Modal open={!!removing} onClose={() => setRemoving(null)} title="Remove this parent?">
        {removing && (
          <div className="space-y-5">
            <p className="text-[15px] font-medium text-navy">
              {removing.email} will no longer see {studentOf(removing.student_id)?.name ?? "this student"}&apos;s portal.
            </p>
            <div className="flex gap-2.5">
              <Btn
                variant="navy"
                onClick={async () => {
                  const { error } = (await getSupabase()?.from("parent_logins").delete().eq("email", removing.email)) ?? { error: null };
                  if (error) toast(`Couldn't remove: ${error.message}`);
                  else toast("Parent removed");
                  setRemoving(null);
                  setRows(await fetchRows());
                }}
              >
                <Trash2 size={14} /> Remove
              </Btn>
              <Btn variant="ghost" onClick={() => setRemoving(null)}>
                Keep
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function AddParent({ students, initial, onAdded }: { students: { value: string; label: string }[]; initial: string; onAdded: () => void }) {
  const { toast } = useTeacher();
  const [studentId, setStudentId] = useState(initial || students[0]?.value || "");
  // as many parents as the family needs (mother, father, guardian…), each with their own Google email
  const [emails, setEmails] = useState([""]);
  const [busy, setBusy] = useState(false);
  const valid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const filled = emails.filter((e) => e.trim());
  const ok = studentId && filled.length > 0 && filled.every(valid);
  return (
    <div className="space-y-5">
      <Field label="Student">
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={fieldCls}>
          {students.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={emails.length > 1 ? "Parents' Google emails" : "Parent's Google email"}>
        <div className="space-y-2">
          {emails.map((e, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={e}
                onChange={(ev) => setEmails((xs) => xs.map((x, j) => (j === i ? ev.target.value : x)))}
                type="email"
                inputMode="email"
                autoComplete="off"
                aria-label={`Parent ${i + 1} email`}
                className={fieldCls + " !mt-0"}
              />
              {emails.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove parent ${i + 1}`}
                  onClick={() => setEmails((xs) => xs.filter((_, j) => j !== i))}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-navy hover:bg-navy/[0.06] focus-gold"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Btn variant="outline" onClick={() => setEmails((xs) => [...xs, ""])}>
          <Plus size={15} /> Another parent
        </Btn>
        <Btn
          variant="gold"
          disabled={!ok || busy}
          onClick={async () => {
            setBusy(true);
            const rows = Array.from(new Set(filled.map((e) => e.trim().toLowerCase()))).map((email) => ({
              email,
              student_id: Number(studentId),
            }));
            const { error } = (await getSupabase()?.from("parent_logins").insert(rows)) ?? { error: null };
            setBusy(false);
            if (error)
              return toast(error.code === "23505" ? "One of those emails already has parent access." : `Couldn't add: ${error.message}`);
            toast(
              rows.length > 1
                ? `${rows.length} parents added. They sign in at cognifypk.com/portal.`
                : "Added. They sign in at cognifypk.com/portal with that Google account.",
            );
            onAdded();
          }}
        >
          <UserPlus size={16} /> {busy ? "Adding…" : filled.length > 1 ? `Add ${filled.length} parents` : "Add parent"}
        </Btn>
      </div>
    </div>
  );
}
