"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Users } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/ui/logo";
import { cn, spring } from "@/lib/utils";
import { usePortal } from "@/lib/portal/store";
import type { Role } from "@/lib/portal/types";
import { Avatar } from "./ui";

/** A top tab. With `children` it groups related pages (e.g. Classwork → Assignments, Assessments) under one tab. */
export type NavItem = { href: string; label: string; badge?: number; children?: NavItem[] };
export type MenuLink = { href: string; label: string };

const norm = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);

/** Portal frame: slim white header, a row of tabs, one clean page underneath. */
export function Shell({
  role,
  nav,
  menuLinks = [],
  children,
}: {
  role: Role;
  nav: NavItem[];
  menuLinks?: MenuLink[];
  children: React.ReactNode;
}) {
  const { ready, auth, me, parent, signOut, toasts } = usePortal();
  const router = useRouter();
  const pathname = norm(usePathname() ?? "");
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const firstPath = useRef(true);

  const allowed = ready && auth?.role === role && me;
  useEffect(() => {
    if (!ready || allowed) return;
    // remember where they were going (e.g. an email's "Open assignment") for after sign-in
    try {
      if (!auth) sessionStorage.setItem("cl-next", window.location.pathname + window.location.search);
    } catch {}
    router.replace("/portal/");
  }, [ready, allowed, auth, router]);

  // on phones the tabs scroll sideways: keep the current one in view
  const shown = !!allowed;
  useEffect(() => {
    const tabs = tabsRef.current;
    const active = tabs?.querySelector<HTMLElement>('[aria-current="page"]');
    if (tabs && active) tabs.scrollTo({ left: active.offsetLeft - (tabs.clientWidth - active.offsetWidth) / 2 });
  }, [pathname, shown]);

  // after moving to another page, put keyboard and screen-reader focus on its title
  useEffect(() => {
    if (!shown) return;
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    const h1 = mainRef.current?.querySelector<HTMLElement>("h1");
    if (h1) {
      h1.tabIndex = -1;
      h1.focus({ preventScroll: true });
    }
    setMenu(false);
  }, [pathname, shown]);

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
      <div data-portal className="grid min-h-[100dvh] place-items-center bg-white px-6">
        <div className="flex flex-col items-center">
          <LogoMark className="h-12 w-12 animate-pulse-node" />
          {toasts.length > 0 && (
            <p role="status" className="mt-5 text-center text-sm font-medium text-navy">
              {toasts[toasts.length - 1].text}
            </p>
          )}
        </div>
      </div>
    );
  }

  const root = norm(nav[0].href);
  const matches = (href: string) => {
    const h = norm(href);
    return h === root ? pathname === root : pathname.startsWith(h);
  };
  const isActive = (item: NavItem) => (item.children ? item.children.some((c) => matches(c.href)) : matches(item.href));
  const group = nav.find((item) => item.children && isActive(item));
  const sub = parent ? `Parent view of ${me.name}` : "plan" in me ? "Student" : me.title || "Teacher";

  const leave = async () => {
    setMenu(false);
    await signOut();
    router.replace("/portal/");
  };

  return (
    <div data-portal className="min-h-[100dvh] bg-white text-navy">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy-deep focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      {/* ---------- header + tabs ---------- */}
      <header className="sticky top-0 z-40 bg-navy-deep">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={nav[0].href} aria-label="Portal home">
              <Wordmark onDark />
            </Link>
            {parent && (
              <span className="truncate rounded-full border border-gold/70 px-2.5 py-1 text-[12px] font-semibold text-gold">
                Parent view
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenu((v) => !v)}
                aria-label="Account"
                aria-expanded={menu}
                className="rounded-full ring-1 ring-gold/60 focus-gold"
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
                      <p className="truncate text-[13px] text-navy">{me.email}</p>
                      <p className="mt-0.5 text-[12px] text-navy font-semibold">{sub}</p>
                    </div>
                    {menuLinks.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setMenu(false)}
                        aria-current={matches(l.href) ? "page" : undefined}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-navy transition-colors hover:bg-navy/[0.04] focus-gold"
                      >
                        <Users size={15} className="text-navy" />
                        {l.label}
                      </Link>
                    ))}
                    <div className="my-1 border-t border-navy/10" />
                    <button
                      type="button"
                      onClick={leave}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-navy transition-colors hover:bg-navy/[0.04] focus-gold"
                    >
                      <LogOut size={15} className="text-navy" />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <nav ref={tabsRef} aria-label="Portal" className="portal-tabs no-scrollbar relative mx-auto max-w-6xl overflow-x-auto px-3 md:px-6">
          {/* evenly spaced: on wider screens the tabs share the bar's width */}
          <div className="flex gap-1 md:gap-2">
            {nav.map((item) => {
              const on = isActive(item);
              return (
                <Link
                  key={item.label}
                  href={item.children ? item.children[0].href : item.href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "relative flex items-center justify-center gap-1.5 whitespace-nowrap px-3 pb-3 pt-4 text-[14px] font-medium tracking-tight transition-colors focus-gold md:flex-1",
                    on ? "text-white" : "text-white/65 hover:text-white",
                  )}
                >
                  {item.label}
                  {!!item.badge && (
                    <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 text-[12px] font-bold tabular-nums text-navy-deep">
                      {item.badge}
                    </span>
                  )}
                  {on && (
                    <motion.span
                      layoutId="portal-tab"
                      className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-gold"
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
      <main id="main" ref={mainRef} className="mx-auto w-full max-w-6xl px-5 pb-20 pt-6 md:px-8 md:pt-8">
        {group?.children && (
          <nav aria-label={group.label} className="mb-6 flex gap-2 md:mb-7">
            {group.children.map((c) => {
              const on = matches(c.href);
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors focus-gold",
                    on ? "bg-navy-deep text-white" : "border border-navy/15 text-navy hover:border-gold",
                  )}
                >
                  {c.label}
                  {!!c.badge && (
                    <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 text-[12px] font-bold tabular-nums text-navy-deep">
                      {c.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        )}
        {children}
      </main>

      {/* ---------- toasts ---------- */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex flex-col items-center gap-2 px-4">
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
