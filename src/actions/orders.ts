"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRoles, requireStaff } from "@/lib/auth";
import { notifyStaff } from "@/lib/notifications";
import { sendSms } from "@/lib/sms";
import { calculateFromReport, getRatesForOrder, parseBillingJson, resolveVatRate, totalsFromLines, applyManualTotals, type DocLine } from "@/lib/pricing";
import { roundMoney } from "@/lib/pricing-shared";
import { parseOmskDatetimeLocal, publicAppUrl, randomToken, formatDriverWhen } from "@/lib/utils";
import {
  CUSTOMER_TYPES,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PRICE_KINDS,
  ROLES,
  SMS_TEMPLATE_KEYS,
  type OrderStatus,
} from "@/lib/constants";
import { revalidateDispatch } from "@/lib/revalidate-ops";
import { nextOrderNumber } from "@/lib/order-number";
import { omskYmd } from "@/lib/timesheet";
import { writeAudit } from "@/lib/audit";
import { defaultPaymentPurpose } from "@/lib/invoice-purpose";

const LIVE_EQUIPMENT_STATUSES = new Set<string>([
  ORDER_STATUSES.ASSIGNED,
  ORDER_STATUSES.ACCEPTED,
  ORDER_STATUSES.EN_ROUTE,
  ORDER_STATUSES.ON_SITE,
  ORDER_STATUSES.REPORT_SUBMITTED,
]);

const ALL_ORDER_STATUSES = new Set<string>(Object.values(ORDER_STATUSES));

async function notifyIfCustomerMaxSkipped(input: {
  status: string;
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  orderId: string;
  context: string;
}) {
  if (input.status !== "SKIPPED") return;
  await notifyStaff({
    type: "MAX_UNBOUND",
    title: "Заказчик без MAX",
    body: `${input.customerName}: ${input.context} по заявке ${input.orderNumber} не ушло в MAX`,
    orderId: input.orderId,
    lines: [
      { value: input.orderNumber, strong: true },
      { icon: "👤", value: input.customerName },
      { icon: "📞", value: input.customerPhone },
      { icon: "💬", value: input.context },
    ],
  });
}

function readVatRate(formData: FormData, paymentMethod: string, orgVatRate: number) {
  const raw = String(formData.get("vatRate") ?? "");
  const parsed = raw === "" ? null : Number(raw);
  const override = parsed != null && Number.isFinite(parsed) ? parsed : null;
  return resolveVatRate(paymentMethod, override, orgVatRate);
}

async function applyOrderPayment(orderId: string, paymentMethod: string, vatRate: number) {
  const org = await prisma.organization.findUnique({ where: { paymentMethod } });
  if (!org) return null;
  const resolvedVat = resolveVatRate(paymentMethod, vatRate, org.vatRate);
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentMethod, organizationId: org.id, vatRate: resolvedVat },
  });
  return { org, vatRate: resolvedVat };
}

async function resolveCustomerId(formData: FormData, paymentMethod: string) {
  const mode = String(formData.get("customerMode") || "existing");
  if (mode === "new") {
    const name = String(formData.get("newCustomerName") || "").trim();
    const contactName = String(formData.get("newCustomerContact") || "").trim();
    const phone = String(formData.get("newCustomerPhone") || "").trim();
    const type = String(formData.get("newCustomerType") || CUSTOMER_TYPES.INDIVIDUAL);
    if (!name || !contactName || !phone) return null;

    const phoneKey = phone.replace(/\D/g, "").slice(-10);
    const existing = phoneKey
      ? await prisma.customer.findFirst({
          where: { phone: { contains: phoneKey } },
        })
      : null;
    if (existing) return existing.id;

    const customer = await prisma.customer.create({
      data: {
        type: type === CUSTOMER_TYPES.COMPANY ? CUSTOMER_TYPES.COMPANY : CUSTOMER_TYPES.INDIVIDUAL,
        name,
        contactName,
        phone,
        inn: String(formData.get("newCustomerInn") || "").trim() || null,
        kpp: String(formData.get("newCustomerKpp") || "").trim() || null,
        address: String(formData.get("newCustomerAddress") || "").trim() || null,
        defaultPaymentMethod: paymentMethod,
      },
    });
    return customer.id;
  }

  const customerId = String(formData.get("customerId") || "");
  return customerId || null;
}

export async function createOrder(formData: FormData) {
  const user = await requireStaff();
  const equipmentTypeId = String(formData.get("equipmentTypeId") || "");
  const paymentMethod = String(formData.get("paymentMethod") || "");
  const address = String(formData.get("address") || "").trim();
  const scheduledAt = String(formData.get("scheduledAt") || "");

  const org = await prisma.organization.findUnique({ where: { paymentMethod } });
  if (!org) {
    redirect("/orders/new?error=" + encodeURIComponent("Для выбранной оплаты нет юрлица в настройках"));
  }

  const customerId = await resolveCustomerId(formData, paymentMethod);
  const when = parseOmskDatetimeLocal(scheduledAt);
  if (!customerId) {
    redirect("/orders/new?error=" + encodeURIComponent("Выберите заказчика из базы или заполните нового"));
  }
  if (!equipmentTypeId) {
    redirect("/orders/new?error=" + encodeURIComponent("Выберите тип техники"));
  }
  if (!paymentMethod) {
    redirect("/orders/new?error=" + encodeURIComponent("Выберите способ оплаты"));
  }
  if (!address) {
    redirect("/orders/new?error=" + encodeURIComponent("Укажите адрес объекта"));
  }
  if (!when) {
    redirect("/orders/new?error=" + encodeURIComponent("Некорректная дата и время подачи"));
  }

  const vatRate = readVatRate(formData, paymentMethod, org.vatRate);

  const number = await nextOrderNumber();
  const order = await prisma.order.create({
    data: {
      number,
      customerId,
      organizationId: org.id,
      paymentMethod,
      vatRate,
      equipmentTypeId,
      address,
      siteContact: String(formData.get("siteContact") || "") || null,
      sitePhone: String(formData.get("sitePhone") || "") || null,
      scheduledAt: when,
      comment: String(formData.get("comment") || "") || null,
      createdById: user.id,
      status: ORDER_STATUSES.NEW,
    },
  });
  revalidatePath("/orders");
  revalidatePath("/customers");
  revalidatePath("/orders/new");
  revalidatePath("/");
  revalidateDispatch();
  redirect(`/orders/${order.id}`);
}

