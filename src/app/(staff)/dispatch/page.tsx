import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { DispatchToolbar } from "@/components/dispatch-toolbar";
import { DispatchKanban, type DispatchColumn } from "@/components/dispatch-kanban";
import type { DispatchDriverOption, DispatchUnitOption } from "@/components/dispatch-assign-form";
import { CtaLink } from "@/components/ui/cta";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EQUIPMENT_STATUS_LABELS, ORDER_STATUSES } from "@/lib/constants";
import { EndDriverShiftButton } from "@/components/end-driver-shift-button";
import { formatDriverWhen, formatHoursMinutes, formatTime, phoneHref, phonePretty, shiftDurationMs } from "@/lib/utils";

const OPS = [
  ORDER_STATUSES.NEW,
  ORDER_STATUSES.ASSIGNED,
  ORDER_STATUSES.DECLINED,
  ORDER_STATUSES.ACCEPTED,
  ORDER_STATUSES.EN_ROUTE,
  ORDER_STATUSES.ON_SITE,
  ORDER_STATUSES.REPORT_SUBMITTED,
] as const;

const LATE_STATUSES = new Set<string>([
  ORDER_STATUSES.NEW,
  ORDER_STATUSES.ASSIGNED,
  ORDER_STATUSES.DECLINED,
  ORDER_STATUSES.ACCEPTED,
]);

const LIVE_STATUSES = new Set<string>([
  ORDER_STATUSES.ACCEPTED,
  ORDER_STATUSES.EN_ROUTE,
  ORDER_STATUSES.ON_SITE,
  ORDER_STATUSES.REPORT_SUBMITTED,
]);

const GRACE_MS = 15 * 60 * 1000;
const BUSINESS_TZ = "Asia/Omsk";

function startOfDay(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return new Date(`${year}-${month}-${day}T00:00:00+06:00`);
}

function isLate(order: { scheduledAt: Date; status: string }, now: number) {
  return LATE_STATUSES.has(order.status) && now - order.scheduledAt.getTime() > GRACE_MS;
}

