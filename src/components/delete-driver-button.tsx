"use client";

import { useTransition } from "react";
import { deleteDriver } from "@/actions/catalogs";

export function DeleteDriverButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="text-sm font-semibold text-stone-500 hover:text-stone-800 hover:underline disabled:opacity-50"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Удалить водителя ${name}? Учётная запись и смены будут удалены. Заявки останутся без водителя.`)) {
          return;
        }
        start(() => {
          void deleteDriver(id);
        });
      }}
      type="button"
    >
      {pending ? "Удаление…" : "Удалить"}
    </button>
  );
}
