import { cn } from "@/lib/utils";

export function SectionLabel({
  index,
  children,
  className,
}: {
  index: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-navy/55",
        className
      )}
    >
      <span className="text-gold">{index}</span>
      <span className="h-px w-8 bg-gold/40" />
      <span>{children}</span>
    </div>
  );
}
