import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-black/5",
        className,
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status as OrderStatus;
  return (
    <Badge className={cn(ORDER_STATUS_COLORS[key] || "bg-slate-100 text-slate-700", className)}>
      {ORDER_STATUS_LABELS[key] || status}
    </Badge>
  );
}
