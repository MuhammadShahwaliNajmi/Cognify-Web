"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { usePortal } from "@/lib/portal/store";

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

async function makeNonce(): Promise<[raw: string, hashed: string]> {
  const raw = btoa(String.fromCharCode(...Array.from(crypto.getRandomValues(new Uint8Array(32)))));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return [raw, hashed];
}

export function GoogleSignInButton({ onBusy }: { onBusy?: (busy: boolean) => void }) {
  const { signInWithGoogleToken } = usePortal();
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
      <div ref={slot} className="flex min-h-[44px] w-full justify-center" />
      {failed && (
        <p className="mt-3 text-center text-sm text-navy">
          Google sign-in couldn&apos;t load. Check your connection or turn off any blocker for accounts.google.com, then refresh.
        </p>
      )}
    </>
  );
}
