"use client";

import { useState } from "react";
import { CalendarPlus, Copy, RefreshCw } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { usePortal } from "@/lib/portal/store";
import { Btn } from "./ui";

async function links(fresh = false) {
  const sb = getSupabase();
  if (!sb) throw new Error("The portal isn't connected.");
  const { data, error } = await sb.rpc("my_calendar_token", { p_new: fresh });
  if (error || !data) throw new Error(error?.message ?? "Couldn't make your calendar link.");
  const https = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calendar?t=${data}`;
  const webcal = https.replace(/^https:/, "webcal:");
  return { https, webcal, google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}` };
}

/** Put your classes (and deadlines) in Google / Apple Calendar; they stay up to date. Same link as the app. */
export function CalendarSync() {
  const { toast } = usePortal();
  const [open, setOpen] = useState(false);
  const run = async (pick: "google" | "apple" | "copy", fresh = false) => {
    try {
      const l = await links(fresh);
      if (pick === "google") window.open(l.google, "_blank", "noopener");
      if (pick === "apple") window.location.href = l.webcal;
      if (pick === "copy") {
        await navigator.clipboard.writeText(l.https);
        toast(fresh ? "New link copied. The old one has stopped working." : "Calendar link copied");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't make your calendar link.");
    }
  };
  return (
    <div className="relative">
      <Btn variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <CalendarPlus size={14} /> Add to my calendar
      </Btn>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-navy/10 bg-white p-2 shadow-xl">
          {[
            { label: "Google Calendar", pick: "google" as const },
            { label: "Apple Calendar", pick: "apple" as const },
          ].map((o) => (
            <button key={o.pick} type="button" onClick={() => run(o.pick)} className="block w-full rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold text-navy hover:bg-gold/15">
              {o.label}
            </button>
          ))}
          <button type="button" onClick={() => run("copy")} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold text-navy hover:bg-gold/15">
            <Copy size={14} /> Copy the link
          </button>
          <button
            type="button"
            onClick={() => window.confirm("Make a new link? The old one stops working.") && run("copy", true)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-navy hover:bg-gold/15"
          >
            <RefreshCw size={13} /> Make a new link
          </button>
        </div>
      )}
    </div>
  );
}
