export type OrderListFilter = "all" | "new" | "work" | "pay" | "done";

export const ORDER_FILTER_GROUPS: Record<Exclude<OrderListFilter, "all">, string[]> = {
  new: ["NEW", "ASSIGNED", "DECLINED"],
  work: ["ACCEPTED", "EN_ROUTE", "ON_SITE", "REPORT_SUBMITTED"],
  pay: ["VERIFIED", "AWAITING_PAYMENT"],
  done: ["PAID"],
};

const STATUS_TO_FILTER: Record<string, OrderListFilter> = {
  NEW: "new",
  ASSIGNED: "new",
  DECLINED: "new",
  ACCEPTED: "work",
  EN_ROUTE: "work",
  ON_SITE: "work",
  REPORT_SUBMITTED: "work",
  VERIFIED: "pay",
  AWAITING_PAYMENT: "pay",
  PAID: "done",
};

export function parseOrderListFilter(params: { status?: string; filter?: string }): OrderListFilter {
  const filter = params.filter?.trim();
  if (filter && filter !== "all" && filter in ORDER_FILTER_GROUPS) {
    return filter as Exclude<OrderListFilter, "all">;
  }
  const status = params.status?.trim().toUpperCase();
  if (status && STATUS_TO_FILTER[status]) return STATUS_TO_FILTER[status];
  return "all";
}

export function orderFilterWhere(filter: OrderListFilter) {
  if (filter === "all") return {};
  return { status: { in: ORDER_FILTER_GROUPS[filter] } };
}

export const ORDERS_PAGE_SIZE = 50;