export async function updateOrderBasics(formData: FormData) {
  await requireStaff();
  const orderId = String(formData.get("orderId") || "");
  const address = String(formData.get("address") || "").trim();
  const scheduledAt = String(formData.get("scheduledAt") || "");
  const when = parseOmskDatetimeLocal(scheduledAt);
  if (!orderId || !address || !when) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      driver: { include: { user: true } },
    },
  });
  if (!order || order.status === ORDER_STATUSES.CANCELLED || order.status === "PAID") return;

  const prevAddress = order.address;
  const prevWhen = order.scheduledAt.getTime();
  const siteContact = String(formData.get("siteContact") || "") || null;
  const sitePhone = String(formData.get("sitePhone") || "") || null;
  const comment = String(formData.get("comment") || "") || null;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      address,
      scheduledAt: when,
      siteContact,
      sitePhone,
      comment,
    },
  });

  const changed =
    prevAddress !== address ||
    prevWhen !== when.getTime() ||
    (order.siteContact || null) !== siteContact ||
    (order.sitePhone || null) !== sitePhone;

  if (changed && order.driverId) {
    const datetime = formatDriverWhen(when);
    const details = [
      prevAddress !== address ? `Адрес: ${address}` : null,
      prevWhen !== when.getTime() ? `Время: ${datetime}` : null,
    ]
      .filter(Boolean)
      .join("; ");

    const customerSms = await sendSms({
      to: order.customer.phone,
      purpose: SMS_TEMPLATE_KEYS.ORDER_CHANGED_CUSTOMER,
      templateKey: SMS_TEMPLATE_KEYS.ORDER_CHANGED_CUSTOMER,
      text: `Рэдианс-СпецТех: заявка ${order.number} изменена. ${details}`,
      orderId,
      customerId: order.customerId,
      vars: { number: order.number, datetime, address, details },
    });
    await notifyIfCustomerMaxSkipped({
      status: customerSms.status,
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      orderNumber: order.number,
      orderId,
      context: "Изменение заявки",
    });

    if (order.driver?.user) {
      await sendSms({
        to: order.driver.user.phone || "",
        purpose: SMS_TEMPLATE_KEYS.ORDER_CHANGED_DRIVER,
        templateKey: SMS_TEMPLATE_KEYS.ORDER_CHANGED_DRIVER,
        text: `Заявка ${order.number} изменена. ${details}`,
        orderId,
        userId: order.driver.userId,
        vars: { number: order.number, datetime, address, details },
      });
      await prisma.notification.create({
        data: {
          userId: order.driver.userId,
          type: "ORDER_CHANGED",
          title: "Заявка изменена",
          body: `${order.number}: ${details || "обновлены данные"}`,
          orderId,
        },
      });
    }
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
  revalidateDispatch();
  revalidatePath("/driver");
}

