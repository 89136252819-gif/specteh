import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { DocumentsDirectory } from "@/components/documents-directory";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";
import { DOCS_PAGE_SIZE } from "@/lib/list-paging";
import { vatInvoiceKind, vatInvoiceNeedsReturn } from "@/lib/vat-invoice";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; tab?: string; unpaid?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const q = params.q?.trim() || "";
  const unpaidOnly = params.unpaid === "1";
  const tab = params.tab === "acts" ? "acts" : params.tab === "cashless" ? "cashless" : "invoices";

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

  const cashlessWhere = {
    status: { not: "CANCELLED" },
    paymentMethod: { in: [PAYMENT_METHODS.CASHLESS_VAT, PAYMENT_METHODS.CASHLESS_NO_VAT] },
    invoice: { isNot: null },
    ...(q
      ? {
          OR: [
            { number: { contains: q } },
            { customer: { name: { contains: q } } },
            { invoice: { number: { contains: q } } },
            { act: { is: { number: { contains: q } } } },
            { vatInvoices: { some: { number: { contains: q }, supersededAt: null } } },
          ],
        }
      : {}),
  };

  const [invoices, acts, invoiceTotal, actTotal, invoiceStatsTotal, unpaidCount, unpaidSumAgg, cashlessOrders, cashlessTotal, vatWatch] =
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
      prisma.order.findMany({
        where: cashlessWhere,
        orderBy: { scheduledAt: "desc" },
        skip: (page - 1) * DOCS_PAGE_SIZE,
        take: DOCS_PAGE_SIZE,
        include: {
          customer: { select: { name: true } },
          invoice: { select: { number: true, amount: true, vatAmount: true, publicToken: true } },
          act: { select: { number: true, publicToken: true } },
          vatInvoices: {
            where: { supersededAt: null },
            orderBy: { receivedAt: "desc" },
            take: 1,
            select: { id: true, number: true, invoiceNumber: true, invoiceAmount: true, invoiceVatAmount: true },
          },
        },
      }),
      prisma.order.count({ where: cashlessWhere }),
      prisma.order.findMany({
        where: {
          status: { not: "CANCELLED" },
          paymentMethod: PAYMENT_METHODS.CASHLESS_VAT,
          invoice: { isNot: null },
        },
        select: {
          invoice: { select: { number: true, amount: true, vatAmount: true } },
          vatInvoices: {
            where: { supersededAt: null },
            orderBy: { receivedAt: "desc" },
            take: 1,
            select: { invoiceNumber: true, invoiceAmount: true, invoiceVatAmount: true },
          },
        },
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
        subtitle="Счета, акты и безнал. Счёт-фактуру бухгалтер возвращает файлом к заявке."
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
          cashless={cashlessOrders.map((order) => {
            const current = order.vatInvoices[0] ?? null;
            const kind = vatInvoiceKind({
              paymentMethod: order.paymentMethod,
              invoice: order.invoice,
              current,
            });
            return {
              orderId: order.id,
              orderNumber: order.number,
              customerName: order.customer.name,
              paymentLabel: PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] || order.paymentMethod,
              invoiceNumber: order.invoice?.number || "—",
              invoiceToken: order.invoice?.publicToken || "",
              actNumber: order.act?.number || null,
              actToken: order.act?.publicToken || null,
              vatKind: kind === "none" ? "waiting" : kind,
              vatNumber: current?.number || null,
              vatId: current?.id || null,
            };
          })}
          cashlessTotal={cashlessTotal}
          tab={tab}
          unpaidOnly={unpaidOnly}
          waitingVat={vatWatch.filter((order) =>
            vatInvoiceNeedsReturn(
              vatInvoiceKind({
                paymentMethod: PAYMENT_METHODS.CASHLESS_VAT,
                invoice: order.invoice,
                current: order.vatInvoices[0] ?? null,
              }),
            ),
          ).length}
        />
      </Suspense>
    </div>
  );
}
