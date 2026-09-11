import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { STAFF_ROLES, invoiceStatusLabel } from "@/lib/constants";
import { invoiceWhere, parseReportFilters } from "@/lib/report-query";
import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role)) {
    return new NextResponse("Нет доступа", { status: 401 });
  }

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const filters = parseReportFilters(sp);
  const where = invoiceWhere(filters);

  const [invoices, customers] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        organization: true,
        order: { include: { customer: true, equipmentType: true, equipment: true } },
        payments: true,
      },
      orderBy: { issuedAt: "asc" },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Рэдианс-СпецТех";

  const invSheet = wb.addWorksheet("Счета");
  invSheet.addRow(["Номер", "Дата", "Заказчик", "ИНН", "Юрлицо", "Техника", "Сумма", "НДС", "Оплачено", "Статус", "Заявка"]);
  for (const i of invoices) {
    const paid = i.payments.reduce((s, p) => s + p.amount, 0);
    invSheet.addRow([
      i.number,
      i.issuedAt,
      i.order.customer.name,
      i.order.customer.inn,
      i.organization.name,
      i.order.equipment?.plateNumber || i.order.equipmentType.name,
      i.amount,
      i.vatAmount,
      paid,
      invoiceStatusLabel(i.status),
      i.order.number,
    ]);
  }

  const actSheet = wb.addWorksheet("Акты");
  actSheet.addRow(["Номер счёта", "Дата", "Заказчик", "Сумма", "НДС", "Заявка"]);
  for (const i of invoices) {
    actSheet.addRow([i.number, i.issuedAt, i.order.customer.name, i.amount, i.vatAmount, i.order.number]);
  }

  const cSheet = wb.addWorksheet("Контрагенты");
  cSheet.addRow(["Название", "Тип", "ИНН", "КПП", "Адрес", "Контакт", "Телефон", "Email"]);
  for (const c of customers) {
    cSheet.addRow([c.name, c.type, c.inn, c.kpp, c.address, c.contactName, c.phone, c.email]);
  }

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="spetsteh-report.xlsx"',
    },
  });
}
