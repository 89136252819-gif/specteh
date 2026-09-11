import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo.png?v=3";

const SIZES = {
  sm: 32,
  md: 44,
  lg: 64,
} as const;

export function BrandLogo({
  className,
  showWordmark = true,
  subtitle = "заявки спецтехники",
  size = "md",
  glow = false,
  subtitleUppercase = true,
}: {
  className?: string;
  showWordmark?: boolean;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  glow?: boolean;
  subtitleUppercase?: boolean;
}) {
  const px = SIZES[size];

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <span
        className={cn("inline-flex shrink-0 overflow-hidden rounded-full bg-[#050533]", glow && "logo-glow")}
        style={{ width: px, height: px }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Рэдианс" className="h-full w-full object-cover" height={px} src={LOGO_SRC} width={px} />
      </span>
      {showWordmark ? (
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-extrabold tracking-tight">Рэдианс-СпецТех</div>
          {subtitle ? (
            <div
              className={cn(
                "truncate opacity-55",
                subtitleUppercase ? "text-[10px] font-semibold uppercase tracking-[0.16em]" : "text-xs font-medium",
              )}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
