"use client";

import { useEffect, useState } from "react";
import { Download, UserPlus } from "lucide-react";
import { attendancePct, averagePct, cohortOf } from "@/lib/portal/selectors";
import { useTeacher } from "@/lib/portal/store";
import { exportAttendance, exportGrades } from "@/lib/portal/export";
import { predictGrade } from "@/lib/portal/insights";
import { Btn, EmptyRow, Modal, PageHeader, RowLink, Status, Table, Td } from "@/components/portal/ui";
import { AddStudent, ArchivedStudent, PendingStudent, StudentProfile } from "@/components/portal/student-profile";

export default function TeacherStudents() {
  const { db, me, now } = useTeacher();
  const teacherName = (cohortId: string) =>
    db.teachers.find((t) => t.id === db.cohorts.find((c) => c.id === cohortId)?.teacherId)?.name ?? "Unassigned";
  const [openId, setOpenId] = useState<string | null>(null);
  // /portal/teacher/students/?open=<student id> opens that profile (links from the dashboard)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("open");
    if (!id) return;
    setOpenId(id);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  const [setupId, setSetupId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [archivedId, setArchivedId] = useState<string | null>(null);
  const archivedOpen = db.archived.find((c) => c.id === archivedId);

  const students = [...db.students].sort((a, b) => a.name.localeCompare(b.name));
  const open = db.students.find((s) => s.id === openId) ?? null;
  const waiting = db.cohorts.filter((c) => !db.students.some((s) => s.cohortId === c.id));

  return (
    <>
      <PageHeader
        title="Students"
        actions={
          <>
            <Btn variant="outline" onClick={() => exportGrades(db)}>
              <Download size={15} /> Grades
            </Btn>
            <Btn variant="outline" onClick={() => exportAttendance(db, now)}>
              <Download size={15} /> Attendance
            </Btn>
            <Btn variant="navy" onClick={() => setAdding(true)}>
              <UserPlus size={15} /> Add student
            </Btn>
          </>
        }
      />

      <Table
        minWidth={720}
        head={[
          { label: "Student" },
          { label: "Course" },
          { label: "Attendance", align: "right" },
          { label: "Average", align: "right" },
          { label: "Predicted", align: "right" },
          { label: "Target", align: "right" },
        ]}
      >
        {students.length === 0 && waiting.length === 0 ? (
          <EmptyRow cols={6}>No students yet.</EmptyRow>
        ) : (
          <>
            {students.map((s) => {
              const avg = averagePct(db, s.id);
              const c = cohortOf(db, s.cohortId);
              return (
                <RowLink key={s.id} onClick={() => setOpenId(s.id)}>
                  <Td>
                    <span className="block font-medium text-navy">{s.name}</span>
                    <span className="block text-[12px] text-navy">{s.email}</span>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {[c.board, c.subject].filter(Boolean).join(" · ") || "—"}
                    {me.isAdmin && <span className="block text-[12px] text-navy">Teacher: {teacherName(c.id)}</span>}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {attendancePct(db, s.id, s.cohortId, now)}%
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {avg !== null ? `${avg}%` : "–"}
                  </Td>
                  <Td align="right" className="font-semibold text-navy">
                    {predictGrade(db, s, now)?.grade ?? "–"}
                  </Td>
                  <Td align="right">{s.target || "–"}</Td>
                </RowLink>
              );
            })}
            {waiting.map((c) => (
              <RowLink key={c.id} onClick={() => setSetupId(c.id)}>
                <Td>
                  <span className="block font-medium text-navy">{c.name}</span>
                  <span className="block text-[12px] text-navy">Join code {c.joinCode}</span>
                </Td>
                <Td className="whitespace-nowrap">
                  {[c.board, c.subject].filter(Boolean).join(" · ") || "—"}
                  {me.isAdmin && <span className="block text-[12px] text-navy">Teacher: {teacherName(c.id)}</span>}
                </Td>
                <Td colSpan={4} align="right">
                  <Status tone="attention">Not joined yet</Status>
                </Td>
              </RowLink>
            ))}
          </>
        )}
      </Table>

      {db.archived.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-[13px] font-semibold text-navy">Archived</h2>
          <Table minWidth={480} head={[{ label: "Student" }, { label: "Course" }]}>
            {db.archived.map((c) => (
              <RowLink key={c.id} onClick={() => setArchivedId(c.id)}>
                <Td className="font-medium text-navy">{c.name}</Td>
                <Td className="whitespace-nowrap">{[c.board, c.subject].filter(Boolean).join(" · ") || "—"}</Td>
              </RowLink>
            ))}
          </Table>
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpenId(null)} title={open?.name ?? ""}>
        {open && <StudentProfile key={open.id} s={open} onArchived={() => setOpenId(null)} />}
      </Modal>
      <Modal
        open={!!setupId}
        onClose={() => setSetupId(null)}
        eyebrow="Not joined yet"
        title={db.cohorts.find((c) => c.id === setupId)?.name ?? ""}
      >
        {setupId && (
          <PendingStudent
            cohortId={setupId}
            name={db.cohorts.find((c) => c.id === setupId)?.name ?? "this student"}
            onArchived={() => setSetupId(null)}
          />
        )}
      </Modal>
      <Modal open={!!archivedOpen} onClose={() => setArchivedId(null)} eyebrow="Archived" title={archivedOpen?.name ?? ""}>
        {archivedOpen && <ArchivedStudent cohortId={archivedOpen.id} name={archivedOpen.name} onDone={() => setArchivedId(null)} />}
      </Modal>
      <Modal open={adding} onClose={() => setAdding(false)} wide title="Add a student">
        {adding && <AddStudent onClose={() => setAdding(false)} />}
      </Modal>
    </>
  );
}
