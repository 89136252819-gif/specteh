import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { CtaLink } from "@/components/ui/cta";
import { OrdersDirectory } from "@/components/orders-directory";
import {
  ORDER_FILTER_GROUPS,
  ORDERS_PAGE_SIZE,
  orderFilterWhere,
  parseOrderListFilter,
} from "@/lib/order-list";
import { orderIdsMatchingSearch } from "@/lib/order-search";
import type { Prisma } from "@prisma/client";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; filter?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const filter = parseOrderListFilter(params);
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const q = params.q?.trim() || "";
  const filterWhere = orderFilterWhere(filter);
  const searchIds = q ? await orderIdsMatchingSearch(q) : null;
  const searchWhere: Prisma.OrderWhereInput | undefined = searchIds
    ? { id: { in: searchIds.length ? searchIds : ["__no_match__"] } }
    : undefined;
  const where: Prisma.OrderWhereInput = searchWhere ? { AND: [filterWhere, searchWhere] } : filterWhere;

  const [orders, total, statsTotal, statsNew, statsPay] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      skip: (page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
      include: { customer: true, equipmentType: true, equipment: true, driver: { include: { user: true } } },
    }),
    prisma.order.count({ where }),
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ORDER_FILTER_GROUPS.new } } }),
    prisma.order.count({ where: { status: { in: ORDER_FILTER_GROUPS.pay } } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Заявки"
        subtitle="Поиск и фильтры прямо в списке. Карточка заявки открывается по номеру."
        actions={<CtaLink href="/orders/new">Новая заявка</CtaLink>}
      />
      <Suspense fallback={<p className="text-sm text-slate-500">Загрузка списка…</p>}>
        <OrdersDirectory
          orders={orders.map((order) => ({
            id: order.id,
            number: order.number,
            scheduledAt: order.scheduledAt.toISOString(),
            address: order.address,
            status: order.status,
            paymentMethod: order.paymentMethod,
            customerName: order.customer.name,
            typeName: order.equipmentType.name,
            equipmentLabel: order.equipment ? `${order.equipment.plateNumber} · ${order.equipment.name}` : null,
            driverName: order.driver?.user.name || null,
          }))}
          page={page}
          stats={{ total: statsTotal, new: statsNew, pay: statsPay }}
          total={total}
        />
      </Suspense>
    </div>
  );
}
