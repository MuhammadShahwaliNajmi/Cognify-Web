"use client";

import { useEffect, useState } from "react";
import { LogoMark, Wordmark } from "@/components/ui/logo";
import { startAppSignIn } from "@/lib/portal/google-redirect";

/** Opened by the Concept Lab phone app: goes straight to Google, then back to the app. */
export default function AppSignIn() {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setError(startAppSignIn(new URLSearchParams(window.location.search))), []);

  return (
    <main data-portal className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-navy-deep px-5 py-12">
      <Wordmark onDark />
      <section className="mt-8 w-full max-w-sm rounded-2xl bg-white p-7 text-center">
        {error ? (
          <p className="text-[15px] font-medium text-navy">{error}</p>
        ) : (
          <div className="flex flex-col items-center py-6">
            <LogoMark className="h-12 w-12" />
            <p className="mt-4 text-[15px] font-medium text-navy">Opening Google…</p>
          </div>
        )}
      </section>
    </main>
  );
}
