"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { recordPayment } from "@/actions/orders";
import { FilterChip, SummaryStat } from "@/components/directory-chrome";
import { EmptyState } from "@/components/empty-state";
import { PersonAvatar } from "@/components/person-avatar";
import { Field, Input } from "@/components/ui/fields";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { FINANCE_PAGE_SIZE } from "@/lib/list-paging";
import { formatDate, formatDateTime, money } from "@/lib/utils";

export type FinanceInvoice = {
  id: string;
  number: string;
  amount: number;
  paid: number;
  remaining: number;
  orderId: string;
  customerName: string;
  issuedAt: string;
};

export type FinancePayment = {
  id: string;
  paidAt: string;
  amount: number;
  comment: string | null;
  invoiceNumber: string;
  orderId: string;
  customerName: string;
  recordedBy: string | null;
};

export function FinanceDirectory({
  invoices,
  payments,
  stats,
  page,
  invoiceTotal,
  paymentTotal,
  tab,
}: {
  invoices: FinanceInvoice[];
  payments: FinancePayment[];
  stats: { debt: number; openCount: number; journalCount: number };
  page: number;
  invoiceTotal: number;
  paymentTotal: number;
  tab: "open" | "journal";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();
  const qParam = searchParams.get("q") || "";
  const [query, setQuery] = useState(qParam);
  const total = tab === "open" ? invoiceTotal : paymentTotal;
  const totalPages = Math.max(1, Math.ceil(total / FINANCE_PAGE_SIZE));

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
        <SummaryStat hint="остаток к получению" label="Дебиторка" tone="warn" value={money(stats.debt)} />
        <SummaryStat hint="ещё не закрыты" label="К оплате" value={stats.openCount} />
        <SummaryStat hint="в журнале" label="Поступлений" value={stats.journalCount} />
      </div>

      <div className="panel">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-2xl border border-stone-200 bg-white py-0 pl-9 pr-3 text-sm outline-none ring-menu/20 placeholder:text-stone-400 focus:border-menu focus:ring-2"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Счёт, заказчик, комментарий"
              value={query}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={tab === "open"} onClick={() => patch({ tab: null, page: null })}>
              К оплате
            </FilterChip>
            <FilterChip active={tab === "journal"} onClick={() => patch({ tab: "journal", page: null })}>
              Журнал
            </FilterChip>
          </div>
        </div>

        {pending ? <p className="px-4 py-2 text-xs text-slate-400">Обновляем список…</p> : null}

        {tab === "open" ? (
          invoices.length === 0 ? (
            <EmptyState
              className="mx-4 my-8"
              description={
                stats.openCount === 0
                  ? "Неоплаченных счетов нет — поступления отмечать нечего"
                  : "По поиску ничего не нашлось"
              }
              title={stats.openCount === 0 ? "Всё оплачено" : "Список пуст"}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {invoices.map((invoice) => {
                const ratio = invoice.amount > 0 ? Math.min((invoice.paid / invoice.amount) * 100, 100) : 0;
                return (
                  <li className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-end lg:justify-between" key={invoice.id}>
                    <div className="flex min-w-0 items-start gap-3">
                      <PersonAvatar name={invoice.customerName} />
                      <div className="min-w-0">
                        <Link className="font-bold text-navy hover:text-menu-hover hover:underline" href={`/orders/${invoice.orderId}`}>
                          {invoice.number}
                        </Link>
                        <div className="truncate text-sm text-slate-500">{invoice.customerName}</div>
                        <div className="mt-2 h-2 w-56 max-w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${ratio}%` }} />
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {money(invoice.paid)} из {money(invoice.amount)}
                          <span className="ml-2 font-semibold text-navy">осталось {money(invoice.remaining)}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">выставлен {formatDate(invoice.issuedAt)}</div>
                      </div>
                    </div>
                    <form action={recordPayment} className="flex flex-wrap items-end gap-2">
                      <input name="invoiceId" type="hidden" value={invoice.id} />
                      <Field className="w-32" label="Сумма">
                        <Input defaultValue={invoice.remaining} name="amount" step="0.01" type="number" />
                      </Field>
                      <Field className="w-44" label="Комментарий">
                        <Input name="comment" placeholder="п/п, выписка" />
                      </Field>
                      <SubmitButton variant="success">Отметить оплату</SubmitButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          )
        ) : payments.length === 0 ? (
          <EmptyState
            className="mx-4 my-8"
            description={stats.journalCount === 0 ? "Отметьте первую оплату по счёту" : "По поиску ничего не нашлось"}
            title={stats.journalCount === 0 ? "Поступлений пока нет" : "Список пуст"}
          />
        ) : (
          <>
            <div className="space-y-2 p-3 md:hidden">
              {payments.map((payment) => (
                <Link
                  className="block rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                  href={`/orders/${payment.orderId}`}
                  key={payment.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-navy">{payment.invoiceNumber}</div>
                      <div className="text-xs text-slate-500">{formatDateTime(payment.paidAt)}</div>
                    </div>
                    <div className="font-extrabold text-navy">{money(payment.amount)}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-700">{payment.customerName}</div>
                  {payment.comment ? <div className="mt-1 text-xs text-slate-400">{payment.comment}</div> : null}
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Дата</Th>
                    <Th>Счёт</Th>
                    <Th>Заказчик</Th>
                    <Th>Сумма</Th>
                    <Th>Кто отметил</Th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <Td className="whitespace-nowrap text-slate-500">{formatDateTime(payment.paidAt)}</Td>
                      <Td>
                        <Link className="font-semibold text-navy hover:text-menu-hover hover:underline" href={`/orders/${payment.orderId}`}>
                          {payment.invoiceNumber}
                        </Link>
                        {payment.comment ? <div className="text-xs text-slate-400">{payment.comment}</div> : null}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <PersonAvatar name={payment.customerName} size="sm" />
                          <span>{payment.customerName}</span>
                        </div>
                      </Td>
                      <Td className="font-semibold">{money(payment.amount)}</Td>
                      <Td className="text-slate-500">{payment.recordedBy || "—"}</Td>
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
