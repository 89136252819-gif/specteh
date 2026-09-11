"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { chooseMaxChat, connectMaxBot, findMaxChats, sendTestMax } from "@/actions/max";
import { Field, Input, Select } from "@/components/ui/fields";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import type { MaxSetup } from "@/lib/max-types";

export function MaxSetupCard({ setup }: { setup: MaxSetup }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function flash(next: { ok?: string; error?: string }) {
    setMessage(next.ok || "");
    setError(next.error || "");
    router.refresh();
  }

  return (
    <div className="panel space-y-4 px-4 py-4">
      <div>
        <p className="font-semibold text-navy">Бот MAX для офиса</p>
        <p className="mt-1 text-sm text-slate-600">
          Один бот на всех. В этот чат офиса — заявки с сайта и статусы водителей. Водитель и заказчик пишут боту свой телефон в личном диалоге, после этого им уходит MAX вместо SMS.
        </p>
      </div>

      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
        <li>
          Откройте{" "}
          <a className="font-semibold text-brand-hover hover:underline" href="https://business.max.ru" rel="noopener noreferrer" target="_blank">
            business.max.ru
          </a>
          , войдите по телефону и при необходимости подтвердите организацию.
        </li>
        <li>
          Раздел «Чат-боты» → «Создать». Название: <span className="font-medium text-navy">Рэдианс-СпецТех</span>. Описание:
          уведомления диспетчерской о заявках и отчётах водителей.
        </li>
        <li>Дождитесь модерации (обычно несколько часов, до двух рабочих дней). Токен появится в «Расширенные настройки».</li>
        <li>В настройках бота разрешите добавление в группы, если уведомления пойдут в общий чат офиса.</li>
        <li>Вставьте токен ниже, напишите боту «Привет» и нажмите «Найти чат» — это канал офиса.</li>
        <li>
          Водители и заказчики открывают этого же бота и пишут телефон (как в справочнике) или номер заявки. После этого уведомления идут им в MAX, SMS не используется.
        </li>
      </ol>

      <form
        action={async (formData) => {
          flash(await connectMaxBot(formData));
        }}
        className="grid gap-3 rounded-2xl bg-slate-50 p-4"
      >
        <Field label="Токен бота">
          <Input autoComplete="off" name="token" placeholder={setup.tokenHint || "Вставьте токен из MAX"} type="password" />
        </Field>
        {setup.hasToken ? (
          <p className="text-sm text-slate-600">
            Сейчас подключён {setup.botName || "бот"}
            {setup.botUsername ? ` (@${setup.botUsername.replace(/^@/, "")})` : ""} · токен {setup.tokenHint}
          </p>
        ) : null}
        <SubmitButton>Сохранить токен и проверить</SubmitButton>
      </form>

      <div className="grid gap-3 rounded-2xl bg-slate-50 p-4">
        <p className="text-sm text-slate-600">
          Напишите боту «Привет» в MAX (или добавьте в группу офиса администратором), затем сразу нажмите кнопку. События MAX живут недолго — если подождать, «Найти чат» ничего не увидит.
        </p>
        <form
          action={async () => {
            flash(await findMaxChats());
          }}
        >
          <Button type="submit" variant="secondary">
            Найти чат
          </Button>
        </form>
        {setup.chats.length ? (
          <form
            action={async (formData) => {
              flash(await chooseMaxChat(formData));
            }}
            className="grid gap-3"
          >
            <Field label="Чат сотрудников">
              <Select defaultValue={setup.chatId} name="chatId" required>
                <option value="">Выберите чат</option>
                {setup.chats.map((chat) => (
                  <option key={chat.id} value={chat.id}>
                    {chat.id.startsWith("-") ? "группа" : "личный"}: {chat.title.replace(/^(группа|личный):\s*/i, "")} · {chat.id}
                  </option>
                ))}
              </Select>
            </Field>
            <SubmitButton>Сохранить чат</SubmitButton>
          </form>
        ) : null}
        {setup.chatId ? <p className="text-sm text-slate-500">Рабочий chat_id: {setup.chatId}</p> : null}
        <form
          action={async () => {
            flash(await sendTestMax());
          }}
        >
          <SubmitButton>Отправить тест в MAX</SubmitButton>
        </form>
      </div>

      {message ? <p className="text-sm font-medium text-emerald-800">{message}</p> : null}
      {error ? <p className="text-sm font-medium text-amber-800">{error}</p> : null}
    </div>
  );
}
