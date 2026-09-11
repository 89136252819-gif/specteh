import type { Metadata, Viewport } from "next";
import { LogOut } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireDriver } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { PageTransition } from "@/components/page-transition";
import { DriverNav } from "@/components/driver-nav";
import { BrandLogo } from "@/components/brand-logo";
import { DriverPwaRegister } from "@/components/driver-pwa-register";
import { getMaxSetup } from "@/lib/max";

export const metadata: Metadata = {
  title: "Кабинет водителя — Рэдианс-СпецТех",
  manifest: "/driver-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Рэдианс",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4e5864",
};

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const user = await requireDriver();
  const [actionCount, me, maxSetup] = await Promise.all([
    user.driverId
      ? prisma.order.count({
          where: {
            driverId: user.driverId,
            status: { in: ["ASSIGNED", "ACCEPTED", "EN_ROUTE", "ON_SITE"] },
          },
        })
      : Promise.resolve(0),
    prisma.user.findUnique({ where: { id: user.id }, select: { maxUserId: true, phone: true } }),
    getMaxSetup(),
  ]);
  const botNick = maxSetup.botUsername.replace(/^@/, "");

  return (
    <div className="driver-app">
      <DriverPwaRegister />
      <header className="driver-header sticky top-0 z-20 flex items-center gap-2 border-b border-white/10 bg-gradient-to-r from-[#5d6874] to-[#3f4853] px-3 pb-3 text-white shadow-md">
        <div className="min-w-0 flex-1">
          <BrandLogo className="text-white" size="sm" subtitle={user.name} subtitleUppercase={false} />
        </div>
        <form action={logoutAction} className="shrink-0">
          <button
            aria-label="Выйти"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white/90"
            type="submit"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </form>
      </header>
      <main className="min-w-0 overflow-x-clip px-3 py-4">
        {!me?.maxUserId && botNick ? (
          <div className="mb-3 rounded-2xl bg-white/90 px-3 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
            Чтобы получать заявки в MAX, откройте бота{" "}
            <a className="font-semibold text-menu-hover" href={`https://max.ru/${botNick}`} rel="noopener noreferrer" target="_blank">
              @{botNick}
            </a>{" "}
            и напишите свой телефон{me?.phone ? ` (${me.phone})` : ""}. Привязка произойдёт автоматически.
          </div>
        ) : null}
        <PageTransition>{children}</PageTransition>
      </main>
      <DriverNav actionCount={actionCount} />
    </div>
  );
}
