import { Agent, request as httpsRequest } from "node:https";
import { rootCertificates } from "node:tls";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "./db";
import { publicAppUrl, randomToken } from "./utils";
import { formatMaxCard } from "./max-messages";
import type { MaxButton, MaxChat, MaxSendOpts, MaxSetup } from "./max-types";

export type { MaxButton, MaxChat, MaxSendOpts, MaxSetup } from "./max-types";

const MAX_UPDATE_TYPES = ["message_created", "bot_started", "bot_added", "message_callback"] as const;
const MAX_API = "https://platform-api2.max.ru";
const STAFF_HELLO = formatMaxCard(
  "Чат офиса Рэдианс-СпецТех",
  [
    { icon: "🆕", value: "Сюда приходят заявки с сайта" },
    { icon: "🚚", value: "И статусы водителей по заявкам" },
    { icon: "💬", value: "Заказчики и водители пишут телефон в личном диалоге — не в этот чат" },
  ],
  "🏢",
);

const BIND_HELP = formatMaxCard(
  "Рэдианс-СпецТех",
  [
    { icon: "🚚", value: "Водитель: напишите телефон, как в справочнике" },
    { icon: "👤", value: "Заказчик: напишите телефон или номер заявки, например З-300826-0001" },
  ],
  "👋",
);

function maxHttpsAgent() {
  const extra: string[] = [];
  for (const name of ["russian_trusted_root_ca.cer", "russian_trusted_sub_ca.cer"]) {
    const file = join(process.cwd(), "certs", name);
    if (existsSync(file)) extra.push(readFileSync(file, "utf8"));
  }
  return extra.length ? new Agent({ ca: [...rootCertificates, ...extra] }) : undefined;
}

export const MAX_KEYS = {
  token: "max_bot_token",
  chatId: "max_staff_chat_id",
  botName: "max_bot_name",
  botUsername: "max_bot_username",
  botUserId: "max_bot_user_id",
  secret: "max_webhook_secret",
  chats: "max_chats",
  welcomed: "max_welcome_sent",
} as const;

async function getSetting(key: string) {
  const row = await prisma.smsTemplate.findUnique({ where: { key } });
  return row?.text || "";
}

async function setSetting(key: string, value: string) {
  await prisma.smsTemplate.upsert({
    where: { key },
    update: { text: value },
    create: { key, name: key, text: value },
  });
}

export function webhookUrl() {
  const app = publicAppUrl();
  if (!app.startsWith("https://") || app.includes("localhost")) return null;
  return `${app}/api/max/webhook`;
}

export async function getMaxConfig() {
  const [dbToken, dbChat] = await Promise.all([getSetting(MAX_KEYS.token), getSetting(MAX_KEYS.chatId)]);
  return {
    token: dbToken || process.env.MAX_BOT_TOKEN?.trim() || "",
    chatId: dbChat || process.env.MAX_STAFF_CHAT_ID?.trim() || "",
  };
}

export async function getNotifyChannels() {
  const { token, chatId } = await getMaxConfig();
  return {
    sms: false,
    max: Boolean(token && chatId),
  };
}

function tokenHint(token: string) {
  if (!token) return "";
  return token.length <= 8 ? "••••" : `••••${token.slice(-4)}`;
}

export async function getMaxSetup(): Promise<MaxSetup> {
  const [{ token, chatId }, botName, botUsername, chatsJson] = await Promise.all([
    getMaxConfig(),
    getSetting(MAX_KEYS.botName),
    getSetting(MAX_KEYS.botUsername),
    getSetting(MAX_KEYS.chats),
  ]);
  let chats: MaxChat[] = [];
  try {
    chats = chatsJson ? (JSON.parse(chatsJson) as MaxChat[]) : [];
  } catch {
    chats = [];
  }
  const channels = await getNotifyChannels();
  return {
    ...channels,
    hasToken: Boolean(token),
    tokenHint: tokenHint(token),
    chatId,
    botName,
    botUsername,
    chats,
    webhookUrl: webhookUrl(),
  };
}