export async function updateOrderCustomer(formData: FormData) {
  const user = await requireStaff();
  const orderId = String(formData.get("orderId") || "");
  if (!orderId) return { ok: false as const, error: "Нет заявки" };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: { select: { id: true, name: true } } },
  });
  if (!order) return { ok: false as const, error: "Заявка не найдена" };
  if (order.status === ORDER_STATUSES.CANCELLED || order.status === ORDER_STATUSES.PAID) {
    return { ok: false as const, error: "Заказчика в этой заявке уже нельзя сменить" };
  }

  const customerId = await resolveCustomerId(formData, order.paymentMethod);
  if (!customerId) {
    return { ok: false as const, error: "Выберите заказчика из базы или заполните нового" };
  }
  if (customerId === order.customerId) return { ok: true as const };

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true },
  });
  if (!customer) return { ok: false as const, error: "Заказчик не найден" };

  await prisma.order.update({
    where: { id: orderId },
    data: { customerId },
  });

  await writeAudit({
    actorId: user.id,
    actorName: user.name,
    action: "CHANGE_CUSTOMER",
    entity: "Order",
    entityId: orderId,
    orderId,
    detail: `${order.customer.name} → ${customer.name}`,
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/customers");
  revalidatePath("/documents");
  revalidatePath("/finance");
  revalidatePath("/");
  revalidateDispatch();
  return { ok: true as const };
}

export async function copyOrder(orderId: string) {
  const user = await requireStaff();
  const src = await prisma.order.findUnique({ where: { id: orderId } });
  if (!src) return;
  const number = await nextOrderNumber();
  const order = await prisma.order.create({
    data: {
      number,
      customerId: src.customerId,
      organizationId: src.organizationId,
      paymentMethod: src.paymentMethod,
      vatRate: src.vatRate,
      equipmentTypeId: src.equipmentTypeId,
      address: src.address,
      siteContact: src.siteContact,
      sitePhone: src.sitePhone,
      scheduledAt: src.scheduledAt,
      comment: src.comment,
      createdById: user.id,
      status: ORDER_STATUSES.NEW,
    },
  });
  revalidatePath("/orders");
  revalidateDispatch();
  redirect(`/orders/${order.id}`);
}

export type AssignConflict = {
  number: string;
  kind: "equipment" | "driver" | "both";
  when: string;
  label: string;
};

export async function checkAssignConflicts(formData: FormData): Promise<AssignConflict[]> {
  await requireStaff();
  const orderId = String(formData.get("orderId") || "");
  const equipmentId = String(formData.get("equipmentId") || "");
  const driverId = String(formData.get("driverId") || "");
  if (!orderId || !equipmentId || !driverId) return [];

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return [];
  const day = omskYmd(order.scheduledAt);

  const others = await prisma.order.findMany({
    where: {
      id: { not: orderId },
      status: { in: [...LIVE_EQUIPMENT_STATUSES] },
      OR: [{ equipmentId }, { driverId }],
    },
    include: {
      equipment: { select: { plateNumber: true, name: true } },
      driver: { include: { user: { select: { name: true } } } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const conflicts: AssignConflict[] = [];
  for (const item of others) {
    if (omskYmd(item.scheduledAt) !== day) continue;
    const sameEq = item.equipmentId === equipmentId;
    const sameDr = item.driverId === driverId;
    if (!sameEq && !sameDr) continue;
    conflicts.push({
      number: item.number,
      kind: sameEq && sameDr ? "both" : sameEq ? "equipment" : "driver",
      when: formatDriverWhen(item.scheduledAt),
      label: [
        sameEq && item.equipment ? `${item.equipment.plateNumber || item.equipment.name}` : null,
        sameDr && item.driver ? item.driver.user.name : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }
  return conflicts;
}

export async function getOrderRateGaps(orderId: string) {
  await requireStaff();
  const rates = await getRatesForOrder(orderId);
  const needed = [PRICE_KINDS.HOUR, PRICE_KINDS.DELIVERY];
  return rates.filter((rate) => needed.includes(rate.kind as (typeof needed)[number]) && !(rate.amount > 0));
}

export async function assignOrder(formData: FormData) {
  const user = await requireStaff();
  const orderId = String(formData.get("orderId") || "");
  const equipmentId = String(formData.get("equipmentId") || "");
  const driverId = String(formData.get("driverId") || "");
  if (!orderId || !equipmentId || !driverId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, equipment: true },
  });
  if (!order) return;

  const [equipment, driver] = await Promise.all([
    prisma.equipment.findUnique({ where: { id: equipmentId } }),
    prisma.driver.findUnique({ where: { id: driverId }, include: { user: true } }),
  ]);
  if (!equipment || !driver) return;
  if (equipment.status === "REPAIR") return;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      equipmentId,
      driverId,
      status: ORDER_STATUSES.ASSIGNED,
      assignedAt: new Date(),
      acceptedAt: null,
    },
  });
  await prisma.equipment.update({ where: { id: equipmentId }, data: { status: "BUSY" } });
  if (order.equipmentId && order.equipmentId !== equipmentId) {
    await prisma.equipment.update({ where: { id: order.equipmentId }, data: { status: "AVAILABLE" } });
  }

  const datetime = formatDriverWhen(order.scheduledAt);

  const customerSms = await sendSms({
    to: order.customer.phone,
    purpose: SMS_TEMPLATE_KEYS.ORDER_ASSIGNED_CUSTOMER,
    templateKey: SMS_TEMPLATE_KEYS.ORDER_ASSIGNED_CUSTOMER,
    orderId,
    customerId: order.customerId,
    vars: {
      number: order.number,
      equipment: `${equipment.name} ${equipment.plateNumber}`,
      driver: driver.user.name,
      datetime,
      address: order.address,
    },
  });
  await notifyIfCustomerMaxSkipped({
    status: customerSms.status,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    orderNumber: order.number,
    orderId,
    context: "Назначение техники",
  });
  const driverMax = await sendSms({
    to: driver.user.phone || "",
    purpose: SMS_TEMPLATE_KEYS.ORDER_ASSIGNED_DRIVER,
    templateKey: SMS_TEMPLATE_KEYS.ORDER_ASSIGNED_DRIVER,
    orderId,
    userId: driver.userId,
    vars: {
      number: order.number,
      datetime,
      address: order.address,
      url: publicAppUrl(),
    },
  });
  if (driverMax.status === "SKIPPED") {
    await notifyStaff({
      type: "MAX_UNBOUND",
      title: "Водитель без MAX",
      body: `${driver.user.name}: заявка ${order.number} в кабинете есть, в MAX не ушла. Пусть напишет боту свой телефон.`,
      orderId,
      lines: [
        { value: order.number, strong: true },
        { icon: "👤", value: driver.user.name },
        { icon: "💬", value: "Пусть напишет боту свой телефон в личном чате" },
      ],
    });
  }
  await notifyUserDriver(driver.userId, order.number, orderId);
  await writeAudit({
    actorId: user.id,
    actorName: user.name,
    action: "ASSIGN",
    entity: "Order",
    entityId: orderId,
    orderId,
    detail: `${equipment.plateNumber} · ${driver.user.name}`,
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
  revalidateDispatch();
  revalidatePath("/driver");
  return;
}

async function notifyUserDriver(userId: string, number: string, orderId: string) {
  await prisma.notification.create({
    data: {
      userId,
      type: "ORDER_ASSIGNED",
      title: "Новая заявка",
      body: `Вам назначена заявка ${number}`,
      orderId,
    },
  });
  try {
    const { sendPushToUser } = await import("@/lib/push");
    await sendPushToUser(userId, {
      title: "Новая заявка",
      body: `Вам назначена заявка ${number}`,
      url: `/driver/orders/${orderId}`,
      orderId,
    });
  } catch {
    /* push optional */
  }
}

/** Диспетчер: следующий шаг статуса с канбана (без открытия карточки). */
export async function staffAdvanceOrderStatus(orderId: string) {
  const user = await requireStaff();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false as const, error: "Заявка не найдена" };

  const flow: Record<string, string> = {
    [ORDER_STATUSES.ASSIGNED]: ORDER_STATUSES.ACCEPTED,
    [ORDER_STATUSES.ACCEPTED]: ORDER_STATUSES.EN_ROUTE,
    [ORDER_STATUSES.EN_ROUTE]: ORDER_STATUSES.ON_SITE,
  };
  const next = flow[order.status];
  if (!next) return { ok: false as const, error: "Для этого статуса нет быстрого шага" };

  const data: { status: string; acceptedAt?: Date } = { status: next };
  if (next === ORDER_STATUSES.ACCEPTED && !order.acceptedAt) {
    data.acceptedAt = new Date();
  }
  await prisma.order.update({ where: { id: orderId }, data });
  await writeAudit({
    actorId: user.id,
    actorName: user.name,
    action: "ADVANCE",
    entity: "Order",
    entityId: orderId,
    orderId,
    detail: `${order.status} → ${next}`,
  });
  revalidatePath("/dispatch");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
  revalidateDispatch();
  revalidatePath("/driver");
  return { ok: true as const };
}

export async function cancelOrder(formData: FormData) {
  const user = await requireStaff();
  const orderId = String(formData.get("orderId") || "");
  const reason = String(formData.get("cancelReason") || "").trim();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      driver: { include: { user: true } },
    },
  });
  if (!order) return;
  if (["PAID", "CANCELLED"].includes(order.status)) return;

  await prisma.order.update({
    where: { id: orderId },
    data: { status: ORDER_STATUSES.CANCELLED, cancelReason: reason || "Отменена менеджером" },
  });
  if (order.equipmentId) {
    await prisma.equipment.update({ where: { id: order.equipmentId }, data: { status: "AVAILABLE" } });
  }

  const cancelReason = reason || "Отменена менеджером";
  const customerSms = await sendSms({
    to: order.customer.phone,
    purpose: SMS_TEMPLATE_KEYS.ORDER_CANCELLED_CUSTOMER,
    templateKey: SMS_TEMPLATE_KEYS.ORDER_CANCELLED_CUSTOMER,
    orderId,
    customerId: order.customerId,
    vars: { number: order.number, reason: cancelReason },
  });
  await notifyIfCustomerMaxSkipped({
    status: customerSms.status,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    orderNumber: order.number,
    orderId,
    context: "Отмена заявки",
  });

  if (order.driver?.user) {
    await sendSms({
      to: order.driver.user.phone || "",
      purpose: SMS_TEMPLATE_KEYS.ORDER_CANCELLED_DRIVER,
      templateKey: SMS_TEMPLATE_KEYS.ORDER_CANCELLED_DRIVER,
      text: `Заявка ${order.number} отменена. ${cancelReason}`,
      orderId,
      userId: order.driver.userId,
      vars: { number: order.number, reason: cancelReason },
    });
    await prisma.notification.create({
      data: {
        userId: order.driver.userId,
        type: "ORDER_CANCELLED",
        title: "Заявка отменена",
        body: `${order.number}: ${cancelReason}`,
        orderId,
      },
    });
  }

  await writeAudit({
    actorId: user.id,
    actorName: user.name,
    action: "CANCEL",
    entity: "Order",
    entityId: orderId,
    orderId,
    detail: cancelReason,
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
  revalidateDispatch();
  revalidatePath("/driver");
  return;
}

/** Только главный менеджер: принудительно поставить любой статус заявки. */
export async function forceSetOrderStatus(formData: FormData) {
  const user = await requireRoles([ROLES.ADMIN]);
  const orderId = String(formData.get("orderId") || "");
  const status = String(formData.get("status") || "") as OrderStatus;
  const note = String(formData.get("note") || "").trim();
  if (!orderId || !ALL_ORDER_STATUSES.has(status)) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { driver: { include: { user: true } }, customer: true },
  });
  if (!order) return;
  if (order.status === status) return;

  const prevLabel = ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status;
  const nextLabel = ORDER_STATUS_LABELS[status] || status;
  const stamp = `Принудительно: ${prevLabel} → ${nextLabel} (${user.name})`;
  const commentParts = [order.comment, stamp, note ? `Причина: ${note}` : null].filter(Boolean);

  const data: {
    status: string;
    comment: string;
    cancelReason?: string | null;
    acceptedAt?: Date | null;
    assignedAt?: Date | null;
  } = {
    status,
    comment: commentParts.join("\n"),
  };

  if (status === ORDER_STATUSES.CANCELLED) {
    data.cancelReason = note || `Принудительная отмена (${user.name})`;
  }
  if (status === ORDER_STATUSES.ACCEPTED && !order.acceptedAt) {
    data.acceptedAt = new Date();
  }
  if (status === ORDER_STATUSES.ASSIGNED && !order.assignedAt) {
    data.assignedAt = new Date();
  }
  if (status === ORDER_STATUSES.NEW || status === ORDER_STATUSES.DECLINED) {
    // leave assignment as-is; admin may have forced step back
  }

  await prisma.order.update({ where: { id: orderId }, data });

  if (order.equipmentId) {
    await prisma.equipment.update({
      where: { id: order.equipmentId },
      data: { status: LIVE_EQUIPMENT_STATUSES.has(status) ? "BUSY" : "AVAILABLE" },
    });
  }

  if (status === ORDER_STATUSES.CANCELLED && order.driver?.user) {
    const cancelReason = note || `Принудительная отмена (${user.name})`;
    await sendSms({
      to: order.driver.user.phone || "",
      purpose: SMS_TEMPLATE_KEYS.ORDER_CANCELLED_DRIVER,
      templateKey: SMS_TEMPLATE_KEYS.ORDER_CANCELLED_DRIVER,
      text: `Заявка ${order.number} отменена. ${cancelReason}`,
      orderId,
      userId: order.driver.userId,
      vars: { number: order.number, reason: cancelReason },
    });
    await prisma.notification.create({
      data: {
        userId: order.driver.userId,
        type: "ORDER_CANCELLED",
        title: "Заявка отменена",
        body: `${order.number}: ${cancelReason}`,
        orderId,
      },
    });
  }

  await notifyStaff({
    type: "ORDER_FORCE_STATUS",
    title: "Статус изменён вручную",
    body: `${user.name}: ${order.number} · ${prevLabel} → ${nextLabel}`,
    orderId,
    lines: [
      { value: order.number, strong: true },
      { icon: "👤", value: user.name },
      { icon: "🔁", value: `${prevLabel} → ${nextLabel}` },
      ...(note ? [{ icon: "💬", value: note }] : []),
    ],
  });
  await writeAudit({
    actorId: user.id,
    actorName: user.name,
    action: "FORCE_STATUS",
    entity: "Order",
    entityId: orderId,
    orderId,
    detail: `${prevLabel} → ${nextLabel}${note ? ` · ${note}` : ""}`,
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
  revalidateDispatch();
  revalidatePath("/driver");
}

function parseLinePayload(raw: FormDataEntryValue | null): DocLine[] {
  try {
    const parsed = JSON.parse(String(raw || "[]")) as DocLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseManualTotals(formData: FormData) {
  if (String(formData.get("manualTotals") || "") !== "1") return null;
  const totalRaw = String(formData.get("manualTotal") || "").trim();
  const vatRaw = String(formData.get("manualVatAmount") || "").trim();
  const total = totalRaw === "" ? null : Number(totalRaw);
  const vatAmount = vatRaw === "" ? null : Number(vatRaw);
  if (total != null && (!Number.isFinite(total) || total <= 0)) {
    return { error: "Укажите корректную итоговую сумму" as const };
  }
  if (vatAmount != null && (!Number.isFinite(vatAmount) || vatAmount < 0)) {
    return { error: "Укажите корректную сумму НДС" as const };
  }
  return {
    total: total != null ? roundMoney(total) : null,
    vatAmount: vatAmount != null ? roundMoney(vatAmount) : null,
  };
}

export async function saveOrderBilling(formData: FormData) {
  const user = await requireStaff();
  const orderId = String(formData.get("orderId") || "");
  const verify = String(formData.get("verify") || "") === "1";
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { report: true, invoice: true, organization: true },
  });
  if (!order?.report || order.invoice) return;
  if (!["REPORT_SUBMITTED", "VERIFIED"].includes(order.status)) return;

  const paymentMethod = String(formData.get("paymentMethod") || order.paymentMethod);
  const applied = await applyOrderPayment(orderId, paymentMethod, Number(formData.get("vatRate")));
  if (!applied) return;
  const calc = totalsFromLines(parseLinePayload(formData.get("lines")), applied.vatRate);

  await prisma.workReport.update({
    where: { id: order.report.id },
    data: { billingJson: JSON.stringify(calc) },
  });

  if (verify && order.status === ORDER_STATUSES.REPORT_SUBMITTED) {
    const forceGaps = String(formData.get("forceGaps") || "") === "1";
    if (!forceGaps) {
      const gaps = await getOrderRateGaps(orderId);
      if (gaps.length) {
        revalidatePath(`/orders/${orderId}`);
        redirect(
          `/orders/${orderId}?priceGaps=` +
            encodeURIComponent(gaps.map((g) => `${g.label}: ${g.amount} ₽`).join(" | ")),
        );
      }
    }
    await prisma.workReport.update({
      where: { id: order.report.id },
      data: { verifiedAt: new Date(), verifiedById: user.id },
    });
    await prisma.order.update({ where: { id: orderId }, data: { status: ORDER_STATUSES.VERIFIED } });
    if (order.equipmentId) {
      await prisma.equipment.update({ where: { id: order.equipmentId }, data: { status: "AVAILABLE" } });
    }
    await writeAudit({
      actorId: user.id,
      actorName: user.name,
      action: "VERIFY_REPORT",
      entity: "Order",
      entityId: orderId,
      orderId,
      detail: forceGaps ? "с нулевыми ставками" : null,
    });
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/");
  revalidateDispatch();
}

export async function updateOrderPayment(formData: FormData) {
  await requireStaff();
  const orderId = String(formData.get("orderId") || "");
  const paymentMethod = String(formData.get("paymentMethod") || "");
  if (!orderId || !paymentMethod) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { report: true, invoice: true },
  });
  if (!order || order.invoice) return;
  if (["PAID", "CANCELLED"].includes(order.status)) return;

  const applied = await applyOrderPayment(orderId, paymentMethod, Number(formData.get("vatRate")));
  if (!applied) return;

  const saved = parseBillingJson(order.report?.billingJson);
  if (order.report && saved) {
    await prisma.workReport.update({
      where: { id: order.report.id },
      data: { billingJson: JSON.stringify(totalsFromLines(saved.lines, applied.vatRate)) },
    });
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/");
  revalidateDispatch();
}

export async function verifyReport(orderId: string, opts?: { forceGaps?: boolean }) {
  const user = await requireStaff();
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { report: true } });
  if (!order?.report) return { ok: false as const, error: "Нет отчёта" };
  if (order.status !== ORDER_STATUSES.REPORT_SUBMITTED) {
    return { ok: false as const, error: "Отчёт уже проверен или ещё не сдан" };
  }

  if (!opts?.forceGaps) {
    const gaps = await getOrderRateGaps(orderId);
    if (gaps.length) {
      return {
        ok: false as const,
        needsConfirm: true as const,
        gaps: gaps.map((g) => `${g.label}: ${g.amount} ₽`),
      };
    }
  }

  if (!parseBillingJson(order.report.billingJson)) {
    const calc = await calculateFromReport(orderId);
    await prisma.workReport.update({
      where: { id: order.report.id },
      data: { billingJson: JSON.stringify(calc) },
    });
  }

  await prisma.workReport.update({
    where: { id: order.report.id },
    data: { verifiedAt: new Date(), verifiedById: user.id },
  });
  await prisma.order.update({ where: { id: orderId }, data: { status: ORDER_STATUSES.VERIFIED } });
  if (order.equipmentId) {
    await prisma.equipment.update({ where: { id: order.equipmentId }, data: { status: "AVAILABLE" } });
  }
  await writeAudit({
    actorId: user.id,
    actorName: user.name,
    action: "VERIFY_REPORT",
    entity: "Order",
    entityId: orderId,
    orderId,
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
  revalidateDispatch();
  return { ok: true as const };
}

export async function generateDocuments(orderId: string, opts?: { forceGaps?: boolean }) {
  const user = await requireStaff();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, organization: true, report: true, invoice: true, act: true },
  });
  if (!order) return { ok: false as const, error: "Заявка не найдена" };
  if (!order.report) return { ok: false as const, error: "Нет отчёта" };
  if (!["VERIFIED", "AWAITING_PAYMENT"].includes(order.status)) {
    return { ok: false as const, error: "Сначала проверьте отчёт" };
  }
  if (order.invoice && order.act) return { ok: true as const };

  if (!opts?.forceGaps) {
    const gaps = await getOrderRateGaps(orderId);
    if (gaps.length) {
      return {
        ok: false as const,
        needsConfirm: true as const,
        gaps: gaps.map((g) => `${g.label}: ${g.amount} ₽`),
      };
    }
  }

  const calc = await calculateFromReport(orderId);
  return createBoundDocuments({
    orderId,
    actorId: user.id,
    actorName: user.name,
    paymentMethod: order.paymentMethod,
    vatRate: calc.vatRate,
    lines: calc.lines,
  });
}

