import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { SubmitButton } from "@/components/submit-button";

type EquipmentOption = { id: string; name: string; plateNumber: string };

type DriverValues = {
  id: string;
  name: string;
  login: string;
  phone: string | null;
  licenseNumber: string | null;
  defaultEquipmentId: string | null;
};

export function DriverForm({
  action,
  units,
  driver,
  onCancel,
}: {
  action: (formData: FormData) => Promise<void>;
  units: EquipmentOption[];
  driver?: DriverValues;
  onCancel?: () => void;
}) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {driver ? <input name="id" type="hidden" value={driver.id} /> : null}
      <Field className="sm:col-span-2" label="ФИО">
        <Input name="name" required defaultValue={driver?.name} />
      </Field>
      <Field label="Логин">
        <Input autoComplete="off" name="login" required defaultValue={driver?.login} />
      </Field>
      <Field label={driver ? "Новый пароль" : "Пароль"}>
        <Input
          autoComplete="new-password"
          name="password"
          placeholder={driver ? "Оставьте пустым, если не менять" : undefined}
          required={!driver}
          type="password"
        />
      </Field>
      <Field label="Телефон (SMS)">
        <Input name="phone" required defaultValue={driver?.phone || ""} />
      </Field>
      <Field label="ВУ">
        <Input name="licenseNumber" defaultValue={driver?.licenseNumber || ""} />
      </Field>
      <Field className="sm:col-span-2" label="Техника по умолчанию">
        <Select name="defaultEquipmentId" defaultValue={driver?.defaultEquipmentId || ""}>
          <option value="">Не закреплять</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.plateNumber} · {unit.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <SubmitButton>{driver ? "Сохранить" : "Добавить"}</SubmitButton>
        {onCancel ? (
          <Button onClick={onCancel} type="button" variant="secondary">
            Отмена
          </Button>
        ) : null}
      </div>
    </form>
  );
}
