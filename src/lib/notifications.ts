import { prisma } from "./db";
import { ROLES, STAFF_ROLES } from "./constants";
import { sendMaxStaff, sendMaxToUser } from "./max";
import { formatMaxCard, type MaxCardLine } from "./max-messages";
import { revalidateStaffNotices } from "./revalidate-ops";
import { publicAppUrl } from "./utils";

const NOTICE_EMOJI: Record<string, string> = {
  PUBLIC_ORDER: "🆕",
  DRIVER_ACCEPTED: "✅",
  DRIVER_DECLINED: "⛔",
  DRIVER_EN_ROUTE: "🚛",
  DRIVER_ON_SITE: "📍",
  REPORT_SUBMITTED: "📋",
  SHIFT_STARTED: "🟢",
  SHIFT_ENDED: "🌙",
  PAYMENT: "💳",
  MAX_UNBOUND: "⚠️",
  ORDER_FORCE_STATUS: "🛠",
  VAT_INVOICE_NEEDED: "📄",
  VAT_INVOICE_STALE: "📄",
};

export type StaffNoticeLine = MaxCardLine;

export async function notifyStaff(input: {
  type: string;
  title: string;
  body: string;
  orderId?: string;
  lines?: StaffNoticeLine[];
}) {
  const users = await prisma.user.findMany({
    where: { isActive: true, role: { in: [...STAFF_ROLES] } },
    select: { id: true },
  });
  if (users.length) {
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: input.type,
        title: input.title,
        body: input.body,
        orderId: input.orderId,
      })),
    });
    revalidateStaffNotices();
  }

  const app = publicAppUrl();
  const orderUrl = input.orderId && app ? `${app}/orders/${input.orderId}` : "";
  try {
    await sendMaxStaff(formatMaxCard(input.title, input.lines, NOTICE_EMOJI[input.type] || "•", input.body), {
      format: "markdown",
      button: orderUrl ? { text: "Открыть заявку", url: orderUrl } : undefined,
    });
  } catch (error) {
    console.error("[MAX]", error instanceof Error ? error.message : error);
  }
}

/** Колокольчик и личный MAX только бухгалтерам. Общий чат диспетчеров не трогаем. */
export async function notifyAccountants(input: {
  type: string;
  title: string;
  body: string;
  orderId?: string;
  lines?: StaffNoticeLine[];
}) {
  const users = await prisma.user.findMany({
    where: { isActive: true, role: ROLES.ACCOUNTANT },
    select: { id: true, maxUserId: true },
  });
  if (users.length) {
    await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: input.type,
        title: input.title,
        body: input.body,
        orderId: input.orderId,
      })),
    });
    revalidateStaffNotices();
  }

  const app = publicAppUrl();
  const orderUrl = input.orderId && app ? `${app}/orders/${input.orderId}` : "";
  const text = formatMaxCard(input.title, input.lines, NOTICE_EMOJI[input.type] || "📄", input.body);
  for (const user of users) {
    if (!user.maxUserId) continue;
    try {
      await sendMaxToUser(user.maxUserId, text, {
        format: "markdown",
        button: orderUrl ? { text: "Открыть заявку", url: orderUrl } : undefined,
      });
    } catch (error) {
      console.error("[MAX]", error instanceof Error ? error.message : error);
    }
  }
}

export async function notifyUser(userId: string, input: {
  type: string;
  title: string;
  body: string;
  orderId?: string;
}) {
  await prisma.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      orderId: input.orderId,
    },
  });
  revalidateStaffNotices();
}
