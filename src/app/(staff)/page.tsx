import Link from "next/link";
import { ClipboardList, Clock3, Truck, Wrench, FileCheck, Receipt, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { StatCard } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDateTime, money } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/constants";

export default async function DashboardPage() {
  await requireStaff();
  const [
    newCount,
    assignCount,
    inWork,
    reports,
    unpaidInvoices,
    recent,
    onShift,
  ] = await Promise.all([
    prisma.order.count({ where: { status: ORDER_STATUSES.NEW } }),
    prisma.order.count({ where: { status: { in: [ORDER_STATUSES.ASSIGNED, ORDER_STATUSES.DECLINED] } } }),
    prisma.order.count({
      where: { status: { in: [ORDER_STATUSES.ACCEPTED, ORDER_STATUSES.EN_ROUTE, ORDER_STATUSES.ON_SITE] } },
    }),
    prisma.order.count({ where: { status: ORDER_STATUSES.REPORT_SUBMITTED } }),
    prisma.invoice.findMany({
      where: { status: { not: "PAID" } },
      include: { order: { include: { customer: true } }, payments: true },
      orderBy: { issuedAt: "asc" },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: true, equipmentType: true },
    }),
    prisma.driverShift.count({ where: { endedAt: null } }),
  ]);

  const remaining = (inv: (typeof unpaidInvoices)[number]) =>
    Math.max(inv.amount - inv.payments.reduce((s, p) => s + p.amount, 0), 0);
  const debt = unpaidInvoices.reduce((s, inv) => s + remaining(inv), 0);
  const overdue = unpaidInvoices.slice(0, 6);

  return (
    <div>
      <div className="relative mb-7 overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#5d6874] via-[#4e5864] to-[#3a434d] p-7 text-white shadow-[0_22px_50px_rgba(31,41,51,0.2)]">
        <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-menu/30 blur-3xl" />
        <div className="absolute -bottom-10 right-16 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <p className="relative text-[11px] font-bold uppercase tracking-[0.22em] text-menu-soft">ООО «Рэдианс»</p>
        <h1 className="relative mt-2 text-3xl font-extrabold tracking-tight">Дашборд</h1>
        <p className="relative mt-2 max-w-xl text-sm leading-relaxed text-white/70">
          Сводка по заявкам, отчётам и оплатам. Оперативка — в окне диспетчера.
        </p>
        <Link
          className="relative mt-5 inline-flex h-10 items-center rounded-2xl bg-menu px-4 text-sm font-semibold text-white shadow-md shadow-black/20 hover:bg-menu-hover"
          href="/dispatch"
        >
          Открыть диспетчерскую
        </Link>
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger-in">
        <StatCard href="/orders?status=NEW" icon={<ClipboardList className="h-4 w-4" />} label="Новые заявки" value={newCount} hint="ещё без техники" />
        <StatCard href="/orders?status=ASSIGNED" icon={<Truck className="h-4 w-4" />} label="Ждут назначения" value={assignCount} hint="назначить водителя" />
        <StatCard href="/orders" icon={<Wrench className="h-4 w-4" />} label="В работе" value={inWork} hint="выехал / на объекте" />
        <StatCard href="/orders?status=REPORT_SUBMITTED" icon={<FileCheck className="h-4 w-4" />} label="Отчёты на проверке" value={reports} tone="warn" />
        <StatCard href="/finance" icon={<Receipt className="h-4 w-4" />} label="Неоплаченных счетов" value={unpaidInvoices.length} tone="warn" />
        <StatCard href="/finance" icon={<Wallet className="h-4 w-4" />} label="Дебиторка" value={money(debt)} hint="сумма к получению" />
        <StatCard href="/drivers/timesheet" icon={<Clock3 className="h-4 w-4" />} label="На линии" value={onShift} hint="начали смену" tone="accent" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-navy">
                <span className="h-1.5 w-1.5 rounded-full bg-menu" />
                Последние заявки
              </h2>
              <Link className="text-sm font-semibold text-menu-hover hover:underline" href="/orders">
                Все заявки
              </Link>
            </div>
            {recent.length === 0 ? (
              <EmptyState
                actionHref="/orders/new"
                actionLabel="Создать заявку"
                description="Новые заявки с сайта и из кабинета появятся здесь"
                title="Заявок пока нет"
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>№</Th>
                    <Th>Заказчик</Th>
                    <Th>Когда</Th>
                    <Th>Статус</Th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id}>
                      <Td>
                        <Link className="font-semibold text-navy hover:text-menu-hover hover:underline" href={`/orders/${o.id}`}>
                          {o.number}
                        </Link>
                      </Td>
                      <Td>{o.customer.name}</Td>
                      <Td className="whitespace-nowrap text-stone-500">{formatDateTime(o.scheduledAt)}</Td>
                      <Td>
                        <StatusBadge status={o.status} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-navy">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Дебиторская задолженность
              </h2>
              <Link className="text-sm font-semibold text-menu-hover hover:underline" href="/finance">
                Оплаты
              </Link>
            </div>
            {overdue.length === 0 ? (
              <EmptyState
                actionHref="/finance"
                actionLabel="Журнал оплат"
                className="bg-emerald-50/80"
                description="Все выставленные счета закрыты"
                title="Неоплаченных счетов нет"
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Счёт</Th>
                    <Th>Заказчик</Th>
                    <Th>К оплате</Th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.map((inv) => (
                    <tr key={inv.id}>
                      <Td>
                        <Link className="font-semibold text-navy hover:text-menu-hover hover:underline" href={`/orders/${inv.orderId}`}>
                          {inv.number}
                        </Link>
                      </Td>
                      <Td>{inv.order.customer.name}</Td>
                      <Td className="font-semibold">{money(remaining(inv))}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
