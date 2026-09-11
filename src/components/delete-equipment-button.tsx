"use client";

import { useTransition } from "react";
import { deleteEquipment, deleteEquipmentType } from "@/actions/catalogs";
import { Button } from "@/components/ui/button";

export function DeleteEquipmentButton({
  id,
  label,
  variant = "link",
}: {
  id: string;
  label: string;
  variant?: "link" | "button";
}) {
  const [pending, start] = useTransition();
  function onDelete() {
    if (!confirm(`Удалить ${label}? Это нельзя отменить.`)) return;
    start(() => {
      void deleteEquipment(id);
    });
  }
  if (variant === "button") {
    return (
      <Button disabled={pending} onClick={onDelete} type="button" variant="danger">
        {pending ? "Удаление…" : "Удалить"}
      </Button>
    );
  }
  return (
    <button
      className="text-sm font-semibold text-stone-500 hover:text-stone-800 hover:underline disabled:opacity-50"
      disabled={pending}
      onClick={onDelete}
      type="button"
    >
      {pending ? "Удаление…" : "Удалить"}
    </button>
  );
}

export function DeleteEquipmentTypeButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="text-sm font-semibold text-stone-500 hover:text-stone-800 hover:underline disabled:opacity-50"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Удалить тип «${name}»?`)) return;
        start(() => {
          void deleteEquipmentType(id);
        });
      }}
      type="button"
    >
      {pending ? "…" : "Удалить"}
    </button>
  );
}
