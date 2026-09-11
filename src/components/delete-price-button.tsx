"use client";

import { useTransition } from "react";
import { deletePrice } from "@/actions/catalogs";

export function DeletePriceButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="text-sm text-stone-500 hover:text-stone-800 hover:underline disabled:opacity-50"
      disabled={pending}
      onClick={() => start(() => { void deletePrice(id); })}
      type="button"
    >
      Удалить
    </button>
  );
}
