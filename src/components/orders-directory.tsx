"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { FilterChip, SummaryStat } from "@/components/directory-chrome";
import { EmptyState } from "@/components/empty-state";
import { EquipmentTypeLabel } from "@/components/equipment-type-icon";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { PAYMENT_METHOD_LABELS, type OrderStatus, type PaymentMethod } from "@/lib/constants";
import {
  ORDER_FILTER_GROUPS,
  type OrderListFilter,
  ORDERS_PAGE_SIZE,
  parseOrderListFilter,
} from "@/lib/order-list";
import { formatDateTime } from "@/lib/utils";

export type OrderRow = {
  id: string;
  number: string;
  scheduledAt: string;
  address: string;
  status: string;
  paymentMethod: string;
  customerName: string;
  typeName: string;
  equipmentLabel: string | null;
  driverName: string | null;
};

export type OrderListStats = {
  total: number;
  new: number;
  pay: number;
};

function matches(row: OrderRow, query: string) {
  const hay =
    `${row.number} ${row.customerName} ${row.address} ${row.driverName || ""} ${row.typeName} ${row.equipmentLabel || ""}`.toLowerCase();
  return hay.includes(query);
}

function buildParams(
  base: URLSearchParams,
  patch: { filter?: OrderListFilter; q?: string; page?: number },
) {
  const next = new URLSearchParams(base.toString());
  if (patch.filter !== undefined) {
    if (patch.filter === "all") next.delete("filter");
    else next.set("filter", patch.filter);
    next.delete("status");
  }
  if (patch.q !== undefined) {
    if (patch.q.trim()) next.set("q", patch.q.trim());
    else next.delete("q");
  }
  if (patch.page !== undefined) {
    if (patch.page <= 1) next.delete("page");
    else next.set("page", String(patch.page));
  }
  return next;
}

export function OrdersDirectory({
  orders,
  stats,
  total,
  page,
}: {
  orders: OrderRow[];
  stats: OrderListStats;
  total: number;
  page: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();
  const filter = parseOrderListFilter({
    status: searchParams.get("status") || undefined,
    filter: searchParams.get("filter") || undefined,
  });
  const qParam = searchParams.get("q") || "";
  const [query, setQuery] = useState(qParam);
  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim() === qParam.trim()) return;
      const next = buildParams(searchParams, { q: query, page: 1 });
      start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
    }, 350);
    return () => clearTimeout(timer);
  }, [query, qParam, pathname, router, searchParams]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((row) => matches(row, q));
  }, [orders, query]);

  function setFilter(next: OrderListFilter) {
    const params = buildParams(searchParams, { filter: next, page: 1 });
    start(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  function setPage(next: number) {
    const params = buildParams(searchParams, { page: next });
    start(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryStat hint="в журнале" label="Заявок" value={stats.total} />
        <SummaryStat hint="новые и на назначении" label="К разбору" tone="accent" value={stats.new} />
        <SummaryStat hint="проверено и ждёт оплаты" label="К оплате" value={stats.pay} />
      </div>

      <div className="panel">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-2xl border border-stone-200 bg-white py-0 pl-9 pr-3 text-sm outline-none ring-menu/20 placeholder:text-stone-400 focus:border-menu focus:ring-2"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Номер, заказчик, водитель, контакт, адрес, счёт"
              value={query}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "new", "work", "pay", "done"] as const).map((key) => (
              <FilterChip active={filter === key} key={key} onClick={() => setFilter(key)}>
                {key === "all"
                  ? "Все"
                  : key === "new"
                    ? "К разбору"
                    : key === "work"
                      ? "В работе"
                      : key === "pay"
                        ? "К оплате"
                        : "Оплачены"}
              </FilterChip>
            ))}
          </div>
        </div>

        {pending ? <p className="px-4 py-2 text-xs text-slate-400">Обновляем список…</p> : null}

        {visible.length === 0 ? (
          <EmptyState
            actionHref={stats.total === 0 ? "/orders/new" : undefined}
            actionLabel={stats.total === 0 ? "Создать заявку" : undefined}
            className="mx-4 my-8"
            description={
              stats.total === 0
                ? "Первая заявка появится здесь после создания или с сайта"
                : "Ничего не нашли по этому запросу или фильтру"
            }
            title={stats.total === 0 ? "Заявок пока нет" : "Список пуст"}
          />
        ) : (
          <>
            <div className="space-y-2 p-3 md:hidden">
              {visible.map((row) => (
                <OrderCard key={row.id} row={row} />
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>№</Th>
                    <Th>Когда</Th>
                    <Th>Заказчик</Th>
                    <Th>Техника</Th>
                    <Th>Водитель</Th>
                    <Th>Оплата</Th>
                    <Th>Статус</Th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.id}>
                      <Td>
                        <Link className="font-semibold text-navy hover:text-menu-hover hover:underline" href={`/orders/${row.id}`}>
                          {row.number}
                        </Link>
                      </Td>
                      <Td className="whitespace-nowrap text-slate-600">{formatDateTime(row.scheduledAt)}</Td>
                      <Td>
                        <div className="font-medium text-navy">{row.customerName}</div>
                        <div className="max-w-xs truncate text-xs text-slate-500">{row.address}</div>
                      </Td>
                      <Td>
                        <EquipmentTypeLabel className="text-sm" name={row.typeName} size="sm" />
                        {row.equipmentLabel ? <div className="mt-1 text-xs text-slate-500">{row.equipmentLabel}</div> : null}
                      </Td>
                      <Td className={row.driverName ? "text-slate-700" : "text-slate-400"}>{row.driverName || "—"}</Td>
                      <Td className="text-slate-600">{PAYMENT_METHOD_LABELS[row.paymentMethod as PaymentMethod]}</Td>
                      <Td>
                        <StatusBadge status={row.status as OrderStatus} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              Страница {page} из {totalPages} · всего {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex h-9 items-center gap-1 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-600 disabled:opacity-40"
                disabled={page <= 1 || pending}
                onClick={() => setPage(page - 1)}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
                Назад
              </button>
              <button
                className="inline-flex h-9 items-center gap-1 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-600 disabled:opacity-40"
                disabled={page >= totalPages || pending}
                onClick={() => setPage(page + 1)}
                type="button"
              >
                Дальше
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OrderCard({ row }: { row: OrderRow }) {
  return (
    <Link
      className="block rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-menu/30 hover:shadow-md"
      href={`/orders/${row.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-extrabold text-navy">{row.number}</div>
          <div className="mt-0.5 text-xs text-slate-500">{formatDateTime(row.scheduledAt)}</div>
        </div>
        <StatusBadge status={row.status as OrderStatus} />
      </div>
      <div className="mt-2 font-semibold text-slate-800">{row.customerName}</div>
      <div className="mt-1 text-sm text-slate-600">{row.address}</div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>{row.typeName}</span>
        {row.driverName ? <span>{row.driverName}</span> : <span className="text-amber-600">без водителя</span>}
        <span>{PAYMENT_METHOD_LABELS[row.paymentMethod as PaymentMethod]}</span>
      </div>
    </Link>
  );
}

export { ORDER_FILTER_GROUPS };
