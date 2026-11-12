"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, LogOut, type LucideIcon } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/ui/logo";
import { cn, spring } from "@/lib/utils";
import { usePortal } from "@/lib/portal/store";
import { fmtRelative } from "@/lib/portal/format";
import type { Role } from "@/lib/portal/types";
import { Avatar, Chip, Label, Modal } from "./ui";

export type NavItem = { href: string; label: string; short: string; icon: LucideIcon; badge?: number };

const norm = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);

export function Shell({ role, nav, children }: { role: Role; nav: NavItem[]; children: React.ReactNode }) {
  const { ready, auth, me, db, now, signOut, toasts } = usePortal();
  const router = useRouter();
  const pathname = norm(usePathname() ?? "");
  const [news, setNews] = useState(false);

  const allowed = ready && auth?.role === role && me;
  useEffect(() => {
    if (ready && !allowed) router.replace("/portal/");
  }, [ready, allowed, router]);

  if (!allowed) {
    return (
      <div data-portal className="grid min-h-[100dvh] place-items-center bg-white">
        <LogoMark className="h-12 w-12 animate-pulse-node" />
      </div>
    );
  }

  const cohortId = "cohortId" in me ? me.cohortId : null;
  const announcements = db.announcements.filter((a) => role === "teacher" || !a.cohortId || a.cohortId === cohortId);
  const fresh = announcements.filter((a) => now - new Date(a.at).getTime() < 36 * 3_600_000).length;
  const root = norm(nav[0].href);
  const isActive = (href: string) => {
    const h = norm(href);
    return h === root ? pathname === root : pathname.startsWith(h);
  };
  const sub = "plan" in me ? `${me.plan} plan` : me.title;

  const leave = async () => {
    await signOut();
    router.replace("/portal/");
  };

  const bell = (dark: boolean) => (
    <button
      type="button"
      onClick={() => setNews(true)}
      aria-label={`Announcements${fresh ? `, ${fresh} new` : ""}`}
      className={cn(
        "relative grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors focus-gold",
        dark
          ? "border-white/15 text-white/70 hover:border-gold hover:text-gold"
          : "border-navy/12 text-navy/70 hover:border-gold hover:text-gold"
      )}
    >
      <Bell size={16} />
      {fresh > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-navy-deep">
          {fresh}
        </span>
      )}
    </button>
  );

  return (
    <div data-portal className="relative min-h-[100dvh] bg-white text-navy">
      <div className="aura" style={{ position: "fixed" }} aria-hidden="true" />

      {/* ---------- desktop sidebar ---------- */}
      <aside className="glass-navy-solid fixed inset-y-3 left-3 z-40 hidden w-[15.5rem] flex-col rounded-[28px] p-4 lg:flex">
        <Link href={nav[0].href} aria-label="Portal home" className="px-2 pt-2">
          <Wordmark onDark />
        </Link>
        <Label className="mt-7 px-3 text-white/35">{role === "student" ? "Student portal" : "Teacher portal"}</Label>

        <nav className="mt-3 flex flex-col gap-1">
          {nav.map((item) => {
            const on = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className="relative flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium tracking-tight focus-gold"
              >
                {on && (
                  <motion.span
                    layoutId="side-pill"
                    className="absolute inset-0 rounded-full bg-gold"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <item.icon
                  size={17}
                  className={cn("relative z-10 transition-colors", on ? "text-navy-deep" : "text-white/55")}
                />
                <span className={cn("relative z-10 flex-1 transition-colors", on ? "font-semibold text-navy-deep" : "text-white/80")}>
                  {item.label}
                </span>
                {!!item.badge && (
                  <span
                    className={cn(
                      "relative z-10 grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                      on ? "bg-navy-deep text-gold" : "bg-gold text-navy-deep"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <div className="flex items-center gap-2.5 border-t border-white/10 pt-3.5">
            <Avatar name={me.name} size="sm" className="ring-1 ring-white/15" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">{me.name}</p>
              <p className="truncate text-[11px] text-white/50">{sub}</p>
            </div>
            {bell(true)}
            <button
              type="button"
              onClick={leave}
              aria-label="Sign out"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-gold hover:text-gold focus-gold"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------- mobile top bar ---------- */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-navy/10 bg-white/90 px-5 py-3 backdrop-blur-xl lg:hidden">
        <Link href={nav[0].href} aria-label="Portal home">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-2">
          {bell(false)}
          <button
            type="button"
            onClick={leave}
            aria-label="Sign out"
            className="grid h-9 w-9 place-items-center rounded-full border border-navy/12 text-navy/70 transition-colors hover:border-gold hover:text-gold focus-gold"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ---------- page ---------- */}
      <div className="lg:pl-[17rem]">
        <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-28 pt-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</main>
      </div>

      {/* ---------- mobile tab bar ---------- */}
      <nav
        className="fixed inset-x-3 bottom-3 z-40 grid rounded-[22px] bg-navy-deep p-1.5 shadow-[0_18px_40px_-14px_rgba(8,16,33,0.75)] lg:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
      >
        {nav.map((item) => {
          const on = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className="relative flex flex-col items-center gap-1 rounded-2xl py-2 focus-gold"
            >
              {on && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-2xl bg-gold"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10">
                <item.icon size={18} className={on ? "text-navy-deep" : "text-white/60"} />
                {!!item.badge && !on && (
                  <span className="absolute -right-2 -top-1.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-gold px-0.5 text-[9px] font-bold text-navy-deep">
                    {item.badge}
                  </span>
                )}
              </span>
              <span className={cn("relative z-10 text-[10px] font-semibold tracking-tight", on ? "text-navy-deep" : "text-white/60")}>
                {item.short}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ---------- announcements ---------- */}
      <Modal open={news} onClose={() => setNews(false)} eyebrow="Notice board" title="Announcements">
        <ul className="flex flex-col">
          {announcements.map((a) => (
            <li key={a.id} className="border-t border-navy/10 py-4 first:border-t-0 first:pt-0">
              <div className="flex items-center gap-2">
                <p className="flex-1 text-[15px] font-semibold tracking-tight text-navy">{a.title}</p>
                {now - new Date(a.at).getTime() < 36 * 3_600_000 && <Chip tone="gold">New</Chip>}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-navy/65">{a.body}</p>
              <p className="mt-2 text-xs text-navy/40">{fmtRelative(a.at, now)}</p>
            </li>
          ))}
        </ul>
      </Modal>

      {/* ---------- toasts ---------- */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-8">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={spring.snappy}
              role="status"
              className="flex items-center gap-2.5 rounded-full bg-navy-deep px-5 py-3 text-sm font-medium text-white shadow-[0_18px_40px_-14px_rgba(8,16,33,0.7)]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
