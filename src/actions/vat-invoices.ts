"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRoles } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { writeAudit } from "@/lib/audit";
import { PAYMENT_METHODS, ROLES } from "@/lib/constants";
import { isPdf, saveVatInvoiceFile, VAT_INVOICE_MAX_BYTES } from "@/lib/vat-invoice-file";

function parseIssuedDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() < 2000 || date.getFullYear() > 2100) return null;
  return date;
}

export async function returnVatInvoice(formData: FormData) {
  const user = await requireRoles([ROLES.ADMIN, ROLES.ACCOUNTANT]);
  const orderId = String(formData.get("orderId") || "");
  const number = String(formData.get("number") || "").trim();
  const issuedAt = parseIssuedDate(String(formData.get("issuedAt") || ""));
  const comment = String(formData.get("comment") || "").trim() || null;
  const file = formData.get("file");
  if (!orderId) return { error: "Нет заявки" };
  if (!number) return { error: "Укажите номер счёт-фактуры" };
  if (!issuedAt) return { error: "Укажите дату счёт-фактуры" };
  if (!(file instanceof File) || file.size === 0) return { error: "Приложите PDF счёт-фактуры" };
  if (file.size > VAT_INVOICE_MAX_BYTES) return { error: "Файл больше 10 МБ" };

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isPdf(bytes, file.name || "schet-factura.pdf")) return { error: "Нужен файл PDF" };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      invoice: true,
      act: true,
      customer: { select: { name: true } },
      vatInvoices: { where: { supersededAt: null }, select: { id: true } },
    },
  });
  if (!order?.invoice || !order.act) return { error: "Сначала нужен счёт и акт" };
  if (order.status === "CANCELLED") return { error: "Заявка отменена" };
  if (order.paymentMethod !== PAYMENT_METHODS.CASHLESS_VAT) {
    return { error: "Счёт-фактура нужна только для безнала с НДС" };
  }

  const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
  const displayName = (file.name || `${number}.pdf`).replace(/[\\/]/g, "").slice(0, 180) || `${number}.pdf`;
  saveVatInvoiceFile(orderId, storedName, bytes);

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    if (order.vatInvoices.length) {
      await tx.vatInvoice.updateMany({
        where: { orderId, supersededAt: null },
        data: { supersededAt: now },
      });
    }
    await tx.vatInvoice.create({
      data: {
        orderId,
        number,
        issuedAt,
        fileName: displayName.toLowerCase().endsWith(".pdf") ? displayName : `${displayName}.pdf`,
        storedName,
        comment,
        invoiceNumber: order.invoice!.number,
        invoiceAmount: order.invoice!.amount,
        invoiceVatAmount: order.invoice!.vatAmount,
        receivedById: user.id,
      },
    });
  });

  await writeAudit({
    actorId: user.id,
    actorName: user.name,
    action: "VAT_INVOICE",
    entity: "Order",
    entityId: orderId,
    orderId,
    detail: `Счёт-фактура ${number} к счёту ${order.invoice.number}`,
  });

  const issued = await prisma.auditLog.findFirst({
    where: { orderId, action: "GENERATE_DOCS" },
    orderBy: { createdAt: "desc" },
    select: { actorId: true },
  });
  const targetId = issued?.actorId || order.createdById;
  if (targetId && targetId !== user.id) {
    await notifyUser(targetId, {
      type: "VAT_INVOICE_RECEIVED",
      title: "Вернулась счёт-фактура",
      body: `${order.number}: ${number}`,
      orderId,
    });
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/documents");
  return { ok: true as const };
}
