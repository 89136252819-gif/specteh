import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/constants";
import { vatInvoicePath } from "@/lib/vat-invoice-file";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role)) {
    return new NextResponse("Нет доступа", { status: 401 });
  }

  const { id } = await ctx.params;
  const card = await prisma.vatInvoice.findUnique({
    where: { id },
    select: { orderId: true, storedName: true, fileName: true, number: true },
  });
  if (!card) return new NextResponse("Не найдено", { status: 404 });

  const file = vatInvoicePath(card.orderId, card.storedName);
  if (!file || !existsSync(file)) return new NextResponse("Не найдено", { status: 404 });

  const data = await readFile(file);
  const downloadName = card.fileName || `${card.number}.pdf`;
  const ascii = downloadName.replace(/[^\w.\-]+/g, "_") || "schet-factura.pdf";
  return new NextResponse(Uint8Array.from(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
