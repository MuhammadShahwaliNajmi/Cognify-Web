"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";

// `value` must exactly match the Google Form's multiple-choice options
const BOARDS = [
  { value: "Cambridge", label: "Cambridge (O Level / IGCSE / A Level)" },
  { value: "Pearson", label: "Pearson Edexcel (IGCSE / A Level)" },
  { value: "IB", label: "IB Diploma" },
];
const SUBJECTS = ["Economics", "Business", "Both"];
const PLANS = ["Lab", "Core", "Elite", "Not Sure"];

const fieldCls =
  "mt-2 w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-[15px] text-navy outline-none transition-colors placeholder:text-navy/35 focus:border-gold";
const labelCls =
  "block text-[11px] font-semibold uppercase tracking-[0.18em] text-navy/55";

/**
 * Submits silently into a hidden Google Form. Responses collect in the linked
 * Google Form / Sheet. Google's no-CORS endpoint returns an opaque response, so
 * we POST with mode "no-cors" and treat a completed request as success.
 */
const GOOGLE_FORM_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLScab7UEUI13PS7ibmTAWyFO-ONKF2XvycKoEMSIgOJiEEU7mg/formResponse";

// site field name -> Google Form entry id
const ENTRY: Record<string, string> = {
  name: "entry.1979912741",
  email: "entry.2146430339",
  phone: "entry.1633413649",
  board: "entry.1257428339",
  subject: "entry.78602118",
  level: "entry.451469632",
  plan: "entry.1895944516",
  message: "entry.1770529650",
};

export default function ApplyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const params = new URLSearchParams();
    for (const [field, entryId] of Object.entries(ENTRY)) {
      const el = form.elements.namedItem(field) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null;
      params.append(entryId, el?.value ?? "");
    }

    try {
      await fetch(GOOGLE_FORM_ACTION, {
        method: "POST",
        mode: "no-cors",
        body: params,
      });
      setSubmitted(true);
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="relative min-h-screen w-full px-6 py-10 md:px-10">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-navy/60 transition-colors hover:text-gold"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>
          <Link href="/" aria-label="Cognify home">
            <LogoMark className="h-8 w-8" />
          </Link>
        </div>

        {submitted ? (
          <div className="mt-24 flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-navy-deep">
              <Check size={28} strokeWidth={3} />
            </span>
            <h1 className="mt-7 text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-tightest text-navy">
              Application Received
            </h1>
            <p className="mt-4 max-w-md text-navy/70">
              Thank you for applying to Cognify. Our team will review your
              application and reach out to you personally by email.
            </p>
            <Link
              href="/"
              className="mt-9 inline-flex items-center gap-2 rounded-full bg-navy-deep px-7 py-3 text-sm font-semibold text-gold transition-colors hover:bg-navy"
            >
              Return Home
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">
                Applications Open
              </p>
              <h1 className="mt-4 text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-[1.04] tracking-tightest text-navy">
                Apply for <span className="text-gold">Cohort</span>
              </h1>
              <p className="mt-4 text-navy/70">
                Tell us a little about yourself and we&apos;ll be in touch about
                your place.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-10 space-y-6">
              <div>
                <label htmlFor="name" className={labelCls}>
                  Full name
                </label>
                <input id="name" name="name" type="text" required className={fieldCls} placeholder="Your full name" />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className={labelCls}>
                    Email
                  </label>
                  <input id="email" name="email" type="email" required className={fieldCls} placeholder="you@email.com" />
                </div>
                <div>
                  <label htmlFor="phone" className={labelCls}>
                    Phone (WhatsApp)
                  </label>
                  <input id="phone" name="phone" type="tel" className={fieldCls} placeholder="+92 …" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="board" className={labelCls}>
                    Exam board
                  </label>
                  <select id="board" name="board" required defaultValue="" className={fieldCls}>
                    <option value="" disabled>
                      Select a board
                    </option>
                    {BOARDS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="subject" className={labelCls}>
                    Subject
                  </label>
                  <select id="subject" name="subject" required defaultValue="" className={fieldCls}>
                    <option value="" disabled>
                      Select a subject
                    </option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="level" className={labelCls}>
                    Current year / grade
                  </label>
                  <input id="level" name="level" type="text" className={fieldCls} placeholder="e.g. A2, Year 12" />
                </div>
                <div>
                  <label htmlFor="plan" className={labelCls}>
                    Plan of interest
                  </label>
                  <select id="plan" name="plan" defaultValue="" className={fieldCls}>
                    <option value="" disabled>
                      Select a plan
                    </option>
                    {PLANS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="message" className={labelCls}>
                  Anything we should know? (optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  className={`${fieldCls} resize-none`}
                  placeholder="Your goals, target grades, questions…"
                />
              </div>

              <button
                type="submit"
                disabled={status === "submitting"}
                className="mt-2 w-full rounded-full bg-navy-deep px-8 py-4 text-[15px] font-semibold text-gold transition-colors hover:bg-navy disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "submitting" ? "Submitting…" : "Submit Application"}
              </button>

              {status === "error" && (
                <p className="text-center text-sm text-red-600">
                  Something went wrong. Please try again, or email us directly at
                  najmi@cognifypk.com.
                </p>
              )}

              <p className="text-center text-xs text-navy/45">
                Every plan begins with a 7-day free trial. Need-based and merit
                scholarships available.
              </p>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
