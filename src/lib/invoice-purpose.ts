import { formatDate } from "@/lib/utils";

/** НДС начисляется сверху суммы, не «в том числе». */
export function vatOnTopLabel(vatRate: number) {
  return `Сумма НДС ${vatRate}% -`;
}

export function normalizeVatWording(text: string) {
  return text.replace(/В том числе НДС (\d+(?:[.,]\d+)?)%\s*\.?/gi, "Сумма НДС $1% -");
}

export function defaultPaymentPurpose(input: {
  invoiceNumber: string;
  issuedAt: Date;
  orderNumber: string;
  total: number;
  vatRate: number;
}) {
  const date = formatDate(input.issuedAt);
  const vat = input.vatRate > 0 ? ` ${vatOnTopLabel(input.vatRate)}` : " Без НДС.";
  return `Оплата по счёту № ${input.invoiceNumber} от ${date} за услуги спецтехники по заявке ${input.orderNumber}.${vat}`;
}

export function resolvePaymentPurpose(
  stored: string | null | undefined,
  fallback: ReturnType<typeof defaultPaymentPurpose>,
) {
  const trimmed = stored?.trim();
  return normalizeVatWording(trimmed || fallback);
}
