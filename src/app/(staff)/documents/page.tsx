import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { DocumentsDirectory } from "@/components/documents-directory";
import { DOCS_PAGE_SIZE } from "@/lib/list-paging";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; tab?: string; unpaid?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const q = params.q?.trim() || "";
  const unpaidOnly = params.unpaid === "1";
  const tab = params.tab === "acts" ? "acts" : "invoices";

  const invoiceWhere = {
    ...(unpaidOnly ? { status: { not: "PAID" } } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q } },
            { order: { customer: { name: { contains: q } } } },
            { organization: { shortName: { contains: q } } },
          ],
        }
      : {}),
  };
  const actWhere = q
    ? {
        OR: [{ number: { contains: q } }, { order: { customer: { name: { contains: q } } } }],
      }
    : {};

  const [invoices, acts, invoiceTotal, actTotal, invoiceStatsTotal, unpaidCount, unpaidSumAgg] =
    await Promise.all([
      prisma.invoice.findMany({
        where: invoiceWhere,
        orderBy: { issuedAt: "desc" },
        skip: (page - 1) * DOCS_PAGE_SIZE,
        take: DOCS_PAGE_SIZE,
        include: { order: { include: { customer: true } }, organization: true },
      }),
      prisma.act.findMany({
        where: actWhere,
        orderBy: { issuedAt: "desc" },
        skip: (page - 1) * DOCS_PAGE_SIZE,
        take: DOCS_PAGE_SIZE,
        include: { order: { include: { customer: true } } },
      }),
      prisma.invoice.count({ where: invoiceWhere }),
      prisma.act.count({ where: actWhere }),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: { not: "PAID" } } }),
      prisma.invoice.findMany({
        where: { status: { not: "PAID" } },
        select: { amount: true, payments: { select: { amount: true } } },
      }),
    ]);

  const unpaidSum = unpaidSumAgg.reduce((sum, inv) => {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(inv.amount - paid, 0);
  }, 0);

  return (
    <div>
      <PageHeader
        title="Документы"
        subtitle="Счета и акты. Неоплаченные можно отфильтровать, PDF скачивается из строки."
        actions={
          <a
            className="inline-flex h-10 items-center rounded-2xl bg-gradient-to-b from-[#5a6b7c] to-brand px-4 text-sm font-semibold text-white shadow-md shadow-navy/20"
            href="/api/export/excel"
          >
            Выгрузка Excel
          </a>
        }
      />
      <Suspense fallback={<p className="text-sm text-slate-500">Загрузка…</p>}>
        <DocumentsDirectory
          actTotal={actTotal}
          acts={acts.map((act) => ({
            id: act.id,
            number: act.number,
            issuedAt: act.issuedAt.toISOString(),
            amount: act.amount,
            customerName: act.order.customer.name,
            publicToken: act.publicToken,
          }))}
          invoiceTotal={invoiceTotal}
          invoices={invoices.map((invoice) => ({
            id: invoice.id,
            number: invoice.number,
            issuedAt: invoice.issuedAt.toISOString(),
            amount: invoice.amount,
            status: invoice.status,
            customerName: invoice.order.customer.name,
            organizationName: invoice.organization.shortName,
            orderId: invoice.orderId,
            publicToken: invoice.publicToken,
          }))}
          page={page}
          stats={{
            total: invoiceStatsTotal,
            unpaid: unpaidCount,
            unpaidSum,
          }}
          tab={tab}
          unpaidOnly={unpaidOnly}
        />
      </Suspense>
    </div>
  );
}
