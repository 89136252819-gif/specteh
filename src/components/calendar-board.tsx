"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FilterChip } from "@/components/directory-chrome";
import { cn } from "@/lib/utils";

export type CalendarPayKind = "paid" | "unpaid" | "partial" | "none";

export type CalendarEvent = {
  id: string;
  day: number;
  href: string;
  time: string;
  title: string;
  customer: string;
  driver: string | null;
  status: string;
  payKind: CalendarPayKind;
  money: string | null;
};

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const GRID = "grid grid-cols-[repeat(7,minmax(0,1fr))]";

const CHIP: Record<CalendarPayKind, string> = {
  paid: "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200/80",
  unpaid: "bg-amber-50 text-amber-950 ring-1 ring-amber-200/80",
  partial: "bg-sky-50 text-sky-950 ring-1 ring-sky-200/80",
  none: "bg-slate-50 text-slate-800 ring-1 ring-slate-200/80",
};

const DOT: Record<CalendarPayKind, string> = {
  paid: "bg-emerald-500",
  unpaid: "bg-amber-500",
  partial: "bg-sky-500",
  none: "bg-slate-400",
};

const DAY_BG = {
  paid: "bg-emerald-50/90",
  unpaid: "bg-amber-50/90",
  mixed: "bg-white",
  empty: "bg-white",
};

const PAY_LABEL: Record<CalendarPayKind, string> = {
  paid: "Оплачено",
  unpaid: "Не оплачено",
  partial: "Частично",
  none: "Без счёта",
};

function dayTone(list: CalendarEvent[]) {
  if (!list.length) return "empty" as const;
  if (list.every((item) => item.payKind === "paid")) return "paid" as const;
  if (list.some((item) => item.payKind === "unpaid" || item.payKind === "partial")) return "unpaid" as const;
  return "mixed" as const;
}

function EventCard({ event, compact }: { event: CalendarEvent; compact?: boolean }) {
  return (
    <Link
      className={cn(
        "block min-w-0 overflow-hidden rounded-xl px-2 py-2 text-[11px] leading-tight transition hover:brightness-[0.98]",
        CHIP[event.payKind],
        compact && "rounded-2xl px-3 py-2.5 text-sm",
      )}
      href={event.href}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="font-bold">{event.time}</span>
        <span className="shrink-0 text-[10px] font-semibold opacity-80">{PAY_LABEL[event.payKind]}</span>
      </div>
      <div className="mt-0.5 truncate font-semibold">{event.title}</div>
      <div className="truncate opacity-80">{event.customer}</div>
      <div className="truncate opacity-70">{event.driver || "без водителя"}</div>
      <div className="mt-0.5 flex min-w-0 items-center justify-between gap-1 opacity-80">
        <span className="truncate">{event.status}</span>
        {event.money ? <span className="shrink-0 font-semibold">{event.money}</span> : null}
      </div>
    </Link>
  );
}

function DayDots({ list }: { list: CalendarEvent[] }) {
  if (!list.length) return null;
  const shown = list.slice(0, 3);
  const extra = list.length - shown.length;
  return (
    <span className="flex h-2 max-w-full items-center justify-center gap-0.5 overflow-hidden">
      {shown.map((item) => (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[item.payKind])} key={item.id} />
      ))}
      {extra > 0 ? <span className="text-[9px] font-bold leading-none text-stone-500">+{extra}</span> : null}
    </span>
  );
}

