import Link from "next/link";
import { Wordmark } from "@/components/ui/logo";

export const metadata = { title: "Page not found · Concept Lab" };

/** Shown for any address that doesn't exist (GitHub Pages serves it as 404.html). */
export default function NotFound() {
  return (
    <main className="relative grid min-h-[100svh] place-items-center overflow-hidden px-6">
      <div className="aura" aria-hidden="true" />
      <div className="relative z-10 flex flex-col items-center text-center">
        <Link href="/" aria-label="Concept Lab home">
          <Wordmark />
        </Link>
        <p className="mt-10 font-mono text-[12px] uppercase tracking-[0.3em] text-gold">404</p>
        <h1 className="mt-3 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.05] tracking-tightest text-navy">Page not found</h1>
        <span className="mt-5 block h-[3px] w-16 rounded-full bg-gold" />
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="gloss rounded-full bg-navy-deep px-7 py-3.5 text-[15px] font-semibold tracking-tight text-white transition-colors hover:bg-navy focus-gold"
          >
            Back to home
          </Link>
          <Link
            href="/portal/"
            className="rounded-full border border-navy/15 bg-white px-7 py-3.5 text-[15px] font-semibold tracking-tight text-navy transition-colors hover:border-gold hover:text-gold focus-gold"
          >
            Portal
          </Link>
        </div>
      </div>
    </main>
  );
}