function inDay(order: { scheduledAt: Date }, start: Date, end: Date) {
  return order.scheduledAt >= start && order.scheduledAt < end;
}

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ kiosk?: string }>;
}) {
  await requireStaff();
  const { kiosk } = await searchParams;
  const isKiosk = kiosk === "1";
  const now = Date.now();
  const todayStart = startOfDay();
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfter = new Date(tomorrowStart);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const [orders, drivers, units] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { status: { in: [...OPS] } },
          {
            scheduledAt: { gte: todayStart, lt: dayAfter },
            status: { notIn: [ORDER_STATUSES.CANCELLED] },
          },
        ],
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        equipmentType: { select: { name: true } },
        equipment: { select: { name: true, plateNumber: true } },
        driver: { include: { user: { select: { name: true, phone: true } } } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.driver.findMany({
      include: {
        user: { select: { name: true, phone: true } },
        defaultEquipment: { select: { plateNumber: true } },
        shifts: { where: { endedAt: null }, orderBy: { startedAt: "desc" }, take: 1 },
        orders: {
          where: { status: { in: [ORDER_STATUSES.ASSIGNED, ORDER_STATUSES.ACCEPTED, ORDER_STATUSES.EN_ROUTE, ORDER_STATUSES.ON_SITE] } },
          orderBy: { scheduledAt: "asc" },
          select: { id: true, number: true, status: true, address: true, scheduledAt: true },
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.equipment.findMany({
      include: {
        type: { select: { name: true } },
        orders: {
          where: { status: { in: [ORDER_STATUSES.ASSIGNED, ORDER_STATUSES.ACCEPTED, ORDER_STATUSES.EN_ROUTE, ORDER_STATUSES.ON_SITE] } },
          take: 1,
          orderBy: { scheduledAt: "asc" },
          select: { id: true, number: true, status: true },
        },
      },
      orderBy: { plateNumber: "asc" },
    }),
  ]);

  const customerIds = [...new Set(orders.map((order) => order.customer.id))];
  const unpaidInvoices =
    customerIds.length === 0
      ? []
      : await prisma.invoice.findMany({
          where: {
            status: { not: "PAID" },
            order: { customerId: { in: customerIds } },
          },
          select: {
            amount: true,
            payments: { select: { amount: true } },
            order: { select: { customerId: true } },
          },
        });
  const debtByCustomer = new Map<string, number>();
  for (const invoice of unpaidInvoices) {
    const paid = invoice.payments.reduce((sum, item) => sum + item.amount, 0);
    const remaining = Math.max(invoice.amount - paid, 0);
    if (remaining <= 0.01) continue;
    const id = invoice.order.customerId;
    debtByCustomer.set(id, (debtByCustomer.get(id) || 0) + remaining);
  }

  const withDebt = <T extends { customer: { id: string } }>(order: T) => ({
    ...order,
    customerDebt: debtByCustomer.get(order.customer.id) || 0,
  });

  const unitOptions: DispatchUnitOption[] = units.map((unit) => ({
    id: unit.id,
    typeId: unit.typeId,
    status: unit.status,
    label: `${unit.plateNumber} · ${unit.name}`,
  }));
  const typeOptions = Array.from(
    new Map(units.map((unit) => [unit.typeId, { id: unit.typeId, name: unit.type.name }])).values(),
  );
  const driverOptions: DispatchDriverOption[] = drivers.map((driver) => ({
    id: driver.id,
    name: driver.user.name,
    onShift: Boolean(driver.shifts[0]),
  }));

  const onShiftDriverIds = new Set(drivers.filter((driver) => driver.shifts[0]).map((driver) => driver.id));
  const onBoard = orders.filter((order) => {
    if (!OPS.includes(order.status as (typeof OPS)[number])) return false;
    if (LIVE_STATUSES.has(order.status) || order.scheduledAt < tomorrowStart) return true;
    return Boolean(order.driverId && onShiftDriverIds.has(order.driverId));
  });
  const tomorrow = orders.filter(
    (order) =>
      inDay(order, tomorrowStart, dayAfter) &&
      order.status !== ORDER_STATUSES.CANCELLED &&
      !LIVE_STATUSES.has(order.status),
  );
  const later = orders.filter(
    (order) =>
      order.scheduledAt >= dayAfter &&
      OPS.includes(order.status as (typeof OPS)[number]) &&
      !LIVE_STATUSES.has(order.status),
  );

  const late = onBoard.filter((order) => isLate(order, now));
  const needsAssign = onBoard.filter(
    (order) =>
      order.status === ORDER_STATUSES.NEW ||
      order.status === ORDER_STATUSES.DECLINED ||
      ((order.status === ORDER_STATUSES.ASSIGNED || order.status === ORDER_STATUSES.ACCEPTED) && !order.driverId),
  );
  const declined = onBoard.filter((order) => order.status === ORDER_STATUSES.DECLINED);
  const reports = onBoard.filter((order) => order.status === ORDER_STATUSES.REPORT_SUBMITTED);
  const onShift = drivers.filter((driver) => driver.shifts[0]);
  const freeUnits = units.filter((unit) => unit.status === "AVAILABLE");
  const busyUnits = units.filter((unit) => unit.status === "BUSY");
  const repairUnits = units.filter((unit) => unit.status === "REPAIR");

  const columns: DispatchColumn[] = [
    {
      id: "assign",
      title: "Назначить",
      hint: "новые, отказы, без водителя",
      items: onBoard
        .filter(
          (order) =>
            order.status === ORDER_STATUSES.NEW ||
            order.status === ORDER_STATUSES.DECLINED ||
            ((order.status === ORDER_STATUSES.ASSIGNED || order.status === ORDER_STATUSES.ACCEPTED) && !order.driverId),
        )
        .map(withDebt),
    },
    {
      id: "waiting",
      title: "Ждут водителя",
      hint: "назначены, ещё не приняли",
      items: onBoard.filter((order) => order.status === ORDER_STATUSES.ASSIGNED && order.driverId).map(withDebt),
    },
    {
      id: "moving",
      title: "В пути",
      hint: "принял / выехал",
      items: onBoard
        .filter((order) => order.status === ORDER_STATUSES.ACCEPTED || order.status === ORDER_STATUSES.EN_ROUTE)
        .map(withDebt),
    },
    {
      id: "site",
      title: "На объекте",
      hint: "работы идут",
      items: onBoard.filter((order) => order.status === ORDER_STATUSES.ON_SITE).map(withDebt),
    },
    {
      id: "report",
      title: "Отчёты",
      hint: "сдали, ждут проверки",
      items: onBoard.filter((order) => order.status === ORDER_STATUSES.REPORT_SUBMITTED).map(withDebt),
    },
  ];
  const lateIds = onBoard.filter((order) => isLate(order, now)).map((order) => order.id);

  return (
    <div className="space-y-4" data-dispatch-kiosk={isKiosk ? "1" : undefined}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Оперативный контур</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">Диспетчер</h1>
          <p className="mt-1 text-sm text-slate-500">
            Сегодня, просроченные и уже в работе · на линии {onShift.length} · свободно {freeUnits.length} ед.
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <DispatchToolbar kiosk={isKiosk} />
          <CtaLink className="w-full justify-center sm:w-auto" href="/orders/new">
            Новая заявка
          </CtaLink>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <AlertChip href="#col-assign" label="Без назначения" tone="sky" value={needsAssign.length} />
        <AlertChip href="#col-assign" label="Отказы" tone="stone" value={declined.length} />
        <AlertChip href="#col-waiting" label="Опоздание" tone="amber" value={late.length} />
        <AlertChip href="#col-report" label="Отчёты" tone="violet" value={reports.length} />
        <AlertChip href="#on-shift" label="На линии" tone="menu" value={onShift.length} />
        <AlertChip href="#fleet" label="Свободно" tone="ok" value={freeUnits.length} />
      </div>

      <DispatchKanban
        columns={columns}
        driverOptions={driverOptions}
        lateIds={lateIds}
        typeOptions={typeOptions}
        unitOptions={unitOptions}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80" id="on-shift">
          <h2 className="text-sm font-extrabold text-navy">Водители на линии</h2>
          <p className="mb-3 text-[11px] text-slate-400">Кто начал смену и какая заявка сейчас</p>
          {onShift.length === 0 ? (
            <p className="text-sm text-slate-500">Никто не начал смену</p>
          ) : (
            <ul className="space-y-2">
              {onShift.map((driver) => {
                const shift = driver.shifts[0];
                const current = driver.orders[0];
                const call = driver.user.phone ? phoneHref(driver.user.phone) : null;
                return (
                  <li className="rounded-xl bg-slate-50 px-3 py-2.5" key={driver.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-bold text-navy">{driver.user.name}</div>
                        <div className="text-xs text-slate-500">
                          с {formatTime(shift.startedAt)} · {formatHoursMinutes(shiftDurationMs(shift.startedAt))}
                          {driver.defaultEquipment ? ` · ${driver.defaultEquipment.plateNumber}` : ""}
                        </div>
                      </div>
                      {call ? (
                        <a className="shrink-0 text-xs font-bold text-menu-hover" href={call}>
                          {phonePretty(driver.user.phone || "")}
                        </a>
                      ) : null}
                    </div>
                    {current ? (
                      <Link className="mt-1 block text-xs font-semibold text-slate-600 hover:text-menu-hover" href={`/orders/${current.id}`}>
                        {current.number} · {formatTime(current.scheduledAt)} · {current.address}
                      </Link>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">Нет активной заявки</p>
                    )}
                    <div className="mt-1.5">
                      <EndDriverShiftButton driverId={driver.id} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {drivers.some((driver) => !driver.shifts[0]) ? (
            <p className="mt-3 text-xs text-slate-400">
              Не на линии: {drivers.filter((driver) => !driver.shifts[0]).map((driver) => driver.user.name).join(", ")}
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80" id="fleet">
          <h2 className="text-sm font-extrabold text-navy">Парк</h2>
          <p className="mb-3 text-[11px] text-slate-400">
            Свободно {freeUnits.length} · занято {busyUnits.length} · ремонт {repairUnits.length}
          </p>
          <ul className="space-y-1.5">
            {units.map((unit) => {
              const current = unit.orders[0];
              return (
                <li className="flex items-center justify-between gap-2 text-sm" key={unit.id}>
                  <div className="min-w-0">
                    <span className="font-semibold text-navy">{unit.plateNumber}</span>
                    <span className="text-slate-500"> · {unit.type.name}</span>
                    {current ? (
                      <Link className="ml-1 text-xs text-menu-hover hover:underline" href={`/orders/${current.id}`}>
                        {current.number}
                      </Link>
                    ) : null}
                  </div>
                  <Badge
                    className={
                      unit.status === "AVAILABLE"
                        ? "bg-emerald-50 text-emerald-800"
                        : unit.status === "BUSY"
                          ? "bg-amber-50 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                    }
                  >
                    {EQUIPMENT_STATUS_LABELS[unit.status as keyof typeof EQUIPMENT_STATUS_LABELS] || unit.status}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80">
          <h2 className="text-sm font-extrabold text-navy">Завтра</h2>
          <p className="mb-3 text-[11px] text-slate-400">{tomorrow.length} заявок на следующий день</p>
          {tomorrow.length === 0 ? (
            <p className="text-sm text-slate-500">Пока пусто</p>
          ) : (
            <ul className="space-y-2">
              {tomorrow.map((order) => (
                <li key={order.id}>
                  <Link className="block rounded-xl bg-slate-50 px-3 py-2 hover:bg-menu-soft/50" href={`/orders/${order.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-navy">{formatTime(order.scheduledAt)}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="truncate text-sm text-slate-700">{order.number} · {order.customer.name}</div>
                    <div className="truncate text-xs text-slate-500">{order.address}</div>
                    <div className="text-xs text-slate-400">
                      {order.driver?.user.name || "без водителя"}
                      {order.equipment ? ` · ${order.equipment.plateNumber}` : ""}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {later.length ? (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Дальше по графику</h3>
              <ul className="space-y-1 text-sm">
                {later.slice(0, 8).map((order) => (
                  <li key={order.id}>
                    <Link className="text-navy hover:text-menu-hover hover:underline" href={`/orders/${order.id}`}>
                      {order.number} · {formatDriverWhen(order.scheduledAt)} · {order.customer.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function AlertChip({
  href,
  label,
  value,
  tone,
}: {
  href: string;
  label: string;
  value: number;
  tone: "sky" | "stone" | "amber" | "violet" | "menu" | "ok";
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-900 ring-sky-200",
    stone: "bg-stone-100 text-stone-800 ring-stone-200",
    amber: "bg-amber-50 text-amber-900 ring-amber-200",
    violet: "bg-violet-50 text-violet-900 ring-violet-200",
    menu: "bg-menu-soft text-menu-hover ring-menu/20",
    ok: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  };
  return (
    <a className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${tones[tone]}`} href={href}>
      {label}
      <span className="rounded-full bg-white/80 px-1.5 py-0.5 tabular-nums">{value}</span>
    </a>
  );
}
