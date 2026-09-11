const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function addColumn(table, column, typeSql = "TEXT") {
  const quoted = `"${table}"`;
  const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info(${quoted})`);
  const names = rows.map((row) => row.name);
  if (names.includes(column)) return;
  await prisma.$executeRawUnsafe(`ALTER TABLE ${quoted} ADD COLUMN "${column}" ${typeSql}`);
  console.log(`schema: added ${table}.${column}`);
}

async function main() {
  await addColumn("User", "maxUserId");
  await addColumn("Customer", "maxUserId");
  await addColumn("Order", "maxBindToken");
  await addColumn("Invoice", "dueAt", "DATETIME");
  await addColumn("Invoice", "paymentPurpose");
  await addColumn("Organization", "signatureFile");
  await addColumn("Organization", "stampFile");
  await addColumn("Notification", "archived", "BOOLEAN DEFAULT 0");
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS Order_maxBindToken_key ON "Order"(maxBindToken)',
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "actorId" TEXT,
      "actorName" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "entity" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "orderId" TEXT,
      "detail" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS AuditLog_orderId_createdAt_idx ON "AuditLog"("orderId", "createdAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS AuditLog_entity_entityId_idx ON "AuditLog"("entity", "entityId")',
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OrderTemplate" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "customerId" TEXT NOT NULL,
      "paymentMethod" TEXT NOT NULL,
      "vatRate" REAL,
      "equipmentTypeId" TEXT NOT NULL,
      "address" TEXT NOT NULL,
      "siteContact" TEXT,
      "sitePhone" TEXT,
      "comment" TEXT,
      "intervalDays" INTEGER NOT NULL DEFAULT 7,
      "active" BOOLEAN NOT NULL DEFAULT 1,
      "createdById" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PushSubscription" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "userId" TEXT NOT NULL,
      "endpoint" TEXT NOT NULL,
      "p256dh" TEXT NOT NULL,
      "auth" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS PushSubscription_endpoint_key ON "PushSubscription"("endpoint")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS PushSubscription_userId_idx ON "PushSubscription"("userId")',
  );
  console.log("schema: audit/templates/dueAt/archived/push ready");
  const backfill = await prisma.$executeRawUnsafe(
    `UPDATE "Invoice" SET "dueAt" = datetime("issuedAt", '+7 days') WHERE "dueAt" IS NULL`,
  );
  if (backfill) console.log(`schema: backfilled dueAt on ${backfill} invoices`);
}

main()
  .catch((error) => {
    console.error("ensure-schema:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
