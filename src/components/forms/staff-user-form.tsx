import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { SubmitButton } from "@/components/submit-button";
import { ROLE_LABELS, STAFF_ROLES } from "@/lib/constants";

type StaffValues = {
  id: string;
  name: string;
  login: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lockedActive?: boolean;
};

export function StaffUserForm({
  action,
  user,
  onCancel,
}: {
  action: (formData: FormData) => Promise<void>;
  user?: StaffValues;
  onCancel?: () => void;
}) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {user ? <input name="id" type="hidden" value={user.id} /> : null}
      <Field className="sm:col-span-2" label="ФИО">
        <Input name="name" required defaultValue={user?.name} />
      </Field>
      <Field label="Логин">
        <Input autoComplete="off" name="login" required defaultValue={user?.login} />
      </Field>
      <Field label={user ? "Новый пароль" : "Пароль"}>
        <Input
          autoComplete="new-password"
          name="password"
          placeholder={user ? "Оставьте пустым, если не менять" : undefined}
          required={!user}
          type="password"
        />
      </Field>
      <Field label="Роль">
        <Select name="role" defaultValue={user?.role || "MANAGER"}>
          {STAFF_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Телефон">
        <Input name="phone" defaultValue={user?.phone || ""} />
      </Field>
      {user ? (
        <Field className="sm:col-span-2" label="Статус">
          <label className="group flex h-10 items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-3">
            <span className="text-sm font-medium text-stone-700">
              {user.lockedActive ? "Свою учётную запись нельзя отключить" : "Может входить в диспетчерскую"}
            </span>
            <input name="isActive" type="hidden" value="off" />
            <input
              className="sr-only"
              defaultChecked={user.isActive}
              disabled={user.lockedActive}
              name="isActive"
              type="checkbox"
              value="on"
            />
            <span className="relative h-5 w-9 shrink-0 rounded-full bg-slate-200 transition group-has-[:checked]:bg-menu group-has-[:disabled]:opacity-50">
              <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition group-has-[:checked]:translate-x-4" />
            </span>
          </label>
        </Field>
      ) : null}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <SubmitButton>{user ? "Сохранить" : "Добавить"}</SubmitButton>
        {onCancel ? (
          <Button onClick={onCancel} type="button" variant="secondary">
            Отмена
          </Button>
        ) : null}
      </div>
    </form>
  );
}
