import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { SummaryStat } from "@/components/directory-chrome";
import { CalendarPeriodPicker } from "@/components/calendar-period";
import { CalendarBoard, type CalendarEvent, type CalendarPayKind } from "@/components/calendar-board";
import { money, BUSINESS_TZ } from "@/lib/utils";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { omskMonthRange, omskYmd } from "@/lib/timesheet";

function payKind(order: {
  invoice: { status: string; amount: number; payments: { amount: number }[] } | null;
}): CalendarPayKind {
  if (!order.invoice) return "none";
  const paid = order.invoice.payments.reduce((sum, item) => sum + item.amount, 0);
  if (order.invoice.status === "PAID" || paid >= order.invoice.amount - 0.01) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

function monthKeyFromDate(date = new Date()) {
  const ymd = omskYmd(date);
  return ymd.slice(0, 7);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const monthKey = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : monthKeyFromDate();
  const { start, end, year: y, month: m } = omskMonthRange(monthKey);
  const prevKey =
    m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const nextKey =
    m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;

  const orders = await prisma.order.findMany({
    where: {
      scheduledAt: { gte: start, lt: end },
      status: { not: "CANCELLED" },
    },
    include: {
      equipment: true,
      equipmentType: true,
      customer: true,
      driver: { include: { user: true } },
      invoice: { include: { payments: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const firstWeekday = (start.getUTCDay() + 6) % 7; // start is +06 so UTC day of month start is previous evening... 
  // Better: weekday of 1st in Omsk via Intl
  const weekdayName = new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TZ, weekday: "short" }).format(start);
  const weekdayMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const firstWd = weekdayMap[weekdayName] ?? 0;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: Array<number | null> = [
    ...Array(firstWd).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);

  const events: CalendarEvent[] = orders.map((order) => {
    const kind = payKind(order);
    const remaining = order.invoice
      ? Math.max(order.invoice.amount - order.invoice.payments.reduce((sum, item) => sum + item.amount, 0), 0)
      : 0;
    const day = Number(omskYmd(order.scheduledAt).slice(8, 10));
    return {
      id: order.id,
      day,
      href: `/orders/${order.id}`,
      time: new Intl.DateTimeFormat("ru-RU", {
        timeZone: BUSINESS_TZ,
        hour: "2-digit",
        minute: "2-digit",
      }).format(order.scheduledAt),
      title: order.equipment?.plateNumber || order.equipmentType.name,
      customer: order.customer.name,
      driver: order.driver?.user.name || null,
      status: ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status,
      payKind: kind,
      money: order.invoice ? money(kind === "paid" ? order.invoice.amount : remaining) : null,
    };
  });

  const title = start.toLocaleDateString("ru-RU", { month: "long", year: "numeric", timeZone: BUSINESS_TZ });
  const unpaidCount = events.filter((item) => item.payKind === "unpaid" || item.payKind === "partial").length;
  const unpaidSum = orders.reduce((sum, order) => {
    if (!order.invoice || payKind(order) === "paid") return sum;
    const paid = order.invoice.payments.reduce((acc, item) => acc + item.amount, 0);
    return sum + Math.max(order.invoice.amount - paid, 0);
  }, 0);
  const todayYmd = omskYmd();
  const todayDay = todayYmd.startsWith(monthKey) ? Number(todayYmd.slice(8, 10)) : null;

  return (
    <div className="min-w-0">
      <PageHeader
        title="Календарь загрузки"
        subtitle={`${title} · ${orders.length} заявок · к получению ${money(unpaidSum)}`}
        actions={
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <CalendarPeriodPicker year={y} month={m} />
            <div className="flex shrink-0 items-center gap-2">
              <Link
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white shadow-sm"
                href={`/calendar?month=${prevKey}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex h-10 flex-1 items-center justify-center rounded-2xl border border-stone-200 bg-white px-3 text-sm font-semibold shadow-sm sm:flex-none"
                href="/calendar"
              >
                Сегодня
              </Link>
              <Link
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white shadow-sm"
                href={`/calendar?month=${nextKey}`}
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryStat hint="в выбранном месяце" label="Заявок" value={orders.length} />
        <SummaryStat hint="с долгом или частичной оплатой" label="Не оплачено" tone="warn" value={unpaidCount} />
        <SummaryStat hint="остаток по счетам месяца" label="К получению" value={money(unpaidSum)} />
      </div>

      <CalendarBoard cells={cells} events={events} todayDay={todayDay} />
    </div>
  );
}
