"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { FilterChip, SummaryStat } from "@/components/directory-chrome";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { PdfLink } from "@/components/pdf-link";
import { invoiceStatusLabel } from "@/lib/constants";
import { DOCS_PAGE_SIZE } from "@/lib/list-paging";
import { formatDate, money } from "@/lib/utils";

export type InvoiceRow = {
  id: string;
  number: string;
  issuedAt: string;
  amount: number;
  status: string;
  customerName: string;
  organizationName: string;
  orderId: string;
  publicToken: string;
};

export type ActRow = {
  id: string;
  number: string;
  issuedAt: string;
  amount: number;
  customerName: string;
  publicToken: string;
};

export function DocumentsDirectory({
  invoices,
  acts,
  stats,
  page,
  invoiceTotal,
  actTotal,
  tab,
  unpaidOnly,
}: {
  invoices: InvoiceRow[];
  acts: ActRow[];
  stats: { total: number; unpaid: number; unpaidSum: number };
  page: number;
  invoiceTotal: number;
  actTotal: number;
  tab: "invoices" | "acts";
  unpaidOnly: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();
  const qParam = searchParams.get("q") || "";
  const [query, setQuery] = useState(qParam);
  const total = tab === "invoices" ? invoiceTotal : actTotal;
  const totalPages = Math.max(1, Math.ceil(total / DOCS_PAGE_SIZE));

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim() === qParam.trim()) return;
      const next = new URLSearchParams(searchParams.toString());
      if (query.trim()) next.set("q", query.trim());
      else next.delete("q");
      next.delete("page");
      start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
    }, 350);
    return () => clearTimeout(timer);
  }, [query, qParam, pathname, router, searchParams]);

  function patch(params: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value == null || value === "") next.delete(key);
      else next.set(key, value);
    }
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryStat hint="выставлено" label="Счетов" value={stats.total} />
        <SummaryStat hint="ещё не закрыты" label="Не оплачено" tone="accent" value={stats.unpaid} />
        <SummaryStat hint="по неоплаченным" label="К получению" value={money(stats.unpaidSum)} />
      </div>

      <div className="panel">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-2xl border border-stone-200 bg-white py-0 pl-9 pr-3 text-sm outline-none ring-menu/20 placeholder:text-stone-400 focus:border-menu focus:ring-2"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Номер или заказчик"
              value={query}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={tab === "invoices"} onClick={() => patch({ tab: null, page: null })}>
              Счета
            </FilterChip>
            <FilterChip active={tab === "acts"} onClick={() => patch({ tab: "acts", page: null, unpaid: null })}>
              Акты
            </FilterChip>
            {tab === "invoices" ? (
              <FilterChip
                active={unpaidOnly}
                onClick={() => patch({ unpaid: unpaidOnly ? null : "1", page: null })}
              >
                Только неоплаченные
              </FilterChip>
            ) : null}
          </div>
        </div>

        {pending ? <p className="px-4 py-2 text-xs text-slate-400">Обновляем список…</p> : null}

        {tab === "invoices" ? (
          invoices.length === 0 ? (
            <EmptyState
              actionHref={stats.total === 0 ? "/orders" : undefined}
              actionLabel={stats.total === 0 ? "К заявкам" : undefined}
              className="mx-4 my-8"
              description={
                stats.total === 0
                  ? "Счета появятся после проверки отчёта и выставления документов"
                  : unpaidOnly
                    ? "Неоплаченных счетов нет"
                    : "Ничего не нашли по этому запросу"
              }
              title={stats.total === 0 ? "Счетов пока нет" : "Список пуст"}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Номер</Th>
                  <Th>Дата</Th>
                  <Th>Заказчик</Th>
                  <Th>Юрлицо</Th>
                  <Th>Сумма</Th>
                  <Th>Статус</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((row) => (
                  <tr key={row.id}>
                    <Td className="font-semibold text-navy">{row.number}</Td>
                    <Td className="text-slate-600">{formatDate(row.issuedAt)}</Td>
                    <Td>{row.customerName}</Td>
                    <Td className="text-slate-600">{row.organizationName}</Td>
                    <Td className="font-semibold text-navy">{money(row.amount)}</Td>
                    <Td>
                      <Badge
                        className={
                          row.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : row.status === "PARTIAL"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-amber-100 text-amber-900"
                        }
                      >
                        {invoiceStatusLabel(row.status)}
                      </Badge>
                    </Td>
                    <Td>
                      <PdfLink className="link-quiet" href={`/api/pdf/invoice/${row.publicToken}`}>
                        PDF
                      </PdfLink>
                      {" · "}
                      <Link className="text-stone-500 hover:underline" href={`/orders/${row.orderId}`}>
                        заявка
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )
        ) : acts.length === 0 ? (
          <EmptyState
            actionHref={actTotal === 0 && !qParam ? "/orders" : undefined}
            actionLabel={actTotal === 0 && !qParam ? "К заявкам" : undefined}
            className="mx-4 my-8"
            description={
              actTotal === 0 && !qParam
                ? "Акты появятся вместе со счетами после закрытия заявки"
                : "Ничего не нашли по этому запросу"
            }
            title={actTotal === 0 && !qParam ? "Актов пока нет" : "Список пуст"}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Номер</Th>
                <Th>Дата</Th>
                <Th>Заказчик</Th>
                <Th>Сумма</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {acts.map((row) => (
                <tr key={row.id}>
                  <Td className="font-semibold text-navy">{row.number}</Td>
                  <Td className="text-slate-600">{formatDate(row.issuedAt)}</Td>
                  <Td>{row.customerName}</Td>
                  <Td className="font-semibold text-navy">{money(row.amount)}</Td>
                  <Td>
                    <PdfLink className="link-quiet" href={`/api/pdf/act/${row.publicToken}`}>
                      PDF
                    </PdfLink>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              Стр. {page} из {totalPages} · {total}
            </p>
            <div className="flex gap-2">
              <Button
                disabled={page <= 1 || pending}
                onClick={() => patch({ page: String(page - 1) })}
                size="sm"
                type="button"
                variant="secondary"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                disabled={page >= totalPages || pending}
                onClick={() => patch({ page: String(page + 1) })}
                size="sm"
                type="button"
                variant="secondary"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
