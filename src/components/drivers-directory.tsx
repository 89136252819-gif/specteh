"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { deleteDriver, saveDriver } from "@/actions/catalogs";
import { DriverForm } from "@/components/forms/driver-form";
import { PersonAvatar } from "@/components/person-avatar";
import { RecordEditorModal } from "@/components/record-editor-modal";
import { CenterModal } from "@/components/center-modal";
import { EmptyState } from "@/components/empty-state";
import { FilterChip, SummaryStat } from "@/components/directory-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { phoneHref, phonePretty } from "@/lib/utils";

export type DriverRecord = {
  id: string;
  name: string;
  login: string;
  phone: string;
  licenseNumber: string | null;
  defaultEquipmentId: string | null;
  equipmentLabel: string | null;
  onShiftSince: string | null;
  activeOrders: number;
  maxLinked: boolean;
};

type EquipmentOption = { id: string; name: string; plateNumber: string };
type Filter = "all" | "shift" | "orders";
type Editor = "new" | string | null;

function matches(driver: DriverRecord, query: string) {
  const hay = `${driver.name} ${driver.login} ${driver.phone} ${driver.equipmentLabel || ""}`.toLowerCase();
  return hay.includes(query);
}

export function DriversDirectory({
  drivers,
  units,
  initialId,
  loginError,
}: {
  drivers: DriverRecord[];
  units: EquipmentOption[];
  initialId?: string;
  loginError?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editor, setEditor] = useState<Editor>(() => initialId || (loginError ? "new" : null));
  const [removing, setRemoving] = useState<DriverRecord | null>(null);
  const [pending, start] = useTransition();

  const editing = editor && editor !== "new" ? drivers.find((driver) => driver.id === editor) : undefined;
  const onShift = drivers.filter((driver) => driver.onShiftSince).length;
  const openOrders = drivers.reduce((sum, driver) => sum + driver.activeOrders, 0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drivers.filter((driver) => {
      if (filter === "shift" && !driver.onShiftSince) return false;
      if (filter === "orders" && driver.activeOrders === 0) return false;
      return q ? matches(driver, q) : true;
    });
  }, [drivers, filter, query]);

  function closeEditor() {
    setEditor(null);
    router.replace("/drivers", { scroll: false });
  }

  function openEditor(next: Editor) {
    setEditor(next);
    const href = next && next !== "new" ? `/drivers?id=${next}` : "/drivers";
    router.replace(href, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryStat hint="в справочнике" label="Водители" value={drivers.length} />
        <SummaryStat hint="начали смену" label="На линии" tone="accent" value={onShift} />
        <SummaryStat hint="не закрыты" label="Заявок в работе" value={openOrders} />
      </div>

      <div className="panel">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-2xl border border-stone-200 bg-white py-0 pl-9 pr-3 text-sm outline-none ring-menu/20 placeholder:text-stone-400 focus:border-menu focus:ring-2"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти по ФИО, логину, телефону"
              value={query}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              Все
            </FilterChip>
            <FilterChip active={filter === "shift"} onClick={() => setFilter("shift")}>
              На линии
            </FilterChip>
            <FilterChip active={filter === "orders"} onClick={() => setFilter("orders")}>
              С заявками
            </FilterChip>
            <Button onClick={() => openEditor("new")} size="sm" type="button" variant="success">
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            actionLabel={drivers.length === 0 ? "Добавить водителя" : undefined}
            className="mx-4 my-8"
            description={
              drivers.length === 0
                ? "Добавьте первого водителя — ему откроется кабинет на телефоне"
                : "Никого не нашли по этому запросу или фильтру"
            }
            onAction={drivers.length === 0 ? () => openEditor("new") : undefined}
            title={drivers.length === 0 ? "Водителей пока нет" : "Список пуст"}
          />
        ) : (
          <>
            <div className="space-y-2 p-3 md:hidden">
              {visible.map((driver) => {
                const tel = phoneHref(driver.phone);
                return (
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm" key={driver.id}>
                    <button className="flex w-full items-start gap-3 text-left" onClick={() => openEditor(driver.id)} type="button">
                      <PersonAvatar name={driver.name} />
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-navy">{driver.name}</div>
                        <div className="text-xs text-slate-400">
                          {driver.login}
                          {driver.maxLinked ? " · MAX" : " · MAX не привязан"}
                        </div>
                        {tel ? (
                          <a
                            className="mt-1 inline-block text-sm font-semibold text-menu-hover"
                            href={tel}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {phonePretty(driver.phone)}
                          </a>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>{driver.equipmentLabel || "без техники"}</span>
                          <span>{driver.onShiftSince ? `на линии с ${driver.onShiftSince}` : "не на смене"}</span>
                          <span>заявок: {driver.activeOrders}</span>
                        </div>
                      </div>
                    </button>
                    <div className="mt-3 flex gap-2">
                      <Button className="flex-1" onClick={() => openEditor(driver.id)} size="sm" type="button" variant="secondary">
                        Изменить
                      </Button>
                      <button
                        className="h-8 px-3 text-sm font-semibold text-stone-500"
                        onClick={() => setRemoving(driver)}
                        type="button"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block">
          <Table>
            <thead>
              <tr>
                <Th>Водитель</Th>
                <Th>Телефон</Th>
                <Th>Техника</Th>
                <Th>Смена</Th>
                <Th>Заявки</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((driver) => {
                const tel = phoneHref(driver.phone);
                return (
                  <tr className={driver.id === editing?.id ? "bg-menu-soft/40" : undefined} key={driver.id}>
                    <Td>
                      <button
                        className="flex min-w-0 items-center gap-3 text-left"
                        onClick={() => openEditor(driver.id)}
                        type="button"
                      >
                        <PersonAvatar name={driver.name} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-navy">{driver.name}</span>
                          <span className="block truncate text-xs text-slate-400">
                            {driver.login}
                            {driver.maxLinked ? " · MAX" : " · MAX не привязан"}
                          </span>
                        </span>
                      </button>
                    </Td>
                    <Td>
                      {tel ? (
                        <a className="font-medium text-navy hover:text-menu-hover hover:underline" href={tel}>
                          {phonePretty(driver.phone)}
                        </a>
                      ) : (
                        driver.phone || "—"
                      )}
                    </Td>
                    <Td className="text-slate-600">{driver.equipmentLabel || "—"}</Td>
                    <Td>
                      {driver.onShiftSince ? (
                        <Link className="inline-flex flex-col" href="/drivers/timesheet">
                          <Badge className="bg-emerald-100 text-emerald-800">
                            <span className="pulse-live mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            На линии
                          </Badge>
                          <span className="mt-1 text-xs text-slate-400">с {driver.onShiftSince}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400">Не на смене</span>
                      )}
                    </Td>
                    <Td>
                      {driver.activeOrders ? (
                        <span className="font-semibold text-navy">{driver.activeOrders}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button onClick={() => openEditor(driver.id)} size="sm" type="button" variant="secondary">
                          Изменить
                        </Button>
                        <button
                          className="h-8 px-2 text-sm font-semibold text-stone-500 hover:text-stone-800 hover:underline"
                          onClick={() => setRemoving(driver)}
                          type="button"
                        >
                          Удалить
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
            </div>
          </>
        )}
      </div>

      <RecordEditorModal
        error={loginError ? "Такой логин уже занят." : undefined}
        labelledBy="driver-editor-title"
        onClose={closeEditor}
        open={editor !== null}
        subtitle={
          editing ? `${editing.name} · ${editing.login}` : "Учётная запись для входа в приложение водителя"
        }
        title={editing ? "Изменить водителя" : "Новый водитель"}
      >
        <DriverForm
          action={saveDriver}
          driver={
            editing
              ? {
                  id: editing.id,
                  name: editing.name,
                  login: editing.login,
                  phone: editing.phone,
                  licenseNumber: editing.licenseNumber,
                  defaultEquipmentId: editing.defaultEquipmentId,
                }
              : undefined
          }
          key={editing?.id || "new"}
          onCancel={closeEditor}
          units={units}
        />
      </RecordEditorModal>

      <CenterModal
        className="max-w-md"
        labelledBy="driver-remove-title"
        onClose={() => setRemoving(null)}
        open={Boolean(removing)}
      >
        <div className="px-6 py-5">
          <h3 className="font-extrabold text-navy" id="driver-remove-title">
            Удалить водителя?
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {removing
              ? `Учётная запись «${removing.name}» и смены будут удалены. Заявки останутся без водителя.`
              : null}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() => {
                if (!removing) return;
                start(() => {
                  void deleteDriver(removing.id);
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
