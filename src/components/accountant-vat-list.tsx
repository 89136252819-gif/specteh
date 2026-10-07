"use client";

import { useMemo, useState } from "react";
import { FilterChip, SummaryStat } from "@/components/directory-chrome";
import { EmptyState } from "@/components/empty-state";
import { VatInvoiceReturnForm } from "@/components/vat-invoice-return-form";
import { Badge } from "@/components/ui/badge";
import { VAT_INVOICE_KIND_LABELS, vatInvoiceNeedsReturn, type VatInvoiceKind } from "@/lib/vat-invoice";
import { formatDate, money } from "@/lib/utils";

export type AccountantVatRow = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  invoiceNumber: string;
  actNumber: string | null;
  amount: number;
  vatAmount: number;
  kind: Exclude<VatInvoiceKind, "none" | "not_required">;
  vatNumber: string | null;
  vatId: string | null;
  vatIssuedAt: string | null;
};

const FILTERS = [
  { id: "need", label: "Нужно сделать" },
  { id: "all", label: "Все" },
  { id: "received", label: "Получена" },
] as const;

export function AccountantVatList({
  rows,
  waiting,
  canReturn,
}: {
  rows: AccountantVatRow[];
  waiting: number;
  canReturn: boolean;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("need");
  const [openId, setOpenId] = useState<string | null>(null);
  const visible = useMemo(() => {
    if (filter === "need") return rows.filter((row) => vatInvoiceNeedsReturn(row.kind));
    if (filter === "received") return rows.filter((row) => row.kind === "received");
    return rows;
  }, [filter, rows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:max-w-md sm:gap-3">
        <SummaryStat hint="включая устаревшие" label="Ждут счёт-фактуру" tone="accent" value={waiting} />
        <SummaryStat hint="безнал с НДС" label="Всего заявок" value={rows.length} />
      </div>
      <div className="panel">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-4">
          {FILTERS.map((item) => (
            <FilterChip active={filter === item.id} key={item.id} onClick={() => setFilter(item.id)}>
              {item.label}
            </FilterChip>
          ))}
        </div>
        {visible.length === 0 ? (
          <EmptyState
            className="mx-4 my-8"
            description={filter === "need" ? "Все счёт-фактуры по безналу с НДС уже возвращены" : "Таких заявок нет"}
            title={filter === "need" ? "Ждать нечего" : "Список пуст"}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((row) => {
              const open = openId === row.orderId;
              return (
                <li className="px-4 py-4" key={row.orderId}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-navy">{row.orderNumber}</p>
                      <p className="text-sm text-slate-600">{row.customerName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Счёт {row.invoiceNumber}
                        {row.actNumber ? ` · акт ${row.actNumber}` : ""} · {money(row.amount)} · НДС {money(row.vatAmount)}
                      </p>
                      {row.vatNumber ? (
                        <p className="mt-1 text-sm">
                          {row.vatId ? (
                            <a className="font-semibold text-brand-hover hover:underline" href={`/api/vat-invoice/${row.vatId}`}>
                              {row.vatNumber}
                            </a>
                          ) : (
                            <span className="font-semibold text-navy">{row.vatNumber}</span>
                          )}
                          {row.vatIssuedAt ? <span className="text-slate-500"> · {formatDate(row.vatIssuedAt)}</span> : null}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          row.kind === "received"
                            ? "bg-emerald-100 text-emerald-800"
                            : row.kind === "stale"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-rose-100 text-rose-800"
                        }
                      >
                        {VAT_INVOICE_KIND_LABELS[row.kind]}
                      </Badge>
                      {canReturn && vatInvoiceNeedsReturn(row.kind) ? (
                        <button
                          className="text-sm font-semibold text-brand-hover hover:underline"
                          onClick={() => setOpenId(open ? null : row.orderId)}
                          type="button"
                        >
                          {open ? "Скрыть" : "Вернуть файл"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {open && canReturn ? (
                    <div className="mt-4 max-w-xl">
                      <VatInvoiceReturnForm orderId={row.orderId} replace={row.kind === "stale"} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
