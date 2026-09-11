import Link from "next/link";
import { cn } from "@/lib/utils";

export function CtaLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center rounded-2xl bg-gradient-to-b from-menu to-menu-hover px-4 text-sm font-semibold text-white shadow-md shadow-menu/25 hover:from-menu-hover",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-navy">
      <span className="h-1.5 w-1.5 rounded-full bg-menu" />
      {children}
    </h2>
  );
}
