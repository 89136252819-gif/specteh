"use client";

import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { DispatchOrderCard, type DispatchOrder } from "@/components/dispatch-order-card";
import type { DispatchDriverOption, DispatchUnitOption } from "@/components/dispatch-assign-form";
import { EmptyState } from "@/components/empty-state";
import { FilterChip } from "@/components/directory-chrome";
import { cn } from "@/lib/utils";

export type DispatchColumn = {
  id: string;
  title: string;
  hint: string;
  items: DispatchOrder[];
};

type Filter = "all" | "late" | "nodriver" | string;

export function DispatchKanban({
  columns,
  driverOptions,
  unitOptions,
  lateIds,
  typeOptions = [],
}: {
  columns: DispatchColumn[];
  driverOptions: DispatchDriverOption[];
  unitOptions: DispatchUnitOption[];
  lateIds: string[];
  typeOptions?: { id: string; name: string }[];
}) {
  const [tab, setTab] = useState(columns[0]?.id || "assign");
  const [filter, setFilter] = useState<Filter>("all");
  const lateSet = useMemo(() => new Set(lateIds), [lateIds]);

  const filteredColumns = useMemo(() => {
    return columns.map((column) => ({
      ...column,
      items: column.items.filter((order) => {
        if (filter === "late" && !lateSet.has(order.id)) return false;
        if (filter === "nodriver" && order.driverId) return false;
        if (filter !== "all" && filter !== "late" && filter !== "nodriver" && order.equipmentTypeId !== filter) {
          return false;
        }
        return true;
      }),
    }));
  }, [columns, filter, lateSet]);

  const active = filteredColumns.find((column) => column.id === tab) || filteredColumns[0];

  return (
    <>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          Все
        </FilterChip>
        <FilterChip active={filter === "late"} onClick={() => setFilter("late")}>
          Опоздания
        </FilterChip>
        <FilterChip active={filter === "nodriver"} onClick={() => setFilter("nodriver")}>
          Без водителя
        </FilterChip>
        {typeOptions.map((type) => (
          <FilterChip active={filter === type.id} key={type.id} onClick={() => setFilter(type.id)}>
            {type.name}
          </FilterChip>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filteredColumns.map((column) => (
          <button
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition",
              tab === column.id ? "bg-navy text-white" : "bg-white text-slate-600 ring-1 ring-slate-200",
            )}
            key={column.id}
            onClick={() => setTab(column.id)}
            type="button"
          >
            {column.title}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 tabular-nums",
                tab === column.id ? "bg-white/15" : "bg-slate-100",
              )}
            >
              {column.items.length}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
        {filteredColumns.map((column) => (
          <section
            className={cn(
              "flex flex-col rounded-2xl bg-slate-50/90 p-2.5 ring-1 ring-slate-200/80 lg:min-h-[18rem]",
              column.id === tab ? "flex" : "hidden lg:flex",
            )}
            id={`col-${column.id}`}
            key={column.id}
          >
            <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
              <div>
                <h2 className="text-sm font-extrabold text-navy">{column.title}</h2>
                <p className="text-[11px] text-slate-400">{column.hint}</p>
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-navy ring-1 ring-slate-200">
                {column.items.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {column.items.length === 0 ? (
                <EmptyState
                  className="flex-1 bg-white/70 py-6 lg:py-8"
                  description={
                    column.id === "assign" && filter === "all"
                      ? "Новые заявки появятся здесь или на сайте"
                      : "Под фильтр ничего не попало"
                  }
                  icon={column.id === "assign" ? ClipboardList : undefined}
                  title="Пусто"
                  actionHref={column.id === "assign" && filter === "all" ? "/orders/new" : undefined}
                  actionLabel={column.id === "assign" && filter === "all" ? "Создать заявку" : undefined}
                />
              ) : (
                column.items.map((order) => (
                  <DispatchOrderCard
                    drivers={driverOptions}
                    key={order.id}
                    late={lateSet.has(order.id)}
                    order={order}
                    units={unitOptions}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      {active && active.items.length === 0 ? null : (
        <p className="text-center text-[11px] text-slate-400 lg:hidden">
          Колонка «{active?.title}» · листайте вкладки выше
        </p>
      )}
    </>
  );
}
