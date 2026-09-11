import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import type { OverdueInvoice } from "@/components/overdue-invoices-button";
import { toStaffNotice } from "@/lib/notification-ui";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const now = new Date();
  const [notices, unpaid] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id, archived: false },
      orderBy: [{ read: "asc" }, { createdAt: "desc" }],
      take: 40,
    }),
    prisma.invoice.findMany({
      where: { status: { not: "PAID" } },
      include: { order: { include: { customer: true } }, payments: true },
      orderBy: { issuedAt: "asc" },
    }),
  ]);

  const overdue: OverdueInvoice[] = unpaid
    .map((invoice) => {
      const remaining = Math.max(invoice.amount - invoice.payments.reduce((sum, payment) => sum + payment.amount, 0), 0);
      const due = invoice.dueAt || new Date(invoice.issuedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
      return {
        id: invoice.id,
        number: invoice.number,
        orderId: invoice.orderId,
        customerName: invoice.order.customer.name,
        remaining,
        daysOverdue,
      };
    })
    .filter((invoice) => invoice.remaining > 0.01 && invoice.daysOverdue >= 0);

  return (
    <AppShell
      overdue={overdue}
      unread={notices.map(toStaffNotice)}
      user={user}
    >
      {children}
    </AppShell>
  );
}
