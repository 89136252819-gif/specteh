import { prisma } from "@/lib/db";
import { createOrder } from "@/actions/orders";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { AddressSuggest } from "@/components/address-suggest";
import { OrderCustomerPicker } from "@/components/order-customer-picker";
import { OrderTemplatesBar } from "@/components/order-templates-bar";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/submit-button";
import { PaymentVatFields } from "@/components/payment-vat-fields";
import { PAYMENT_METHODS } from "@/lib/constants";
import { omskTomorrowMorning } from "@/lib/utils";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [customers, types, organizations, templates, unpaidInvoices] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
    prisma.equipmentType.findMany({ orderBy: { name: "asc" } }),
    prisma.organization.findMany({ select: { paymentMethod: true, vatRate: true, shortName: true } }),
    prisma.orderTemplate.findMany({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, name: true, intervalDays: true },
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
  for (const invoice of unpaidInvoices) {
    const paid = invoice.payments.reduce((sum, item) => sum + item.amount, 0);
    const remaining = Math.max(invoice.amount - paid, 0);
    if (remaining <= 0.01) continue;
    const id = invoice.order.customerId;
    debtByCustomer.set(id, (debtByCustomer.get(id) || 0) + remaining);
  }

  const customersWithDebt = customers.map((customer) => ({
    ...customer,
    debt: debtByCustomer.get(customer.id) || 0,
  }));

  const orgs = Object.fromEntries(
    organizations.map((org) => [org.paymentMethod, { vatRate: org.vatRate, shortName: org.shortName }]),
  );
  const defaultMethod = orgs[PAYMENT_METHODS.CASHLESS_VAT]
    ? PAYMENT_METHODS.CASHLESS_VAT
    : organizations[0]?.paymentMethod || PAYMENT_METHODS.CASH;
  const defaultTime = omskTomorrowMorning();

  return (
    <div className="max-w-3xl">
      <PageHeader title="Новая заявка" subtitle="Заполняется менеджером по звонку заказчика" />
      {error ? (
        <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}
      <OrderTemplatesBar templates={templates} />
      <Card>
        <CardBody>
          <form action={createOrder} className="grid gap-4 sm:grid-cols-2">
            <OrderCustomerPicker customers={customersWithDebt} />
            <Field label="Тип техники">
              <Select name="equipmentTypeId" required defaultValue="">
                <option value="" disabled>
                  Выберите тип
                </option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <PaymentVatFields
              defaultMethod={defaultMethod}
              defaultVatRate={orgs[defaultMethod]?.vatRate}
              orgs={orgs}
            />
            <Field label="Дата и время подачи">
              <Input name="scheduledAt" required type="datetime-local" defaultValue={defaultTime} />
            </Field>
            <Field className="sm:col-span-2" label="Адрес объекта">
              <AddressSuggest name="address" placeholder="Омск, улица, ориентир" required />
            </Field>
            <Field label="Контакт на объекте">
              <Input name="siteContact" />
            </Field>
            <Field label="Телефон на объекте">
              <Input name="sitePhone" />
            </Field>
            <Field className="sm:col-span-2" label="Комментарий">
              <Textarea name="comment" placeholder="Пожелания заказчика, смена, доступ..." />
            </Field>
            <div className="sm:col-span-2">
              <SubmitButton>Создать заявку</SubmitButton>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
