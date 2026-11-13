"use client";

import { useEffect, useId } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn, spring } from "@/lib/utils";
import { initials } from "@/lib/portal/format";

/* Portal UI kit — calm and uncluttered: white surfaces, hairline borders,
   navy text, gold only for the active state and the main action. */

export function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("font-mono text-[11px] uppercase tracking-[0.2em] text-navy", className)}>
      {children}
    </span>
  );
}

type ChipTone = "gold" | "navy" | "soft" | "outline" | "onNavy";
export function Chip({
  tone = "soft",
  dot,
  className,
  children,
}: {
  tone?: ChipTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const tones: Record<ChipTone, string> = {
    gold: "bg-gold text-navy-deep",
    navy: "bg-navy-deep text-gold",
    soft: "bg-navy/[0.06] text-navy",
    outline: "border border-navy/15 text-navy",
    onNavy: "bg-white/10 text-white/80",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight",
        tones[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 animate-pulse-node rounded-full bg-current" />}
      {children}
    </span>
  );
}

type BtnVariant = "gold" | "navy" | "outline" | "ghost" | "onNavy";
type BtnProps = {
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  href?: string;
  external?: boolean;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Btn({ variant = "navy", size = "md", href, external, className, children, ...rest }: BtnProps) {
  const cls = cn(
    "gloss inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-[background-color,border-color,color,transform,opacity] duration-200 focus-gold active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
    size === "sm" && "px-3.5 py-1.5 text-[13px]",
    size === "md" && "px-5 py-2.5 text-sm",
    size === "lg" && "px-7 py-3.5 text-[15px]",
    variant === "gold" && "bg-gold text-navy-deep hover:-translate-y-0.5",
    variant === "navy" && "bg-navy-deep text-white hover:bg-navy",
    variant === "outline" && "border border-navy/15 bg-white text-navy hover:border-gold hover:text-gold",
    variant === "ghost" && "text-navy hover:text-gold",
    variant === "onNavy" && "border border-white/20 text-white hover:border-gold hover:text-gold",
    className
  );
  if (href && external)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

export function PageHeader({
  title,
  gold,
  actions,
}: {
  title: string;
  gold?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-8">
      <div>
        <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight text-navy md:text-[1.9rem]">
          {title}
          {gold && <span className="text-gold"> {gold}</span>}
        </h1>
        <span className="mt-2.5 block h-[3px] w-10 rounded-full bg-gold" />
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-navy to-navy-deep font-semibold tracking-wide text-gold",
        size === "sm" && "h-8 w-8 text-[11px]",
        size === "md" && "h-10 w-10 text-[12px]",
        size === "lg" && "h-14 w-14 text-base",
        className
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Bar({ value, className, onNavy }: { value: number; className?: string; onNavy?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full", onNavy ? "bg-white/10" : "bg-navy/10", className)}>
      <motion.div
        className="h-full rounded-full bg-gold"
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={spring.soft}
      />
    </div>
  );
}

/** Sub-tabs inside a page: plain labels with a gold underline on the active one. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("no-scrollbar -mx-1 overflow-x-auto border-b border-navy/10", className)}>
      <div role="tablist" className="flex gap-1 px-1">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={on}
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={cn(
                "relative whitespace-nowrap px-3 pb-3 pt-1 text-[14px] font-medium tracking-tight transition-colors focus-gold",
                on ? "font-semibold text-navy" : "text-navy hover:text-navy"
              )}
            >
              {o.label}
              {o.count !== undefined && (
                <span className={cn("ml-1.5 rounded-full px-1.5 text-[12px] tabular-nums", on ? "bg-gold text-navy-deep" : "bg-navy/[0.07] text-navy")}>{o.count}</span>
              )}
              {on && (
                <motion.span
                  layoutId={`tab-${id}`}
                  className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gold"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Native select for choosing a student / cohort. */
export function Picker<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-2.5 text-sm font-medium text-navy">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-lg border border-navy/15 bg-white py-2 pl-3 pr-9 text-sm font-medium text-navy outline-none transition-colors hover:border-navy/30 focus:border-gold focus:ring-4 focus:ring-gold/15"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Dialog: bottom sheet on phones, centred panel on larger screens. */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-navy-deep/50 backdrop-blur-[3px]" onClick={onClose} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduce ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: 30, opacity: 0 }}
            transition={spring.snappy}
            className={cn(
              "thin-scroll relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-[0_40px_100px_-30px_rgba(8,16,33,0.6)] md:rounded-[28px] md:p-8",
              wide ? "md:max-w-3xl" : "md:max-w-xl"
            )}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                {eyebrow && <Label className="font-semibold">{eyebrow}</Label>}
                <h2 className="mt-1.5 text-xl font-semibold leading-snug tracking-tight text-navy md:text-2xl">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-navy/12 text-navy transition-colors hover:border-gold hover:text-gold focus-gold"
              >
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const fieldCls =
  "mt-2 w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-[15px] text-navy outline-none transition-all placeholder:text-navy/40 focus:border-gold focus:ring-4 focus:ring-gold/15";
export const labelCls = "block text-[11px] font-semibold uppercase tracking-[0.18em] text-navy";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-navy">{hint}</span>}
    </label>
  );
}

export function Empty({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[22px] border border-dashed border-navy/15 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-navy/[0.05] text-navy">{icon}</span>
      <p className="mt-4 text-base font-semibold tracking-tight text-navy">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-navy">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, onNavy }: { label: string; value: React.ReactNode; sub?: string; onNavy?: boolean }) {
  return (
    <div>
      <Label className={onNavy ? "text-white/45" : undefined}>{label}</Label>
      <p className={cn("mt-2 text-[1.9rem] font-semibold leading-none tracking-tight tabular-nums", onNavy ? "text-gold" : "text-navy")}>
        {value}
      </p>
      {sub && <p className={cn("mt-2 text-[13px]", onNavy ? "text-white/55" : "text-navy")}>{sub}</p>}
    </div>
  );
}

/** Gentle entrance for a page's blocks. */
export function Rise({ i = 0, className, children }: { i?: number; className?: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: Math.min(i, 4) * 0.04 }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- LMS building blocks ---------- */

/** Section heading inside a page. */
export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-[16px] font-semibold tracking-tight text-navy">
        <span className="h-4 w-[3px] rounded-full bg-gold" />
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Data table with clear column headings; scrolls sideways on small screens. */
export function Table({
  head,
  children,
  className,
  minWidth = 640,
}: {
  head: { label: string; align?: "left" | "right"; className?: string }[];
  children: React.ReactNode;
  className?: string;
  minWidth?: number;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-navy/15", className)}>
      <table className="w-full border-collapse text-left text-sm" style={{ minWidth }}>
        <thead>
          <tr className="bg-navy-deep">
            {head.map((h) => (
              <th
                key={h.label}
                scope="col"
                className={cn(
                  "whitespace-nowrap bg-navy-deep px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-gold",
                  h.align === "right" && "text-right",
                  h.className
                )}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy/10">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className,
  align,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right";
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("px-4 py-3 align-middle text-navy", align === "right" && "text-right", className)}>
      {children}
    </td>
  );
}

/** Small status label used in tables: navy = done, gold = needs attention, plain = neutral. */
export function Status({ tone = "plain", children }: { tone?: "done" | "attention" | "plain"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-semibold",
        tone === "done" && "bg-navy text-white",
        tone === "attention" && "bg-gold text-navy-deep",
        tone === "plain" && "bg-navy/[0.06] text-navy"
      )}
    >
      {children}
    </span>
  );
}

/** Single full-width row for an empty table. */
export function EmptyRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="py-8 text-sm text-navy">
        {/* stays in view when the table scrolls sideways on phones */}
        <div className="sticky left-0 w-[min(100%,calc(100vw-2.5rem))] px-4 text-center">{children}</div>
      </td>
    </tr>
  );
}

/** Clickable table row (opens a detail view). */
export function RowLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <tr
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick())}
      tabIndex={0}
      className="cursor-pointer transition-colors hover:bg-gold/[0.08] focus:bg-gold/[0.12] focus:outline-none"
    >
      {children}
    </tr>
  );
}

/** Navy band at the top of a dashboard: date, greeting and a few key figures. */
export function WelcomeBand({ date, title, figures }: { date: string; title: string; figures: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="mb-8 rounded-2xl bg-navy-deep p-6 md:p-7">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">{date}</p>
      <h1 className="mt-2 text-[1.6rem] font-bold leading-tight tracking-tight text-white md:text-[1.9rem]">{title}</h1>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/10 pt-5 sm:grid-cols-4">
        {figures.map((f) => (
          <div key={f.label}>
            <dd className="text-[1.6rem] font-bold leading-none tabular-nums text-gold">{f.value}</dd>
            <dt className="mt-1.5 text-[13px] text-white/80">{f.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Bordered side panel with a gold eyebrow and optional link. */
export function Panel({ title, link, children }: { title: string; link?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-navy/15">
      <div className="flex items-center justify-between rounded-t-xl bg-navy-deep px-5 py-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-gold">{title}</p>
        {link && (
          <Link href={link.href} className="text-[13px] font-medium text-white/85 hover:text-gold">
            {link.label}
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
