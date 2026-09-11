"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { FilterChip } from "@/components/directory-chrome";
import { InnFillField } from "@/components/inn-fill-field";
import { Field, Input, Select } from "@/components/ui/fields";
import { cn, money } from "@/lib/utils";

type CustomerOption = { id: string; name: string; phone: string; debt?: number };

export function OrderCustomerPicker({ customers }: { customers: CustomerOption[] }) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [type, setType] = useState("INDIVIDUAL");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [inn, setInn] = useState("");
  const [kpp, setKpp] = useState("");
  const [address, setAddress] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 40);
    return customers
      .filter((customer) => `${customer.name} ${customer.phone}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [customers, query]);

  const selected = customers.find((customer) => customer.id === selectedId);

  return (
    <div className="space-y-3 sm:col-span-2">
      <input name="customerMode" type="hidden" value={mode} />
      <input name="customerId" type="hidden" value={mode === "existing" ? selectedId : ""} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-stone-700">Заказчик</span>
        <FilterChip active={mode === "existing"} onClick={() => setMode("existing")}>
          Из базы
        </FilterChip>
        <FilterChip active={mode === "new"} onClick={() => setMode("new")}>
          Новый
        </FilterChip>
      </div>

      {mode === "existing" ? (
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full rounded-2xl border border-stone-200 bg-white py-0 pl-9 pr-3 text-sm outline-none ring-menu/20 placeholder:text-stone-400 focus:border-menu focus:ring-2"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по имени или телефону"
              value={query}
            />
          </div>
          {selected ? (
            <div className="rounded-2xl bg-menu-soft/70 px-3 py-2 text-sm font-semibold text-navy ring-1 ring-menu/20">
              Выбран: {selected.name}
              {selected.phone ? ` · ${selected.phone}` : ""}
              {selected.debt && selected.debt > 0.01 ? (
                <span className="mt-1 block text-xs font-bold text-amber-800">долг {money(selected.debt)}</span>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-amber-700">Выберите заказчика из списка ниже</p>
          )}
          <ul className="max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-white">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-slate-500">Никого не нашли</li>
            ) : (
              filtered.map((customer) => (
                <li key={customer.id}>
                  <button
                    className={cn(
                      "flex w-full flex-col items-start px-3 py-2.5 text-left text-sm transition hover:bg-menu-soft/50",
                      selectedId === customer.id ? "bg-menu-soft" : "",
                    )}
                    onClick={() => setSelectedId(customer.id)}
                    type="button"
                  >
                    <span className="font-semibold text-navy">{customer.name}</span>
                    <span className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      {customer.phone ? <span>{customer.phone}</span> : null}
                      {customer.debt && customer.debt > 0.01 ? (
                        <span className="font-bold text-amber-800">долг {money(customer.debt)}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          {!selectedId ? <input className="hidden" name="customerIdRequired" required /> : null}
        </div>
      ) : (
        <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/80 sm:grid-cols-2">
          <InnFillField
            className="sm:col-span-2"
            name="newCustomerInn"
            onChange={setInn}
            onFilled={(party) => {
              setType(party.type);
              setName(party.name);
              setInn(party.inn);
              setKpp(party.kpp || "");
              setAddress(party.address || "");
              setContact(party.contactName);
            }}
            value={inn}
          />
          <input name="newCustomerKpp" type="hidden" value={kpp} />
          <input name="newCustomerAddress" type="hidden" value={address} />
          <Field label="Тип">
            <Select name="newCustomerType" onChange={(e) => setType(e.target.value)} value={type}>
              <option value="COMPANY">Юрлицо / ИП</option>
              <option value="INDIVIDUAL">Физлицо</option>
            </Select>
          </Field>
          <Field label="Название / ФИО">
            <Input
              name="newCustomerName"
              onChange={(e) => setName(e.target.value)}
              placeholder="ООО «Строй» или Иван Петров"
              required={mode === "new"}
              value={name}
            />
          </Field>
          <Field label="Контактное лицо">
            <Input
              name="newCustomerContact"
              onChange={(e) => setContact(e.target.value)}
              placeholder="Как обращаться"
              required={mode === "new"}
              value={contact}
            />
          </Field>
          <Field label="Телефон">
            <Input inputMode="tel" name="newCustomerPhone" placeholder="+7 900 000-00-00" required={mode === "new"} type="tel" />
          </Field>
          {address ? <p className="text-xs text-slate-500 sm:col-span-2">Адрес из ЕГРЮЛ: {address}</p> : null}
          <p className="text-xs text-slate-500 sm:col-span-2">
            Заказчик сохранится в справочнике и сразу попадёт в эту заявку.
          </p>
        </div>
      )}
    </div>
  );
}
