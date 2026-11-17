/**
 * Made-up data for looking at the signed-in screens during local development
 * (/portal/?demo=teacher or ?demo=student). Everyone here is fictional.
 * Only imported when NODE_ENV is "development", so it never ships.
 */
import type { Snapshot } from "./data";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function demoSnapshot(role: "teacher" | "student"): Snapshot {
  const now = Date.now();
  const at = (ms: number) => new Date(now + ms).toISOString();
  /** today (or +days) at a local hour */
  const day = (days: number, hour: number, minute = 0) => {
    const d = new Date(now + days * DAY);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const members: Snapshot["members"] = [
    { id: 1, email: "amna.rauf@example.com", role: "teacher", full_name: "Amna Rauf", title: "Lead teacher", plan: null, cohort_id: null, predicted: null, target: null, is_admin: true },
    { id: 2, email: "bilal.hashmi@example.com", role: "teacher", full_name: "Bilal Hashmi", title: "Economics teacher", plan: null, cohort_id: null, predicted: null, target: null, is_admin: false },
    { id: 11, email: "zara.malik@example.com", role: "student", full_name: "Zara Malik", title: null, plan: "Core", cohort_id: 101, predicted: "6", target: "7", is_admin: false },
    { id: 12, email: "omar.sheikh@example.com", role: "student", full_name: "Omar Sheikh", title: null, plan: "Core", cohort_id: 102, predicted: "A", target: "A*", is_admin: false },
    { id: 13, email: "hania.qureshi@example.com", role: "student", full_name: "Hania Qureshi", title: null, plan: "Elite", cohort_id: 103, predicted: "", target: "", is_admin: false },
  ];
  const cohorts: Snapshot["cohorts"] = [
    { id: 101, name: "Zara Malik", board: "IB Diploma", subject: "Economics", meet_url: "https://meet.google.com/abc-defg-hij", join_code: "K7QM-2XPD", teacher_id: 1, archived_at: null },
    { id: 102, name: "Omar Sheikh", board: "A Level", subject: "Economics & Business", meet_url: "https://meet.google.com/klm-nopq-rst", join_code: "T4WN-8HBC", teacher_id: 2, archived_at: null },
    { id: 103, name: "Hania Qureshi", board: "IGCSE", subject: "Business", meet_url: null, join_code: "R9FZ-3JKV", teacher_id: 1, archived_at: null },
    { id: 104, name: "Daniyal Farooq", board: "O Level", subject: "Economics", meet_url: null, join_code: "M2CY-6GTE", teacher_id: 1, archived_at: null },
    { id: 105, name: "Sana Iqbal", board: "IB Diploma", subject: "Economics", meet_url: null, join_code: "P5LD-7RWA", teacher_id: 1, archived_at: at(-20 * DAY) },
  ];
  const timetable: Snapshot["timetable"] = [
    { cohort_id: 101, weekday: 1, start_time: "18:00:00", duration_min: 60 },
    { cohort_id: 101, weekday: 4, start_time: "17:30:00", duration_min: 90 },
    { cohort_id: 102, weekday: 2, start_time: "19:00:00", duration_min: 60 },
    { cohort_id: 103, weekday: 3, start_time: "16:00:00", duration_min: 60 },
    { cohort_id: 103, weekday: 6, start_time: "11:00:00", duration_min: 75 },
  ];

  let sid = 0;
  const cls = (cohort: number, start: string, minutes: number, attended?: number, extra: Partial<Snapshot["sessions"][number]> = {}) => ({
    id: ++sid,
    cohort_id: cohort,
    title: cohort === 103 ? "Business class" : "Economics class",
    strand: null,
    unit: null,
    starts_at: start,
    duration_min: minutes,
    meet_url: null,
    recording_url: null,
    attendance: attended ? { [String(attended)]: true } : {},
    ...extra,
  });
  const sessions: Snapshot["sessions"] = [
    cls(101, day(-9, 18), 60, 11, { unit: "Elasticities", recording_url: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view" }),
    cls(101, day(-6, 17, 30), 90, 11, { unit: "Market failure" }),
    cls(101, day(-2, 18), 60),
    cls(102, day(-8, 19), 60, 12, { unit: "Theory of the firm" }),
    cls(102, day(-1, 19), 60, 12),
    cls(103, day(-3, 16), 60, 13),
    cls(101, at(-20 * 60_000), 60, 11, { unit: "Government intervention" }), // live now
    cls(102, at(3 * HOUR), 60),
    cls(103, day(1, 16), 60),
    cls(101, day(2, 17, 30), 90),
    cls(103, day(3, 11), 75),
    cls(102, day(5, 19), 60),
    cls(101, day(6, 18), 60),
    cls(101, day(9, 17, 30), 90),
  ];

  const folders: Snapshot["folders"] = [101, 102, 103, 104].flatMap((c, i) =>
    ["Notes", "Past papers", "Recordings", "Slides"].map((name, j) => ({ id: 1000 + i * 10 + j, cohort_id: c, parent_id: null, name }))
  );
  const resources: Snapshot["resources"] = [
    { id: 1, cohort_id: 101, folder_id: 1000, session_id: null, title: "Elasticities — summary notes.pdf", type: "Notes", strand: null, unit: "Notes", drive_url: null, drive_file_id: "demo-file-1", mime_type: "application/pdf", size_bytes: 840_000, created_at: at(-8 * DAY) },
    { id: 2, cohort_id: 101, folder_id: 1001, session_id: null, title: "May 2025 Paper 1 (HL).pdf", type: "Past paper", strand: null, unit: "Past papers", drive_url: null, drive_file_id: "demo-file-2", mime_type: "application/pdf", size_bytes: 2_300_000, created_at: at(-5 * DAY) },
    { id: 3, cohort_id: 101, folder_id: 1002, session_id: 1, title: "Class recording: Economics class", type: "Recording", strand: null, unit: "Elasticities", drive_url: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view", drive_file_id: null, mime_type: null, size_bytes: null, created_at: at(-9 * DAY) },
    { id: 4, cohort_id: 102, folder_id: 1013, session_id: null, title: "Market structures — slides.pptx", type: "Slides", strand: null, unit: "Slides", drive_url: null, drive_file_id: "demo-file-4", mime_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation", size_bytes: 5_600_000, created_at: at(-3 * DAY) },
  ];

  const asg = (id: number, cohort: number, title: string, kind: Snapshot["assignments"][number]["kind"], unit: string, due: string, max: number, limit: number | null = null): Snapshot["assignments"][number] => ({
    id, cohort_id: cohort, title, kind, strand: null, unit,
    brief: "Use the mark scheme structure we practised: define, explain with a diagram, apply to the case, then evaluate both sides before a judgement.",
    due_at: due, max_marks: max, time_limit_min: limit,
    attachment_url: null, attachment_file_id: id % 2 ? "demo-paper-" + id : null, attachment_name: id % 2 ? "question-paper.pdf" : null, attachment_mime: id % 2 ? "application/pdf" : null,
  });
  const assignments: Snapshot["assignments"] = [
    asg(1, 101, "Evaluate the case for a minimum wage", "Essay", "Labour market", at(-12 * DAY), 15),
    asg(2, 101, "Paper 1 practice: market failure", "Past paper", "Market failure", at(-4 * DAY), 25),
    asg(3, 101, "Elasticities problem set", "Problem set", "Elasticities", at(20 * HOUR), 20),
    asg(4, 101, "Explain how indirect taxes affect stakeholders", "Essay", "Government intervention", at(6 * DAY), 10),
    asg(5, 102, "Monopoly vs perfect competition", "Essay", "Theory of the firm", at(-2 * DAY), 25),
    asg(6, 102, "Break-even analysis worksheet", "Problem set", "Costs and revenue", at(4 * DAY), 30),
    asg(7, 103, "Marketing mix case study", "Past paper", "Marketing", at(2 * DAY), 20),
    asg(8, 101, "Unit 2 test: market failure", "Assessment", "Market failure", at(2 * DAY), 20, 45),
    asg(9, 102, "Mid-term: theory of the firm", "Assessment", "Theory of the firm", at(-3 * DAY), 30, 60),
    asg(10, 103, "Quiz: business objectives", "Assessment", "Business objectives", at(5 * DAY), 15, 30),
  ];
  const sub = (id: number, assignment: number, member: number, when: string, marks: number | null, extra: Partial<Snapshot["submissions"][number]> = {}): Snapshot["submissions"][number] => ({
    id, assignment_id: assignment, member_id: member, file_name: "my-answer.pdf", file_size: 1_240_000, file_path: null, drive_file_id: "demo-sub-" + id,
    answer_text: null, note: null, submitted_at: when,
    marks, feedback: marks === null ? null : "A clear, well-structured answer with accurate diagrams. To reach the top band, weigh the short-run and long-run effects before your judgement.",
    strengths: marks === null ? null : ["Accurate, fully labelled diagrams", "Good use of the case data"],
    improvements: marks === null ? null : ["Evaluate both sides before concluding", "Define key terms in the first paragraph"],
    marked_at: marks === null ? null : new Date(new Date(when).getTime() + 20 * HOUR).toISOString(),
    ...extra,
  });
  const submissions: Snapshot["submissions"] = [
    sub(1, 1, 11, at(-13 * DAY), 11),
    sub(2, 2, 11, at(-4.5 * DAY), 19, { note: "I wasn't sure about part (b)." }),
    sub(3, 3, 11, at(-3 * HOUR), null),
    sub(4, 5, 12, at(-2.2 * DAY), 21),
    sub(5, 9, 12, at(-3.1 * DAY), null, { file_name: null, file_size: null, drive_file_id: null, answer_text: "A monopolist is a price maker because it faces the market demand curve…" }),
  ];

  const snap: Snapshot = {
    me: role === "teacher" ? 1 : 11,
    members,
    cohorts,
    timetable,
    sessions,
    resources,
    folders,
    assignments,
    submissions,
    announcements: [
      { id: 1, cohort_id: null, title: "Mock exam week starts Monday", body: "Timetables are on your calendar. Bring a calculator and arrive five minutes early.", created_at: at(-1 * DAY) },
      { id: 2, cohort_id: 101, title: "Extra revision class on Saturday", body: "We will go through Paper 1 timing and evaluation technique.", created_at: at(-5 * DAY) },
      { id: 3, cohort_id: 102, title: "Homework deadline moved", body: "The break-even worksheet is now due on Friday.", created_at: at(-9 * DAY) },
    ],
    mastery: [
      { member_id: 11, unit: "Elasticities", strand: "Micro", score: 82, fix: "Practise cross-price calculations" },
      { member_id: 11, unit: "Market failure", strand: "Micro", score: 64, fix: "Label welfare loss areas on every diagram" },
      { member_id: 11, unit: "Inflation", strand: "Macro", score: 48, fix: "Revise causes: demand-pull versus cost-push" },
    ],
    requests: [
      { id: 1, session_id: 10, member_id: 11, kind: "reschedule", proposed_start: day(3, 18), note: "School trip that afternoon", status: "pending", created_at: at(-5 * HOUR) },
      { id: 2, session_id: 12, member_id: 12, kind: "cancel", proposed_start: null, note: null, status: "pending", created_at: at(-26 * HOUR) },
    ],
    attempts: [{ assignment_id: 9, member_id: 12, started_at: at(-3.14 * DAY), ends_at: at(-3.1 * DAY) }],
    questions: [
      { assignment_id: 8, body: "1. Define negative externality. [2]\n2. Using a diagram, explain why a negative production externality leads to market failure. [10]\n3. Evaluate a carbon tax as a solution. [8]" },
      { assignment_id: 9, body: "1. Explain why a monopolist is a price maker. [10]\n2. Evaluate whether monopoly is always against the public interest. [20]" },
    ],
  };
  if (role === "teacher") return snap;

  // a student only ever receives their own class
  const mine = 101;
  const own = <T extends { cohort_id: number | null }>(rows: T[]) => rows.filter((r) => r.cohort_id === mine);
  const myAssignments = new Set(own(snap.assignments).map((a) => a.id));
  const mySessions = new Set(own(snap.sessions).map((s) => s.id));
  return {
    ...snap,
    members: snap.members.filter((m) => m.id === 11),
    cohorts: snap.cohorts.filter((c) => c.id === mine),
    timetable: own(snap.timetable),
    sessions: own(snap.sessions),
    resources: own(snap.resources),
    folders: own(snap.folders),
    assignments: own(snap.assignments),
    announcements: snap.announcements.filter((a) => a.cohort_id === null || a.cohort_id === mine),
    submissions: snap.submissions.filter((x) => x.member_id === 11),
    mastery: snap.mastery.filter((m) => m.member_id === 11),
    requests: snap.requests.filter((r) => r.member_id === 11 && mySessions.has(r.session_id)),
    attempts: snap.attempts.filter((t) => t.member_id === 11),
    questions: snap.questions.filter((q) => myAssignments.has(q.assignment_id) && snap.attempts.some((t) => t.member_id === 11 && t.assignment_id === q.assignment_id)),
  };
}
