"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireDriver } from "@/lib/auth";
import { notifyStaff } from "@/lib/notifications";
import { ORDER_STATUSES } from "@/lib/constants";
import { revalidateDispatch } from "@/lib/revalidate-ops";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { parsePhotos } from "@/lib/utils";

function photoExt(file: File) {
  const fromName = path.extname(file.name).replace(".", "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(fromName)) return fromName === "jpeg" ? "jpg" : fromName;
  const mime = file.type.toLowerCase();
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("heic")) return "heic";
  if (mime.includes("heif")) return "heif";
  return "jpg";
}

const DRIVER_FLOW: Record<string, string> = {
  [ORDER_STATUSES.ASSIGNED]: ORDER_STATUSES.ACCEPTED,
  [ORDER_STATUSES.ACCEPTED]: ORDER_STATUSES.EN_ROUTE,
  [ORDER_STATUSES.EN_ROUTE]: ORDER_STATUSES.ON_SITE,
};

export async function driverAccept(orderId: string) {
  const session = await requireDriver();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.driverId !== session.driverId) return;
  if (order.status !== ORDER_STATUSES.ASSIGNED) return;

  await prisma.order.update({
    where: { id: orderId },
    data: { status: ORDER_STATUSES.ACCEPTED, acceptedAt: new Date() },
  });
  await notifyStaff({
    type: "DRIVER_ACCEPTED",
    title: "Водитель принял заявку",
    body: `${session.name} принял заявку ${order.number}`,
    orderId,
    lines: [
      { value: order.number, strong: true },
      { icon: "👤", value: session.name },
    ],
  });
  revalidatePath("/driver");
  revalidatePath(`/driver/orders/${orderId}`);
  revalidatePath(`/orders/${orderId}`);
  revalidateDispatch();
  return;
}

export async function driverDecline(orderId: string, reason: string) {
  const session = await requireDriver();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.driverId !== session.driverId) return;
  if (order.status !== ORDER_STATUSES.ASSIGNED) return;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: ORDER_STATUSES.DECLINED,
      comment: [order.comment, `Отказ водителя: ${reason}`].filter(Boolean).join("\n"),
      driverId: null,
    },
  });
  if (order.equipmentId) {
    await prisma.equipment.update({ where: { id: order.equipmentId }, data: { status: "AVAILABLE" } });
  }
  await notifyStaff({
    type: "DRIVER_DECLINED",
    title: "Отказ водителя",
    body: `${session.name} отказался от заявки ${order.number}. ${reason}`,
    orderId,
    lines: [
      { value: order.number, strong: true },
      { icon: "👤", value: session.name },
      { icon: "💬", value: reason },
    ],
  });
  revalidatePath("/driver");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
  revalidateDispatch();
  return;
}

export async function driverAdvance(orderId: string) {
  const session = await requireDriver();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.driverId !== session.driverId) return;
  const next = DRIVER_FLOW[order.status];
  if (!next) return;

  await prisma.order.update({ where: { id: orderId }, data: { status: next } });

  const title =
    next === ORDER_STATUSES.EN_ROUTE
      ? "Водитель выехал"
      : next === ORDER_STATUSES.ON_SITE
        ? "Водитель на объекте"
        : "Статус заявки обновлён";
  const body =
    next === ORDER_STATUSES.EN_ROUTE
      ? `${session.name} выехал по заявке ${order.number}`
      : next === ORDER_STATUSES.ON_SITE
        ? `${session.name} на объекте по заявке ${order.number}`
        : `${session.name}: ${order.number} → ${next}`;

  await notifyStaff({
    type: next === ORDER_STATUSES.EN_ROUTE ? "DRIVER_EN_ROUTE" : "DRIVER_ON_SITE",
    title,
    body,
    orderId,
    lines: [
      { value: order.number, strong: true },
      { icon: "👤", value: session.name },
      { icon: "📍", value: order.address },
    ],
  });

  revalidatePath("/driver");
  revalidatePath(`/driver/orders/${orderId}`);
  revalidatePath(`/orders/${orderId}`);
  revalidateDispatch();
  return;
}

