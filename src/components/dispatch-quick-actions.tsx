"use client";

import { useTransition } from "react";
import { staffAdvanceOrderStatus } from "@/actions/orders";
import { ORDER_STATUSES } from "@/lib/constants";
import Link from "next/link";

const NEXT_LABEL: Record<string, string> = {
  [ORDER_STATUSES.ASSIGNED]: "Принять за водителя",
  [ORDER_STATUSES.ACCEPTED]: "В пути",
  [ORDER_STATUSES.EN_ROUTE]: "На объекте",
};

export function DispatchQuickActions({ orderId, status }: { orderId: string; status: string }) {
  const [pending, start] = useTransition();
  const nextLabel = NEXT_LABEL[status];

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {nextLabel ? (
        <button
          className="inline-flex h-7 items-center rounded-full bg-navy px-2.5 text-[11px] font-bold text-white disabled:opacity-50"
          disabled={pending}
          onClick={() => start(() => { void staffAdvanceOrderStatus(orderId); })}
          type="button"
        >
          {pending ? "…" : nextLabel}
        </button>
      ) : null}
      {status === ORDER_STATUSES.REPORT_SUBMITTED ? (
        <Link
          className="inline-flex h-7 items-center rounded-full bg-violet-100 px-2.5 text-[11px] font-bold text-violet-900"
          href={`/orders/${orderId}`}
        >
          К отчёту
        </Link>
      ) : null}
      <Link
        className="inline-flex h-7 items-center rounded-full bg-slate-100 px-2.5 text-[11px] font-bold text-slate-700"
        href={`/orders/${orderId}`}
      >
        Карточка
      </Link>
    </div>
  );
}
