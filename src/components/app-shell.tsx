import Link from "next/link";
import { NotificationsBell } from "@/components/notifications-bell";
import { SidebarNav } from "@/components/sidebar-nav";
import { StaffMobileNav } from "@/components/staff-mobile-nav";
import { BrandLogo } from "@/components/brand-logo";
import { PageTransition } from "@/components/page-transition";
import { ProfileMenu } from "@/components/profile-menu";
import { OverdueInvoicesButton, type OverdueInvoice } from "@/components/overdue-invoices-button";
import type { SessionUser } from "@/lib/auth";
import { canViewAuditLog } from "@/lib/auth";
import type { StaffNotice } from "@/lib/notification-ui";

export function AppShell({
  user,
  unread,
  overdue,
  children,
}: {
  user: SessionUser;
  unread: StaffNotice[];
  overdue: OverdueInvoice[];
  children: React.ReactNode;
}) {
  const today = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const showAuditLog = canViewAuditLog(user);

  return (
    <div className="staff-app relative min-h-screen w-full max-w-full overflow-x-clip">
      <aside data-staff-aside className="anim-slide-in sidebar-sheen fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col overflow-hidden border-r border-white/10 text-stone-100 shadow-[8px_0_32px_rgba(31,41,51,0.18)] lg:flex">
        <div className="h-1 w-full bg-gradient-to-r from-menu via-[#7ee0d8] to-menu/30" />
        <div className="px-4 py-5">
          <BrandLogo />
        </div>
        <SidebarNav showAuditLog={showAuditLog} />
      </aside>
      <div className="min-w-0 lg:pl-[272px]" data-staff-content>
        <header className="glass-panel sticky top-0 z-20 border-b border-white/80 px-4 py-3.5 shadow-[0_8px_30px_rgba(31,41,51,0.04)] sm:px-6" data-staff-header>
          <div className="flex items-center justify-between gap-3">
            <Link className="min-w-0 lg:hidden" href="/dispatch">
              <BrandLogo className="min-w-0 text-navy" size="sm" />
            </Link>
            <Link className="hidden lg:block" href="/dispatch">
              <p className="text-sm font-semibold text-navy">ООО «Рэдианс» · диспетчерская</p>
              <p className="text-xs capitalize text-stone-400">{today}</p>
            </Link>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <OverdueInvoicesButton overdue={overdue} />
              <NotificationsBell items={unread} />
              <ProfileMenu
                user={{ name: user.name, login: user.login, role: user.role, phone: user.phone }}
              />
            </div>
          </div>
        </header>
        <main className="relative z-[1] min-w-0 overflow-x-clip p-4 pb-24 sm:p-6 sm:pb-24 lg:p-9 lg:pb-9" data-staff-main>
          <PageTransition>{children}</PageTransition>
        </main>
        <StaffMobileNav showAuditLog={showAuditLog} />
      </div>
    </div>
  );
}
