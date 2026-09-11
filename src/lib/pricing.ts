import { prisma } from "./db";
import { PRICE_KIND_LABELS, PRICE_KINDS, type PaymentMethod } from "./constants";
import { PRICE_UNITS, linesFromQty, parseBillingJson, resolveVatRate, totalsFromLines, type PriceRate } from "./pricing-shared";

export type { CalcResult, DocLine, PriceRate } from "./pricing-shared";
export { applyManualTotals, linesFromQty, parseBillingJson, resolveVatRate, roundMoney, storedDocVatRate, totalsFromLines } from "./pricing-shared";

async function rate(equipmentTypeId: string, customerId: string, kind: string) {
  const override = await prisma.priceItem.findFirst({
    where: { equipmentTypeId, customerId, kind },
  });
  if (override) return override;
  return prisma.priceItem.findFirst({
    where: { equipmentTypeId, customerId: null, kind },
  });
}

export async function getRatesForOrder(orderId: string): Promise<PriceRate[]> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return [];
  const kinds = Object.values(PRICE_KINDS);
  return Promise.all(
    kinds.map(async (kind) => {
      const item = await rate(order.equipmentTypeId, order.customerId, kind);
      return {
        kind,
        label: item?.label || PRICE_KIND_LABELS[kind] || kind,
        unit: PRICE_UNITS[kind] || "шт",
        amount: item?.amount ?? 0,
      };
    }),
  );
}

export async function calculateFromReport(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { report: true, organization: true },
  });
  if (!order?.report) throw new Error("Нет отчёта по заявке");

  const payment = order.paymentMethod as PaymentMethod;
  const saved = parseBillingJson(order.report.billingJson);
  const vatRate = saved
    ? saved.vatRate
    : resolveVatRate(payment, order.vatRate, order.organization.vatRate);
  if (saved) return totalsFromLines(saved.lines, vatRate);

  const rates = await getRatesForOrder(orderId);
  const lines = linesFromQty(order.report, rates);
  return totalsFromLines(lines, vatRate);
}
