import type { Metadata } from "next";
import { PortalProvider } from "@/lib/portal/store";

export const metadata: Metadata = {
  title: "Concept Lab Portal",
  description: "Live classes, The Vault, assignments and progress for Concept Lab students.",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://shrgjfevwjbqlzpqqfck.supabase.co" crossOrigin="" />
      <link rel="preload" href="https://accounts.google.com/gsi/client" as="script" />
      <PortalProvider>{children}</PortalProvider>
    </>
  );
}
