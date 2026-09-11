import { cn } from "@/lib/utils";

const TONES = [
  "bg-menu-soft text-menu-hover",
  "bg-slate-200 text-navy",
  "bg-sky-100 text-sky-800",
  "bg-amber-100 text-amber-900",
  "bg-violet-100 text-violet-800",
  "bg-teal-100 text-teal-800",
];

export function personInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function toneClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

export function PersonAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-2xl font-bold",
        size === "sm" ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-xs",
        toneClass(name),
        className,
      )}
    >
      {personInitials(name)}
    </span>
  );
}
