"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Radio,
  ClipboardList,
  CalendarDays,
  Building2,
  Truck,
  Users,
  FileText,
  Wallet,
  BarChart3,
  Landmark,
  Tags,
  MessageSquare,
  UserCog,
  ChevronDown,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dispatch", label: "Диспетчер", icon: Radio },
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/orders", label: "Заявки", icon: ClipboardList },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/customers", label: "Заказчики", icon: Building2 },
  { href: "/fleet", label: "Парк", icon: Truck },
  { href: "/drivers", label: "Водители", icon: Users },
  { href: "/documents", label: "Документы", icon: FileText },
  { href: "/finance", label: "Оплаты", icon: Wallet },
  { href: "/reports", label: "Отчёты", icon: BarChart3 },
];

const SETTINGS = [
  { href: "/settings/organizations", label: "Организации", icon: Landmark },
  { href: "/settings/prices", label: "Прайс", icon: Tags },
  { href: "/settings/sms", label: "Уведомления", icon: MessageSquare },
  { href: "/settings/users", label: "Сотрудники", icon: UserCog },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-200",
        active
          ? "bg-menu text-white shadow-md shadow-menu/35"
          : "text-white/70 hover:translate-x-0.5 hover:bg-white/10 hover:text-white",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          active ? "bg-white/20" : "bg-white/10",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </Link>
  );
}

export function SidebarNav({ showAuditLog = false }: { showAuditLog?: boolean }) {
  const pathname = usePathname();
  const settings = showAuditLog
    ? [...SETTINGS, { href: "/settings/audit", label: "Журнал действий", icon: ScrollText }]
    : SETTINGS;
  const onSettings = settings.some((item) => isActive(pathname, item.href));
  const [open, setOpen] = useState(onSettings);

  useEffect(() => {
    if (onSettings) setOpen(true);
  }, [onSettings]);

  return (
    <nav className="flex min-h-0 flex-1 flex-col px-3 pb-4">
      <div className="space-y-0.5">
        {NAV.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}
      </div>
      <div className="mt-2 shrink-0 border-t border-white/10 pt-2">
        <button
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45 transition hover:bg-white/10 hover:text-white/70"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          Справочники
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-0.5 pb-1 pt-0.5">
              {settings.map((item, index) => (
                <div
                  className={cn(
                    "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
                  )}
                  key={item.href}
                  style={{ transitionDelay: open ? `${70 + index * 55}ms` : `${(settings.length - 1 - index) * 30}ms` }}
                >
                  <NavItem {...item} active={isActive(pathname, item.href)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export { NAV };
