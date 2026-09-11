"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { deleteCustomer, saveCustomer } from "@/actions/catalogs";
import { CustomerForm, type CustomerValues } from "@/components/forms/customer-form";
import { PersonAvatar } from "@/components/person-avatar";
import { RecordEditorModal } from "@/components/record-editor-modal";
import { CenterModal } from "@/components/center-modal";
import { EmptyState } from "@/components/empty-state";
import { FilterChip, SummaryStat } from "@/components/directory-chrome";
import { Button } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/constants";
import {
  CUSTOMERS_PAGE_SIZE,
  parseCustomerListFilter,
  type CustomerListFilter,
} from "@/lib/customer-list";
import { money, phoneHref, phonePretty } from "@/lib/utils";

export type CustomerRow = CustomerValues & {
  paymentMethod: string;
  ordersCount: number;
  debt: number;
};

export type CustomerListStats = {
  total: number;
  withDebt: number;
  debtSum: number;
};

const ERROR_TEXT: Record<string, string> = {
  orders: "Этого заказчика нельзя удалить: по нему уже есть заявки. Можно изменить карточку.",
};

function buildParams(
  base: URLSearchParams,
  patch: { filter?: CustomerListFilter; q?: string; page?: number },
) {
  const next = new URLSearchParams(base.toString());
  if (patch.filter !== undefined) {
    if (patch.filter === "all") next.delete("filter");
    else next.set("filter", patch.filter);
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

export function CustomersDirectory({
  customers,
  error,
  stats,
  total,
  page,
}: {
  customers: CustomerRow[];
  error?: string;
  stats: CustomerListStats;
  total: number;
  page: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();
  const filter = parseCustomerListFilter(searchParams.get("filter") || undefined);
  const qParam = searchParams.get("q") || "";
  const [query, setQuery] = useState(qParam);
  const [editor, setEditor] = useState<CustomerRow | null>(null);
  const [removing, setRemoving] = useState<CustomerRow | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / CUSTOMERS_PAGE_SIZE));
  const editing = editor ? customers.find((row) => row.id === editor.id) || editor : undefined;

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

  function setFilter(next: CustomerListFilter) {
    const params = buildParams(searchParams, { filter: next, page: 1 });
    start(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  function setPage(next: number) {
    const params = buildParams(searchParams, { page: next });
    start(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  async function save(formData: FormData) {
    await saveCustomer(formData);
    setEditor(null);
    router.replace(`/customers?${searchParams.toString()}`, { scroll: false });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error === "orders" ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200">
          {ERROR_TEXT.orders}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryStat hint="в справочнике" label="Заказчики" value={stats.total} />
        <SummaryStat hint="с незакрытыми счетами" label="С долгом" tone="accent" value={stats.withDebt} />
        <SummaryStat hint="к получению" label="Дебиторка" value={money(stats.debtSum)} />
      </div>

      <div className="panel">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-2xl border border-stone-200 bg-white py-0 pl-9 pr-3 text-sm outline-none ring-menu/20 placeholder:text-stone-400 focus:border-menu focus:ring-2"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти по названию, контакту, телефону"
              value={query}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              Все
            </FilterChip>
            <FilterChip active={filter === "debt"} onClick={() => setFilter("debt")}>
              С долгом
            </FilterChip>
            <FilterChip active={filter === "active"} onClick={() => setFilter("active")}>
              С заявками
            </FilterChip>
          </div>
        </div>

        {pending ? <p className="px-4 py-2 text-xs text-slate-400">Обновляем список…</p> : null}

        {customers.length === 0 ? (
          <EmptyState
            className="mx-4 my-8"
            description={
              filter === "debt"
                ? "Нет заказчиков с незакрытыми счетами"
                : filter === "active"
                  ? "Пока нет заказчиков с заявками"
                  : "Никого не нашли по этому запросу"
            }
            title="Список пуст"
          />
        ) : (
          <>
            <div className="space-y-2 p-3 md:hidden">
              {customers.map((row) => {
                const tel = phoneHref(row.phone);
                return (
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm" key={row.id}>
                    <Link className="flex items-start gap-3" href={`/customers/${row.id}`}>
                      <PersonAvatar name={row.name} />
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-navy">{row.name}</div>
                        <div className="text-sm text-slate-600">{row.contactName || "—"}</div>
                        {tel ? (
                          <a
                            className="mt-1 inline-block text-sm font-semibold text-menu-hover"
                            href={tel}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {phonePretty(row.phone)}
                          </a>
                        ) : (
                          <div className="mt-1 text-sm text-slate-500">{row.phone || "—"}</div>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>{PAYMENT_METHOD_LABELS[row.paymentMethod as PaymentMethod] || row.paymentMethod}</span>
                          <span>заявок: {row.ordersCount}</span>
                          {row.debt ? <span className="font-semibold text-amber-800">{money(row.debt)}</span> : null}
                        </div>
                      </div>
                    </Link>
                    <div className="mt-3 flex gap-2">
                      <Button className="flex-1" onClick={() => setEditor(row)} size="sm" type="button" variant="secondary">
                        Изменить
                      </Button>
                      <button
                        className="h-8 px-3 text-sm font-semibold text-stone-500 hover:text-stone-800"
                        onClick={() => setRemoving(row)}
                        type="button"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Заказчик</Th>
                    <Th>Контакт</Th>
                    <Th>Телефон</Th>
                    <Th>Оплата</Th>
                    <Th>Заявок</Th>
                    <Th>Долг</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((row) => {
                    const tel = phoneHref(row.phone);
                    return (
                      <tr className={row.id === editing?.id ? "bg-menu-soft/40" : undefined} key={row.id}>
                        <Td>
                          <Link className="flex min-w-0 items-center gap-3" href={`/customers/${row.id}`}>
                            <PersonAvatar name={row.name} />
                            <span className="truncate font-semibold text-navy hover:text-menu-hover">{row.name}</span>
                          </Link>
                        </Td>
                        <Td className="text-slate-600">{row.contactName || "—"}</Td>
                        <Td>
                          {tel ? (
                            <a className="font-medium text-navy hover:text-menu-hover hover:underline" href={tel}>
                              {phonePretty(row.phone)}
                            </a>
                          ) : (
                            row.phone || "—"
                          )}
                        </Td>
                        <Td className="text-slate-600">
                          {PAYMENT_METHOD_LABELS[row.paymentMethod as PaymentMethod] || row.paymentMethod}
                        </Td>
                        <Td>
                          {row.ordersCount ? (
                            <span className="font-semibold text-navy">{row.ordersCount}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </Td>
                        <Td className={row.debt ? "font-semibold text-amber-800" : "text-slate-400"}>
                          {row.debt ? money(row.debt) : "—"}
                        </Td>
                        <Td>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button onClick={() => setEditor(row)} size="sm" type="button" variant="secondary">
                              Изменить
                            </Button>
                            <button
                              className="h-8 px-2 text-sm font-semibold text-stone-500 hover:text-stone-800 hover:underline"
                              onClick={() => setRemoving(row)}
                              type="button"
                            >
                              Удалить
                            </button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-500">
                  Стр. {page} из {totalPages} · {total}
                </p>
                <div className="flex gap-2">
                  <Button disabled={page <= 1 || pending} onClick={() => setPage(page - 1)} size="sm" type="button" variant="secondary">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    disabled={page >= totalPages || pending}
                    onClick={() => setPage(page + 1)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <RecordEditorModal
        className="max-w-3xl"
        labelledBy="customer-editor-title"
        onClose={() => setEditor(null)}
        open={Boolean(editor)}
        subtitle={editing ? `${editing.contactName} · ${phonePretty(editing.phone)}` : undefined}
        title={editing ? `Изменить «${editing.name}»` : "Заказчик"}
      >
        {editing ? (
          <CustomerForm action={save} customer={editing} key={editing.id} onCancel={() => setEditor(null)} />
        ) : null}
      </RecordEditorModal>

      <CenterModal
        className="max-w-md"
        labelledBy="customer-remove-title"
        onClose={() => setRemoving(null)}
        open={Boolean(removing)}
      >
        <div className="px-6 py-5">
          <h3 className="font-extrabold text-navy" id="customer-remove-title">
            Удалить заказчика?
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {removing
              ? removing.ordersCount
                ? `«${removing.name}» нельзя удалить: по нему уже есть заявки. Можно изменить карточку.`
                : `«${removing.name}» исчезнет из справочника.`
              : null}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {removing && removing.ordersCount === 0 ? (
              <Button
                disabled={pending}
                onClick={() => {
                  if (!removing) return;
                  start(() => {
                    void deleteCustomer(removing.id);
                  });
                }}
                type="button"
                variant="danger"
              >
                {pending ? "Удаление…" : "Удалить"}
              </Button>
            ) : null}
            <Button disabled={pending} onClick={() => setRemoving(null)} type="button" variant="secondary">
              Отмена
            </Button>
          </div>
        </div>
      </CenterModal>
    </div>
  );
}
