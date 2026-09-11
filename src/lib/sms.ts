import { prisma } from "./db";
import { resolveMaxUserId, sendMaxToUser } from "./max";
import { personalMaxMessage } from "./max-messages";

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

export async function sendSms(input: {
  to: string;
  purpose: string;
  templateKey?: string;
  text?: string;
  vars?: Record<string, string>;
  orderId?: string;
  userId?: string;
  customerId?: string;
}) {
  let text = input.text || "";
  if (input.templateKey) {
    const tpl = await prisma.smsTemplate.findUnique({ where: { key: input.templateKey } });
    if (tpl) text = fill(tpl.text, input.vars || {});
  }
  if (!text) return { status: "SKIPPED" as const };

  const maxUserId = await resolveMaxUserId({
    phone: input.to,
    userId: input.userId,
    customerId: input.customerId,
  });

  if (!maxUserId) {
    await prisma.smsLog.create({
      data: {
        to: input.to || "MAX",
        text,
        purpose: input.purpose,
        status: "SKIPPED",
        error: "Нет диалога MAX: человек должен написать боту телефон или номер заявки",
        orderId: input.orderId,
      },
    });
    return { status: "SKIPPED" as const };
  }

  const card = personalMaxMessage(input.purpose, input.vars || {}, text);

  try {
    const result = await sendMaxToUser(maxUserId, card.text, card.opts);
    await prisma.smsLog.create({
      data: {
        to: `MAX ${maxUserId}`,
        text: card.text,
        purpose: input.purpose,
        status: result.status,
        error: result.status === "SKIPPED" ? "Бот MAX не подключён" : null,
        orderId: input.orderId,
      },
    });
    return result;
  } catch (error) {
    await prisma.smsLog.create({
      data: {
        to: `MAX ${maxUserId}`,
        text: card.text,
        purpose: input.purpose,
        status: "ERROR",
        error: error instanceof Error ? error.message : "unknown",
        orderId: input.orderId,
      },
    });
    return { status: "ERROR" as const };
  }
}