/** Ручное выставление счёта и акта с привязкой к заявке (строки задаёт менеджер). */
export async function issueManualDocuments(formData: FormData) {
  const user = await requireStaff();
  const orderId = String(formData.get("orderId") || "");
  if (!orderId) return { ok: false as const, error: "Нет заявки" };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { invoice: true, act: true, report: true },
  });
  if (!order) return { ok: false as const, error: "Заявка не найдена" };
  if (order.status === ORDER_STATUSES.CANCELLED) {
    return { ok: false as const, error: "По отменённой заявке документы не выставляют" };
  }
  if (order.invoice || order.act) {
    return { ok: false as const, error: "Счёт или акт по этой заявке уже есть" };
  }

  const paymentMethod = String(formData.get("paymentMethod") || order.paymentMethod);
  const applied = await applyOrderPayment(orderId, paymentMethod, Number(formData.get("vatRate")));
  if (!applied) return { ok: false as const, error: "Нет юрлица для выбранной оплаты" };

  const customerId = String(formData.get("customerId") || "").trim();
  if (customerId && customerId !== order.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!customer) return { ok: false as const, error: "Заказчик не найден" };
    await prisma.order.update({ where: { id: orderId }, data: { customerId } });
  }

  const calcBase = totalsFromLines(parseLinePayload(formData.get("lines")), applied.vatRate);
  const manual = parseManualTotals(formData);
  if (manual && "error" in manual) return { ok: false as const, error: manual.error };
  const calc = applyManualTotals(calcBase, manual);
  if (!calc.lines.length || calc.total <= 0) {
    return { ok: false as const, error: "Добавьте хотя бы одну позицию с суммой" };
  }

  if (order.report) {
    await prisma.workReport.update({
      where: { id: order.report.id },
      data: { billingJson: JSON.stringify(calc) },
    });
  }

  return createBoundDocuments({
    orderId,
    actorId: user.id,
    actorName: user.name,
    paymentMethod,
    vatRate: calc.vatRate,
    lines: calc.lines,
    paymentPurpose: String(formData.get("paymentPurpose") || "").trim() || undefined,
    total: calc.total,
    vatAmount: calc.vatAmount,
  });
}

