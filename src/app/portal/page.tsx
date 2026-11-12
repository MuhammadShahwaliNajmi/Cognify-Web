"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/ui/logo";
import { usePortal } from "@/lib/portal/store";
import { GoogleSignInButton } from "@/components/portal/google-button";

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
      <h2 className="text-2xl font-bold tracking-tight text-navy">Class code</h2>

      <label className="mt-6 block">
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

      <p className="mt-6 text-center text-[13px] text-navy">
        <span className="font-semibold">{email}</span> ·{" "}
        <button type="button" onClick={signOut} className="font-semibold text-navy underline decoration-gold underline-offset-4 hover:text-gold">
          Switch account
        </button>
      </p>
    </form>
  );
}

export default function PortalSignIn() {
  const { status, auth, signInWithGoogle, toasts } = usePortal();
  const router = useRouter();
  const [going, setGoing] = useState(false);

  useEffect(() => {
    if (status === "ready" && auth) router.replace(auth.role === "student" ? "/portal/student/" : "/portal/teacher/");
  }, [status, auth, router]);

  return (
    <main data-portal className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-navy-deep px-5 py-12">
      <div className="flex flex-col items-center">
        <Wordmark onDark />
        <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.3em] text-gold">Portal</p>
      </div>

      <section className="mt-8 w-full max-w-sm rounded-2xl bg-white p-7 md:p-8">
        {status === "loading" || status === "ready" ? (
          <div className="flex justify-center py-8">
            <LogoMark className="h-12 w-12 animate-pulse-node" />
          </div>
        ) : status === "needs-join" ? (
          <JoinForm />
        ) : (
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy">Sign in</h1>
            <span className="mt-2.5 block h-[3px] w-10 rounded-full bg-gold" />
            <div className="mt-7">
              {going && (
                <div className="flex h-[44px] items-center justify-center gap-2.5 text-sm font-medium text-navy">
                  <span className="h-2 w-2 animate-pulse-node rounded-full bg-gold" />
                  Signing in…
                </div>
              )}
              <div className={going ? "hidden" : undefined}>
                <GoogleSignInButton onBusy={setGoing} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="mx-auto mt-4 block text-[13px] font-medium text-navy underline decoration-gold decoration-2 underline-offset-4 hover:text-gold"
            >
              Other sign-in option
            </button>
            <p className="mt-6 text-center text-[12px] text-navy">
              <a href="/terms/" className="hover:text-gold">
                Terms
              </a>{" "}
              ·{" "}
              <a href="/privacy/" className="hover:text-gold">
                Privacy
              </a>
            </p>
          </div>
        )}
      </section>

      {toasts.length > 0 && (
        <p role="status" className="mt-4 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-navy-deep">
          {toasts[toasts.length - 1].text}
        </p>
      )}

      <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-white/85 transition-colors hover:text-gold">
        <ArrowLeft size={16} />
        Back to website
      </Link>
    </main>
  );
}
