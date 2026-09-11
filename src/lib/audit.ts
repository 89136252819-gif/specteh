import { prisma } from "@/lib/db";

export async function writeAudit(input: {
  actorId?: string | null;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  orderId?: string | null;
  detail?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId || null,
        actorName: input.actorName,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        orderId: input.orderId || null,
        detail: input.detail || null,
      },
    });
  } catch (error) {
    console.error("[audit]", error instanceof Error ? error.message : error);
  }
}