export function CalendarBoard({
  cells,
  events,
  todayDay,
}: {
  cells: Array<number | null>;
  events: CalendarEvent[];
  todayDay: number | null;
}) {
  const [payFilter, setPayFilter] = useState<"all" | CalendarPayKind>("all");
  const visibleEvents = useMemo(() => {
    if (payFilter === "all") return events;
    return events.filter((event) => event.payKind === payFilter);
  }, [events, payFilter]);

  const byDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const event of visibleEvents) {
      map.set(event.day, [...(map.get(event.day) || []), event]);
    }
    return map;
  }, [visibleEvents]);

  const firstBusy = visibleEvents[0]?.day ?? todayDay;
  const [selected, setSelected] = useState<number | null>(todayDay ?? firstBusy ?? null);
  const selectedEvents = selected ? byDay.get(selected) || [] : [];
  const paidCount = events.filter((item) => item.payKind === "paid").length;
  const unpaidCount = events.filter((item) => item.payKind === "unpaid").length;
  const partialCount = events.filter((item) => item.payKind === "partial").length;
  const noneCount = events.filter((item) => item.payKind === "none").length;

  return (
    <div className="min-w-0 space-y-3">
      <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
        <FilterChip active={payFilter === "all"} onClick={() => setPayFilter("all")}>
          Все · {events.length}
        </FilterChip>
        <FilterChip active={payFilter === "unpaid"} onClick={() => setPayFilter("unpaid")}>
          Не оплачено · {unpaidCount}
        </FilterChip>
        <FilterChip active={payFilter === "partial"} onClick={() => setPayFilter("partial")}>
          Частично · {partialCount}
        </FilterChip>
        <FilterChip active={payFilter === "paid"} onClick={() => setPayFilter("paid")}>
          Оплачено · {paidCount}
        </FilterChip>
        <FilterChip active={payFilter === "none"} onClick={() => setPayFilter("none")}>
          Без счёта · {noneCount}
        </FilterChip>
      </div>
      <div className="overflow-hidden rounded-[1.25rem] bg-slate-200/80 ring-1 ring-slate-200/80 lg:hidden">
        <div className={cn(GRID, "bg-stone-50")}>
          {WEEKDAYS.map((day) => (
            <div className="min-w-0 px-0.5 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-stone-500" key={day}>
              {day}
            </div>
          ))}
        </div>
        <div className={cn(GRID, "gap-px")}>
          {cells.map((day, index) => {
            const list = day ? byDay.get(day) || [] : [];
            const active = day != null && day === selected;
            const isToday = day != null && day === todayDay;
            return (
              <button
                className={cn(
                  "flex min-h-[3.15rem] min-w-0 flex-col items-center justify-start gap-0.5 px-0 py-1.5 text-center touch-manipulation",
                  day == null ? "bg-stone-50/80" : DAY_BG[dayTone(list)],
                  active && "ring-2 ring-inset ring-menu",
                  isToday && !active && "ring-1 ring-inset ring-navy/30",
                )}
                disabled={day == null}
                key={index}
                onClick={() => day && setSelected(day)}
                type="button"
              >
                {day ? (
                  <>
                    <span className={cn("text-xs font-bold", isToday ? "text-menu-hover" : "text-stone-700")}>{day}</span>
                    <DayDots list={list} />
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 lg:hidden">
        {selected ? (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2 px-1">
              <h2 className="text-sm font-extrabold text-navy">{selected} число</h2>
              <span className="shrink-0 text-xs text-slate-500">{selectedEvents.length ? `${selectedEvents.length} заяв.` : "заявок нет"}</span>
            </div>
            {selectedEvents.length ? (
              selectedEvents.map((event) => <EventCard compact event={event} key={event.id} />)
            ) : (
              <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-slate-400 ring-1 ring-slate-100">На этот день заявок нет</p>
            )}
          </div>
        ) : (
          <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-slate-400 ring-1 ring-slate-100">Выберите день</p>
        )}
      </div>

      <div className="panel hidden min-w-0 bg-slate-200/80 lg:block">
        <div className={GRID}>
          {WEEKDAYS.map((day) => (
            <div className="min-w-0 bg-stone-50 px-2 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-stone-500" key={day}>
              {day}
            </div>
          ))}
        </div>
        <div className={cn(GRID, "gap-px")}>
          {cells.map((day, index) => {
            const list = day ? byDay.get(day) || [] : [];
            const isToday = day != null && day === todayDay;
            return (
              <div
                className={cn(
                  "min-h-36 min-w-0 overflow-hidden p-1.5",
                  day == null ? "bg-stone-50/80" : DAY_BG[dayTone(list)],
                  isToday && "ring-2 ring-inset ring-menu",
                )}
                key={index}
              >
                {day ? (
                  <div className="mb-1.5 flex items-center justify-between gap-1">
                    <div className={cn("text-xs font-bold", isToday ? "text-menu-hover" : "text-stone-500")}>{day}</div>
                    {list.length ? <div className="text-[10px] font-semibold text-stone-400">{list.length} заяв.</div> : null}
                  </div>
                ) : null}
                <div className="min-w-0 space-y-1">
                  {list.map((event) => (
                    <EventCard event={event} key={event.id} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