async function createBoundDocuments(input: {
  orderId: string;
  actorId: string;
  actorName: string;
  paymentMethod: string;
  vatRate: number;
  lines: DocLine[];
  paymentPurpose?: string | null;
  total?: number | null;
  vatAmount?: number | null;
}) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { customer: true, organization: true, invoice: true, act: true },
  });
  if (!order) return { ok: false as const, error: "Заявка не найдена" };
  if (order.invoice && order.act) return { ok: true as const };

  const calc = applyManualTotals(totalsFromLines(input.lines, input.vatRate), {
    total: input.total,
    vatAmount: input.vatAmount,
  });
  if (!calc.lines.length || calc.total <= 0) {
    return { ok: false as const, error: "Пустой расчёт" };
  }

  const orgMatch = await prisma.organization.findUnique({ where: { paymentMethod: input.paymentMethod } });
  const orgId = orgMatch?.id ?? order.organizationId;
  if (orgMatch && orgMatch.id !== order.organizationId) {
    await prisma.order.update({ where: { id: input.orderId }, data: { organizationId: orgMatch.id } });
  }

  const year = new Date().getFullYear();
  const invoiceToken = randomToken();
  const actToken = randomToken();
  const dueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { invoice, act } = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.update({
      where: { id: orgId },
      data: { lastInvoiceNo: { increment: 1 }, lastActNo: { increment: 1 } },
    });
    const invoiceNumber = `${org.invoicePrefix}-${year}-${String(org.lastInvoiceNo).padStart(4, "0")}`;
    const actNumber = `${org.actPrefix}-${year}-${String(org.lastActNo).padStart(4, "0")}`;
    const linesJson = JSON.stringify(calc.lines);
    const issuedAt = new Date();
    const paymentPurpose =
      input.paymentPurpose?.trim() ||
      defaultPaymentPurpose({
        invoiceNumber,
        issuedAt,
        orderNumber: order.number,
        total: calc.total,
        vatRate: calc.vatRate,
      });

    const invoiceRow = await tx.invoice.create({
      data: {
        number: invoiceNumber,
        orderId: input.orderId,
        organizationId: org.id,
        amount: calc.total,
        vatAmount: calc.vatAmount,
        vatRate: calc.vatRate,
        publicToken: invoiceToken,
        linesJson,
        dueAt,
        paymentPurpose,
      },
    });
    const actRow = await tx.act.create({
      data: {
        number: actNumber,
        orderId: input.orderId,
        organizationId: org.id,
        amount: calc.total,
        vatAmount: calc.vatAmount,
        vatRate: calc.vatRate,
        publicToken: actToken,
        linesJson,
      },
    });
    await tx.order.update({
      where: { id: input.orderId },
      data: { status: ORDER_STATUSES.AWAITING_PAYMENT },
    });
    return { invoice: invoiceRow, act: actRow };
  });

  const appUrl = publicAppUrl();
  const docsSms = await sendSms({
    to: order.customer.phone,
    purpose: SMS_TEMPLATE_KEYS.ORDER_DOCS_READY,
    templateKey: SMS_TEMPLATE_KEYS.ORDER_DOCS_READY,
    orderId: input.orderId,
    customerId: order.customerId,
    vars: {
      number: order.number,
      invoice: invoice.number,
      act: act.number,
      url: `${appUrl}/d/${invoice.publicToken}`,
    },
  });
  await notifyIfCustomerMaxSkipped({
    status: docsSms.status,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    orderNumber: order.number,
    orderId: input.orderId,
    context: "Счёт и акт",
  });
  await writeAudit({
    actorId: input.actorId,
    actorName: input.actorName,
    action: "GENERATE_DOCS",
    entity: "Order",
    entityId: input.orderId,
    orderId: input.orderId,
    detail: `${invoice.number} / ${act.number}`,
  });

  revalidatePath(`/orders/${input.orderId}`);
  revalidatePath("/documents");
  revalidatePath("/finance");
  revalidatePath("/");
  revalidateDispatch();
  return { ok: true as const };
}

