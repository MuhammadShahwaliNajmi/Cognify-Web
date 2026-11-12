import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/ui/logo";

export const COMPANY = "Concept Lab Education Services (Pvt.) Limited";
export const ADDRESS = "44 Block C, New Muslim Town, Lahore, Pakistan";
export const CONTACT_EMAIL = "privacy@cognifypk.com";
export const EFFECTIVE = "12 November 2026";

export type LegalSection = { heading: string; body: (string | string[])[] };

/** Shared layout for the Privacy Policy and Terms of Service pages. */
export function LegalPage({
  eyebrow,
  title,
  gold,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  gold: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="relative min-h-screen w-full overflow-hidden px-6 py-10 md:px-10 md:py-14">
      <div className="aura" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-navy/60 transition-colors hover:text-gold"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>
          <Link href="/" aria-label="Concept Lab home">
            <Wordmark />
          </Link>
        </div>

        <header className="mt-14 border-b border-gold pb-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-navy/45">{eyebrow}</p>
          <h1 className="mt-3 text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-[1.04] tracking-tightest text-navy">
            {title} <span className="text-gold">{gold}</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-navy/70">{intro}</p>
          <p className="mt-4 text-sm text-navy/50">Effective {EFFECTIVE}</p>
        </header>

        <nav aria-label="Contents" className="mt-8 rounded-[22px] border border-navy/10 bg-white p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-navy/45">Contents</p>
          <ol className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.heading}>
                <a href={`#s${i + 1}`} className="text-sm text-navy/70 transition-colors hover:text-gold">
                  <span className="font-mono text-xs text-gold">{String(i + 1).padStart(2, "0")}</span> {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-6">
          {sections.map((s, i) => (
            <section key={s.heading} id={`s${i + 1}`} className="scroll-mt-6 border-t border-navy/10 py-8 first:border-t-0">
              <h2 className="flex items-baseline gap-3 text-xl font-semibold tracking-tight text-navy">
                <span className="font-mono text-xs text-gold">{String(i + 1).padStart(2, "0")}</span>
                {s.heading}
              </h2>
              <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-navy/75">
                {s.body.map((b, j) =>
                  Array.isArray(b) ? (
                    <ul key={j} className="space-y-2">
                      {b.map((li) => (
                        <li key={li} className="flex gap-3">
                          <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                          <span>{li}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p key={j}>{b}</p>
                  )
                )}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-6 border-t border-gold pt-8 text-sm text-navy/60">
          <p className="font-semibold text-navy">{COMPANY}</p>
          <p className="mt-1">{ADDRESS}</p>
          <p className="mt-1">
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-navy underline decoration-gold underline-offset-4 hover:text-gold">
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-6 flex gap-5">
            <Link href="/privacy/" className="hover:text-gold">
              Privacy Policy
            </Link>
            <Link href="/terms/" className="hover:text-gold">
              Terms of Service
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
