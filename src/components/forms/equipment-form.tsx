import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/submit-button";
import { EQUIPMENT_STATUS_LABELS } from "@/lib/constants";

type EquipmentTypeOption = { id: string; name: string };

type EquipmentValues = {
  id: string;
  typeId: string;
  name: string;
  plateNumber: string;
  status: string;
  notes: string | null;
};

export function EquipmentForm({
  action,
  types,
  equipment,
  onCancel,
}: {
  action: (formData: FormData) => Promise<void>;
  types: EquipmentTypeOption[];
  equipment?: EquipmentValues;
  onCancel?: () => void;
}) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {equipment ? <input name="id" type="hidden" value={equipment.id} /> : null}
      <Field className="sm:col-span-2" label="Тип">
        <Select name="typeId" required defaultValue={equipment?.typeId || types[0]?.id}>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Модель">
        <Input name="name" required defaultValue={equipment?.name} />
      </Field>
      <Field label="Госномер">
        <Input name="plateNumber" required defaultValue={equipment?.plateNumber} />
      </Field>
      <Field label="Статус">
        <Select name="status" defaultValue={equipment?.status || "AVAILABLE"}>
          {Object.entries(EQUIPMENT_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field className="sm:col-span-2" label="Заметки">
        <Textarea name="notes" defaultValue={equipment?.notes || ""} />
      </Field>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <SubmitButton>{equipment ? "Сохранить" : "Добавить"}</SubmitButton>
        {onCancel ? (
          <Button onClick={onCancel} type="button" variant="secondary">
            Отмена
          </Button>
        ) : null}
      </div>
    </form>
  );
}
