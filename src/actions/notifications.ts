"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidateStaffNotices } from "@/lib/revalidate-ops";

export async function markNotificationsRead() {
  const session = await getSession();
  if (!session) return;
  await prisma.notification.updateMany({
    where: { userId: session.id, read: false },
    data: { read: true },
  });
  revalidateStaffNotices();
}

export async function markOneRead(id: string) {
  const session = await getSession();
  if (!session) return;
  await prisma.notification.updateMany({
    where: { id, userId: session.id },
    data: { read: true },
  });
  revalidateStaffNotices();
}

export async function archiveNotifications(ids?: string[]) {
  const session = await getSession();
  if (!session) return;
  await prisma.notification.updateMany({
    where: {
      userId: session.id,
      ...(ids?.length ? { id: { in: ids } } : { read: true }),
    },
    data: { archived: true, read: true },
  });
  revalidateStaffNotices();
}
