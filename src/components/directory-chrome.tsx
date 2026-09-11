"use client";

export function SummaryStat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "accent" | "warn" | "ok";
}) {
  const tones = {
    default: "border-slate-200/70 from-white to-slate-50",
    accent: "border-menu/25 from-menu-soft/80 to-white",
    warn: "border-amber-200/70 from-amber-50 to-white",
    ok: "border-emerald-200/70 from-emerald-50 to-white",
  };
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-3 shadow-[0_10px_30px_rgba(31,41,51,0.05)] sm:rounded-3xl sm:p-4 ${tones[tone]}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-[11px] sm:tracking-[0.14em]">{label}</div>
      <div className="mt-1 break-words text-lg font-extrabold leading-tight tracking-tight text-navy sm:mt-2 sm:text-2xl">{value}</div>
      {hint ? <div className="mt-0.5 hidden text-xs text-slate-400 sm:block">{hint}</div> : null}
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-sm font-semibold transition ${
        active ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
