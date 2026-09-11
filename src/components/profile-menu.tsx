"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { LogOut, X } from "lucide-react";
import { logoutAction, updateProfileAction } from "@/actions/auth";
import { CenterModal } from "@/components/center-modal";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui/fields";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { phonePretty } from "@/lib/utils";

function initials(name: string) {
  const letters = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return letters || "?";
}

export function ProfileMenu({
  user,
}: {
  user: { name: string; login: string; role: Role; phone: string | null };
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(updateProfileAction, null);

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-2 shadow-sm ring-1 ring-slate-200 transition hover:bg-menu-soft/60 sm:pr-3"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        type="button"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-menu text-xs font-bold text-white shadow-sm shadow-menu/40">
          {initials(user.name)}
        </div>
        <div className="hidden min-w-0 text-left sm:block">
          <div className="truncate text-sm font-semibold leading-tight text-navy">{user.name}</div>
          <div className="truncate text-[11px] leading-tight text-slate-400">{ROLE_LABELS[user.role]}</div>
        </div>
      </button>
      <CenterModal labelledBy="profile-title" onClose={() => setOpen(false)} open={open}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-menu text-sm font-bold text-white">
              {initials(user.name)}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-extrabold text-navy" id="profile-title">
                {user.name}
              </h3>
              <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <button
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-50 hover:text-navy"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-5">
          <dl className="grid gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Логин</dt>
              <dd className="font-semibold text-navy">{user.login}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Роль</dt>
              <dd className="font-semibold text-navy">{ROLE_LABELS[user.role]}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Телефон</dt>
              <dd className="font-semibold text-navy">{user.phone ? phonePretty(user.phone) : "не указан"}</dd>
            </div>
          </dl>

          <form action={action} className="space-y-3" key={`${user.name}|${user.phone || ""}`}>
            <h4 className="text-sm font-extrabold text-navy">Настройки</h4>
            <Field label="ФИО">
              <Input defaultValue={user.name} name="name" required />
            </Field>
            <Field label="Телефон">
              <Input defaultValue={user.phone || ""} name="phone" />
            </Field>
            <Field label="Текущий пароль">
              <Input autoComplete="current-password" name="currentPassword" type="password" />
            </Field>
            <Field label="Новый пароль">
              <Input autoComplete="new-password" name="newPassword" type="password" />
            </Field>
            {state?.error ? <p className="text-sm font-semibold text-red-600">{state.error}</p> : null}
            {state?.ok ? <p className="text-sm font-semibold text-emerald-700">Сохранено</p> : null}
            <SubmitButton className="w-full" variant="success">
              Сохранить
            </SubmitButton>
          </form>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <Link className="inline-flex min-h-9 items-center rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 hover:bg-menu-soft hover:text-menu-hover" href="/settings/users" onClick={() => setOpen(false)}>
              Сотрудники
            </Link>
            <Link className="inline-flex min-h-9 items-center rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 hover:bg-menu-soft hover:text-menu-hover" href="/settings/organizations" onClick={() => setOpen(false)}>
              Организации
            </Link>
            <Link className="inline-flex min-h-9 items-center rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 hover:bg-menu-soft hover:text-menu-hover" href="/settings/prices" onClick={() => setOpen(false)}>
              Прайс
            </Link>
            <Link className="inline-flex min-h-9 items-center rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 hover:bg-menu-soft hover:text-menu-hover" href="/settings/sms" onClick={() => setOpen(false)}>
              Уведомления
            </Link>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 px-4 py-4 sm:px-6">
          <form action={logoutAction}>
            <button
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-navy"
              type="submit"
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </button>
          </form>
        </div>
      </CenterModal>
    </>
  );
}