async function maxFetch(token: string, path: string, init?: RequestInit) {
  const url = new URL(path.startsWith("http") ? path : `${MAX_API}${path}`);
  const method = (init?.method || "GET").toUpperCase();
  const body = typeof init?.body === "string" ? init.body : undefined;
  const text = await new Promise<string>((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method,
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        agent: maxHttpsAgent(),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk as Buffer));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 400) {
            let message = raw || `MAX HTTP ${res.statusCode}`;
            try {
              const err = JSON.parse(raw) as { message?: string };
              if (err?.message) message = err.message;
            } catch {
              /* keep raw */
            }
            reject(new Error(message));
            return;
          }
          resolve(raw);
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

export async function fetchMaxMe(token: string) {
  const me = (await maxFetch(token, "/me")) as {
    first_name?: string;
    name?: string;
    username?: string;
    user_id?: number;
  };
  return {
    name: me.first_name || me.name || "Бот MAX",
    username: me.username || "",
    userId: me.user_id ? String(me.user_id) : "",
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function chatsFromUpdate(update: unknown): MaxChat[] {
  const u = asRecord(update);
  if (!u) return [];
  const message = asRecord(u.message);
  const recipient = asRecord(message?.recipient);
  const sender = asRecord(message?.sender);
  const user = asRecord(u.user);
  const chat = asRecord(u.chat);
  const id = u.chat_id ?? u.chatId ?? recipient?.chat_id ?? chat?.chat_id ?? chat?.id ?? u.user_id ?? user?.user_id;
  if (id == null || id === "") return [];
  const type = String(chat?.type || recipient?.chat_type || "");
  const kind = type === "chat" || type === "channel" || String(id).startsWith("-") ? "группа" : "личный";
  const name =
    (typeof chat?.title === "string" && chat.title) ||
    (typeof user?.name === "string" && user.name) ||
    (typeof sender?.name === "string" && sender.name) ||
    `Чат ${id}`;
  return [{ id: String(id), title: `${kind}: ${name}`, at: new Date().toISOString() }];
}

export async function rememberMaxChats(found: MaxChat[]) {
  if (!found.length) return;
  const raw = await getSetting(MAX_KEYS.chats);
  let current: MaxChat[] = [];
  try {
    current = raw ? (JSON.parse(raw) as MaxChat[]) : [];
  } catch {
    current = [];
  }
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of found) byId.set(item.id, item);
  await setSetting(MAX_KEYS.chats, JSON.stringify([...byId.values()].slice(-20)));
}

export async function saveMaxToken(token: string) {
  const me = await fetchMaxMe(token);
  await setSetting(MAX_KEYS.token, token);
  await setSetting(MAX_KEYS.botName, me.name);
  await setSetting(MAX_KEYS.botUsername, me.username);
  if (me.userId) await setSetting(MAX_KEYS.botUserId, me.userId);
  if (!(await getSetting(MAX_KEYS.secret))) {
    await setSetting(MAX_KEYS.secret, randomToken().replace(/[^a-zA-Z0-9]/g, "").slice(0, 32) || "spetsteh-max-secret");
  }
  return me;
}

export async function saveMaxStaffChat(chatId: string) {
  await setSetting(MAX_KEYS.chatId, chatId);
}

export async function subscribeMaxWebhook() {
  const { token } = await getMaxConfig();
  const url = webhookUrl();
  if (!token) throw new Error("Сначала сохраните токен бота");
  if (!url) throw new Error("Webhook нужен HTTPS-адрес сайта в APP_URL");
  const secret = await getSetting(MAX_KEYS.secret);
  const body = JSON.stringify({
    url,
    update_types: [...MAX_UPDATE_TYPES],
    secret: secret || undefined,
  });
  try {
    await maxFetch(token, "/subscriptions", { method: "POST", body });
    return url;
  } catch {
    /* already subscribed with old types — replace */
  }
  try {
    const current = (await maxFetch(token, "/subscriptions")) as { subscriptions?: { url?: string }[] };
    for (const sub of current?.subscriptions || []) {
      if (!sub.url) continue;
      try {
        await maxFetch(token, `/subscriptions?url=${encodeURIComponent(sub.url)}`, { method: "DELETE" });
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* no subscriptions yet */
  }
  await maxFetch(token, "/subscriptions", { method: "POST", body });
  return url;
}

export async function pollMaxUpdates() {
  const { token } = await getMaxConfig();
  if (!token) throw new Error("Сначала сохраните токен бота");
  const data = (await maxFetch(
    token,
    `/updates?limit=100&timeout=25&types=${MAX_UPDATE_TYPES.join(",")}`,
  )) as { updates?: unknown[] };
  const updates = data.updates || [];
  await processMaxUpdates(updates);
  return updates.flatMap(chatsFromUpdate);
}

let webhookEnsured = false;

export async function processMaxUpdates(updates: unknown[]) {
  if (!webhookEnsured) {
    webhookEnsured = true;
    try {
      await subscribeMaxWebhook();
    } catch {
      /* localhost or already subscribed */
    }
  }
  const chats = updates.flatMap(chatsFromUpdate);
  await rememberMaxChats(chats);
  if (chats.length) await bindStaffChatFromUpdates(chats);
  for (const update of updates) {
    await handleMaxInbound(update);
  }
}

function messageText(update: unknown) {
  const u = asRecord(update);
  const message = asRecord(u?.message);
  const body = asRecord(message?.body);
  return String(body?.text || message?.text || u?.text || "").trim();
}

function senderUserId(update: unknown) {
  const u = asRecord(update);
  const message = asRecord(u?.message);
  const callback = asRecord(u?.callback);
  const sender = asRecord(message?.sender) || asRecord(callback?.user) || asRecord(u?.user);
  if (sender?.is_bot === true) return "";
  const id = sender?.user_id ?? callback?.user_id ?? u?.user_id;
  return id == null || id === "" ? "" : String(id);
}

function startPayload(update: unknown) {
  const u = asRecord(update);
  const callback = asRecord(u?.callback);
  return String(u?.payload ?? callback?.payload ?? "").trim();
}

function callbackId(update: unknown) {
  const callback = asRecord(asRecord(update)?.callback);
  const id = callback?.callback_id ?? callback?.id;
  return id == null || id === "" ? "" : String(id);
}

function inboundChatId(update: unknown) {
  const u = asRecord(update);
  const message = asRecord(u?.message);
  const recipient = asRecord(message?.recipient);
  const chat = asRecord(u?.chat);
  const id = u?.chat_id ?? recipient?.chat_id ?? chat?.chat_id ?? chat?.id;
  return id == null || id === "" ? "" : String(id);
}

function phoneKey(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) return digits.slice(1);
  if (digits.length === 10) return digits;
  return "";
}

async function handleMaxInbound(update: unknown) {
  const u = asRecord(update);
  const type = String(u?.update_type || "");
  const userId = senderUserId(update);
  if (!userId) return;
  const botId = await getSetting(MAX_KEYS.botUserId);
  if (botId && userId === botId) return;
  const { chatId: staffChat } = await getMaxConfig();
  const chatId = inboundChatId(update);
  if (staffChat && chatId && chatId === staffChat) return;

  if (type === "message_callback") {
    await handleMaxCallback(userId, startPayload(update), callbackId(update));
    return;
  }

  const payload = startPayload(update);
  if (type === "bot_started") {
    if (payload && (await offerOrderNotifications(userId, payload))) return;
    await sendMaxToUser(userId, BIND_HELP, { format: "markdown" });
    return;
  }

  const text = messageText(update);
  if (!text) {
    await sendMaxToUser(userId, BIND_HELP, { format: "markdown" });
    return;
  }

  if (await offerOrderNotifications(userId, text)) return;

  const bound = await bindMaxPerson(userId, text);
  if (bound) {
    await sendMaxToUser(userId, bound, { format: "markdown" });
    return;
  }
  await sendMaxToUser(userId, BIND_HELP, { format: "markdown" });
}

async function orderByBindToken(token: string) {
  const key = token.replace(/^bind[_-]/i, "").trim();
  if (!/^[a-f0-9]{16,32}$/i.test(key)) return null;
  const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Order" WHERE maxBindToken = ${key} LIMIT 1`;
  const id = rows[0]?.id;
  if (!id) return null;
  return prisma.order.findUnique({
    where: { id },
    include: { customer: true, equipmentType: true },
  });
}

async function offerOrderNotifications(userId: string, token: string) {
  const order = await orderByBindToken(token);
  if (!order) return false;
  const bindKey = token.replace(/^bind[_-]/i, "").trim();
  await sendMaxToUser(
    userId,
    formatMaxCard(
      "Заявка принята",
      [
        { value: order.number, strong: true },
        { icon: "🚚", value: order.equipmentType.name },
        { icon: "📞", value: "Диспетчер перезвонит и подтвердит подачу" },
        { icon: "💬", value: "Получать сюда статусы — когда назначим машину, когда водитель выедет и когда смена закрыта?" },
      ],
      "🆕",
    ),
    {
      format: "markdown",
      buttons: [[{ type: "callback", text: "Да, присылайте", payload: `bind_${bindKey}` }]],
    },
  );
  return true;
}

async function handleMaxCallback(userId: string, payload: string, id: string) {
  const order = await orderByBindToken(payload);
  const text = order
    ? formatMaxCard(
        "Готово",
        [
          { value: order.number, strong: true },
          { icon: "✅", value: "Статусы будут приходить в этот чат" },
        ],
        "✅",
      )
    : BIND_HELP;
  if (order) {
    await prisma.customer.update({
      where: { id: order.customerId },
      data: { maxUserId: userId },
    });
  }
  if (id) {
    await answerMaxCallback(id, {
      text,
      format: "markdown",
      notification: order ? "Уведомления включены" : undefined,
    });
    return;
  }
  await sendMaxToUser(userId, text, { format: "markdown" });
}

async function answerMaxCallback(
  id: string,
  opts: { text: string; format?: "markdown" | "html"; notification?: string },
) {
  const { token } = await getMaxConfig();
  if (!token) return;
  await maxFetch(token, `/answers?callback_id=${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify({
      notification: opts.notification,
      message: { text: opts.text, format: opts.format },
    }),
  });
}

async function bindMaxPerson(maxUserId: string, text: string) {
  const key = phoneKey(text);
  if (key.length === 10) {
    const user = await prisma.user.findFirst({
      where: { isActive: true, phone: { contains: key } },
    });
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { maxUserId } });
      const who = user.role === "DRIVER" ? "водитель" : "сотрудник";
      return formatMaxCard(
        "Готово",
        [
          { icon: "👤", value: user.name, strong: true },
          { icon: "✅", value: `Вы привязаны как ${who}. Уведомления будут приходить сюда.` },
        ],
        "✅",
      );
    }
    const customer = await prisma.customer.findFirst({
      where: { phone: { contains: key } },
    });
    if (customer) {
      await prisma.customer.update({ where: { id: customer.id }, data: { maxUserId } });
      return formatMaxCard(
        "Готово",
        [
          { icon: "👤", value: customer.contactName || customer.name, strong: true },
          { icon: "✅", value: "Статусы заявок будут приходить сюда." },
        ],
        "✅",
      );
    }
  }

  const compact = text.replace(/\s/g, "").replace(/[–]/g, "-").toUpperCase().replace(/^Z-/, "З-");
  if (/^З-\d{4}-\d+/.test(compact) || compact.startsWith("З")) {
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ number: compact }, { number: { contains: compact.replace(/^З-?/, "") } }],
      },
      include: { customer: true },
    });
    if (order) {
      await prisma.customer.update({
        where: { id: order.customerId },
        data: { maxUserId },
      });
      return formatMaxCard(
        "Готово",
        [
          { value: order.number, strong: true },
          { icon: "✅", value: "Заявка привязана. Статусы будут приходить сюда." },
        ],
        "✅",
      );
    }
  }

  const login = text.trim().toLowerCase();
  if (login.length >= 3 && !/\s/.test(login)) {
    const user = await prisma.user.findFirst({ where: { isActive: true, login } });
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { maxUserId } });
      return formatMaxCard(
        "Готово",
        [
          { icon: "👤", value: user.name, strong: true },
          { icon: "✅", value: "Уведомления будут приходить сюда." },
        ],
        "✅",
      );
    }
  }

  return "";
}

export async function bindStaffChatFromUpdates(found: MaxChat[]) {
  if (!found.length) return { bound: false as const };
  const { chatId } = await getMaxConfig();
  const nextId = chatId || found[0].id;
  if (!chatId) await saveMaxStaffChat(nextId);
  if (!(await getSetting(MAX_KEYS.welcomed))) {
    await sendMaxStaff(STAFF_HELLO, { format: "markdown" });
    await setSetting(MAX_KEYS.welcomed, nextId);
  }
  return { bound: true as const, chatId: nextId };
}

export async function webhookSecret() {
  return getSetting(MAX_KEYS.secret);
}

function keyboardAttachments(opts?: MaxSendOpts) {
  const rows: MaxButton[][] =
    opts?.buttons ||
    (opts?.button?.url ? [[{ type: "link", text: opts.button.text, url: opts.button.url }]] : []);
  if (!rows.length) return undefined;
  return [
    {
      type: "inline_keyboard",
      payload: { buttons: rows },
    },
  ];
}

function maxMessageBody(text: string, opts?: MaxSendOpts) {
  const body: Record<string, unknown> = { text };
  if (opts?.format) body.format = opts.format;
  const attachments = keyboardAttachments(opts);
  if (attachments) body.attachments = attachments;
  return JSON.stringify(body);
}

export async function sendMaxStaff(text: string, opts?: MaxSendOpts) {
  const { token, chatId } = await getMaxConfig();
  if (!token || !chatId || !text) return { status: "SKIPPED" as const };

  await maxFetch(token, `/messages?chat_id=${encodeURIComponent(chatId)}`, {
    method: "POST",
    body: maxMessageBody(text, opts),
  });
  return { status: "SENT" as const };
}

export async function sendMaxToUser(userId: string, text: string, opts?: MaxSendOpts) {
  const { token } = await getMaxConfig();
  if (!token || !userId || !text) return { status: "SKIPPED" as const };

  await maxFetch(token, `/messages?user_id=${encodeURIComponent(userId)}`, {
    method: "POST",
    body: maxMessageBody(text, opts),
  });
  return { status: "SENT" as const };
}

export async function resolveMaxUserId(input: { phone?: string; userId?: string; customerId?: string }) {
  try {
    if (input.userId) {
      const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { maxUserId: true } });
      if (user?.maxUserId) return user.maxUserId;
    }
    if (input.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: input.customerId },
        select: { maxUserId: true },
      });
      if (customer?.maxUserId) return customer.maxUserId;
    }
    const key = phoneKey(input.phone || "");
    if (!key) return "";
    const user = await prisma.user.findFirst({
      where: { maxUserId: { not: null }, phone: { contains: key } },
      select: { maxUserId: true },
    });
    if (user?.maxUserId) return user.maxUserId;
    const customer = await prisma.customer.findFirst({
      where: { maxUserId: { not: null }, phone: { contains: key } },
      select: { maxUserId: true },
    });
    return customer?.maxUserId || "";
  } catch (error) {
    console.error("[MAX] resolve", error instanceof Error ? error.message : error);
    return "";
  }
}