/** Правка уже выставленных счёта и акта (позиции, НДС, способ оплаты). */
export async function updateOrderDocuments(formData: FormData) {
  const user = await requireStaff();
  const orderId = String(formData.get("orderId") || "");
  if (!orderId) return { ok: false as const, error: "Нет заявки" };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      invoice: { include: { payments: true } },
      act: true,
      report: true,
      customer: { select: { id: true, name: true } },
    },
  });
  if (!order?.invoice || !order.act) {
    return { ok: false as const, error: "Сначала выставьте счёт и акт" };
  }
  if (order.status === ORDER_STATUSES.CANCELLED) {
    return { ok: false as const, error: "Заявка отменена" };
  }

  const paymentMethod = String(formData.get("paymentMethod") || order.paymentMethod);
  const applied = await applyOrderPayment(orderId, paymentMethod, Number(formData.get("vatRate")));
  if (!applied) return { ok: false as const, error: "Нет юрлица для выбранной оплаты" };

  const customerId = String(formData.get("customerId") || "").trim() || order.customerId;
  let customerName = order.customer.name;
  if (customerId !== order.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true } });
    if (!customer) return { ok: false as const, error: "Заказчик не найден" };
    customerName = customer.name;
  }

  const calcBase = totalsFromLines(parseLinePayload(formData.get("lines")), applied.vatRate);
  const manual = parseManualTotals(formData);
  if (manual && "error" in manual) return { ok: false as const, error: manual.error };
  const calc = applyManualTotals(calcBase, manual);
  if (!calc.lines.length || calc.total <= 0) {
    return { ok: false as const, error: "Добавьте хотя бы одну позицию с суммой" };
  }

  const paymentPurposeRaw = String(formData.get("paymentPurpose") || "").trim();
  const paymentPurpose =
    paymentPurposeRaw ||
    defaultPaymentPurpose({
      invoiceNumber: order.invoice.number,
      issuedAt: order.invoice.issuedAt,
      orderNumber: order.number,
      total: calc.total,
      vatRate: calc.vatRate,
    });

  const paid = order.invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
  if (paid > calc.total + 0.01) {
    return {
      ok: false as const,
      error: `Уже оплачено ${paid.toLocaleString("ru-RU")} ₽ — итог не может быть меньше`,
    };
  }

  const status = paid <= 0.01 ? "UNPAID" : paid >= calc.total - 0.01 ? "PAID" : "PARTIAL";
  const linesJson = JSON.stringify(calc.lines);

  await prisma.$transaction(async (tx) => {
    const orderPatch: { customerId?: string; status?: string } = {};
    if (customerId !== order.customerId) orderPatch.customerId = customerId;
    if (status === "PAID" && order.status !== ORDER_STATUSES.PAID) {
      orderPatch.status = ORDER_STATUSES.PAID;
    } else if (status !== "PAID" && order.status === ORDER_STATUSES.PAID) {
      orderPatch.status = ORDER_STATUSES.AWAITING_PAYMENT;
    }
    if (Object.keys(orderPatch).length) {
      await tx.order.update({ where: { id: orderId }, data: orderPatch });
    }
    await tx.invoice.update({
      where: { id: order.invoice!.id },
      data: {
        amount: calc.total,
        vatAmount: calc.vatAmount,
        vatRate: calc.vatRate,
        linesJson,
        organizationId: applied.org.id,
        status,
        paymentPurpose,
      },
    });
    await tx.act.update({
      where: { id: order.act!.id },
      data: {
        amount: calc.total,
        vatAmount: calc.vatAmount,
        vatRate: calc.vatRate,
        linesJson,
        organizationId: applied.org.id,
      },
    });
    if (order.report) {
      await tx.workReport.update({
        where: { id: order.report.id },
        data: { billingJson: JSON.stringify(calc) },
      });
    }
  });

  await writeAudit({
    actorId: user.id,
    actorName: user.name,
    action: "EDIT_DOCS",
    entity: "Order",
    entityId: orderId,
    orderId,
    detail:
      customerId !== order.customerId
        ? `${order.invoice.number} / ${order.act.number} → ${calc.total} ₽ · заказчик ${customerName}`
        : `${order.invoice.number} / ${order.act.number} → ${calc.total} ₽`,
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/documents");
  revalidatePath("/finance");
  revalidatePath("/customers");
  revalidatePath("/");
  revalidateDispatch();
  return { ok: true as const };
}

export async function recordPayment(formData: FormData) {
  const user = await requireStaff();
  const invoiceId = String(formData.get("invoiceId") || "");
  const amount = Number(formData.get("amount") || 0);
  const comment = String(formData.get("comment") || "") || null;
  if (!invoiceId || !amount) return;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { order: true, payments: true },
  });
  if (!invoice) return;

  const recorder = await prisma.user.findUnique({ where: { id: user.id } });
  await prisma.payment.create({
    data: {
      invoiceId,
      amount,
      comment,
      recordedById: recorder?.id ?? null,
    },
  });
  const paid = invoice.payments.reduce((s, p) => s + p.amount, 0) + amount;
  const status = paid >= invoice.amount - 0.01 ? "PAID" : "PARTIAL";
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
  if (status === "PAID") {
    await prisma.order.update({ where: { id: invoice.orderId }, data: { status: ORDER_STATUSES.PAID } });
  }
  await notifyStaff({
    type: "PAYMENT",
    title: "Поступила оплата",
    body: `По счёту ${invoice.number} отмечена оплата ${amount.toLocaleString("ru-RU")} ₽`,
    orderId: invoice.orderId,
    lines: [
      { value: invoice.order.number, strong: true },
      { icon: "📄", value: `Счёт ${invoice.number}` },
      { icon: "💰", value: `${amount.toLocaleString("ru-RU")} ₽` },
    ],
  });
  await writeAudit({
    actorId: user.id,
    actorName: user.name,
    action: "PAYMENT",
    entity: "Invoice",
    entityId: invoiceId,
    orderId: invoice.orderId,
    detail: `${amount} ₽ · ${invoice.number}`,
  });
  revalidatePath(`/orders/${invoice.orderId}`);
  revalidatePath("/documents");
  revalidatePath("/finance");
  revalidatePath("/");
  revalidateDispatch();
  return;
}

