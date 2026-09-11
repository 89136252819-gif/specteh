import type { Prisma } from "@prisma/client";

export type CustomerListFilter = "all" | "debt" | "active";

export const CUSTOMERS_PAGE_SIZE = 50;

export function parseCustomerListFilter(raw?: string): CustomerListFilter {
  if (raw === "debt" || raw === "active") return raw;
  return "all";
}

export function customerSearchWhere(q: string): Prisma.CustomerWhereInput | undefined {
  const term = q.trim();
  if (!term) return undefined;
  return {
    OR: [
      { name: { contains: term } },
      { contactName: { contains: term } },
      { phone: { contains: term } },
      { inn: { contains: term } },
    ],
  };
}

export function customerFilterWhere(filter: CustomerListFilter): Prisma.CustomerWhereInput {
  if (filter === "debt") {
    return { orders: { some: { invoice: { is: { status: { not: "PAID" } } } } } };
  }
  if (filter === "active") {
    return { orders: { some: {} } };
  }
  return {};
}

export function customerListWhere(filter: CustomerListFilter, q: string): Prisma.CustomerWhereInput {
  const parts = [customerFilterWhere(filter), customerSearchWhere(q)].filter(
    (part): part is Prisma.CustomerWhereInput => Boolean(part && Object.keys(part).length),
  );
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { AND: parts };
}