export async function submitReport(orderId: string, formData: FormData) {
  const session = await requireDriver();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { report: true },
  });
  if (!order || order.driverId !== session.driverId) return;
  if (order.status !== ORDER_STATUSES.ON_SITE) return;

  const hours = Number(formData.get("hours") || 0);
  const idleHours = Number(formData.get("idleHours") || 0);
  const km = Number(formData.get("km") || 0);
  const deliveryQty = Number(formData.get("deliveryQty") || 1);
  const comment = String(formData.get("comment") || "") || null;
  const isWeekend = formData.get("isWeekend") === "on";

  const photos: string[] = [];
  const files = formData.getAll("photos");
  const uploadDir = path.join(process.cwd(), "public", "uploads", "reports", orderId);
  await mkdir(uploadDir, { recursive: true });
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    const safe = `${Date.now()}-${photos.length}.${photoExt(file)}`;
    await writeFile(path.join(uploadDir, safe), buf);
    photos.push(`/uploads/reports/${orderId}/${safe}`);
  }
  if (!photos.length && order.report) {
    photos.push(...parsePhotos(order.report.photosJson));
  }
  if (!photos.length) {
    return { error: "Добавьте хотя бы одно фото объекта или счётчика" };
  }

  await prisma.workReport.upsert({
    where: { orderId },
    create: {
      orderId,
      hours,
      idleHours,
      km,
      deliveryQty,
      isWeekend,
      comment,
      photosJson: JSON.stringify(photos),
    },
    update: {
      hours,
      idleHours,
      km,
      deliveryQty,
      isWeekend,
      comment,
      photosJson: JSON.stringify(photos),
      submittedAt: new Date(),
    },
  });
  await prisma.order.update({
    where: { id: orderId },
    data: { status: ORDER_STATUSES.REPORT_SUBMITTED },
  });
  await notifyStaff({
    type: "REPORT_SUBMITTED",
    title: "Отчёт сдан",
    body: `${session.name} сдал отчёт по заявке ${order.number}`,
    orderId,
    lines: [
      { value: order.number, strong: true },
      { icon: "👤", value: session.name },
      { icon: "⏱", value: `${hours} ч${idleHours ? ` · простой ${idleHours} ч` : ""}` },
      ...(km ? [{ icon: "🛣", value: `${km} км` }] : []),
    ],
  });
  revalidatePath("/driver");
  revalidatePath(`/driver/orders/${orderId}`);
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
  revalidateDispatch();
  return { ok: true as const };
}

export async function startShift() {
  const session = await requireDriver();
  const open = await prisma.driverShift.findFirst({
    where: { driverId: session.driverId, endedAt: null },
  });
  if (open) return;

  await prisma.driverShift.create({
    data: { driverId: session.driverId, startedAt: new Date() },
  });
  await notifyStaff({
    type: "SHIFT_STARTED",
    title: "Смена начата",
    body: `${session.name} начал рабочую смену`,
    lines: [{ icon: "👤", value: session.name }],
  });
  revalidatePath("/driver");
  revalidatePath("/driver/shift");
  revalidatePath("/drivers");
  revalidatePath("/drivers/timesheet");
  revalidatePath("/");
  revalidateDispatch();
}

export async function endShift(force = false) {
  const session = await requireDriver();
  const open = await prisma.driverShift.findFirst({
    where: { driverId: session.driverId, endedAt: null },
  });
  if (!open) return { ok: false as const };

  const live = await prisma.order.findMany({
    where: {
      driverId: session.driverId,
      status: {
        in: [
          ORDER_STATUSES.ASSIGNED,
          ORDER_STATUSES.ACCEPTED,
          ORDER_STATUSES.EN_ROUTE,
          ORDER_STATUSES.ON_SITE,
        ],
      },
    },
    select: { number: true, status: true },
    orderBy: { scheduledAt: "asc" },
  });
  if (live.length && !force) {
    return { ok: false as const, needsConfirm: true as const, live };
  }

  await prisma.driverShift.update({
    where: { id: open.id },
    data: { endedAt: new Date() },
  });
  await notifyStaff({
    type: "SHIFT_ENDED",
    title: "Смена завершена",
    body: `${session.name} завершил рабочую смену${live.length ? ` · живые: ${live.map((o) => o.number).join(", ")}` : ""}`,
    lines: [{ icon: "👤", value: session.name }],
  });
  revalidatePath("/driver");
  revalidatePath("/driver/shift");
  revalidatePath("/drivers");
  revalidatePath("/drivers/timesheet");
  revalidatePath("/");
  revalidateDispatch();
  return { ok: true as const };
}
