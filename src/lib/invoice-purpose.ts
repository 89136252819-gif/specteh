import { formatDate } from "@/lib/utils";

export function defaultPaymentPurpose(input: {
  invoiceNumber: string;
  issuedAt: Date;
  orderNumber: string;
  total: number;
  vatRate: number;
}) {
  const date = formatDate(input.issuedAt);
  const vat =
    input.vatRate > 0
      ? ` В том числе НДС ${input.vatRate}%.`
      : " Без НДС.";
  return `Оплата по счёту № ${input.invoiceNumber} от ${date} за услуги спецтехники по заявке ${input.orderNumber}.${vat}`;
}

export function resolvePaymentPurpose(
  stored: string | null | undefined,
  fallback: ReturnType<typeof defaultPaymentPurpose>,
) {
  const trimmed = stored?.trim();
  return trimmed || fallback;
}
