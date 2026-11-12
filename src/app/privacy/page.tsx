import type { Metadata } from "next";
import { ADDRESS, COMPANY, CONTACT_EMAIL, LegalPage, type LegalSection } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · Concept Lab",
  description: `How ${COMPANY} collects, uses and protects personal information.`,
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Who we are",
    body: [
      `Concept Lab is operated by ${COMPANY} ("Concept Lab", "we", "us"), ${ADDRESS}. We run live online Economics and Business classes for Cambridge, Pearson Edexcel and IB students.`,
      "This policy covers our website (cognifypk.com), our application form and the Concept Lab student portal.",
    ],
  },
  {
    heading: "Information we collect",
    body: [
      "We only collect what we need to teach you and run your classes:",
      [
        "Application details: your name, email address, WhatsApp number, exam board, subject, year or grade, the plan you're interested in, scholarship interest and anything you choose to tell us.",
        "Portal account: when you sign in with Google, we receive your name, email address and profile picture. We never receive your Google password.",
        "Learning records: your cohort and plan, class attendance, the work you submit, marks, examiner feedback and predicted grades.",
        "Files: assignments and other work you upload to the portal.",
        "Technical information: basic logs kept by our hosting and database providers (such as IP address, browser type and time of access), and small items stored in your browser to keep you signed in.",
      ],
    ],
  },
  {
    heading: "How we use it",
    body: [
      [
        "To review your application and contact you about enrolment.",
        "To create and run your portal account, and to give you access to your cohort's classes, resources and assignments.",
        "To mark your work, return feedback and calculate your predicted grade.",
        "To record attendance and keep you and your teachers informed about your progress.",
        "To send you important updates about your classes.",
        "To keep the service secure and working properly.",
      ],
      "We do not sell your personal information, and we do not use it for advertising.",
    ],
  },
  {
    heading: "Google user data",
    body: [
      "Students and teachers sign in to the portal with their Google account. For sign-in we only request your name, email address and profile picture, and we use them only to identify you and show your account.",
      "Concept Lab stores course files (such as class recordings, resources and submitted work) in Concept Lab's own Google Drive. The portal uses the limited \"drive.file\" permission, which only allows it to access files the portal itself creates or that are opened with it. It cannot see other files in anyone's Google Drive. Students are never asked for access to their own Drive.",
      "Live classes run on Google Meet, which is subject to Google's own privacy policy.",
      "Concept Lab's use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements. We do not use Google user data to develop, improve or train generalised AI or machine-learning models, we do not sell it, and we do not transfer it to others except as needed to provide the service, to comply with the law, or with your consent.",
    ],
  },
  {
    heading: "Who we share it with",
    body: [
      "Your information is seen by the Concept Lab teachers and examiners who teach and mark your work. We also use these service providers, who process it on our behalf:",
      [
        "Google: sign-in, Google Drive file storage, Google Meet classes and Google Forms for applications.",
        "Supabase: the database and sign-in service behind the student portal.",
        "GitHub Pages: hosting for our website.",
      ],
      "We may also disclose information if the law requires it, or to protect the safety of our students and staff.",
    ],
  },
  {
    heading: "Where your information is stored",
    body: [
      "Our service providers store data on servers that may be outside Pakistan, including in India, the United States and other countries. We choose providers that protect data with industry-standard security.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      "We keep your account and learning records while you are enrolled, and for up to 12 months after your last cohort ends, so that you can return for a later cohort. Application details from people who don't enrol are deleted within 12 months. You can ask us to delete your information sooner at any time, unless the law requires us to keep it.",
    ],
  },
  {
    heading: "Students under 18",
    body: [
      "Many of our students are under 18. A parent or guardian should agree to a student joining Concept Lab and using the portal. Parents and guardians can contact us at any time to see, correct or delete their child's information.",
    ],
  },
  {
    heading: "Your choices and rights",
    body: [
      "You can ask us to show you the information we hold about you, correct it, or delete it. You can also withdraw the portal's access to your Google account at any time from your Google Account settings (Security, then Your connections to third-party apps and services). To make a request, email us at the address below.",
    ],
  },
  {
    heading: "Security",
    body: [
      "Access to the portal requires a Google sign-in, and each student can only see their own records. Our database enforces this with row-level access rules, and all data is sent over encrypted (HTTPS) connections. No system is perfectly secure, but we work to protect your information and will tell affected users promptly if a breach occurs.",
    ],
  },
  {
    heading: "Changes to this policy",
    body: [
      "If we change this policy we will update the date at the top of this page, and tell enrolled students about any important change.",
    ],
  },
  {
    heading: "Contact us",
    body: [`Questions or requests about your privacy: ${CONTACT_EMAIL}, or write to ${COMPANY}, ${ADDRESS}.`],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy"
      gold="Policy"
      intro="This policy explains what personal information Concept Lab collects, why we collect it, and how we look after it."
      sections={SECTIONS}
    />
  );
}
