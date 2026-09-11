import { History } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireDriver } from "@/lib/auth";
import { DriverOrderCard } from "@/components/driver-order-card";
import { formatDayHeading } from "@/lib/utils";

export default async function DriverHistoryPage() {
  const session = await requireDriver();
  const orders = await prisma.order.findMany({
    where: { driverId: session.driverId },
    include: { customer: true, equipment: true, equipmentType: true },
    orderBy: { scheduledAt: "desc" },
    take: 50,
  });

  const groups = new Map<string, typeof orders>();
  for (const order of orders) {
    const key = formatDayHeading(order.scheduledAt);
    const list = groups.get(key) ?? [];
    list.push(order);
    groups.set(key, list);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Архив</p>
        <h1 className="mt-1 text-2xl font-extrabold text-navy">История</h1>
      </div>
      {orders.length === 0 ? (
        <div className="rounded-3xl bg-white/90 px-6 py-12 text-center shadow-sm ring-1 ring-slate-200/70">
          <History className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-navy">Пока пусто</p>
          <p className="mt-1 text-sm text-slate-500">Закрытые заявки появятся в этом списке</p>
        </div>
      ) : (
        [...groups.entries()].map(([heading, items]) => (
          <section className="space-y-3" key={heading}>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{heading}</h2>
            {items.map((o) => (
              <DriverOrderCard
                key={o.id}
                address={o.address}
                customerName={o.customer.name}
                equipmentLabel={o.equipment ? `${o.equipment.name} · ${o.equipment.plateNumber}` : o.equipmentType.name}
                id={o.id}
                number={o.number}
                scheduledAt={o.scheduledAt}
                showNext={false}
                status={o.status}
              />
            ))}
          </section>
        ))
      )}
    </div>
  );
}
