import { PAYMENT_METHODS } from "@/lib/constants";

export type VatInvoiceSnapshot = {
  invoiceNumber: string;
  invoiceAmount: number;
  invoiceVatAmount: number;
};

export type VatInvoiceKind = "none" | "not_required" | "waiting" | "received" | "stale";

const MONEY_GAP = 0.01;

export function vatInvoiceIsStale(
  card: VatInvoiceSnapshot,
  invoice: { number: string; amount: number; vatAmount: number },
) {
  return (
    card.invoiceNumber !== invoice.number ||
    Math.abs(card.invoiceAmount - invoice.amount) > MONEY_GAP ||
    Math.abs(card.invoiceVatAmount - invoice.vatAmount) > MONEY_GAP
  );
}

export function vatInvoiceKind(input: {
  paymentMethod: string;
  invoice: { number: string; amount: number; vatAmount: number } | null;
  current: VatInvoiceSnapshot | null;
}): VatInvoiceKind {
  if (input.paymentMethod === PAYMENT_METHODS.CASHLESS_NO_VAT) return "not_required";
  if (input.paymentMethod !== PAYMENT_METHODS.CASHLESS_VAT || !input.invoice) return "none";
  if (!input.current) return "waiting";
  if (vatInvoiceIsStale(input.current, input.invoice)) return "stale";
  return "received";
}

export const VAT_INVOICE_KIND_LABELS: Record<Exclude<VatInvoiceKind, "none">, string> = {
  waiting: "Ждёт",
  received: "Получена",
  stale: "Устарела",
  not_required: "Не требуется",
};

export function vatInvoiceNeedsReturn(kind: VatInvoiceKind) {
  return kind === "waiting" || kind === "stale";
}
