/**
 * Full-page "Sign in with Google" that never touches the Supabase domain.
 *
 * We send the browser straight to Google's OAuth page with our own
 * redirect_uri (cognifypk.com/portal/), so Google's account chooser names
 * cognifypk.com / Concept Lab. Google returns an ID token in the URL fragment;
 * we exchange it with Supabase via signInWithIdToken, exactly like the popup button.
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const KEY = "cl-google-redirect";

export async function makeNonce(): Promise<[raw: string, hashed: string]> {
  const raw = btoa(String.fromCharCode(...Array.from(crypto.getRandomValues(new Uint8Array(32)))));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return [raw, hashed];
}

const randomState = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const redirectUri = () => `${window.location.origin}/portal/`;

/** Leave for Google's sign-in page. Returns false if Google isn't configured. */
export async function startGoogleRedirect(): Promise<boolean> {
  if (!CLIENT_ID) return false;
  const [raw, hashed] = await makeNonce();
  const state = randomState();
  sessionStorage.setItem(KEY, JSON.stringify({ state, nonce: raw }));
  const q = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "id_token",
    scope: "openid email profile",
    nonce: hashed,
    state,
    prompt: "select_account",
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
  return true;
}

/**
 * On return to /portal/: pull the ID token out of the URL fragment (and wipe it
 * from the address bar). Returns null if this page load isn't a Google return.
 */
export function takeGoogleRedirect(): { idToken: string; nonce: string } | { error: string } | null {
  const hash = window.location.hash.slice(1);
  if (!hash.includes("id_token=") && !hash.includes("error=")) return null;
  const p = new URLSearchParams(hash);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  let saved: { state?: string; nonce?: string } = {};
  try {
    saved = JSON.parse(sessionStorage.getItem(KEY) ?? "{}");
  } catch {}
  sessionStorage.removeItem(KEY);
  if (p.get("error")) return { error: p.get("error") === "access_denied" ? "Sign-in was cancelled." : "Google sign-in failed." };
  const idToken = p.get("id_token");
  if (!idToken || !saved.nonce || p.get("state") !== saved.state) return { error: "Google sign-in expired. Please try again." };
  return { idToken, nonce: saved.nonce };
}
