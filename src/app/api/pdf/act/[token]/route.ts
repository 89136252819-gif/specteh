import { prisma } from "@/lib/db";
import { ActPdf } from "@/lib/pdf-docs";
import { buildPdfDoc, linesFromJson } from "@/lib/pdf-from-record";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import React from "react";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const act = await prisma.act.findUnique({
    where: { publicToken: token },
    include: { organization: true, order: { include: { customer: true } } },
  });
  if (!act) return new NextResponse("Не найдено", { status: 404 });

  const doc = buildPdfDoc({
    title: "Акт",
    number: act.number,
    issuedAt: act.issuedAt,
    organization: act.organization,
    customer: act.order.customer,
    basis: `Заявка ${act.order.number}`,
    workAddress: act.order.address,
    lines: linesFromJson(act.linesJson),
    vatAmount: act.vatAmount,
    amount: act.amount,
    vatRate: act.vatRate,
    paymentMethod: act.order.paymentMethod,
  });

  const buf = await renderToBuffer(React.createElement(ActPdf, { doc }) as never);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(act.number)}.pdf"`,
    },
  });
}
