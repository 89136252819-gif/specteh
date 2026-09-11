import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { box: string; svg: string }> = {
  sm: { box: "h-8 w-8 rounded-xl", svg: "h-4 w-4" },
  md: { box: "h-10 w-10 rounded-2xl", svg: "h-[1.15rem] w-[1.15rem]" },
  lg: { box: "h-12 w-12 rounded-[1.1rem]", svg: "h-6 w-6" },
};

function Glyph({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

function CraneGlyph({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx="6.2" cy="18.4" fill="currentColor" r="1.45" stroke="none" />
      <circle cx="12.6" cy="18.4" fill="currentColor" r="1.45" stroke="none" />
      <path d="M3.2 16.7h11.2V11H7.8L6.2 8.2H3.2z" />
      <path d="M14.2 12.2 21.2 4.4" />
      <path d="M21.2 4.4v6.2" />
      <path d="M20.3 10.6h1.8" />
    </Glyph>
  );
}

function ManipulatorGlyph({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx="6.2" cy="18.5" fill="currentColor" r="1.45" stroke="none" />
      <circle cx="16.6" cy="18.5" fill="currentColor" r="1.45" stroke="none" />
      <path d="M3.1 16.8h16.3v-4.2H8.1L6.6 9H3.1z" />
      <path d="M13.2 12.6v-3.8l3.6-3.2" />
      <path d="M16.8 5.6 20.6 8" />
      <path d="M20.6 8v3.1" />
    </Glyph>
  );
}

function DumpGlyph({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx="7" cy="18.4" fill="currentColor" r="1.45" stroke="none" />
      <circle cx="16.8" cy="18.4" fill="currentColor" r="1.45" stroke="none" />
      <path d="M3.2 16.7h17.6" />
      <path d="M3.2 16.7V10.8h4.2L9.4 14.2" />
      <path d="M9.2 14.4 13.2 7.6h7.6v6.8" />
    </Glyph>
  );
}

function BackhoeGlyph({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx="9.4" cy="18.4" fill="currentColor" r="1.45" stroke="none" />
      <circle cx="16.4" cy="18.4" fill="currentColor" r="1.45" stroke="none" />
      <path d="M8 16.7h9.8V11.2H11z" />
      <path d="M8 12.2 4 8.6 2.6 11.1" />
      <path d="M17.8 11.4 21 6.4" />
      <path d="M21 6.4v4.4h-2.4" />
    </Glyph>
  );
}

function TractorGlyph({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx="7.4" cy="16.8" r="3.1" />
      <circle cx="17.6" cy="17.6" r="1.7" />
      <path d="M10.4 16h5.8V11.2h-3.2L11.6 8.4H8.4" />
      <path d="M12.8 11.2h5.2" />
    </Glyph>
  );
}

function VanGlyph({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx="7" cy="18.3" fill="currentColor" r="1.45" stroke="none" />
      <circle cx="16.8" cy="18.3" fill="currentColor" r="1.45" stroke="none" />
      <path d="M3.2 16.6h17.6V8.6H11L8.4 6.2H3.2z" />
      <path d="M11 8.6v8" />
    </Glyph>
  );
}

function TruckGlyph({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx="7.2" cy="18.3" fill="currentColor" r="1.45" stroke="none" />
      <circle cx="16.8" cy="18.3" fill="currentColor" r="1.45" stroke="none" />
      <path d="M3.2 16.6h17.6V10.2H10L8.2 7.6H3.2z" />
    </Glyph>
  );
}

const PRESETS: { keys: string[]; Icon: (props: { className?: string }) => ReactNode; tone: string }[] = [
  { keys: ["манипулятор"], Icon: ManipulatorGlyph, tone: "bg-cyan-50 text-cyan-800 ring-cyan-100" },
  { keys: ["автокран", "кран"], Icon: CraneGlyph, tone: "bg-teal-50 text-teal-800 ring-teal-100" },
  { keys: ["экскаватор"], Icon: BackhoeGlyph, tone: "bg-menu-soft text-menu-hover ring-menu/20" },
  { keys: ["самосвал"], Icon: DumpGlyph, tone: "bg-amber-50 text-amber-800 ring-amber-100" },
  { keys: ["трактор"], Icon: TractorGlyph, tone: "bg-emerald-50 text-emerald-800 ring-emerald-100" },
  { keys: ["газель", "фургон", "бортов"], Icon: VanGlyph, tone: "bg-sky-50 text-sky-800 ring-sky-100" },
];

function matchType(name: string) {
  const normalized = name.toLowerCase();
  return PRESETS.find((preset) => preset.keys.some((key) => normalized.includes(key))) ?? {
    Icon: TruckGlyph,
    tone: "bg-slate-100 text-navy ring-slate-200/80",
  };
}

export function EquipmentTypeIcon({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: Size;
  className?: string;
}) {
  const { Icon, tone } = matchType(name);
  const dims = SIZES[size];
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center ring-1", dims.box, tone, className)}
      title={name}
    >
      <Icon className={dims.svg} />
    </span>
  );
}

export function EquipmentTypeLabel({
  name,
  size = "sm",
  className,
}: {
  name: string;
  size?: Size;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <EquipmentTypeIcon name={name} size={size} />
      <span className="min-w-0 truncate">{name}</span>
    </span>
  );
}
