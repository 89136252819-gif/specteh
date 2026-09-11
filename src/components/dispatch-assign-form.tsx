"use client";

import { useRef, useState, useTransition } from "react";
import { assignOrder, checkAssignConflicts, type AssignConflict } from "@/actions/orders";
import { CenterModal } from "@/components/center-modal";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";

export type DispatchUnitOption = {
  id: string;
  typeId: string;
  label: string;
  status: string;
};

export type DispatchDriverOption = {
  id: string;
  name: string;
  onShift: boolean;
};

function conflictText(item: AssignConflict) {
  const kind =
    item.kind === "both" ? "техника и водитель" : item.kind === "equipment" ? "техника" : "водитель";
  return `${item.number} · ${item.when} · ${kind}${item.label ? ` (${item.label})` : ""}`;
}

export function DispatchAssignForm({
  orderId,
  equipmentTypeId,
  equipmentId,
  driverId,
  units,
  drivers,
}: {
  orderId: string;
  equipmentTypeId: string;
  equipmentId: string | null;
  driverId: string | null;
  units: DispatchUnitOption[];
  drivers: DispatchDriverOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [conflicts, setConflicts] = useState<AssignConflict[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const typeUnits = units.filter((unit) => unit.typeId === equipmentTypeId && unit.status !== "REPAIR");
  const pool = typeUnits.length ? typeUnits : units.filter((unit) => unit.status !== "REPAIR");

  function submitNow(form: HTMLFormElement) {
    const fd = new FormData(form);
    start(async () => {
      await assignOrder(fd);
      setConfirmOpen(false);
      setConflicts([]);
    });
  }

  return (
    <>
      <form
        ref={formRef}
        className="mt-2 space-y-1.5"
        data-dispatch-assign-open="1"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const fd = new FormData(form);
          start(async () => {
            const found = await checkAssignConflicts(fd);
            if (found.length) {
              setConflicts(found);
              setConfirmOpen(true);
              return;
            }
            await assignOrder(fd);
          });
        }}
      >
        <input name="orderId" type="hidden" value={orderId} />
        <select
          className="h-8 w-full rounded-xl border border-stone-200 bg-white px-2 text-xs"
          defaultValue={equipmentId || ""}
          name="equipmentId"
          required
        >
          <option disabled value="">
            Техника
          </option>
          {pool.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.label}
              {unit.status === "BUSY" ? " · занята" : ""}
            </option>
          ))}
        </select>
        <select
          className="h-8 w-full rounded-xl border border-stone-200 bg-white px-2 text-xs"
          defaultValue={driverId || ""}
          name="driverId"
          required
        >
          <option disabled value="">
            Водитель
          </option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name}
              {driver.onShift ? " · на линии" : ""}
            </option>
          ))}
        </select>
        <SubmitButton className="w-full" size="sm">
          Назначить
        </SubmitButton>
      </form>

      <CenterModal
        className="max-w-md"
        labelledBy="assign-overlap-title"
        onClose={() => {
          if (!pending) setConfirmOpen(false);
        }}
        open={confirmOpen}
        placement="center"
      >
        <div className="px-5 py-5 sm:px-6">
          <h3 className="text-lg font-extrabold text-navy" id="assign-overlap-title">
            Пересечение по времени
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            В этот день уже есть живые заявки на выбранную технику или водителя. Назначить всё равно?
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-amber-950">
            {conflicts.map((item) => (
              <li className="rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200" key={`${item.number}-${item.kind}`}>
                {conflictText(item)}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
              className="h-11 w-full sm:flex-1"
              disabled={pending}
              onClick={() => {
                if (formRef.current) submitNow(formRef.current);
              }}
              type="button"
            >
              {pending ? "Назначаем…" : "Назначить всё равно"}
            </Button>
            <Button
              className="h-11 w-full sm:flex-1"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
              type="button"
              variant="secondary"
            >
              Отмена
            </Button>
          </div>
        </div>
      </CenterModal>
    </>
  );
}