export async function remindOverdueInvoice(invoiceId: string) {
  await requireStaff();
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      order: { include: { customer: true } },
      payments: true,
    },
  });
  if (!invoice || invoice.status === "PAID") return { ok: false as const, error: "Счёт не найден" };
  const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(invoice.amount - paid, 0);
  if (remaining <= 0.01) return { ok: false as const, error: "Счёт уже закрыт" };

  const appUrl = publicAppUrl();
  const sms = await sendSms({
    to: invoice.order.customer.phone,
    purpose: "INVOICE_REMINDER",
    text: `Рэдианс-СпецТех: напоминание по счёту ${invoice.number}. К оплате ${Math.round(remaining).toLocaleString("ru-RU")} ₽. ${appUrl}/d/${invoice.publicToken}`,
    orderId: invoice.orderId,
    customerId: invoice.order.customerId,
    vars: {
      number: invoice.order.number,
      invoice: invoice.number,
      amount: String(Math.round(remaining)),
      url: `${appUrl}/d/${invoice.publicToken}`,
    },
  });
  await notifyIfCustomerMaxSkipped({
    status: sms.status,
    customerName: invoice.order.customer.name,
    customerPhone: invoice.order.customer.phone,
    orderNumber: invoice.order.number,
    orderId: invoice.orderId,
    context: "Напоминание об оплате",
  });
  return { ok: true as const, status: sms.status };
}

