"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { deletePrice, savePrice } from "@/actions/catalogs";
import { PriceForm, type PriceValues } from "@/components/forms/price-form";
import { RecordEditorModal } from "@/components/record-editor-modal";
import { CenterModal } from "@/components/center-modal";
import { FilterChip, SummaryStat } from "@/components/directory-chrome";
import { EquipmentTypeLabel } from "@/components/equipment-type-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { PRICE_KIND_LABELS } from "@/lib/constants";
import { money } from "@/lib/utils";

export type PriceRow = PriceValues & {
  typeName: string;
  customerName: string | null;
};

type Option = { id: string; name: string };
type Filter = "all" | "base" | "custom";
type Editor = "new" | string | null;

function matches(row: PriceRow, query: string) {
  const hay = `${row.typeName} ${row.label} ${row.customerName || "базовый"} ${PRICE_KIND_LABELS[row.kind] || ""}`.toLowerCase();
  return hay.includes(query);
}

export function PricesDirectory({
  prices,
  types,
  customers,
}: {
  prices: PriceRow[];
  types: Option[];
  customers: Option[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editor, setEditor] = useState<Editor>(null);
  const [removing, setRemoving] = useState<PriceRow | null>(null);
  const [pending, start] = useTransition();

  const editing = editor && editor !== "new" ? prices.find((row) => row.id === editor) : undefined;
  const custom = prices.filter((row) => row.customerId).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prices.filter((row) => {
      if (filter === "base" && row.customerId) return false;
      if (filter === "custom" && !row.customerId) return false;
      return q ? matches(row, q) : true;
    });
  }, [prices, filter, query]);

  async function save(formData: FormData) {
    await savePrice(formData);
    setEditor(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryStat hint="в прайсе" label="Позиций" value={prices.length} />
        <SummaryStat hint="для всех заказчиков" label="Базовые" tone="accent" value={prices.length - custom} />
        <SummaryStat hint="индивидуальные" label="Для заказчика" value={custom} />
      </div>

      <div className="panel">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-2xl border border-stone-200 bg-white py-0 pl-9 pr-3 text-sm outline-none ring-menu/20 placeholder:text-stone-400 focus:border-menu focus:ring-2"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти по типу, виду, заказчику"
              value={query}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              Все
            </FilterChip>
            <FilterChip active={filter === "base"} onClick={() => setFilter("base")}>
              Базовые
            </FilterChip>
            <FilterChip active={filter === "custom"} onClick={() => setFilter("custom")}>
              Для заказчика
            </FilterChip>
            <Button onClick={() => setEditor("new")} size="sm" type="button" variant="success">
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">
            {prices.length === 0 ? "Прайса пока нет — добавьте первую позицию." : "Ничего не нашли по этому запросу."}
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Тип</Th>
                <Th>Вид</Th>
                <Th>Наименование</Th>
                <Th>Заказчик</Th>
                <Th>Цена</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <Td>
                    <EquipmentTypeLabel className="text-sm" name={row.typeName} size="sm" />
                  </Td>
                  <Td>
                    <Badge className="bg-slate-100 text-slate-700">{PRICE_KIND_LABELS[row.kind] || row.kind}</Badge>
                  </Td>
                  <Td className="font-medium text-navy">{row.label}</Td>
                  <Td className={row.customerName ? "text-slate-700" : "text-slate-400"}>
                    {row.customerName || "базовый"}
                  </Td>
                  <Td className="font-semibold text-navy">{money(row.amount)}</Td>
                  <Td>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button onClick={() => setEditor(row.id)} size="sm" type="button" variant="secondary">
                        Изменить
                      </Button>
                      <button
                        className="h-8 px-2 text-sm font-semibold text-stone-500 hover:text-stone-800 hover:underline"
                        onClick={() => setRemoving(row)}
                        type="button"
                      >
                        Удалить
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <RecordEditorModal
        labelledBy="price-editor-title"
        onClose={() => setEditor(null)}
        open={editor !== null}
        subtitle={editing ? editing.label : "Ставка попадёт в счёт и акт"}
        title={editing ? "Изменить позицию" : "Новая позиция"}
      >
        <PriceForm
          action={save}
          customers={customers}
          key={editing?.id || "new"}
          onCancel={() => setEditor(null)}
          price={editing}
          types={types}
        />
      </RecordEditorModal>

      <CenterModal
        className="max-w-md"
        labelledBy="price-remove-title"
        onClose={() => setRemoving(null)}
        open={Boolean(removing)}
      >
        <div className="px-6 py-5">
          <h3 className="font-extrabold text-navy" id="price-remove-title">
            Удалить позицию?
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {removing ? `«${removing.label}» пропадёт из прайса. Уже выставленные счета не изменятся.` : null}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() => {
                if (!removing) return;
                start(async () => {
                  await deletePrice(removing.id);
                  setRemoving(null);
                  router.refresh();
                });
              }}
              type="button"
              variant="danger"
            >
              {pending ? "Удаление…" : "Удалить"}
            </Button>
            <Button disabled={pending} onClick={() => setRemoving(null)} type="button" variant="secondary">
              Отмена
            </Button>
          </div>
        </div>
      </CenterModal>
    </div>
  );
}
