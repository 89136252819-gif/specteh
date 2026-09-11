import fs from "fs";
import path from "path";
import webpush from "web-push";
import { prisma } from "@/lib/db";

type VapidKeys = { publicKey: string; privateKey: string; subject: string };

function vapidPath() {
  if (process.env.VAPID_FILE) return process.env.VAPID_FILE;
  const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(process.cwd(), "prisma");
  return path.join(dataDir, "vapid.json");
}

export function getVapidKeys(): VapidKeys {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject: process.env.VAPID_SUBJECT || "mailto:ops@specteh.rad55.ru",
    };
  }
  const file = vapidPath();
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as VapidKeys;
      if (parsed.publicKey && parsed.privateKey) {
        return {
          publicKey: parsed.publicKey,
          privateKey: parsed.privateKey,
          subject: parsed.subject || "mailto:ops@specteh.rad55.ru",
        };
      }
    }
  } catch {
    /* regenerate */
  }
  const generated = webpush.generateVAPIDKeys();
  const keys: VapidKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject: "mailto:ops@specteh.rad55.ru",
  };
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(keys, null, 2), "utf8");
  } catch {
    /* ephemeral keys for this process */
  }
  return keys;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; orderId?: string },
) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return { sent: 0 };

  const keys = getVapidKeys();
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  const body = JSON.stringify(payload);
  let sent = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
        { TTL: 60 * 60 * 12 },
      );
      sent += 1;
    } catch (error) {
      const status = typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode: number }).statusCode) : 0;
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
      }
    }
  }
  return { sent };
}
