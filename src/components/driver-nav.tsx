"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock3, History } from "lucide-react";
import { cn } from "@/lib/utils";

export function DriverNav({ actionCount = 0 }: { actionCount?: number }) {
  const pathname = usePathname();
  const todayActive = pathname === "/driver" || pathname.startsWith("/driver/orders");
  const shiftActive = pathname.startsWith("/driver/shift");
  const historyActive = pathname.startsWith("/driver/history");

  return (
    <nav className="driver-nav fixed bottom-0 left-0 right-0 z-30 mx-auto flex border-t border-slate-200/80 bg-white/95 px-1 pt-1 shadow-[0_-8px_30px_rgba(31,41,51,0.1)] backdrop-blur-md">
      <NavItem active={todayActive} badge={actionCount} href="/driver" icon={CalendarDays} label="Сегодня" />
      <NavItem active={shiftActive} href="/driver/shift" icon={Clock3} label="Смена" />
      <NavItem active={historyActive} href="/driver/history" icon={History} label="История" />
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: typeof CalendarDays;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      className={cn(
        "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-bold transition-colors",
        active ? "text-menu-hover" : "text-slate-400",
      )}
      href={href}
    >
      <span className="relative">
        <Icon className={cn("h-6 w-6", active ? "stroke-[2.4]" : "stroke-[1.8]")} />
        {badge ? (
          <span className="absolute -right-2.5 -top-1 min-w-4 rounded-full bg-menu px-1 text-center text-[10px] font-extrabold leading-4 text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      {label}
    </Link>
  );
}
