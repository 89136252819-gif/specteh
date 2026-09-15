import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { cancelOrder, recordPayment } from "@/actions/orders";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { StatusBadge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime, money, parsePhotos, toDateInputInTz } from "@/lib/utils";
import { invoiceStatusLabel, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, ROLES, AUDIT_ACTION_LABELS, type PaymentMethod } from "@/lib/constants";
import { defaultPaymentPurpose, resolvePaymentPurpose } from "@/lib/invoice-purpose";
import { PdfLink } from "@/components/pdf-link";
import { ReportPhotos } from "@/components/report-photos";
import { calculateFromReport, getRatesForOrder, parseBillingJson, resolveVatRate } from "@/lib/pricing";
import { linesFromJson } from "@/lib/pdf-from-record";
import { CopyOrderButton } from "@/components/copy-order-button";
import { GenerateDocsButton } from "@/components/generate-docs-button";
import { EditDocsButton, IssueDocsButton } from "@/components/edit-docs-button";
import { EditOrderButton } from "@/components/edit-order-button";
import { ForceOrderStatusForm } from "@/components/force-order-status-form";
import { PriceAdjustForm } from "@/components/price-adjust-form";
import { OrderAssignForm } from "@/components/order-assign-form";
import { OrderRepeatButtons } from "@/components/order-repeat-buttons";
import { PriceGapsBanner } from "@/components/price-gaps-banner";
import { AddressMap } from "@/components/address-map";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ priceGaps?: string }>;
}) {
  const user = await requireStaff();
  const { id } = await params;
  const { priceGaps } = await searchParams;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      organization: true,
      equipmentType: true,
      equipment: true,
      driver: { include: { user: true } },
      report: true,
      invoice: { include: { payments: true } },
      act: true,
    },
  });
  if (!order) notFound();

  const [units, drivers, organizations, audit, customers] = await Promise.all([
    prisma.equipment.findMany({
      where: { typeId: order.equipmentTypeId },
      orderBy: { plateNumber: "asc" },
    }),
    prisma.driver.findMany({ include: { user: true, defaultEquipment: true }, orderBy: { user: { name: "asc" } } }),
    prisma.organization.findMany({ select: { paymentMethod: true, vatRate: true, shortName: true } }),
    prisma.auditLog.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
  ]);
  const orgs = Object.fromEntries(
    organizations.map((org) => [org.paymentMethod, { vatRate: org.vatRate, shortName: org.shortName }]),
  );
  const displayVat = resolveVatRate(order.paymentMethod, order.vatRate, order.organization.vatRate);
  const canEditBasics = !["PAID", "CANCELLED"].includes(order.status);
  const canForceStatus = user.role === ROLES.ADMIN;

  let preview = null;
  let rates: Awaited<ReturnType<typeof getRatesForOrder>> = [];
  if (order.report) {
    try {
      [preview, rates] = await Promise.all([calculateFromReport(order.id), getRatesForOrder(order.id)]);
    } catch {
      preview = null;
    }
  }

  const paid = order.invoice?.payments.reduce((s, p) => s + p.amount, 0) || 0;

  return (
    <div className="space-y-6">
      <PriceGapsBanner gapsParam={priceGaps} orderId={order.id} />
      <PageHeader
        title={`Заявка ${order.number}`}
        subtitle={`${order.customer.name} · ${formatDateTime(order.scheduledAt)}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            <CopyOrderButton orderId={order.id} />
            <OrderRepeatButtons orderId={order.id} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Карточка заявки</h2>
            {order.status !== "CANCELLED" ? (
              <EditOrderButton
                actDate={order.act ? toDateInputInTz(order.act.issuedAt) : ""}
                address={order.address}
                canEditBasics={canEditBasics}
                comment={order.comment}
                customerId={order.customerId}
                customers={customers}
                hasDocuments={Boolean(order.invoice && order.act)}
                initialLines={order.invoice ? linesFromJson(order.invoice.linesJson) : preview?.lines}
                initialTotal={order.invoice?.amount}
                initialVatAmount={order.invoice?.vatAmount}
                invoiceDate={order.invoice ? toDateInputInTz(order.invoice.issuedAt) : ""}
                orderId={order.id}
                orgs={orgs}
                paymentMethod={order.paymentMethod}
                paymentPurpose={
                  order.invoice
                    ? resolvePaymentPurpose(
                        order.invoice.paymentPurpose,
                        defaultPaymentPurpose({
                          invoiceNumber: order.invoice.number,
                          issuedAt: order.invoice.issuedAt,
                          orderNumber: order.number,
                          total: order.invoice.amount,
                          vatRate: order.invoice.vatRate ?? displayVat,
                        }),
                      )
                    : ""
                }
                scheduledAt={order.scheduledAt}
                siteContact={order.siteContact}
                sitePhone={order.sitePhone}
                vatRate={order.invoice?.vatRate ?? displayVat}
              />
            ) : null}
          </CardHeader>
          <CardBody className="grid gap-3 sm:grid-cols-2 text-sm">
            <Info label="Заказчик" value={order.customer.name} />
            <Info label="Телефон заказчика" value={order.customer.phone} />
            <div className="sm:col-span-2 space-y-2">
              <Info label="Объект" value={order.address} />
              <AddressMap address={order.address} />
            </div>
            <Info label="Контакт на объекте" value={`${order.siteContact || "—"} ${order.sitePhone || ""}`} />
            <Info label="Тип техники" value={order.equipmentType.name} />
            <Info
              label="Техника"
              value={order.equipment ? `${order.equipment.name} · ${order.equipment.plateNumber}` : "не назначена"}
            />
            <Info label="Водитель" value={order.driver?.user.name || "не назначен"} />
            <Info label="Способ оплаты" value={PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod]} />
            <Info
              label="НДС"
              value={order.paymentMethod === PAYMENT_METHODS.CASHLESS_VAT ? `${displayVat}%` : "не начисляется"}
            />
            <Info label="Юрлицо" value={order.organization.shortName} />
            <Info label="Комментарий" value={order.comment || "—"} />
          </CardBody>
        </Card>

        <div className="space-y-6">
          {["NEW", "ASSIGNED", "DECLINED", "ACCEPTED"].includes(order.status) ? (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Назначить технику</h2>
              </CardHeader>
              <CardBody>
                <OrderAssignForm
                  driverId={order.driverId}
                  drivers={drivers}
                  equipmentId={order.equipmentId}
                  orderId={order.id}
                  units={units}
                />
              </CardBody>
            </Card>
          ) : null}

          {canForceStatus ? (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Принудительный статус</h2>
              </CardHeader>
              <CardBody>
                <ForceOrderStatusForm orderId={order.id} status={order.status} />
              </CardBody>
            </Card>
          ) : null}

          {!["PAID", "CANCELLED"].includes(order.status) ? (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Отмена</h2>
              </CardHeader>
              <CardBody>
                <form action={cancelOrder} className="space-y-3">
                  <input name="orderId" type="hidden" value={order.id} />
                  <Textarea name="cancelReason" placeholder="Причина отмены" />
                  <SubmitButton variant="danger">Отменить заявку</SubmitButton>
                </form>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>

      {order.report ? (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold">Отчёт водителя</h2>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-4 text-sm">
              <Info label="Подача" value={String(order.report.deliveryQty)} />
              <Info label="Моточасы" value={String(order.report.hours)} />
              <Info label="Простой, ч" value={String(order.report.idleHours)} />
              <Info label="Км" value={String(order.report.km)} />
            </div>
            {order.report.isWeekend ? <p className="mt-2 text-sm text-brand-hover">Выходной / праздник</p> : null}
            {order.report.comment ? <p className="mt-2 text-sm text-slate-600">{order.report.comment}</p> : null}
            <ReportPhotos photos={parsePhotos(order.report.photosJson)} />
            {preview && (order.status === "REPORT_SUBMITTED" || (order.status === "VERIFIED" && !order.invoice)) ? (
              <PriceAdjustForm
                canVerify={order.status === "REPORT_SUBMITTED"}
                initialLines={preview.lines}
                orderId={order.id}
                orgs={orgs}
                paymentMethod={order.paymentMethod}
                rates={rates}
                report={order.report}
                vatRate={preview.vatRate}
              />
            ) : preview ? (
              <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
                <div className="mb-2 font-medium">Расчёт по прайсу</div>
                {preview.lines.map((l) => (
                  <div key={`${l.name}-${l.qty}`} className="flex justify-between py-0.5">
                    <span>
                      {l.name} · {l.qty} {l.unit}
                    </span>
                    <span>{money(l.sum)}</span>
                  </div>
                ))}
                {preview.vatRate > 0 ? (
                  <div className="flex justify-between py-0.5">
                    <span>Сумма НДС {preview.vatRate}% -</span>
                    <span>{money(preview.vatAmount)}</span>
                  </div>
                ) : null}
                <div className="mt-2 flex justify-between font-semibold">
                  <span>Итого</span>
                  <span>{money(preview.total)}</span>
                </div>
              </div>
            ) : null}
            {order.status === "VERIFIED" && !order.invoice ? <GenerateDocsButton orderId={order.id} /> : null}
          </CardBody>
        </Card>
      ) : null}

      {!order.invoice && order.status !== "CANCELLED" ? (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Выставить счёт и акт</h2>
            <IssueDocsButton
              customerId={order.customerId}
              customers={customers}
              initialLines={
                preview?.lines ||
                parseBillingJson(order.report?.billingJson)?.lines ||
                undefined
              }
              orderId={order.id}
              orgs={orgs}
              paymentMethod={order.paymentMethod}
              vatRate={displayVat}
            />
          </CardHeader>
          <CardBody>
            <p className="text-sm text-slate-500">
              Заказчик, способ оплаты, НДС, назначение платежа, позиции и итоги заполняются во всплывающем окне.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {order.invoice && order.act ? (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Документы и оплата</h2>
            {order.status !== "CANCELLED" ? (
              <EditDocsButton
                actDate={toDateInputInTz(order.act.issuedAt)}
                customerId={order.customerId}
                customers={customers}
                initialLines={linesFromJson(order.invoice.linesJson)}
                initialTotal={order.invoice.amount}
                initialVatAmount={order.invoice.vatAmount}
                invoiceDate={toDateInputInTz(order.invoice.issuedAt)}
                orderId={order.id}
                orgs={orgs}
                paymentMethod={order.paymentMethod}
                paymentPurpose={resolvePaymentPurpose(
                  order.invoice.paymentPurpose,
                  defaultPaymentPurpose({
                    invoiceNumber: order.invoice.number,
                    issuedAt: order.invoice.issuedAt,
                    orderNumber: order.number,
                    total: order.invoice.amount,
                    vatRate: order.invoice.vatRate ?? displayVat,
                  }),
                )}
                vatRate={order.invoice.vatRate ?? displayVat}
              />
            ) : null}
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <PdfLink className="text-brand-hover hover:underline" href={`/api/pdf/invoice/${order.invoice.publicToken}`}>
                Счёт {order.invoice.number} — {money(order.invoice.amount)}
              </PdfLink>
              <PdfLink className="text-brand-hover hover:underline" href={`/api/pdf/act/${order.act.publicToken}`}>
                Акт {order.act.number}
              </PdfLink>
              <Link className="text-slate-600 hover:underline" href={`/d/${order.invoice.publicToken}`}>
                Публичная ссылка
              </Link>
            </div>
            <p className="text-sm text-slate-500">
              Оплачено {money(paid)} из {money(order.invoice.amount)} · статус счёта: {invoiceStatusLabel(order.invoice.status)}
              {order.invoice.dueAt ? ` · срок ${formatDateTime(order.invoice.dueAt)}` : ""}
            </p>
            {order.invoice.status !== "PAID" ? (
              <form action={recordPayment} className="flex max-w-lg flex-wrap items-end gap-3">
                <input name="invoiceId" type="hidden" value={order.invoice.id} />
                <Field label="Сумма оплаты">
                  <Input
                    defaultValue={Math.max(order.invoice.amount - paid, 0)}
                    min={0.01}
                    name="amount"
                    step="0.01"
                    type="number"
                  />
                </Field>
                <Field label="Комментарий">
                  <Input name="comment" placeholder="Выписка, номер п/п" />
                </Field>
                <SubmitButton variant="success">Отметить оплату</SubmitButton>
              </form>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {audit.length > 0 ? (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Журнал действий</h2>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm">
              {audit.map((row) => (
                <li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-50 pb-2 last:border-0" key={row.id}>
                  <span>
                    <span className="font-semibold text-navy">{AUDIT_ACTION_LABELS[row.action] || row.action}</span>
                    {row.detail ? <span className="text-slate-600"> — {row.detail}</span> : null}
                    <span className="mt-0.5 block text-xs text-slate-400">{row.actorName}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{formatDateTime(row.createdAt)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 font-medium text-slate-800">{value}</div>
    </div>
  );
}
