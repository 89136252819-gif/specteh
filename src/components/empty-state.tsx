import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  onAction,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  const showAction = actionLabel && (actionHref || onAction);
  return (
    <div className={cn("rounded-2xl bg-slate-50 px-6 py-10 text-center", className)}>
      {Icon ? <Icon className="mx-auto h-10 w-10 text-slate-300" /> : null}
      <p className={cn("font-semibold text-navy", Icon ? "mt-3" : "")}>{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {showAction ? (
        actionHref ? (
          <Link
            className="mt-4 inline-flex h-10 items-center rounded-2xl bg-menu px-4 text-sm font-semibold text-white hover:bg-menu-hover"
            href={actionHref}
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            className="mt-4 inline-flex h-10 items-center rounded-2xl bg-menu px-4 text-sm font-semibold text-white hover:bg-menu-hover"
            onClick={onAction}
            type="button"
          >
            {actionLabel}
          </button>
        )
      ) : null}
    </div>
  );
}
