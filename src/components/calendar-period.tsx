"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/fields";

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export function CalendarPeriodPicker({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const nowYear = new Date().getFullYear();
  const from = Math.min(nowYear - 3, year);
  const to = Math.max(nowYear + 2, year);
  const years = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  function go(nextYear: number, nextMonth: number) {
    const value = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
    router.push(`/calendar?month=${value}`);
  }

  return (
    <div className="flex min-w-0 flex-1 gap-2">
      <Select
        aria-label="Месяц"
        className="min-w-0 flex-1 text-base sm:w-[148px] sm:flex-none sm:text-sm"
        value={String(month)}
        onChange={(e) => go(year, Number(e.target.value))}
      >
        {MONTHS.map((label, i) => (
          <option key={label} value={i + 1}>
            {label}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Год"
        className="w-[92px] shrink-0 text-base sm:w-[108px] sm:text-sm"
        value={String(year)}
        onChange={(e) => go(Number(e.target.value), month)}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
}
