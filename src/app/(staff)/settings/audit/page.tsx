import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuditViewer } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { AuditDirectory } from "@/components/audit-directory";

const PAGE_SIZE = 50;

function buildWhere(q: string): Prisma.AuditLogWhereInput | undefined {
  const term = q.trim();
  if (!term) return undefined;
  return {
    OR: [
      { actorName: { contains: term } },
      { action: { contains: term } },
      { detail: { contains: term } },
      { entity: { contains: term } },
      { entityId: { contains: term } },
      { orderId: { contains: term } },
    ],
  };
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAuditViewer();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const q = params.q?.trim() || "";
  const where = buildWhere(q);

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const orderIds = [...new Set(rows.map((row) => row.orderId).filter(Boolean))] as string[];
  const orders =
    orderIds.length > 0
      ? await prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, number: true },
        })
      : [];
  const orderNumbers = Object.fromEntries(orders.map((order) => [order.id, order.number]));

  return (
    <div>
      <PageHeader
        subtitle="Все действия сотрудников в системе: назначения, документы, оплаты, смена статусов"
        title="Журнал действий"
      />
      <Suspense fallback={<p className="text-sm text-slate-500">Загрузка…</p>}>
        <AuditDirectory
          page={page}
          rows={rows.map((row) => ({
            id: row.id,
            actorName: row.actorName,
            action: row.action,
            entity: row.entity,
            entityId: row.entityId,
            orderId: row.orderId,
            orderNumber: row.orderId ? orderNumbers[row.orderId] || null : null,
            detail: row.detail,
            createdAt: row.createdAt.toISOString(),
          }))}
          total={total}
        />
      </Suspense>
    </div>
  );
}
