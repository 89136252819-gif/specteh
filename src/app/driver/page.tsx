import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireDriver } from "@/lib/auth";
import { DriverOrderCard } from "@/components/driver-order-card";
import { DriverShiftCard } from "@/components/driver-shift-card";
import { isDriverActionStatus } from "@/lib/driver-ui";
import { elapsedInRange, startOfDay } from "@/lib/timesheet";

function equipmentLabel(order: {
  equipment: { name: string; plateNumber: string } | null;
  equipmentType: { name: string };
}) {
  return order.equipment ? `${order.equipment.name} · ${order.equipment.plateNumber}` : order.equipmentType.name;
}

export default async function DriverHomePage() {
  const session = await requireDriver();
  const today = startOfDay();
  const tomorrow = new Date(today.getTime() + 86_400_000);

  const [orders, openShift, todayShifts] = await Promise.all([
    prisma.order.findMany({
      where: {
        driverId: session.driverId,
        status: { in: ["ASSIGNED", "ACCEPTED", "EN_ROUTE", "ON_SITE", "REPORT_SUBMITTED"] },
      },
      include: { customer: true, equipment: true, equipmentType: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.driverShift.findFirst({
      where: { driverId: session.driverId, endedAt: null },
    }),
    prisma.driverShift.findMany({
      where: {
        driverId: session.driverId,
        startedAt: { lt: tomorrow },
        OR: [{ endedAt: null }, { endedAt: { gt: today } }],
      },
    }),
  ]);

  const now = new Date();
  const todayMs = todayShifts.reduce((sum, shift) => sum + elapsedInRange(shift.startedAt, shift.endedAt, today, tomorrow, now), 0);
  const inProgress = orders.filter((o) => o.status === "ACCEPTED" || o.status === "EN_ROUTE" || o.status === "ON_SITE");
  const toAccept = orders.filter((o) => o.status === "ASSIGNED");
  const waiting = orders.filter((o) => o.status === "REPORT_SUBMITTED");
  const actionCount = orders.filter((o) => isDriverActionStatus(o.status)).length;

  return (
    <div className="space-y-5 stagger-in">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Кабинет водителя</p>
        <h1 className="mt-1 text-2xl font-extrabold text-navy">Сегодня</h1>
        <p className="mt-1 text-sm text-slate-500">
          {actionCount ? `${actionCount} ${pluralOrders(actionCount)} требуют действия` : "Активных действий нет"}
        </p>
      </div>

      <DriverShiftCard startedAt={openShift?.startedAt.toISOString() ?? null} todayMs={todayMs} />

      {orders.length === 0 ? (
        <div className="rounded-3xl bg-white/90 px-6 py-12 text-center shadow-sm ring-1 ring-slate-200/70">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-navy">Нет активных заявок</p>
          <p className="mt-1 text-sm text-slate-500">Когда диспетчер назначит работу, она появится здесь</p>
        </div>
      ) : null}

      <Section title="В работе" items={inProgress} />
      <Section title="Нужно принять" items={toAccept} />
      <Section title="На проверке" items={waiting} />
    </div>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: Array<{
    id: string;
    number: string;
    status: string;
    scheduledAt: Date;
    address: string;
    sitePhone?: string | null;
    customer: { name: string; phone: string };
    equipment: { name: string; plateNumber: string } | null;
    equipmentType: { name: string };
  }>;
}) {
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{title}</h2>
      {items.map((o) => (
        <DriverOrderCard
          address={o.address}
          contactPhone={o.sitePhone || o.customer.phone}
          customerName={o.customer.name}
          equipmentLabel={equipmentLabel(o)}
          id={o.id}
          number={o.number}
          scheduledAt={o.scheduledAt}
          status={o.status}
          key={o.id}
        />
      ))}
    </section>
  );
}

function pluralOrders(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "заявка";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "заявки";
  return "заявок";
}
