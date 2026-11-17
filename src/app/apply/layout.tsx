import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply · Concept Lab",
  description: "Apply for the next Concept Lab cohort: live Economics & Business classes for O-Level, IGCSE, A-Level and IB students.",
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
