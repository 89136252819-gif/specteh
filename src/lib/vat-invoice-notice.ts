import { notifyAccountants } from "@/lib/notifications";
import { money } from "@/lib/utils";

export async function notifyVatInvoiceNeeded(input: {
  orderId: string;
  orderNumber: string;
  customerName: string;
  invoiceNumber: string;
  actNumber: string;
  amount: number;
  vatAmount: number;
  renewed?: boolean;
}) {
  const title = input.renewed ? "Нужна новая счёт-фактура" : "Нужна счёт-фактура";
  const body = input.renewed
    ? `${input.orderNumber}: счёт изменён, прежняя счёт-фактура устарела`
    : `${input.orderNumber}: выставлены счёт и акт с НДС`;
  await notifyAccountants({
    type: input.renewed ? "VAT_INVOICE_STALE" : "VAT_INVOICE_NEEDED",
    title,
    body,
    orderId: input.orderId,
    lines: [
      { value: input.orderNumber, strong: true },
      { icon: "👤", value: input.customerName },
      { icon: "📄", value: `Счёт ${input.invoiceNumber} · акт ${input.actNumber}` },
      { icon: "💰", value: `${money(input.amount)} · НДС ${money(input.vatAmount)}` },
    ],
  });
}
