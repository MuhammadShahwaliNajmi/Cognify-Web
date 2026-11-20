// Sends queued phone notifications (public.push_outbox) with standard web push.
//
// Called every minute by pg_cron (private.dispatch_pushes) when something is
// waiting. Like send-emails it takes no input and can only deliver what the
// database queued, so it runs with verify_jwt off. The signing (VAPID) keys are
// created here on first use and kept in private.push_keys; no one copies them.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type Device = { id: number; endpoint: string; p256dh: string; auth: string };
type Push = { id: number; title: string; body: string; url: string | null; devices: Device[] };

/** Email links point at the website; notifications open the same thing in the app. */
function appUrl(url: string | null) {
  const go = (path: string) => `/app/?go=${encodeURIComponent(path)}`;
  if (!url) return "/app/";
  // links that already point into the app (e.g. a comment thread) open as they are
  if (url.startsWith("https://cognifypk.com/app/")) return url.slice("https://cognifypk.com".length);
  const id = url.match(/[?&](?:join|open)=(\d+)/)?.[1];
  if (/\/portal\/student\/\?join=/.test(url) && id) return go(`/class/${id}`);
  if (/\/portal\/student\/(assignments|assessments)\//.test(url) && id) return go(`/work/${id}`);
  if (/\/portal\/teacher\/submissions\//.test(url) && id) return go(`/mark/${id}`);
  if (/\/portal\/student\/calendar\//.test(url)) return go("/s/classes");
  if (/\/announcements\//.test(url)) return go("/announcements");
  return "/app/";
}

Deno.serve(async () => {
  const secret = (() => {
    try {
      return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default as string | undefined;
    } catch {
      return undefined;
    }
  })() ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) return new Response("No Supabase secret key", { status: 500 });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, secret, { auth: { persistSession: false } });

  // signing keys: create once
  let keys = (await sb.rpc("push_vapid")).data?.[0] as { public_key: string; private_key: string } | undefined;
  if (!keys) {
    const k = webpush.generateVAPIDKeys();
    const saved = await sb.rpc("save_push_vapid", { p_public: k.publicKey, p_private: k.privateKey });
    if (saved.error) return new Response(`saving keys failed: ${saved.error.message}`, { status: 500 });
    keys = (await sb.rpc("push_vapid")).data?.[0];
    if (!keys) return new Response("keys missing", { status: 500 });
  }
  webpush.setVapidDetails("mailto:najmi@cognifypk.com", keys.public_key, keys.private_key);

  const { data, error } = await sb.rpc("claim_pushes", { p_limit: 50 });
  if (error) return new Response(`claim failed: ${error.message}`, { status: 500 });

  let sent = 0;
  for (const p of (data ?? []) as Push[]) {
    const payload = JSON.stringify({ title: p.title, body: p.body, url: appUrl(p.url), tag: `cl-${p.id}` });
    const errors: string[] = [];
    for (const d of p.devices) {
      try {
        await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload, { TTL: 3600, urgency: "high" });
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // the phone turned notifications off or the app was removed: forget the device
        if (status === 404 || status === 410) await sb.from("push_subscriptions").delete().eq("id", d.id);
        else errors.push(`${status ?? ""} ${(e as Error).message}`.trim());
      }
    }
    await sb
      .from("push_outbox")
      .update(errors.length ? { last_error: errors.join("; ").slice(0, 500) } : { sent_at: new Date().toISOString(), last_error: null })
      .eq("id", p.id);
  }
  return Response.json({ claimed: data?.length ?? 0, sent });
});
