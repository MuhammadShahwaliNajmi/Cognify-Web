// Sends queued portal emails (public.email_outbox) through Resend.
//
// Called every minute by pg_cron (private.dispatch_emails) when something is
// waiting. It takes no input: all it can do is deliver what the database queued,
// so it runs with verify_jwt off. Secrets: RESEND_API_KEY (Edge Function secret);
// the Supabase secret key is provided by the platform.

import { createClient } from "npm:@supabase/supabase-js@2";

const FROM = Deno.env.get("EMAIL_FROM") ?? "Concept Lab <najmi@cognifypk.com>";
const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") ?? "najmi@cognifypk.com";

type Email = {
  id: number;
  to_email: string;
  to_name: string | null;
  subject: string;
  heading: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function html(m: Email) {
  const first = (m.to_name ?? "").split(" ")[0];
  const lines = m.body
    .split("\n")
    .map((l) => `<p style="margin:0 0 10px;font-size:15px;line-height:1.55;color:#1a2744;">${esc(l)}</p>`)
    .join("");
  const cta =
    m.cta_label && m.cta_url
      ? `<a href="${esc(m.cta_url)}" style="display:inline-block;margin-top:14px;padding:12px 22px;border-radius:999px;background:#D4B254;color:#0E1A33;font-weight:700;font-size:14px;text-decoration:none;">${esc(m.cta_label)}</a>`
      : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f8;font-family:Inter,Segoe UI,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#0E1A33;padding:20px 28px;">
<span style="font-size:18px;font-weight:800;letter-spacing:-0.3px;color:#ffffff;">CONCEPT <span style="color:#D4B254;">LAB</span></span>
<div style="font-size:9px;letter-spacing:4px;color:#ffffffcc;margin-top:3px;">EDUCATION</div>
</td></tr>
<tr><td style="padding:28px;">
${first ? `<p style="margin:0 0 6px;font-size:14px;color:#1a2744;">Hi ${esc(first)},</p>` : ""}
<h1 style="margin:0 0 4px;font-size:22px;line-height:1.3;color:#1a2744;">${esc(m.heading)}</h1>
<div style="width:40px;height:3px;background:#D4B254;border-radius:3px;margin:10px 0 18px;"></div>
${lines}
${cta}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #1a274414;font-size:12px;color:#1a2744;">
You are receiving this because you are enrolled with Concept Lab Education. Reply to this email to reach your teacher, or reply &ldquo;Unsubscribe&rdquo; to stop these updates.<br><br>
Concept Lab Education · 44 Block C, New Muslim Town, Lahore · <a href="https://cognifypk.com/portal/" style="color:#1a2744;">cognifypk.com/portal</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

const text = (m: Email) =>
  [m.heading, "", m.body, "", m.cta_label && m.cta_url ? `${m.cta_label}: ${m.cta_url}` : "", "", "You are receiving this because you are enrolled with Concept Lab Education. Reply to reach your teacher, or reply \"Unsubscribe\" to stop these updates.", "Concept Lab Education · 44 Block C, New Muslim Town, Lahore · cognifypk.com/portal"]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async () => {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return new Response("RESEND_API_KEY is not set", { status: 503 });

  const secret = (() => {
    try {
      return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default as string | undefined;
    } catch {
      return undefined;
    }
  })() ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) return new Response("No Supabase secret key", { status: 500 });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, secret, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc("claim_emails", { p_limit: 40 });
  if (error) return new Response(`claim failed: ${error.message}`, { status: 500 });

  let sent = 0;
  for (const m of (data ?? []) as Email[]) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [m.to_email],
        reply_to: REPLY_TO,
        headers: { "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=Unsubscribe>` },
        subject: m.subject,
        html: html(m),
        text: text(m),
      }),
    });
    if (res.ok) {
      sent++;
      await sb.from("email_outbox").update({ sent_at: new Date().toISOString(), last_error: null }).eq("id", m.id);
    } else {
      await sb.from("email_outbox").update({ last_error: (await res.text()).slice(0, 500) }).eq("id", m.id);
    }
    await sleep(550); // stay under Resend's 2 requests/second
  }
  return Response.json({ claimed: data?.length ?? 0, sent });
});
