"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Landmark,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Radio,
  ScrollText,
  Tags,
  Truck,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN = [
  { href: "/dispatch", label: "Диспетчер", icon: Radio },
  { href: "/orders", label: "Заявки", icon: ClipboardList },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
] as const;

const MORE = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/customers", label: "Заказчики", icon: Building2 },
  { href: "/fleet", label: "Парк", icon: Truck },
  { href: "/drivers", label: "Водители", icon: Users },
  { href: "/documents", label: "Документы", icon: FileText },
  { href: "/finance", label: "Оплаты", icon: Wallet },
  { href: "/reports", label: "Отчёты", icon: BarChart3 },
  { href: "/settings/organizations", label: "Организации", icon: Landmark },
  { href: "/settings/prices", label: "Прайс", icon: Tags },
  { href: "/settings/sms", label: "Уведомления", icon: MessageSquare },
  { href: "/settings/users", label: "Сотрудники", icon: UserCog },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function StaffMobileNav({ showAuditLog = false }: { showAuditLog?: boolean }) {
  const pathname = usePathname();
  const more = showAuditLog
    ? [...MORE, { href: "/settings/audit", label: "Журнал действий", icon: ScrollText }]
    : MORE;
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = more.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  return (
    <>
      <nav className="staff-mobile-nav fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200/80 bg-white/95 px-1 pt-1 shadow-[0_-8px_30px_rgba(31,41,51,0.1)] backdrop-blur-md lg:hidden">
        {MAIN.map((item) => (
          <NavItem active={isActive(pathname, item.href)} href={item.href} icon={item.icon} key={item.href} label={item.label} />
        ))}
        <button
          className={cn(
            "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-bold transition-colors",
            moreActive || moreOpen ? "text-menu-hover" : "text-slate-400",
          )}
          onClick={() => setMoreOpen(true)}
          type="button"
        >
          <MoreHorizontal className={cn("h-6 w-6", moreActive || moreOpen ? "stroke-[2.4]" : "stroke-[1.8]")} />
          Ещё
        </button>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Закрыть меню"
            className="absolute inset-0 bg-navy/40 backdrop-blur-[2px]"
            onClick={() => setMoreOpen(false)}
            type="button"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[min(78vh,32rem)] overflow-hidden rounded-t-[1.75rem] bg-white shadow-[0_-12px_40px_rgba(31,41,51,0.18)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-extrabold text-navy">Разделы</p>
              <button
                aria-label="Закрыть"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
                onClick={() => setMoreOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {more.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center text-[11px] font-bold transition",
                      active ? "bg-menu-soft text-menu-hover ring-1 ring-menu/25" : "bg-slate-50 text-slate-600 hover:bg-slate-100",
                    )}
                    href={item.href}
                    key={item.href}
                    onClick={() => setMoreOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Radio;
  active: boolean;
}) {
  return (
    <Link
      className={cn(
        "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-bold transition-colors",
        active ? "text-menu-hover" : "text-slate-400",
      )}
      href={href}
    >
      <Icon className={cn("h-6 w-6", active ? "stroke-[2.4]" : "stroke-[1.8]")} />
      {label}
    </Link>
  );
}
