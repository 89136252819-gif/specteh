"use server";

import { prisma } from "@/lib/db";
import { requireDriver } from "@/lib/auth";
import { getVapidKeys } from "@/lib/push";

export async function getPushPublicKey() {
  await requireDriver();
  return { publicKey: getVapidKeys().publicKey };
}

export async function savePushSubscription(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const session = await requireDriver();
  const endpoint = String(input.endpoint || "").trim();
  const p256dh = String(input.keys?.p256dh || "").trim();
  const auth = String(input.keys?.auth || "").trim();
  if (!endpoint || !p256dh || !auth) return { ok: false as const };

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: session.id, endpoint, p256dh, auth },
    update: { userId: session.id, p256dh, auth },
  });
  return { ok: true as const };
}

export async function removePushSubscription(endpoint: string) {
  const session = await requireDriver();
  await prisma.pushSubscription.deleteMany({
    where: { userId: session.id, endpoint: String(endpoint || "") },
  });
  return { ok: true as const };
}
