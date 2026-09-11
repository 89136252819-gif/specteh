"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyStaff } from "@/lib/notifications";
import { revalidateDispatch } from "@/lib/revalidate-ops";
import { ORDER_STATUSES } from "@/lib/constants";

const LIVE_SHIFT_STATUSES = [
  ORDER_STATUSES.ASSIGNED,
  ORDER_STATUSES.ACCEPTED,
  ORDER_STATUSES.EN_ROUTE,
  ORDER_STATUSES.ON_SITE,
];

export type LiveShiftOrder = { number: string; status: string };

export async function getDriverLiveOrders(driverId: string): Promise<LiveShiftOrder[]> {
  await requireStaff();
  return prisma.order.findMany({
    where: { driverId, status: { in: LIVE_SHIFT_STATUSES } },
    select: { number: true, status: true },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function endDriverShift(driverId: string, force = false) {
  await requireStaff();
  const open = await prisma.driverShift.findFirst({
    where: { driverId, endedAt: null },
    include: { driver: { include: { user: { select: { name: true } } } } },
  });
  if (!open) return { ok: false as const, error: "Смена уже закрыта" };

  const live = await prisma.order.findMany({
    where: { driverId, status: { in: LIVE_SHIFT_STATUSES } },
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
    body: `${open.driver.user.name} снят с линии${live.length ? ` (были живые заявки: ${live.map((o) => o.number).join(", ")})` : ""}`,
    lines: [
      { icon: "👤", value: open.driver.user.name },
      { icon: "💬", value: live.length ? "Снят с линии при живых заявках" : "Снят с линии диспетчером" },
    ],
  });
  revalidatePath("/driver");
  revalidatePath("/driver/shift");
  revalidatePath("/drivers");
  revalidatePath("/drivers/timesheet");
  revalidatePath("/");
  revalidateDispatch();
  return { ok: true as const };
}
