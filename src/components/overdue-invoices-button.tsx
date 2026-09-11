"use client";

import { useTransition } from "react";
import { remindOverdueInvoice } from "@/actions/orders";
import { money } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import { BadgeDollarSign, X } from "lucide-react";
import { CenterModal } from "@/components/center-modal";
import { Button } from "@/components/ui/button";

export type OverdueInvoice = {
  id: string;
  number: string;
  orderId: string;
  customerName: string;
  remaining: number;
  daysOverdue: number;
};

function daysLabel(n: number) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return `${n} день`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return `${n} дня`;
  return `${n} дней`;
}

export function OverdueInvoicesButton({ overdue }: { overdue: OverdueInvoice[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const count = overdue.length;

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`unpaid-btn flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3 shadow-sm ring-1 transition active:scale-95 sm:pl-2.5 ${
          count
            ? "is-alert bg-amber-50 text-amber-900 ring-amber-200 hover:bg-amber-100"
            : "bg-white text-slate-600 ring-slate-200 hover:bg-menu-soft hover:text-menu-hover"
        }`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        type="button"
      >
        <span aria-hidden className="unpaid-sheen" />
        <span className="unpaid-icon">
          <BadgeDollarSign className="h-5 w-5 shrink-0" />
        </span>
        <span className="hidden text-sm font-semibold sm:inline">Неоплаченные</span>
        {count > 0 ? (
          <span className="pulse-live flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>
      <CenterModal labelledBy="overdue-report-title" onClose={() => setOpen(false)} open={open}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-base font-extrabold text-navy" id="overdue-report-title">
              Неоплаченные счета
            </h3>
            <p className="mt-1 text-xs text-slate-500">По сроку оплаты (или старше 7 дней от выставления)</p>
          </div>
          <button
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-50 hover:text-navy"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">
          {msg ? <p className="mb-3 text-xs font-semibold text-menu-hover">{msg}</p> : null}
          {overdue.length === 0 ? (
            <p className="rounded-2xl bg-emerald-50 px-4 py-8 text-center text-sm text-emerald-800">
              Просроченных счетов нет
            </p>
          ) : (
            <ul className="max-h-[min(24rem,50vh)] space-y-2 overflow-y-auto">
              {overdue.map((invoice) => (
                <li
                  className="flex flex-col gap-2 rounded-2xl bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  key={invoice.id}
                >
                  <div className="min-w-0">
                    <Link className="font-bold text-navy hover:underline" href={`/orders/${invoice.orderId}`} onClick={() => setOpen(false)}>
                      {invoice.number}
                    </Link>
                    <div className="truncate text-sm text-slate-600">{invoice.customerName}</div>
                    <div className="text-xs text-amber-800">
                      {money(invoice.remaining)} · просрочка {daysLabel(invoice.daysOverdue)}
                    </div>
                  </div>
                  <Button
                    disabled={pending}
                    onClick={() => {
                      start(async () => {
                        const result = await remindOverdueInvoice(invoice.id);
                        setMsg(
                          result.ok
                            ? result.status === "SKIPPED"
                              ? `${invoice.number}: MAX не привязан`
                              : `${invoice.number}: напоминание отправлено`
                            : result.error || "Не удалось отправить",
                        );
                      });
                    }}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Напомнить в MAX
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CenterModal>
    </>
  );
}
