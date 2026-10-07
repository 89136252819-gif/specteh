import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { AccountantVatList } from "@/components/accountant-vat-list";
import { PAYMENT_METHODS, ROLES } from "@/lib/constants";
import { vatInvoiceKind, vatInvoiceNeedsReturn, type VatInvoiceKind } from "@/lib/vat-invoice";

export default async function VatInvoicesPage() {
  const user = await requireStaff();
  const orders = await prisma.order.findMany({
    where: {
      status: { not: "CANCELLED" },
      paymentMethod: PAYMENT_METHODS.CASHLESS_VAT,
      invoice: { isNot: null },
    },
    orderBy: { scheduledAt: "desc" },
    include: {
      customer: { select: { name: true } },
      invoice: { select: { number: true, amount: true, vatAmount: true } },
      act: { select: { number: true } },
      vatInvoices: {
        where: { supersededAt: null },
        orderBy: { receivedAt: "desc" },
        take: 1,
        select: { id: true, number: true, issuedAt: true, invoiceNumber: true, invoiceAmount: true, invoiceVatAmount: true },
      },
    },
  });

  const rows = orders
    .map((order) => {
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
        invoiceNumber: order.invoice?.number || "—",
        actNumber: order.act?.number || null,
        amount: order.invoice?.amount || 0,
        vatAmount: order.invoice?.vatAmount || 0,
        kind: (kind === "none" || kind === "not_required" ? "waiting" : kind) as Exclude<VatInvoiceKind, "none" | "not_required">,
        vatNumber: current?.number || null,
        vatId: current?.id || null,
        vatIssuedAt: current?.issuedAt.toISOString() || null,
      };
    })
    .sort((a, b) => Number(vatInvoiceNeedsReturn(b.kind)) - Number(vatInvoiceNeedsReturn(a.kind)));

  const waiting = rows.filter((row) => vatInvoiceNeedsReturn(row.kind)).length;

  return (
    <div>
      <PageHeader
        subtitle="Заявки с НДС, по которым нужна счёт-фактура."
        title="Счёт-фактуры"
      />
      <AccountantVatList canReturn={user.role === ROLES.ACCOUNTANT || user.role === ROLES.ADMIN} rows={rows} waiting={waiting} />
    </div>
  );
}
