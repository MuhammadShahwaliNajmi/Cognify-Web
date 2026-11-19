"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff, Trash2, UserPlus } from "lucide-react";
import { useTeacher } from "@/lib/portal/store";
import type { Teacher } from "@/lib/portal/types";
import { Btn, EmptyRow, Field, Modal, PageHeader, Status, Table, Td, fieldCls } from "@/components/portal/ui";

function AddTeacher({ onDone }: { onDone: () => void }) {
  const { addTeacher, toast } = useTeacher();
  const [f, setF] = useState({ name: "", email: "", title: "", admin: false });
  const [busy, setBusy] = useState(false);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim());
  return (
    <div className="space-y-5">
      <Field label="Name">
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={fieldCls} />
      </Field>
      <Field label="Google email (they sign in with this)">
        <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} inputMode="email" className={fieldCls} />
      </Field>
      <Field label="Subject or title (optional)">
        <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Economics" className={fieldCls} />
      </Field>
      <Field label="Role">
        <select
          value={f.admin ? "admin" : "teacher"}
          onChange={(e) => setF({ ...f, admin: e.target.value === "admin" })}
          className={fieldCls}
        >
          <option value="teacher">Teacher (their own students)</option>
          <option value="admin">Admin (everyone, plus teachers)</option>
        </select>
      </Field>
      <Btn
        variant="gold"
        size="lg"
        disabled={!f.name.trim() || !emailOk || busy}
        onClick={async () => {
          setBusy(true);
          const ok = await addTeacher(f);
          setBusy(false);
          if (!ok) return;
          toast(`${f.name.trim()} can now sign in`);
          onDone();
        }}
      >
        <UserPlus size={16} /> {busy ? "Adding…" : "Add teacher"}
      </Btn>
    </div>
  );
}

export default function TeacherAccounts() {
  const { db, me, removeTeacher, setAdmin, toast } = useTeacher();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Teacher | null>(null);
  const [changing, setChanging] = useState<Teacher | null>(null);
  const [saving, setSaving] = useState(false);

  // admin only
  useEffect(() => {
    if (!me.isAdmin) router.replace("/portal/teacher/");
  }, [me.isAdmin, router]);
  if (!me.isAdmin) return null;

  const teachers = [...db.teachers].sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin) || a.name.localeCompare(b.name));
  const studentsOf = (t: Teacher) => db.cohorts.filter((c) => c.teacherId === t.id);
  const admins = teachers.filter((t) => t.isAdmin).length;
  const isMe = (t: Teacher) => t.id === me.id;

  return (
    <>
      <PageHeader
        title="Teachers"
        actions={
          <Btn variant="navy" onClick={() => setAdding(true)}>
            <UserPlus size={15} /> Add teacher
          </Btn>
        }
      />
      <Table
        minWidth={640}
        head={[{ label: "Teacher" }, { label: "Subject" }, { label: "Students" }, { label: "Role" }, { label: " ", align: "right" }]}
      >
        {teachers.length === 0 ? (
          <EmptyRow cols={5}>No teachers yet.</EmptyRow>
        ) : (
          teachers.map((t) => {
            const mine = studentsOf(t);
            return (
              <tr key={t.id}>
                <Td>
                  <span className="block font-medium text-navy">{t.name}</span>
                  <span className="block text-[12px] text-navy">{t.email}</span>
                </Td>
                <Td>{t.title || "—"}</Td>
                <Td>{mine.length ? mine.map((c) => c.name).join(", ") : "—"}</Td>
                <Td>{t.isAdmin ? <Status tone="done">Admin</Status> : <Status>Teacher</Status>}</Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-1.5">
                    {!(t.isAdmin && admins <= 1) && (
                      <Btn variant="outline" size="sm" onClick={() => setChanging(t)}>
                        {t.isAdmin ? <ShieldOff size={14} /> : <ShieldCheck size={14} />} {t.isAdmin ? "Remove admin" : "Make admin"}
                      </Btn>
                    )}
                    {!t.isAdmin && (
                      <button
                        type="button"
                        aria-label={`Remove ${t.name}`}
                        onClick={() => setRemoving(t)}
                        className="grid h-8 w-8 place-items-center rounded-md text-navy hover:bg-navy/[0.06] focus-gold"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
            );
          })
        )}
      </Table>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a teacher">
        {adding && <AddTeacher onDone={() => setAdding(false)} />}
      </Modal>

      <Modal
        open={!!changing}
        onClose={() => setChanging(null)}
        title={
          changing?.isAdmin
            ? `Remove ${isMe(changing) ? "your" : `${changing.name}'s`} admin access?`
            : `Make ${changing?.name ?? ""} an admin?`
        }
      >
        {changing && (
          <div className="space-y-5">
            <p className="text-[15px] text-navy">
              {changing.isAdmin
                ? isMe(changing)
                  ? "You will only see your own students and won't be able to manage teachers."
                  : `${changing.name} will only see their own students.`
                : `${changing.name} will see every student, add and remove teachers, and make other admins.`}
            </p>
            <div className="flex gap-2.5">
              <Btn
                variant="navy"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  const t = changing;
                  const ok = await setAdmin(t.id, !t.isAdmin);
                  setSaving(false);
                  setChanging(null);
                  if (ok) toast(t.isAdmin ? `${t.name} is no longer an admin` : `${t.name} is now an admin`);
                }}
              >
                {changing.isAdmin ? <ShieldOff size={14} /> : <ShieldCheck size={14} />} {changing.isAdmin ? "Remove admin" : "Make admin"}
              </Btn>
              <Btn variant="ghost" onClick={() => setChanging(null)}>
                Cancel
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!removing} onClose={() => setRemoving(null)} title={`Remove ${removing?.name ?? ""}?`}>
        {removing && (
          <div className="space-y-5">
            <p className="text-[15px] text-navy">
              They will no longer be able to sign in.
              {studentsOf(removing).length > 0 &&
                ` Their students (${studentsOf(removing)
                  .map((c) => c.name)
                  .join(", ")}) will be unassigned until you give them to another teacher.`}
            </p>
            <div className="flex gap-2.5">
              <Btn
                variant="navy"
                onClick={async () => {
                  if (await removeTeacher(removing.id)) toast(`${removing.name} removed`);
                  setRemoving(null);
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
