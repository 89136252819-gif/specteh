"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { AUDIT_ACTION_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export type AuditRow = {
  id: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  orderId: string | null;
  orderNumber: string | null;
  detail: string | null;
  createdAt: string;
};

const PAGE_SIZE = 50;

function buildParams(base: URLSearchParams, patch: { q?: string; page?: number }) {
  const next = new URLSearchParams(base.toString());
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

export function AuditDirectory({
  rows,
  total,
  page,
}: {
  rows: AuditRow[];
  total: number;
  page: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();
  const qParam = searchParams.get("q") || "";
  const [query, setQuery] = useState(qParam);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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

  function setPage(next: number) {
    const params = buildParams(searchParams, { page: next });
    start(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <div className="space-y-4">
      <div className="panel">
        <div className="border-b border-slate-100 px-4 py-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-2xl border border-stone-200 bg-white py-0 pl-9 pr-3 text-sm outline-none ring-menu/20 placeholder:text-stone-400 focus:border-menu focus:ring-2"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Сотрудник, действие, заявка, детали"
              value={query}
            />
          </div>
        </div>

        {pending ? <p className="px-4 py-2 text-xs text-slate-400">Обновляем…</p> : null}

        {rows.length === 0 ? (
          <EmptyState
            className="mx-4 my-8"
            description="Пока нет записей или ничего не нашли по запросу"
            title="Журнал пуст"
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm" key={row.id}>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-navy">
                    {AUDIT_ACTION_LABELS[row.action] || row.action}
                    {row.orderNumber ? (
                      <>
                        {" · "}
                        <Link className="text-menu-hover hover:underline" href={`/orders/${row.orderId}`}>
                          {row.orderNumber}
                        </Link>
                      </>
                    ) : null}
                  </div>
                  {row.detail ? <p className="mt-0.5 text-slate-600">{row.detail}</p> : null}
                  <p className="mt-1 text-xs text-slate-400">
                    {row.actorName}
                    {row.entity !== "Order" ? ` · ${row.entity} ${row.entityId.slice(0, 8)}…` : null}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-slate-400">{formatDateTime(row.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              {total.toLocaleString("ru-RU")} записей · стр. {page} из {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 disabled:opacity-40"
                disabled={page <= 1 || pending}
                onClick={() => setPage(page - 1)}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 disabled:opacity-40"
                disabled={page >= totalPages || pending}
                onClick={() => setPage(page + 1)}
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
