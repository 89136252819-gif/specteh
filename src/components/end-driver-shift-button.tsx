"use client";

import { useState, useTransition } from "react";
import { endDriverShift } from "@/actions/shifts";
import { CenterModal } from "@/components/center-modal";
import { Button } from "@/components/ui/button";

export function EndDriverShiftButton({ driverId }: { driverId: string }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState<string[]>([]);

  function run(force: boolean) {
    start(async () => {
      const result = await endDriverShift(driverId, force);
      if (result && "needsConfirm" in result && result.needsConfirm) {
        setLive(result.live.map((item) => item.number));
        setOpen(true);
        return;
      }
      setOpen(false);
      setLive([]);
    });
  }

  return (
    <>
      <button
        className="text-[11px] font-semibold text-slate-400 hover:text-rose-700 disabled:opacity-50"
        disabled={pending}
        onClick={() => run(false)}
        type="button"
      >
        {pending ? "Снимаем…" : "Снять с линии"}
      </button>
      <CenterModal
        className="max-w-md"
        labelledBy="staff-end-shift-title"
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        open={open}
        placement="center"
      >
        <div className="px-5 py-5">
          <h3 className="text-lg font-extrabold text-navy" id="staff-end-shift-title">
            Живые заявки у водителя
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Сейчас в работе: {live.join(", ") || "—"}. Снять с линии всё равно?
          </p>
          <div className="mt-5 flex gap-2">
            <Button disabled={pending} onClick={() => run(true)} type="button" variant="danger">
              {pending ? "Снимаем…" : "Снять всё равно"}
            </Button>
            <Button disabled={pending} onClick={() => setOpen(false)} type="button" variant="secondary">
              Отмена
            </Button>
          </div>
        </div>
      </CenterModal>
    </>
  );
}
