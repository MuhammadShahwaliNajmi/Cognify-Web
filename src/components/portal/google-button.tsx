"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { usePortal } from "@/lib/portal/store";
import { makeNonce } from "@/lib/portal/google-redirect";

/**
 * "Sign in with Google" using Google Identity Services on cognifypk.com.
 *
 * The Google popup runs against our own origin and hands back an ID token,
 * which we exchange with Supabase (signInWithIdToken). So Google's screen names
 * cognifypk.com / the Concept Lab app, never the Supabase project domain.
 *
 * A nonce ties the Google token to this page load: Google receives its SHA-256
 * hash, Supabase receives the raw value and checks they match.
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type CredentialResponse = { credential: string };
type GoogleId = {
  initialize: (o: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function GoogleSignInButton({ onBusy }: { onBusy?: (busy: boolean) => void }) {
  const { signInWithGoogleToken, signInWithGoogle } = usePortal();
  const [drawn, setDrawn] = useState(false);
  const slot = useRef<HTMLDivElement>(null);
  const nonce = useRef<string>("");
  const generation = useRef(0); // only the latest setup() may draw the button
  // keep the latest callbacks in refs so setup() itself never changes identity
  const signInRef = useRef(signInWithGoogleToken);
  const busyRef = useRef(onBusy);
  signInRef.current = signInWithGoogleToken;
  busyRef.current = onBusy;
  const [loaded, setLoaded] = useState(() => typeof window !== "undefined" && !!window.google?.accounts?.id);
  const [failed, setFailed] = useState(false);

  const setup = useCallback(async () => {
    const run = ++generation.current;
    const id = window.google?.accounts?.id;
    if (!id || !slot.current || !CLIENT_ID) return;
    const [raw, hashed] = await makeNonce();
    if (run !== generation.current || !slot.current) return; // a newer setup() took over
    nonce.current = raw;
    id.initialize({
      client_id: CLIENT_ID,
      nonce: hashed,
      ux_mode: "popup",
      itp_support: true,
      use_fedcm_for_button: true,
      callback: async (res: CredentialResponse) => {
        busyRef.current?.(true);
        const ok = await signInRef.current(res.credential, nonce.current);
        busyRef.current?.(false);
        if (!ok) setup(); // fresh nonce for the next attempt
      },
    });
    slot.current.replaceChildren();
    // reveal Google's button only once its iframe is in, so nothing jumps
    const el = slot.current;
    const mo = new MutationObserver(() => {
      if (el.querySelector("iframe, div[role=button]")) {
        setDrawn(true);
        mo.disconnect();
      }
    });
    mo.observe(el, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 15_000);
    id.renderButton(slot.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      logo_alignment: "center",
      width: Math.min(400, Math.max(220, slot.current.clientWidth)),
    });
  }, []);

  useEffect(() => {
    if (loaded) setup();
  }, [loaded, setup]);

  if (!CLIENT_ID) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
      <div className="relative h-[44px] w-full">
        {/* stand-in, identical size; clicking it before Google's button arrives uses the full-page sign-in */}
        {!drawn && (
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="absolute inset-0 flex items-center justify-center gap-2.5 rounded-full border border-[#dadce0] bg-white text-[14px] font-medium text-[#3c4043] transition-colors hover:bg-[#f8f9fa] focus-gold"
          >
            <GoogleG />
            Continue with Google
          </button>
        )}
        <div ref={slot} className={drawn ? "flex w-full justify-center" : "pointer-events-none absolute inset-0 flex justify-center opacity-0"} />
      </div>
      {failed && (
        <p className="mt-3 text-center text-sm text-navy">
          Google sign-in couldn&apos;t load. Check your connection or turn off any blocker for accounts.google.com, then refresh.
        </p>
      )}
    </>
  );
}
