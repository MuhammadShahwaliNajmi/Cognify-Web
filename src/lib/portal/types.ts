/**
 * Concept Lab portal — the data model as the screens see it.
 * data.ts loads it from Supabase (row-level security decides what each signed-in
 * user receives). IDs are the database bigint ids as strings.
 */

export type Role = "student" | "teacher";
export type Plan = "Lab" | "Core" | "Elite";
export type Strand = "Micro" | "Macro" | "Business";

export type Cohort = {
  id: string;
  name: string; // one-to-one cohorts are named after the student
  board: string; // "IB Diploma", "FA", "IEO"…
  subject: string; // "Economics", "Economics & Business"
  /** Standing Google Meet room for this cohort; a session may override it. */
  meetUrl: string;
  /** Visible to teachers (and to the student who already joined). */
  joinCode: string;
};

export type Student = {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  cohortId: string;
  predicted: string; // "" until a teacher sets it
  target: string;
};

export type Teacher = {
  id: string;
  name: string;
  email: string;
  title: string;
};

export type Session = {
  id: string;
  cohortId: string;
  title: string;
  /** null for timetable-generated classes until a teacher adds the topic */
  strand: Strand | null;
  unit: string | null;
  start: string; // ISO
  durationMin: number;
  meetUrl?: string;
  recordingUrl?: string; // Google Drive link once uploaded
  /** memberId → attended */
  attendance: Record<string, boolean>;
};

export type ResourceType =
  | "Slides"
  | "Notes"
  | "Summary sheet"
  | "Past paper"
  | "Essay structure"
  | "Recording"
  | "File";

export type Resource = {
  id: string;
  cohortId: string;
  title: string;
  type: ResourceType;
  strand: Strand | null;
  unit: string;
  driveUrl: string; // pasted link ("" if none)
  sessionId?: string; // set for a class's slides / recording
  addedAt: string; // ISO
  folderId?: string; // portal folder (none → the student's top level)
  driveFileId?: string; // uploaded file in storage
  mimeType?: string;
  sizeBytes?: number;
};

export type Folder = {
  id: string;
  cohortId: string;
  parentId: string | null;
  name: string;
};

export type AssignmentKind = "Essay" | "Past paper" | "Problem set" | "Assessment";

export type Assignment = {
  id: string;
  cohortId: string;
  title: string;
  kind: AssignmentKind;
  strand: Strand;
  unit: string;
  brief: string;
  dueAt: string; // ISO
  maxMarks: number;
  attachmentUrl?: string; // pasted link to the question paper
  attachmentFileId?: string; // uploaded question paper
  attachmentName?: string;
  attachmentMime?: string;
  /** set → a timed assessment: start before dueAt, then this many minutes */
  timeLimitMin?: number;
};

/** A student's run at a timed assessment. */
export type Attempt = { assignmentId: string; studentId: string; startedAt: string; endsAt: string };

export type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string; // ISO
  fileName: string;
  fileSize: string; // formatted, e.g. "1.2 MB"
  filePath?: string; // fallback uploads: private storage path
  driveFileId?: string; // stored file id
  answerText?: string; // typed answer (assessments)
  note?: string;
  status: "submitted" | "marked";
  marks?: number;
  feedback?: string;
  strengths?: string[];
  improvements?: string[];
  markedAt?: string;
};

export type Announcement = {
  id: string;
  cohortId: string | null; // null → everyone
  title: string;
  body: string;
  at: string; // ISO
};

export type Mastery = { unit: string; strand: Strand; score: number; fix: string };
export type GradePoint = { label: string; pct: number };

export type Progress = {
  studentId: string;
  history: GradePoint[]; // one point per marked piece of work, oldest first
  mastery: Mastery[];
};

export type ClassRequest = {
  id: string;
  sessionId: string;
  studentId: string;
  kind: "reschedule" | "cancel";
  proposedStart: string | null; // ISO, for reschedule
  note: string;
  status: "pending" | "approved" | "declined";
  createdAt: string; // ISO
};

/** The signed-in member, or null before they have joined a class. */
export type Auth = { role: Role; userId: string } | null;

export type DB = {
  cohorts: Cohort[];
  students: Student[];
  sessions: Session[];
  resources: Resource[];
  folders: Folder[];
  assignments: Assignment[];
  submissions: Submission[];
  announcements: Announcement[];
  progress: Progress[];
  requests: ClassRequest[];
  attempts: Attempt[];
  /** assessment questions, keyed by assignment id (students only see them once started) */
  questions: Record<string, string>;
};

export const EMPTY_DB: DB = {
  cohorts: [],
  students: [],
  sessions: [],
  resources: [],
  folders: [],
  assignments: [],
  submissions: [],
  announcements: [],
  progress: [],
  requests: [],
  attempts: [],
  questions: {},
};
