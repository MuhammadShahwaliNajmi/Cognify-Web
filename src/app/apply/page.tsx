"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { spring } from "@/lib/utils";

// `value` must exactly match the Google Form's multiple-choice options
const BOARDS = [
  { value: "Cambridge", label: "Cambridge (O Level / IGCSE / A Level)" },
  { value: "Pearson", label: "Pearson Edexcel (IGCSE / A Level)" },
  { value: "IB", label: "IB Diploma" },
];
const SUBJECTS = ["Economics", "Business", "Both"];
const PLANS = ["Lab", "Core", "Elite", "Not Sure"];
// `value` must match the Google Form options exactly
const SCHOLARSHIPS = [
  { value: "Merit Based", label: "Merit-based" },
  { value: "Need Based", label: "Need-based" },
  { value: "Not interested / None", label: "Not applying for one" },
];

const STEPS = [
  { t: "Send your details", d: "Fill the short form — under two minutes." },
  { t: "We review & reply", d: "A personal email back within 48 hours." },
  { t: "Start free", d: "Begin with a 7-day free trial. No commitment." },
];

const fieldCls =
  "mt-2 w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-[15px] text-navy outline-none transition-all placeholder:text-navy/55 focus:border-gold focus:ring-4 focus:ring-gold/15";
const labelCls =
  "block text-[11px] font-semibold uppercase tracking-[0.18em] text-navy";
// selects show navy once chosen, but dark grey while the placeholder option is active
const selectCls = `${fieldCls} [&:has(option[value='']:checked)]:text-navy/55`;

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
  scholarship: "entry.823004615",
  message: "entry.1770529650",
};
const TOTAL_FIELDS = Object.keys(ENTRY).length;

