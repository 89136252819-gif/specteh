"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSmsTemplate, sendTestSms } from "@/actions/catalogs";
import { MaxSetupCard } from "@/components/max-setup";
import type { MaxSetup } from "@/lib/max-types";
import { RecordEditorModal } from "@/components/record-editor-modal";
import { FilterChip, SummaryStat } from "@/components/directory-chrome";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/submit-button";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { smsStatusLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export type SmsTemplateRow = { id: string; key: string; name: string; text: string };
export type SmsLogRow = { id: string; createdAt: string; to: string; status: string; text: string };

export function SmsDirectory({
  templates,
  logs,
  channels,
  maxSetup,
}: {
  templates: SmsTemplateRow[];
  logs: SmsLogRow[];
  channels: { sms: boolean; max: boolean };
  maxSetup: MaxSetup;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"templates" | "log">("templates");
  const [editor, setEditor] = useState<SmsTemplateRow | null>(null);

  async function save(formData: FormData) {
    await saveSmsTemplate(formData);
    setEditor(null);
    router.refresh();
  }

  async function testSms(formData: FormData) {
    await sendTestSms(formData);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <SummaryStat hint="больше не используется" label="SMS.ru" tone="warn" value="Выкл" />
        <SummaryStat hint="офис, водители, заказчики" label="MAX" tone={channels.max ? "ok" : "warn"} value={channels.max ? "Вкл" : "Выкл"} />
        <SummaryStat hint="уведомления заказчику и водителю" label="Шаблонов" value={templates.length} />
        <SummaryStat hint="последние отправки" label="В журнале" tone="accent" value={logs.length} />
      </div>

      <MaxSetupCard setup={maxSetup} />

      <div className="panel space-y-4 px-4 py-4">
        <p className="text-sm text-slate-600">
          SMS.ru отключён. Тексты шаблонов уходят в MAX, если человек написал боту свой телефон или номер заявки. Иначе запись попадает в журнал как «пропущено».
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <form action={testSms} className="grid gap-3 rounded-2xl bg-slate-50 p-4 lg:col-span-2">
            <p className="font-semibold text-navy">Проверка MAX</p>
            <Field label="Телефон из справочника">
              <Input name="phone" placeholder="+7 900 000-00-00" required />
            </Field>
            <Field label="Текст">
              <Input defaultValue="Тестовое уведомление Рэдианс-СпецТех" name="text" />
            </Field>
            <SubmitButton>Отправить в MAX</SubmitButton>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <FilterChip active={tab === "templates"} onClick={() => setTab("templates")}>
              Шаблоны
            </FilterChip>
            <FilterChip active={tab === "log"} onClick={() => setTab("log")}>
              Журнал
            </FilterChip>
          </div>
        </div>

        {tab === "templates" ? (
          templates.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">Шаблонов пока нет.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {templates.map((template) => (
                <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between" key={template.id}>
                  <div className="min-w-0">
                    <p className="font-semibold text-navy">{template.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{template.key}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{template.text}</p>
                  </div>
                  <Button className="shrink-0" onClick={() => setEditor(template)} size="sm" type="button" variant="secondary">
                    Изменить
                  </Button>
                </li>
              ))}
            </ul>
          )
        ) : logs.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">Журнал пуст — без ключа SMS.ru сообщения пишутся сюда.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Когда</Th>
                <Th>Кому</Th>
                <Th>Статус</Th>
                <Th>Текст</Th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.id}>
                  <Td className="whitespace-nowrap text-slate-600">{formatDateTime(row.createdAt)}</Td>
                  <Td className="font-medium text-navy">{row.to}</Td>
                  <Td>
                    <Badge
                      className={
                        row.status === "OK" || row.status === "SENT"
                          ? "bg-emerald-100 text-emerald-800"
                          : row.status.toLowerCase().includes("error") || row.status === "FAIL"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-slate-100 text-slate-700"
                      }
                    >
                      {smsStatusLabel(row.status)}
                    </Badge>
                  </Td>
                  <Td className="max-w-md truncate text-slate-600">{row.text}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <RecordEditorModal
        labelledBy="sms-editor-title"
        onClose={() => setEditor(null)}
        open={Boolean(editor)}
        subtitle={editor?.key}
        title={editor ? "Изменить шаблон" : "Шаблон"}
      >
        {editor ? (
          <form action={save} className="grid gap-3" key={editor.id}>
            <input name="id" type="hidden" value={editor.id} />
            <Field label="Название">
              <Input name="name" required defaultValue={editor.name} />
            </Field>
            <Field label="Текст, плейсхолдеры в фигурных скобках">
              <Textarea className="min-h-36" name="text" required defaultValue={editor.text} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <SubmitButton>Сохранить</SubmitButton>
              <Button onClick={() => setEditor(null)} type="button" variant="secondary">
                Отмена
              </Button>
            </div>
          </form>
        ) : null}
      </RecordEditorModal>
    </div>
  );
}
