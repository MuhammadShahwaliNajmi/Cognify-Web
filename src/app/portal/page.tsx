"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ClipboardCheck, FolderOpen, KeyRound, LineChart, Video } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/ui/logo";
import { usePortal } from "@/lib/portal/store";
import { Label } from "@/components/portal/ui";

const POINTS = [
  { icon: Video, t: "Join live classes", d: "One tap into your Google Meet classroom." },
  { icon: FolderOpen, t: "Open The Vault", d: "Slides, notes, past papers and every recording." },
  { icon: ClipboardCheck, t: "Submit your work", d: "Examiner feedback back within 24 hours." },
  { icon: LineChart, t: "Track your grade", d: "Your predicted grade and what to fix next." },
];

/** Google's "G" mark, as Google's sign-in guidelines require on the button. */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function JoinForm() {
  const { email, joinWithCode, signOut } = usePortal();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const clean = code.replace(/[^A-Za-z0-9]/g, "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clean.length !== 8 || busy) return;
    setBusy(true);
    setMsg(null);
    const res = await joinWithCode(code);
    setBusy(false);
    if (!res.ok) setMsg(res.message);
  };

  return (
    <form onSubmit={submit}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-navy-deep text-gold">
        <KeyRound size={20} />
      </span>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-navy">Join your class</h2>
      <p className="mt-2 text-sm leading-relaxed text-navy/60">
        Enter the 8-character code your teacher sent you. You only need to do this once.
      </p>

      <label className="mt-6 block">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-navy">Class code</span>
        <input
          value={code}
          onChange={(e) => {
            const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
            setCode(v.length > 4 ? `${v.slice(0, 4)}-${v.slice(4)}` : v);
            setMsg(null);
          }}
          placeholder="XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={!!msg}
          className="mt-2 w-full rounded-xl border border-navy/15 bg-white px-4 py-3.5 text-center font-mono text-2xl tracking-[0.3em] text-navy outline-none transition-all placeholder:text-navy/25 focus:border-gold focus:ring-4 focus:ring-gold/15"
        />
      </label>
      {msg && (
        <p role="alert" className="mt-3 rounded-xl bg-gold/15 px-4 py-3 text-sm font-medium text-navy">
          {msg}
        </p>
      )}

      <button
        type="submit"
        disabled={clean.length !== 8 || busy}
        className="gloss mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-[15px] font-semibold text-navy-deep transition-[transform,opacity] hover:-translate-y-0.5 focus-gold disabled:pointer-events-none disabled:opacity-45"
      >
        {busy ? "Checking…" : "Join class"}
        {!busy && <ArrowRight size={17} />}
      </button>

      <p className="mt-6 text-center text-[13px] text-navy/50">
        Signed in as <span className="font-semibold text-navy">{email}</span>.{" "}
        <button type="button" onClick={signOut} className="font-semibold text-navy underline decoration-gold underline-offset-4 hover:text-gold">
          Use another account
        </button>
      </p>
    </form>
  );
}

export default function PortalSignIn() {
  const { status, auth, signInWithGoogle } = usePortal();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [going, setGoing] = useState(false);

  useEffect(() => {
    if (status === "ready" && auth) router.replace(auth.role === "student" ? "/portal/student/" : "/portal/teacher/");
  }, [status, auth, router]);

  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
  };
  const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } } };

  return (
    <main data-portal className="relative min-h-[100dvh] w-full overflow-hidden px-5 py-8 md:px-10 md:py-12">
      <div className="aura" aria-hidden="true" />
      <div className="absolute inset-0 bg-grid bg-grid-mask opacity-70" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-navy/60 transition-colors hover:text-gold">
            <ArrowLeft size={16} />
            Back to website
          </Link>
          <Wordmark />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:mt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          {/* brand panel */}
          <motion.section variants={container} initial="hidden" animate="show" className="glass-navy rounded-[30px] p-8 md:p-10">
            <motion.div variants={item}>
              <Label className="text-gold">Concept Lab Portal</Label>
            </motion.div>
            <motion.h1
              variants={item}
              className="mt-4 text-[clamp(2rem,4.4vw,3.1rem)] font-semibold leading-[1.04] tracking-tightest text-white"
            >
              Your Classroom
              <br />
              <span className="text-gold">In One Place</span>
            </motion.h1>
            <motion.div variants={item} className="mt-7 h-px w-12 bg-gold" />
            <ul className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {POINTS.map((p) => (
                <motion.li key={p.t} variants={item} className="flex gap-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.07] text-gold ring-1 ring-white/10">
                    <p.icon size={17} />
                  </span>
                  <div>
                    <p className="text-[15px] font-medium text-white">{p.t}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-white/60">{p.d}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.section>

          {/* sign in / join */}
          <section className="flex flex-col justify-center rounded-[30px] border border-navy/10 bg-white p-7 shadow-[0_30px_80px_-44px_rgba(26,39,68,0.4)] md:p-9">
            {status === "loading" || status === "ready" ? (
              <div className="flex flex-col items-center py-10 text-center">
                <LogoMark className="h-12 w-12 animate-pulse-node" />
                <p className="mt-4 text-sm text-navy/55">Opening your portal…</p>
              </div>
            ) : status === "needs-join" ? (
              <JoinForm />
            ) : (
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-navy">Sign in</h2>
                <p className="mt-2 text-sm leading-relaxed text-navy/60">
                  Use the Google account you&apos;ll use for your classes. New students will be asked for their class code once.
                </p>
                <button
                  type="button"
                  disabled={going}
                  onClick={() => {
                    setGoing(true);
                    signInWithGoogle().finally(() => setTimeout(() => setGoing(false), 4000));
                  }}
                  className="mt-7 flex w-full items-center justify-center gap-3 rounded-full border border-navy/15 bg-white px-6 py-3.5 text-[15px] font-semibold text-navy transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-gold hover:shadow-[0_18px_40px_-22px_rgba(212,178,84,0.7)] focus-gold disabled:opacity-60"
                >
                  <GoogleG />
                  {going ? "Opening Google…" : "Continue with Google"}
                </button>
                <p className="mt-6 text-center text-xs leading-relaxed text-navy/45">
                  By signing in you agree to our{" "}
                  <a href="/terms/" className="underline decoration-gold underline-offset-2 hover:text-gold">
                    Terms
                  </a>{" "}
                  and{" "}
                  <a href="/privacy/" className="underline decoration-gold underline-offset-2 hover:text-gold">
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
