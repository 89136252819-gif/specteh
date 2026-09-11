import { prisma } from "@/lib/db";
import { InvoicePdf } from "@/lib/pdf-docs";
import { buildPdfDoc, linesFromJson } from "@/lib/pdf-from-record";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import React from "react";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: { organization: true, order: { include: { customer: true } } },
  });
  if (!invoice) return new NextResponse("Не найдено", { status: 404 });

  const doc = buildPdfDoc({
    title: "Счёт",
    number: invoice.number,
    issuedAt: invoice.issuedAt,
    organization: invoice.organization,
    customer: invoice.order.customer,
    basis: `Заявка ${invoice.order.number}`,
    workAddress: invoice.order.address,
    lines: linesFromJson(invoice.linesJson),
    vatAmount: invoice.vatAmount,
    amount: invoice.amount,
    vatRate: invoice.vatRate,
    paymentMethod: invoice.order.paymentMethod,
    paymentPurpose: invoice.paymentPurpose,
  });

  const buf = await renderToBuffer(React.createElement(InvoicePdf, { doc }) as never);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(invoice.number)}.pdf"`,
    },
  });
}
