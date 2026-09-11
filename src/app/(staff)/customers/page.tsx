import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CtaLink } from "@/components/ui/cta";
import { CustomersDirectory } from "@/components/customers-directory";
import {
  CUSTOMERS_PAGE_SIZE,
  customerListWhere,
  parseCustomerListFilter,
} from "@/lib/customer-list";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; filter?: string; page?: string }>;
}) {
  const params = await searchParams;
  const filter = parseCustomerListFilter(params.filter);
  const q = params.q?.trim() || "";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const where = customerListWhere(filter, q);

  const [customers, total, statsTotal, statsDebt, unpaidInvoices] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * CUSTOMERS_PAGE_SIZE,
      take: CUSTOMERS_PAGE_SIZE,
      select: {
        id: true,
        type: true,
        name: true,
        inn: true,
        kpp: true,
        address: true,
        contactName: true,
        phone: true,
        email: true,
        defaultPaymentMethod: true,
        notes: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.customer.count({ where }),
    prisma.customer.count(),
    prisma.customer.count({
      where: { orders: { some: { invoice: { is: { status: { not: "PAID" } } } } } },
    }),
    prisma.invoice.findMany({
      where: { status: { not: "PAID" } },
      select: {
        amount: true,
        payments: { select: { amount: true } },
        order: { select: { customerId: true } },
      },
    }),
  ]);

  const debtByCustomer = new Map<string, number>();
  let debtSum = 0;
  for (const invoice of unpaidInvoices) {
    const paid = invoice.payments.reduce((sum, item) => sum + item.amount, 0);
    const remaining = Math.max(invoice.amount - paid, 0);
    if (remaining <= 0.01) continue;
    const customerId = invoice.order.customerId;
    debtByCustomer.set(customerId, (debtByCustomer.get(customerId) || 0) + remaining);
    debtSum += remaining;
  }

  const rows = customers.map((customer) => ({
    id: customer.id,
    type: customer.type,
    name: customer.name,
    inn: customer.inn,
    kpp: customer.kpp,
    address: customer.address,
    contactName: customer.contactName,
    phone: customer.phone,
    email: customer.email,
    defaultPaymentMethod: customer.defaultPaymentMethod,
    paymentMethod: customer.defaultPaymentMethod,
    notes: customer.notes,
    ordersCount: customer._count.orders,
    debt: debtByCustomer.get(customer.id) || 0,
  }));

  return (
    <div>
      <PageHeader
        title="Заказчики"
        subtitle="Изменение и удаление — в строке списка. Долг — по неоплаченным счетам."
        actions={<CtaLink href="/customers/new">Добавить</CtaLink>}
      />
      {statsTotal === 0 ? (
        <EmptyState
          actionHref="/customers/new"
          actionLabel="Добавить заказчика"
          description="Добавьте первого заказчика — он появится при создании заявок"
          title="Нет заказчиков"
        />
      ) : (
        <Suspense fallback={<p className="text-sm text-slate-500">Загрузка списка…</p>}>
          <CustomersDirectory
            customers={rows}
            error={params.error}
            page={page}
            stats={{ total: statsTotal, withDebt: statsDebt, debtSum }}
            total={total}
          />
        </Suspense>
      )}
    </div>
  );
}
