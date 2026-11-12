import type { Metadata } from "next";
import { PortalProvider } from "@/lib/portal/store";

export const metadata: Metadata = {
  title: "Concept Lab Portal",
  description: "Live classes, The Vault, assignments and progress for Concept Lab students.",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalProvider>{children}</PortalProvider>;
}
