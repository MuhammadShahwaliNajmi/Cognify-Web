import type { Metadata } from "next";
import { GetApp } from "@/components/get-app";

export const metadata: Metadata = {
  title: "Get the app · Concept Lab",
  description: "Put the Concept Lab app on your iPhone or Android home screen. Free, no app store needed.",
};

export default function GetAppPage() {
  return <GetApp />;
}
