"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { deleteStaffUser, saveStaffUser } from "@/actions/catalogs";
import { StaffUserForm } from "@/components/forms/staff-user-form";
import { PersonAvatar } from "@/components/person-avatar";
import { RecordEditorModal } from "@/components/record-editor-modal";
import { CenterModal } from "@/components/center-modal";
import { FilterChip, SummaryStat } from "@/components/directory-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { phoneHref, phonePretty } from "@/lib/utils";

export type StaffRecord = {
  id: string;
  name: string;
  login: string;
  phone: string | null;
  role: string;
  isActive: boolean;
};

type Filter = "all" | "active" | "off";
type Editor = "new" | string | null;

const ROLE_TONE: Partial<Record<Role, string>> = {
  ADMIN: "bg-menu-soft text-menu-hover",
  MANAGER: "bg-slate-200 text-navy",
  ACCOUNTANT: "bg-amber-100 text-amber-900",
};

function matches(user: StaffRecord, query: string) {
  const hay = `${user.name} ${user.login} ${user.phone || ""} ${ROLE_LABELS[user.role as Role] || ""}`.toLowerCase();
  return hay.includes(query);
}

const REMOVE_ERRORS = {
  self: "Свою учётную запись удалить нельзя.",
  last: "Нельзя удалить последнего сотрудника — иначе в кабинет никто не войдёт.",
} as const;

export function StaffDirectory({
  users,
  currentUserId,
  initialId,
  loginError,
  removeError,
}: {
  users: StaffRecord[];
  currentUserId: string;
  initialId?: string;
  loginError?: boolean;
  removeError?: keyof typeof REMOVE_ERRORS;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editor, setEditor] = useState<Editor>(() => initialId || (loginError ? "new" : null));
  const [removing, setRemoving] = useState<StaffRecord | null>(null);
  const [pending, start] = useTransition();

  const editing = editor && editor !== "new" ? users.find((user) => user.id === editor) : undefined;
  const activeCount = users.filter((user) => user.isActive).length;
  const canRemoveOthers = users.length > 1;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((user) => {
      if (filter === "active" && !user.isActive) return false;
      if (filter === "off" && user.isActive) return false;
      return q ? matches(user, q) : true;
    });
  }, [users, filter, query]);

  function closeEditor() {
    setEditor(null);
    router.replace("/settings/users", { scroll: false });
  }

  function openEditor(next: Editor) {
    setEditor(next);
    const href = next && next !== "new" ? `/settings/users?id=${next}` : "/settings/users";
    router.replace(href, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryStat hint="учётных записей" label="Сотрудники" value={users.length} />
        <SummaryStat hint="могут войти" label="Активны" tone="accent" value={activeCount} />
        <SummaryStat hint="вход закрыт" label="Отключены" value={users.length - activeCount} />
      </div>

      <div className="panel">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-2xl border border-stone-200 bg-white py-0 pl-9 pr-3 text-sm outline-none ring-menu/20 placeholder:text-stone-400 focus:border-menu focus:ring-2"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти по ФИО, логину, роли"
              value={query}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              Все
            </FilterChip>
            <FilterChip active={filter === "active"} onClick={() => setFilter("active")}>
              Активны
            </FilterChip>
            <FilterChip active={filter === "off"} onClick={() => setFilter("off")}>
              Отключены
            </FilterChip>
            <Button onClick={() => openEditor("new")} size="sm" type="button" variant="success">
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">
            {users.length === 0 ? "Сотрудников пока нет — добавьте первого." : "Никого не нашли по этому запросу."}
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Сотрудник</Th>
                <Th>Роль</Th>
                <Th>Телефон</Th>
                <Th>Статус</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => {
                const tel = user.phone ? phoneHref(user.phone) : null;
                return (
                  <tr
                    className={`${user.id === editing?.id ? "bg-menu-soft/40" : ""} ${user.isActive ? "" : "opacity-60"}`}
                    key={user.id}
                  >
                    <Td>
                      <button
                        className="flex min-w-0 items-center gap-3 text-left"
                        onClick={() => openEditor(user.id)}
                        type="button"
                      >
                        <PersonAvatar name={user.name} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-navy">{user.name}</span>
                          <span className="block truncate text-xs text-slate-400">{user.login}</span>
                        </span>
                      </button>
                    </Td>
                    <Td>
                      <Badge className={ROLE_TONE[user.role as Role] || "bg-slate-100 text-slate-700"}>
                        {ROLE_LABELS[user.role as Role] || user.role}
                      </Badge>
                    </Td>
                    <Td>
                      {user.phone ? (
                        tel ? (
                          <a className="font-medium text-navy hover:text-menu-hover hover:underline" href={tel}>
                            {phonePretty(user.phone)}
                          </a>
                        ) : (
                          user.phone
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <Badge className={user.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}>
                        {user.isActive ? "Активен" : "Отключён"}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button onClick={() => openEditor(user.id)} size="sm" type="button" variant="secondary">
                          Изменить
                        </Button>
                        {canRemoveOthers && user.id !== currentUserId ? (
                          <button
                            className="h-8 px-2 text-sm font-semibold text-stone-500 hover:text-stone-800 hover:underline"
                            onClick={() => setRemoving(user)}
                            type="button"
                          >
                            Удалить
                          </button>
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>

      {removeError ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200">
          {REMOVE_ERRORS[removeError]}
        </p>
      ) : null}

      <RecordEditorModal
        error={loginError ? "Такой логин уже занят." : undefined}
        labelledBy="staff-editor-title"
        onClose={closeEditor}
        open={editor !== null}
        subtitle={
          editing ? `${editing.name} · ${editing.login}` : "Учётная запись для входа в диспетчерскую"
        }
        title={editing ? "Изменить сотрудника" : "Новый сотрудник"}
      >
        <StaffUserForm
          action={saveStaffUser}
          key={editing?.id || "new"}
          onCancel={closeEditor}
          user={
            editing
              ? {
                  id: editing.id,
                  name: editing.name,
                  login: editing.login,
                  phone: editing.phone,
                  role: editing.role,
                  isActive: editing.isActive,
                  lockedActive: editing.id === currentUserId,
                }
              : undefined
          }
        />
      </RecordEditorModal>

      <CenterModal
        className="max-w-md"
        labelledBy="staff-remove-title"
        onClose={() => setRemoving(null)}
        open={Boolean(removing)}
      >
        <div className="px-6 py-5">
          <h3 className="font-extrabold text-navy" id="staff-remove-title">
            Удалить сотрудника?
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {removing
              ? `Учётная запись «${removing.name}» будет удалена. Созданные заявки останутся за другим сотрудником.`
              : null}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() => {
                if (!removing) return;
                start(() => {
                  void deleteStaffUser(removing.id);
                });
              }}
              type="button"
              variant="danger"
            >
              {pending ? "Удаление…" : "Удалить"}
            </Button>
            <Button disabled={pending} onClick={() => setRemoving(null)} type="button" variant="secondary">
              Отмена
            </Button>
          </div>
        </div>
      </CenterModal>
    </div>
  );
}
