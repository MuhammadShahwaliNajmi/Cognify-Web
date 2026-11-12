import type { Metadata } from "next";
import { ADDRESS, COMPANY, CONTACT_EMAIL, LegalPage, type LegalSection } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of Service · Concept Lab",
  description: `The terms for using Concept Lab's classes, website and student portal, provided by ${COMPANY}.`,
};

const SECTIONS: LegalSection[] = [
  {
    heading: "About these terms",
    body: [
      `These terms apply to the classes, website (cognifypk.com) and student portal provided by ${COMPANY} ("Concept Lab", "we", "us"), ${ADDRESS}. By enrolling or using the portal you agree to them. If you are under 18, your parent or guardian must also agree to them on your behalf.`,
    ],
  },
  {
    heading: "Your account",
    body: [
      "Portal access is by invitation: we link your account to the Google email address you gave us when you enrolled. Keep your account to yourself. Don't share your sign-in, and don't let anyone else attend classes or submit work as you. Tell us straight away if you think someone else has used your account.",
    ],
  },
  {
    heading: "Plans, fees and the free trial",
    body: [
      "Our Lab, Core and Elite plans and their monthly fees are shown on our website. New students can try Concept Lab with a 7-day free trial. Fees, payment dates and any refund terms are those confirmed to you in writing when you enrol. If fees are not paid, we may pause access to classes and the portal until they are.",
      "Need-based and merit scholarships are awarded at our discretion and may come with conditions, such as regular attendance.",
    ],
  },
  {
    heading: "Classes and recordings",
    body: [
      "Live classes are held on Google Meet at the times shown in the portal. We may occasionally need to reschedule a class, and will tell you in advance where we can.",
      "Classes are recorded so that enrolled students can catch up. Recordings are for students of that cohort only. Please don't record, download or share classes yourself.",
    ],
  },
  {
    heading: "Behaviour and academic honesty",
    body: [
      "We expect every student to:",
      [
        "Be respectful to teachers and classmates, in classes and in the portal.",
        "Submit their own work. Copying, or submitting work written by someone else or by an AI tool as your own, is not allowed.",
        "Not share class links, recordings, notes, past papers or other course materials outside Concept Lab.",
        "Not try to access other students' information or interfere with the portal.",
      ],
      "If these rules are broken, we may suspend or end a student's access.",
    ],
  },
  {
    heading: "Our materials",
    body: [
      "All course materials, including slides, notes, summary sheets, essay structures, recordings and the portal itself, belong to Concept Lab or its licensors. You may use them for your own study while you are enrolled. You may not copy, sell or distribute them.",
    ],
  },
  {
    heading: "Your work",
    body: [
      "You keep ownership of the work you submit. You allow Concept Lab to store it, mark it and give feedback on it, and to use anonymised examples to help teach other students, unless you ask us not to.",
    ],
  },
  {
    heading: "Predicted grades and Lab AI",
    body: [
      "Predicted grades, weakness analysis and Lab AI Tutor answers are estimates and study aids based on your work so far. They are not a guarantee of any exam result, and AI answers can sometimes be wrong. Exam results depend on many things outside our control, and we cannot guarantee any particular grade.",
    ],
  },
  {
    heading: "Availability of the service",
    body: [
      "We work to keep the portal available, but it may sometimes be unavailable because of maintenance or problems with services we rely on, such as Google or Supabase. We may update or change features of the portal over time.",
    ],
  },
  {
    heading: "Ending your enrolment",
    body: [
      "You can stop your enrolment by telling us before your next payment is due. We may end or suspend access if these terms are seriously or repeatedly broken. Our Privacy Policy explains what happens to your information afterwards.",
    ],
  },
  {
    heading: "Liability",
    body: [
      "We provide our classes and portal with reasonable care and skill. To the extent the law allows, we are not responsible for indirect losses, and our total responsibility to you is limited to the fees you paid us in the three months before the issue arose. Nothing in these terms limits any rights you have under the law that cannot be limited.",
    ],
  },
  {
    heading: "Changes to these terms",
    body: [
      "If we change these terms we will update the date at the top of this page, and tell enrolled students about any important change before it applies to them.",
    ],
  },
  {
    heading: "Law and contact",
    body: [
      `These terms are governed by the laws of Pakistan, and the courts of Lahore will deal with any dispute. Questions about these terms: ${CONTACT_EMAIL}.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of"
      gold="Service"
      intro="These terms explain the agreement between you and Concept Lab when you join our classes or use the student portal."
      sections={SECTIONS}
    />
  );
}
