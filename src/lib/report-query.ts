import { Prisma } from "@prisma/client";

export type ReportFilters = {
  from?: string;
  to?: string;
  customerId?: string;
  organizationId?: string;
  typeId?: string;
  equipmentId?: string;
  driverId?: string;
  paymentMethod?: string;
  payStatus?: string;
};

export function parseReportFilters(sp: Record<string, string | undefined>): ReportFilters {
  return {
    from: sp.from || undefined,
    to: sp.to || undefined,
    customerId: sp.customerId || undefined,
    organizationId: sp.organizationId || undefined,
    typeId: sp.typeId || undefined,
    equipmentId: sp.equipmentId || undefined,
    driverId: sp.driverId || undefined,
    paymentMethod: sp.paymentMethod || undefined,
    payStatus: sp.payStatus || undefined,
  };
}

function dayStart(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function dayEnd(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export function invoiceWhere(f: ReportFilters): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {};
  if (f.from || f.to) {
    where.issuedAt = {};
    if (f.from) where.issuedAt.gte = dayStart(f.from);
    if (f.to) where.issuedAt.lte = dayEnd(f.to);
  }
  if (f.payStatus === "PAID") where.status = "PAID";
  if (f.payStatus === "UNPAID") where.status = { not: "PAID" };
  if (f.organizationId) where.organizationId = f.organizationId;

  const order: Prisma.OrderWhereInput = {};
  if (f.customerId) order.customerId = f.customerId;
  if (f.typeId) order.equipmentTypeId = f.typeId;
  if (f.equipmentId) order.equipmentId = f.equipmentId;
  if (f.driverId) order.driverId = f.driverId;
  if (f.paymentMethod) order.paymentMethod = f.paymentMethod;
  if (Object.keys(order).length) where.order = order;
  return where;
}

export function orderWhere(f: ReportFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = { status: { not: "CANCELLED" } };
  if (f.from || f.to) {
    where.scheduledAt = {};
    if (f.from) where.scheduledAt.gte = dayStart(f.from);
    if (f.to) where.scheduledAt.lte = dayEnd(f.to);
  }
  if (f.customerId) where.customerId = f.customerId;
  if (f.organizationId) where.organizationId = f.organizationId;
  if (f.typeId) where.equipmentTypeId = f.typeId;
  if (f.equipmentId) where.equipmentId = f.equipmentId;
  if (f.driverId) where.driverId = f.driverId;
  if (f.paymentMethod) where.paymentMethod = f.paymentMethod;
  return where;
}

export function toQuery(f: ReportFilters) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v) p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function isoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function periodPresets(today = new Date()) {
  const y = today.getFullYear();
  const m = today.getMonth();
  const startYear = new Date(y, 0, 1);
  const startMonth = new Date(y, m, 1);
  const startLastMonth = new Date(y, m - 1, 1);
  const endLastMonth = new Date(y, m, 0);
  const q = Math.floor(m / 3);
  const startQuarter = new Date(y, q * 3, 1);
  const startHalf = new Date(y, m - 5, 1);
  return [
    { key: "month", label: "Этот месяц", from: isoDate(startMonth), to: isoDate(today) },
    { key: "last", label: "Прошлый месяц", from: isoDate(startLastMonth), to: isoDate(endLastMonth) },
    { key: "quarter", label: "Квартал", from: isoDate(startQuarter), to: isoDate(today) },
    { key: "half", label: "Полгода", from: isoDate(startHalf), to: isoDate(today) },
    { key: "year", label: "Год", from: isoDate(startYear), to: isoDate(today) },
    { key: "all", label: "Всё время", from: "", to: "" },
  ];
}
