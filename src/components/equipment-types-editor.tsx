"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { deleteEquipmentType, saveEquipmentType } from "@/actions/catalogs";
import { CenterModal } from "@/components/center-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { SubmitButton } from "@/components/submit-button";
import { EquipmentTypeIcon } from "@/components/equipment-type-icon";

type TypeRow = { id: string; name: string; units: number };

export function EquipmentTypesEditor({ types }: { types: TypeRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<TypeRow | null>(null);
  const [addKey, setAddKey] = useState(0);
  const [pending, start] = useTransition();

  function close() {
    setOpen(false);
    setError("");
    setConfirming(null);
  }

  async function save(formData: FormData) {
    const result = await saveEquipmentType(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setError("");
    if (!formData.get("id")) setAddKey((key) => key + 1);
    router.refresh();
  }

  function askRemove(type: TypeRow) {
    if (type.units > 0) {
      setConfirming(null);
      setError(`«${type.name}» нельзя удалить: в парке ${type.units} ед.`);
      return;
    }
    setError("");
    setConfirming(type);
  }

  function confirmRemove() {
    if (!confirming) return;
    const type = confirming;
    start(async () => {
      const result = await deleteEquipmentType(type.id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setConfirming(null);
      setError("");
      router.refresh();
    });
  }

  return (
    <>
      <Button className="w-full sm:w-auto" onClick={() => setOpen(true)} type="button" variant="secondary">
        Редактировать
      </Button>
      <CenterModal labelledBy="types-edit-title" onClose={close} open={open}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="font-extrabold text-navy" id="types-edit-title">
              Типы техники
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Добавить, переименовать или удалить тип. Удаление доступно, если единиц нет.
            </p>
          </div>
          <button
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-50 hover:text-navy"
            onClick={close}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[min(28rem,70vh)] space-y-3 overflow-y-auto px-6 py-5">
          {error ? <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">{error}</p> : null}
          {confirming ? (
            <div className="rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
              <p className="text-sm font-medium text-navy">
                Удалить тип «{confirming.name}»? Это нельзя отменить.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button disabled={pending} onClick={confirmRemove} size="sm" type="button" variant="danger">
                  {pending ? "Удаление…" : "Удалить"}
                </Button>
                <Button disabled={pending} onClick={() => setConfirming(null)} size="sm" type="button" variant="secondary">
                  Отмена
                </Button>
              </div>
            </div>
          ) : null}
          {types.map((type) => (
            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100" key={type.id}>
              <form action={save} className="flex items-center gap-2">
                <EquipmentTypeIcon name={type.name} size="sm" />
                <input name="id" type="hidden" value={type.id} />
                <Input className="min-w-0 flex-1" name="name" required defaultValue={type.name} />
                <SubmitButton className="shrink-0" size="sm" variant="secondary">
                  Сохранить
                </SubmitButton>
              </form>
              <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
                <span className="text-xs text-slate-400">{type.units} ед. в парке</span>
                <button
                  className="text-sm font-semibold text-stone-500 hover:text-stone-800 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={pending || type.units > 0}
                  onClick={() => askRemove(type)}
                  type="button"
                >
                  {type.units > 0 ? "Нельзя удалить" : "Удалить"}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3 border-t border-slate-100 px-6 py-4">
          <form action={save} className="flex gap-2" key={addKey}>
            <Input name="name" placeholder="Новый тип, например Бульдозер" required />
            <SubmitButton className="shrink-0">Добавить</SubmitButton>
          </form>
          <Button className="w-full sm:w-auto" onClick={close} type="button" variant="secondary">
            Готово
          </Button>
        </div>
      </CenterModal>
    </>
  );
}