export default function ApplyPage() {
  const reduce = useReducedMotion();
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [progress, setProgress] = useState(0);

  // entrance / stagger variants
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
    },
  };
  const list = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.08 },
    },
  };

  function recompute(form: HTMLFormElement) {
    let filled = 0;
    for (const field of Object.keys(ENTRY)) {
      const el = form.elements.namedItem(field) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null;
      if (el && el.value.trim()) filled += 1;
    }
    setProgress(Math.round((filled / TOTAL_FIELDS) * 100));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setProgress(100);
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
    <main className="relative min-h-screen w-full overflow-hidden px-6 py-10 md:px-10 md:py-14">
      {/* site-consistent ambient background */}
      <div className="aura" />
      <div className="absolute inset-0 bg-grid bg-grid-mask opacity-70" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* top bar */}
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
          <div className="mt-16 flex justify-center md:mt-24">
            <motion.div
              initial={{ opacity: 0, scale: reduce ? 1 : 0.95, y: reduce ? 0 : 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="glass-navy relative w-full max-w-lg overflow-hidden rounded-[30px] p-10 text-center md:p-12"
            >
              {/* animated success mark — disc pops, rings pulse out, check draws */}
              <div className="relative mx-auto h-20 w-20">
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-gold"
                  initial={{ scale: 0.5, opacity: 0.7 }}
                  animate={{ scale: 1.75, opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.25 }}
                />
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-gold/60"
                  initial={{ scale: 0.5, opacity: 0.5 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ duration: 1.45, ease: "easeOut", delay: 0.4 }}
                />
                <motion.span
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-gold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...spring.snappy, delay: 0.1 }}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <motion.path
                      d="M5 12.5 L10 17.5 L19 7.5"
                      stroke="#0E1A33"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.38 }}
                    />
                  </svg>
                </motion.span>
              </div>

              <motion.h1
                initial={{ opacity: 0, y: reduce ? 0 : 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                className="mt-8 text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-tightest text-white"
              >
                Application <span className="text-gold">Received</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: reduce ? 0 : 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.62 }}
                className="mx-auto mt-4 max-w-md text-white/75"
              >
                Thanks for applying to Cognify. We&apos;ll review your details and
                email you personally about the next steps.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: reduce ? 0 : 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.74 }}
              >
                <Link
                  href="/"
                  className="gloss mt-9 inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3 text-sm font-semibold text-navy-deep transition-transform hover:-translate-y-0.5"
                >
                  Return Home
                  <ArrowRight size={16} />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-8 lg:mt-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12">
            {/* LEFT — navy brand / reassurance panel */}
            <motion.aside
              initial="hidden"
              animate="show"
              variants={container}
              className="lg:sticky lg:top-10 lg:self-start"
            >
              <div className="glass-navy relative overflow-hidden rounded-[30px] p-8 md:p-10">
                <motion.span
                  variants={item}
                  className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
                  </span>
                  Applications Open
                </motion.span>

                <motion.h1
                  variants={item}
                  className="mt-6 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.04] tracking-tightest text-white"
                >
                  Apply for <span className="text-gold">Cohort</span>
                </motion.h1>
                <motion.p
                  variants={item}
                  className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/85"
                >
                  A few quick details and we&apos;ll be in touch about your seat
                  in the next cohort. It takes under two minutes.
                </motion.p>

                <motion.div variants={item} className="mt-8 h-px w-12 bg-gold" />

                <motion.ol variants={list} className="mt-8 space-y-6">
                  {STEPS.map((s, i) => (
                    <motion.li key={s.t} variants={item} className="flex gap-4">
                      <span className="mt-0.5 font-mono text-sm text-gold">
                        0{i + 1}
                      </span>
                      <div>
                        <p className="text-[15px] font-medium text-white">
                          {s.t}
                        </p>
                        <p className="mt-1 text-[13px] leading-relaxed text-white/75">
                          {s.d}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </motion.ol>
              </div>
            </motion.aside>

            {/* RIGHT — the form, in a crisp white card */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={container}
              className="rounded-[30px] border border-navy/10 bg-white p-6 shadow-[0_30px_80px_-44px_rgba(26,39,68,0.4)] md:p-9"
            >
              {/* live completion progress */}
              <motion.div variants={item}>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-navy">
                    Your details
                  </p>
                  <span className="text-[11px] font-semibold tabular-nums tracking-tight text-gold">
                    {progress}% complete
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-navy/10">
                  <motion.div
                    className="h-full rounded-full bg-gold"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={spring.snappy}
                  />
                </div>
              </motion.div>

              <form
                onSubmit={handleSubmit}
                onChange={(e) => recompute(e.currentTarget)}
                className="mt-6 space-y-6"
              >
                <motion.div variants={item}>
                  <label htmlFor="name" className={labelCls}>
                    Full name
                  </label>
                  <input id="name" name="name" type="text" required className={fieldCls} placeholder="Adam Smith" />
                </motion.div>

                <motion.div variants={item} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="email" className={labelCls}>
                      Email
                    </label>
                    <input id="email" name="email" type="email" required className={fieldCls} placeholder="AdamSmith@gmail.com" />
                  </div>
                  <div>
                    <label htmlFor="phone" className={labelCls}>
                      WhatsApp number
                    </label>
                    <input id="phone" name="phone" type="tel" className={fieldCls} placeholder="+92 XXX XXXXXXX" />
                  </div>
                </motion.div>

                <motion.div variants={item} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="board" className={labelCls}>
                      Exam board
                    </label>
                    <select id="board" name="board" required defaultValue="" className={selectCls}>
                      <option value="" disabled>
                        Select Your Board
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
                    <select id="subject" name="subject" required defaultValue="" className={selectCls}>
                      <option value="" disabled>
                        Select A Subject
                      </option>
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>

                <motion.div variants={item} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="level" className={labelCls}>
                      Current year or grade
                    </label>
                    <input id="level" name="level" type="text" className={fieldCls} placeholder="A2" />
                  </div>
                  <div>
                    <label htmlFor="plan" className={labelCls}>
                      Plan you&apos;re interested in
                    </label>
                    <select id="plan" name="plan" defaultValue="" className={selectCls}>
                      <option value="" disabled>
                        Select A Plan
                      </option>
                      {PLANS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>

                <motion.div variants={item}>
                  <label htmlFor="scholarship" className={labelCls}>
                    Scholarship interest (optional)
                  </label>
                  <select id="scholarship" name="scholarship" defaultValue="" className={selectCls}>
                    <option value="" disabled>
                      Select An Option
                    </option>
                    {SCHOLARSHIPS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </motion.div>

                <motion.div variants={item}>
                  <label htmlFor="message" className={labelCls}>
                    Anything else we should know? (optional)
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className={`${fieldCls} resize-none`}
                  />
                </motion.div>

                <motion.button
                  variants={item}
                  type="submit"
                  disabled={status === "submitting"}
                  className="gloss mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-navy-deep px-8 py-4 text-[15px] font-semibold text-gold transition-colors hover:bg-navy disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "submitting" ? (
                    "Submitting…"
                  ) : (
                    <>
                      Submit Application
                      <ArrowRight size={17} />
                    </>
                  )}
                </motion.button>

                {status === "error" && (
                  <p className="text-center text-sm text-red-600">
                    Something went wrong. Please try again, or email us directly
                    at najmi@cognifypk.com.
                  </p>
                )}

                <motion.p
                  variants={item}
                  className="text-center text-xs text-navy/80"
                >
                  Every plan starts with a free 7-day trial. Need-based and merit
                  scholarships available.
                </motion.p>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </main>
  );
}
