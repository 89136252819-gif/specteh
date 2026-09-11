"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { notifyStaff, type StaffNoticeLine } from "@/lib/notifications";
import { revalidateDispatch } from "@/lib/revalidate-ops";
import { CUSTOMER_TYPES, ORDER_STATUSES, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, SMS_TEMPLATE_KEYS, STAFF_ROLES, type PaymentMethod } from "@/lib/constants";
import { nextOrderNumber } from "@/lib/order-number";
import { isHiddenFromPublicCatalog } from "@/lib/public-catalog";
import { sendSms } from "@/lib/sms";
import { formatDriverWhen, formatPhoneMask, mapsHref, parseOmskDatetimeLocal, randomToken } from "@/lib/utils";

export type PublicOrderState =
  | { error?: string; ok?: boolean; number?: string; phone?: string; bindToken?: string }
  | null;

function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

function normalizePhone(phone: string) {
  const d = digits(phone);
  if (d.length === 11 && (d.startsWith("7") || d.startsWith("8"))) return `+7${d.slice(1)}`;
  if (d.length === 10) return `+7${d}`;
  return phone.trim();
}

export async function submitPublicOrder(
  _prev: PublicOrderState,
  formData: FormData,
): Promise<PublicOrderState> {
  if (String(formData.get("website") || "").trim()) {
    return { ok: true };
  }

  const name = String(formData.get("name") || "").trim();
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const company = String(formData.get("company") || "").trim();
  const equipmentTypeId = String(formData.get("equipmentTypeId") || "");
  const address = String(formData.get("address") || "").trim();
  const scheduledAt = String(formData.get("scheduledAt") || "");
  const comment = String(formData.get("comment") || "").trim();
  const paymentMethod = String(formData.get("paymentMethod") || PAYMENT_METHODS.CASHLESS_VAT) as PaymentMethod;
  const allowedPay = Object.values(PAYMENT_METHODS) as string[];
  if (!allowedPay.includes(paymentMethod)) return { error: "Выберите способ оплаты" };

  if (!name || digits(phone).length < 10) {
    return { error: "Укажите имя и телефон" };
  }
  if (!equipmentTypeId) return { error: "Выберите тип техники" };
  if (!address) return { error: "Укажите адрес объекта" };
  if (!scheduledAt) return { error: "Укажите дату и время" };

  const when = parseOmskDatetimeLocal(scheduledAt);
  if (!when) return { error: "Некорректная дата" };

  const type = await prisma.equipmentType.findUnique({ where: { id: equipmentTypeId } });
  if (!type || isHiddenFromPublicCatalog(type.name)) return { error: "Такой техники нет в парке" };

  const org = await prisma.organization.findUnique({ where: { paymentMethod } });
  if (!org) {
    return { error: "Для выбранного способа оплаты нет юрлица. Выберите другой способ или обратитесь к диспетчеру." };
  }

  const creator =
    (await prisma.user.findFirst({ where: { isActive: true, role: "ADMIN" } })) ||
    (await prisma.user.findFirst({ where: { isActive: true, role: { in: [...STAFF_ROLES] } } }));
  if (!creator) return { error: "Приём заявок временно недоступен" };

  const phoneKey = digits(phone).slice(-10);
  const existing = phoneKey
    ? (
        await prisma.customer.findMany({
          where: { phone: { contains: phoneKey } },
          take: 20,
        })
      ).find((row) => digits(row.phone).slice(-10) === phoneKey) || null
    : null;

  let customer = existing;
  if (existing) {
    customer = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: company || name,
        contactName: name,
        phone,
        ...(company ? { type: CUSTOMER_TYPES.COMPANY } : {}),
      },
    });
  } else {
    customer = await prisma.customer.create({
      data: {
        type: company ? CUSTOMER_TYPES.COMPANY : CUSTOMER_TYPES.INDIVIDUAL,
        name: company || name,
        contactName: name,
        phone,
        defaultPaymentMethod: paymentMethod,
        notes: "Заявка с сайта",
      },
    });
  }

  if (!customer) return { error: "Не удалось сохранить заказчика" };

  const number = await nextOrderNumber();
  const bindToken = randomToken().slice(0, 20);
  const extra = [
    "Заявка с сайта specteh",
    company ? `Компания: ${company}` : null,
    `Оплата: ${PAYMENT_METHOD_LABELS[paymentMethod]}`,
    comment || null,
  ]
    .filter(Boolean)
    .join("\n");

  const order = await prisma.order.create({
    data: {
      number,
      customerId: customer.id,
      organizationId: org.id,
      paymentMethod,
      vatRate: org.vatRate,
      equipmentTypeId: type.id,
      address,
      siteContact: name,
      sitePhone: phone,
      scheduledAt: when,
      comment: extra,
      createdById: creator.id,
      status: ORDER_STATUSES.NEW,
    },
  });
  await prisma.$executeRaw`UPDATE "Order" SET maxBindToken = ${bindToken} WHERE id = ${order.id}`;

  const maxLinked = Boolean(customer.maxUserId);
  const lines: StaffNoticeLine[] = [
    { value: number, strong: true },
    { icon: "👤", value: name },
  ];
  if (company) lines.push({ icon: "🏢", value: company });
  lines.push(
    { icon: "📞", value: formatPhoneMask(phone) },
    { icon: "🚚", value: type.name },
    { icon: "📍", value: address, href: mapsHref(address) },
    { icon: "🕐", value: formatDriverWhen(when) },
    { icon: "💳", value: PAYMENT_METHOD_LABELS[paymentMethod] },
  );
  if (comment) lines.push({ icon: "💬", value: comment });
  if (!maxLinked) {
    lines.push({ icon: "⚠️", value: "MAX не привязан — клиент может не получить уведомления" });
  }

  await notifyStaff({
    type: "PUBLIC_ORDER",
    title: maxLinked ? "Заявка с сайта" : "Заявка с сайта · без MAX",
    body: `${name}, ${phone}: ${type.name} · ${address}${maxLinked ? "" : " · MAX не привязан"}`,
    orderId: order.id,
    lines,
  });
  await prisma.smsTemplate.upsert({
    where: { key: SMS_TEMPLATE_KEYS.PUBLIC_ORDER_CUSTOMER },
    update: {},
    create: {
      key: SMS_TEMPLATE_KEYS.PUBLIC_ORDER_CUSTOMER,
      name: "Заказчику: заявка с сайта",
      text: "Рэдианс-СпецТех: заявка {number} принята. Диспетчер перезвонит и подтвердит подачу.",
    },
  });
  try {
    await sendSms({
      to: phone,
      purpose: SMS_TEMPLATE_KEYS.PUBLIC_ORDER_CUSTOMER,
      templateKey: SMS_TEMPLATE_KEYS.PUBLIC_ORDER_CUSTOMER,
      text: `Рэдианс-СпецТех: заявка ${number} принята. Диспетчер перезвонит и подтвердит подачу.`,
      vars: { number, equipment: type.name },
      orderId: order.id,
      customerId: customer.id,
    });
  } catch (error) {
    console.error("[MAX] customer", error instanceof Error ? error.message : error);
  }

  revalidatePath("/orders");
  revalidatePath("/");
  revalidateDispatch();
  return { ok: true, number, phone, bindToken };
}
