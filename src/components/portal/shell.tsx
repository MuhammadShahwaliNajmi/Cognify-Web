"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, LogOut, type LucideIcon } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/ui/logo";
import { cn, spring } from "@/lib/utils";
import { usePortal } from "@/lib/portal/store";
import { fmtRelative } from "@/lib/portal/format";
import type { Role } from "@/lib/portal/types";
import { Avatar, Chip, Modal } from "./ui";

export type NavItem = { href: string; label: string; short?: string; icon?: LucideIcon; badge?: number };

const norm = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);

/** Portal frame: slim white header, a row of tabs, one clean page underneath. */
export function Shell({ role, nav, children }: { role: Role; nav: NavItem[]; children: React.ReactNode }) {
  const { ready, auth, me, db, now, signOut, toasts } = usePortal();
  const router = useRouter();
  const pathname = norm(usePathname() ?? "");
  const [news, setNews] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const allowed = ready && auth?.role === role && me;
  useEffect(() => {
    if (ready && !allowed) router.replace("/portal/");
  }, [ready, allowed, router]);

  // close the account menu on outside click / Escape
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

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
  const sub = "plan" in me ? "Student" : me.title || "Teacher";

  const leave = async () => {
    setMenu(false);
    await signOut();
    router.replace("/portal/");
  };

  return (
    <div data-portal className="min-h-[100dvh] bg-white text-navy">
      {/* ---------- header + tabs ---------- */}
      <header className="sticky top-0 z-40 border-b border-navy/10 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 pt-4 md:px-8">
          <Link href={nav[0].href} aria-label="Portal home">
            <Wordmark />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNews(true)}
              aria-label={`Announcements${fresh ? `, ${fresh} new` : ""}`}
              className="relative grid h-10 w-10 place-items-center rounded-full text-navy/60 transition-colors hover:bg-navy/[0.04] hover:text-navy focus-gold"
            >
              <Bell size={18} />
              {fresh > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-gold ring-2 ring-white" />}
            </button>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenu((v) => !v)}
                aria-label="Account"
                aria-expanded={menu}
                className="rounded-full focus-gold"
              >
                <Avatar name={me.name} size="sm" />
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-64 rounded-2xl border border-navy/10 bg-white p-2 shadow-[0_20px_50px_-20px_rgba(26,39,68,0.35)]"
                  >
                    <div className="px-3 py-2.5">
                      <p className="truncate text-sm font-semibold text-navy">{me.name}</p>
                      <p className="truncate text-[13px] text-navy/50">{me.email}</p>
                      <p className="mt-0.5 text-[13px] text-navy/50">{sub}</p>
                    </div>
                    <button
                      type="button"
                      onClick={leave}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-navy transition-colors hover:bg-navy/[0.04] focus-gold"
                    >
                      <LogOut size={15} className="text-navy/50" />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <nav aria-label="Portal" className="no-scrollbar mx-auto max-w-5xl overflow-x-auto px-3 md:px-6">
          <div className="flex gap-1">
            {nav.map((item) => {
              const on = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-1.5 whitespace-nowrap px-3 pb-3 pt-4 text-[14px] font-medium tracking-tight transition-colors focus-gold",
                    on ? "text-navy" : "text-navy/50 hover:text-navy/80"
                  )}
                >
                  {item.label}
                  {!!item.badge && (
                    <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 text-[11px] font-bold tabular-nums text-navy-deep">
                      {item.badge}
                    </span>
                  )}
                  {on && (
                    <motion.span
                      layoutId="portal-tab"
                      className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-gold"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* ---------- page ---------- */}
      <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8 md:px-8 md:pt-10">{children}</main>

      {/* ---------- announcements ---------- */}
      <Modal open={news} onClose={() => setNews(false)} title="Announcements">
        {announcements.length === 0 ? (
          <p className="text-sm text-navy/55">Nothing new right now.</p>
        ) : (
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
        )}
      </Modal>

      {/* ---------- toasts ---------- */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
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
