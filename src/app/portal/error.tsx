"use client";

import { LogoMark } from "@/components/ui/logo";
import { Btn } from "@/components/portal/ui";

/** Shown instead of a blank page if a portal screen crashes. */
export default function PortalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main data-portal className="grid min-h-[100dvh] place-items-center bg-white px-6 text-center">
      <div>
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="mt-5 text-xl font-bold tracking-tight text-navy">Something went wrong</h1>
        <div className="mt-6 flex justify-center gap-2.5">
          <Btn variant="gold" onClick={reset}>
            Try again
          </Btn>
          <Btn variant="outline" onClick={() => window.location.assign("/portal/")}>
            Back to the portal
          </Btn>
        </div>
      </div>
    </main>
  );
}
