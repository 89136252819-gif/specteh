import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { toStaffNotice } from "@/lib/notification-ui";

export async function GET() {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  }

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.id, archived: false },
      orderBy: [{ read: "asc" }, { createdAt: "desc" }],
      take: 40,
    }),
    prisma.notification.count({
      where: { userId: session.id, read: false, archived: false },
    }),
  ]);

  return NextResponse.json({
    items: items.map(toStaffNotice),
    unreadCount,
  });
}
