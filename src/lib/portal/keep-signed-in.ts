/**
 * "Keep me signed in" (on by default). Sign-ins last until the person signs out; with it
 * off (a shared computer), the sign-in ends when the browser closes. A session cookie
 * (no expiry date) marks "this browser has been open since signing in".
 */
const PREF = "cl-keep-signed-in";
const ALIVE = "cl-alive";

export function keepSignedIn() {
  try {
    return localStorage.getItem(PREF) !== "0";
  } catch {
    return true;
  }
}

export function markAlive() {
  document.cookie = `${ALIVE}=1; path=/; SameSite=Lax`;
}

export function setKeepSignedIn(keep: boolean) {
  try {
    localStorage.setItem(PREF, keep ? "1" : "0");
  } catch {}
  markAlive();
}

/** Signed in without "keep me signed in", and the browser has been closed since. */
export function browserWasClosed() {
  return !keepSignedIn() && !document.cookie.split("; ").some((c) => c.startsWith(`${ALIVE}=`));
}
