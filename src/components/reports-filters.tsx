import Link from "next/link";
import { Field, Input, Select } from "@/components/ui/fields";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { periodPresets, toQuery, type ReportFilters } from "@/lib/report-query";

type Opt = { id: string; name: string };

export function ReportsFilters({
  filters,
  customers,
  organizations,
  types,
  units,
  drivers,
}: {
  filters: ReportFilters;
  customers: Opt[];
  organizations: Opt[];
  types: Opt[];
  units: { id: string; name: string; plateNumber: string }[];
  drivers: Opt[];
}) {
  const presets = periodPresets();
  const activePreset = presets.find((p) => (p.from || "") === (filters.from || "") && (p.to || "") === (filters.to || ""));

  return (
    <form className="panel mb-6 p-5">
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
        {presets.map((p) => {
          const href = toQuery({ ...filters, from: p.from || undefined, to: p.to || undefined });
          const on = activePreset?.key === p.key;
          return (
            <Link
              key={p.key}
              href={`/reports${href}`}
              className={
                on
                  ? "inline-flex min-h-9 items-center rounded-full bg-menu px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-menu/30"
                  : "inline-flex min-h-9 items-center rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200"
              }
            >
              {p.label}
            </Link>
          );
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="С даты">
          <Input defaultValue={filters.from || ""} name="from" type="date" />
        </Field>
        <Field label="По дату">
          <Input defaultValue={filters.to || ""} name="to" type="date" />
        </Field>
        <Field label="Заказчик">
          <Select defaultValue={filters.customerId || ""} name="customerId">
            <option value="">Все заказчики</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Наше юрлицо">
          <Select defaultValue={filters.organizationId || ""} name="organizationId">
            <option value="">Все организации</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Тип техники">
          <Select defaultValue={filters.typeId || ""} name="typeId">
            <option value="">Все типы</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Единица техники">
          <Select defaultValue={filters.equipmentId || ""} name="equipmentId">
            <option value="">Весь парк</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.plateNumber} · {u.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Водитель">
          <Select defaultValue={filters.driverId || ""} name="driverId">
            <option value="">Все водители</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Способ оплаты">
          <Select defaultValue={filters.paymentMethod || ""} name="paymentMethod">
            <option value="">Все</option>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Оплата счетов">
          <Select defaultValue={filters.payStatus || ""} name="payStatus">
            <option value="">Все счета</option>
            <option value="PAID">Только оплаченные</option>
            <option value="UNPAID">Только долг</option>
          </Select>
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="h-10 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover"
          type="submit"
        >
          Показать
        </button>
        <Link className="inline-flex h-10 items-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold" href="/reports">
          Сбросить
        </Link>
      </div>
    </form>
  );
}
