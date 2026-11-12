"use client";

import { useEffect, useId } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn, spring } from "@/lib/utils";
import { initials } from "@/lib/portal/format";

/* Portal UI kit — the marketing site's visual language (white / navy / gold,
   mono micro-labels, rounded navy panels, gold pills) sized for an app. */

export function Card({
  className,
  tone = "white",
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { tone?: "white" | "navy" }) {
  return (
    <div
      className={cn(
        "rounded-[22px] p-5 md:p-6",
        tone === "navy"
          ? "glass-navy-solid text-white"
          : "border border-navy/10 bg-white shadow-[0_20px_50px_-38px_rgba(26,39,68,0.4)]",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("font-mono text-[11px] uppercase tracking-[0.2em] text-navy/45", className)}>
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
    soft: "bg-navy/[0.06] text-navy/70",
    outline: "border border-navy/15 text-navy/60",
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
    variant === "ghost" && "text-navy/65 hover:text-gold",
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
  eyebrow,
  title,
  gold,
  sub,
  actions,
}: {
  eyebrow?: string;
  title: string;
  gold?: string;
  sub?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 md:mb-9 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <Label>{eyebrow}</Label>}
        <h1 className="mt-2 text-[clamp(1.7rem,3.4vw,2.4rem)] font-semibold leading-[1.05] tracking-tightest text-navy">
          {title}
          {gold && (
            <>
              {" "}
              <span className="text-gold">{gold}</span>
            </>
          )}
        </h1>
        {sub && <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-navy/60">{sub}</p>}
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

/** Segmented control — the pricing toggle from the marketing site. */
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
    <div className={cn("no-scrollbar max-w-full overflow-x-auto", className)}>
      <div className="inline-flex rounded-full bg-navy-deep p-1">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={on}
              className="relative whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold tracking-tight focus-gold"
            >
              {on && (
                <motion.span
                  layoutId={`seg-${id}`}
                  className="absolute inset-0 rounded-full bg-gold"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className={cn("relative z-10 transition-colors duration-200", on ? "text-navy-deep" : "text-white/85")}>
                {o.label}
                {o.count !== undefined && (
                  <span className={cn("ml-1.5 tabular-nums", on ? "text-navy-deep/60" : "text-white/45")}>{o.count}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
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
                {eyebrow && <Label className="text-gold">{eyebrow}</Label>}
                <h2 className="mt-1.5 text-xl font-semibold leading-snug tracking-tight text-navy md:text-2xl">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-navy/12 text-navy/60 transition-colors hover:border-gold hover:text-gold focus-gold"
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
      {hint && <span className="mt-1.5 block text-xs text-navy/50">{hint}</span>}
    </label>
  );
}

export function Empty({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[22px] border border-dashed border-navy/15 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-navy/[0.05] text-navy/50">{icon}</span>
      <p className="mt-4 text-base font-semibold tracking-tight text-navy">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-navy/55">{text}</p>
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
      {sub && <p className={cn("mt-2 text-[13px]", onNavy ? "text-white/55" : "text-navy/55")}>{sub}</p>}
    </div>
  );
}

/** Staggered entrance for a page's blocks. */
export function Rise({ i = 0, className, children }: { i?: number; className?: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.soft, delay: 0.04 + i * 0.06 }}
    >
      {children}
    </motion.div>
  );
}
