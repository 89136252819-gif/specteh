"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { deleteEquipment, saveEquipment } from "@/actions/catalogs";
import { EquipmentForm } from "@/components/forms/equipment-form";
import { RecordEditorModal } from "@/components/record-editor-modal";
import { CenterModal } from "@/components/center-modal";
import { FilterChip, SummaryStat } from "@/components/directory-chrome";
import { EquipmentTypeLabel } from "@/components/equipment-type-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { EQUIPMENT_STATUS_LABELS } from "@/lib/constants";

export type FleetUnit = {
  id: string;
  name: string;
  plateNumber: string;
  status: string;
  notes: string | null;
  typeId: string;
  typeName: string;
};

type TypeOption = { id: string; name: string };
type Filter = "all" | "AVAILABLE" | "BUSY" | "REPAIR";
type Editor = "new" | string | null;

const STATUS_TONE: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  BUSY: "bg-amber-100 text-amber-800",
  REPAIR: "bg-slate-200 text-slate-700",
};

const ERROR_TEXT: Record<string, string> = {
  plate: "Такой госномер уже есть в парке.",
  orders: "Эту технику нельзя удалить: по ней уже есть заявки.",
};

function matches(unit: FleetUnit, query: string) {
  const hay = `${unit.plateNumber} ${unit.name} ${unit.typeName} ${unit.notes || ""}`.toLowerCase();
  return hay.includes(query);
}

export function FleetDirectory({
  units,
  types,
  initialId,
  error,
}: {
  units: FleetUnit[];
  types: TypeOption[];
  initialId?: string;
  error?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editor, setEditor] = useState<Editor>(() => initialId || (error === "plate" ? "new" : null));
  const [removing, setRemoving] = useState<FleetUnit | null>(null);
  const [pending, start] = useTransition();

  const editing = editor && editor !== "new" ? units.find((unit) => unit.id === editor) : undefined;
  const free = units.filter((unit) => unit.status === "AVAILABLE").length;
  const busy = units.filter((unit) => unit.status === "BUSY").length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return units.filter((unit) => {
      if (filter !== "all" && unit.status !== filter) return false;
      return q ? matches(unit, q) : true;
    });
  }, [units, filter, query]);

  function closeEditor() {
    setEditor(null);
    router.replace("/fleet", { scroll: false });
  }

  function openEditor(next: Editor) {
    setEditor(next);
    const href = next && next !== "new" ? `/fleet?id=${next}` : "/fleet";
    router.replace(href, { scroll: false });
  }

  const editorError = error === "plate" ? ERROR_TEXT.plate : undefined;

  return (
    <div className="space-y-4">
      {error === "orders" ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200">
          {ERROR_TEXT.orders} Можно изменить данные или поставить статус «Ремонт».
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryStat hint="в парке" label="Единиц" value={units.length} />
        <SummaryStat hint="можно назначить" label="Свободна" tone="accent" value={free} />
        <SummaryStat hint="на заявках" label="Занята" value={busy} />
      </div>

      <div className="panel">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-2xl border border-stone-200 bg-white py-0 pl-9 pr-3 text-sm outline-none ring-menu/20 placeholder:text-stone-400 focus:border-menu focus:ring-2"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти по номеру, модели, типу"
              value={query}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              Все
            </FilterChip>
            <FilterChip active={filter === "AVAILABLE"} onClick={() => setFilter("AVAILABLE")}>
              Свободна
            </FilterChip>
            <FilterChip active={filter === "BUSY"} onClick={() => setFilter("BUSY")}>
              Занята
            </FilterChip>
            <FilterChip active={filter === "REPAIR"} onClick={() => setFilter("REPAIR")}>
              Ремонт
            </FilterChip>
            <Button onClick={() => openEditor("new")} size="sm" type="button" variant="success">
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">
            {units.length === 0 ? "В парке пока нет единиц — добавьте первую." : "Ничего не нашли по этому запросу."}
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Госномер</Th>
                <Th>Модель</Th>
                <Th>Тип</Th>
                <Th>Статус</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((unit) => (
                <tr className={unit.id === editing?.id ? "bg-menu-soft/40" : undefined} key={unit.id}>
                  <Td>
                    <button
                      className="text-left font-semibold text-navy hover:text-menu-hover hover:underline"
                      onClick={() => openEditor(unit.id)}
                      type="button"
                    >
                      {unit.plateNumber}
                    </button>
                  </Td>
                  <Td className="text-slate-700">{unit.name}</Td>
                  <Td>
                    <EquipmentTypeLabel className="text-sm" name={unit.typeName} size="sm" />
                  </Td>
                  <Td>
                    <Badge className={STATUS_TONE[unit.status] || "bg-slate-100 text-slate-700"}>
                      {EQUIPMENT_STATUS_LABELS[unit.status as keyof typeof EQUIPMENT_STATUS_LABELS] || unit.status}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button onClick={() => openEditor(unit.id)} size="sm" type="button" variant="secondary">
                        Изменить
                      </Button>
                      <button
                        className="h-8 px-2 text-sm font-semibold text-stone-500 hover:text-stone-800 hover:underline"
                        onClick={() => setRemoving(unit)}
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
        error={editorError}
        labelledBy="fleet-editor-title"
        onClose={closeEditor}
        open={editor !== null}
        subtitle={
          editing
            ? `${editing.plateNumber} · ${editing.name}`
            : "Госномер, модель и статус для диспетчерской"
        }
        title={editing ? "Изменить единицу" : "Новая единица"}
      >
        <EquipmentForm
          action={saveEquipment}
          equipment={
            editing
              ? {
                  id: editing.id,
                  typeId: editing.typeId,
                  name: editing.name,
                  plateNumber: editing.plateNumber,
                  status: editing.status,
                  notes: editing.notes,
                }
              : undefined
          }
          key={editing?.id || "new"}
          onCancel={closeEditor}
          types={types}
        />
      </RecordEditorModal>

      <CenterModal
        className="max-w-md"
        labelledBy="fleet-remove-title"
        onClose={() => setRemoving(null)}
        open={Boolean(removing)}
      >
        <div className="px-6 py-5">
          <h3 className="font-extrabold text-navy" id="fleet-remove-title">
            Удалить единицу?
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {removing
              ? `«${removing.plateNumber} · ${removing.name}» исчезнет из парка. Если по ней уже есть заявки, удаление не пройдёт.`
              : null}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() => {
                if (!removing) return;
                start(() => {
                  void deleteEquipment(removing.id);
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
