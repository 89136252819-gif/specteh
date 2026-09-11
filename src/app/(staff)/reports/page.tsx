import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { SummaryStat } from "@/components/directory-chrome";
import { Card, CardBody } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { ReportsFilters } from "@/components/reports-filters";
import { formatDate, formatHoursMinutes, money } from "@/lib/utils";
import { elapsedInRange, fromIsoDay } from "@/lib/timesheet";
import {
  invoiceWhere,
  orderWhere,
  parseReportFilters,
  periodPresets,
  toQuery,
} from "@/lib/report-query";
import { invoiceStatusLabel, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/constants";
import { EquipmentTypeLabel } from "@/components/equipment-type-icon";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  let filters = parseReportFilters(sp);
  if (!sp.from && !sp.to && !sp.customerId) {
    const half = periodPresets().find((p) => p.key === "half");
    if (half) filters = { ...filters, from: half.from, to: half.to };
  }

  const [customers, organizations, types, units, driverRows, invoices, fleetOrders, openActs, shifts] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.organization.findMany({ orderBy: { shortName: "asc" }, select: { id: true, shortName: true } }),
    prisma.equipmentType.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.equipment.findMany({ orderBy: { plateNumber: "asc" }, select: { id: true, name: true, plateNumber: true } }),
    prisma.driver.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
    prisma.invoice.findMany({
      where: invoiceWhere(filters),
      include: {
        organization: true,
        payments: true,
        order: { include: { customer: true, equipmentType: true, equipment: true, driver: { include: { user: true } } } },
      },
      orderBy: { issuedAt: "asc" },
    }),
    prisma.order.findMany({
      where: orderWhere(filters),
      select: { equipmentId: true, equipment: { select: { id: true, name: true, plateNumber: true, type: true } } },
    }),
    prisma.order.count({ where: { status: { in: ["VERIFIED", "REPORT_SUBMITTED"] }, act: null } }),
    prisma.driverShift.findMany({
      where: {
        ...(filters.driverId ? { driverId: filters.driverId } : {}),
        ...(filters.to ? { startedAt: { lte: fromIsoDay(filters.to, true) } } : {}),
        ...(filters.from
          ? { OR: [{ endedAt: null }, { endedAt: { gte: fromIsoDay(filters.from) } }] }
          : {}),
      },
      include: { driver: { include: { user: true } } },
    }),
  ]);

  const revenue = invoices.reduce((s, i) => s + i.amount, 0);
  const paid = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amount, 0);
  const debt = invoices
    .filter((i) => i.status !== "PAID")
    .reduce((s, i) => s + i.amount - i.payments.reduce((p, x) => p + x.amount, 0), 0);

  const byOrg = new Map<string, number>();
  const byCustomer = new Map<string, number>();
  const byType = new Map<string, number>();
  const byMonth = new Map<string, number>();
  for (const inv of invoices) {
    byOrg.set(inv.organization.shortName, (byOrg.get(inv.organization.shortName) || 0) + inv.amount);
    byCustomer.set(inv.order.customer.name, (byCustomer.get(inv.order.customer.name) || 0) + inv.amount);
    byType.set(inv.order.equipmentType.name, (byType.get(inv.order.equipmentType.name) || 0) + inv.amount);
    const d = new Date(inv.issuedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) || 0) + inv.amount);
  }

  const fleetMap = new Map<string, { name: string; type: string; count: number }>();
  for (const o of fleetOrders) {
    if (!o.equipment) continue;
    const cur = fleetMap.get(o.equipment.id) || {
      name: `${o.equipment.plateNumber} · ${o.equipment.name}`,
      type: o.equipment.type.name,
      count: 0,
    };
    cur.count += 1;
    fleetMap.set(o.equipment.id, cur);
  }

  const rangeFrom = filters.from ? fromIsoDay(filters.from) : new Date(2000, 0, 1);
  const rangeTo = filters.to ? fromIsoDay(filters.to, true) : new Date();
  const hoursByDriver = new Map<string, number>();
  const now = new Date();
  for (const shift of shifts) {
    const ms = elapsedInRange(shift.startedAt, shift.endedAt, rangeFrom, rangeTo, now);
    if (!ms) continue;
    const name = shift.driver.user.name;
    hoursByDriver.set(name, (hoursByDriver.get(name) || 0) + ms);
  }
  const hourRows = [...hoursByDriver.entries()].sort((a, b) => b[1] - a[1]);

  const monthRows = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const monthMax = Math.max(...monthRows.map(([, v]) => v), 1);
  const q = toQuery(filters);
  const periodLabel =
    filters.from || filters.to
      ? `${filters.from ? formatDate(filters.from) : "…"} — ${filters.to ? formatDate(filters.to) : "…"}`
      : "весь период";

  return (
    <div>
      <PageHeader
        title="Отчёты"
        subtitle={`Выборка: ${periodLabel}. Счета, дебиторка и загрузка парка по выбранным параметрам.`}
        actions={
          <a
            className="inline-flex h-10 shrink-0 items-center rounded-2xl bg-gradient-to-b from-menu to-menu-hover px-4 text-sm font-semibold text-white shadow-md shadow-menu/25 hover:from-menu-hover"
            href={`/api/export/excel${q}`}
          >
            Сформировать отчёт
          </a>
        }
      />
      <ReportsFilters
        filters={filters}
        customers={customers}
        organizations={organizations.map((o) => ({ id: o.id, name: o.shortName }))}
        types={types}
        units={units}
        drivers={driverRows.map((d) => ({ id: d.id, name: d.user.name }))}
      />

      <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <SummaryStat hint={`${invoices.length} счетов`} label="Выручка" value={money(revenue)} />
        <SummaryStat hint="поступило на счета" label="Оплачено" tone="ok" value={money(paid)} />
        <SummaryStat hint="остаток к получению" label="Дебиторка" tone="warn" value={money(debt)} />
        <SummaryStat hint="вне фильтра периода" label="Незакрытые акты" value={String(openActs)} />
      </div>

      <Card className="mb-6">
        <CardBody>
          <h2 className="mb-4 text-base font-bold">Выручка по месяцам</h2>
          {monthRows.length === 0 ? (
            <p className="text-sm text-stone-500">Нет счетов в выбранном периоде</p>
          ) : (
            <div className="space-y-2">
              {monthRows.map(([key, sum]) => {
                const [yy, mm] = key.split("-");
                const label = new Date(Number(yy), Number(mm) - 1, 1).toLocaleDateString("ru-RU", {
                  month: "long",
                  year: "numeric",
                });
                return (
                  <div key={key} className="grid grid-cols-[8rem_1fr_7rem] items-center gap-3 text-sm">
                    <div className="capitalize text-stone-600">{label}</div>
                    <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-coral to-brand"
                        style={{ width: `${Math.max((sum / monthMax) * 100, 4)}%` }}
                      />
                    </div>
                    <div className="text-right font-semibold">{money(sum)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Breakdown title="По юрлицам" rows={sorted(byOrg)} />
        <Breakdown title="По заказчикам" rows={sorted(byCustomer)} />
        <Breakdown icons title="По типам техники" rows={sorted(byType)} />
        <Card>
          <CardBody>
            <h2 className="mb-3 text-base font-bold">Загрузка парка</h2>
            <Table>
              <thead>
                <tr>
                  <Th>Техника</Th>
                  <Th>Тип</Th>
                  <Th>Заявок</Th>
                </tr>
              </thead>
              <tbody>
                {[...fleetMap.values()]
                  .sort((a, b) => b.count - a.count)
                  .map((u) => (
                    <tr key={u.name}>
                      <Td>{u.name}</Td>
                      <Td>
                        <EquipmentTypeLabel name={u.type} />
                      </Td>
                      <Td className="font-semibold">{u.count}</Td>
                    </tr>
                  ))}
              </tbody>
            </Table>
            {fleetMap.size === 0 ? <p className="text-sm text-stone-500">Нет заявок в выборке</p> : null}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="mb-3 text-base font-bold">Рабочее время водителей</h2>
            {hourRows.length === 0 ? (
              <p className="text-sm text-stone-500">Нет отмеченных смен в периоде</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Водитель</Th>
                    <Th>Часы</Th>
                  </tr>
                </thead>
                <tbody>
                  {hourRows.map(([name, ms]) => (
                    <tr key={name}>
                      <Td>{name}</Td>
                      <Td className="font-semibold">{formatHoursMinutes(ms)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h2 className="mb-3 text-base font-bold">Счета в выборке</h2>
          <Table>
            <thead>
              <tr>
                <Th>Счёт</Th>
                <Th>Дата</Th>
                <Th>Заказчик</Th>
                <Th>Техника</Th>
                <Th>Оплата</Th>
                <Th>Сумма</Th>
                <Th>Статус</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <Td>
                    <Link className="font-semibold text-brand-hover hover:underline" href={`/orders/${i.orderId}`}>
                      {i.number}
                    </Link>
                  </Td>
                  <Td>{formatDate(i.issuedAt)}</Td>
                  <Td>{i.order.customer.name}</Td>
                  <Td>{i.order.equipment?.plateNumber || i.order.equipmentType.name}</Td>
                  <Td>{PAYMENT_METHOD_LABELS[i.order.paymentMethod as PaymentMethod]}</Td>
                  <Td className="font-semibold">{money(i.amount)}</Td>
                  <Td>{invoiceStatusLabel(i.status)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

function sorted(map: Map<string, number>) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function Breakdown({ title, rows, icons }: { title: string; rows: [string, number][]; icons?: boolean }) {
  const max = Math.max(...rows.map(([, v]) => v), 1);
  return (
    <Card>
      <CardBody>
        <h2 className="mb-4 text-base font-bold">{title}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">Нет данных</p>
        ) : (
          <div className="space-y-3">
            {rows.map(([name, sum]) => (
              <div key={name}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  {icons ? <EquipmentTypeLabel className="font-medium" name={name} /> : <span className="font-medium">{name}</span>}
                  <span className="shrink-0 font-semibold">{money(sum)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.max((sum / max) * 100, 6)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