export async function repeatOrderInDays(orderId: string, days = 7) {
  const user = await requireStaff();
  const src = await prisma.order.findUnique({ where: { id: orderId } });
  if (!src) return;
  const number = await nextOrderNumber();
  const scheduledAt = new Date(src.scheduledAt.getTime() + days * 24 * 60 * 60 * 1000);
  const order = await prisma.order.create({
    data: {
      number,
      customerId: src.customerId,
      organizationId: src.organizationId,
      paymentMethod: src.paymentMethod,
      vatRate: src.vatRate,
      equipmentTypeId: src.equipmentTypeId,
      address: src.address,
      siteContact: src.siteContact,
      sitePhone: src.sitePhone,
      scheduledAt,
      comment: [src.comment, `Повтор через ${days} дн. от ${src.number}`].filter(Boolean).join("\n"),
      createdById: user.id,
      status: ORDER_STATUSES.NEW,
    },
  });
  await writeAudit({
    actorId: user.id,
    actorName: user.name,
    action: "REPEAT",
    entity: "Order",
    entityId: order.id,
    orderId: order.id,
    detail: `из ${src.number} +${days}д`,
  });
  revalidatePath("/orders");
  revalidateDispatch();
  redirect(`/orders/${order.id}`);
}

export async function saveOrderAsTemplate(orderId: string, name?: string) {
  const user = await requireStaff();
  const src = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, equipmentType: true },
  });
  if (!src) return;
  await prisma.orderTemplate.create({
    data: {
      name: name?.trim() || `${src.customer.name} · ${src.equipmentType.name}`,
      customerId: src.customerId,
      paymentMethod: src.paymentMethod,
      vatRate: src.vatRate,
      equipmentTypeId: src.equipmentTypeId,
      address: src.address,
      siteContact: src.siteContact,
      sitePhone: src.sitePhone,
      comment: src.comment,
      intervalDays: 7,
      createdById: user.id,
    },
  });
  revalidatePath("/orders/new");
  revalidatePath(`/orders/${orderId}`);
}

export async function createOrderFromTemplate(templateId: string) {
  const user = await requireStaff();
  const tpl = await prisma.orderTemplate.findUnique({ where: { id: templateId } });
  if (!tpl || !tpl.active) {
    redirect("/orders/new?error=" + encodeURIComponent("Шаблон не найден"));
  }
  const org = await prisma.organization.findUnique({ where: { paymentMethod: tpl.paymentMethod } });
  if (!org) {
    redirect("/orders/new?error=" + encodeURIComponent("Нет юрлица для оплаты шаблона"));
  }
  const when = parseOmskDatetimeLocal(omskTomorrowLocalPlus(tpl.intervalDays));
  if (!when) {
    redirect("/orders/new?error=" + encodeURIComponent("Не удалось посчитать дату"));
  }
  const number = await nextOrderNumber();
  const order = await prisma.order.create({
    data: {
      number,
      customerId: tpl.customerId,
      organizationId: org.id,
      paymentMethod: tpl.paymentMethod,
      vatRate: tpl.vatRate ?? org.vatRate,
      equipmentTypeId: tpl.equipmentTypeId,
      address: tpl.address,
      siteContact: tpl.siteContact,
      sitePhone: tpl.sitePhone,
      scheduledAt: when,
      comment: tpl.comment,
      createdById: user.id,
      status: ORDER_STATUSES.NEW,
    },
  });
  revalidatePath("/orders");
  revalidateDispatch();
  redirect(`/orders/${order.id}`);
}

function omskTomorrowLocalPlus(days: number) {
  const base = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const ymd = omskYmd(base);
  return `${ymd}T08:00`;
}
