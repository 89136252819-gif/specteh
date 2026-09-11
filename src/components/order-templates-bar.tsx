"use client";

import { useTransition } from "react";
import { createOrderFromTemplate } from "@/actions/orders";
import { Button } from "@/components/ui/button";

export type OrderTemplateOption = {
  id: string;
  name: string;
  intervalDays: number;
};

export function OrderTemplatesBar({ templates }: { templates: OrderTemplateOption[] }) {
  const [pending, start] = useTransition();
  if (templates.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-sm font-bold text-navy">Шаблоны</div>
      <p className="mt-1 text-xs text-slate-500">Создать заявку из сохранённого шаблона (дата = сегодня + интервал).</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {templates.map((tpl) => (
          <li key={tpl.id}>
            <Button
              disabled={pending}
              onClick={() => start(() => { void createOrderFromTemplate(tpl.id); })}
              type="button"
              variant="secondary"
            >
              {tpl.name}
              <span className="ml-1 text-xs font-normal text-slate-400">+{tpl.intervalDays}д</span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
