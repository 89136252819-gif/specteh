import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-menu" />
          <span className="h-1 w-8 rounded-full bg-menu/70" />
        </div>
        <h1 className="text-[1.6rem] font-extrabold tracking-tight text-navy sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl break-words text-sm leading-relaxed text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto sm:justify-end">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  href,
  action,
}: {
  title: string;
  hint?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center shadow-sm anim-fade-in">
      <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-menu-soft" />
      <p className="font-semibold text-navy">{title}</p>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
      {href && action ? (
        <Link href={href} className="mt-4 inline-block text-sm font-semibold text-menu-hover hover:underline">
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  href,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  href: string;
  hint?: string;
  tone?: "default" | "accent" | "warn" | "ok";
  icon?: React.ReactNode;
}) {
  const tones = {
    default: "from-white to-slate-50 border-slate-200/70",
    accent: "from-menu-soft/80 to-white border-menu/25",
    warn: "from-amber-50 to-white border-amber-200/70",
    ok: "from-emerald-50 to-white border-emerald-200/70",
  };
  const bars = {
    default: "bg-brand",
    accent: "bg-menu",
    warn: "bg-amber-400",
    ok: "bg-emerald-500",
  };
  const wells = {
    default: "bg-slate-100 text-brand",
    accent: "bg-white text-menu-hover",
    warn: "bg-white text-amber-600",
    ok: "bg-white text-emerald-600",
  };
  return (
    <Link href={href} className="block">
      <div
        className={cn(
          "relative h-full overflow-hidden rounded-3xl border bg-gradient-to-br p-5 shadow-[0_10px_30px_rgba(31,41,51,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(31,41,51,0.1)]",
          tones[tone],
        )}
      >
        <div className={cn("absolute inset-y-0 left-0 w-1", bars[tone])} />
        <div className="flex items-start justify-between gap-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</div>
          {icon ? (
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", wells[tone])}>{icon}</div>
          ) : null}
        </div>
        <div className="mt-3 text-2xl font-extrabold tracking-tight text-navy">{value}</div>
        {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
      </div>
    </Link>
  );
}
