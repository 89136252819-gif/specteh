import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/constants";
import { ActPdf, InvoicePdf } from "@/lib/pdf-docs";
import { buildPdfDoc, sampleDocLines } from "@/lib/pdf-from-record";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import React from "react";

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string; orgId: string }> }) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role)) {
    return new NextResponse("Нет доступа", { status: 401 });
  }

  const { kind, orgId } = await ctx.params;
  if (kind !== "invoice" && kind !== "act") {
    return new NextResponse("Неизвестный документ", { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return new NextResponse("Организация не найдена", { status: 404 });

  const { lines, vatAmount, total } = sampleDocLines(org.vatRate);
  const prefix = kind === "invoice" ? org.invoicePrefix : org.actPrefix;
  const doc = buildPdfDoc({
    title: kind === "invoice" ? "Счёт" : "Акт",
    number: `${prefix}-ОБРАЗЕЦ`,
    issuedAt: new Date(),
    organization: org,
    customer: {
      name: 'ООО «Пример заказчика»',
      inn: "7701234567",
      kpp: "770101001",
      address: "г. Москва, ул. Примерная, д. 1",
    },
    basis: "Заявка З-0001 (образец)",
    workAddress: "г. Москва, объект заказчика",
    lines,
    vatAmount,
    amount: total,
    vatRate: org.vatRate,
    paymentMethod: org.paymentMethod,
  });

  const element = kind === "invoice" ? React.createElement(InvoicePdf, { doc }) : React.createElement(ActPdf, { doc });
  const buf = await renderToBuffer(element as never);
  const filename = kind === "invoice" ? "schet-obrazec.pdf" : "akt-obrazec.pdf";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
