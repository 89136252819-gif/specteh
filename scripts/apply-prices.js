const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CATALOG = [
  {
    name: "Самосвал 8х4",
    aliases: ["Самосвал", "Самосвал 8х4", "Самосвал 8x4"],
    prices: [
      { kind: "HOUR", amount: 2500, label: "Моточас самосвала 8х4" },
      { kind: "DELIVERY", amount: 2000, label: "Подача самосвала 8х4" },
      { kind: "MIN_HOURS", amount: 3, label: "Минимум часов" },
    ],
  },
  {
    name: "Автоманипулятор",
    aliases: ["Манипулятор", "Автоманипулятор"],
    prices: [
      { kind: "HOUR", amount: 3000, label: "Моточас автоманипулятора" },
      { kind: "DELIVERY", amount: 2000, label: "Подача автоманипулятора" },
      { kind: "MIN_HOURS", amount: 3, label: "Минимум часов" },
    ],
  },
  {
    name: "Экскаватор-погрузчик",
    aliases: ["Экскаватор", "Экскаватор-погрузчик"],
    prices: [
      { kind: "HOUR", amount: 2500, label: "Моточас экскаватора-погрузчика" },
      { kind: "DELIVERY", amount: 3000, label: "Подача экскаватора-погрузчика" },
      { kind: "MIN_HOURS", amount: 3, label: "Минимум часов" },
    ],
  },
  {
    name: "Мини-трактор",
    aliases: [],
    prices: [
      { kind: "HOUR", amount: 2500, label: "Моточас мини-трактора" },
      { kind: "DELIVERY", amount: 3000, label: "Подача мини-трактора, город" },
      { kind: "DELIVERY_REGION", amount: 5000, label: "Подача мини-трактора, область" },
      { kind: "MIN_HOURS", amount: 3, label: "Минимум часов" },
    ],
  },
  {
    name: "Газель",
    aliases: [],
    prices: [
      { kind: "HOUR", amount: 2000, label: "Моточас газели" },
      { kind: "DELIVERY", amount: 1500, label: "Подача газели" },
      { kind: "MIN_HOURS", amount: 3, label: "Минимум часов" },
    ],
  },
];

async function upsertType(item) {
  const byName = await prisma.equipmentType.findUnique({ where: { name: item.name } });
  if (byName) return byName;
  for (const alias of item.aliases) {
    const found = await prisma.equipmentType.findUnique({ where: { name: alias } });
    if (found) {
      return prisma.equipmentType.update({ where: { id: found.id }, data: { name: item.name } });
    }
  }
  return prisma.equipmentType.create({ data: { name: item.name } });
}

async function upsertPrice(typeId, price) {
  const existing = await prisma.priceItem.findFirst({
    where: { equipmentTypeId: typeId, customerId: null, kind: price.kind },
  });
  if (existing) {
    await prisma.priceItem.update({
      where: { id: existing.id },
      data: { amount: price.amount, label: price.label },
    });
    return;
  }
  await prisma.priceItem.create({
    data: {
      equipmentTypeId: typeId,
      kind: price.kind,
      amount: price.amount,
      label: price.label,
    },
  });
}

async function main() {
  for (const item of CATALOG) {
    const type = await upsertType(item);
    for (const price of item.prices) {
      await upsertPrice(type.id, price);
    }
    console.log(`Прайс: ${type.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
