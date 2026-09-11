import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { FinanceDirectory } from "@/components/finance-directory";
import { FINANCE_PAGE_SIZE } from "@/lib/list-paging";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const q = params.q?.trim() || "";
  const tab = params.tab === "journal" ? "journal" : "open";

  const paymentWhere = q
    ? {
        OR: [
          { invoice: { number: { contains: q } } },
          { invoice: { order: { customer: { name: { contains: q } } } } },
          { comment: { contains: q } },
          { recordedBy: { name: { contains: q } } },
        ],
      }
    : {};

  const invoiceWhere = {
    status: { not: "PAID" as const },
    ...(q
      ? {
          OR: [{ number: { contains: q } }, { order: { customer: { name: { contains: q } } } }],
        }
      : {}),
  };

  const [invoices, payments, invoiceTotal, paymentTotal, openCount, debtInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: invoiceWhere,
      include: { order: { include: { customer: true } }, payments: true },
      orderBy: { issuedAt: "asc" },
      skip: (page - 1) * FINANCE_PAGE_SIZE,
      take: FINANCE_PAGE_SIZE,
    }),
    prisma.payment.findMany({
      where: paymentWhere,
      orderBy: { paidAt: "desc" },
      skip: (page - 1) * FINANCE_PAGE_SIZE,
      take: FINANCE_PAGE_SIZE,
      include: { invoice: { include: { order: { include: { customer: true } } } }, recordedBy: true },
    }),
    prisma.invoice.count({ where: invoiceWhere }),
    prisma.payment.count({ where: paymentWhere }),
    prisma.invoice.count({ where: { status: { not: "PAID" } } }),
    prisma.invoice.findMany({
      where: { status: { not: "PAID" } },
      select: { amount: true, payments: { select: { amount: true } } },
    }),
  ]);

  const debt = debtInvoices.reduce((sum, inv) => {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(inv.amount - paid, 0);
  }, 0);

  return (
    <div>
      <PageHeader title="Оплаты" subtitle="Отметка поступлений по выписке. Поиск и журнал — прямо в списке." />
      <Suspense fallback={<p className="text-sm text-slate-500">Загрузка…</p>}>
        <FinanceDirectory
          invoiceTotal={invoiceTotal}
          invoices={invoices.map((invoice) => {
            const paid = invoice.payments.reduce((sum, item) => sum + item.amount, 0);
            return {
              id: invoice.id,
              number: invoice.number,
              amount: invoice.amount,
              paid,
              remaining: Math.max(invoice.amount - paid, 0),
              orderId: invoice.orderId,
              customerName: invoice.order.customer.name,
              issuedAt: invoice.issuedAt.toISOString(),
            };
          })}
          page={page}
          paymentTotal={paymentTotal}
          payments={payments.map((payment) => ({
            id: payment.id,
            paidAt: payment.paidAt.toISOString(),
            amount: payment.amount,
            comment: payment.comment,
            invoiceNumber: payment.invoice.number,
            orderId: payment.invoice.orderId,
            customerName: payment.invoice.order.customer.name,
            recordedBy: payment.recordedBy?.name || null,
          }))}
          stats={{ debt, openCount, journalCount: paymentTotal }}
          tab={tab}
        />
      </Suspense>
    </div>
  );
}
