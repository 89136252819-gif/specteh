"use client";

import { useRef, useState, useTransition } from "react";
import { assignOrder, checkAssignConflicts, type AssignConflict } from "@/actions/orders";
import { CenterModal } from "@/components/center-modal";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/fields";

type Unit = { id: string; name: string; plateNumber: string; status: string };
type Driver = {
  id: string;
  user: { name: string };
  defaultEquipment: { plateNumber: string } | null;
};

function conflictText(item: AssignConflict) {
  const kind =
    item.kind === "both" ? "техника и водитель" : item.kind === "equipment" ? "техника" : "водитель";
  return `${item.number} · ${item.when} · ${kind}${item.label ? ` (${item.label})` : ""}`;
}

export function OrderAssignForm({
  orderId,
  equipmentId,
  driverId,
  units,
  drivers,
}: {
  orderId: string;
  equipmentId: string | null;
  driverId: string | null;
  units: Unit[];
  drivers: Driver[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [conflicts, setConflicts] = useState<AssignConflict[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
        className="space-y-3"
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
        <Field label="Единица техники">
          <Select defaultValue={equipmentId || ""} name="equipmentId" required>
            <option disabled value="">
              Выберите
            </option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.plateNumber} (
                {u.status === "REPAIR" ? "ремонт" : u.status === "BUSY" ? "занята" : "свободна"})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Водитель">
          <Select defaultValue={driverId || ""} name="driverId" required>
            <option disabled value="">
              Выберите
            </option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.user.name}
                {d.defaultEquipment ? ` · ${d.defaultEquipment.plateNumber}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <SubmitButton>Назначить и уведомить</SubmitButton>
      </form>

      <CenterModal
        className="max-w-md"
        labelledBy="order-assign-overlap-title"
        onClose={() => {
          if (!pending) setConfirmOpen(false);
        }}
        open={confirmOpen}
        placement="center"
      >
        <div className="px-5 py-5 sm:px-6">
          <h3 className="text-lg font-extrabold text-navy" id="order-assign-overlap-title">
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
