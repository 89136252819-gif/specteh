"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  pollMaxUpdates,
  saveMaxStaffChat,
  saveMaxToken,
  sendMaxStaff,
  subscribeMaxWebhook,
  bindStaffChatFromUpdates,
} from "@/lib/max";
import { publicAppUrl } from "@/lib/utils";

function refresh() {
  revalidatePath("/settings/sms");
}

export async function connectMaxBot(formData: FormData) {
  await requireStaff();
  const token = String(formData.get("token") || "").trim();
  if (!token) return { error: "Вставьте токен бота" };
  try {
    const me = await saveMaxToken(token);
    try {
      await subscribeMaxWebhook();
    } catch {
      // Localhost or webhook already set — chat can still be found via long polling.
    }
    refresh();
    return { ok: `Бот «${me.name}» подключён` as const, username: me.username };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось проверить токен" };
  }
}

export async function findMaxChats() {
  await requireStaff();
  try {
    const found = await pollMaxUpdates();
    if (found.length) {
      await bindStaffChatFromUpdates(found);
    }
    refresh();
    if (!found.length) {
      return {
        error:
          "Чат пока не найден. Напишите боту «Привет» ещё раз в MAX и сразу нажмите «Найти чат». Бот сам не ведёт переписку — он только шлёт уведомления офису.",
      };
    }
    return { ok: `Чат найден${found[0]?.title ? `: ${found[0].title}` : ""}. Если водитель или заказчик написали телефон — они тоже привязаны.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка MAX";
    if (/405|not allowed|webhook|подписк/i.test(message)) {
      return {
        error:
          "MAX шлёт события на сайт. Напишите боту в мессенджере — чат появится здесь сам. Если сайт ещё не выложен, подождите деплой.",
      };
    }
    return { error: message };
  }
}

export async function chooseMaxChat(formData: FormData) {
  await requireStaff();
  const chatId = String(formData.get("chatId") || "").trim();
  if (!chatId) return { error: "Выберите чат" };
  await saveMaxStaffChat(chatId);
  refresh();
  return { ok: "Чат сотрудников сохранён" };
}

export async function sendTestMax() {
  await requireStaff();
  const text = "🧪 **Тест MAX**\n\nБот Рэдианс-СпецТех работает. Новые заявки с сайта придут так же — с полями и кнопкой.";
  try {
    const result = await sendMaxStaff(text, {
      format: "markdown",
      button: { text: "Открыть диспетчерскую", url: `${publicAppUrl()}/dispatch` },
    });
    await prisma.smsLog.create({
      data: {
        to: "MAX",
        text,
        purpose: "TEST_MAX",
        status: result.status === "SENT" ? "SENT" : "SKIPPED",
        error: result.status === "SKIPPED" ? "Сначала подключите бота и выберите чат" : null,
      },
    });
    refresh();
    return result.status === "SENT" ? { ok: "Сообщение отправлено в MAX" } : { error: "Бот или чат ещё не настроены" };
  } catch (error) {
    await prisma.smsLog.create({
      data: {
        to: "MAX",
        text,
        purpose: "TEST_MAX",
        status: "ERROR",
        error: error instanceof Error ? error.message : "unknown",
      },
    });
    refresh();
    return { error: error instanceof Error ? error.message : "Ошибка отправки" };
  }
}
